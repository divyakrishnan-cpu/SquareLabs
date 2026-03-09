import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");

  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const notifications = await db.publishNotification.findMany({
      where: { sentAt: { gte: since } },
      include: { calendarItem: { select: { title: true, vertical: true } } },
      orderBy: { sentAt: "desc" },
    });
    return NextResponse.json({ notifications });
  } catch (e) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
