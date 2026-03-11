/**
 * GET /api/meta/migrate?secret=squarelabs-migrate
 * One-time migration: adds userAccessToken column to meta_integrations.
 * Safe to run multiple times (IF NOT EXISTS).
 * DELETE THIS FILE after running once.
 */
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "squarelabs-migrate") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "meta_integrations" ADD COLUMN IF NOT EXISTS "userAccessToken" TEXT;`
    );

    // Verify the column exists
    const cols: { column_name: string }[] = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'meta_integrations' ORDER BY ordinal_position;`
    );

    return NextResponse.json({
      success: true,
      message: "Migration applied — userAccessToken column added.",
      columns: cols.map(c => c.column_name),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
