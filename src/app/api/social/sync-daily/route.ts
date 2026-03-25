/**
 * POST /api/social/sync-daily          (manual trigger, requires auth)
 * GET  /api/social/sync-daily?secret=  (Vercel Cron, nightly 00:15 UTC)
 *
 * Syncs ALL social platforms (Facebook, LinkedIn, YouTube) for every
 * connected integration and stores one SocialMetricSnapshot row per
 * platform per vertical per day.
 *
 * Instagram is handled by the dedicated /api/meta/instagram/sync-daily
 * endpoint — this one covers the remaining three platforms.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";
type Vertical = "SY_INDIA" | "SY_UAE" | "INTERIOR" | "SQUARE_CONNECT" | "UM";

const CRON_SECRET = process.env.CRON_SECRET ?? "squarelabs-cron";
const GRAPH       = "https://graph.facebook.com/v20.0";
const LI_API      = "https://api.linkedin.com/v2";
const YT_DATA     = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS= "https://youtubeanalytics.googleapis.com/v2";

const VERTICALS: Vertical[] = ["SY_INDIA", "SY_UAE", "INTERIOR", "SQUARE_CONNECT", "UM"];

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function ymd(d: Date) { return d.toISOString().split("T")[0]; }

// ─────────────────────────────────────────────────────────────────────────────
// FACEBOOK — Page daily metrics
// ─────────────────────────────────────────────────────────────────────────────

async function fbTotal(pageId: string, token: string, metric: string, since: number, until: number): Promise<number> {
  try {
    const url = `${GRAPH}/${pageId}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${token}`;
    const res  = await fetch(url);
    const data: { data?: { values?: { value: number }[] }[]; error?: object } = await res.json();
    if ((data as any).error || !data.data?.length) return 0;
    return (data.data[0].values ?? []).reduce((s, v) => s + (v.value ?? 0), 0);
  } catch { return 0; }
}

async function fbFans(pageId: string, token: string): Promise<number> {
  try {
    const res  = await fetch(`${GRAPH}/${pageId}?fields=followers_count,fan_count&access_token=${token}`);
    const data: { followers_count?: number; fan_count?: number; error?: object } = await res.json();
    if ((data as any).error) return 0;
    return data.followers_count ?? data.fan_count ?? 0;
  } catch { return 0; }
}

async function syncFacebook(
  intg: { id: string; pageId: string; pageAccessToken: string; vertical: string | null },
  dateStr: string,
): Promise<void> {
  const { pageId, pageAccessToken: token } = intg;
  const vertical = (intg.vertical ?? "SY_INDIA") as Vertical;

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd   = new Date(`${dateStr}T23:59:59.000Z`);
  const since    = Math.floor(dayStart.getTime() / 1000);
  const until    = Math.floor(dayEnd.getTime()   / 1000);

  const [fans, impressions, reach, views, fanAdds, fanRemoves, engagements, linkClicks] = await Promise.all([
    fbFans(pageId, token),
    fbTotal(pageId, token, "page_impressions",        since, until),
    fbTotal(pageId, token, "page_impressions_unique", since, until),
    fbTotal(pageId, token, "page_views_total",        since, until),
    fbTotal(pageId, token, "page_fan_adds_unique",    since, until),
    fbTotal(pageId, token, "page_fan_removes_unique", since, until),
    fbTotal(pageId, token, "page_post_engagements",   since, until),
    fbTotal(pageId, token, "page_website_clicks",     since, until),
  ]);

  // Net followers vs yesterday's stored count
  const yesterday = await prisma.socialMetricSnapshot.findFirst({
    where: { vertical, platform: "FACEBOOK", date: new Date(new Date(dateStr).getTime() - 86400000) },
    select: { followers: true },
  });
  const netFollowers = yesterday ? fans - yesterday.followers : fanAdds - fanRemoves;

  await prisma.socialMetricSnapshot.upsert({
    where:  { vertical_platform_date: { vertical, platform: "FACEBOOK", date: new Date(dateStr) } },
    update: {
      followers: fans, follows: fanAdds, unfollows: fanRemoves, netFollowers,
      views, reach, impressions, interactions: engagements,
      likes: 0, comments: 0, saves: 0, shares: 0,
      linkClicks, profileVisits: views,
    },
    create: {
      vertical, platform: "FACEBOOK", date: new Date(dateStr),
      followers: fans, follows: fanAdds, unfollows: fanRemoves, netFollowers,
      views, reach, impressions, interactions: engagements,
      likes: 0, comments: 0, saves: 0, shares: 0,
      linkClicks, profileVisits: views,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LINKEDIN — Organization daily metrics
// ─────────────────────────────────────────────────────────────────────────────

async function refreshLinkedInToken(intgId: string, refreshToken: string): Promise<string | null> {
  try {
    const res  = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token", refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!, client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });
    const data: { access_token?: string; expires_in?: number; refresh_token?: string } = await res.json();
    if (!data.access_token) return null;
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    await (prisma as any).linkedinIntegration.update({
      where: { id: intgId },
      data: { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken, tokenExpiresAt: expiresAt },
    });
    return data.access_token;
  } catch { return null; }
}

async function liToken(intg: { id: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null }): Promise<string | null> {
  if (!intg.tokenExpiresAt || intg.tokenExpiresAt > new Date(Date.now() + 300_000)) return intg.accessToken;
  if (!intg.refreshToken) return null;
  return refreshLinkedInToken(intg.id, intg.refreshToken);
}

async function liGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${LI_API}${path}`, {
      headers: { "Authorization": `Bearer ${token}`, "LinkedIn-Version": "202302", "X-Restli-Protocol-Version": "2.0.0" },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch { return null; }
}

async function syncLinkedIn(
  intg: { id: string; organizationId: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null },
  vertical: Vertical,
  dateStr: string,
): Promise<void> {
  const token = await liToken(intg);
  if (!token) return;

  const encoded    = encodeURIComponent(intg.organizationId);
  const dayStart   = new Date(`${dateStr}T00:00:00.000Z`).getTime();
  const dayEnd     = new Date(`${dateStr}T23:59:59.000Z`).getTime();

  // 1. Follower count (snapshot)
  const netSize = await liGet<{ firstDegreeSize?: number }>(
    `/networkSizes/${encoded}?edgeType=CompanyFollowedByMember`, token
  );
  const followers = netSize?.firstDegreeSize ?? 0;

  // 2. Daily share statistics
  const shareStat = await liGet<{
    elements?: { totalShareStatistics?: {
      impressionCount: number; uniqueImpressionsCount: number;
      clickCount: number; likeCount: number; commentCount: number; shareCount: number;
    } }[]
  }>(
    `/organizationalEntityShareStatistics?q=organizationalEntity` +
    `&organizationalEntity=${encoded}` +
    `&timeIntervals.timeGranularityType=DAY` +
    `&timeIntervals.timeRange.start=${dayStart}` +
    `&timeIntervals.timeRange.end=${dayEnd}`,
    token
  );
  const stats = shareStat?.elements?.[0]?.totalShareStatistics;

  // Net followers: compare to yesterday
  const yesterday = await prisma.socialMetricSnapshot.findFirst({
    where: { vertical, platform: "LINKEDIN", date: new Date(new Date(dateStr).getTime() - 86400000) },
    select: { followers: true },
  });
  const follows    = Math.max(0, followers - (yesterday?.followers ?? followers));
  const netFollowers = yesterday ? followers - yesterday.followers : 0;

  const impressions = stats?.impressionCount ?? 0;
  const reach       = stats?.uniqueImpressionsCount ?? impressions;
  const likes       = stats?.likeCount    ?? 0;
  const comments    = stats?.commentCount ?? 0;
  const shares      = stats?.shareCount   ?? 0;
  const linkClicks  = stats?.clickCount   ?? 0;
  const interactions= likes + comments + shares;

  await prisma.socialMetricSnapshot.upsert({
    where:  { vertical_platform_date: { vertical, platform: "LINKEDIN", date: new Date(dateStr) } },
    update: {
      followers, follows, unfollows: 0, netFollowers,
      views: impressions, reach, impressions, interactions,
      likes, comments, saves: 0, shares, linkClicks, profileVisits: 0,
    },
    create: {
      vertical, platform: "LINKEDIN", date: new Date(dateStr),
      followers, follows, unfollows: 0, netFollowers,
      views: impressions, reach, impressions, interactions,
      likes, comments, saves: 0, shares, linkClicks, profileVisits: 0,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE — Channel daily metrics
// ─────────────────────────────────────────────────────────────────────────────

async function refreshYouTubeToken(intgId: string, refreshToken: string): Promise<string | null> {
  try {
    const res  = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token", refresh_token: refreshToken,
        client_id: process.env.YOUTUBE_CLIENT_ID!, client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      }),
    });
    const data: { access_token?: string; expires_in?: number } = await res.json();
    if (!data.access_token) return null;
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    await (prisma as any).youtubeIntegration.update({
      where: { id: intgId },
      data: { accessToken: data.access_token, tokenExpiresAt: expiresAt },
    });
    return data.access_token;
  } catch { return null; }
}

async function ytToken(intg: { id: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null }): Promise<string | null> {
  if (!intg.tokenExpiresAt || intg.tokenExpiresAt > new Date(Date.now() + 300_000)) return intg.accessToken;
  if (!intg.refreshToken) return null;
  return refreshYouTubeToken(intg.id, intg.refreshToken);
}

async function syncYouTube(
  intg: { id: string; channelId: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null },
  vertical: Vertical,
  dateStr: string,
): Promise<void> {
  const token = await ytToken(intg);
  if (!token) return;

  const [channelRes, analyticsRes] = await Promise.all([
    fetch(`${YT_DATA}/channels?part=statistics&id=${intg.channelId}&access_token=${token}`),
    fetch(
      `${YT_ANALYTICS}/reports?ids=channel%3D%3D${intg.channelId}` +
      `&startDate=${dateStr}&endDate=${dateStr}` +
      `&metrics=views,likes,comments,subscribersGained,subscribersLost,estimatedMinutesWatched` +
      `&access_token=${token}`
    ),
  ]);

  const channelData: { items?: { statistics: { subscriberCount: string; viewCount: string } }[] } = await channelRes.json();
  const analyticsData: { columnHeaders?: { name: string }[]; rows?: number[][] } = await analyticsRes.json();

  const subscribers = parseInt(channelData.items?.[0]?.statistics?.subscriberCount ?? "0") || 0;

  let views = 0, likes = 0, comments = 0, subsGained = 0, subsLost = 0;
  if (analyticsData.columnHeaders && analyticsData.rows?.length) {
    const idx: Record<string, number> = {};
    analyticsData.columnHeaders.forEach((h, i) => { idx[h.name] = i; });
    const row = analyticsData.rows[0];
    views      = row[idx["views"]]               ?? 0;
    likes      = row[idx["likes"]]               ?? 0;
    comments   = row[idx["comments"]]            ?? 0;
    subsGained = row[idx["subscribersGained"]]   ?? 0;
    subsLost   = row[idx["subscribersLost"]]     ?? 0;
  }

  const yesterday = await prisma.socialMetricSnapshot.findFirst({
    where: { vertical, platform: "YOUTUBE", date: new Date(new Date(dateStr).getTime() - 86400000) },
    select: { followers: true },
  });
  const netFollowers = yesterday ? subscribers - yesterday.followers : subsGained - subsLost;

  await prisma.socialMetricSnapshot.upsert({
    where:  { vertical_platform_date: { vertical, platform: "YOUTUBE", date: new Date(dateStr) } },
    update: {
      followers: subscribers, follows: subsGained, unfollows: subsLost, netFollowers,
      views, reach: views, impressions: views, interactions: likes + comments,
      likes, comments, saves: 0, shares: 0, linkClicks: 0, profileVisits: 0,
    },
    create: {
      vertical, platform: "YOUTUBE", date: new Date(dateStr),
      followers: subscribers, follows: subsGained, unfollows: subsLost, netFollowers,
      views, reach: views, impressions: views, interactions: likes + comments,
      likes, comments, saves: 0, shares: 0, linkClicks: 0, profileVisits: 0,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────────────────────

async function runAllSync() {
  const today    = new Date();
  const dateStr  = ymd(today);
  const results: Record<string, string[]> = { facebook: [], linkedin: [], youtube: [], errors: [] };

  // ── FACEBOOK ─────────────────────────────────────────────────────────────
  const metaIntgs = await prisma.metaIntegration.findMany({
    where: { isActive: true, pageId: { not: "" } },
  });
  for (const intg of metaIntgs) {
    try {
      await syncFacebook({ id: intg.id, pageId: intg.pageId, pageAccessToken: intg.pageAccessToken, vertical: intg.vertical }, dateStr);
      results.facebook.push(`${intg.vertical ?? "?"} / ${intg.pageName ?? intg.pageId}`);
    } catch (e) { results.errors.push(`FB ${intg.pageId}: ${String(e)}`); }
  }

  // ── LINKEDIN ─────────────────────────────────────────────────────────────
  const liIntgs = await (prisma as any).linkedinIntegration.findMany({ where: { isActive: true } });
  for (const intg of liIntgs) {
    // Map organization to vertical (best-effort by name)
    for (const vertical of VERTICALS) {
      try {
        await syncLinkedIn(intg, vertical, dateStr);
        results.linkedin.push(`${vertical} / ${intg.name ?? intg.organizationId}`);
        break; // one vertical per LI org — use first match
      } catch (e) { results.errors.push(`LI ${intg.organizationId}: ${String(e)}`); }
    }
  }

  // ── YOUTUBE ──────────────────────────────────────────────────────────────
  const ytIntgs = await (prisma as any).youtubeIntegration.findMany({ where: { isActive: true } });
  for (const intg of ytIntgs) {
    for (const vertical of VERTICALS) {
      try {
        await syncYouTube(intg, vertical, dateStr);
        results.youtube.push(`${vertical} / ${intg.channelName ?? intg.channelId}`);
        break;
      } catch (e) { results.errors.push(`YT ${intg.channelId}: ${String(e)}`); }
    }
  }

  return NextResponse.json({ date: dateStr, results });
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });
  return runAllSync();
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runAllSync();
}
