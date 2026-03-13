/**
 * GET  /api/orm/gmb/weekly-report?secret=...  — Vercel Cron (every Monday 09:00 IST)
 * POST /api/orm/gmb/weekly-report              — Manual trigger from dashboard (requires login)
 *
 * What it does:
 *  1. Reads the latest gmb_rating_snapshot for every active location
 *  2. Computes delta vs the previous snapshot
 *  3. Builds a WhatsApp-formatted summary report
 *  4. Sends via Meta WhatsApp Cloud API
 *  5. Returns the report text so the dashboard can preview it too
 *
 * Required env vars:
 *   WHATSAPP_BUSINESS_TOKEN      — Meta System User access token
 *   WHATSAPP_PHONE_NUMBER_ID     — From the WhatsApp Business dashboard
 *   WHATSAPP_REPORT_RECIPIENT    — Phone number in E.164 format, e.g. +919876543210
 *   CRON_SECRET                  — For authenticating Vercel Cron GET requests
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET ?? "squarelabs-cron";
const WA_TOKEN    = process.env.WHATSAPP_BUSINESS_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_TO       = process.env.WHATSAPP_REPORT_RECIPIENT;

// ── WhatsApp sender ────────────────────────────────────────────────────────

async function sendWhatsApp(message: string): Promise<{ ok: boolean; error?: string }> {
  if (!WA_TOKEN || !WA_PHONE_ID || !WA_TO) {
    return { ok: false, error: "WhatsApp env vars not configured (WHATSAPP_BUSINESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_REPORT_RECIPIENT)" };
  }

  const url = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to:                WA_TO,
    type:              "text",
    text:              { body: message },
  };

  try {
    const res  = await fetch(url, {
      method:  "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) return { ok: false, error: data.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Report builder ─────────────────────────────────────────────────────────

function deltaEmoji(d: number | null): string {
  if (d === null)  return "➡️";
  if (d > 0.1)     return "🟢";
  if (d < -0.1)    return "🔴";
  return "🟡";
}

function fmtDelta(d: number | null): string {
  if (d === null) return "—";
  if (d > 0) return `+${d.toFixed(1)}`;
  return d.toFixed(1);
}

interface LocReport {
  name:        string;
  business:    string;
  city:        string;
  rating:      number | null;
  prevRating:  number | null;
  delta:       number | null;
  newReviews:  number | null;
}

function buildReport(locs: LocReport[], weekStr: string): string {
  const tracked = locs.filter(l => l.rating !== null);
  const avgRating = tracked.length > 0
    ? Math.round((tracked.reduce((s, l) => s + (l.rating ?? 0), 0) / tracked.length) * 10) / 10
    : null;

  const improvers = tracked.filter(l => (l.delta ?? 0) > 0).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  const declines  = tracked.filter(l => (l.delta ?? 0) < 0).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  const below4    = tracked.filter(l => (l.rating ?? 5) < 4.0).sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));

  const lines: string[] = [];
  lines.push(`📊 *GMB Weekly Rating Report*`);
  lines.push(`Week of ${weekStr}`);
  lines.push(`─────────────────────`);

  if (avgRating !== null) {
    lines.push(`⭐ Portfolio Avg: *${avgRating.toFixed(1)}* (${tracked.length} locations tracked)`);
  }

  lines.push(``);
  lines.push(`*📍 All Locations*`);
  lines.push(``);

  // Group by business
  const businesses = [...new Set(locs.map(l => l.business))].sort();
  for (const biz of businesses) {
    const bizLocs = locs.filter(l => l.business === biz && l.rating !== null);
    if (bizLocs.length === 0) continue;
    lines.push(`*${biz}*`);
    for (const loc of bizLocs) {
      const d = deltaEmoji(loc.delta);
      const rating = loc.rating !== null ? loc.rating.toFixed(1) : "—";
      const delta  = fmtDelta(loc.delta);
      const reviews = loc.newReviews !== null ? ` (+${loc.newReviews} reviews)` : "";
      lines.push(`${d} ${loc.city}: ${rating}★ (${delta})${reviews}`);
    }
    lines.push(``);
  }

  if (improvers.length > 0) {
    lines.push(`─────────────────────`);
    lines.push(`🟢 *Top Improvers*`);
    for (const l of improvers.slice(0, 5)) {
      lines.push(`  • ${l.city} (${l.business}): ${fmtDelta(l.delta)}`);
    }
    lines.push(``);
  }

  if (declines.length > 0) {
    lines.push(`🔴 *Declines*`);
    for (const l of declines.slice(0, 5)) {
      lines.push(`  • ${l.city} (${l.business}): ${fmtDelta(l.delta)}`);
    }
    lines.push(``);
  }

  if (below4.length > 0) {
    lines.push(`⚠️ *Needs Attention (below 4.0★)*`);
    for (const l of below4) {
      lines.push(`  • ${l.city} (${l.business}): ${l.rating?.toFixed(1)}★`);
    }
    lines.push(``);
  }

  lines.push(`─────────────────────`);
  lines.push(`_Sent automatically every Monday by SquareLabs ORM_`);

  return lines.join("\n");
}

// ── Core logic ─────────────────────────────────────────────────────────────

async function runWeeklyReport() {
  // Get all active locations with last 2 snapshots
  const locations = await (prisma as any).gmbLocation.findMany({
    where:   { status: "active" },
    orderBy: [{ business: "asc" }, { city: "asc" }],
    include: {
      snapshots: {
        orderBy: { weekStart: "desc" },
        take:    2,             // latest + previous
      },
    },
  });

  const locReports: LocReport[] = locations.map((loc: any) => {
    const snaps     = loc.snapshots as any[];
    const latest    = snaps[0] ?? null;
    const previous  = snaps[1] ?? null;
    const rating    = latest?.rating    ?? null;
    const prevRating= previous?.rating  ?? null;
    const delta     = rating !== null && prevRating !== null
      ? Math.round((rating - prevRating) * 10) / 10
      : (latest?.ratingDelta ?? null);

    return {
      name:       loc.name,
      business:   loc.business,
      city:       loc.city,
      rating,
      prevRating,
      delta,
      newReviews: latest?.newReviews ?? null,
    };
  });

  const today   = new Date();
  const weekStr = today.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const report  = buildReport(locReports, weekStr);

  // Send via WhatsApp
  const waResult = await sendWhatsApp(report);

  return {
    report,
    whatsapp: waResult,
    locationCount: locReports.length,
    weekStr,
  };
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runWeeklyReport();
  return NextResponse.json(result);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const result = await runWeeklyReport();
  return NextResponse.json(result);
}
