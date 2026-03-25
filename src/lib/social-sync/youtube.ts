/**
 * YouTube channel monthly data — fetches from:
 *   - YouTube Data API v3: channel statistics (subscriber count, total views)
 *   - YouTube Analytics API v2: monthly views, likes, comments,
 *     subscribers gained/lost for the given calendar month
 *
 * Token handling:
 *   - Google OAuth2 access tokens expire after 1 hour.
 *   - If expired, automatically refreshes using the stored refreshToken +
 *     YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET env vars.
 *   - On success, updates the DB record with new token + expiry.
 */

import { type PlatformMonthData, emptyPlatformData } from "./types";
import { db as prisma } from "@/lib/db";

const YT_DATA     = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS= "https://youtubeanalytics.googleapis.com/v2";

// ── Token refresh ─────────────────────────────────────────────────────────

async function refreshYouTubeToken(integrationId: string, refreshToken: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    });
    const res  = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data: { access_token?: string; expires_in?: number; error?: string } = await res.json();
    if (!data.access_token) return null;

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

    await (prisma as any).youtubeIntegration.update({
      where: { id: integrationId },
      data: { accessToken: data.access_token, tokenExpiresAt: expiresAt },
    });
    return data.access_token;
  } catch { return null; }
}

async function getToken(intg: {
  id: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null;
}): Promise<string | null> {
  // Buffer: refresh if token expires within 5 minutes
  const expiryBuffer = new Date(Date.now() + 5 * 60 * 1000);
  if (!intg.tokenExpiresAt || intg.tokenExpiresAt > expiryBuffer) return intg.accessToken;
  if (!intg.refreshToken) return null;
  return refreshYouTubeToken(intg.id, intg.refreshToken);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function dateStr(date: Date) {
  return date.toISOString().split("T")[0];
}

async function fetchChannelStats(channelId: string, token: string) {
  try {
    const res  = await fetch(
      `${YT_DATA}/channels?part=statistics&id=${channelId}&access_token=${token}`
    );
    const data: { items?: { statistics: { subscriberCount: string; viewCount: string; videoCount: string } }[] } = await res.json();
    const stats = data.items?.[0]?.statistics;
    return {
      subscriberCount: parseInt(stats?.subscriberCount ?? "0") || 0,
      totalViewCount:  parseInt(stats?.viewCount       ?? "0") || 0,
      videoCount:      parseInt(stats?.videoCount      ?? "0") || 0,
    };
  } catch { return { subscriberCount: 0, totalViewCount: 0, videoCount: 0 }; }
}

async function fetchAnalytics(channelId: string, token: string, startDate: string, endDate: string) {
  try {
    const metrics = "views,likes,comments,subscribersGained,subscribersLost,estimatedMinutesWatched";
    const url = `${YT_ANALYTICS}/reports?ids=channel%3D%3D${channelId}` +
                `&startDate=${startDate}&endDate=${endDate}` +
                `&metrics=${metrics}&access_token=${token}`;
    const res  = await fetch(url);
    const data: {
      columnHeaders?: { name: string }[];
      rows?: number[][];
      error?: { message: string };
    } = await res.json();

    if (data.error || !data.rows?.length || !data.columnHeaders) {
      return { views: 0, likes: 0, comments: 0, subscribersGained: 0, subscribersLost: 0 };
    }

    // Build name→index map
    const idx: Record<string, number> = {};
    data.columnHeaders.forEach((h, i) => { idx[h.name] = i; });
    const row = data.rows[0];

    return {
      views:             row[idx["views"]]              ?? 0,
      likes:             row[idx["likes"]]              ?? 0,
      comments:          row[idx["comments"]]           ?? 0,
      subscribersGained: row[idx["subscribersGained"]]  ?? 0,
      subscribersLost:   row[idx["subscribersLost"]]    ?? 0,
    };
  } catch { return { views: 0, likes: 0, comments: 0, subscribersGained: 0, subscribersLost: 0 }; }
}

async function countMonthVideos(channelId: string, token: string, startDate: string, endDate: string): Promise<number> {
  try {
    const url = `${YT_DATA}/search?part=id&channelId=${channelId}&type=video` +
                `&publishedAfter=${startDate}T00:00:00Z&publishedBefore=${endDate}T23:59:59Z` +
                `&maxResults=50&access_token=${token}`;
    const res  = await fetch(url);
    const data: { pageInfo?: { totalResults: number }; error?: object } = await res.json();
    if ((data as any).error) return 0;
    return data.pageInfo?.totalResults ?? 0;
  } catch { return 0; }
}

// ── Main ──────────────────────────────────────────────────────────────────

export interface YouTubeIntegration {
  id: string;
  channelId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

export async function getYouTubeMonthData(
  intg: YouTubeIntegration,
  year: number,
  month: number
): Promise<PlatformMonthData> {
  const token = await getToken(intg);
  if (!token) return emptyPlatformData("YOUTUBE");

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd   = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const startDate  = dateStr(monthStart);
  const endDate    = dateStr(monthEnd);

  const [channelStats, analytics, videoCount] = await Promise.all([
    fetchChannelStats(intg.channelId, token),
    fetchAnalytics(intg.channelId, token, startDate, endDate),
    countMonthVideos(intg.channelId, token, startDate, endDate),
  ]);

  return {
    platform:        "YOUTUBE",
    totalFollowers:  channelStats.subscriberCount,
    newFollowers:    analytics.subscribersGained,
    unfollows:       analytics.subscribersLost,
    netFollowers:    analytics.subscribersGained - analytics.subscribersLost,
    totalViews:      analytics.views,
    totalReach:      analytics.views,        // YT doesn't have "reach" as distinct metric
    totalImpressions:analytics.views,
    interactions:    analytics.likes + analytics.comments,
    linkClicks:      0,
    profileVisits:   0,
    totalContacts:   0,
    postsPublished:  videoCount,
    videosPublished: videoCount,
    staticsPublished:0,
  };
}
