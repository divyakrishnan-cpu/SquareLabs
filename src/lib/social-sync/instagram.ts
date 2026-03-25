/**
 * Instagram monthly rollup — aggregates the existing daily SocialMetricSnapshot
 * rows for a given vertical + calendar month into a PlatformMonthData object.
 *
 * The daily sync (sync-daily route) already stores one row per day for Instagram,
 * so here we just SUM/LAST the columns for the requested month.
 */

import { db as prisma } from "@/lib/db";
import { type PlatformMonthData, emptyPlatformData } from "./types";

export async function getInstagramMonthData(
  vertical: string,
  year: number,
  month: number
): Promise<PlatformMonthData> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd   = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // last day

  const rows = await prisma.socialMetricSnapshot.findMany({
    where: {
      vertical: vertical as any,
      platform: "INSTAGRAM",
      date: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { date: "asc" },
  });

  if (rows.length === 0) return emptyPlatformData("INSTAGRAM");

  // Cumulative follower count = last day's value
  const lastRow = rows[rows.length - 1];

  // Sum daily increment fields
  let newFollowers = 0, unfollows = 0, views = 0, reach = 0,
      impressions = 0, interactions = 0, linkClicks = 0,
      profileVisits = 0, posts = 0, videos = 0, statics = 0;

  for (const r of rows) {
    newFollowers  += r.follows;
    unfollows     += r.unfollows;
    views         += r.views;
    reach         += r.reach;
    impressions   += r.impressions;
    interactions  += r.interactions;
    linkClicks    += r.linkClicks;
    profileVisits += r.profileVisits;
    posts         += r.postsPublished;
    videos        += r.videosPublished;
    statics       += r.staticsPublished;
  }

  return {
    platform:        "INSTAGRAM",
    totalFollowers:  lastRow.followers,
    newFollowers,
    unfollows,
    netFollowers:    newFollowers - unfollows,
    totalViews:      views,
    totalReach:      reach,
    totalImpressions:impressions,
    interactions,
    linkClicks,
    profileVisits,
    totalContacts:   0, // not tracked per Instagram daily snap
    postsPublished:  posts,
    videosPublished: videos,
    staticsPublished:statics,
  };
}
