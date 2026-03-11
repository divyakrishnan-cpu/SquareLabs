/**
 * GET /api/meta/reset?secret=squarelabs-reset
 * Deletes ALL Meta integrations for the logged-in user.
 * Use to start the OAuth connection from scratch.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "squarelabs-reset") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { count } = await prisma.metaIntegration.deleteMany({
    where: { userId: user.id },
  });

  return NextResponse.json({
    success: true,
    message: `Deleted ${count} Meta integration(s). You can now reconnect from scratch.`,
    deleted: count,
  });
}
