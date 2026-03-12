/**
 * POST /api/meta/instagram/sync-daily
 * GET  /api/meta/instagram/sync-daily?secret=...  (for Vercel Cron)
 *
 * Fetches today's Instagram metrics for all connected accounts and stores
 * one row per account per day in social_metric_snapshots.
 *
 * - Views, reach, interactions, link clicks, profile visits → Meta Insights API
 * - Follows / unfollows → follows_and_unfollows metric breakdown
 * - Net follower change → today's followers_count minus yesterday's DB snapshot
 * - Follower count → current value from account info endpoint
 *
 * Called automatically by Vercel Cron at 23:45 UTC daily.
 * Can also be triggered manually from the dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const META         = "https://graph.facebook.com/v20.0";
const CRON_SECRET  = process.env.CRON_SECRET ?? "squarelabs-cron";

// ── Fetch a single total-value metric for a 24h window ────────────────────

async function fetchTotal(igId: string, metric: string, since: number, until: number, token: string): Promise<number> {
  try {
    const url = `${META}/${igId}/insights?metric=${metric}&period=day&metric_type=total_value` +
                `&since=${since}&until=${until}&access_token=${token}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) return 0;
    return data.data?.[0]?.total_value?.value ?? 0;
  } catch { return 0; }
}

// ── Fetch reach for a day (day-series, single day = one value) ────────────

async function fetchReach(igId: string, since: number, until: number, token: string): Promise<number> {
  try {
    const url = `${META}/${igId}/insights?metric=reach&period=day` +
                `&since=${since}&until=${until}&access_token=${token}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) return 0;
    const values = data.data?.[0]?.values ?? [];
    return values.reduce((s: number, v: { value: number }) => s + (v.value ?? 0), 0);
  } catch { return 0; }
}

// ── Fetch follows and unfollows for a day ─────────────────────────────────

async function fetchFollowsUnfollows(igId: string, since: number, until: number, token: string): Promise<{ follows: number; unfollows: number }> {
  try {
    const url = `${META}/${igId}/insights?metric=follows_and_unfollows` +
                `&period=day&metric_type=total_value&breakdown=follow_type` +
                `&since=${since}&until=${until}&access_token=${token}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) return { follows: 0, unfollows: 0 };

    let follows = 0, unfollows = 0;
    const breakdowns = data.data?.[0]?.total_value?.breakdowns ?? [];
    for (const bd of breakdowns) {
      for (const r of (bd.results ?? [])) {
        const dim = (r.dimension_values?.[0] ?? "").toUpperCase();
        if      (dim === "FOLLOW")   follows   = r.value ?? 0;
        else if (dim === "UNFOLLOW") unfollows = r.value ?? 0;
      }
    }
    // Fallback: if breakdown not available, treat total as net follows
    if (follows === 0 && unfollows === 0) {
      follows = data.data?.[0]?.total_value?.value ?? 0;
    }
    return { follows, unfollows };
  } catch { return { follows: 0, unfollows: 0 }; }
}

// ── Count posts published today ───────────────────────────────────────────

async function fetchTodayPosts(igId: string, token: string, sinceStr: string, untilStr: string) {
  try {
    const url = `${META}/${igId}/media?fields=id,media_type,timestamp&limit=50&access_token=${token}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) return { total: 0, video: 0, image: 0 };

    const inRange = (data.data ?? []).filter((m: { timestamp: string }) => {
      const d = m.timestamp.split("T")[0];
      return d >= sinceStr && d <= untilStr;
    });

    let video = 0, image = 0;
    for (const m of inRange) {
      const t = (m.media_type ?? "").toUpperCase();
      if (t === "VIDEO" || t === "REEL") video++;
      else image++;
    }
    return { total: inRange.length, video, image };
  } catch { return { total: 0, video: 0, image: 0 }; }
}

// ── Main sync logic for one account ──────────────────────────────────────

async function syncAccount(intg: {
  instagramAccountId: string;
  vertical: string | null;
  userAccessToken: string | null;
  pageAccessToken: string;
  instagramHandle: string | null;
  instagramName: string | null;
  followersCount: number | null;
}) {
  const igId  = intg.instagramAccountId;
  const token = (intg.userAccessToken || intg.pageAccessToken) as string;
  const vertical = (intg.vertical ?? "SY_INDIA") as "SY_INDIA" | "SY_UAE" | "INTERIOR" | "SQUARE_CONNECT" | "UM";

  // Build today's time window (UTC midnight → 23:59)
  const now       = new Date();
  const todayStr  = now.toISOString().split("T")[0];
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
  const todayEnd   = new Date(`${todayStr}T23:59:59.000Z`);
  const sinceTs    = Math.floor(todayStart.getTime() / 1000);
  const untilTs    = Math.floor(todayEnd.getTime()   / 1000);

  // Fetch account info (current follower count)
  let followersCount = intg.followersCount ?? 0;
  try {
    const r = await fetch(`${META}/${igId}?fields=followers_count&access_token=${token}`);
    const d = await r.json();
    if (!d.error && d.followers_count) followersCount = d.followers_count;
  } catch { /* use stored count */ }

  // Fetch yesterday's snapshot for net follower change
  const yesterdayStr = new Date(todayStart.getTime() - 86400000).toISOString().split("T")[0];
  const yesterday    = await prisma.socialMetricSnapshot.findFirst({
    where: { vertical, platform: "INSTAGRAM", date: new Date(yesterdayStr) },
    select: { followers: true },
  });
  const yesterdayFollowers = yesterday?.followers ?? followersCount;
  const netFollowerChange  = followersCount - yesterdayFollowers;

  // Parallel fetch of all today's metrics
  const [views, reach, profileViews, websiteClicks, interactions, followData, posts] = await Promise.all([
    fetchTotal(igId, "views",               sinceTs, untilTs, token),
    fetchReach(igId,                         sinceTs, untilTs, token),
    fetchTotal(igId, "profile_views",        sinceTs, untilTs, token),
    fetchTotal(igId, "website_clicks",       sinceTs, untilTs, token),
    fetchTotal(igId, "total_interactions",   sinceTs, untilTs, token),
    fetchFollowsUnfollows(igId,              sinceTs, untilTs, token),
    fetchTodayPosts(igId, token, todayStr, todayStr),
  ]);

  // Upsert into social_metric_snapshots
  await prisma.socialMetricSnapshot.upsert({
    where:  { vertical_platform_date: { vertical, platform: "INSTAGRAM", date: new Date(todayStr) } },
    update: {
      followers:       followersCount,
      follows:         followData.follows,
      unfollows:       followData.unfollows,
      netFollowers:    netFollowerChange,
      views,
      reach,
      impressions:     views,   // keep impressions col in sync
      interactions,
      linkClicks:      websiteClicks,
      profileVisits:   profileViews,
      postsPublished:  posts.total,
      videosPublished: posts.video,
      staticsPublished: posts.image,
    },
    create: {
      vertical,
      platform:        "INSTAGRAM",
      date:            new Date(todayStr),
      followers:       followersCount,
      follows:         followData.follows,
      unfollows:       followData.unfollows,
      netFollowers:    netFollowerChange,
      views,
      reach,
      impressions:     views,
      interactions,
      linkClicks:      websiteClicks,
      profileVisits:   profileViews,
      postsPublished:  posts.total,
      videosPublished: posts.video,
      staticsPublished: posts.image,
    },
  });

  return {
    igId, vertical, date: todayStr,
    followersCount, netFollowerChange,
    follows: followData.follows, unfollows: followData.unfollows,
    views, reach, interactions,
  };
}

// ── Route handlers ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Manual trigger from dashboard (requires login)
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Optionally sync a specific vertical from body
  const body     = await req.json().catch(() => ({}));
  const vertical = body.vertical as string | undefined;

  return runSync(user.id, vertical);
}

export async function GET(req: NextRequest) {
  // Vercel Cron trigger (unauthenticated, protected by secret)
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runSync(null, null);
}

async function runSync(userId: string | null, verticalFilter: string | null | undefined) {
  const integrations = await prisma.metaIntegration.findMany({
    where: {
      ...(userId ? { userId } : {}),
      isActive:           true,
      instagramAccountId: { not: null },
      ...(verticalFilter ? { vertical: verticalFilter as never } : {}),
    },
  });

  if (integrations.length === 0) {
    return NextResponse.json({ synced: 0, message: "No connected Instagram accounts found" });
  }

  const results = [];
  for (const intg of integrations) {
    try {
      const result = await syncAccount({
        instagramAccountId: intg.instagramAccountId!,
        vertical:           intg.vertical as string | null,
        userAccessToken:    intg.userAccessToken,
        pageAccessToken:    intg.pageAccessToken,
        instagramHandle:    intg.instagramHandle,
        instagramName:      intg.instagramName,
        followersCount:     intg.followersCount,
      });
      results.push({ status: "ok", ...result });
    } catch (e) {
      results.push({ status: "error", igId: intg.instagramAccountId, error: String(e) });
    }
  }

  return NextResponse.json({ synced: results.filter(r => r.status === "ok").length, results });
}
