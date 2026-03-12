/**
 * POST /api/meta/instagram/backfill
 *
 * Fetches historical Instagram metrics for all missing days and stores them
 * in social_metric_snapshots. Safe to run multiple times — skips days that
 * already have a snapshot (upserts on conflict).
 *
 * Body: { vertical?: string, days?: number }
 *   vertical — limit to one vertical (e.g. "SY_INDIA"); omit for all
 *   days     — how many days back to fill (default 30, max 30 due to Meta limit)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const META = "https://graph.facebook.com/v20.0";

// ── Helpers (same pattern as sync-daily) ─────────────────────────────────

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
    if (follows === 0 && unfollows === 0) {
      follows = data.data?.[0]?.total_value?.value ?? 0;
    }
    return { follows, unfollows };
  } catch { return { follows: 0, unfollows: 0 }; }
}

async function fetchDayPosts(igId: string, token: string, dateStr: string) {
  try {
    const url = `${META}/${igId}/media?fields=id,media_type,timestamp&limit=100&access_token=${token}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) return { total: 0, video: 0, image: 0 };

    const inRange = (data.data ?? []).filter((m: { timestamp: string }) =>
      m.timestamp.split("T")[0] === dateStr
    );
    let video = 0, image = 0;
    for (const m of inRange) {
      const t = (m.media_type ?? "").toUpperCase();
      if (t === "VIDEO" || t === "REEL") video++;
      else image++;
    }
    return { total: inRange.length, video, image };
  } catch { return { total: 0, video: 0, image: 0 }; }
}

// ── Sync one account for a specific date ─────────────────────────────────

async function syncAccountForDate(
  intg: {
    instagramAccountId: string;
    vertical: string | null;
    userAccessToken: string | null;
    pageAccessToken: string;
    followersCount: number | null;
  },
  dateStr: string,
): Promise<{ date: string; skipped?: boolean }> {
  const igId     = intg.instagramAccountId;
  const token    = (intg.userAccessToken || intg.pageAccessToken) as string;
  const vertical = (intg.vertical ?? "SY_INDIA") as "SY_INDIA" | "SY_UAE" | "INTERIOR" | "SQUARE_CONNECT" | "UM";

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd   = new Date(`${dateStr}T23:59:59.000Z`);
  const sinceTs  = Math.floor(dayStart.getTime() / 1000);
  const untilTs  = Math.floor(dayEnd.getTime()   / 1000);

  // Fetch all metrics for this specific day in parallel
  const [views, reach, profileViews, websiteClicks, interactions, followData, posts] = await Promise.all([
    fetchTotal(igId, "views",             sinceTs, untilTs, token),
    fetchReach(igId,                       sinceTs, untilTs, token),
    fetchTotal(igId, "profile_views",      sinceTs, untilTs, token),
    fetchTotal(igId, "website_clicks",     sinceTs, untilTs, token),
    fetchTotal(igId, "total_interactions", sinceTs, untilTs, token),
    fetchFollowsUnfollows(igId,            sinceTs, untilTs, token),
    fetchDayPosts(igId, token, dateStr),
  ]);

  // For backfilled days, net followers = follows - unfollows (best approximation)
  const netFollowers = followData.follows - followData.unfollows;

  // Upsert — safe to re-run, will update if already exists
  await prisma.socialMetricSnapshot.upsert({
    where:  { vertical_platform_date: { vertical, platform: "INSTAGRAM", date: new Date(dateStr) } },
    update: {
      views, reach, impressions: views, interactions,
      linkClicks:       websiteClicks,
      profileVisits:    profileViews,
      follows:          followData.follows,
      unfollows:        followData.unfollows,
      netFollowers,
      postsPublished:   posts.total,
      videosPublished:  posts.video,
      staticsPublished: posts.image,
    },
    create: {
      vertical, platform: "INSTAGRAM", date: new Date(dateStr),
      followers:        intg.followersCount ?? 0,
      views, reach, impressions: views, interactions,
      linkClicks:       websiteClicks,
      profileVisits:    profileViews,
      follows:          followData.follows,
      unfollows:        followData.unfollows,
      netFollowers,
      postsPublished:   posts.total,
      videosPublished:  posts.video,
      staticsPublished: posts.image,
    },
  });

  return { date: dateStr };
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const body           = await req.json().catch(() => ({}));
  const verticalFilter = body.vertical as string | undefined;
  const days           = Math.min(Number(body.days ?? 30), 30); // Meta only supports last 30 days

  // Find all active integrations for this user
  const integrations = await prisma.metaIntegration.findMany({
    where: {
      userId:             user.id,
      isActive:           true,
      instagramAccountId: { not: null },
      ...(verticalFilter ? { vertical: verticalFilter as never } : {}),
    },
  });

  if (integrations.length === 0) {
    return NextResponse.json({ filled: 0, message: "No connected Instagram accounts found" });
  }

  // Build list of dates to fill (today going back N days)
  const today  = new Date();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  // Fill oldest first so graph builds chronologically
  dates.reverse();

  const results: { vertical: string; date: string; status: string }[] = [];

  for (const intg of integrations) {
    const vertical = (intg.vertical ?? "SY_INDIA") as string;

    for (const dateStr of dates) {
      try {
        await syncAccountForDate({
          instagramAccountId: intg.instagramAccountId!,
          vertical:           intg.vertical as string | null,
          userAccessToken:    intg.userAccessToken,
          pageAccessToken:    intg.pageAccessToken,
          followersCount:     intg.followersCount,
        }, dateStr);
        results.push({ vertical, date: dateStr, status: "ok" });
      } catch (e) {
        results.push({ vertical, date: dateStr, status: `error: ${String(e)}` });
      }
    }
  }

  const filled = results.filter(r => r.status === "ok").length;
  return NextResponse.json({
    filled,
    total: results.length,
    message: `Backfilled ${filled} of ${results.length} day-account snapshots`,
    results,
  });
}
