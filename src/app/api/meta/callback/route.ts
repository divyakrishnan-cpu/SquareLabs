/**
 * GET /api/meta/callback?code=...&state=...
 *
 * Handles the redirect back from Meta's OAuth dialog.
 * 1. Exchange the one-time code for a short-lived user token
 * 2. Upgrade to a 60-day long-lived token
 * 3. Fetch ALL Facebook Pages + linked Instagram Business Accounts
 * 4. Auto-detect which Square Yards brand each page belongs to
 * 5. Upsert each page into MetaIntegration in the database
 * 6. Redirect back to /settings with a success or error flag
 */

import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getFacebookPages,
  getInstagramAccount,
  detectVerticalFromPageName,
} from "@/lib/meta";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const failRedirect = (reason: string) =>
    NextResponse.redirect(new URL(`/settings?error=${reason}`, req.url));

  if (error)           return failRedirect("meta_denied");
  if (!code || !state) return failRedirect("meta_invalid");

  // ── Decode state ───────────────────────────────────────────────────────
  let email: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    email = decoded.email;
  } catch {
    return failRedirect("meta_state_invalid");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return failRedirect("meta_user_not_found");

  try {
    // ── 1. Exchange code → short-lived user token ──────────────────────
    const shortData = await exchangeCodeForToken(code);
    if (!shortData.access_token) {
      console.error("[Meta callback] Token exchange failed:", shortData);
      return failRedirect("meta_token_error");
    }

    // ── 2. Upgrade → long-lived user token (60 days) ──────────────────
    const longData = await getLongLivedToken(shortData.access_token);
    if (!longData.access_token) {
      console.error("[Meta callback] Long-lived token failed:", longData);
      return failRedirect("meta_longtoken_error");
    }

    const longToken = longData.access_token;
    const expiresAt = longData.expires_in
      ? new Date(Date.now() + longData.expires_in * 1000)
      : null;

    // ── 3. Get ALL Facebook Pages ──────────────────────────────────────
    const allPages = await getFacebookPages(longToken);

    // Only process pages that have an access_token.
    // Pages from the Business Portfolio API are listed even if the user
    // didn't select them in the OAuth dialog — those have no token and
    // cannot be stored or queried.
    const pages = allPages.filter(p => !!p.access_token);

    console.log(`[Meta callback] Total pages found: ${allPages.length}, with token: ${pages.length}`);

    if (pages.length === 0) {
      console.error("[Meta callback] 0 pages with access tokens. All pages:", allPages.map(p => p.name));
      return failRedirect("meta_no_pages");
    }

    let igCount = 0;
    let savedCount = 0;

    for (const page of pages) {
      try {
        // ── 4. Auto-detect brand ─────────────────────────────────────
        const detectedVertical = detectVerticalFromPageName(page.name);

        // ── Resolve Instagram Business Account ID ─────────────────────
        // CRITICAL: Page tokens don't carry Instagram permissions.
        // Must use the long-lived USER token (longToken) to query
        // instagram_business_account — it has all OAuth-granted scopes.
        const META_GRAPH_CB = "https://graph.facebook.com/v20.0";
        let igId = page.instagram_business_account?.id ?? null;

        if (!igId) {
          try {
            // Try 1: user token query (most reliable — carries all OAuth scopes)
            const r1 = await fetch(
              `${META_GRAPH_CB}/${page.id}?fields=instagram_business_account&access_token=${longToken}`
            );
            const d1: { instagram_business_account?: { id: string } } = await r1.json();
            igId = d1.instagram_business_account?.id ?? null;
            if (igId) console.log(`[Meta] IG found via user token for ${page.name}: ${igId}`);
          } catch { /* continue */ }
        }

        if (!igId) {
          try {
            // Try 2: page token query (fallback)
            const r2 = await fetch(
              `${META_GRAPH_CB}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
            );
            const d2: { instagram_business_account?: { id: string } } = await r2.json();
            igId = d2.instagram_business_account?.id ?? null;
            if (igId) console.log(`[Meta] IG found via page token for ${page.name}: ${igId}`);
          } catch { /* continue */ }
        }

        if (!igId) {
          try {
            // Try 3: /instagram_accounts edge (older endpoint, sometimes works)
            const r3 = await fetch(
              `${META_GRAPH_CB}/${page.id}/instagram_accounts?fields=id,username&access_token=${longToken}`
            );
            const d3: { data?: { id: string; username?: string }[] } = await r3.json();
            igId = d3.data?.[0]?.id ?? null;
            if (igId) console.log(`[Meta] IG found via instagram_accounts edge for ${page.name}: ${igId}`);
          } catch { /* continue */ }
        }

        let igProfile = null;
        // Use page token for IG profile fetch (page token works for IG data once we have the IG ID)
        const tokenForIg = page.access_token || longToken;
        if (igId) {
          try {
            igProfile = await getInstagramAccount(igId, tokenForIg);
            igCount++;
          } catch (igErr) {
            console.warn(`[Meta callback] IG profile fetch failed for ${page.name}:`, igErr);
          }
        }

        // ── 5. Upsert into MetaIntegration ───────────────────────────
        await prisma.metaIntegration.upsert({
          where: { userId_pageId: { userId: user.id, pageId: page.id } },
          create: {
            userId:             user.id,
            pageId:             page.id,
            pageName:           page.name,
            pageAccessToken:    page.access_token,
            userAccessToken:    longToken,             // store user token for IG queries
            tokenExpiresAt:     expiresAt,
            instagramAccountId: igProfile?.id                  ?? null,
            instagramHandle:    igProfile?.username             ?? null,
            instagramName:      igProfile?.name                 ?? null,
            profilePictureUrl:  igProfile?.profile_picture_url ?? null,
            followersCount:     igProfile?.followers_count      ?? null,
            followsCount:       igProfile?.follows_count        ?? null,
            mediaCount:         igProfile?.media_count          ?? null,
            vertical:           detectedVertical,
            isActive:           true,
          },
          update: {
            pageAccessToken:    page.access_token,
            userAccessToken:    longToken,             // refresh user token on re-connect
            tokenExpiresAt:     expiresAt,
            instagramAccountId: igProfile?.id                  ?? null,
            instagramHandle:    igProfile?.username             ?? null,
            instagramName:      igProfile?.name                 ?? null,
            profilePictureUrl:  igProfile?.profile_picture_url ?? null,
            followersCount:     igProfile?.followers_count      ?? null,
            followsCount:       igProfile?.follows_count        ?? null,
            mediaCount:         igProfile?.media_count          ?? null,
            vertical:           detectedVertical,
            isActive:           true,
          },
        });

        savedCount++;
      } catch (pageErr) {
        // Don't crash the whole flow if one page fails — log and continue
        console.error(`[Meta callback] Failed to save page "${page.name}":`, pageErr);
      }
    }

    // ── 6. Redirect back to Settings ──────────────────────────────────
    return NextResponse.redirect(
      new URL(
        `/settings?success=meta_connected&pages=${savedCount}&ig=${igCount}`,
        req.url
      )
    );

  } catch (err) {
    console.error("[Meta callback] Unexpected error:", err);
    return failRedirect("meta_server_error");
  }
}
