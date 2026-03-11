/**
 * GET /api/meta/debug
 *
 * Temporary diagnostic route — shows exactly what the Meta token can see.
 * Used to diagnose why 0 pages are being returned.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const META_GRAPH = "https://graph.facebook.com/v20.0";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Check if we have any stored integrations
  const stored = await prisma.metaIntegration.findMany({ where: { userId: user.id } });

  if (stored.length === 0) {
    // No stored pages — verify app credentials at least work
    const appTokenRes = await fetch(
      `${META_GRAPH}/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&grant_type=client_credentials`
    );
    const appToken = await appTokenRes.json();

    return NextResponse.json({
      diagnosis: "OAuth completed but 0 pages were returned by /me/accounts",
      most_likely_cause: "Your personal Facebook account is not assigned as a direct Admin/Editor on the Business Portfolio pages",
      app_credentials: appToken.access_token ? "✅ META_APP_ID and META_APP_SECRET are valid" : `❌ App credentials error: ${JSON.stringify(appToken)}`,
      fix_steps: [
        "1. Go to business.facebook.com (Meta Business Suite)",
        "2. Settings → Accounts → Pages",
        "3. For EACH page (Square Yards, Interior Company, Square Connect, etc.):",
        "   → Click the page → People tab → Add People",
        "   → Add your personal Facebook email → Role: Admin",
        "4. Then click 'Connect All Brands' in SquareLabs Settings again",
      ],
    });
  }

  // We have stored pages — test one of the page tokens
  const sample = stored[0];
  const pageToken = sample.pageAccessToken;

  const [meAccountsRes, igRes] = await Promise.all([
    fetch(`${META_GRAPH}/me/accounts?fields=id,name,instagram_business_account&access_token=${pageToken}`),
    sample.instagramAccountId
      ? fetch(`${META_GRAPH}/${sample.instagramAccountId}?fields=id,username,followers_count&access_token=${pageToken}`)
      : Promise.resolve(null),
  ]);

  const meAccounts = await meAccountsRes.json();
  const igData     = igRes ? await igRes.json() : null;

  return NextResponse.json({
    stored_count:        stored.length,
    stored_pages:        stored.map(s => ({ name: s.pageName, ig: s.instagramHandle, vertical: s.vertical })),
    sample_page_token_test: {
      page_name:   sample.pageName,
      me_accounts: meAccounts,
      ig_profile:  igData,
    },
  });
}
