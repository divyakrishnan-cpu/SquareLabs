/**
 * POST /api/social/strategy/suggest
 *
 * Analyzes top & bottom performing posts using Claude AI and returns
 * actionable content strategy recommendations.
 *
 * Body: {
 *   platform:    "INSTAGRAM" | "YOUTUBE" | "LINKEDIN"
 *   vertical:    string
 *   metric:      string  (the metric used to rank posts)
 *   dateRange:   string  (human-readable, e.g. "Jan 2025 – Mar 2026")
 *   topPosts:    PostPerformance[]
 *   bottomPosts: PostPerformance[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import type { PostPerformance }      from "../../top-posts/route";

const VERTICAL_LABELS: Record<string, string> = {
  SY_INDIA:       "Square Yards India — a major real estate marketplace in India (property listings, new projects, investment content)",
  SY_UAE:         "Square Yards UAE — real estate marketplace for UAE & GCC (Dubai, Abu Dhabi, luxury property, NRI investment)",
  INTERIOR:       "Interior Co. — an interior design and home decor brand (room makeovers, design tips, product showcases, before/after transformations)",
  SQUARE_CONNECT: "Square Connect — a PropTech & B2B real estate services platform (developer partnerships, channel partner tools, industry news)",
  UM:             "Urban Money — a fintech platform focused on home loans, mortgages, and personal finance (loan comparisons, EMI calculators, financial advice)",
};

const METRIC_LABELS: Record<string, string> = {
  engagement:    "total engagement (likes + comments + saves + shares)",
  impressions:   "impressions (total times shown)",
  reach:         "unique reach (unique accounts reached)",
  views:         "video views / plays",
  saves:         "saves / bookmarks",
  shares:        "shares",
  likes:         "likes",
  comments:      "comments",
  profileVisits: "profile visits",
  linkClicks:    "link clicks",
};

function formatPost(p: PostPerformance, metric: string): string {
  const dateStr = p.publishedAt.split("T")[0];
  const caption = p.title.replace(/\n/g, " ").slice(0, 80);
  const metricVal = ((p as unknown as Record<string, unknown>)[metric] ?? 0) as number;
  return (
    `• [${p.type}] "${caption}" (${dateStr}) — ` +
    `${metric}=${metricVal}, impressions=${p.impressions}, reach=${p.reach}, ` +
    `likes=${p.likes}, comments=${p.comments}, saves=${p.saves}, shares=${p.shares}` +
    (p.views > 0 ? `, views=${p.views}` : "") +
    (p.linkClicks > 0 ? `, linkClicks=${p.linkClicks}` : "")
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const {
    platform    = "INSTAGRAM",
    vertical    = "INTERIOR",
    metric      = "engagement",
    dateRange   = "the selected period",
    topPosts    = [] as PostPerformance[],
    bottomPosts = [] as PostPerformance[],
  } = await req.json();

  const brandContext  = VERTICAL_LABELS[vertical]   ?? vertical;
  const metricContext = METRIC_LABELS[metric]        ?? metric;
  const platformName  = platform.charAt(0) + platform.slice(1).toLowerCase();

  const topSection    = topPosts.length
    ? topPosts.map((p: PostPerformance) => formatPost(p, metric)).join("\n")
    : "No top-performing posts found.";

  const bottomSection = bottomPosts.length
    ? bottomPosts.map((p: PostPerformance) => formatPost(p, metric)).join("\n")
    : "No bottom-performing posts found.";

  const prompt = `You are an expert social media strategist. Analyze ${platformName} post performance data for the brand described below and give specific, actionable content strategy advice.

BRAND:
${brandContext}

PLATFORM: ${platformName}
DATE RANGE: ${dateRange}
RANKED BY: ${metricContext}

TOP ${topPosts.length} PERFORMING POSTS:
${topSection}

BOTTOM ${bottomPosts.length} PERFORMING POSTS:
${bottomSection}

Analyze the patterns across content type (VIDEO/REEL/IMAGE/CAROUSEL/ARTICLE), topic themes visible in captions, and engagement metrics.

Return a JSON object with EXACTLY these keys (no extra text before or after the JSON):
{
  "doMore": [
    "Specific content type or theme that clearly drives high ${metric} — be actionable and concrete"
  ],
  "doLess": [
    "Specific content type or theme that consistently underperforms — explain why briefly"
  ],
  "insights": [
    "Key pattern or observation about what makes this audience engage — data-driven"
  ],
  "contentIdeas": [
    "A specific video/post idea that would likely perform well based on the top performers' patterns"
  ],
  "bestPostingPattern": "One concise observation about the timing, format, or frequency pattern seen in top performers vs bottom performers"
}

Rules:
- doMore: 3–4 items, each 1 sentence
- doLess: 2–3 items, each 1 sentence
- insights: 3–4 items, each 1–2 sentences
- contentIdeas: 4–5 items, each 1–2 sentences with specific angles/hooks
- bestPostingPattern: 1 paragraph max
- Be specific to the brand, not generic social media advice
- Reference actual patterns from the data provided`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 1500,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 500 });
    }

    const data: {
      content?: { type: string; text: string }[];
      error?:   { message: string };
    } = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const rawText = data.content?.find(c => c.type === "text")?.text ?? "";

    // Parse JSON from response (Claude sometimes wraps it in ```json ... ```)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Return the raw text as a single insight if JSON parse fails
      return NextResponse.json({
        analysis: {
          doMore:             [],
          doLess:             [],
          insights:           [rawText],
          contentIdeas:       [],
          bestPostingPattern: "",
        },
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error("[strategy/suggest]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
