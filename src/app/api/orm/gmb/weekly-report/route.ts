/**
 * GET  /api/orm/gmb/weekly-report?secret=...  — Vercel Cron (every Monday 09:00 IST)
 * POST /api/orm/gmb/weekly-report              — Manual trigger from dashboard (requires login)
 *
 * What it does:
 *  1. Reads the latest gmb_rating_snapshot for every active location
 *  2. Computes delta vs the previous snapshot
 *  3. Builds a WhatsApp-formatted summary report
 *  4. Sends via Twilio WhatsApp API (free sandbox available)
 *  5. Returns the report text so the dashboard can preview it too
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID           — From console.twilio.com
 *   TWILIO_AUTH_TOKEN            — From console.twilio.com
 *   TWILIO_WHATSAPP_FROM         — Twilio sandbox: whatsapp:+14155238886
 *                                  (or your approved number once live)
 *   TWILIO_WHATSAPP_TO           — Recipient in E.164, e.g. whatsapp:+919876543210
 *   CRON_SECRET                  — For authenticating Vercel Cron GET requests
 *
 * Free sandbox setup (takes ~2 min):
 *   1. Sign up at twilio.com (free, $15 trial credit)
 *   2. Go to Messaging → Try it out → Send a WhatsApp message
 *   3. Send "join <sandbox-word>" to +1 415 523 8886 from your WhatsApp
 *   4. Copy Account SID + Auth Token from the console dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const CRON_SECRET    = process.env.CRON_SECRET ?? "squarelabs-cron";
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_WHATSAPP_FROM;   // e.g. whatsapp:+14155238886
const TWILIO_TO      = process.env.TWILIO_WHATSAPP_TO;     // e.g. whatsapp:+919876543210

// ── Twilio WhatsApp sender ─────────────────────────────────────────────────

async function sendWhatsApp(message: string): Promise<{ ok: boolean; error?: string }> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM || !TWILIO_TO) {
    return {
      ok: false,
      error: "Twilio env vars not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_TO in Vercel.",
    };
  }

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const body = new URLSearchParams({ From: TWILIO_FROM, To: TWILIO_TO, Body: message });

  try {
    const res  = await fetch(url, {
      method:  "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });
    const data = await res.json();
    if (data.error_message || data.status === "failed" || data.status === "undelivered") {
      return { ok: false, error: data.error_message ?? data.message ?? "Send failed" };
    }
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
