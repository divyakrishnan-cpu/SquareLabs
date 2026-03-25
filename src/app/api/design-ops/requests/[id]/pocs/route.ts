/**
 * GET  /api/design-ops/requests/[id]/pocs  — list POCs for a request
 * POST /api/design-ops/requests/[id]/pocs  — add a POC (body: { userId, role })
 * DELETE /api/design-ops/requests/[id]/pocs — remove a POC (body: { userId })
 */

import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const pocs = await (prisma as any).designRequestPOC.findMany({
    where:   { requestId: params.id },
    include: { user: { select: { id: true, name: true, email: true, department: true } } },
    orderBy: { addedAt: "asc" },
  });

  return NextResponse.json({ pocs });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json() as { userId: string; role?: "DESIGN" | "SOCIAL" | "OTHER" };
  if (!body.userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Verify request exists
  const request = await (prisma as any).designRequest.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Upsert — update role if already a POC
  const poc = await (prisma as any).designRequestPOC.upsert({
    where: {
      requestId_userId: { requestId: params.id, userId: body.userId },
    },
    update: { role: body.role ?? "OTHER" },
    create: {
      requestId: params.id,
      userId:    body.userId,
      role:      body.role ?? "OTHER",
    },
    include: { user: { select: { id: true, name: true, email: true, department: true } } },
  });

  // Log as system note
  const actorName = (session.user as any).name ?? session.user.email;
  await (prisma as any).designRequestNote.create({
    data: {
      requestId: params.id,
      isSystem:  true,
      authorId:  (session.user as any).id ?? null,
      body:      `${poc.user.name} added as ${body.role ?? "OTHER"} POC by ${actorName}.`,
    },
  });

  return NextResponse.json({ poc });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json() as { userId: string };
  if (!body.userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Get name before deleting for the note
  const existing = await (prisma as any).designRequestPOC.findUnique({
    where:   { requestId_userId: { requestId: params.id, userId: body.userId } },
    include: { user: { select: { name: true } } },
  });

  if (!existing) return NextResponse.json({ error: "POC not found" }, { status: 404 });

  await (prisma as any).designRequestPOC.delete({
    where: { requestId_userId: { requestId: params.id, userId: body.userId } },
  });

  await (prisma as any).designRequestNote.create({
    data: {
      requestId: params.id,
      isSystem:  true,
      authorId:  (session.user as any).id ?? null,
      body:      `${existing.user.name} removed as POC.`,
    },
  });

  return NextResponse.json({ removed: true });
}
