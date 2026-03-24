import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";

export const dynamic = "force-dynamic";

// ── GET last refId counter ─────────────────────────────────────────────────

async function nextRefNum(): Promise<number> {
  const last = await (prisma as any).designRequest.findFirst({
    orderBy: { createdAt: "desc" },
    select: { refId: true },
  });
  if (!last) return 1;
  return parseInt(last.refId.replace("REQ-", ""), 10) + 1;
}

// ── POST /api/design-ops/requests/bulk ────────────────────────────────────
// Accepts an array of request objects and creates them all.
// Body: { month: string, requests: BulkRequestRow[] }
// BulkRequestRow: { title, type, requestingTeam, priority, dueDate, brief, referenceLinks? }

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const rows: any[] = body.requests ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "requests array is required" }, { status: 400 });
  }

  let counter = await nextRefNum();
  const created: any[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.title?.trim() || !row.type || !row.requestingTeam) {
      skipped.push({ row: i + 1, reason: "Missing title, type, or requestingTeam" });
      continue;
    }

    // Normalise type
    const VALID_TYPES = ["VIDEO_EDIT", "VIDEO_SHOOT", "GRAPHIC_SOCIAL", "GRAPHIC_CAMPAIGN", "OTHER"];
    const VALID_TEAMS = ["SOCIAL", "PAID_CAMPAIGN", "MARKETING", "HR", "OTHER"];
    const type           = VALID_TYPES.includes(row.type.toUpperCase()) ? row.type.toUpperCase() : null;
    const requestingTeam = VALID_TEAMS.includes(row.requestingTeam.toUpperCase()) ? row.requestingTeam.toUpperCase() : "OTHER";

    if (!type) {
      skipped.push({ row: i + 1, reason: `Unknown type: "${row.type}"` });
      continue;
    }

    const refId = `REQ-${String(counter).padStart(3, "0")}`;
    counter++;

    const request = await (prisma as any).designRequest.create({
      data: {
        refId,
        title:          row.title.trim(),
        brief:          row.brief?.trim() || `${row.title} — uploaded from calendar`,
        type,
        requestingTeam,
        priority:       ["LOW","MEDIUM","HIGH","URGENT"].includes(row.priority?.toUpperCase?.()) ? row.priority.toUpperCase() : "MEDIUM",
        dueDate:        row.dueDate ? new Date(row.dueDate) : null,
        referenceLinks: row.referenceLinks ?? null,
        requestedById:  (session.user as any).id ?? null,
        status:         "NEW",
      },
    });

    await (prisma as any).designRequestNote.create({
      data: {
        requestId: request.id,
        body:      `Created via calendar upload by ${session.user.name ?? session.user.email}.${body.month ? ` Month: ${body.month}.` : ""}`,
        isSystem:  true,
      },
    });

    created.push(request);
  }

  return NextResponse.json({
    created:  created.length,
    skipped:  skipped.length,
    details:  skipped,
    requests: created,
  }, { status: 201 });
}
