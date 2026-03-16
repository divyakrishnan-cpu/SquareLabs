/**
 * GET /api/youtube/connect
 *
 * Starts the Google / YouTube OAuth flow.
 * Requires: GOOGLE_CLIENT_ID, NEXTAUTH_URL
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId   = process.env.GOOGLE_CLIENT_ID;
  const baseUrl    = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/youtube/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID is not configured. See setup instructions in Settings." },
      { status: 503 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({ email: session.user.email, ts: Date.now() })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
