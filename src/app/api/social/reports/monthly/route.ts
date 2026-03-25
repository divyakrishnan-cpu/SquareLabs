/**
 * GET /api/social/reports/monthly
 *
 * Aggregates SocialMetricSnapshot rows by year+month+platform for a given
 * vertical. Returns monthly summaries used by the MoM/QoQ/YoY report page.
 *
 * Query params:
 *   vertical  — Vertical enum value (default: SY_INDIA)
 *   fromYear  — start year  (default: current year - 1)
 *   toYear    — end year    (default: current year)
 *   platforms — comma-separated list (default: all 4)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";
type Vertical      = "SY_INDIA" | "SY_UAE" | "INTERIOR" | "SQUARE_CONNECT" | "UM";
type SocialPlatform = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "YOUTUBE";

export interface MonthlySnapshot {
  year:             number;
  month:            number;      // 1–12
  platform:         SocialPlatform;
  // Audience
  followers:        number;      // month-end follower count (max of daily rows)
  follows:          number;      // new followers gained
  unfollows:        number;
  netFollowers:     number;
  // Reach
  views:            number;
  reach:            number;
  impressions:      number;
  // Engagement
  interactions:     number;
  likes:            number;
  comments:         number;
  saves:            number;
  shares:           number;
  linkClicks:       number;
  profileVisits:    number;
  // Publishing
  postsPublished:   number;
  videosPublished:  number;
  staticsPublished: number;
  // Meta
  daysStored:       number;      // how many daily rows we have for this month
}

// All months in a year
export interface MonthlyReport {
  vertical: string;
  months:   MonthlySnapshot[];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const sp        = req.nextUrl.searchParams;
  const vertical  = (sp.get("vertical") ?? "SY_INDIA") as Vertical;
  const fromYear  = parseInt(sp.get("fromYear") ?? String(new Date().getFullYear() - 1));
  const toYear    = parseInt(sp.get("toYear")   ?? String(new Date().getFullYear()));
  const platformsParam = sp.get("platforms");
  const platforms: SocialPlatform[] = platformsParam
    ? (platformsParam.split(",") as SocialPlatform[])
    : ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "YOUTUBE"];

  const fromDate = new Date(`${fromYear}-01-01T00:00:00.000Z`);
  const toDate   = new Date(`${toYear}-12-31T23:59:59.000Z`);

  // Fetch all daily snapshots in range — aggregate in JS since Prisma
  // doesn't support GROUP BY on derived date fields (EXTRACT year/month).
  const snapshots = await prisma.socialMetricSnapshot.findMany({
    where: {
      vertical,
      platform:  { in: platforms },
      date:      { gte: fromDate, lte: toDate },
    },
    orderBy: { date: "asc" },
  });

  // Aggregate into year-month-platform buckets
  const buckets = new Map<string, MonthlySnapshot>();

  for (const s of snapshots) {
    const year  = s.date.getFullYear();
    const month = s.date.getMonth() + 1;
    const key   = `${year}-${String(month).padStart(2, "0")}-${s.platform}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        year, month, platform: s.platform,
        followers: 0, follows: 0, unfollows: 0, netFollowers: 0,
        views: 0, reach: 0, impressions: 0,
        interactions: 0, likes: 0, comments: 0, saves: 0, shares: 0,
        linkClicks: 0, profileVisits: 0,
        postsPublished: 0, videosPublished: 0, staticsPublished: 0,
        daysStored: 0,
      });
    }

    const b = buckets.get(key)!;
    // Followers: take the month-end (maximum daily value = last day)
    b.followers        = Math.max(b.followers, s.followers);
    // All other metrics: sum across the month
    b.follows         += s.follows;
    b.unfollows       += s.unfollows;
    b.netFollowers    += s.netFollowers;
    b.views           += s.views;
    b.reach           += s.reach;
    b.impressions     += s.impressions;
    b.interactions    += s.interactions;
    b.likes           += s.likes;
    b.comments        += s.comments;
    b.saves           += s.saves;
    b.shares          += s.shares;
    b.linkClicks      += s.linkClicks;
    b.profileVisits   += s.profileVisits;
    b.postsPublished  += s.postsPublished;
    b.videosPublished += s.videosPublished;
    b.staticsPublished+= s.staticsPublished;
    b.daysStored++;
  }

  const months = Array.from(buckets.values()).sort((a, b) => {
    if (a.year !== b.year)   return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.platform.localeCompare(b.platform);
  });

  return NextResponse.json({ vertical, fromYear, toYear, platforms, months });
}
