import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get("vertical");
  const status   = searchParams.get("status");

  try {
    const items = await db.contentCalendarItem.findMany({
      where: {
        ...(vertical ? { vertical: vertical as any } : {}),
        ...(status   ? { status:   status as any   } : {}),
      },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
      orderBy: { plannedDate: "asc" },
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const item = await db.contentCalendarItem.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
