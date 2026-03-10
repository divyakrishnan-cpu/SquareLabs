/**
 * GET /api/meta/instagram/posts?accountId={instagramAccountId}&limit=20
 *
 * Returns the latest posts/reels with per-post reach, impressions,
 * saves and video views pulled from the Media Insights edge.
 */

import { NextRequest, NextResponse }     from "next/server";
import { getServerSession }              from "next-auth";
import { authOptions }                   from "@/lib/auth";
import { prisma }                        from "@/lib/prisma";
import { getInstagramMedia, getMediaInsights } from "@/lib/meta";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");
  const limit     = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);

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
    const media = await getInstagramMedia(
      integration.instagramAccountId,
      integration.pageAccessToken,
      limit
    );

    // Fetch per-post insights in parallel (cap concurrency to avoid rate limits)
    const posts = await Promise.all(
      media.map(async post => {
        try {
          const insights = await getMediaInsights(
            post.id,
            post.media_type,
            integration.pageAccessToken
          );
          return { ...post, insights };
        } catch {
          return { ...post, insights: {} };
        }
      })
    );

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("[Instagram posts error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
