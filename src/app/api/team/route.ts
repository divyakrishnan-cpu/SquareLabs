import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";

export const dynamic = "force-dynamic";

// ── GET /api/team ─────────────────────────────────────────────────────────
// Returns all users with their role, department, accessSections.
// Restricted to ADMIN or HEAD_OF_MARKETING.

export async function GET() {
  const session = await getServerSession(authOptions);
  const user    = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const allowedRoles = ["ADMIN", "HEAD_OF_MARKETING"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.user.findMany({
    select: {
      id:             true,
      name:           true,
      email:          true,
      role:           true,
      department:     true,
      accessSections: true,
      isActive:       true,
      createdAt:      true,
      teamId:         true,
      team:           { select: { name: true, slug: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  } as any);

  return NextResponse.json(members);
}

// ── POST /api/team ────────────────────────────────────────────────────────
// Create a new team member. ADMIN only.
// Generates a random temporary password; the user should reset it on first login.

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const actor   = session?.user as any;
  if (!actor || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, role, department, accessSections } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  // Generate a temporary password (they'll reset it)
  const bcrypt = await import("bcryptjs");
  const tempPwd = Math.random().toString(36).slice(-10);
  const hash    = await bcrypt.hash(tempPwd, 10);

  const user = await (prisma.user.create as any)({
    data: {
      name,
      email,
      password:       hash,
      role:           role           ?? "TEAM_MEMBER",
      department:     department     ?? null,
      accessSections: accessSections ?? ["DASHBOARD"],
      isActive:       true,
    },
    select: {
      id: true, name: true, email: true, role: true,
      department: true, accessSections: true, isActive: true,
    },
  });

  return NextResponse.json({ ...user, tempPassword: tempPwd }, { status: 201 });
}
