/**
 * GET /api/meta/instagram/analytics?days=30
 * GET /api/meta/instagram/analytics?from=2026-02-01&to=2026-03-12
 *
 * Returns per-account Instagram analytics:
 * - Top engagement posts (likes + comments + saves + shares)
 * - Media published on days with highest follower gain
 * - Media published on days with most unfollows
 * - Daily follower change timeline
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const META = "https://graph.facebook.com/v20.0";

export interface MediaItem {
  id:         string;
  caption:    string;
  mediaType:  string;     // IMAGE | VIDEO | REEL | CAROUSEL_ALBUM
  permalink:  string;
  thumbnail:  string | null;
  timestamp:  string;
  date:       string;     // YYYY-MM-DD
  likes:      number;
  comments:   number;
  saves:      number;
  shares:     number;
  reach:      number;
  plays:      number;
  engagement: number;     // likes + comments + saves + shares
}

async function fetchMediaInsights(
  mediaId: string,
  mediaType: string,
  token: string
): Promise<Record<string, number>> {
  const isReel = mediaType === "VIDEO" || mediaType === "REEL";
  const metrics = isReel ? "reach,saved,shares,plays" : "reach,saved,shares";
  try {
    const res  = await fetch(`${META}/${mediaId}/insights?metric=${metrics}&access_token=${token}`);
    const data = await res.json();
    if (data.error) return {};
    const out: Record<string, number> = {};
    (data.data ?? []).forEach((m: { name: string; values?: { value: number }[]; value?: number }) => {
      out[m.name] = m.values?.[0]?.value ?? m.value ?? 0;
    });
    return out;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // ── Date range ────────────────────────────────────────────────────────────
  const { searchParams } = req.nextUrl;
  const daysParam = searchParams.get("days") ?? "30";
  const fromParam = searchParams.get("from");
  const toParam   = searchParams.get("to");

  let since: Date, until: Date;
  if (fromParam && toParam) {
    since = new Date(fromParam);
    until = new Date(toParam);
    until.setHours(23, 59, 59, 999);
  } else {
    const days = parseInt(daysParam, 10) || 30;
    until = new Date();
    since = new Date();
    since.setDate(since.getDate() - days);
  }

  const sinceTs  = Math.floor(since.getTime() / 1000);
  const untilTs  = Math.floor(until.getTime() / 1000);
  const sinceStr = since.toISOString().split("T")[0];
  const untilStr = until.toISOString().split("T")[0];

  // ── Connected Instagram accounts ──────────────────────────────────────────
  const integrations = await prisma.metaIntegration.findMany({
    where: { userId: user.id, isActive: true, instagramAccountId: { not: null } },
  });

  if (integrations.length === 0) {
    return NextResponse.json({
      error:   "no_instagram",
      message: "No Instagram accounts connected. Please connect in Settings.",
    });
  }

  const accounts = [];

  for (const intg of integrations) {
    const igId  = intg.instagramAccountId!;
    const token = (intg.userAccessToken || intg.pageAccessToken) as string;

    try {
      // ── 1. Account info ─────────────────────────────────────────────────
      const acctRes  = await fetch(
        `${META}/${igId}?fields=id,username,name,followers_count,profile_picture_url&access_token=${token}`
      );
      const acctData = await acctRes.json();
      if (acctData.error) {
        console.warn(`[Analytics] Account error ${igId}:`, acctData.error.message);
        continue;
      }

      // ── 2. Daily follower CHANGE insight ────────────────────────────────
      // follower_count metric = net new followers per day (can be negative)
      let followerTimeline: { date: string; change: number }[] = [];
      let gainDays: string[] = [];
      let lossDays: string[] = [];

      try {
        const flRes  = await fetch(
          `${META}/${igId}/insights?metric=follower_count&period=day&since=${sinceTs}&until=${untilTs}&access_token=${token}`
        );
        const flData = await flRes.json();

        if (!flData.error && flData.data?.[0]?.values?.length) {
          followerTimeline = flData.data[0].values.map((v: { end_time: string; value: number }) => ({
            date:   v.end_time.split("T")[0],
            change: v.value,
          }));
          // Top 3 gain days / top 3 loss days
          const sorted = [...followerTimeline].sort((a, b) => b.change - a.change);
          gainDays = sorted.filter(d => d.change > 0).slice(0, 3).map(d => d.date);
          lossDays = sorted.filter(d => d.change < 0).reverse().slice(0, 3).map(d => d.date);
        }
      } catch { /* insights unavailable for this account */ }

      // ── 3. Media published (fetch 50, filter by date range) ─────────────
      const mediaRes  = await fetch(
        `${META}/${igId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count,media_url,thumbnail_url&limit=50&access_token=${token}`
      );
      const mediaData = await mediaRes.json();

      const rawMedia: {
        id: string; caption?: string; media_type: string; permalink: string;
        timestamp: string; like_count: number; comments_count: number;
        media_url?: string; thumbnail_url?: string;
      }[] = (mediaData?.data ?? []).filter((m: { timestamp: string }) => {
        const d = m.timestamp.split("T")[0];
        return d >= sinceStr && d <= untilStr;
      });

      // Sort by basic engagement for prioritising which ones to fetch insights for
      rawMedia.sort(
        (a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count)
      );

      // ── 4. Fetch detailed insights for top 20 posts ──────────────────────
      const top20 = rawMedia.slice(0, 20);
      const mediaWithInsights: MediaItem[] = await Promise.all(
        top20.map(async m => {
          const ins        = await fetchMediaInsights(m.id, m.media_type, token);
          const engagement = (m.like_count || 0) + (m.comments_count || 0)
                           + (ins.saved || 0) + (ins.shares || 0);
          return {
            id:         m.id,
            caption:    (m.caption ?? "").substring(0, 220),
            mediaType:  m.media_type,
            permalink:  m.permalink,
            thumbnail:  m.thumbnail_url || m.media_url || null,
            timestamp:  m.timestamp,
            date:       m.timestamp.split("T")[0],
            likes:      m.like_count      || 0,
            comments:   m.comments_count  || 0,
            saves:      ins.saved         || 0,
            shares:     ins.shares        || 0,
            reach:      ins.reach         || 0,
            plays:      ins.plays         || 0,
            engagement,
          };
        })
      );

      // ── 5. Correlate media to gain/loss days ────────────────────────────
      const gainDayMedia = mediaWithInsights
        .filter(m => gainDays.includes(m.date))
        .sort((a, b) => b.engagement - a.engagement);

      const lossDayMedia = mediaWithInsights
        .filter(m => lossDays.includes(m.date))
        .sort((a, b) => b.engagement - a.engagement);

      const topByEngagement = [...mediaWithInsights]
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 6);

      accounts.push({
        igId,
        handle:             `@${acctData.username || intg.instagramHandle || "unknown"}`,
        name:               acctData.name || intg.instagramName || intg.pageName || "",
        pageName:           intg.pageName || "",
        vertical:           intg.vertical,
        profilePicture:     acctData.profile_picture_url || intg.profilePictureUrl || null,
        followers:          acctData.followers_count     || intg.followersCount    || 0,
        followerTimeline,
        hasFollowerInsights: followerTimeline.length > 0,
        gainDays,
        lossDays,
        totalMediaInRange:  rawMedia.length,
        topByEngagement,
        gainDayMedia,
        lossDayMedia,
      });

    } catch (err) {
      console.error(`[Analytics] Failed for ${igId}:`, err);
    }
  }

  // ── Aggregate totals ─────────────────────────────────────────────────────
  const allTop = accounts
    .flatMap(a => a.topByEngagement.map(m => ({ ...m, handle: a.handle, vertical: a.vertical })))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 9);

  const allGain = accounts
    .flatMap(a => a.gainDayMedia.map(m => ({ ...m, handle: a.handle, vertical: a.vertical })))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 6);

  const allLoss = accounts
    .flatMap(a => a.lossDayMedia.map(m => ({ ...m, handle: a.handle, vertical: a.vertical })))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 6);

  return NextResponse.json({
    summary: {
      totalFollowers:  accounts.reduce((s, a) => s + a.followers, 0),
      accountCount:    accounts.length,
      dateRange:       { from: sinceStr, to: untilStr, days: parseInt(daysParam, 10) || 30 },
    },
    allTopEngagement: allTop,
    allGainDayMedia:  allGain,
    allLossDayMedia:  allLoss,
    accounts,
  });
}
