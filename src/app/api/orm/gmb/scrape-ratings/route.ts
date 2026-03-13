/**
 * POST /api/orm/gmb/scrape-ratings
 *
 * Fetches current Google ratings for all GMB locations that have no
 * rating data yet (zero snapshots in the DB).
 *
 * Strategy per location:
 *   1. Use mapsUrl (maps.app.goo.gl short link) – most reliable, follows redirects
 *   2. Fall back to a Google Maps text-search URL built from name + city
 *
 * Parses the page HTML for:
 *   – JSON-LD  aggregateRating.ratingValue
 *   – aria-label "X.X stars"
 *   – Google's internal data array pattern
 *   – Meta description rating strings
 *
 * Results are written to gmbRatingSnapshot for the current week.
 */

export const dynamic  = "force-dynamic";
export const maxDuration = 60; // Vercel Pro: up to 60 s

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

// ── Scrape a single Google Maps URL ───────────────────────────────────────

async function scrapeGoogleRating(
  url: string
): Promise<{ rating: number | null; reviewCount: number | null }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://www.google.com/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return { rating: null, reviewCount: null };

    const html = await res.text();

    // ── Pattern 1: JSON-LD aggregateRating ─────────────────────────────
    // Matches: "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.2","reviewCount":"1234"}
    const jsonLdBlock = html.match(/"aggregateRating"\s*:\s*\{([^}]{0,300})\}/);
    if (jsonLdBlock) {
      const rv = jsonLdBlock[1].match(/"ratingValue"\s*:\s*"?([\d.]+)"?/);
      const rc = jsonLdBlock[1].match(/"reviewCount"\s*:\s*"?(\d+)"?/);
      if (rv) {
        return {
          rating:      parseFloat(rv[1]),
          reviewCount: rc ? parseInt(rc[1]) : null,
        };
      }
    }

    // ── Pattern 2: Google Maps internal data — [rating, reviewCount, ...] ──
    // Google often encodes place data like: [[4.2,1234,...]
    const gInternal = html.match(/\[\s*(\d\.\d)\s*,\s*(\d+)\s*,/);
    if (gInternal) {
      const r = parseFloat(gInternal[1]);
      if (r >= 1 && r <= 5) {
        return { rating: r, reviewCount: parseInt(gInternal[2]) };
      }
    }

    // ── Pattern 3: aria-label "X.X stars" ──────────────────────────────
    const aria = html.match(/aria-label="([\d.]+)\s*(?:out of 5\s*)?star/i);
    if (aria) {
      const r = parseFloat(aria[1]);
      if (r >= 1 && r <= 5) return { rating: r, reviewCount: null };
    }

    // ── Pattern 4: meta description ──────────────────────────────────────
    // <meta name="description" content="... 4.2 stars ...">
    const metaRating = html.match(
      /<meta[^>]+name="description"[^>]+content="[^"]*?([\d.]+)\s*(?:★|⭐|stars?)/i
    );
    if (metaRating) {
      const r = parseFloat(metaRating[1]);
      if (r >= 1 && r <= 5) return { rating: r, reviewCount: null };
    }

    // ── Pattern 5: title tag  "Place Name · 4.2 ⭐" ────────────────────
    const titleRating = html.match(/<title>[^<]*?([\d.]+)\s*(?:⭐|★|stars?)[^<]*<\/title>/i);
    if (titleRating) {
      const r = parseFloat(titleRating[1]);
      if (r >= 1 && r <= 5) return { rating: r, reviewCount: null };
    }

    return { rating: null, reviewCount: null };
  } catch {
    return { rating: null, reviewCount: null };
  }
}

// ── Build a Google Maps search URL as fallback ─────────────────────────────

function buildSearchUrl(name: string, city: string, country: string): string {
  const q = encodeURIComponent(`${name} ${city} ${country}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await (prisma as any).user.findUnique({ where: { email: session.user.email } });
  if (!user || !["HEAD_OF_MARKETING", "TEAM_LEAD"].includes(user.role)) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  // All locations — we'll try any that have no snapshots at all
  const allLocations: any[] = await (prisma as any).gmbLocation.findMany({
    include: { _count: { select: { snapshots: true } } },
    orderBy: [{ business: "asc" }, { city: "asc" }],
  });

  const targets = allLocations.filter((l: any) => l._count.snapshots === 0);

  if (targets.length === 0) {
    return NextResponse.json({
      message: "All locations already have rating data.",
      results: [],
      found: 0,
      total: 0,
    });
  }

  const weekStart = getThisMonday();
  const results: { id: string; name: string; city: string; business: string; rating: number | null; reviewCount: number | null; source: string }[] = [];

  for (const loc of targets) {
    // Try mapsUrl first, then a text-search fallback
    const primaryUrl  = loc.mapsUrl ?? null;
    const fallbackUrl = buildSearchUrl(loc.name, loc.city, loc.country);

    let found = { rating: null as number | null, reviewCount: null as number | null };

    if (primaryUrl) {
      found = await scrapeGoogleRating(primaryUrl);
    }
    if (found.rating === null) {
      found = await scrapeGoogleRating(fallbackUrl);
    }

    const source = found.rating !== null ? (primaryUrl && found.rating !== null ? "mapsUrl" : "search") : "failed";

    if (found.rating !== null) {
      await (prisma as any).gmbRatingSnapshot.upsert({
        where:  { locationId_weekStart: { locationId: loc.id, weekStart } },
        update: { rating: found.rating, reviewCount: found.reviewCount, source: "scraped" },
        create: { locationId: loc.id, weekStart, rating: found.rating, reviewCount: found.reviewCount, source: "scraped" },
      });
    }

    results.push({
      id:          loc.id,
      name:        loc.name,
      city:        loc.city,
      business:    loc.business,
      rating:      found.rating,
      reviewCount: found.reviewCount,
      source,
    });

    // Brief pause — be polite to Google's servers
    await new Promise(r => setTimeout(r, 400));
  }

  const found = results.filter(r => r.rating !== null).length;

  return NextResponse.json({
    message: `Scraped ${targets.length} locations — found ${found} ratings.`,
    results,
    found,
    total:  targets.length,
  });
}
