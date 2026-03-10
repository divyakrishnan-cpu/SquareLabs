/**
 * GET  /api/meta/accounts           — list all connected Meta integrations
 * DELETE /api/meta/accounts         — disconnect a page (body: { pageId })
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ accounts: [] });

  const accounts = await prisma.metaIntegration.findMany({
    where:   { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, pageId: true, pageName: true, vertical: true,
      instagramAccountId: true, instagramHandle: true, instagramName: true,
      profilePictureUrl: true, followersCount: true, followsCount: true,
      mediaCount: true, tokenExpiresAt: true,
    },
  });

  return NextResponse.json({ accounts });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { pageId } = await req.json();
  if (!pageId) return NextResponse.json({ error: "pageId required" }, { status: 400 });

  await prisma.metaIntegration.updateMany({
    where: { userId: user.id, pageId },
    data:  { isActive: false },
  });

  return NextResponse.json({ success: true });
}
