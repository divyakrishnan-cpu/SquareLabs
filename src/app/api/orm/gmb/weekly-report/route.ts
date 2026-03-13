/**
 * GET  /api/orm/gmb/weekly-report?secret=...  — Vercel Cron (every Monday 09:00 IST)
 * POST /api/orm/gmb/weekly-report              — Manual trigger from dashboard
 *
 * Builds the weekly GMB rating report text in WhatsApp format.
 * The dashboard generates this client-side for the copy button,
 * but this endpoint is kept for cron logging / future integrations.
 *
 * Required env vars:
 *   CRON_SECRET  — For authenticating Vercel Cron GET requests
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET ?? "squarelabs-cron";

// ── Report builder ─────────────────────────────────────────────────────────

function getReportGroup(business: string, country: string): string {
  if (business === "Square Yards" && country === "India") return "Square Yards India";
  if (business === "Square Yards") return "International";
  if (business === "Interior Company") return "INCO";
  return business;
}

const GROUP_ORDER = ["Square Yards India", "International", "AZURO", "Urban Money", "INCO", "PropVR", "Square Connect"];

interface LocRow {
  name:         string;
  business:     string;
  city:         string;
  country:      string;
  mapsUrl:      string | null;
  displayLabel: string | null;
  rating:       number | null;
  prevRating:   number | null;
}

function buildReport(locs: LocRow[], weekStr: string): string {
  const lines: string[] = [];
  lines.push(`Reviews And Ratings Report - ${weekStr}`);
  lines.push("");

  const byGroup: Record<string, LocRow[]> = {};
  for (const loc of locs) {
    if (!loc.mapsUrl || loc.rating === null) continue;
    const grp = getReportGroup(loc.business, loc.country);
    if (!byGroup[grp]) byGroup[grp] = [];
    byGroup[grp].push(loc);
  }

  for (const grp of Object.keys(byGroup)) {
    byGroup[grp].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  const allGroups = [...GROUP_ORDER, ...Object.keys(byGroup).filter(g => !GROUP_ORDER.includes(g))];

  for (const grp of allGroups) {
    const group = byGroup[grp];
    if (!group || group.length === 0) continue;
    lines.push(grp);
    for (const loc of group) {
      const label = loc.displayLabel ?? loc.city;
      const curr  = loc.rating!.toFixed(1);
      const prev  = loc.prevRating !== null ? loc.prevRating.toFixed(1) : curr;
      lines.push(`${label}- ${curr}⭐️(${prev})`);
      lines.push(loc.mapsUrl!);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

// ── Core logic ─────────────────────────────────────────────────────────────

async function runWeeklyReport() {
  const locations = await (prisma as any).gmbLocation.findMany({
    where:   { status: "active" },
    orderBy: [{ business: "asc" }, { city: "asc" }],
    include: {
      snapshots: {
        orderBy: { weekStart: "desc" },
        take:    2,
      },
    },
  });

  const locRows: LocRow[] = locations.map((loc: any) => {
    const snaps    = loc.snapshots as any[];
    const latest   = snaps[0] ?? null;
    const previous = snaps[1] ?? null;
    return {
      name:         loc.name,
      business:     loc.business,
      city:         loc.city,
      country:      loc.country,
      mapsUrl:      loc.mapsUrl ?? null,
      displayLabel: loc.displayLabel ?? null,
      rating:       latest?.rating    ?? null,
      prevRating:   previous?.rating  ?? null,
    };
  });

  const today   = new Date();
  const weekStr = today.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const report  = buildReport(locRows, weekStr);

  return { report, locationCount: locRows.length, weekStr };
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
