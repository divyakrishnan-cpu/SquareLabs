/**
 * GET /api/social/top-posts
 * ?platform=INSTAGRAM|YOUTUBE|LINKEDIN&vertical=INTERIOR&from=2025-01-01&to=2026-03-25
 *
 * Fetches per-post/per-video analytics for the selected platform and date range.
 * Returns up to 30 posts sorted by total engagement, with per-post metrics so
 * the client can re-sort by any metric (impressions, reach, views, engagement,
 * saves, shares, profileVisits, linkClicks).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const META         = "https://graph.facebook.com/v20.0";
const LI_API       = "https://api.linkedin.com/v2";
const YT_DATA      = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS = "https://youtubeanalytics.googleapis.com/v2";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface PostPerformance {
  id:           string;
  platform:     "INSTAGRAM" | "YOUTUBE" | "LINKEDIN";
  type:         string; // REEL | VIDEO | IMAGE | CAROUSEL | ARTICLE | NONE
  title:        string;
  thumbnail?:   string;
  permalink:    string;
  publishedAt:  string; // ISO date string
  // metrics
  impressions:   number;
  reach:         number;
  engagement:    number; // likes + comments + saves + shares
  likes:         number;
  comments:      number;
  saves:         number;
  shares:        number;
  views:         number; // video views / plays
  profileVisits: number;
  linkClicks:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTAGRAM
// ─────────────────────────────────────────────────────────────────────────────

type InsightEntry = {
  name:         string;
  total_value?: { value: number };
  values?:      { value: number }[];
};

/** Read the numeric value from an insight entry — handles both v20+ and legacy response shapes. */
function insightVal(entry: InsightEntry): number {
  return entry.total_value?.value ?? entry.values?.[0]?.value ?? 0;
}

/** Parse a raw insights response body into a partial result map. Never throws. */
function parseInsightBody(body: { data?: InsightEntry[]; error?: unknown }): Record<string, number> {
  if (!body.data?.length) return {};
  const out: Record<string, number> = {};
  for (const entry of body.data) {
    out[entry.name] = insightVal(entry);
  }
  return out;
}

/**
 * Fetch per-post insights for a single Instagram media object.
 *
 * WHY individual calls per metric?
 * Instagram Graph API v20.0 returns errors for the ENTIRE batch if any single
 * metric is invalid for that media type.  Individual calls isolate failures so
 * one bad metric never zeros out the rest.
 *
 * WHY no period=lifetime?
 * v20.0 returns the new `total_value` response shape when no period is given.
 * Hard-coding `period=lifetime` sometimes causes the API to return an error or
 * an empty values array for metrics that have moved to the new format.  We
 * accept both shapes in insightVal() so omitting the period is safe.
 */
async function fetchIGInsights(
  mediaId:   string,
  token:     string,
  mediaType: string,
): Promise<{ impressions: number; reach: number; saves: number; videoViews: number; plays: number; shares: number }> {
  const result = { impressions: 0, reach: 0, saves: 0, videoViews: 0, plays: 0, shares: 0 };

  /** Fetch a single metric (or comma-separated group) and return parsed map. */
  const igFetch = async (metrics: string, period?: "lifetime"): Promise<Record<string, number>> => {
    try {
      const periodParam = period ? `&period=${period}` : "";
      const url = `${META}/${mediaId}/insights?metric=${metrics}${periodParam}&access_token=${token}`;
      const res  = await fetch(url);
      const body = await res.json() as { data?: InsightEntry[]; error?: { message?: string; code?: number } };

      if (!res.ok || body.error) {
        // Log to Vercel function logs so we can diagnose permission/API issues
        console.error(
          `[IG insights] ${metrics}${period ? " period=" + period : ""} → HTTP ${res.status}:`,
          JSON.stringify(body.error ?? body).slice(0, 300)
        );
        return {};
      }

      const parsed = parseInsightBody(body);

      // Debug: log what we actually got back (helps diagnose 0-value issues)
      if (process.env.NODE_ENV !== "production" || Object.values(parsed).every(v => v === 0)) {
        console.log(
          `[IG insights] ${metrics} raw:`,
          JSON.stringify(body.data?.map(e => ({ name: e.name, tv: e.total_value, v: e.values }))).slice(0, 400)
        );
      }

      return parsed;
    } catch (e) {
      console.error(`[IG insights] ${metrics} exception:`, String(e));
      return {};
    }
  };

  /**
   * Fetch one metric trying BOTH period variants in parallel.
   * Takes the first non-zero value — handles v20 (total_value, no period)
   * and legacy (values array, period=lifetime) in one round-trip.
   */
  const igFetchBest = async (metric: string): Promise<number> => {
    const [noPeriod, withPeriod] = await Promise.all([
      igFetch(metric),
      igFetch(metric, "lifetime"),
    ]);
    return noPeriod[metric] || withPeriod[metric] || 0;
  };

  // ── Metrics 1–3: universal across all media types
  const [reach, saved, shares] = await Promise.all([
    igFetchBest("reach"),
    igFetchBest("saved"),
    igFetchBest("shares"),
  ]);
  result.reach  = reach;
  result.saves  = saved;
  result.shares = shares;

  // ── Metric 4+: type-specific impression / view metrics
  const isReel  = mediaType === "REEL";
  const isVideo = mediaType === "VIDEO" || isReel;

  if (isReel) {
    // Reels → "plays" (impressions is not a valid Reel metric)
    result.plays       = await igFetchBest("plays");
    result.impressions = result.plays;
  } else if (isVideo) {
    // VIDEO media_type covers BOTH regular videos AND Reels.
    // media_product_type is the reliable way to distinguish them, but it isn't
    // always returned (depends on token/app permissions).  So we request ALL
    // three video metrics in parallel and take whichever succeed:
    //   • Regular videos → impressions + video_views work,  plays may be 0
    //   • Reels           → plays works,  impressions + video_views return HTTP 400 → 0
    const [imp, vidViews, playsVal] = await Promise.all([
      igFetchBest("impressions"),
      igFetchBest("video_views"),
      igFetchBest("plays"),
    ]);
    result.plays       = playsVal;
    result.videoViews  = vidViews || playsVal;         // video_views for regular, plays for Reel
    result.impressions = imp      || playsVal;         // impressions for regular, plays for Reel
  } else {
    // IMAGE or CAROUSEL_ALBUM
    result.impressions = await igFetchBest("impressions");
  }

  return result;
}

async function fetchInstagramPosts(
  igId:  string,
  token: string,
  from:  string,
  to:    string,
): Promise<PostPerformance[]> {
  // Fetch media list — no nested insights here (URL-encoding breaks the syntax).
  //
  // IMPORTANT: video_views is requested as a DIRECT MEDIA FIELD, not via the
  // insights endpoint.  The insights endpoint's "video_views" metric fails for
  // Reels (HTTP 400).  The direct field bypasses that restriction entirely and
  // returns the total play/view count without needing any special period param.
  // Similarly, like_count and comments_count are direct fields that don't hit
  // the insights API at all.
  const FIELDS = "id,media_type,media_product_type,timestamp,like_count,comments_count,video_views,permalink,thumbnail_url,media_url,caption";
  const MAX_POSTS = 30;

  type RawMedia = {
    id:                  string;
    media_type:          string;          // IMAGE | VIDEO | CAROUSEL_ALBUM
    media_product_type?: string;          // REEL | FEED | STORY | AD
    timestamp:           string;
    like_count?:         number;
    comments_count?:     number;
    video_views?:        number;          // ← direct field: total plays/views (works for Reels)
    permalink:           string;
    thumbnail_url?:      string;
    media_url?:          string;
    caption?:            string;
  };

  const collected: RawMedia[] = [];
  let nextUrl: string | null =
    `${META}/${igId}/media?fields=${FIELDS}&limit=50&access_token=${token}`;

  try {
    while (nextUrl && collected.length < MAX_POSTS) {
      const res  = await fetch(nextUrl);
      const data: { data?: RawMedia[]; paging?: { next?: string }; error?: unknown } = await res.json();
      if ((data as any).error || !data.data?.length) break;

      let hitBoundary = false;
      for (const m of data.data) {
        const d = m.timestamp.split("T")[0];
        if (d > to)   continue;
        if (d < from) { hitBoundary = true; break; }
        collected.push(m);
        if (collected.length >= MAX_POSTS) break;
      }
      if (hitBoundary || collected.length >= MAX_POSTS) break;
      nextUrl = data.paging?.next ?? null;
    }
  } catch { /* return whatever we collected */ }

  if (!collected.length) return [];

  // Fetch per-post insights in parallel batches of 5
  const BATCH = 5;
  const results: PostPerformance[] = [];

  for (let i = 0; i < collected.length; i += BATCH) {
    const batch   = collected.slice(i, i + BATCH);
    const insights = await Promise.all(
      batch.map(m => {
        // Instagram returns media_type="VIDEO" for BOTH Reels and regular videos.
        // Use media_product_type to correctly identify Reels so we request "plays"
        // instead of "impressions" (which the API rejects for Reels with HTTP 400).
        const effectiveType = m.media_product_type === "REEL" ? "REEL" : m.media_type;
        return fetchIGInsights(m.id, token, effectiveType);
      })
    );
    batch.forEach((m, j) => {
      const ins            = insights[j];
      const isReel         = m.media_product_type === "REEL";
      const isVideo        = m.media_type === "VIDEO"; // includes Reels
      const likes          = m.like_count     ?? 0;
      const comments       = m.comments_count ?? 0;

      // video_views from the direct media field is the most reliable view count.
      // It returns the same number Instagram shows in the app (organic + paid)
      // without requiring any insights-API permissions or period parameters.
      // Fall back to whatever the insights API returned if the field is absent.
      const directViews    = m.video_views ?? 0;
      const insightViews   = Math.max(ins.plays, ins.videoViews);
      const finalViews     = directViews || insightViews; // prefer direct field

      // For impressions, use the insights value if available; otherwise use
      // video_views as the best proxy (same number Instagram reports in-app).
      const finalImp       = ins.impressions || directViews;

      // Display type: use product type when known, else fall back to media_type
      const displayType    = isReel ? "REEL"
        : m.media_type === "CAROUSEL_ALBUM" ? "CAROUSEL"
        : m.media_type; // IMAGE | VIDEO

      results.push({
        id:          m.id,
        platform:    "INSTAGRAM",
        type:        displayType,
        title:       (m.caption ?? "").slice(0, 120) || "Post",
        thumbnail:   m.thumbnail_url || m.media_url,
        permalink:   m.permalink,
        publishedAt: m.timestamp,
        impressions:   finalImp,
        reach:         ins.reach,
        engagement:    likes + comments + ins.saves + ins.shares,
        likes,
        comments,
        saves:         ins.saves,
        shares:        ins.shares,
        views:         (isVideo || isReel) ? finalViews : 0,
        profileVisits: 0,
        linkClicks:    0,
      });
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE
// ─────────────────────────────────────────────────────────────────────────────

async function refreshYTToken(intg: {
  id: string; accessToken: string; refreshToken?: string | null; tokenExpiresAt?: Date | null;
}): Promise<string> {
  if (!intg.tokenExpiresAt || new Date(intg.tokenExpiresAt) > new Date(Date.now() + 300_000)) {
    return intg.accessToken;
  }
  if (!intg.refreshToken) return intg.accessToken;
  try {
    const res  = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: intg.refreshToken,
        grant_type:    "refresh_token",
      }),
    });
    const data: { access_token?: string; expires_in?: number } = await res.json();
    if (data.access_token) {
      const expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000) : null;
      await (prisma as any).youtubeIntegration.update({
        where: { id: intg.id },
        data:  { accessToken: data.access_token, tokenExpiresAt: expiresAt },
      });
      return data.access_token;
    }
  } catch { /* fall through */ }
  return intg.accessToken;
}

async function fetchYouTubePosts(
  intg: { id: string; channelId: string; accessToken: string; refreshToken?: string | null; tokenExpiresAt?: Date | null },
  from: string,
  to:   string,
): Promise<PostPerformance[]> {
  const token = await refreshYTToken(intg);

  // YouTube Analytics: per-video metrics in date range
  const analyticsUrl =
    `${YT_ANALYTICS}/reports` +
    `?dimensions=video` +
    `&metrics=views,likes,comments,estimatedMinutesWatched,subscribersGained,shares` +
    `&startDate=${from}&endDate=${to}` +
    `&maxResults=30&sort=-views` +
    `&ids=channel==MINE`;

  const analyticsRes = await fetch(analyticsUrl, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!analyticsRes.ok) return [];
  const analytics: {
    columnHeaders?: { name: string }[];
    rows?: (string | number)[][];
  } = await analyticsRes.json();

  if (!analytics.rows?.length) return [];

  // Build column index map
  const colIdx: Record<string, number> = {};
  (analytics.columnHeaders ?? []).forEach((h, i) => { colIdx[h.name] = i; });

  const videoIds = analytics.rows.map(r => r[0]).join(",");

  // Fetch video details for thumbnails and titles
  const detailRes = await fetch(
    `${YT_DATA}/videos?part=snippet,statistics&id=${videoIds}`,
    { headers: { "Authorization": `Bearer ${token}` } }
  );
  const details: {
    items?: {
      id: string;
      snippet: { title: string; publishedAt: string; thumbnails?: { medium?: { url: string }; default?: { url: string } } };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    }[];
  } = detailRes.ok ? await detailRes.json() : { items: [] };

  const detailMap: Record<string, typeof details.items extends (infer T)[] | undefined ? T : never> = {};
  (details.items ?? []).forEach(v => { detailMap[v.id] = v; });

  return analytics.rows.map(row => {
    const videoId = String(row[0]);
    const detail  = detailMap[videoId];
    const snippet = detail?.snippet;
    const stats   = detail?.statistics ?? {};

    const views    = Number(row[colIdx["views"]]            ?? 0);
    const likes    = Number(row[colIdx["likes"]]            ?? 0);
    const comments = Number(row[colIdx["comments"]]         ?? 0);
    const shares   = Number(row[colIdx["shares"]]           ?? 0);

    return {
      id:          videoId,
      platform:    "YOUTUBE" as const,
      type:        "VIDEO",
      title:       snippet?.title ?? "Untitled Video",
      thumbnail:   snippet?.thumbnails?.medium?.url ?? snippet?.thumbnails?.default?.url,
      permalink:   `https://youtube.com/watch?v=${videoId}`,
      publishedAt: snippet?.publishedAt ?? from,
      impressions:   parseInt(stats.viewCount ?? "0") || views,
      reach:         views,
      engagement:    likes + comments + shares,
      likes,
      comments,
      saves:         0,
      shares,
      views,
      profileVisits: 0,
      linkClicks:    0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LINKEDIN
// ─────────────────────────────────────────────────────────────────────────────

async function refreshLIToken(intg: {
  id: string; accessToken: string; refreshToken?: string | null; tokenExpiresAt?: Date | null;
}): Promise<string> {
  if (!intg.tokenExpiresAt || new Date(intg.tokenExpiresAt) > new Date(Date.now() + 300_000)) {
    return intg.accessToken;
  }
  if (!intg.refreshToken) return intg.accessToken;
  try {
    const res  = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: intg.refreshToken,
        client_id:     process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });
    const data: { access_token?: string; expires_in?: number; refresh_token?: string } = await res.json();
    if (data.access_token) {
      const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
      await (prisma as any).linkedinIntegration.update({
        where: { id: intg.id },
        data:  { accessToken: data.access_token, refreshToken: data.refresh_token ?? intg.refreshToken, tokenExpiresAt: expiresAt },
      });
      return data.access_token;
    }
  } catch { /* fall through */ }
  return intg.accessToken;
}

async function fetchLinkedInPosts(
  intg: { id: string; organizationId: string; accessToken: string; refreshToken?: string | null; tokenExpiresAt?: Date | null },
  from: string,
  to:   string,
): Promise<PostPerformance[]> {
  const token   = await refreshLIToken(intg);
  const orgUrn  = intg.organizationId; // already an urn like "urn:li:organization:12345"
  const encoded = encodeURIComponent(orgUrn);
  const headers = {
    "Authorization":              `Bearer ${token}`,
    "LinkedIn-Version":           "202302",
    "X-Restli-Protocol-Version":  "2.0.0",
  };

  // 1. Get recent ugcPosts
  const postsRes = await fetch(
    `${LI_API}/ugcPosts?q=authors&authors=List(${encoded})&count=20&sortBy=LAST_MODIFIED`,
    { headers }
  );
  if (!postsRes.ok) return [];
  const postsData: { elements?: {
    id: string;
    created?: { time?: number };
    specificContent?: {
      "com.linkedin.ugc.ShareContent"?: {
        shareCommentary?: { text?: string };
        media?: { mediaCategory?: string; originalUrl?: string; thumbnails?: { url: string }[] }[];
      };
    };
  }[] } = await postsRes.json();

  const allPosts = postsData.elements ?? [];
  if (!allPosts.length) return [];

  // Filter by date range
  const fromTs = new Date(from).getTime();
  const toTs   = new Date(to + "T23:59:59Z").getTime();
  const inRange = allPosts.filter(p => {
    const t = p.created?.time ?? 0;
    return t >= fromTs && t <= toTs;
  });
  if (!inRange.length) return [];

  // 2. Fetch per-post statistics in one call
  const postList = inRange.map(p => encodeURIComponent(p.id)).join(",");
  const statsRes = await fetch(
    `${LI_API}/organizationalEntityShareStatistics` +
    `?q=organizationalEntity&organizationalEntity=${encoded}` +
    `&ugcPosts=List(${postList})`,
    { headers }
  );

  const statsMap: Record<string, {
    impressionCount?: number; uniqueImpressionsCount?: number;
    clickCount?: number; likeCount?: number; commentCount?: number; shareCount?: number;
  }> = {};

  if (statsRes.ok) {
    const statsData: { elements?: { ugcPost?: string; totalShareStatistics?: Record<string, number> }[] } =
      await statsRes.json();
    (statsData.elements ?? []).forEach(e => {
      if (e.ugcPost) statsMap[e.ugcPost] = e.totalShareStatistics ?? {};
    });
  }

  return inRange.map(p => {
    const stats   = statsMap[p.id] ?? {};
    const content = p.specificContent?.["com.linkedin.ugc.ShareContent"];
    const media   = content?.media?.[0];
    const caption = content?.shareCommentary?.text ?? "";
    const thumb   = media?.thumbnails?.[0]?.url;
    const likes    = stats.likeCount    ?? 0;
    const comments = stats.commentCount ?? 0;
    const shares   = stats.shareCount   ?? 0;

    return {
      id:          p.id,
      platform:    "LINKEDIN" as const,
      type:        media?.mediaCategory ?? "NONE",
      title:       caption.slice(0, 120) || "LinkedIn Post",
      thumbnail:   thumb,
      permalink:   `https://www.linkedin.com/feed/update/${p.id}`,
      publishedAt: p.created?.time ? new Date(p.created.time).toISOString() : from,
      impressions:   stats.impressionCount        ?? 0,
      reach:         stats.uniqueImpressionsCount ?? 0,
      engagement:    likes + comments + shares,
      likes,
      comments,
      saves:         0,
      shares,
      views:         stats.impressionCount ?? 0,
      profileVisits: 0,
      linkClicks:    stats.clickCount ?? 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const sp       = req.nextUrl.searchParams;
  const platform = sp.get("platform") ?? "INSTAGRAM";
  const vertical = sp.get("vertical") ?? "INTERIOR";
  const from     = sp.get("from") ?? new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];
  const to       = sp.get("to")   ?? new Date().toISOString().split("T")[0];

  try {
    let posts: PostPerformance[] = [];

    if (platform === "INSTAGRAM") {
      const intg = await prisma.metaIntegration.findFirst({
        where: {
          userId:             user.id,
          isActive:           true,
          instagramAccountId: { not: null },
          ...(vertical !== "ALL" ? { vertical: vertical as never } : {}),
        },
      });
      if (intg) {
        const token = (intg.userAccessToken || intg.pageAccessToken) as string;
        posts = await fetchInstagramPosts(intg.instagramAccountId!, token, from, to);
      }

    } else if (platform === "YOUTUBE") {
      const intg = await (prisma as any).youtubeIntegration.findFirst({
        where: { isActive: true },
      });
      if (intg) posts = await fetchYouTubePosts(intg, from, to);

    } else if (platform === "LINKEDIN") {
      const intg = await (prisma as any).linkedinIntegration.findFirst({
        where: { isActive: true },
      });
      if (intg) posts = await fetchLinkedInPosts(intg, from, to);
    }

    return NextResponse.json({ posts });
  } catch (e) {
    console.error("[top-posts]", e);
    return NextResponse.json({ error: String(e), posts: [] }, { status: 500 });
  }
}
