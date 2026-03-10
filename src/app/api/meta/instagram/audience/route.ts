/**
 * GET /api/meta/instagram/audience?accountId={instagramAccountId}
 *
 * Returns lifetime audience breakdown:
 *   audience_gender_age  — e.g. { "M.18-24": 150, "F.25-34": 420, … }
 *   audience_country     — { "IN": 5600, "AE": 1200, … }
 *   audience_city        — { "Mumbai": 800, "Dubai": 600, … }
 *
 * Note: requires instagram_manage_insights permission on the connected account.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { getAudienceInsights }       from "@/lib/meta";

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
    return NextResponse.json({ error: "No connected Instagram account" }, { status: 404 });

  try {
    const audience = await getAudienceInsights(
      integration.instagramAccountId,
      integration.pageAccessToken
    );
    return NextResponse.json({ audience });
  } catch (err) {
    console.error("[Instagram audience error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
