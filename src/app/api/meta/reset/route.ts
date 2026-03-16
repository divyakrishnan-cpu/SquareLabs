/**
 * POST /api/meta/reset
 * Deletes ALL Meta integrations for the logged-in user.
 * No secret required — auth session is enough.
 *
 * (Legacy) GET /api/meta/reset?secret=squarelabs-reset — still works.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

async function doReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "user not found", status: 404 };

  const { count } = await prisma.metaIntegration.deleteMany({
    where: { userId: user.id },
  });

  return {
    success: true,
    message: `Deleted ${count} Meta integration(s). You can now reconnect from scratch.`,
    deleted: count,
  };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const result = await doReset(session.user.email);
  if ("error" in result) return NextResponse.json(result, { status: (result as any).status ?? 500 });
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "squarelabs-reset") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const result = await doReset(session.user.email);
  if ("error" in result) return NextResponse.json(result, { status: (result as any).status ?? 500 });
  return NextResponse.json(result);
}
