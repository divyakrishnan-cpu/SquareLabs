/**
 * GET /api/meta/instagram/stories?accountId={instagramAccountId}
 *
 * Returns the current set of active stories with per-story:
 *   reach, impressions, replies, exits
 *
 * Note: stories expire after 24 h — this endpoint always returns live data.
 */

import { NextRequest, NextResponse }       from "next/server";
import { getServerSession }                from "next-auth";
import { authOptions }                     from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { getInstagramStories, getStoryInsights } from "@/lib/meta";

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
    const stories = await getInstagramStories(
      integration.instagramAccountId,
      integration.pageAccessToken
    );

    // Fetch per-story insights in parallel
    const storiesWithInsights = await Promise.all(
      stories.map(async story => {
        try {
          const insights = await getStoryInsights(story.id, integration.pageAccessToken);
          return { ...story, insights };
        } catch {
          return { ...story, insights: {} };
        }
      })
    );

    return NextResponse.json({ stories: storiesWithInsights });
  } catch (err) {
    console.error("[Instagram stories error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
