import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get("vertical") ?? "SY_INDIA";
  const days     = parseInt(searchParams.get("days") ?? "30");

  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const snapshots = await db.socialMetricSnapshot.findMany({
      where: { vertical: vertical as any, snapshotDate: { gte: since } },
      orderBy: { snapshotDate: "asc" },
    });
    return NextResponse.json({ snapshots });
  } catch (e) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
