import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";

export const dynamic = "force-dynamic";

// ── GET /api/design-ops/daily-log ─────────────────────────────────────────
// Returns logs for a given user (last N days)
// Query params:
//   userId — whose logs to fetch (defaults to session user)
//   days   — how many days back (default 14)

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? (session.user as any).id;
  const days   = parseInt(searchParams.get("days") ?? "14", 10);
  const since  = new Date(Date.now() - days * 86_400_000);

  const logs = await (prisma as any).designDailyLog.findMany({
    where:   { userId, logDate: { gte: since } },
    orderBy: { logDate: "desc" },
  });

  return NextResponse.json(logs);
}

// ── POST /api/design-ops/daily-log ────────────────────────────────────────
// Upsert today's log.
// Body may include `userId` to log on behalf of a specific team member
// (e.g. a manager logging for a designer from the My Work view).
// Falls back to the authenticated user's ID if omitted.

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { summary, hoursWorked, requestIds, logDate } = body;

  // Allow an explicit userId override — useful for the designer-picker flow
  const userId: string = body.userId ?? (session.user as any).id;

  if (!summary?.trim()) {
    return NextResponse.json({ error: "summary is required" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const date = logDate ? new Date(logDate) : new Date();
  date.setHours(0, 0, 0, 0);

  const log = await (prisma as any).designDailyLog.upsert({
    where:  { userId_logDate: { userId, logDate: date } },
    create: {
      userId,
      logDate:     date,
      summary,
      hoursWorked: hoursWorked ?? null,
      requestIds:  requestIds  ?? [],
    },
    update: {
      summary,
      hoursWorked: hoursWorked ?? null,
      requestIds:  requestIds  ?? [],
    },
  });

  return NextResponse.json(log);
}
