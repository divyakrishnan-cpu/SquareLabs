import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";

export const dynamic = "force-dynamic";

// ── PATCH /api/team/[id] ──────────────────────────────────────────────────
// Update a team member's role, department, accessSections, or isActive status.
// Only ADMIN can change roles. ADMIN or HEAD_OF_MARKETING can change access.

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const actor   = session?.user as any;
  if (!actor) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const allowedRoles = ["ADMIN", "HEAD_OF_MARKETING"];
  if (!allowedRoles.includes(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { role, department, accessSections, isActive, name } = body;

  // Only ADMIN can promote/demote roles
  if (role && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
  }

  // Prevent non-admins from modifying admins
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if ((target as any).role === "ADMIN" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Cannot modify an admin" }, { status: 403 });
  }

  const updated = await (prisma.user.update as any)({
    where: { id: params.id },
    data: {
      ...(name           !== undefined && { name }),
      ...(role           !== undefined && { role }),
      ...(department     !== undefined && { department }),
      ...(accessSections !== undefined && { accessSections }),
      ...(isActive       !== undefined && { isActive }),
    },
    select: {
      id: true, name: true, email: true, role: true,
      department: true, accessSections: true, isActive: true,
    },
  });

  return NextResponse.json(updated);
}

// ── DELETE /api/team/[id] ─────────────────────────────────────────────────
// Deactivate (soft delete) a user. Only ADMIN.

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const actor   = session?.user as any;
  if (!actor || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  await (prisma.user.update as any)({
    where: { id: params.id },
    data:  { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
