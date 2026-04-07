import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }     from "@/lib/db";

export const dynamic = "force-dynamic";

// Returns all users with their active task counts — used to populate assignee dropdowns
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { isActive: true } as any,
    select: {
      id:         true,
      name:       true,
      email:      true,
      role:       true,
      department: true,
    } as any,
    orderBy: { name: "asc" },
  });

  // Count active requests per designer
  const activeCounts = await (prisma as any).designRequest.groupBy({
    by: ["assignedToId"],
    where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "REVIEW"] } },
    _count: { id: true },
  });

  const countMap: Record<string, number> = {};
  for (const row of activeCounts) {
    if (row.assignedToId) countMap[row.assignedToId] = row._count.id;
  }

  const result = users.map((u: any) => ({
    ...u,
    activeRequests: countMap[u.id] ?? 0,
  }));

  return NextResponse.json(result);
}
