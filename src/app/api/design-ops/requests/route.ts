import { NextResponse }        from "next/server";
import { getServerSession }    from "next-auth";
import { authOptions }         from "@/lib/auth";
import { db as prisma }        from "@/lib/db";
import { createNotification }  from "../utils";

export const dynamic = "force-dynamic";

// ── Default leads (team leads who own unassigned requests) ────────────────────
// Design/Paid → Lalit | Video → Sukhmani
// We look them up by email so the IDs stay portable across environments.
const DESIGN_LEAD_EMAIL = process.env.DESIGN_LEAD_EMAIL ?? "lalit@squareyards.com";
const VIDEO_LEAD_EMAIL  = process.env.VIDEO_LEAD_EMAIL  ?? "sukhmani@squareyards.com";

async function defaultLeadId(type: string): Promise<string | null> {
  const email = type === "VIDEO" ? VIDEO_LEAD_EMAIL : DESIGN_LEAD_EMAIL;
  const user  = await (prisma as any).user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

// ── Ref-ID generator ──────────────────────────────────────────────────────────
async function nextRefId(): Promise<string> {
  const last = await (prisma as any).designRequest.findFirst({
    orderBy: { createdAt: "desc" },
    select: { refId: true },
  });
  if (!last) return "REQ-001";
  const num = parseInt(last.refId.replace("REQ-", ""), 10);
  return `REQ-${String(num + 1).padStart(3, "0")}`;
}

// ── GET /api/design-ops/requests ──────────────────────────────────────────────
// Query params: status, type, requestingTeam, assignedToId, myRequests, search

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = {};

  const status     = searchParams.get("status");
  const type       = searchParams.get("type");
  const team       = searchParams.get("requestingTeam");
  const assignee   = searchParams.get("assignedToId");
  const myRequests = searchParams.get("myRequests");
  const search     = searchParams.get("search");

  if (status)  where.status         = status;
  if (type)    where.type            = type;
  if (team)    where.requestingTeam  = team;
  if (assignee) where.assignedToId  = assignee;
  if (myRequests === "1") where.requestedById = (session.user as any).id;
  if (search)  where.title = { contains: search, mode: "insensitive" };

  const requests = await (prisma as any).designRequest.findMany({
    where,
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      assignedTo:  { select: { id: true, name: true, email: true } },
      pocs: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      notes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(requests);
}

// ── POST /api/design-ops/requests ─────────────────────────────────────────────
// Create a new design request. Name auto-filled from session.

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    title,
    brief,
    type,           // SOCIAL_GRAPHICS | VIDEO | PAID_CAMPAIGN
    videoSubType,   // VERTICAL | HORIZONTAL (only if VIDEO)
    channels,       // string[] e.g. ["INSTAGRAM","YOUTUBE"]
    requestingTeam,
    subTeam,
    priority,
    dueDate,
    referenceLinks,
    // POCs set upfront (optional — team lead can also assign later)
    designPocId,
    videoPocId,
    contentPocId,
    socialPocId,
    uploadingPocId,
  } = body;

  if (!title || !brief || !type || !requestingTeam) {
    return NextResponse.json(
      { error: "title, brief, type and requestingTeam are required" },
      { status: 400 }
    );
  }

  const refId  = await nextRefId();
  const leadId = await defaultLeadId(type);

  // Create request
  const request = await (prisma as any).designRequest.create({
    data: {
      refId,
      title,
      brief,
      type,
      videoSubType:   videoSubType ?? null,
      channels:       Array.isArray(channels) ? channels : [],
      requestingTeam,
      subTeam:        subTeam        ?? null,
      priority:       priority       ?? "MEDIUM",
      dueDate:        dueDate        ? new Date(dueDate) : null,
      referenceLinks: referenceLinks ?? null,
      requestedById:  (session.user as any).id ?? null,
      assignedToId:   leadId,   // default lead until team lead re-assigns
      status:         "NEW",
    },
  });

  // Create any POCs that were supplied upfront
  const pocEntries: { requestId: string; userId: string; role: string }[] = [];
  if (designPocId)   pocEntries.push({ requestId: request.id, userId: designPocId,   role: "DESIGN"    });
  if (videoPocId)    pocEntries.push({ requestId: request.id, userId: videoPocId,    role: "VIDEO"     });
  if (contentPocId)  pocEntries.push({ requestId: request.id, userId: contentPocId,  role: "CONTENT"   });
  if (socialPocId)   pocEntries.push({ requestId: request.id, userId: socialPocId,   role: "SOCIAL"    });
  if (uploadingPocId)pocEntries.push({ requestId: request.id, userId: uploadingPocId,role: "UPLOADING" });

  if (pocEntries.length > 0) {
    await (prisma as any).designRequestPOC.createMany({ data: pocEntries, skipDuplicates: true });
  }

  // System note
  await (prisma as any).designRequestNote.create({
    data: {
      requestId: request.id,
      body:      `Request submitted by ${session.user.name ?? session.user.email}.`,
      isSystem:  true,
    },
  });

  // Notify default lead
  if (leadId) {
    await createNotification(
      leadId,
      request.id,
      `New request: ${refId}`,
      `"${title}" submitted by ${session.user.name}. Please review and assign POCs.`
    );
  }

  return NextResponse.json(request, { status: 201 });
}
