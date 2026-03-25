import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// ── Enum maps (case-insensitive) ──────────────────────────────────────────

const VERTICAL_MAP: Record<string, string> = {
  "sy india": "SY_INDIA", "syindia": "SY_INDIA",
  "sy uae":   "SY_UAE",   "syuae":   "SY_UAE",
  "interior co.": "INTERIOR", "interior": "INTERIOR", "interior company": "INTERIOR",
  "square connect": "SQUARE_CONNECT", "squareconnect": "SQUARE_CONNECT",
  "urban money": "UM", "um": "UM",
};

const TYPE_MAP: Record<string, string> = {
  "reel": "REEL", "carousel": "CAROUSEL", "static": "STATIC",
  "story": "STORY", "youtube video": "YOUTUBE_VIDEO", "youtube": "YOUTUBE_VIDEO",
  "short": "SHORT",
};

const CATEGORY_MAP: Record<string, string> = {
  "listing": "LISTING", "education": "EDUCATION", "brand": "BRAND",
  "testimonial": "TESTIMONIAL", "festive": "FESTIVE",
  "market update": "MARKET_UPDATE", "tips": "TIPS",
  "behind scenes": "BEHIND_SCENES", "behind the scenes": "BEHIND_SCENES",
};

const STATUS_MAP: Record<string, string> = {
  "planned":             "PLANNED",
  "script in progress":  "SCRIPT_IN_PROGRESS",
  "script ready":        "SCRIPT_READY",
  "video uploaded":      "VIDEO_UPLOADED",
  "scheduled":           "SCHEDULED",
  "published":           "PUBLISHED",
  "delayed":             "DELAYED",
  "rescheduled":         "RESCHEDULED",
  "cancelled":           "CANCELLED",
  "canceled":            "CANCELLED",
};

const PLATFORM_MAP: Record<string, string> = {
  "instagram": "INSTAGRAM", "ig": "INSTAGRAM",
  "facebook":  "FACEBOOK",  "fb": "FACEBOOK",
  "linkedin":  "LINKEDIN",  "li": "LINKEDIN",
  "youtube":   "YOUTUBE",   "yt": "YOUTUBE",
  "twitter":   "TWITTER",
  "pinterest": "PINTEREST",
};

function mapEnum<T>(map: Record<string,string>, raw: string, fallback: T): string | T {
  return map[raw.toLowerCase().trim()] ?? fallback;
}

function parsePlatforms(raw: string): string[] {
  return raw.split(/[,;|\/]/)
    .map(p => PLATFORM_MAP[p.trim().toLowerCase()])
    .filter(Boolean);
}

function parseDate(raw: string | number): Date | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? null : d;
}

// Row indices (0-based) — skip first 2 rows (header + notes)
const COL = { brand:0, series:1, title:2, type:3, category:4, platforms:5, date:6, assignee:7, status:8, hook:9, notes:10 };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  let rows: string[][];

  try {
    if (file.name.endsWith(".csv")) {
      // CSV: parse manually
      const text = buffer.toString("utf-8");
      rows = text.split(/\r?\n/).map(line => {
        // Handle quoted fields
        const cells: string[] = [];
        let cur = ""; let inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
          else cur += ch;
        }
        cells.push(cur.trim());
        return cells;
      });
    } else {
      // XLSX/XLS
      const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Could not parse file: ${err.message}` }, { status: 400 });
  }

  // Skip header rows (row 0 = labels, row 1 = notes/hints, data starts row 2)
  const dataRows = rows.slice(2).filter(r => r.some(c => String(c ?? "").trim()));

  if (dataRows.length === 0) {
    return NextResponse.json({ error: "No data rows found. Make sure you're using the template (data starts on row 3)." }, { status: 400 });
  }

  // Resolve assignee names → user IDs (cache)
  const allUsers = await (db.user as any).findMany({ select: { id: true, name: true } });
  const userByName = (name: string) => {
    const n = name.toLowerCase().trim();
    return allUsers.find((u: any) => u.name.toLowerCase().includes(n) || n.includes(u.name.toLowerCase().split(" ")[0]));
  };

  const results: { row: number; title: string; status: "created" | "skipped" | "error"; reason?: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r    = dataRows[i];
    const row  = i + 3; // 1-indexed for error reporting
    const cell = (col: number) => String(r[col] ?? "").trim();

    const title   = cell(COL.title);
    const rawBrand= cell(COL.brand);
    const rawType = cell(COL.type);
    const rawDate = r[COL.date];

    if (!title) { results.push({ row, title: "(blank)", status: "skipped", reason: "Title is empty" }); continue; }

    const vertical = mapEnum(VERTICAL_MAP, rawBrand, null) as string | null;
    if (!vertical) { results.push({ row, title, status: "skipped", reason: `Unknown brand: "${rawBrand}"` }); continue; }

    const contentType = mapEnum(TYPE_MAP, rawType, "REEL") as string;
    const category    = mapEnum(CATEGORY_MAP, cell(COL.category), "BRAND") as string;
    const status      = mapEnum(STATUS_MAP, cell(COL.status), "PLANNED") as string;
    const platforms   = parsePlatforms(cell(COL.platforms));
    const plannedDate = parseDate(rawDate as string | number);
    if (!plannedDate) { results.push({ row, title, status: "skipped", reason: `Invalid date: "${rawDate}"` }); continue; }

    const assigneeName = cell(COL.assignee);
    const assigneeUser = assigneeName ? userByName(assigneeName) : null;

    try {
      await (db.contentCalendarItem as any).create({
        data: {
          vertical,
          contentType,
          category,
          title,
          status,
          platforms: platforms.length ? platforms : ["INSTAGRAM"],
          plannedDate,
          hook:        cell(COL.hook)  || null,
          assignedToId: assigneeUser?.id ?? null,
          // series lookup skipped for now — series field stored in notes if present
          topic:       [cell(COL.series), cell(COL.notes)].filter(Boolean).join(" | ") || null,
        },
      });
      results.push({ row, title, status: "created" });
    } catch (err: any) {
      results.push({ row, title, status: "error", reason: err.message });
    }
  }

  const created = results.filter(r => r.status === "created").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  const errors  = results.filter(r => r.status === "error").length;

  return NextResponse.json({ summary: { total: dataRows.length, created, skipped, errors }, results });
}
