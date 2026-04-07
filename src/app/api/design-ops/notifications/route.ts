import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { db as prisma }     from "@/lib/db";

export const dynamic = "force-dynamic";

// ── GET /api/design-ops/notifications ─────────────────────────────────────────
// Returns notifications for the logged-in user, newest first.
// ?unreadOnly=1 → only unread

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "1";

  const where: Record<string, unknown> = { userId: (session.user as any).id };
  if (unreadOnly) where.read = false;

  const notifications = await (prisma as any).notification.findMany({
    where,
    include: {
      request: { select: { refId: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = unreadOnly
    ? notifications.length
    : await (prisma as any).notification.count({ where: { userId: (session.user as any).id, read: false } });

  return NextResponse.json({ notifications, unreadCount });
}

// ── PATCH /api/design-ops/notifications ───────────────────────────────────────
// Mark notifications as read. Body: { ids: string[] } or { all: true }

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const userId = (session.user as any).id;

  if (body.all) {
    await (prisma as any).notification.updateMany({
      where: { userId, read: false },
      data:  { read: true },
    });
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await (prisma as any).notification.updateMany({
      where: { userId, id: { in: body.ids } },
      data:  { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
