/**
 * Facebook Page monthly data — fetches page fan counts and monthly insights
 * (reach, impressions, page views, fan adds/removes) from the Meta Graph API
 * for a given Facebook Page integration record.
 *
 * Graph API docs:
 *   /{page-id}?fields=fan_count,followers_count — current follower counts
 *   /{page-id}/insights — monthly rolled-up metrics
 *
 * Note on period=month vs period=day:
 *   Meta's "month" period = last 28 days (not calendar month). To get true
 *   calendar-month data we use period=day with since/until and SUM client-side,
 *   or use date_preset=last_month which = prior calendar month. We use
 *   since/until with period=day and sum for accurate calendar-month matching.
 */

import { type PlatformMonthData, emptyPlatformData } from "./types";

const GRAPH = "https://graph.facebook.com/v20.0";

interface PageInsightValue { value: number; end_time: string }
interface PageInsightSeries { name: string; values: PageInsightValue[] }

async function fetchPageInsights(
  pageId: string,
  token: string,
  metric: string,
  since: number,
  until: number
): Promise<number> {
  try {
    const url = `${GRAPH}/${pageId}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${token}`;
    const res  = await fetch(url);
    const data: { data?: PageInsightSeries[]; error?: { message: string } } = await res.json();
    if (data.error || !data.data?.length) return 0;
    // Sum all daily values in the series
    return (data.data[0].values ?? []).reduce((sum, v) => sum + (v.value ?? 0), 0);
  } catch { return 0; }
}

async function fetchPageFans(pageId: string, token: string): Promise<{ fans: number; followers: number }> {
  try {
    const res  = await fetch(`${GRAPH}/${pageId}?fields=fan_count,followers_count&access_token=${token}`);
    const data: { fan_count?: number; followers_count?: number; error?: object } = await res.json();
    if ((data as any).error) return { fans: 0, followers: 0 };
    return { fans: data.fan_count ?? 0, followers: data.followers_count ?? 0 };
  } catch { return { fans: 0, followers: 0 }; }
}

async function countPagePosts(
  pageId: string,
  token: string,
  sinceDate: string,
  untilDate: string
): Promise<{ total: number; video: number; statics: number }> {
  try {
    const url = `${GRAPH}/${pageId}/feed?fields=id,type,created_time&limit=100&since=${sinceDate}&until=${untilDate}&access_token=${token}`;
    const res  = await fetch(url);
    const data: { data?: { id: string; type: string }[]; error?: object } = await res.json();
    if ((data as any).error || !data.data) return { total: 0, video: 0, statics: 0 };
    let video = 0, statics = 0;
    for (const p of data.data) {
      if ((p.type ?? "").toLowerCase() === "video") video++;
      else statics++;
    }
    return { total: data.data.length, video, statics };
  } catch { return { total: 0, video: 0, statics: 0 }; }
}

export interface FacebookIntegration {
  pageId:          string;
  pageAccessToken: string;
  pageName?:       string | null;
}

export async function getFacebookMonthData(
  intg: FacebookIntegration,
  year: number,
  month: number
): Promise<PlatformMonthData> {
  const monthStart  = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd    = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const sinceTs     = Math.floor(monthStart.getTime() / 1000);
  const untilTs     = Math.floor(monthEnd.getTime()   / 1000);
  const sinceDateStr= monthStart.toISOString().split("T")[0];
  const untilDateStr= monthEnd.toISOString().split("T")[0];

  const token = intg.pageAccessToken;

  const [fans, reach, impressions, views, fanAdds, fanRemoves, posts] = await Promise.all([
    fetchPageFans(intg.pageId, token),
    fetchPageInsights(intg.pageId, token, "page_post_engagements",  sinceTs, untilTs),  // engagement proxy
    fetchPageInsights(intg.pageId, token, "page_impressions",       sinceTs, untilTs),
    fetchPageInsights(intg.pageId, token, "page_views_total",       sinceTs, untilTs),
    fetchPageInsights(intg.pageId, token, "page_fan_adds_unique",   sinceTs, untilTs),
    fetchPageInsights(intg.pageId, token, "page_fan_removes_unique",sinceTs, untilTs),
    countPagePosts(intg.pageId, token, sinceDateStr, untilDateStr),
  ]);

  // page_reach_total is the best "reach" metric for pages
  const reachVal = await fetchPageInsights(intg.pageId, token, "page_reach", sinceTs, untilTs);

  return {
    platform:        "FACEBOOK",
    totalFollowers:  fans.followers || fans.fans,
    newFollowers:    fanAdds,
    unfollows:       fanRemoves,
    netFollowers:    fanAdds - fanRemoves,
    totalViews:      views,
    totalReach:      reachVal || reach,
    totalImpressions:impressions,
    interactions:    reach,    // page_post_engagements ≈ interactions
    linkClicks:      0,        // requires page_actions_post_reactions_* breakdown
    profileVisits:   views,
    totalContacts:   0,
    postsPublished:  posts.total,
    videosPublished: posts.video,
    staticsPublished:posts.statics,
  };
}
