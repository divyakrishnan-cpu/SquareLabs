import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { db as prisma }     from "@/lib/db";
import { createNotification } from "../../utils";

export const dynamic = "force-dynamic";

// ── Valid status flows ────────────────────────────────────────────────────────

const DESIGN_FLOW = [
  "NEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED",
  "REVIEW", "CHANGES_REQUESTED", "ALL_APPROVED", "UPLOADED_CLOSED",
] as const;

const VIDEO_FLOW = [
  "NEW", "ASSIGNED", "SHOOT_PLANNED", "SHOOT_DONE",
  "EDITING_IN_PROGRESS", "EDIT_DONE",
  "REVIEW", "CHANGES_REQUESTED", "APPROVED", "READY_TO_UPLOAD", "UPLOAD_DONE",
] as const;

function allowedNext(type: string, current: string): string[] {
  const flow = type === "VIDEO" ? VIDEO_FLOW : DESIGN_FLOW;
  const idx  = (flow as readonly string[]).indexOf(current);
  const next: string[] = [];
  if (idx !== -1 && idx + 1 < flow.length) next.push(flow[idx + 1]);
  if (current !== "CANCELLED") next.push("CANCELLED");
  return next;
}

function timestampField(status: string): Record<string, Date> {
  const now = new Date();
  const map: Record<string, string> = {
    ASSIGNED:            "assignedAt",
    IN_PROGRESS:         "inProgressAt",
    COMPLETED:           "completedAt",
    SHOOT_PLANNED:       "shootPlannedAt",
    SHOOT_DONE:          "shootDoneAt",
    EDITING_IN_PROGRESS: "editingStartedAt",
    EDIT_DONE:           "completedAt",
    REVIEW:              "reviewAt",
    CHANGES_REQUESTED:   "changesRequestedAt",
    ALL_APPROVED:        "allApprovedAt",
    UPLOADED_CLOSED:     "uploadedClosedAt",
    APPROVED:            "approvedAt",
    READY_TO_UPLOAD:     "readyToUploadAt",
    UPLOAD_DONE:         "uploadDoneAt",
    CANCELLED:           "cancelledAt",
  };
  return map[status] ? { [map[status]]: now } : {};
}

async function notifyPOCs(
  requestId: string,
  excludeUserId: string | null,
  title: string,
  body: string,
  targetRole?: string
) {
  const pocs = await (prisma as any).designRequestPOC.findMany({
    where: { requestId, ...(targetRole ? { role: targetRole } : {}) },
    select: { userId: true },
  });
  await Promise.all(
    pocs
      .filter((p: any) => p.userId !== excludeUserId)
      .map((p: any) => createNotification(p.userId, requestId, title, body))
  );
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const request = await (prisma as any).designRequest.findUnique({
    where: { id: params.id },
    include: {
      requestedBy:  { select: { id: true, name: true, email: true, image: true } },
      assignedTo:   { select: { id: true, name: true, email: true, image: true } },
      pocs: {
        include: { user: { select: { id: true, name: true, email: true, image: true, department: true } } },
        orderBy: { addedAt: "asc" },
      },
      reviewCycles: {
        include: { reviewedBy: { select: { id: true, name: true, email: true } } },
        orderBy:  { createdAt: "desc" },
      },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(request);
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body    = await req.json();
  const current = await (prisma as any).designRequest.findUnique({
    where: { id: params.id },
    include: { pocs: true },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actorName = (session.user as any).name ?? (session.user as any).email;
  const actorId   = (session.user as any).id;
  const update: Record<string, unknown> = {};
  const notes: string[] = [];

  // ── Status transition ────────────────────────────────────────────────────
  if (body.status && body.status !== current.status) {
    const allowed = allowedNext(current.type, current.status);
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot move ${current.status} → ${body.status} for type ${current.type}` },
        { status: 422 }
      );
    }

    update.status = body.status;
    Object.assign(update, timestampField(body.status));

    switch (body.status as string) {

      case "ASSIGNED":
        notes.push(`${actorName} assigned the request — POCs notified.`);
        await notifyPOCs(params.id, actorId, `${current.refId} assigned`, `"${current.title}" has been assigned. Please pick up your role.`);
        break;

      case "IN_PROGRESS":
        notes.push(`Design work started by ${actorName}.`);
        break;

      case "SHOOT_PLANNED":
        notes.push(`Shoot planned by ${actorName}.`);
        await notifyPOCs(params.id, actorId, `${current.refId}: Shoot planned`, `Shoot is planned for "${current.title}".`, "VIDEO");
        break;

      case "SHOOT_DONE":
        notes.push(`Shoot completed — footage handed to editor.`);
        await notifyPOCs(params.id, actorId, `${current.refId}: Shoot done`, `"${current.title}" shoot done. Please begin editing.`, "VIDEO");
        break;

      case "EDITING_IN_PROGRESS":
        notes.push(`Editing started by ${actorName}.`);
        break;

      case "COMPLETED":
      case "EDIT_DONE":
        notes.push(`${actorName} marked work complete — submitted for Social POC review.`);
        await notifyPOCs(params.id, actorId,
          `${current.refId}: Ready for review`,
          `"${current.title}" is complete. Please review and approve or request changes.`,
          "SOCIAL"
        );
        break;

      case "REVIEW":
        notes.push(`Social POC started review.`);
        break;

      case "CHANGES_REQUESTED": {
        const note = body.reviewNote ?? "No details provided.";
        const cycle = (current.reviewCycleCount ?? 0) + 1;
        update.reviewCycleCount = cycle;
        notes.push(`Changes requested by ${actorName} (review cycle #${cycle}): ${note}`);

        await (prisma as any).designReviewCycle.create({
          data: {
            id: crypto.randomUUID(),
            requestId:    params.id,
            reviewedById: actorId,
            action:       "CHANGES_REQUESTED",
            note,
            cycleNumber:  cycle,
          },
        });

        // Route back to correct POC
        const targetRole = current.type === "VIDEO" ? "VIDEO" : "DESIGN";
        await notifyPOCs(params.id, actorId,
          `${current.refId}: Changes requested`,
          `Social POC requested changes on "${current.title}": ${note}`,
          targetRole
        );
        break;
      }

      case "ALL_APPROVED":
      case "APPROVED": {
        const cycle = (current.reviewCycleCount ?? 0) + 1;
        await (prisma as any).designReviewCycle.create({
          data: {
            id: crypto.randomUUID(),
            requestId:    params.id,
            reviewedById: actorId,
            action:       "APPROVED",
            note:         body.reviewNote ?? null,
            cycleNumber:  cycle,
          },
        });
        notes.push(`Approved by ${actorName} ✅`);
        await notifyPOCs(params.id, actorId,
          `${current.refId}: Approved — ready to upload`,
          `"${current.title}" has been approved. Please upload/publish.`,
          "UPLOADING"
        );
        break;
      }

      case "READY_TO_UPLOAD":
        notes.push(`Handed to Uploading POC by ${actorName}.`);
        await notifyPOCs(params.id, actorId, `${current.refId}: Ready to upload`, `"${current.title}" ready for publishing.`, "UPLOADING");
        break;

      case "UPLOADED_CLOSED":
      case "UPLOAD_DONE": {
        const tatHrs = (Date.now() - new Date(current.submittedAt).getTime()) / 3_600_000;
        update.tatHours = Math.round(tatHrs * 10) / 10;
        notes.push(`✅ Closed by ${actorName}. Total TAT: ${update.tatHours}h.`);
        if (current.requestedById) {
          await createNotification(current.requestedById, params.id,
            `${current.refId} published & closed`,
            `"${current.title}" has been published and closed.`
          );
        }
        break;
      }

      case "CANCELLED":
        notes.push(`Cancelled by ${actorName}.`);
        await notifyPOCs(params.id, actorId, `${current.refId}: Cancelled`, `"${current.title}" was cancelled.`);
        break;
    }
  }

  // ── Field updates ────────────────────────────────────────────────────────
  if (body.priority !== undefined)       update.priority       = body.priority;
  if (body.dueDate !== undefined)        update.dueDate        = body.dueDate ? new Date(body.dueDate) : null;
  if (body.assignedToId !== undefined)   update.assignedToId   = body.assignedToId;
  if (body.title !== undefined)          update.title          = body.title;
  if (body.referenceLinks !== undefined) update.referenceLinks = body.referenceLinks;

  const updated = await (prisma as any).designRequest.update({
    where: { id: params.id },
    data:  update,
  });

  if (notes.length > 0) {
    await (prisma as any).designRequestNote.createMany({
      data: notes.map((n) => ({
        requestId: params.id,
        body: n,
        isSystem: true,
        authorId: actorId ?? null,
      })),
    });
  }

  return NextResponse.json(updated);
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  await (prisma as any).designRequest.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
