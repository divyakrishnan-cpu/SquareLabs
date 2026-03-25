import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ── GET /api/social/monthly ────────────────────────────────────────────────
// Query params:
//   vertical  — required: SY_INDIA | SY_UAE | INTERIOR | SQUARE_CONNECT | UM
//   year      — required: e.g. 2026
//   month     — optional: 1-12 (returns single record if provided)
//
// Returns: SocialMonthlyReport[] sorted by month asc

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get("vertical");
  const year     = parseInt(searchParams.get("year") ?? "");
  const month    = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

  if (!vertical || isNaN(year)) {
    return NextResponse.json({ error: "vertical and year are required" }, { status: 400 });
  }

  try {
    const where: Record<string, unknown> = { vertical, year };
    if (month !== null) where.month = month;

    const reports = await (db.socialMonthlyReport as any).findMany({
      where,
      orderBy: { month: "asc" },
    });
    return NextResponse.json(reports);
  } catch (e: any) {
    console.error("[social/monthly GET]", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// ── POST /api/social/monthly ───────────────────────────────────────────────
// Body (JSON):
//   vertical, year, month — required (identifies the record)
//   All metric fields — optional (upsert, so only provided fields are updated)
//   platformBreakdown — optional JSON array
//   notes — optional string
//
// Returns the upserted record.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const { vertical, year, month, ...rest } = body;

  if (!vertical || !year || !month) {
    return NextResponse.json({ error: "vertical, year, month are required" }, { status: 400 });
  }

  // Strip non-numeric strings from numeric fields to be safe
  const numericFields = [
    "totalFollowers","newFollowers","unfollows","netFollowers",
    "totalViews","totalReach","totalImpressions","interactions",
    "linkClicks","profileVisits","totalContacts",
    "postsPublished","videosPublished","staticsPublished",
  ];
  const data: Record<string, unknown> = { ...rest };
  for (const f of numericFields) {
    if (data[f] !== undefined) data[f] = parseInt(String(data[f])) || 0;
  }
  data.enteredById = (session.user as any).id ?? null;

  try {
    const report = await (db.socialMonthlyReport as any).upsert({
      where: { vertical_year_month: { vertical, year, month } },
      create: { vertical, year, month, ...data },
      update: { ...data, updatedAt: new Date() },
    });
    return NextResponse.json(report);
  } catch (e: any) {
    console.error("[social/monthly POST]", e);
    return NextResponse.json({ error: e.message ?? "DB error" }, { status: 500 });
  }
}
