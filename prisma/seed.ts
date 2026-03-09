import { PrismaClient, Vertical, SocialPlatform } from "@prisma/client";
import { subDays, format } from "date-fns";

const db = new PrismaClient();

async function main() {
  console.log("🌱  Seeding database...");

  // Seed users
  const divya = await db.user.upsert({
    where: { email: "divya.krishnan@squareyards.com" },
    update: {},
    create: {
      name: "Divya Krishnan",
      email: "divya.krishnan@squareyards.com",
      role: "HEAD_OF_MARKETING",
    },
  });

  const socialsLead = await db.user.upsert({
    where: { email: "socials.lead@squareyards.com" },
    update: {},
    create: { name: "Priya Sharma", email: "socials.lead@squareyards.com", role: "TEAM_LEAD" },
  });

  // Seed 90 days of social metrics for SY India across platforms
  const platforms: SocialPlatform[] = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "YOUTUBE"];
  const verticals: Vertical[] = ["SY_INDIA", "SY_UAE", "INTERIOR", "SQUARE_CONNECT", "UM"];

  let baseFollowers: Record<string, number> = {
    SY_INDIA_INSTAGRAM:  285000,
    SY_INDIA_FACEBOOK:   412000,
    SY_INDIA_LINKEDIN:   98000,
    SY_INDIA_YOUTUBE:    67000,
    SY_UAE_INSTAGRAM:    54000,
    SY_UAE_FACEBOOK:     31000,
    SY_UAE_LINKEDIN:     22000,
    INTERIOR_INSTAGRAM:  41000,
    INTERIOR_FACEBOOK:   18000,
    SQUARE_CONNECT_LINKEDIN: 15000,
    UM_INSTAGRAM:        9500,
  };

  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const date = subDays(new Date(), daysAgo);
    for (const vertical of verticals) {
      for (const platform of platforms) {
        const key = `${vertical}_${platform}`;
        if (!baseFollowers[key]) continue;

        const follows   = Math.floor(Math.random() * 300) + 50;
        const unfollows = Math.floor(Math.random() * 80)  + 10;
        baseFollowers[key] += follows - unfollows;

        await db.socialMetricSnapshot.upsert({
          where: { vertical_platform_date: { vertical, platform, date } },
          update: {},
          create: {
            vertical, platform, date,
            followers:        baseFollowers[key],
            follows,
            unfollows,
            netFollowers:     follows - unfollows,
            views:            Math.floor(Math.random() * 80000) + 5000,
            reach:            Math.floor(Math.random() * 50000) + 3000,
            impressions:      Math.floor(Math.random() * 120000) + 8000,
            interactions:     Math.floor(Math.random() * 4000)  + 200,
            linkClicks:       Math.floor(Math.random() * 800)   + 50,
            profileVisits:    Math.floor(Math.random() * 3000)  + 200,
            totalContacts:    Math.floor(Math.random() * 120)   + 10,
            postsPublished:   Math.floor(Math.random() * 3),
            videosPublished:  Math.floor(Math.random() * 2),
            staticsPublished: Math.floor(Math.random() * 2),
          },
        });
      }
    }
  }

  // Seed 20 content calendar items for current month
  const titles = [
    "Is Now the Best Time to Buy a 2BHK in Mumbai?",
    "Top 5 Investment Hotspots in Dubai 2026",
    "Before & After: Interior Transformation in 15 Days",
    "How NRIs Can Buy Property in India — Step by Step",
    "Pune Real Estate Market Report — March 2026",
    "Behind the Scenes: A Day at Square Yards",
    "What ₹1 Crore Gets You in Different Cities",
    "Client Success Story: First Home Buyers from Bangalore",
    "Interior Trends 2026: What's In and What's Out",
    "Common Mistakes First-Time Buyers Make",
    "UAE Golden Visa & Property — Complete Guide",
    "Top 3 Agent Success Stories — Square Connect",
    "Hyderabad vs Pune: Which is Better for Investment?",
    "Home Loan Tips That Banks Don't Tell You",
    "Luxury Living at UM — Property Tour",
    "RERA 2026: What Changed and What It Means for Buyers",
    "Interior Design on a Budget — 10 Tips",
    "How to Evaluate a Property Developer Before Buying",
    "Mumbai Luxury Market Update Q1 2026",
    "The Truth About Property Appreciation in Indian Cities",
  ];

  for (let i = 0; i < 20; i++) {
    const daysOffset = i * 1.5;
    const plannedDate = subDays(new Date(), -Math.floor(daysOffset) + 5);
    const statuses = ["PLANNED","PLANNED","SCRIPT_READY","VIDEO_UPLOADED","SCHEDULED","PUBLISHED","DELAYED","RESCHEDULED"];
    const status = statuses[i % statuses.length] as any;
    const verticalList: Vertical[] = ["SY_INDIA","SY_UAE","INTERIOR","SQUARE_CONNECT","UM"];
    const vertical = verticalList[i % 5];

    await db.contentCalendarItem.create({
      data: {
        vertical,
        platforms: i % 3 === 0
          ? ["INSTAGRAM","YOUTUBE","LINKEDIN"]
          : i % 3 === 1
          ? ["INSTAGRAM","FACEBOOK"]
          : ["LINKEDIN","YOUTUBE"],
        contentType: i % 4 === 0 ? "REEL" : i % 4 === 1 ? "CAROUSEL" : i % 4 === 2 ? "YOUTUBE_VIDEO" : "STATIC",
        category: ["EDUCATION","LISTING","BRAND","TESTIMONIAL","MARKET_UPDATE"][i % 5] as any,
        title: titles[i],
        hook: `Stop scrolling — this could save you lakhs on your next property decision`,
        assignedToId: i % 2 === 0 ? socialsLead.id : divya.id,
        plannedDate,
        scheduledAt: status === "SCHEDULED" ? plannedDate : undefined,
        publishedAt: status === "PUBLISHED" ? plannedDate : undefined,
        status,
        delayReason: status === "DELAYED" || status === "RESCHEDULED" ? "SHOOT_DELAYED" : undefined,
        aiConfidence: 0.7 + Math.random() * 0.3,
      },
    });
  }

  console.log("✅  Seed complete");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
