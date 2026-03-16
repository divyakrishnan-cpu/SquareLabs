/**
 * GET /api/linkedin/callback
 *
 * Handles redirect from LinkedIn OAuth.
 * Exchanges code → tokens, fetches all company pages the user admins,
 * and upserts each into LinkedinIntegration.
 */

import { NextRequest, NextResponse } from "next/server";
import { db as prisma }              from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const baseUrl     = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const settingsUrl = `${baseUrl}/settings`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?error=linkedin_${error}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=linkedin_missing_params`);
  }

  let email: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    email = decoded.email;
  } catch {
    return NextResponse.redirect(`${settingsUrl}?error=linkedin_invalid_state`);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.redirect(`${settingsUrl}?error=linkedin_user_not_found`);
  }

  const clientId     = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri  = `${baseUrl}/api/linkedin/callback`;

  // ── Exchange code for tokens ─────────────────────────────────────────────
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return NextResponse.redirect(`${settingsUrl}?error=linkedin_token_failed`);
  }

  const accessToken  = tokenData.access_token  as string;
  const refreshToken = tokenData.refresh_token  as string | undefined;
  const expiresIn    = tokenData.expires_in     as number ?? 5184000; // 60 days
  const expiresAt    = new Date(Date.now() + expiresIn * 1000);

  // ── Fetch company pages the user administers ─────────────────────────────
  // LinkedIn v2 API: /v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR
  const aclRes = await fetch(
    "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName,vanityName,logoV2(original~:playableStreams),followersCount)))&count=50",
    { headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0" } }
  );
  const aclData = await aclRes.json();

  const orgs: any[] = aclData.elements ?? [];
  if (!orgs.length) {
    return NextResponse.redirect(`${settingsUrl}?error=linkedin_no_pages`);
  }

  let saved = 0;
  for (const element of orgs) {
    const org = element["organization~"];
    if (!org) continue;

    const organizationId = String(org.id ?? element.organization?.split(":").pop() ?? "");
    if (!organizationId) continue;

    const name        = org.localizedName  ?? null;
    const vanityName  = org.vanityName     ?? null;
    const followerCount = org.followersCount ?? null;
    const logoUrl     = org.logoV2?.["original~"]?.elements?.[0]?.identifiers?.[0]?.identifier ?? null;

    await (prisma as any).linkedinIntegration.upsert({
      where:  { userId_organizationId: { userId: user.id, organizationId } },
      update: {
        name, vanityName, followerCount, logoUrl,
        accessToken, ...(refreshToken ? { refreshToken } : {}),
        tokenExpiresAt: expiresAt, isActive: true,
      },
      create: {
        userId: user.id, organizationId,
        name, vanityName, followerCount, logoUrl,
        accessToken, refreshToken: refreshToken ?? null,
        tokenExpiresAt: expiresAt, isActive: true,
      },
    });
    saved++;
  }

  if (saved === 0) {
    return NextResponse.redirect(`${settingsUrl}?error=linkedin_no_pages`);
  }

  return NextResponse.redirect(
    `${settingsUrl}?success=linkedin_connected&pages=${saved}`
  );
}
