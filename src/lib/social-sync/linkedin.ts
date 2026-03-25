/**
 * LinkedIn Organization monthly data — fetches:
 *   - Organization follower count  (v2/networkSizes)
 *   - Monthly follower gains/losses (v2/organizationalEntityFollowerStatistics)
 *   - Monthly share stats: impressions, clicks, likes, comments, shares
 *     (v2/organizationalEntityShareStatistics with timeGranularityType=MONTH)
 *
 * Token handling:
 *   - LinkedIn access tokens live ~60 days.
 *   - If expired, attempts a refresh using the stored refreshToken +
 *     LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET env vars.
 *   - On success, updates the DB record with the new token + expiry.
 */

import { type PlatformMonthData, emptyPlatformData } from "./types";
import { db as prisma } from "@/lib/db";

const LI_API = "https://api.linkedin.com/v2";

// ── Token refresh ─────────────────────────────────────────────────────────

async function refreshLinkedInToken(integrationId: string, refreshToken: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });
    const res  = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data: { access_token?: string; expires_in?: number; refresh_token?: string; error?: string } = await res.json();
    if (!data.access_token) return null;

    // Persist new token
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;
    await (prisma as any).linkedinIntegration.update({
      where:  { id: integrationId },
      data: {
        accessToken:     data.access_token,
        refreshToken:    data.refresh_token ?? refreshToken,
        tokenExpiresAt:  expiresAt,
      },
    });
    return data.access_token;
  } catch { return null; }
}

async function getToken(intg: {
  id: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null;
}): Promise<string | null> {
  // Still valid
  if (!intg.tokenExpiresAt || intg.tokenExpiresAt > new Date()) return intg.accessToken;
  // Expired — try refresh
  if (!intg.refreshToken) return null;
  return refreshLinkedInToken(intg.id, intg.refreshToken);
}

// ── API helpers ────────────────────────────────────────────────────────────

async function liGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const res  = await fetch(`${LI_API}${path}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "LinkedIn-Version": "202302",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch { return null; }
}

interface LiNetworkSize  { firstDegreeSize: number }
interface LiFollowerStat {
  followerGains?: { organicFollowerGain: number; paidFollowerGain: number };
}
interface LiShareStat {
  totalShareStatistics?: {
    impressionCount: number; uniqueImpressionsCount: number;
    clickCount: number; likeCount: number; commentCount: number;
    shareCount: number; engagement: number;
  };
}

export interface LinkedInIntegration {
  id: string;
  organizationId: string;   // urn:li:organization:12345
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

export async function getLinkedInMonthData(
  intg: LinkedInIntegration,
  year: number,
  month: number
): Promise<PlatformMonthData> {
  const token = await getToken(intg);
  if (!token) return emptyPlatformData("LINKEDIN");

  const orgUrn = intg.organizationId; // e.g. "urn:li:organization:12345"
  const encoded = encodeURIComponent(orgUrn);

  // Month time range in epoch ms
  const monthStart = new Date(Date.UTC(year, month - 1, 1)).getTime();
  const monthEnd   = new Date(Date.UTC(year, month, 0, 23, 59, 59)).getTime();

  // 1. Current follower count
  const netSize = await liGet<LiNetworkSize>(
    `/networkSizes/${encoded}?edgeType=CompanyFollowedByMember`,
    token
  );
  const totalFollowers = netSize?.firstDegreeSize ?? 0;

  // 2. Monthly follower gains/losses
  const followerStat = await liGet<{ elements?: LiFollowerStat[] }>(
    `/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encoded}`,
    token
  );
  const followerGains = followerStat?.elements?.[0]?.followerGains;
  const newFollowers  = (followerGains?.organicFollowerGain ?? 0) + (followerGains?.paidFollowerGain ?? 0);

  // 3. Monthly share statistics (impressions, clicks, engagement)
  const shareStat = await liGet<{ elements?: LiShareStat[] }>(
    `/organizationalEntityShareStatistics?q=organizationalEntity` +
    `&organizationalEntity=${encoded}` +
    `&timeIntervals.timeGranularityType=MONTH` +
    `&timeIntervals.timeRange.start=${monthStart}` +
    `&timeIntervals.timeRange.end=${monthEnd}`,
    token
  );
  const stats = shareStat?.elements?.[0]?.totalShareStatistics;

  // 4. Page statistics (page views)
  const pageStat = await liGet<{ totalPageStatistics?: { views?: { allDesktopPageViews?: { pageViews: number }; allMobilePageViews?: { pageViews: number } } } }>(
    `/organizationPageStatistics?q=organization&organization=${encoded}`,
    token
  );
  const desktopViews = pageStat?.totalPageStatistics?.views?.allDesktopPageViews?.pageViews ?? 0;
  const mobileViews  = pageStat?.totalPageStatistics?.views?.allMobilePageViews?.pageViews  ?? 0;

  return {
    platform:        "LINKEDIN",
    totalFollowers,
    newFollowers,
    unfollows:       0,   // LinkedIn API doesn't provide unfollow counts
    netFollowers:    newFollowers,
    totalViews:      desktopViews + mobileViews,
    totalReach:      stats?.uniqueImpressionsCount ?? stats?.impressionCount ?? 0,
    totalImpressions:stats?.impressionCount ?? 0,
    interactions:    (stats?.likeCount ?? 0) + (stats?.commentCount ?? 0) + (stats?.shareCount ?? 0),
    linkClicks:      stats?.clickCount ?? 0,
    profileVisits:   desktopViews + mobileViews,
    totalContacts:   0,
    postsPublished:  0,   // not easily available in share stats aggregate
    videosPublished: 0,
    staticsPublished:0,
  };
}
