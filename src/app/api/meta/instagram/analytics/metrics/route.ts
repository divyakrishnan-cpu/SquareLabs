/**
 * GET /api/meta/instagram/analytics/metrics
 *
 * Query params:
 *   vertical   — SY_INDIA | SY_UAE | INTERIOR | SQUARE_CONNECT | UM
 *   platform   — instagram | facebook (others return stub)
 *   from       — YYYY-MM-DD  (current period start)
 *   to         — YYYY-MM-DD  (current period end)
 *   compFrom   — YYYY-MM-DD  (comparison period start, optional)
 *   compTo     — YYYY-MM-DD  (comparison period end, optional)
 *
 * Returns: full metrics table data + daily breakdowns + demographics
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const META          = "https://graph.facebook.com/v20.0";
const MAX_CHUNK_SEC = 30 * 24 * 3600; // Meta hard limit: 30 days per insights call

// ── Split a time range into ≤30-day chunks ────────────────────────────────

function chunkRange(since: number, until: number): { since: number; until: number }[] {
  const chunks: { since: number; until: number }[] = [];
  let s = since;
  while (s < until) {
    const u = Math.min(s + MAX_CHUNK_SEC - 1, until);
    chunks.push({ since: s, until: u });
    s = u + 1;
  }
  return chunks;
}

// ── Metric categories (Meta Graph API v20 / v18+ rules) ──────────────────
//
// DAY_SERIES    → period=day, returns daily {values:[{end_time, value:number}]}
//                 reach        — supports any date range ≤30 days per chunk
//                 follower_count — ONLY last 30 days from today; skip older chunks
//
// TOTAL_VALUE   → period=day + metric_type=total_value
//                 returns a single {total_value:{value:N}} per chunk (no daily series)
//                 views, profile_views, website_clicks, total_interactions
//
// FOLLOWS_UNFOLLOWS (special total_value with breakdown)
//                 follows_and_unfollows + metric_type=total_value + breakdown=follow_type
//                 returns breakdown results with FOLLOW / UNFOLLOW dimension values

const DAY_SERIES_METRICS  = ["reach", "follower_count"];
// likes, comments, saves, shares give per-day breakdowns with total_value
const TOTAL_VALUE_METRICS = ["views", "profile_views", "website_clicks", "total_interactions", "likes", "comments", "saves", "shares"];
// Metrics removed in v18+: email_contacts, get_directions_clicks, phone_call_clicks, text_message_clicks

const NOW_SECS = () => Math.floor(Date.now() / 1000);
const MAX_FOLLOWER_LOOKBACK = 30 * 24 * 3600; // follower_count only works for last 30 days

// ── Core fetch function ───────────────────────────────────────────────────

async function fetchInsights(
  igId:  string,
  since: number,
  until: number,
  token: string,
): Promise<{
  data:   Record<string, { date: string; value: number }[]>;
  errors: string[];
}> {
  const result: Record<string, { date: string; value: number }[]> = {};
  const errors: string[] = [];
  const chunks   = chunkRange(since, until);
  const endDate  = new Date(until * 1000).toISOString().split("T")[0];

  // ── Day-series metrics (reach, follower_count) ────────────────────────
  for (const metric of DAY_SERIES_METRICS) {
    const accumulated: { date: string; value: number }[] = [];
    const nowSecs = NOW_SECS();

    for (const chunk of chunks) {
      // follower_count only supported for last 30 days — skip older chunks
      if (metric === "follower_count" && chunk.since < nowSecs - MAX_FOLLOWER_LOOKBACK) {
        continue;
      }
      try {
        const url = `${META}/${igId}/insights?metric=${metric}&period=day` +
                    `&since=${chunk.since}&until=${chunk.until}&access_token=${token}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.error) {
          errors.push(`[${metric}] ${data.error.message} (code ${data.error.code})`);
          break;
        }
        for (const item of (data.data ?? [])) {
          for (const v of (item.values ?? [])) {
            accumulated.push({
              date:  v.end_time?.split("T")[0] ?? "",
              value: typeof v.value === "number" ? v.value : 0,
            });
          }
        }
      } catch (e) {
        errors.push(`[${metric}] ${String(e)}`);
      }
    }

    if (accumulated.length) result[metric] = accumulated;
  }

  // ── Total-value metrics ───────────────────────────────────────────────
  for (const metric of TOTAL_VALUE_METRICS) {
    let grandTotal = 0;
    let hasData    = false;

    for (const chunk of chunks) {
      try {
        const url = `${META}/${igId}/insights?metric=${metric}&period=day` +
                    `&metric_type=total_value&since=${chunk.since}&until=${chunk.until}&access_token=${token}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.error) {
          errors.push(`[${metric}] ${data.error.message} (code ${data.error.code})`);
          break;
        }
        const val = data.data?.[0]?.total_value?.value;
        if (typeof val === "number") { grandTotal += val; hasData = true; }
      } catch (e) {
        errors.push(`[${metric}] ${String(e)}`);
      }
    }

    if (hasData) {
      result[metric] = [{ date: endDate, value: grandTotal }];
    }
  }

  // ── follows_and_unfollows (total_value + breakdown=follow_type) ───────
  {
    let totalFollows   = 0;
    let totalUnfollows = 0;
    let hasFollowData  = false;

    for (const chunk of chunks) {
      try {
        const url = `${META}/${igId}/insights?metric=follows_and_unfollows` +
                    `&period=day&metric_type=total_value&breakdown=follow_type` +
                    `&since=${chunk.since}&until=${chunk.until}&access_token=${token}`;
        const res  = await fetch(url);
        const data = await res.json();

        if (data.error) {
          errors.push(`[follows_and_unfollows] ${data.error.message} (code ${data.error.code})`);
          break;
        }

        // Parse breakdown: results array with dimension_values ["FOLLOW"] / ["UNFOLLOW"]
        const breakdowns = data.data?.[0]?.total_value?.breakdowns ?? [];
        for (const bd of breakdowns) {
          for (const r of (bd.results ?? [])) {
            const dim = (r.dimension_values?.[0] ?? "").toUpperCase();
            if      (dim === "FOLLOW")   { totalFollows   += r.value ?? 0; hasFollowData = true; }
            else if (dim === "UNFOLLOW") { totalUnfollows += r.value ?? 0; hasFollowData = true; }
          }
        }
        // Fallback: some API versions return total_value.value directly (net)
        if (!hasFollowData && typeof data.data?.[0]?.total_value?.value === "number") {
          totalFollows  = data.data[0].total_value.value;
          hasFollowData = true;
        }
      } catch (e) {
        errors.push(`[follows_and_unfollows] ${String(e)}`);
      }
    }

    if (hasFollowData) {
      result["follows"]   = [{ date: endDate, value: totalFollows }];
      result["unfollows"] = [{ date: endDate, value: totalUnfollows }];
    } else {
      // Final fallback: derive from follower_count daily deltas
      const deltas = result["follower_count"] ?? [];
      const posSum = deltas.filter(d => d.value > 0).reduce((s, d) => s + d.value, 0);
      const negSum = deltas.filter(d => d.value < 0).reduce((s, d) => s + Math.abs(d.value), 0);
      if (posSum > 0 || negSum > 0) {
        result["follows"]   = [{ date: endDate, value: posSum }];
        result["unfollows"] = [{ date: endDate, value: negSum }];
      }
    }
  }

  return { data: result, errors };
}

// ── Interaction breakdown (likes / comments / saves / shares) ─────────────
// These are not stored in SocialMetricSnapshot, so we always fetch them live
// from the Insights API even when DB data is available for other metrics.

async function fetchInteractionTotals(
  igId:  string,
  since: number,
  until: number,
  token: string,
): Promise<{ likes: number; comments: number; saves: number; shares: number; errors: string[] }> {
  const metrics = ["likes", "comments", "saves", "shares"] as const;
  const result  = { likes: 0, comments: 0, saves: 0, shares: 0, errors: [] as string[] };
  const chunks  = chunkRange(since, until);

  await Promise.all(
    metrics.map(async (metric) => {
      let total    = 0;
      let hasError = false;
      for (const chunk of chunks) {
        try {
          const url = `${META}/${igId}/insights?metric=${metric}&period=day` +
                      `&metric_type=total_value&since=${chunk.since}&until=${chunk.until}&access_token=${token}`;
          const res  = await fetch(url);
          const data = await res.json();
          if (data.error) {
            result.errors.push(`[${metric}] ${data.error.message} (code ${data.error.code})`);
            hasError = true;
            break;
          }
          total += data.data?.[0]?.total_value?.value ?? 0;
        } catch (e) {
          result.errors.push(`[${metric}] ${String(e)}`);
          hasError = true;
        }
      }
      if (!hasError) result[metric] = total;
    })
  );

  return result;
}

// ── Demographics ──────────────────────────────────────────────────────────

async function fetchDemographics(igId: string, token: string) {
  const metrics = ["audience_gender_age", "audience_city", "audience_country"];
  try {
    const res  = await fetch(
      `${META}/${igId}/insights?metric=${metrics.join(",")}&period=lifetime&access_token=${token}`
    );
    const data = await res.json();
    if (data.error) return null;

    const byName: Record<string, Record<string, number>> = {};
    for (const item of (data.data ?? [])) {
      byName[item.name] = item.values?.[0]?.value ?? {};
    }

    const ageGender    = byName["audience_gender_age"] ?? {};
    const genderTotal: Record<string, number> = {};
    const ageBuckets:  Record<string, number> = {};

    for (const [key, val] of Object.entries(ageGender)) {
      const [gender, age] = key.split(".");
      genderTotal[gender] = (genderTotal[gender] ?? 0) + (val as number);
      ageBuckets[age]     = (ageBuckets[age]     ?? 0) + (val as number);
    }

    const topCities = Object.entries(byName["audience_city"] ?? {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: value as number }));

    const topCountries = Object.entries(byName["audience_country"] ?? {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 6)
      .map(([name, value]) => ({ name, value: value as number }));

    const ageGroups = Object.entries(ageBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([age, value]) => ({ age, value: value as number }));

    return { genderTotal, ageGroups, topCities, topCountries };
  } catch { return null; }
}

// ── Media stats (posts, interactions) ────────────────────────────────────

async function fetchMediaStats(
  igId:  string,
  token: string,
  since: Date,
  until: Date,
) {
  try {
    const res  = await fetch(
      `${META}/${igId}/media?fields=id,media_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url,caption&limit=100&access_token=${token}`
    );
    const data = await res.json();
    if (data.error) return { total: 0, video: 0, image: 0, carousel: 0, interactions: 0, likes: 0, comments: 0, topMedia: [] };

    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = until.toISOString().split("T")[0];

    const inRange = (data.data ?? []).filter((m: { timestamp: string }) => {
      const d = m.timestamp.split("T")[0];
      return d >= sinceStr && d <= untilStr;
    });

    let video = 0, image = 0, carousel = 0, interactions = 0, mediaLikes = 0, mediaComments = 0;
    for (const m of inRange) {
      const type = m.media_type?.toUpperCase() ?? "";
      if (type === "VIDEO" || type === "REEL") video++;
      else if (type === "CAROUSEL_ALBUM")      carousel++;
      else image++;
      mediaLikes    += (m.like_count     || 0);
      mediaComments += (m.comments_count || 0);
      interactions  += (m.like_count || 0) + (m.comments_count || 0);
    }

    const topMedia = [...inRange]
      .sort((a: { like_count: number; comments_count: number }, b: { like_count: number; comments_count: number }) =>
        (b.like_count + b.comments_count) - (a.like_count + a.comments_count))
      .slice(0, 9)
      .map((m: {
        id: string; caption?: string; media_type: string; permalink: string;
        timestamp: string; like_count: number; comments_count: number;
        thumbnail_url?: string; media_url?: string;
      }) => ({
        id:        m.id,
        caption:   (m.caption ?? "").slice(0, 180),
        mediaType: m.media_type,
        permalink: m.permalink,
        thumbnail: m.thumbnail_url || m.media_url || null,
        timestamp: m.timestamp,
        date:      m.timestamp.split("T")[0],
        likes:     m.like_count     || 0,
        comments:  m.comments_count || 0,
      }));

    return { total: inRange.length, video, image, carousel, interactions, likes: mediaLikes, comments: mediaComments, topMedia };
  } catch {
    return { total: 0, video: 0, image: 0, carousel: 0, interactions: 0, likes: 0, comments: 0, topMedia: [] };
  }
}

// ── Build totals from insights + media ───────────────────────────────────

function buildTotals(
  insights:   Record<string, { date: string; value: number }[]>,
  mediaStats: { total: number; video: number; image: number; carousel: number; interactions: number },
) {
  const sum = (key: string) => (insights[key] ?? []).reduce((s, d) => s + d.value, 0);

  const follows      = sum("follows");
  const unfollows    = sum("unfollows");
  const netFollowers = follows - unfollows;

  // total_interactions from API is preferred; fall back to media like+comment sum
  const apiInteractions = sum("total_interactions");
  const contentInteractions = apiInteractions > 0 ? apiInteractions : mediaStats.interactions;

  return {
    views:               sum("views"),
    reach:               sum("reach"),
    contentInteractions,
    likes:               sum("likes"),
    comments:            sum("comments"),
    saves:               sum("saves"),
    shares:              sum("shares"),
    linkClicks:          sum("website_clicks"),
    profileVisits:       sum("profile_views"),
    follows,
    unfollows,
    netFollowers,
    postsPublished:      mediaStats.total,
    videoPosts:          mediaStats.video,
    staticPosts:         mediaStats.image,
    carouselPosts:       mediaStats.carousel,
  };
}

// ── Build daily series from DB snapshots ─────────────────────────────────
// Converts stored SocialMetricSnapshot rows into the daily[] format used by
// the graph modals, giving a proper per-day breakdown for every metric.

function snapshotsToDailySeries(
  snapshots: {
    date: Date; views: number; reach: number; interactions: number;
    linkClicks: number; profileVisits: number; follows: number;
    unfollows: number; netFollowers: number; followers: number;
    postsPublished: number; videosPublished: number; staticsPublished: number;
  }[]
): Record<string, { date: string; value: number }[]> {
  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
  const toArr  = (fn: (s: typeof sorted[0]) => number) =>
    sorted.map(s => ({ date: s.date.toISOString().split("T")[0], value: fn(s) }));

  return {
    views:              toArr(s => s.views),
    reach:              toArr(s => s.reach),
    total_interactions: toArr(s => s.interactions),
    website_clicks:     toArr(s => s.linkClicks),
    profile_views:      toArr(s => s.profileVisits),
    follows:            toArr(s => s.follows),
    unfollows:          toArr(s => s.unfollows),
    follower_count:     toArr(s => s.netFollowers),
    followers:          toArr(s => s.followers),
    posts:              toArr(s => s.postsPublished),
    videos:             toArr(s => s.videosPublished),
    statics:            toArr(s => s.staticsPublished),
  };
}

function buildTotalsFromSnapshots(
  snapshots: {
    views: number; reach: number; interactions: number; linkClicks: number;
    profileVisits: number; follows: number; unfollows: number; netFollowers: number;
    postsPublished: number; videosPublished: number; staticsPublished: number;
  }[]
) {
  const sum = (fn: (s: typeof snapshots[0]) => number) =>
    snapshots.reduce((acc, s) => acc + fn(s), 0);

  const follows   = sum(s => s.follows);
  const unfollows = sum(s => s.unfollows);

  return {
    views:               sum(s => s.views),
    reach:               sum(s => s.reach),
    contentInteractions: sum(s => s.interactions),
    likes:               0,  // individual metrics stored in sync going forward
    comments:            0,
    saves:               0,
    shares:              0,
    linkClicks:          sum(s => s.linkClicks),
    profileVisits:       sum(s => s.profileVisits),
    follows,
    unfollows,
    netFollowers:        follows - unfollows,
    postsPublished:      sum(s => s.postsPublished),
    videoPosts:          sum(s => s.videosPublished),
    staticPosts:         sum(s => s.staticsPublished),
    carouselPosts:       0,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const sp       = req.nextUrl.searchParams;
  const vertical = sp.get("vertical") ?? "SY_INDIA";
  const platform = sp.get("platform") ?? "instagram";

  const toDate   = sp.get("to")   ? new Date(sp.get("to")!)   : new Date();
  const fromDate = sp.get("from") ? new Date(sp.get("from")!) : (() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  })();

  const compToDate   = sp.get("compTo")   ? new Date(sp.get("compTo")!)   : null;
  const compFromDate = sp.get("compFrom") ? new Date(sp.get("compFrom")!) : null;

  // Set to end-of-day but keep within the day to avoid pushing over 30-day Meta limit
  toDate.setHours(23, 59, 0, 0);
  if (compToDate) compToDate.setHours(23, 59, 0, 0);

  const sinceTs = Math.floor(fromDate.getTime() / 1000);
  const untilTs = Math.floor(toDate.getTime()   / 1000);

  // Non-Instagram platforms: return stub
  if (platform !== "instagram") {
    return NextResponse.json({
      vertical, platform,
      connected: false,
      message:   `${platform.charAt(0).toUpperCase() + platform.slice(1)} is not yet connected. Add it in Settings.`,
    });
  }

  // Find the IG account for this vertical
  const intg = await prisma.metaIntegration.findFirst({
    where: {
      userId:             user.id,
      isActive:           true,
      instagramAccountId: { not: null },
      ...(vertical !== "ALL" ? { vertical: vertical as never } : {}),
    },
  });

  if (!intg) {
    return NextResponse.json({
      connected: false,
      message:   `No Instagram account connected for ${vertical}. Connect in Settings.`,
    });
  }

  const igId  = intg.instagramAccountId!;
  const token = (intg.userAccessToken || intg.pageAccessToken) as string;
  const dbVertical = (vertical as "SY_INDIA" | "SY_UAE" | "INTERIOR" | "SQUARE_CONNECT" | "UM");

  // ── Account info ──────────────────────────────────────────────────────
  const acctRes  = await fetch(
    `${META}/${igId}?fields=id,username,name,followers_count,profile_picture_url&access_token=${token}`
  );
  const acctData = await acctRes.json();

  // ── Try DB first for daily series data ───────────────────────────────
  // DB gives us proper per-day data even for metrics that Meta only returns as aggregates
  const dbSnapshots = await prisma.socialMetricSnapshot.findMany({
    where: {
      vertical: dbVertical,
      platform: "INSTAGRAM",
      date: { gte: fromDate, lte: toDate },
    },
    orderBy: { date: "asc" },
  });

  const hasDbData = dbSnapshots.length > 0;

  // Build daily series and totals from DB if available
  let currentDaily  = hasDbData ? snapshotsToDailySeries(dbSnapshots) : {} as Record<string, { date: string; value: number }[]>;
  let currentTotals = hasDbData ? buildTotalsFromSnapshots(dbSnapshots) : null;

  // ── Fall back to Meta API for periods not yet in DB ───────────────────
  let insightErrors: string[] = [];
  type MediaResult = Awaited<ReturnType<typeof fetchMediaStats>>;
  let currentMedia: MediaResult = { total: 0, video: 0, image: 0, carousel: 0, interactions: 0, likes: 0, comments: 0, topMedia: [] };

  let interactionErrors: string[] = [];

  if (!hasDbData) {
    const [insightResult, media, interactionBreakdown] = await Promise.all([
      fetchInsights(igId, sinceTs, untilTs, token),
      fetchMediaStats(igId, token, fromDate, toDate),
      fetchInteractionTotals(igId, sinceTs, untilTs, token),
    ]);
    currentDaily  = insightResult.data;
    insightErrors = insightResult.errors;
    currentMedia  = media;
    interactionErrors = interactionBreakdown.errors;
    // Fallback: if Insights API didn't return likes/comments, use sums from media endpoint
    const mergedInteractions = {
      likes:    interactionBreakdown.likes    > 0 ? interactionBreakdown.likes    : media.likes,
      comments: interactionBreakdown.comments > 0 ? interactionBreakdown.comments : media.comments,
      saves:    interactionBreakdown.saves,
      shares:   interactionBreakdown.shares,
    };
    currentTotals = { ...buildTotals(insightResult.data, media), ...mergedInteractions };
  } else {
    // Fetch media + interaction breakdown in parallel (not stored per-day in DB)
    const [media, interactionBreakdown] = await Promise.all([
      fetchMediaStats(igId, token, fromDate, toDate),
      fetchInteractionTotals(igId, sinceTs, untilTs, token),
    ]);
    currentMedia      = media;
    interactionErrors = interactionBreakdown.errors;
    // Fallback: if Insights API didn't return likes/comments, use sums from media endpoint
    const mergedInteractions = {
      likes:    interactionBreakdown.likes    > 0 ? interactionBreakdown.likes    : media.likes,
      comments: interactionBreakdown.comments > 0 ? interactionBreakdown.comments : media.comments,
      saves:    interactionBreakdown.saves,
      shares:   interactionBreakdown.shares,
    };
    currentTotals = {
      ...currentTotals!,
      ...mergedInteractions,
      ...(currentTotals!.postsPublished === 0 && media.total > 0
        ? { postsPublished: media.total, videoPosts: media.video, staticPosts: media.image }
        : {}),
    };
  }

  if (!currentTotals) currentTotals = buildTotals(currentDaily, currentMedia);

  // ── Comparison period ─────────────────────────────────────────────────
  let compTotals:  ReturnType<typeof buildTotals> | null = null;
  let compDaily:   Record<string, { date: string; value: number }[]> = {};

  if (compFromDate && compToDate) {
    const compSince = Math.floor(compFromDate.getTime() / 1000);
    const compUntil = Math.floor(compToDate.getTime()   / 1000);

    const compDbSnapshots = await prisma.socialMetricSnapshot.findMany({
      where: { vertical: dbVertical, platform: "INSTAGRAM", date: { gte: compFromDate, lte: compToDate } },
      orderBy: { date: "asc" },
    });

    if (compDbSnapshots.length > 0) {
      const compInteractionBreakdown = await fetchInteractionTotals(igId, compSince, compUntil, token);
      compDaily  = snapshotsToDailySeries(compDbSnapshots);
      compTotals = { ...buildTotalsFromSnapshots(compDbSnapshots), ...compInteractionBreakdown };
    } else {
      const [ci, cm, compInteractionBreakdown] = await Promise.all([
        fetchInsights(igId, compSince, compUntil, token),
        fetchMediaStats(igId, token, compFromDate, compToDate),
        fetchInteractionTotals(igId, compSince, compUntil, token),
      ]);
      compDaily  = ci.data;
      compTotals = { ...buildTotals(ci.data, cm), ...compInteractionBreakdown };
    }
  }

  // ── Demographics ──────────────────────────────────────────────────────
  const demographics = await fetchDemographics(igId, token);

  // ── Top videos last 7 days ────────────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const lastWeekMedia = await fetchMediaStats(igId, token, sevenDaysAgo, new Date());

  return NextResponse.json({
    connected:  true,
    vertical,
    platform,
    dataSource: hasDbData ? "database" : "meta_api",
    dbDaysStored: dbSnapshots.length,
    accountInfo: {
      igId,
      handle:         `@${acctData.username || intg.instagramHandle || ""}`,
      name:           acctData.name || intg.instagramName || intg.pageName || "",
      followers:      acctData.followers_count || intg.followersCount || 0,
      profilePicture: acctData.profile_picture_url || intg.profilePictureUrl || null,
    },
    current: {
      period: { from: fromDate.toISOString().split("T")[0], to: toDate.toISOString().split("T")[0] },
      totals: currentTotals,
      daily:  currentDaily,
    },
    comparison: compTotals ? {
      period: { from: compFromDate!.toISOString().split("T")[0], to: compToDate!.toISOString().split("T")[0] },
      totals: compTotals,
      daily:  compDaily,
    } : null,
    demographics,
    topVideosLastWeek: lastWeekMedia.topMedia,
    insightErrors:     insightErrors.length     > 0 ? insightErrors     : undefined,
    interactionErrors: interactionErrors.length > 0 ? interactionErrors : undefined,
  });
}
