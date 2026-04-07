/**
 * GET    /api/design-ops/requests/[id]/pocs — list POCs
 * POST   /api/design-ops/requests/[id]/pocs — set a POC for a role (upsert by role)
 * DELETE /api/design-ops/requests/[id]/pocs — remove a POC role (body: { role })
 *
 * Constraint: one person per role per request (unique on requestId + role).
 * Roles: DESIGN | VIDEO | CONTENT | SOCIAL | UPLOADING
 */

import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { db as prisma }     from "@/lib/db";
import { createNotification } from "../../../utils";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["DESIGN", "VIDEO", "CONTENT", "SOCIAL", "UPLOADING"] as const;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const pocs = await (prisma as any).designRequestPOC.findMany({
    where:   { requestId: params.id },
    include: { user: { select: { id: true, name: true, email: true, image: true, department: true } } },
    orderBy: { addedAt: "asc" },
  });

  return NextResponse.json({ pocs });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json() as { userId: string; role: string };
  if (!body.userId || !body.role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  if (!VALID_ROLES.includes(body.role as any)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  const request = await (prisma as any).designRequest.findUnique({
    where: { id: params.id },
    select: { id: true, refId: true, title: true },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Upsert: if this role already has someone, replace them
  const existing = await (prisma as any).designRequestPOC.findUnique({
    where: { requestId_role: { requestId: params.id, role: body.role } },
    include: { user: { select: { name: true } } },
  });

  if (existing) {
    await (prisma as any).designRequestPOC.delete({
      where: { requestId_role: { requestId: params.id, role: body.role } },
    });
  }

  const poc = await (prisma as any).designRequestPOC.create({
    data:    { requestId: params.id, userId: body.userId, role: body.role },
    include: { user: { select: { id: true, name: true, email: true, image: true, department: true } } },
  });

  const actorName = (session.user as any).name ?? session.user.email;
  await (prisma as any).designRequestNote.create({
    data: {
      requestId: params.id,
      isSystem:  true,
      authorId:  (session.user as any).id ?? null,
      body: existing
        ? `${poc.user.name} replaced ${existing.user.name} as ${body.role} POC (assigned by ${actorName}).`
        : `${poc.user.name} assigned as ${body.role} POC by ${actorName}.`,
    },
  });

  // Notify the newly assigned POC
  await createNotification(
    body.userId,
    params.id,
    `You've been assigned as ${body.role} POC`,
    `${actorName} assigned you as ${body.role} POC on "${request.title}" (${request.refId}).`
  );

  return NextResponse.json({ poc });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json() as { role: string };
  if (!body.role) return NextResponse.json({ error: "role required" }, { status: 400 });

  const existing = await (prisma as any).designRequestPOC.findUnique({
    where:   { requestId_role: { requestId: params.id, role: body.role } },
    include: { user: { select: { name: true } } },
  });
  if (!existing) return NextResponse.json({ error: "POC not found" }, { status: 404 });

  await (prisma as any).designRequestPOC.delete({
    where: { requestId_role: { requestId: params.id, role: body.role } },
  });

  const actorName = (session.user as any).name ?? session.user.email;
  await (prisma as any).designRequestNote.create({
    data: {
      requestId: params.id,
      isSystem:  true,
      authorId:  (session.user as any).id ?? null,
      body:      `${existing.user.name} removed as ${body.role} POC by ${actorName}.`,
    },
  });

  return NextResponse.json({ removed: true });
}
