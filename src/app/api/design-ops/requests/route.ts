import { NextResponse }   from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }     from "@/lib/db";

export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────────────

async function nextRefId(): Promise<string> {
  const last = await (prisma as any).designRequest.findFirst({
    orderBy: { createdAt: "desc" },
    select: { refId: true },
  });
  if (!last) return "REQ-001";
  const num = parseInt(last.refId.replace("REQ-", ""), 10);
  return `REQ-${String(num + 1).padStart(3, "0")}`;
}

// ── GET /api/design-ops/requests ───────────────────────────────────────────
// Query params: status, type, assignedToId, requestingTeam, search

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = {};

  const status  = searchParams.get("status");
  const type    = searchParams.get("type");
  const team    = searchParams.get("requestingTeam");
  const assignee = searchParams.get("assignedToId");
  const search  = searchParams.get("search");

  if (status)  where.status          = status;
  if (type)    where.type             = type;
  if (team)    where.requestingTeam   = team;
  if (assignee) where.assignedToId   = assignee;
  if (search)  where.title = { contains: search, mode: "insensitive" };

  const requests = await (prisma as any).designRequest.findMany({
    where,
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      assignedTo:  { select: { id: true, name: true, email: true } },
      notes:       { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(requests);
}

// ── POST /api/design-ops/requests ─────────────────────────────────────────
// Create a new design request

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { title, brief, type, requestingTeam, priority, dueDate, referenceLinks } = body;

  if (!title || !brief || !type || !requestingTeam) {
    return NextResponse.json({ error: "title, brief, type and requestingTeam are required" }, { status: 400 });
  }

  const refId = await nextRefId();

  const request = await (prisma as any).designRequest.create({
    data: {
      refId,
      title,
      brief,
      type,
      requestingTeam,
      priority:       priority   ?? "MEDIUM",
      dueDate:        dueDate    ? new Date(dueDate) : null,
      referenceLinks: referenceLinks ?? null,
      requestedById:  (session.user as any).id ?? null,
      status:         "NEW",
    },
  });

  // Auto-log system note
  await (prisma as any).designRequestNote.create({
    data: {
      requestId: request.id,
      body:      `Request created by ${session.user.name ?? session.user.email}.`,
      isSystem:  true,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
