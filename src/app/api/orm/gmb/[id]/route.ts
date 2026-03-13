/**
 * PATCH /api/orm/gmb/[id]
 *
 * Updates an existing GMB location.
 * If `currentRating` is provided, upserts a snapshot for the current week.
 */

export const dynamic = "force-dynamic";

import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";

function getThisMonday(): Date {
  const now = new Date();
  const day  = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await (prisma as any).user.findUnique({ where: { email: session.user.email } });
  if (!user || !["HEAD_OF_MARKETING", "TEAM_LEAD"].includes(user.role)) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const body = await req.json();
  const {
    business, city, country, name, address,
    gmbUrl, mapsUrl, displayLabel, handledBy,
    status, currentRating,
  } = body;

  // Build only fields that were sent
  const updateData: Record<string, any> = {};
  if (business     !== undefined) updateData.business     = business;
  if (city         !== undefined) updateData.city         = city;
  if (country      !== undefined) updateData.country      = country;
  if (name         !== undefined) updateData.name         = name;
  if (address      !== undefined) updateData.address      = address;
  if (gmbUrl       !== undefined) updateData.gmbUrl       = gmbUrl;
  if (mapsUrl      !== undefined) updateData.mapsUrl      = mapsUrl      || null;
  if (displayLabel !== undefined) updateData.displayLabel = displayLabel || null;
  if (handledBy    !== undefined) updateData.handledBy    = handledBy    || null;
  if (status       !== undefined) updateData.status       = status;

  try {
    await (prisma as any).gmbLocation.update({
      where: { id: params.id },
      data:  updateData,
    });

    if (currentRating != null && currentRating !== "") {
      const weekStart = getThisMonday();
      await (prisma as any).gmbRatingSnapshot.upsert({
        where:  { locationId_weekStart: { locationId: params.id, weekStart } },
        update: { rating: Number(currentRating), source: "manual" },
        create: { locationId: params.id, weekStart, rating: Number(currentRating), source: "manual" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Location not found." }, { status: 404 });
    throw e;
  }
}
