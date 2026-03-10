/**
 * GET /api/meta/instagram/overview?accountId={instagramAccountId}
 *
 * Returns:
 *   profile  — IG Business Account fields (followers, media count, bio …)
 *   insights — 30-day daily breakdown of reach, impressions, profile_views
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import { getInstagramAccount, getAccountInsights } from "@/lib/meta";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const integration = await prisma.metaIntegration.findFirst({
    where: {
      userId:  user.id,
      isActive: true,
      ...(accountId ? { instagramAccountId: accountId } : {}),
    },
  });

  if (!integration || !integration.instagramAccountId)
    return NextResponse.json({ error: "No connected Instagram account found" }, { status: 404 });

  try {
    const [profile, insights] = await Promise.all([
      getInstagramAccount(integration.instagramAccountId, integration.pageAccessToken),
      getAccountInsights(integration.instagramAccountId, integration.pageAccessToken, 30),
    ]);

    return NextResponse.json({ profile, insights });
  } catch (err) {
    console.error("[Instagram overview error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
