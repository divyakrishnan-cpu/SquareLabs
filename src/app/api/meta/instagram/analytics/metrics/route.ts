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

const META = "https://graph.facebook.com/v20.0";

// ── Helpers ───────────────────────────────────────────────────────────────

async function fetchInsights(
  igId: string,
  metrics: string[],
  since: number,
  until: number,
  token: string
): Promise<{
  data:   Record<string, { date: string; value: number }[]>;
  errors: string[];
}> {
  const result: Record<string, { date: string; value: number }[]> = {};
  const errors: string[] = [];

  // Fetch metrics one at a time — some metrics (e.g. follower_count) fail in batch with others
  for (const metric of metrics) {
    try {
      const url = `${META}/${igId}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${token}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.error) {
        errors.push(`[${metric}] ${data.error.message} (code ${data.error.code})`);
      } else if (data.data) {
        for (const item of data.data) {
          result[item.name] = (item.values ?? []).map((v: { end_time: string; value: number }) => ({
            date:  v.end_time.split("T")[0],
            value: v.value ?? 0,
          }));
        }
      }
    } catch (e) {
      errors.push(`[${metric}] fetch exception: ${String(e)}`);
    }
  }
  return { data: result, errors };
}

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

    // Parse age/gender: keys like "M.25-34" → { M: {...}, F: {...} }
    const ageGender = byName["audience_gender_age"] ?? {};
    const genderTotal: Record<string, number> = {};
    const ageBuckets: Record<string, number>  = {};

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

async function fetchMediaStats(
  igId: string,
  token: string,
  since: Date,
  until: Date
) {
  try {
    const res  = await fetch(
      `${META}/${igId}/media?fields=id,media_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url,caption&limit=100&access_token=${token}`
    );
    const data = await res.json();
    if (data.error) return { total: 0, video: 0, image: 0, carousel: 0, interactions: 0, topMedia: [] };

    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = until.toISOString().split("T")[0];

    const inRange = (data.data ?? []).filter((m: { timestamp: string }) => {
      const d = m.timestamp.split("T")[0];
      return d >= sinceStr && d <= untilStr;
    });

    let video = 0, image = 0, carousel = 0, interactions = 0;
    for (const m of inRange) {
      const type = m.media_type?.toUpperCase() ?? "";
      if (type === "VIDEO" || type === "REEL") video++;
      else if (type === "CAROUSEL_ALBUM") carousel++;
      else image++;
      interactions += (m.like_count || 0) + (m.comments_count || 0);
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
        likes:     m.like_count    || 0,
        comments:  m.comments_count || 0,
      }));

    return { total: inRange.length, video, image, carousel, interactions, topMedia };
  } catch {
    return { total: 0, video: 0, image: 0, carousel: 0, interactions: 0, topMedia: [] };
  }
}

function buildTotals(insights: Record<string, { date: string; value: number }[]>, mediaStats: {
  total: number; video: number; image: number; carousel: number; interactions: number;
}) {
  const sum = (key: string) =>
    (insights[key] ?? []).reduce((s, d) => s + d.value, 0);

  const followerChanges = insights["follower_count"] ?? [];
  const follows   = followerChanges.filter(d => d.value > 0).reduce((s, d) => s + d.value, 0);
  const unfollows = followerChanges.filter(d => d.value < 0).reduce((s, d) => s + Math.abs(d.value), 0);
  const netFollowers = follows - unfollows;

  const contact = sum("email_contacts") + sum("get_directions_clicks")
                + sum("phone_call_clicks") + sum("text_message_clicks");

  return {
    views:                sum("impressions"),
    reach:                sum("reach"),
    contentInteractions:  mediaStats.interactions,
    linkClicks:           sum("website_clicks"),
    profileVisits:        sum("profile_views"),
    follows,
    unfollows,
    netFollowers,
    totalContact:         contact || null,
    postsPublished:       mediaStats.total,
    videoPosts:           mediaStats.video,
    staticPosts:          mediaStats.image,
    carouselPosts:        mediaStats.carousel,
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

  // Default: last 30 days
  const toDate   = sp.get("to")   ? new Date(sp.get("to")!)   : new Date();
  const fromDate = sp.get("from") ? new Date(sp.get("from")!) : (() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  })();

  const compToDate   = sp.get("compTo")   ? new Date(sp.get("compTo")!)   : null;
  const compFromDate = sp.get("compFrom") ? new Date(sp.get("compFrom")!) : null;

  toDate.setHours(23, 59, 59, 999);
  if (compToDate) compToDate.setHours(23, 59, 59, 999);

  const sinceTs = Math.floor(fromDate.getTime() / 1000);
  const untilTs = Math.floor(toDate.getTime()   / 1000);

  // Non-Instagram platforms: return stub (not yet connected)
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

  // ── Fetch account info ──────────────────────────────────────────────────
  const acctRes  = await fetch(
    `${META}/${igId}?fields=id,username,name,followers_count,profile_picture_url&access_token=${token}`
  );
  const acctData = await acctRes.json();

  // ── Fetch current period insights ───────────────────────────────────────
  const INSIGHT_METRICS = [
    "reach", "impressions", "profile_views",
    "follower_count", "website_clicks",
    "email_contacts", "get_directions_clicks",
    "phone_call_clicks", "text_message_clicks",
  ];

  const [insightResult, currentMedia] = await Promise.all([
    fetchInsights(igId, INSIGHT_METRICS, sinceTs, untilTs, token),
    fetchMediaStats(igId, token, fromDate, toDate),
  ]);

  const currentInsights = insightResult.data;
  const insightErrors   = insightResult.errors;
  const currentTotals   = buildTotals(currentInsights, currentMedia);

  // ── Fetch comparison period insights ────────────────────────────────────
  let compTotals = null;
  let compInsights: Record<string, { date: string; value: number }[]> = {};

  if (compFromDate && compToDate) {
    const compSince = Math.floor(compFromDate.getTime() / 1000);
    const compUntil = Math.floor(compToDate.getTime()   / 1000);
    const [ci, cm] = await Promise.all([
      fetchInsights(igId, INSIGHT_METRICS, compSince, compUntil, token),
      fetchMediaStats(igId, token, compFromDate, compToDate),
    ]);
    compInsights = ci.data;
    compTotals   = buildTotals(ci.data, cm);
  }

  // ── Demographics ────────────────────────────────────────────────────────
  const demographics = await fetchDemographics(igId, token);

  // ── Last 7 days top media ────────────────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const lastWeekMedia = await fetchMediaStats(igId, token, sevenDaysAgo, new Date());

  return NextResponse.json({
    connected:  true,
    vertical,
    platform,
    accountInfo: {
      igId,
      handle:         `@${acctData.username || intg.instagramHandle || ""}`,
      name:           acctData.name || intg.instagramName || intg.pageName || "",
      followers:      acctData.followers_count || intg.followersCount || 0,
      profilePicture: acctData.profile_picture_url || intg.profilePictureUrl || null,
    },
    current: {
      period:   { from: fromDate.toISOString().split("T")[0], to: toDate.toISOString().split("T")[0] },
      totals:   currentTotals,
      daily:    currentInsights,
    },
    comparison: compTotals ? {
      period:  { from: compFromDate!.toISOString().split("T")[0], to: compToDate!.toISOString().split("T")[0] },
      totals:  compTotals,
      daily:   compInsights,
    } : null,
    demographics,
    topVideosLastWeek: lastWeekMedia.topMedia,
    // Debug field — shows any errors from the Instagram Insights API
    insightErrors: insightErrors.length > 0 ? insightErrors : undefined,
  });
}
