import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }     from "@/lib/db";

export const dynamic = "force-dynamic";

// ── GET /api/design-ops/analytics ─────────────────────────────────────────
// Returns TAT stats, on-time rates, bottleneck data, and volume breakdown.
// Query param: days=7|30|90 (default 30)

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days   = parseInt(searchParams.get("days") ?? "30", 10);
  const since  = new Date(Date.now() - days * 86_400_000);

  // All delivered requests in the period
  const delivered = await (prisma as any).designRequest.findMany({
    where: {
      status:      "DELIVERED",
      deliveredAt: { gte: since },
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  // All requests (for pipeline + volume)
  const all = await (prisma as any).designRequest.findMany({
    where: { createdAt: { gte: since } },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  // ── TAT per person ───────────────────────────────────────────────────────
  const tatByPerson: Record<string, { name: string; tats: number[]; type: string }> = {};
  for (const r of delivered) {
    if (!r.assignedTo || r.tatHours == null) continue;
    const { id, name } = r.assignedTo;
    if (!tatByPerson[id]) {
      tatByPerson[id] = {
        name,
        tats: [],
        type: r.type.startsWith("VIDEO") ? "video" : "graphic",
      };
    }
    tatByPerson[id].tats.push(r.tatHours);
  }

  const tatStats = Object.entries(tatByPerson).map(([id, { name, tats, type }]) => {
    const avg   = tats.reduce((a, b) => a + b, 0) / tats.length;
    const target = type === "video" ? 48 : 24;
    const onTime = tats.filter(t => t <= target).length;
    return {
      id, name, type,
      avgTat:     Math.round(avg * 10) / 10,
      target,
      onTimePct:  Math.round((onTime / tats.length) * 100),
      count:      tats.length,
    };
  });

  // ── On-time overall ──────────────────────────────────────────────────────
  let onTimeTotal = 0;
  let deliveredTotal = 0;
  for (const r of delivered) {
    if (r.tatHours == null) continue;
    deliveredTotal++;
    const target = r.type.startsWith("VIDEO") ? 48 : 24;
    if (r.tatHours <= target) onTimeTotal++;
  }

  // ── Status pipeline ──────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {
    NEW: 0, ASSIGNED: 0, IN_PROGRESS: 0, REVIEW: 0, DELIVERED: 0, CANCELLED: 0,
  };
  for (const r of all) statusCounts[r.status as string] = (statusCounts[r.status as string] ?? 0) + 1;

  // ── Volume by requesting team ────────────────────────────────────────────
  const volumeByTeam: Record<string, { video: number; graphic: number }> = {};
  for (const r of all) {
    const t = r.requestingTeam as string;
    if (!volumeByTeam[t]) volumeByTeam[t] = { video: 0, graphic: 0 };
    if (r.type.startsWith("VIDEO")) volumeByTeam[t].video++;
    else volumeByTeam[t].graphic++;
  }

  // ── Avg time in each stage (bottleneck) ──────────────────────────────────
  const stageDeltas: { newToAssigned: number[]; assignedToStart: number[]; startToReview: number[]; reviewToDelivered: number[] } = {
    newToAssigned:      [],
    assignedToStart:    [],
    startToReview:      [],
    reviewToDelivered:  [],
  };
  for (const r of delivered) {
    const ms = (a: string | null, b: string | null) =>
      a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000 : null;
    const d1 = ms(r.submittedAt, r.assignedAt);
    const d2 = ms(r.assignedAt, r.startedAt);
    const d3 = ms(r.startedAt, r.reviewAt);
    const d4 = ms(r.reviewAt, r.deliveredAt);
    if (d1 != null && d1 >= 0) stageDeltas.newToAssigned.push(d1);
    if (d2 != null && d2 >= 0) stageDeltas.assignedToStart.push(d2);
    if (d3 != null && d3 >= 0) stageDeltas.startToReview.push(d3);
    if (d4 != null && d4 >= 0) stageDeltas.reviewToDelivered.push(d4);
  }
  const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
  const stageAvg = {
    newToAssigned:     avg(stageDeltas.newToAssigned),
    assignedToStart:   avg(stageDeltas.assignedToStart),
    startToReview:     avg(stageDeltas.startToReview),
    reviewToDelivered: avg(stageDeltas.reviewToDelivered),
  };

  // ── Overdue requests ─────────────────────────────────────────────────────
  const now = new Date();
  const overdue = all.filter((r: any) =>
    r.dueDate && new Date(r.dueDate) < now && !["DELIVERED", "CANCELLED"].includes(r.status)
  ).map((r: any) => ({ id: r.id, refId: r.refId, title: r.title, dueDate: r.dueDate, assignedTo: r.assignedTo }));

  return NextResponse.json({
    period:       days,
    tatStats,
    onTimePct:    deliveredTotal ? Math.round((onTimeTotal / deliveredTotal) * 100) : null,
    statusCounts,
    volumeByTeam,
    stageAvg,
    overdue,
    totalActive:  (statusCounts.NEW + statusCounts.ASSIGNED + statusCounts.IN_PROGRESS + statusCounts.REVIEW),
  });
}
