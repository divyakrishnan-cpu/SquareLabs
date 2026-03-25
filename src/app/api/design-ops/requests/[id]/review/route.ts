/**
 * POST /api/design-ops/requests/[id]/review
 *
 * A POC (or manager/admin) submits a review action on a design request
 * that is in DESIGNER_DONE or IN_REVIEW status.
 *
 * Body: { action: "APPROVED" | "CHANGES_REQUESTED", note?: string }
 *
 * On APPROVED  → status moves to APPROVED (POC can then set FINAL_DONE)
 * On CHANGES_REQUESTED → status moves back to IN_PROGRESS for the designer
 */

import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body   = await req.json() as { action: "APPROVED" | "CHANGES_REQUESTED"; note?: string };
  const userId = (session.user as any).id as string | undefined;
  const now    = new Date();

  if (!["APPROVED", "CHANGES_REQUESTED"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (!userId) return NextResponse.json({ error: "User id not found in session" }, { status: 401 });

  // Load request
  const request = await (prisma as any).designRequest.findUnique({
    where:   { id: params.id },
    include: { reviewCycles: { select: { id: true } } },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cycleNumber = (request.reviewCycles?.length ?? 0) + 1;

  // Determine next status
  const nextStatus =
    body.action === "APPROVED" ? "APPROVED" : "IN_PROGRESS"; // changes → back to designer

  // Build request update
  const update: Record<string, unknown> = { status: nextStatus };
  if (body.action === "APPROVED") {
    update.approvedAt = now;
  } else {
    update.changesRequestedAt = now;
    update.reviewCycleCount   = (request.reviewCycleCount ?? 0) + 1;
  }

  // Run in a transaction: create review cycle + update request + add note
  await (prisma as any).$transaction([
    (prisma as any).designReviewCycle.create({
      data: {
        requestId:    params.id,
        reviewedById: userId,
        action:       body.action,
        note:         body.note ?? null,
        cycleNumber,
      },
    }),
    (prisma as any).designRequest.update({
      where: { id: params.id },
      data:  update,
    }),
    (prisma as any).designRequestNote.create({
      data: {
        requestId: params.id,
        authorId:  userId,
        isSystem:  true,
        body:
          body.action === "APPROVED"
            ? `✅ Approved by reviewer (cycle ${cycleNumber}).${body.note ? " Note: " + body.note : ""}`
            : `🔄 Changes requested (cycle ${cycleNumber}) — sent back to designer.${body.note ? " Feedback: " + body.note : ""}`,
      },
    }),
  ]);

  // Return updated request with full context
  const updated = await (prisma as any).designRequest.findUnique({
    where:   { id: params.id },
    include: {
      requestedBy:  { select: { id: true, name: true } },
      assignedTo:   { select: { id: true, name: true } },
      pocs:         { include: { user: { select: { id: true, name: true } } } },
      reviewCycles: {
        include: { reviewedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      notes: { orderBy: { createdAt: "asc" }, take: 20 },
    },
  });

  return NextResponse.json(updated);
}
