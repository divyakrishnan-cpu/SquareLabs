/**
 * POST /api/orm/gmb/scrape-ratings
 *
 * Fetches current Google ratings for all GMB locations that have no
 * rating data yet (zero snapshots in the DB) using the Google Places API.
 *
 * Requires GOOGLE_PLACES_API_KEY environment variable.
 *
 * Strategy per location:
 *   1. Use mapsUrl to extract Place ID via Places API URL lookup
 *   2. Fall back to Text Search: "{name} {city} {country}"
 *
 * Results are written to gmbRatingSnapshot for the current week.
 */

export const dynamic  = "force-dynamic";
export const maxDuration = 60;

import { NextResponse }     from "next/server";
import { getServerSession }  from "next-auth";
import { authOptions }       from "@/lib/auth";
import { db as prisma }      from "@/lib/db";

// ── Monday of the current UTC week ────────────────────────────────────────

function getThisMonday(): Date {
  const now  = new Date();
  const day  = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

// ── Google Places: Text Search → rating ───────────────────────────────────

async function fetchPlaceRating(
  name: string,
  city: string,
  country: string,
  apiKey: string,
): Promise<{ rating: number | null; reviewCount: number | null; placeId: string | null }> {
  try {
    const query   = encodeURIComponent(`${name} ${city} ${country}`);
    const fields  = "place_id,rating,user_ratings_total";
    const url     = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=${fields}&key=${apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { rating: null, reviewCount: null, placeId: null };

    const data = await res.json();

    if (data.status !== "OK" || !data.candidates?.length) {
      return { rating: null, reviewCount: null, placeId: null };
    }

    const place = data.candidates[0];
    return {
      rating:      place.rating       ?? null,
      reviewCount: place.user_ratings_total ?? null,
      placeId:     place.place_id     ?? null,
    };
  } catch {
    return { rating: null, reviewCount: null, placeId: null };
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await (prisma as any).user.findUnique({ where: { email: session.user.email } });
  if (!user || !["HEAD_OF_MARKETING", "TEAM_LEAD"].includes(user.role)) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "missing_api_key",
      message:
        "GOOGLE_PLACES_API_KEY is not set. " +
        "To enable live rating scraping: " +
        "1) Go to console.cloud.google.com → Create/select a project → Enable 'Places API' " +
        "2) Create an API key under APIs & Services → Credentials " +
        "3) Add GOOGLE_PLACES_API_KEY=<your_key> to your Vercel environment variables " +
        "4) Redeploy.",
    }, { status: 503 });
  }

  // Locations with no rating snapshots yet
  const allLocations: any[] = await (prisma as any).gmbLocation.findMany({
    include: { _count: { select: { snapshots: true } } },
    orderBy: [{ business: "asc" }, { city: "asc" }],
  });

  const targets = allLocations.filter((l: any) => l._count.snapshots === 0);

  if (targets.length === 0) {
    return NextResponse.json({
      message: "All locations already have rating data.",
      results: [],
      found:   0,
      total:   0,
    });
  }

  const weekStart = getThisMonday();
  const results: {
    id: string; name: string; city: string; business: string;
    rating: number | null; reviewCount: number | null; placeId: string | null; source: string;
  }[] = [];

  for (const loc of targets) {
    const found = await fetchPlaceRating(loc.name, loc.city, loc.country, apiKey);

    if (found.rating !== null) {
      await (prisma as any).gmbRatingSnapshot.upsert({
        where:  { locationId_weekStart: { locationId: loc.id, weekStart } },
        update: { rating: found.rating, reviewCount: found.reviewCount, source: "scraped" },
        create: { locationId: loc.id, weekStart, rating: found.rating, reviewCount: found.reviewCount, source: "scraped" },
      });

      // Persist placeId on the location if we got one and it's not already set
      if (found.placeId && !loc.placeId) {
        await (prisma as any).gmbLocation.update({
          where: { id: loc.id },
          data:  { placeId: found.placeId },
        });
      }
    }

    results.push({
      id:          loc.id,
      name:        loc.name,
      city:        loc.city,
      business:    loc.business,
      rating:      found.rating,
      reviewCount: found.reviewCount,
      placeId:     found.placeId,
      source:      found.rating !== null ? "places_api" : "not_found",
    });

    // Small pause to respect rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  const foundCount = results.filter(r => r.rating !== null).length;

  return NextResponse.json({
    message: `Processed ${targets.length} locations — found ratings for ${foundCount}.`,
    results,
    found:  foundCount,
    total:  targets.length,
  });
}
