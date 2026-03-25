/** Metrics gathered from one platform for one calendar month */
export interface PlatformMonthData {
  platform:        "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "YOUTUBE";
  totalFollowers:  number;   // cumulative at month-end
  newFollowers:    number;   // gained this month
  unfollows:       number;   // lost this month
  netFollowers:    number;
  totalViews:      number;
  totalReach:      number;
  totalImpressions:number;
  interactions:    number;   // likes + comments + shares + saves
  linkClicks:      number;
  profileVisits:   number;
  totalContacts:   number;
  postsPublished:  number;
  videosPublished: number;
  staticsPublished:number;
}

/** Aggregated result for one vertical covering all platforms */
export interface MonthlySyncResult {
  vertical:    string;
  year:        number;
  month:       number;
  platforms:   PlatformMonthData[];
  errors:      { platform: string; message: string }[];
}

export function emptyPlatformData(platform: PlatformMonthData["platform"]): PlatformMonthData {
  return {
    platform, totalFollowers: 0, newFollowers: 0, unfollows: 0,
    netFollowers: 0, totalViews: 0, totalReach: 0, totalImpressions: 0,
    interactions: 0, linkClicks: 0, profileVisits: 0, totalContacts: 0,
    postsPublished: 0, videosPublished: 0, staticsPublished: 0,
  };
}

/** Sum all platform data into a single aggregate for SocialMonthlyReport */
export function aggregatePlatforms(platforms: PlatformMonthData[]) {
  const agg = {
    totalFollowers: 0, newFollowers: 0, unfollows: 0, netFollowers: 0,
    totalViews: 0, totalReach: 0, totalImpressions: 0,
    interactions: 0, linkClicks: 0, profileVisits: 0, totalContacts: 0,
    postsPublished: 0, videosPublished: 0, staticsPublished: 0,
  };
  for (const p of platforms) {
    agg.totalFollowers  += p.totalFollowers;
    agg.newFollowers    += p.newFollowers;
    agg.unfollows       += p.unfollows;
    agg.netFollowers    += p.netFollowers;
    agg.totalViews      += p.totalViews;
    agg.totalReach      += p.totalReach;
    agg.totalImpressions+= p.totalImpressions;
    agg.interactions    += p.interactions;
    agg.linkClicks      += p.linkClicks;
    agg.profileVisits   += p.profileVisits;
    agg.totalContacts   += p.totalContacts;
    agg.postsPublished  += p.postsPublished;
    agg.videosPublished += p.videosPublished;
    agg.staticsPublished+= p.staticsPublished;
  }
  return agg;
}
