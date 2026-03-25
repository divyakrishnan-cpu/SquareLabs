/**
 * POST /api/social/sync/monthly          — Manual trigger (requires login)
 * GET  /api/social/sync/monthly?secret=  — Vercel Cron trigger (1st of each month)
 *
 * Syncs social metrics from all connected platforms for a given month and
 * upserts the results into social_monthly_reports (one row per vertical/month).
 *
 * Body (POST): { year?: number, month?: number, vertical?: string }
 *   Defaults to previous calendar month if year/month omitted.
 *   Defaults to all verticals if vertical omitted.
 *
 * Flow per vertical:
 *   1. Instagram  — aggregates existing SocialMetricSnapshot daily rows (DB)
 *   2. Facebook   — fetches Meta Graph API page insights
 *   3. LinkedIn   — fetches LinkedIn org follower + share stats
 *   4. YouTube    — fetches YouTube Analytics (refreshes token if needed)
 *   → Merges platform data, builds platformBreakdown JSON, upserts report
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

import { getInstagramMonthData }     from "@/lib/social-sync/instagram";
import { getFacebookMonthData }      from "@/lib/social-sync/facebook";
import { getLinkedInMonthData }      from "@/lib/social-sync/linkedin";
import { getYouTubeMonthData }       from "@/lib/social-sync/youtube";
import { aggregatePlatforms, type PlatformMonthData } from "@/lib/social-sync/types";

const CRON_SECRET = process.env.CRON_SECRET ?? "squarelabs-cron";

// ── Helpers ────────────────────────────────────────────────────────────────

function prevMonth(): { year: number; month: number } {
  const now = new Date();
  if (now.getMonth() === 0) return { year: now.getFullYear() - 1, month: 12 };
  return { year: now.getFullYear(), month: now.getMonth() };
}

// ── Core sync for a single vertical ───────────────────────────────────────

async function syncVertical(vertical: string, year: number, month: number) {
  const platformData: PlatformMonthData[] = [];
  const errors: { platform: string; message: string }[] = [];

  // ── 1. Instagram (from daily DB snapshots) ───────────────────────────
  try {
    const ig = await getInstagramMonthData(vertical, year, month);
    if (ig.totalFollowers > 0 || ig.totalReach > 0 || ig.interactions > 0) {
      platformData.push(ig);
    }
  } catch (e) { errors.push({ platform: "INSTAGRAM", message: String(e) }); }

  // ── 2. Facebook (Meta Graph API) ────────────────────────────────────
  try {
    const metaIntg = await prisma.metaIntegration.findFirst({
      where: { vertical: vertical as any, isActive: true },
    });
    if (metaIntg?.pageAccessToken) {
      const fb = await getFacebookMonthData(
        { pageId: metaIntg.pageId, pageAccessToken: metaIntg.pageAccessToken, pageName: metaIntg.pageName },
        year, month
      );
      if (fb.totalFollowers > 0 || fb.totalImpressions > 0) {
        platformData.push(fb);
      }
    }
  } catch (e) { errors.push({ platform: "FACEBOOK", message: String(e) }); }

  // ── 3. LinkedIn ──────────────────────────────────────────────────────
  try {
    // Find integration by trying to match org name to vertical
    // (LinkedinIntegration has no vertical field — match by page name similarity)
    const liIntgs = await (prisma as any).linkedinIntegration.findMany({
      where: { isActive: true },
    });
    for (const liIntg of liIntgs) {
      // Try to match to vertical via org name — use the same name mapping as Meta
      const orgNameLower = (liIntg.name ?? "").toLowerCase();
      const matches = verticalMatchesOrgName(vertical, orgNameLower);
      if (!matches) continue;

      const li = await getLinkedInMonthData(
        { id: liIntg.id, organizationId: liIntg.organizationId,
          accessToken: liIntg.accessToken, refreshToken: liIntg.refreshToken,
          tokenExpiresAt: liIntg.tokenExpiresAt },
        year, month
      );
      if (li.totalFollowers > 0 || li.totalImpressions > 0) {
        platformData.push(li);
        break; // one LinkedIn org per vertical
      }
    }
  } catch (e) { errors.push({ platform: "LINKEDIN", message: String(e) }); }

  // ── 4. YouTube ───────────────────────────────────────────────────────
  try {
    const ytIntgs = await (prisma as any).youtubeIntegration.findMany({
      where: { isActive: true },
    });
    for (const ytIntg of ytIntgs) {
      const channelNameLower = (ytIntg.channelName ?? "").toLowerCase();
      if (!verticalMatchesOrgName(vertical, channelNameLower)) continue;

      const yt = await getYouTubeMonthData(
        { id: ytIntg.id, channelId: ytIntg.channelId,
          accessToken: ytIntg.accessToken, refreshToken: ytIntg.refreshToken,
          tokenExpiresAt: ytIntg.tokenExpiresAt },
        year, month
      );
      if (yt.totalFollowers > 0 || yt.totalViews > 0) {
        platformData.push(yt);
        break; // one YT channel per vertical
      }
    }
  } catch (e) { errors.push({ platform: "YOUTUBE", message: String(e) }); }

  if (platformData.length === 0) {
    return { vertical, year, month, platformData: [], errors, skipped: true };
  }

  // ── Aggregate + upsert ───────────────────────────────────────────────
  const agg = aggregatePlatforms(platformData);

  // Build platformBreakdown as simple JSON (only platforms with data)
  const breakdown = platformData.map(p => ({
    platform:     p.platform,
    followers:    p.totalFollowers,
    reach:        p.totalReach,
    interactions: p.interactions,
    posts:        p.postsPublished,
    videos:       p.videosPublished,
    statics:      p.staticsPublished,
  }));

  await (prisma.socialMonthlyReport as any).upsert({
    where: { vertical_year_month: { vertical, year, month } },
    create: { vertical, year, month, ...agg, platformBreakdown: breakdown, notes: `Auto-synced ${new Date().toISOString()}` },
    update: { ...agg, platformBreakdown: breakdown, notes: `Auto-synced ${new Date().toISOString()}`, updatedAt: new Date() },
  });

  return { vertical, year, month, platformData, errors, skipped: false };
}

// ── Vertical ↔ org name matcher (same logic as meta.ts detectVertical) ────

function verticalMatchesOrgName(vertical: string, name: string): boolean {
  switch (vertical) {
    case "SY_INDIA":
      return (name.includes("square yards") || name.includes("squareyards")) &&
             !name.includes("uae") && !name.includes("dubai") && !name.includes("interior");
    case "SY_UAE":
      return (name.includes("square yards") || name.includes("squareyards")) &&
             (name.includes("uae") || name.includes("dubai") || name.includes("international"));
    case "INTERIOR":
      return name.includes("interior");
    case "SQUARE_CONNECT":
      return name.includes("square connect") || name.includes("squareconnect");
    case "UM":
      return name.includes("urban money") || name.includes("urbanmoney") || /\bum\b/.test(name);
    default:
      return false;
  }
}

// ── Route handlers ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { year: bodyYear, month: bodyMonth, vertical: bodyVertical } = body as Record<string, number | string | undefined>;

  // Default to previous month
  const { year, month } = (bodyYear && bodyMonth)
    ? { year: Number(bodyYear), month: Number(bodyMonth) }
    : prevMonth();

  return runSync(year, month, bodyVertical as string | undefined);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { year, month } = prevMonth();
  return runSync(year, month, undefined);
}

async function runSync(year: number, month: number, verticalFilter?: string) {
  // All verticals we support
  const ALL_VERTICALS = ["SY_INDIA", "SY_UAE", "INTERIOR", "SQUARE_CONNECT", "UM"];
  const verticals = verticalFilter ? [verticalFilter] : ALL_VERTICALS;

  const results = [];
  for (const v of verticals) {
    try {
      const r = await syncVertical(v, year, month);
      results.push({ status: r.skipped ? "skipped" : "ok", ...r });
    } catch (e) {
      results.push({ status: "error", vertical: v, year, month, message: String(e) });
    }
  }

  const synced  = results.filter(r => r.status === "ok").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  const errored = results.filter(r => r.status === "error").length;

  return NextResponse.json({
    summary: { year, month, synced, skipped, errored },
    results,
  });
}
