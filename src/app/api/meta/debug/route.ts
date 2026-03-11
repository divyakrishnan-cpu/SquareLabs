/**
 * GET /api/meta/debug
 *
 * Comprehensive diagnostic — checks token permissions, /me/accounts,
 * /me/businesses, and whether Business Portfolio pages are accessible.
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

  const stored = await prisma.metaIntegration.findMany({ where: { userId: user.id } });

  // ── App-level credential check ─────────────────────────────────────────
  const appTokenRes = await fetch(
    `${META_GRAPH}/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&grant_type=client_credentials`
  );
  const appTokenData = await appTokenRes.json();
  const appToken = appTokenData.access_token;

  if (!appToken) {
    return NextResponse.json({ error: "App credentials invalid", detail: appTokenData });
  }

  // ── If we have a stored page token, use it to probe the API ───────────
  if (stored.length > 0) {
    const pageToken = stored[0].pageAccessToken;

    const [permRes, meRes, bizRes] = await Promise.all([
      fetch(`${META_GRAPH}/me/permissions?access_token=${pageToken}`),
      fetch(`${META_GRAPH}/me?fields=id,name&access_token=${pageToken}`),
      fetch(`${META_GRAPH}/me/businesses?fields=id,name,owned_pages{id,name,instagram_business_account}&access_token=${pageToken}`),
    ]);

    const [perms, me, biz] = await Promise.all([
      permRes.json(), meRes.json(), bizRes.json(),
    ]);

    return NextResponse.json({
      stored_pages: stored.map(s => ({ name: s.pageName, ig: s.instagramHandle, vertical: s.vertical })),
      token_me:         me,
      token_permissions: perms,
      me_businesses:    biz,
      note: "If me_businesses.data has pages, we need to switch to the Business API to fetch them",
    });
  }

  // ── No stored token — provide guidance ────────────────────────────────
  // Try using app token to check if the app can see anything
  const appBizRes  = await fetch(`${META_GRAPH}/me?access_token=${appToken}`);
  const appMeData  = await appBizRes.json();

  return NextResponse.json({
    stored_pages: 0,
    app_token_status: "✅ valid",
    app_me: appMeData,
    diagnosis: "0 pages returned during OAuth. Possible causes:",
    causes: {
      A: "During the Facebook OAuth dialog, pages weren't selected — try reconnecting and look for a 'Pages' section in the dialog where you must click each page",
      B: "Pages are in Business Portfolio but personal account doesn't have direct Page Admin role yet (may need a few minutes to propagate after being added in Business Manager)",
      C: "The Meta App is a Business App type — this sometimes requires using the Business API instead of /me/accounts",
    },
    next_step: "Try reconnecting at /api/meta/connect — then check this debug URL again",
  });
}
