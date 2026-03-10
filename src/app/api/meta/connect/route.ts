/**
 * GET /api/meta/connect?vertical=SY_INDIA
 *
 * Starts the Meta OAuth flow. Redirects the user to Facebook's
 * authorization dialog. The `state` param carries the current user's
 * ID and the target vertical so the callback can store the token correctly.
 *
 * Requires:  META_APP_ID, META_APP_SECRET, NEXTAUTH_URL  (env vars)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { getMetaAuthUrl }            from "@/lib/meta";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Embed user identity + target vertical in the state param (base64 JSON).
  // This is checked in the callback to prevent CSRF.
  const vertical = req.nextUrl.searchParams.get("vertical") ?? "all";
  const state = Buffer.from(
    JSON.stringify({ email: session.user.email, vertical, ts: Date.now() })
  ).toString("base64url");

  const authUrl = getMetaAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
