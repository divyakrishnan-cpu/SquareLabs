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

// This route is intentionally public — it must be reachable before the user
// has an active session cookie (the browser just returned from Facebook).
// Add  api/meta/callback  to the middleware exclusion list.

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const failRedirect = (reason: string) =>
    NextResponse.redirect(new URL(`/settings?error=${reason}`, req.url));

  if (error)           return failRedirect("meta_denied");
  if (!code || !state) return failRedirect("meta_invalid");

  // ── Decode state ──────────────────────────────────────────────────────────
  let email: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    email = decoded.email;
  } catch {
    return failRedirect("meta_state_invalid");
  }

  // Resolve user from email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return failRedirect("meta_user_not_found");

  try {
    // ── 1. Exchange code → short-lived user token ─────────────────────────
    const shortData = await exchangeCodeForToken(code);
    if (!shortData.access_token) return failRedirect("meta_token_error");

    // ── 2. Upgrade → long-lived user token (60 days) ─────────────────────
    const longData = await getLongLivedToken(shortData.access_token);
    if (!longData.access_token) return failRedirect("meta_longtoken_error");

    const longToken = longData.access_token;
    const expiresAt = longData.expires_in
      ? new Date(Date.now() + longData.expires_in * 1000)
      : null;

    // ── 3. Get ALL Facebook Pages + linked Instagram accounts ─────────────
    const pages = await getFacebookPages(longToken);
    let igCount = 0;

    for (const page of pages) {
      // ── 4. Auto-detect brand from page name ───────────────────────────
      const detectedVertical = detectVerticalFromPageName(page.name);

      const igId = page.instagram_business_account?.id ?? null;
      let igProfile = null;
      if (igId) {
        try {
          igProfile = await getInstagramAccount(igId, page.access_token);
          igCount++;
        } catch { /* page exists even without IG */ }
      }

      // ── 5. Upsert into MetaIntegration ───────────────────────────────
      await prisma.metaIntegration.upsert({
        where: { userId_pageId: { userId: user.id, pageId: page.id } },
        create: {
          userId:             user.id,
          pageId:             page.id,
          pageName:           page.name,
          pageAccessToken:    page.access_token,
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
          tokenExpiresAt:     expiresAt,
          instagramAccountId: igProfile?.id                  ?? null,
          instagramHandle:    igProfile?.username             ?? null,
          instagramName:      igProfile?.name                 ?? null,
          profilePictureUrl:  igProfile?.profile_picture_url ?? null,
          followersCount:     igProfile?.followers_count      ?? null,
          followsCount:       igProfile?.follows_count        ?? null,
          mediaCount:         igProfile?.media_count          ?? null,
          // Re-detect vertical on reconnect in case name changed
          vertical:           detectedVertical,
          isActive:           true,
        },
      });
    }

    // ── 6. Redirect back to Settings with success flag ────────────────────
    return NextResponse.redirect(
      new URL(
        `/settings?success=meta_connected&pages=${pages.length}&ig=${igCount}`,
        req.url
      )
    );
  } catch (err) {
    console.error("[Meta callback error]", err);
    return failRedirect("meta_server_error");
  }
}
