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

async function fetchIGInsights(
  mediaId:   string,
  token:     string,
  mediaType: string,
): Promise<{ impressions: number; reach: number; saves: number; videoViews: number; plays: number; shares: number }> {
  const base = { impressions: 0, reach: 0, saves: 0, videoViews: 0, plays: 0, shares: 0 };
  try {
    const isVideo  = mediaType === "VIDEO" || mediaType === "REEL";
    const metrics  = [
      "impressions", "reach", "saved", "shares",
      ...(isVideo ? ["video_views", "plays"] : []),
    ].join(",");

    const res = await fetch(
      `${META}/${mediaId}/insights?metric=${metrics}&period=lifetime&access_token=${token}`
    );
    if (!res.ok) return base;
    const json: { data?: { name: string; values?: { value: number }[] }[]; error?: unknown } = await res.json();
    if (!json.data) return base;

    const result = { ...base };
    for (const m of json.data) {
      const val = m.values?.[0]?.value ?? 0;
      switch (m.name) {
        case "impressions":  result.impressions = val;  break;
        case "reach":        result.reach       = val;  break;
        case "saved":        result.saves       = val;  break;
        case "video_views":  result.videoViews  = val;  break;
        case "plays":        result.plays       = val;  break;
        case "shares":       result.shares      = val;  break;
      }
    }
    return result;
  } catch { return base; }
}

async function fetchInstagramPosts(
  igId:  string,
  token: string,
  from:  string,
  to:    string,
): Promise<PostPerformance[]> {
  const FIELDS   = "id,media_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url,caption";
  const MAX_POSTS = 30;
  const collected: {
    id: string; media_type: string; timestamp: string;
    like_count: number; comments_count: number;
    permalink: string; thumbnail_url?: string; media_url?: string; caption?: string;
  }[] = [];

  let nextUrl: string | null =
    `${META}/${igId}/media?fields=${FIELDS}&limit=50&access_token=${token}`;

  try {
    while (nextUrl && collected.length < MAX_POSTS) {
      const res  = await fetch(nextUrl);
      const data: { data?: typeof collected; paging?: { next?: string }; error?: unknown } = await res.json();
      if ((data as any).error || !data.data?.length) break;

      let hitBoundary = false;
      for (const m of data.data) {
        const d = m.timestamp.split("T")[0];
        if (d > to)   continue;  // future of range (shouldn't happen but safe)
        if (d < from) { hitBoundary = true; break; }
        collected.push(m);
        if (collected.length >= MAX_POSTS) break;
      }
      if (hitBoundary || collected.length >= MAX_POSTS) break;
      nextUrl = data.paging?.next ?? null;
    }
  } catch { /* return whatever we got */ }

  if (!collected.length) return [];

  // Fetch per-post insights in parallel batches of 5 to avoid hammering the API
  const BATCH    = 5;
  const results: PostPerformance[] = [];

  for (let i = 0; i < collected.length; i += BATCH) {
    const batch   = collected.slice(i, i + BATCH);
    const insights = await Promise.all(
      batch.map(m => fetchIGInsights(m.id, token, m.media_type))
    );
    batch.forEach((m, j) => {
      const ins     = insights[j];
      const isVideo = m.media_type === "VIDEO" || m.media_type === "REEL";
      results.push({
        id:          m.id,
        platform:    "INSTAGRAM",
        type:        m.media_type === "CAROUSEL_ALBUM" ? "CAROUSEL" : m.media_type,
        title:       (m.caption ?? "").slice(0, 120) || "Post",
        thumbnail:   m.thumbnail_url || m.media_url,
        permalink:   m.permalink,
        publishedAt: m.timestamp,
        impressions:   ins.impressions,
        reach:         ins.reach,
        engagement:    (m.like_count ?? 0) + (m.comments_count ?? 0) + ins.saves + ins.shares,
        likes:         m.like_count    ?? 0,
        comments:      m.comments_count ?? 0,
        saves:         ins.saves,
        shares:        ins.shares,
        views:         isVideo ? Math.max(ins.plays, ins.videoViews) : 0,
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
