/**
 * GET /api/youtube/callback
 *
 * Handles redirect from Google OAuth.
 * Exchanges code → tokens, fetches all channels the user manages,
 * and upserts each into YoutubeIntegration.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const settingsUrl = `${baseUrl}/settings`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?error=youtube_${error}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=youtube_missing_params`);
  }

  // Decode state → get user email
  let email: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    email = decoded.email;
  } catch {
    return NextResponse.redirect(`${settingsUrl}?error=youtube_invalid_state`);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.redirect(`${settingsUrl}?error=youtube_user_not_found`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri  = `${baseUrl}/api/youtube/callback`;

  // ── Exchange code for tokens ─────────────────────────────────────────────
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return NextResponse.redirect(`${settingsUrl}?error=youtube_token_failed`);
  }

  const accessToken  = tokenData.access_token as string;
  const refreshToken = tokenData.refresh_token as string | undefined;
  const expiresIn    = tokenData.expires_in as number ?? 3600;
  const expiresAt    = new Date(Date.now() + expiresIn * 1000);

  // ── Fetch channels this user manages ────────────────────────────────────
  const chanRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const chanData = await chanRes.json();

  const channels: any[] = chanData.items ?? [];
  if (!channels.length) {
    return NextResponse.redirect(`${settingsUrl}?error=youtube_no_channels`);
  }

  let saved = 0;
  for (const ch of channels) {
    const channelId     = ch.id as string;
    const channelName   = ch.snippet?.title        ?? null;
    const channelHandle = ch.snippet?.customUrl?.replace("@", "") ?? null;
    const thumbnailUrl  = ch.snippet?.thumbnails?.default?.url ?? null;
    const subscriberCount = parseInt(ch.statistics?.subscriberCount ?? "0", 10) || null;
    const videoCount      = parseInt(ch.statistics?.videoCount      ?? "0", 10) || null;
    const viewCount       = BigInt(ch.statistics?.viewCount         ?? "0");

    await (prisma as any).youtubeIntegration.upsert({
      where:  { userId_channelId: { userId: user.id, channelId } },
      update: {
        channelName, channelHandle, thumbnailUrl,
        subscriberCount, videoCount, viewCount,
        accessToken, ...(refreshToken ? { refreshToken } : {}),
        tokenExpiresAt: expiresAt, isActive: true,
      },
      create: {
        userId: user.id, channelId,
        channelName, channelHandle, thumbnailUrl,
        subscriberCount, videoCount, viewCount,
        accessToken, refreshToken: refreshToken ?? null,
        tokenExpiresAt: expiresAt, isActive: true,
      },
    });
    saved++;
  }

  return NextResponse.redirect(
    `${settingsUrl}?success=youtube_connected&channels=${saved}`
  );
}
