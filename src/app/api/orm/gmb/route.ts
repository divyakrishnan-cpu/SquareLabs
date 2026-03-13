/**
 * GET /api/orm/gmb
 *
 * Returns all GMB locations with their historical rating snapshots.
 * Used by the GMB dashboard to render ratings, trends, and weekly deltas.
 */

// Always run fresh — never serve a cached response
export const dynamic = "force-dynamic";

import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";
import crypto              from "crypto";

// Returns the Monday of the current week (UTC)
function getThisMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay();              // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;   // shift back to Monday
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }

  const locations = await (prisma as any).gmbLocation.findMany({
    orderBy: [{ business: "asc" }, { city: "asc" }],
    include: {
      snapshots: {
        orderBy: { weekStart: "asc" },
      },
    },
  });

  // Enrich each location with derived summary fields
  const enriched = locations.map((loc: any) => {
    const snaps = loc.snapshots as any[];
    const latest = snaps.length > 0 ? snaps[snaps.length - 1] : null;
    const prev   = snaps.length > 1 ? snaps[snaps.length - 2] : null;

    return {
      id:           loc.id,
      business:     loc.business,
      city:         loc.city,
      country:      loc.country,
      name:         loc.name,
      address:      loc.address,
      gmbUrl:       loc.gmbUrl,
      mapsUrl:      loc.mapsUrl   ?? null,
      displayLabel: loc.displayLabel ?? null,
      handledBy:    loc.handledBy,
      status:       loc.status,
      placeId:      loc.placeId,
      notes:        loc.notes,

      // Latest snapshot summary
      currentRating:  latest?.rating    ?? null,
      currentReviews: latest?.reviewCount ?? null,
      newReviews:     latest?.newReviews ?? null,
      ratingDelta:    latest?.ratingDelta ?? null,
      lastUpdated:    latest?.weekStart ?? null,

      // Previous rating for sparkline comparison
      prevRating: prev?.rating ?? null,

      // Full history for chart
      history: snaps.map((s: any) => ({
        weekStart:   s.weekStart,
        rating:      s.rating,
        reviewCount: s.reviewCount,
        newReviews:  s.newReviews,
        ratingDelta: s.ratingDelta,
      })),
    };
  });

  // Summary stats
  const tracked     = enriched.filter((l: any) => l.currentRating !== null);
  const avgRating   = tracked.length > 0
    ? Math.round((tracked.reduce((s: number, l: any) => s + l.currentRating, 0) / tracked.length) * 10) / 10
    : null;
  const topGrowing  = [...tracked]
    .filter((l: any) => l.ratingDelta !== null && l.ratingDelta > 0)
    .sort((a: any, b: any) => (b.ratingDelta ?? 0) - (a.ratingDelta ?? 0))
    .slice(0, 5);
  const needsAttention = [...tracked]
    .filter((l: any) => l.currentRating !== null && l.currentRating < 4.0)
    .sort((a: any, b: any) => (a.currentRating ?? 0) - (b.currentRating ?? 0));

  return NextResponse.json({
    locations: enriched,
    summary: {
      total:          enriched.length,
      tracked:        tracked.length,
      avgRating,
      topGrowing,
      needsAttention,
    },
  });
}

// ── POST /api/orm/gmb — create a new GMB location ─────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await (prisma as any).user.findUnique({ where: { email: session.user.email } });
  if (!user || !["HEAD_OF_MARKETING", "TEAM_LEAD"].includes(user.role)) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const { business, city, country, name, address, gmbUrl, mapsUrl, displayLabel, handledBy, status, currentRating } = await req.json();

  if (!business || !city || !country || !name || !gmbUrl) {
    return NextResponse.json({ error: "Missing required fields: business, city, country, name, gmbUrl" }, { status: 400 });
  }

  const locationId = crypto.createHash("sha1").update(gmbUrl).digest("hex").slice(0, 25);

  try {
    const location = await (prisma as any).gmbLocation.create({
      data: {
        id: locationId,
        business, city, country, name,
        address:      address      ?? "",
        gmbUrl,
        mapsUrl:      mapsUrl      ?? null,
        displayLabel: displayLabel ?? null,
        handledBy:    handledBy    ?? null,
        status:       status       ?? "active",
      },
    });

    if (currentRating != null) {
      const weekStart = getThisMonday();
      await (prisma as any).gmbRatingSnapshot.create({
        data: { locationId: location.id, weekStart, rating: Number(currentRating), source: "manual" },
      });
    }

    return NextResponse.json({ success: true, id: location.id });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "A location with this GMB URL already exists." }, { status: 409 });
    throw e;
  }
}
