/**
 * GET    /api/linkedin/accounts  — list connected LinkedIn company pages
 * DELETE /api/linkedin/accounts  — disconnect a page { organizationId }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ accounts: [] });

  const accounts = await (prisma as any).linkedinIntegration.findMany({
    where:   { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, organizationId: true, name: true, vanityName: true,
      logoUrl: true, followerCount: true, tokenExpiresAt: true,
    },
  });

  return NextResponse.json({ accounts });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { organizationId } = await req.json();
  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 });

  await (prisma as any).linkedinIntegration.deleteMany({
    where: { userId: user.id, organizationId },
  });

  return NextResponse.json({ success: true });
}
