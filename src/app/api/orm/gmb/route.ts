/**
 * GET /api/orm/gmb
 *
 * Returns all GMB locations with their historical rating snapshots.
 * Used by the GMB dashboard to render ratings, trends, and weekly deltas.
 */

import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { db as prisma }    from "@/lib/db";

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
      id:         loc.id,
      business:   loc.business,
      city:       loc.city,
      country:    loc.country,
      name:       loc.name,
      address:    loc.address,
      gmbUrl:     loc.gmbUrl,
      handledBy:  loc.handledBy,
      status:     loc.status,
      placeId:    loc.placeId,
      notes:      loc.notes,

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
