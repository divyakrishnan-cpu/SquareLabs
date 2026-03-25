/**
 * GET /api/social/debug-insights
 * Diagnostic endpoint — fetches the first Instagram post and raw insight responses
 * so we can see exactly what Meta's API returns (format, values, errors).
 * Remove this endpoint once the production issue is resolved.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const META = "https://graph.facebook.com/v20.0";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp       = req.nextUrl.searchParams;
  const vertical = sp.get("vertical") ?? "INTERIOR";

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const intg = await prisma.metaIntegration.findFirst({
    where: {
      userId:             user.id,
      isActive:           true,
      instagramAccountId: { not: null },
      ...(vertical !== "ALL" ? { vertical: vertical as never } : {}),
    },
  });

  if (!intg) return NextResponse.json({ error: "No Instagram integration found" });

  const igId  = intg.instagramAccountId!;
  const token = (intg.userAccessToken || intg.pageAccessToken) as string;

  // Step 1: Get the most recent post
  const mediaRes  = await fetch(
    `${META}/${igId}/media?fields=id,media_type,timestamp,like_count,comments_count&limit=1&access_token=${token}`
  );
  const mediaJson = await mediaRes.json();
  const post      = mediaJson?.data?.[0];

  if (!post) return NextResponse.json({ error: "No posts found", mediaJson });

  const mediaId   = post.id;
  const mediaType = post.media_type;

  // Step 2: Try each metric group separately and return the raw response
  const tryMetric = async (metrics: string, period?: string) => {
    const periodParam = period ? `&period=${period}` : "";
    const url = `${META}/${mediaId}/insights?metric=${metrics}${periodParam}&access_token=${token}`;
    try {
      const res  = await fetch(url);
      const body = await res.json();
      return { url: url.replace(token, "TOKEN_REDACTED"), status: res.status, body };
    } catch (e) {
      return { url: url.replace(token, "TOKEN_REDACTED"), error: String(e) };
    }
  };

  const [
    reachSavedShares,
    reachSavedSharesNoperiod,
    impressions,
    impressionsNoPeriod,
    playsNoPeriod,
    reachOnly,
    impressionsReach,
  ] = await Promise.all([
    tryMetric("reach,saved,shares", "lifetime"),
    tryMetric("reach,saved,shares"),
    tryMetric("impressions", "lifetime"),
    tryMetric("impressions"),
    tryMetric("plays"),
    tryMetric("reach", "lifetime"),
    tryMetric("impressions,reach", "lifetime"),
  ]);

  return NextResponse.json({
    post:       { id: mediaId, type: mediaType, likes: post.like_count, comments: post.comments_count },
    igId,
    results: {
      "reach,saved,shares (period=lifetime)":        reachSavedShares,
      "reach,saved,shares (no period)":              reachSavedSharesNoperiod,
      "impressions (period=lifetime)":               impressions,
      "impressions (no period)":                     impressionsNoPeriod,
      "plays (no period)":                           playsNoPeriod,
      "reach only (period=lifetime)":                reachOnly,
      "impressions,reach (period=lifetime)":         impressionsReach,
    },
  });
}
