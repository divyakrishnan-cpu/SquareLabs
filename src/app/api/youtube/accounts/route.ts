/**
 * GET  /api/youtube/accounts  — list connected YouTube channels
 * DELETE /api/youtube/accounts  — disconnect a channel { channelId }
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

  const accounts = await (prisma as any).youtubeIntegration.findMany({
    where:   { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, channelId: true, channelName: true, channelHandle: true,
      thumbnailUrl: true, subscriberCount: true, videoCount: true,
      viewCount: true, tokenExpiresAt: true,
    },
  });

  return NextResponse.json({ accounts });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { channelId } = await req.json();
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  await (prisma as any).youtubeIntegration.deleteMany({
    where: { userId: user.id, channelId },
  });

  return NextResponse.json({ success: true });
}
