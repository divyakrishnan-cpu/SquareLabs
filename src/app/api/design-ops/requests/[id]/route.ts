import { NextResponse }   from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }     from "@/lib/db";

export const dynamic = "force-dynamic";

// ── GET /api/design-ops/requests/[id] ─────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const request = await (prisma as any).designRequest.findUnique({
    where: { id: params.id },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      assignedTo:  { select: { id: true, name: true, email: true } },
      notes:       { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(request);
}

// ── PATCH /api/design-ops/requests/[id] ───────────────────────────────────
// Handles: assign, status update, add note, edit fields

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body   = await req.json();
  const now    = new Date();

  // Load current request
  const current = await (prisma as any).designRequest.findUnique({
    where: { id: params.id },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  const notes: string[] = [];

  // Status transition
  if (body.status && body.status !== current.status) {
    update.status = body.status;
    switch (body.status) {
      case "ASSIGNED":
        update.assignedAt = now;
        if (body.assignedToId) update.assignedToId = body.assignedToId;
        notes.push(`Status → Assigned to ${body.assigneeName ?? "designer"}.`);
        break;
      case "IN_PROGRESS":
        update.startedAt = update.startedAt ?? now;
        notes.push("Status → In Progress.");
        break;
      case "REVIEW":
        update.reviewAt = now;
        notes.push("Status → Sent for Review.");
        break;
      case "DELIVERED": {
        update.deliveredAt = now;
        const start = current.submittedAt ?? now;
        const tatHours = (now.getTime() - new Date(start).getTime()) / 3_600_000;
        update.tatHours = Math.round(tatHours * 10) / 10;
        notes.push(`Status → Delivered. TAT: ${update.tatHours}h.`);
        break;
      }
      case "CANCELLED":
        notes.push("Request cancelled.");
        break;
    }
  }

  // Assignment (can be done without full status change)
  if (body.assignedToId && body.assignedToId !== current.assignedToId) {
    update.assignedToId = body.assignedToId;
    if (!update.assignedAt) update.assignedAt = now;
    if (!update.status || update.status === "NEW") update.status = "ASSIGNED";
    notes.push(`Assigned to ${body.assigneeName ?? body.assignedToId}.`);
  }

  // Revision request
  if (body.revisionNote) {
    update.revisionCount = (current.revisionCount ?? 0) + 1;
    update.revisionNote  = body.revisionNote;
    update.status        = "IN_PROGRESS";
    notes.push(`Revision requested: ${body.revisionNote}`);
  }

  // Field updates
  if (body.title)          update.title          = body.title;
  if (body.brief)          update.brief          = body.brief;
  if (body.priority)       update.priority       = body.priority;
  if (body.dueDate)        update.dueDate        = new Date(body.dueDate);
  if (body.referenceLinks !== undefined) update.referenceLinks = body.referenceLinks;

  const updated = await (prisma as any).designRequest.update({
    where: { id: params.id },
    data:  update,
    include: {
      requestedBy: { select: { id: true, name: true } },
      assignedTo:  { select: { id: true, name: true } },
    },
  });

  // Add all system notes
  for (const note of notes) {
    await (prisma as any).designRequestNote.create({
      data: { requestId: params.id, body: note, isSystem: true },
    });
  }

  // Add user note if provided
  if (body.note) {
    await (prisma as any).designRequestNote.create({
      data: {
        requestId: params.id,
        body:      body.note,
        isSystem:  false,
        authorId:  (session.user as any).id ?? null,
      },
    });
  }

  return NextResponse.json(updated);
}

// ── DELETE /api/design-ops/requests/[id] ──────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  await (prisma as any).designRequest.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
