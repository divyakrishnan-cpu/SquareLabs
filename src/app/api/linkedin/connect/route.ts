/**
 * GET /api/linkedin/connect
 *
 * Starts the LinkedIn OAuth 2.0 flow for Company Pages.
 * Requires: LINKEDIN_CLIENT_ID, NEXTAUTH_URL
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";

// Scopes needed for reading and posting to company pages
const SCOPES = [
  "r_organization_social",
  "rw_organization_admin",
  "w_organization_social",
  "r_basicprofile",
].join(" ");

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId   = process.env.LINKEDIN_CLIENT_ID;
  const baseUrl    = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/linkedin/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "LINKEDIN_CLIENT_ID is not configured. See setup instructions in Settings." },
      { status: 503 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({ email: session.user.email, ts: Date.now() })
  ).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    redirect_uri:  redirectUri,
    state,
    scope:         SCOPES,
  });

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );
}
