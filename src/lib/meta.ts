/**
 * Meta Graph API helpers — OAuth flow + data fetching for
 * Instagram Business Accounts and Facebook Pages.
 *
 * Required env vars:
 *   META_APP_ID          — from Meta Developer portal
 *   META_APP_SECRET      — from Meta Developer portal
 *   NEXTAUTH_URL         — e.g. https://square-labs.vercel.app
 */

const META_GRAPH = "https://graph.facebook.com/v20.0";

// Permissions for Instagram + Facebook read access.
// instagram_basic and instagram_manage_insights are DEPRECATED by Meta —
// Instagram Business Account data is now accessed entirely via the Facebook
// Page access token using pages_read_engagement + pages_show_list.
// No separate Instagram scopes are needed for the Graph API v20+.
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
].join(",");

// ── Brand / Vertical auto-detection ──────────────────────────────────────
//
// When Meta returns Facebook Page names, we map them to our internal
// Vertical enum so accounts are tagged automatically — no manual selection.

export type Vertical = "SY_INDIA" | "SY_UAE" | "INTERIOR" | "SQUARE_CONNECT" | "UM";

export function detectVerticalFromPageName(pageName: string): Vertical | null {
  const name = pageName.toLowerCase();

  // Square Yards UAE / Dubai / International
  if ((name.includes("square yards") || name.includes("squareyards")) &&
      (name.includes("uae") || name.includes("dubai") || name.includes("international"))) {
    return "SY_UAE";
  }

  // Interior Company
  if (name.includes("interior")) return "INTERIOR";

  // Square Connect
  if (name.includes("square connect") || name.includes("squareconnect")) return "SQUARE_CONNECT";

  // Urban Money / UM
  if (name.includes("urban money") || name.includes("urbanmoney") ||
      /\bum\b/.test(name)) return "UM";

  // Square Yards India (catch-all for Square Yards after UAE excluded above)
  if (name.includes("square yards") || name.includes("squareyards")) return "SY_INDIA";

  return null;
}

// ── OAuth URL builder ─────────────────────────────────────────────────────

export function getMetaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID!,
    redirect_uri:  `${process.env.NEXTAUTH_URL}/api/meta/callback`,
    scope:         SCOPES,
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params}`;
}

// ── Token exchange ────────────────────────────────────────────────────────

/** Exchange authorization code → short-lived user token */
export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri:  `${process.env.NEXTAUTH_URL}/api/meta/callback`,
    code,
  });
  const res = await fetch(`${META_GRAPH}/oauth/access_token?${params}`);
  return res.json() as Promise<{ access_token?: string; error?: { message: string } }>;
}

/** Exchange short-lived user token → long-lived user token (60 days) */
export async function getLongLivedToken(shortToken: string) {
  const params = new URLSearchParams({
    grant_type:        "fb_exchange_token",
    client_id:         process.env.META_APP_ID!,
    client_secret:     process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${META_GRAPH}/oauth/access_token?${params}`);
  return res.json() as Promise<{
    access_token?: string;
    expires_in?: number;
    error?: { message: string };
  }>;
}

// ── Facebook Pages ────────────────────────────────────────────────────────

export interface FBPage {
  id:           string;
  name:         string;
  access_token: string;
  instagram_business_account?: { id: string };
}

/** Return all Facebook Pages the user manages, with linked Instagram account IDs */
export async function getFacebookPages(userToken: string): Promise<FBPage[]> {
  const res = await fetch(
    `${META_GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
  );
  const data: { data?: FBPage[]; error?: { message: string } } = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data ?? [];
}

// ── Instagram account profile ─────────────────────────────────────────────

export interface IGProfile {
  id:                  string;
  username?:           string;
  name?:               string;
  biography?:          string;
  followers_count?:    number;
  follows_count?:      number;
  media_count?:        number;
  profile_picture_url?: string;
  website?:            string;
}

export async function getInstagramAccount(
  igAccountId: string,
  pageToken: string
): Promise<IGProfile> {
  const fields =
    "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website";
  const res = await fetch(
    `${META_GRAPH}/${igAccountId}?fields=${fields}&access_token=${pageToken}`
  );
  const data: IGProfile & { error?: { message: string } } = await res.json();
  if ((data as any).error) throw new Error((data as any).error.message);
  return data;
}

// ── Instagram media ───────────────────────────────────────────────────────

export interface IGMedia {
  id:           string;
  caption?:     string;
  media_type:   string;
  media_url?:   string;
  thumbnail_url?: string;
  timestamp:    string;
  like_count?:  number;
  comments_count?: number;
  permalink?:   string;
  insights?: Record<string, number>;
}

export async function getInstagramMedia(
  igAccountId: string,
  pageToken: string,
  limit = 20
): Promise<IGMedia[]> {
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink";
  const res = await fetch(
    `${META_GRAPH}/${igAccountId}/media?fields=${fields}&limit=${limit}&access_token=${pageToken}`
  );
  const data: { data?: IGMedia[]; error?: { message: string } } = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data ?? [];
}

export async function getMediaInsights(
  mediaId: string,
  mediaType: string,
  pageToken: string
): Promise<Record<string, number>> {
  const metric =
    mediaType === "VIDEO"
      ? "reach,impressions,saved,video_views"
      : "reach,impressions,saved";
  const res = await fetch(
    `${META_GRAPH}/${mediaId}/insights?metric=${metric}&access_token=${pageToken}`
  );
  const data: { data?: { name: string; values: { value: number }[] }[]; error?: object } =
    await res.json();
  const result: Record<string, number> = {};
  (data.data ?? []).forEach(m => {
    result[m.name] = m.values?.[0]?.value ?? 0;
  });
  return result;
}

// ── Instagram account insights ────────────────────────────────────────────

export async function getAccountInsights(
  igAccountId: string,
  pageToken: string,
  days = 30
): Promise<{ name: string; values: { value: number; end_time: string }[] }[]> {
  const now         = Math.floor(Date.now() / 1000);
  const since       = now - days * 24 * 60 * 60;
  const metric      = "reach,impressions,profile_views,follower_count";
  const res = await fetch(
    `${META_GRAPH}/${igAccountId}/insights?metric=${metric}&period=day&since=${since}&until=${now}&access_token=${pageToken}`
  );
  const data: { data?: { name: string; values: { value: number; end_time: string }[] }[]; error?: object } =
    await res.json();
  return data.data ?? [];
}

// ── Instagram audience insights ───────────────────────────────────────────

export async function getAudienceInsights(
  igAccountId: string,
  pageToken: string
) {
  const res = await fetch(
    `${META_GRAPH}/${igAccountId}/insights?metric=audience_gender_age,audience_country,audience_city&period=lifetime&access_token=${pageToken}`
  );
  const data: { data?: object[]; error?: { message: string } } = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data ?? [];
}

// ── Instagram stories ─────────────────────────────────────────────────────

export interface IGStory {
  id:         string;
  caption?:   string;
  timestamp:  string;
  media_type: string;
  media_url?: string;
  insights?:  Record<string, number>;
}

export async function getInstagramStories(
  igAccountId: string,
  pageToken: string
): Promise<IGStory[]> {
  const fields = "id,caption,timestamp,media_type,media_url";
  const res = await fetch(
    `${META_GRAPH}/${igAccountId}/stories?fields=${fields}&access_token=${pageToken}`
  );
  const data: { data?: IGStory[]; error?: { message: string } } = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data ?? [];
}

export async function getStoryInsights(
  storyId: string,
  pageToken: string
): Promise<Record<string, number>> {
  const res = await fetch(
    `${META_GRAPH}/${storyId}/insights?metric=reach,impressions,replies,exits&access_token=${pageToken}`
  );
  const data: { data?: { name: string; values: { value: number }[] }[] } = await res.json();
  const result: Record<string, number> = {};
  (data.data ?? []).forEach(m => {
    result[m.name] = m.values?.[0]?.value ?? 0;
  });
  return result;
}
