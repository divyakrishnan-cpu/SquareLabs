"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card }   from "@/components/ui/Card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Star, TrendingUp, MapPin, Minus, Globe, X, Pencil, Plus,
  ExternalLink, RefreshCw, ChevronUp, ChevronDown,
  Building2, Search, AlertTriangle, CheckCircle2,
  Database, Copy, Check, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const BUSINESS_OPTIONS  = ["Square Yards", "Interior Company", "Urban Money", "Azuro", "PropVR", "Square Connect"];
const COUNTRY_OPTIONS   = ["India", "UAE", "GCC", "Qatar", "Australia", "Canada", "Singapore", "UK", "Bahrain"];
const HANDLED_BY_OPTIONS = ["Agency", "Internal"];

const PERIODS = [
  { label: "Latest",   value: "latest"  },
  { label: "Mar 2026", value: "2026-03" },
  { label: "Feb 2026", value: "2026-02" },
  { label: "Jan 2026", value: "2026-01" },
  { label: "Dec 2025", value: "2025-12" },
  { label: "Nov 2025", value: "2025-11" },
  { label: "Oct 2025", value: "2025-10" },
];

// ── Portal ratings data ────────────────────────────────────────────────────
// history: most-recent month first (index 0 = latest)
// Each entry covers one calendar month.
// To update: prepend a new object and remove the oldest (keep 12 entries).

interface PortalMonthEntry {
  month:   string;        // "YYYY-MM"
  rating:  number | null;
  reviews: number | null;
}
interface PortalEntry {
  brand:      string;
  profileUrl: string;
  history:    PortalMonthEntry[]; // index 0 = latest month
}
interface PortalRating {
  platform:  string;
  color:     string;
  textColor: string;
  url:       string;
  entries:   PortalEntry[];
}

// Month label helper
function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
}

const PORTAL_DATA: PortalRating[] = [
  {
    platform: "Glassdoor", color: "bg-emerald-100", textColor: "text-emerald-700",
    url: "https://www.glassdoor.co.in",
    entries: [
      {
        brand: "Square Yards", profileUrl: "https://www.glassdoor.co.in/Reviews/Square-Yards-Reviews-E1234567.htm",
        history: [
          { month: "2026-03", rating: 3.9, reviews: 1820 },
          { month: "2026-02", rating: 3.8, reviews: 1780 },
          { month: "2026-01", rating: 3.8, reviews: 1745 },
          { month: "2025-12", rating: 3.7, reviews: 1700 },
          { month: "2025-11", rating: 3.7, reviews: 1660 },
          { month: "2025-10", rating: 3.6, reviews: 1620 },
          { month: "2025-09", rating: 3.6, reviews: 1580 },
          { month: "2025-08", rating: 3.5, reviews: 1540 },
          { month: "2025-07", rating: 3.5, reviews: 1500 },
          { month: "2025-06", rating: 3.4, reviews: 1460 },
          { month: "2025-05", rating: 3.4, reviews: 1420 },
          { month: "2025-04", rating: 3.3, reviews: 1380 },
        ],
      },
      {
        brand: "Interior Company", profileUrl: "https://www.glassdoor.co.in/Reviews/Interior-Company-Reviews-E9876543.htm",
        history: [
          { month: "2026-03", rating: 3.7, reviews: 210 },
          { month: "2026-02", rating: 3.7, reviews: 205 },
          { month: "2026-01", rating: 3.6, reviews: 198 },
          { month: "2025-12", rating: 3.6, reviews: 190 },
          { month: "2025-11", rating: 3.5, reviews: 183 },
          { month: "2025-10", rating: 3.5, reviews: 175 },
          { month: "2025-09", rating: 3.4, reviews: 168 },
          { month: "2025-08", rating: 3.4, reviews: 160 },
          { month: "2025-07", rating: 3.3, reviews: 152 },
          { month: "2025-06", rating: 3.3, reviews: 145 },
          { month: "2025-05", rating: 3.2, reviews: 138 },
          { month: "2025-04", rating: 3.2, reviews: 130 },
        ],
      },
      {
        brand: "Urban Money", profileUrl: "https://www.glassdoor.co.in/Reviews/Urban-Money-Reviews-E3456789.htm",
        history: [
          { month: "2026-03", rating: 3.8, reviews: 340 },
          { month: "2026-02", rating: 3.6, reviews: 325 },
          { month: "2026-01", rating: 3.6, reviews: 310 },
          { month: "2025-12", rating: 3.5, reviews: 295 },
          { month: "2025-11", rating: 3.5, reviews: 280 },
          { month: "2025-10", rating: 3.4, reviews: 265 },
          { month: "2025-09", rating: 3.4, reviews: 250 },
          { month: "2025-08", rating: 3.3, reviews: 235 },
          { month: "2025-07", rating: 3.3, reviews: 220 },
          { month: "2025-06", rating: 3.2, reviews: 205 },
          { month: "2025-05", rating: 3.2, reviews: 190 },
          { month: "2025-04", rating: 3.1, reviews: 175 },
        ],
      },
    ],
  },
  {
    platform: "Ambition Box", color: "bg-orange-100", textColor: "text-orange-700",
    url: "https://www.ambitionbox.com",
    entries: [
      {
        brand: "Square Yards", profileUrl: "https://www.ambitionbox.com/reviews/square-yards-reviews",
        history: [
          { month: "2026-03", rating: 3.8, reviews: 2540 },
          { month: "2026-02", rating: 3.7, reviews: 2480 },
          { month: "2026-01", rating: 3.7, reviews: 2410 },
          { month: "2025-12", rating: 3.6, reviews: 2340 },
          { month: "2025-11", rating: 3.6, reviews: 2270 },
          { month: "2025-10", rating: 3.5, reviews: 2200 },
          { month: "2025-09", rating: 3.5, reviews: 2130 },
          { month: "2025-08", rating: 3.4, reviews: 2060 },
          { month: "2025-07", rating: 3.4, reviews: 1990 },
          { month: "2025-06", rating: 3.3, reviews: 1920 },
          { month: "2025-05", rating: 3.3, reviews: 1850 },
          { month: "2025-04", rating: 3.2, reviews: 1780 },
        ],
      },
      {
        brand: "Interior Company", profileUrl: "https://www.ambitionbox.com/reviews/interior-company-reviews",
        history: [
          { month: "2026-03", rating: 3.6, reviews: 185 },
          { month: "2026-02", rating: 3.6, reviews: 178 },
          { month: "2026-01", rating: 3.5, reviews: 170 },
          { month: "2025-12", rating: 3.5, reviews: 163 },
          { month: "2025-11", rating: 3.4, reviews: 155 },
          { month: "2025-10", rating: 3.4, reviews: 148 },
          { month: "2025-09", rating: 3.3, reviews: 140 },
          { month: "2025-08", rating: 3.3, reviews: 133 },
          { month: "2025-07", rating: 3.2, reviews: 125 },
          { month: "2025-06", rating: 3.2, reviews: 118 },
          { month: "2025-05", rating: 3.1, reviews: 110 },
          { month: "2025-04", rating: 3.1, reviews: 103 },
        ],
      },
      {
        brand: "Urban Money", profileUrl: "https://www.ambitionbox.com/reviews/urban-money-reviews",
        history: [
          { month: "2026-03", rating: 3.9, reviews: 410 },
          { month: "2026-02", rating: 3.8, reviews: 390 },
          { month: "2026-01", rating: 3.8, reviews: 370 },
          { month: "2025-12", rating: 3.7, reviews: 350 },
          { month: "2025-11", rating: 3.7, reviews: 330 },
          { month: "2025-10", rating: 3.6, reviews: 310 },
          { month: "2025-09", rating: 3.6, reviews: 290 },
          { month: "2025-08", rating: 3.5, reviews: 270 },
          { month: "2025-07", rating: 3.5, reviews: 250 },
          { month: "2025-06", rating: 3.4, reviews: 230 },
          { month: "2025-05", rating: 3.4, reviews: 210 },
          { month: "2025-04", rating: 3.3, reviews: 190 },
        ],
      },
    ],
  },
  {
    platform: "Trustpilot", color: "bg-green-100", textColor: "text-green-700",
    url: "https://www.trustpilot.com",
    entries: [
      {
        brand: "Square Yards", profileUrl: "https://www.trustpilot.com/review/squareyards.com",
        history: [
          { month: "2026-03", rating: 4.1, reviews: 520 },
          { month: "2026-02", rating: 4.0, reviews: 505 },
          { month: "2026-01", rating: 4.0, reviews: 490 },
          { month: "2025-12", rating: 3.9, reviews: 475 },
          { month: "2025-11", rating: 3.9, reviews: 460 },
          { month: "2025-10", rating: 3.8, reviews: 445 },
          { month: "2025-09", rating: 3.8, reviews: 430 },
          { month: "2025-08", rating: 3.7, reviews: 415 },
          { month: "2025-07", rating: 3.7, reviews: 400 },
          { month: "2025-06", rating: 3.6, reviews: 385 },
          { month: "2025-05", rating: 3.6, reviews: 370 },
          { month: "2025-04", rating: 3.5, reviews: 355 },
        ],
      },
      {
        brand: "Interior Company", profileUrl: "https://www.trustpilot.com",
        history: [
          { month: "2026-03", rating: null, reviews: null },
          { month: "2026-02", rating: null, reviews: null },
          { month: "2026-01", rating: null, reviews: null },
          { month: "2025-12", rating: null, reviews: null },
          { month: "2025-11", rating: null, reviews: null },
          { month: "2025-10", rating: null, reviews: null },
          { month: "2025-09", rating: null, reviews: null },
          { month: "2025-08", rating: null, reviews: null },
          { month: "2025-07", rating: null, reviews: null },
          { month: "2025-06", rating: null, reviews: null },
          { month: "2025-05", rating: null, reviews: null },
          { month: "2025-04", rating: null, reviews: null },
        ],
      },
      {
        brand: "Urban Money", profileUrl: "https://www.trustpilot.com",
        history: [
          { month: "2026-03", rating: null, reviews: null },
          { month: "2026-02", rating: null, reviews: null },
          { month: "2026-01", rating: null, reviews: null },
          { month: "2025-12", rating: null, reviews: null },
          { month: "2025-11", rating: null, reviews: null },
          { month: "2025-10", rating: null, reviews: null },
          { month: "2025-09", rating: null, reviews: null },
          { month: "2025-08", rating: null, reviews: null },
          { month: "2025-07", rating: null, reviews: null },
          { month: "2025-06", rating: null, reviews: null },
          { month: "2025-05", rating: null, reviews: null },
          { month: "2025-04", rating: null, reviews: null },
        ],
      },
    ],
  },
  {
    platform: "MouthShut", color: "bg-rose-100", textColor: "text-rose-700",
    url: "https://www.mouthshut.com",
    entries: [
      {
        brand: "Square Yards", profileUrl: "https://www.mouthshut.com/review/squareyards",
        history: [
          { month: "2026-03", rating: 3.5, reviews: 290 },
          { month: "2026-02", rating: 3.5, reviews: 283 },
          { month: "2026-01", rating: 3.4, reviews: 276 },
          { month: "2025-12", rating: 3.4, reviews: 268 },
          { month: "2025-11", rating: 3.3, reviews: 261 },
          { month: "2025-10", rating: 3.3, reviews: 253 },
          { month: "2025-09", rating: 3.2, reviews: 246 },
          { month: "2025-08", rating: 3.2, reviews: 238 },
          { month: "2025-07", rating: 3.1, reviews: 230 },
          { month: "2025-06", rating: 3.1, reviews: 223 },
          { month: "2025-05", rating: 3.0, reviews: 215 },
          { month: "2025-04", rating: 3.0, reviews: 208 },
        ],
      },
      {
        brand: "Interior Company", profileUrl: "https://www.mouthshut.com",
        history: [
          { month: "2026-03", rating: null, reviews: null },
          { month: "2026-02", rating: null, reviews: null },
          { month: "2026-01", rating: null, reviews: null },
          { month: "2025-12", rating: null, reviews: null },
          { month: "2025-11", rating: null, reviews: null },
          { month: "2025-10", rating: null, reviews: null },
          { month: "2025-09", rating: null, reviews: null },
          { month: "2025-08", rating: null, reviews: null },
          { month: "2025-07", rating: null, reviews: null },
          { month: "2025-06", rating: null, reviews: null },
          { month: "2025-05", rating: null, reviews: null },
          { month: "2025-04", rating: null, reviews: null },
        ],
      },
      {
        brand: "Urban Money", profileUrl: "https://www.mouthshut.com/review/urbanmoney",
        history: [
          { month: "2026-03", rating: 3.6, reviews: 88 },
          { month: "2026-02", rating: 3.4, reviews: 84 },
          { month: "2026-01", rating: 3.4, reviews: 80 },
          { month: "2025-12", rating: 3.3, reviews: 76 },
          { month: "2025-11", rating: 3.3, reviews: 72 },
          { month: "2025-10", rating: 3.2, reviews: 68 },
          { month: "2025-09", rating: 3.2, reviews: 64 },
          { month: "2025-08", rating: 3.1, reviews: 60 },
          { month: "2025-07", rating: 3.1, reviews: 56 },
          { month: "2025-06", rating: 3.0, reviews: 52 },
          { month: "2025-05", rating: 3.0, reviews: 48 },
          { month: "2025-04", rating: 2.9, reviews: 44 },
        ],
      },
    ],
  },
];

// ── Types ──────────────────────────────────────────────────────────────────

interface HistoryPoint {
  weekStart:   string;
  rating:      number | null;
  reviewCount: number | null;
  newReviews:  number | null;
  ratingDelta: number | null;
}

interface GmbLocation {
  id:             string;
  business:       string;
  city:           string;
  country:        string;
  name:           string;
  address:        string;
  gmbUrl:         string;
  mapsUrl:        string | null;
  displayLabel:   string | null;
  handledBy:      string | null;
  status:         "active" | "permanently_closed";
  currentRating:  number | null;
  currentReviews: number | null;
  newReviews:     number | null;
  ratingDelta:    number | null;
  prevRating:     number | null;
  lastUpdated:    string | null;
  history:        HistoryPoint[];
}

interface GmbData {
  locations: GmbLocation[];
}

// ── Period helper ──────────────────────────────────────────────────────────

function getPeriodData(loc: GmbLocation, period: string) {
  if (period === "latest") {
    return { rating: loc.currentRating, prevRating: loc.prevRating, delta: loc.ratingDelta };
  }
  const [yr, mo] = period.split("-").map(Number);
  const matches  = loc.history.filter(h => {
    const d = new Date(h.weekStart);
    return d.getUTCFullYear() === yr && d.getUTCMonth() + 1 === mo && h.rating !== null;
  });
  if (!matches.length) return { rating: null, prevRating: null, delta: null };
  const s    = matches[matches.length - 1];
  const prev = s.ratingDelta !== null && s.rating !== null
    ? +((s.rating - s.ratingDelta).toFixed(1))
    : null;
  return { rating: s.rating, prevRating: prev, delta: s.ratingDelta };
}

// ── Formatting helpers ─────────────────────────────────────────────────────

function fmtRating(r: number | null) { return r !== null ? r.toFixed(1) : "—"; }

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Small display components ───────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-gray-300">—</span>;
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-green-600 font-semibold text-xs">
      <ChevronUp size={12}/> +{delta.toFixed(1)}
    </span>
  );
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-red-500 font-semibold text-xs">
      <ChevronDown size={12}/> {delta.toFixed(1)}
    </span>
  );
  return <span className="inline-flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={10}/> 0.0</span>;
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-gray-300 text-xs">No data</span>;
  const color = rating >= 4.3 ? "text-green-600" : rating >= 4.0 ? "text-amber-500" : "text-red-500";
  return (
    <span className={cn("flex items-center gap-1 font-bold text-sm", color)}>
      <Star size={13} fill="currentColor"/> {rating.toFixed(1)}
    </span>
  );
}

const BUSINESS_COLORS: Record<string, string> = {
  "Square Yards":    "bg-blue-100 text-blue-700",
  "Interior Company":"bg-purple-100 text-purple-700",
  "Urban Money":     "bg-emerald-100 text-emerald-700",
  "Square Connect":  "bg-orange-100 text-orange-700",
  "PropVR":          "bg-rose-100 text-rose-700",
  "Azuro":           "bg-cyan-100 text-cyan-700",
};

function BusinessTag({ biz }: { biz: string }) {
  const cls = BUSINESS_COLORS[biz] ?? "bg-gray-100 text-gray-600";
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", cls)}>{biz}</span>;
}

function Sparkline({ data }: { data: HistoryPoint[] }) {
  const pts = data.filter(d => d.rating !== null).map(d => ({ w: fmtDate(d.weekStart), r: d.rating as number }));
  if (pts.length < 2) return <span className="text-[10px] text-gray-300">No trend</span>;
  const min = Math.min(...pts.map(p => p.r)) - 0.2;
  const max = Math.max(...pts.map(p => p.r)) + 0.2;
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={pts}>
        <Line type="monotone" dataKey="r" stroke="#6366f1" strokeWidth={1.5} dot={false}/>
        <YAxis domain={[min, max]} hide/>
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── WhatsApp report ────────────────────────────────────────────────────────

function getReportGroup(loc: GmbLocation): string {
  if (loc.business === "Square Yards" && loc.country === "India") return "Square Yards India";
  if (loc.business === "Square Yards") return "International";
  if (loc.business === "Interior Company") return "INCO";
  return loc.business;
}

const GROUP_ORDER = ["Square Yards India", "International", "AZURO", "Urban Money", "INCO", "PropVR", "Square Connect"];

function buildWhatsAppReport(locations: GmbLocation[]): string {
  const today   = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const lines: string[] = [`Reviews And Ratings Report - ${dateStr}`, ""];

  const byGroup: Record<string, GmbLocation[]> = {};
  for (const loc of locations) {
    if (loc.status !== "active")    continue;
    if (loc.currentRating === null) continue;       // skip if no rating at all
    const grp = getReportGroup(loc);
    (byGroup[grp] ??= []).push(loc);
  }
  for (const grp of Object.keys(byGroup)) {
    byGroup[grp].sort((a, b) => (b.currentRating ?? 0) - (a.currentRating ?? 0));
  }

  const allGroups = [...GROUP_ORDER, ...Object.keys(byGroup).filter(g => !GROUP_ORDER.includes(g))];
  for (const grp of allGroups) {
    const locs = byGroup[grp];
    if (!locs?.length) continue;
    lines.push(grp);
    for (const loc of locs) {
      const label = loc.displayLabel ?? loc.city;
      const curr  = loc.currentRating!.toFixed(1);
      const prev  = loc.prevRating !== null ? loc.prevRating.toFixed(1) : curr;
      lines.push(`${label}- ${curr}⭐️(${prev})`);
      if (loc.mapsUrl) lines.push(loc.mapsUrl);   // link only if available
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

// ── Modal shell ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
            <X size={15}/>
          </button>
        </div>
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

const inputCls  = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";
const labelCls  = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1";

// ── Shared GMB form fields ─────────────────────────────────────────────────

interface GmbFormData {
  business:     string;
  city:         string;
  country:      string;
  name:         string;
  address:      string;
  gmbUrl:       string;
  mapsUrl:      string;
  displayLabel: string;
  handledBy:    string;
  status:       "active" | "permanently_closed";
  currentRating: string;
}

const DEFAULT_FORM: GmbFormData = {
  business: "Square Yards", city: "", country: "India",
  name: "", address: "", gmbUrl: "", mapsUrl: "",
  displayLabel: "", handledBy: "Agency",
  status: "active", currentRating: "",
};

function GmbFormFields({ form, onChange }: { form: GmbFormData; onChange: (f: GmbFormData) => void }) {
  const set = (k: keyof GmbFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Business *</label>
          <select className={inputCls} value={form.business} onChange={set("business")}>
            {BUSINESS_OPTIONS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="permanently_closed">Permanently Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>City *</label>
          <input className={inputCls} value={form.city} onChange={set("city")} placeholder="Mumbai"/>
        </div>
        <div>
          <label className={labelCls}>Country *</label>
          <select className={inputCls} value={form.country} onChange={set("country")}>
            {COUNTRY_OPTIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Location Name *</label>
        <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Square Yards - Mumbai"/>
      </div>

      <div>
        <label className={labelCls}>Address</label>
        <textarea
          className={cn(inputCls, "resize-none")} rows={2}
          value={form.address} onChange={set("address")} placeholder="Full address"
        />
      </div>

      <div>
        <label className={labelCls}>GMB URL *</label>
        <input className={inputCls} value={form.gmbUrl} onChange={set("gmbUrl")} placeholder="https://business.google.com/n/..."/>
      </div>

      <div>
        <label className={labelCls}>Maps Short Link</label>
        <input className={inputCls} value={form.mapsUrl} onChange={set("mapsUrl")} placeholder="https://maps.app.goo.gl/..."/>
        <p className="text-[10px] text-gray-400 mt-0.5">Used in WhatsApp reports</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Display Label</label>
          <input className={inputCls} value={form.displayLabel} onChange={set("displayLabel")} placeholder="Mumbai (Andheri East)"/>
        </div>
        <div>
          <label className={labelCls}>Handled By</label>
          <select className={inputCls} value={form.handledBy} onChange={set("handledBy")}>
            <option value="">—</option>
            {HANDLED_BY_OPTIONS.map(h => <option key={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Current Rating (this week)</label>
        <input
          className={inputCls} type="number" min="1" max="5" step="0.1"
          value={form.currentRating} onChange={set("currentRating")} placeholder="4.2"
        />
        <p className="text-[10px] text-gray-400 mt-0.5">Stored as this week's snapshot — update here weekly to track changes</p>
      </div>
    </>
  );
}

// ── Add GMB modal ──────────────────────────────────────────────────────────

function AddGmbModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form,   setForm]   = useState<GmbFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSave() {
    if (!form.business || !form.city || !form.country || !form.name || !form.gmbUrl) {
      setError("Fill in all required (*) fields."); return;
    }
    setSaving(true); setError(null);
    try {
      const res  = await fetch("/api/orm/gmb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          mapsUrl:       form.mapsUrl      || null,
          displayLabel:  form.displayLabel || null,
          handledBy:     form.handledBy    || null,
          currentRating: form.currentRating ? parseFloat(form.currentRating) : null,
        }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      onSaved();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Add New GMB Location" onClose={onClose}>
      <GmbFormFields form={form} onChange={setForm}/>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave} disabled={saving}
          className="flex-1 bg-indigo-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add Location"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg py-2 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ── Edit GMB modal ─────────────────────────────────────────────────────────

function EditGmbModal({ loc, onClose, onSaved }: { loc: GmbLocation; onClose: () => void; onSaved: () => void }) {
  const [form,   setForm]   = useState<GmbFormData>({
    business:     loc.business,
    city:         loc.city,
    country:      loc.country,
    name:         loc.name,
    address:      loc.address,
    gmbUrl:       loc.gmbUrl,
    mapsUrl:      loc.mapsUrl      ?? "",
    displayLabel: loc.displayLabel ?? "",
    handledBy:    loc.handledBy    ?? "",
    status:       loc.status,
    currentRating: loc.currentRating !== null ? String(loc.currentRating) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      const res  = await fetch(`/api/orm/gmb/${loc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          mapsUrl:       form.mapsUrl      || null,
          displayLabel:  form.displayLabel || null,
          handledBy:     form.handledBy    || null,
          currentRating: form.currentRating ? parseFloat(form.currentRating) : null,
        }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      onSaved();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Edit — ${loc.name}`} onClose={onClose}>
      <GmbFormFields form={form} onChange={setForm}/>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave} disabled={saving}
          className="flex-1 bg-indigo-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg py-2 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ── Portals tab ────────────────────────────────────────────────────────────

function MiniSparkline({ history }: { history: PortalMonthEntry[] }) {
  const pts = [...history].reverse().filter(h => h.rating !== null).map(h => ({ v: h.rating as number }));
  if (pts.length < 2) return <span className="text-[10px] text-gray-300">—</span>;
  const min = Math.min(...pts.map(p => p.v)) - 0.1;
  const max = Math.max(...pts.map(p => p.v)) + 0.1;
  return (
    <ResponsiveContainer width={80} height={24}>
      <LineChart data={pts}>
        <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={1.5} dot={false}/>
        <YAxis domain={[min, max]} hide/>
      </LineChart>
    </ResponsiveContainer>
  );
}

function PortalsTab({ bizFilter }: { bizFilter: string }) {
  const [momPortal, setMomPortal] = useState<PortalRating | null>(null);

  const shown = PORTAL_DATA
    .map(p => ({ ...p, entries: p.entries.filter(e => bizFilter === "All" || e.brand === bizFilter) }))
    .filter(p => p.entries.length > 0);

  // Delta helper
  function delta(entry: PortalEntry) {
    const cur  = entry.history[0]?.rating  ?? null;
    const prev = entry.history[1]?.rating  ?? null;
    if (cur === null || prev === null) return null;
    return Math.round((cur - prev) * 10) / 10;
  }

  return (
    <div className="mt-5 space-y-6">
      {shown.map(portal => (
        <Card key={portal.platform} className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2.5">
              <Globe size={14} className="text-gray-400"/>
              <span className="font-semibold text-gray-800 text-sm">{portal.platform}</span>
              <a href={portal.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5">
                <ExternalLink size={10}/> visit
              </a>
            </div>
            <button
              onClick={() => setMomPortal(portal)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[11px] font-semibold transition-colors"
            >
              <TrendingUp size={12}/> MoM View
            </button>
          </div>

          {/* Comparison table: current vs prev month */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="text-left px-5 py-2.5 text-gray-400 font-semibold">Brand</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-semibold">
                    {portal.entries[0]?.history[0] ? monthLabel(portal.entries[0].history[0].month) : "Current"}
                  </th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-semibold">
                    {portal.entries[0]?.history[1] ? monthLabel(portal.entries[0].history[1].month) : "Prev"}
                  </th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-semibold">MoM Δ</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-semibold">Reviews</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-semibold">Trend</th>
                  <th className="px-5 py-2.5 w-8"/>
                </tr>
              </thead>
              <tbody>
                {portal.entries.map(entry => {
                  const cur   = entry.history[0]?.rating  ?? null;
                  const prev  = entry.history[1]?.rating  ?? null;
                  const revs  = entry.history[0]?.reviews ?? null;
                  const d     = delta(entry);
                  const rCol  = cur === null ? "text-gray-300" : cur >= 4.0 ? "text-green-600" : cur >= 3.5 ? "text-amber-500" : "text-red-500";
                  const pCol  = prev === null ? "text-gray-300" : prev >= 4.0 ? "text-green-600" : prev >= 3.5 ? "text-amber-500" : "text-red-500";
                  return (
                    <tr key={entry.brand} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-semibold text-gray-700">
                        <BusinessTag biz={entry.brand}/>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {cur !== null
                          ? <span className={cn("inline-flex items-center gap-1 font-bold", rCol)}>
                              <Star size={11} fill="currentColor"/> {cur.toFixed(1)}
                            </span>
                          : <span className="text-gray-300 text-[10px]">No profile</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {prev !== null
                          ? <span className={cn("inline-flex items-center gap-1 font-medium", pCol)}>
                              <Star size={10} fill="currentColor"/> {prev.toFixed(1)}
                            </span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {d === null ? <span className="text-gray-300">—</span>
                          : d > 0   ? <span className="inline-flex items-center gap-0.5 text-green-600 font-semibold"><ChevronUp size={11}/> +{d.toFixed(1)}</span>
                          : d < 0   ? <span className="inline-flex items-center gap-0.5 text-red-500 font-semibold"><ChevronDown size={11}/> {d.toFixed(1)}</span>
                          : <span className="inline-flex items-center gap-0.5 text-gray-400"><Minus size={9}/> 0.0</span>}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">
                        {revs !== null ? revs.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-3 flex justify-center items-center">
                        <MiniSparkline history={entry.history}/>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a href={entry.profileUrl} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-600"><ExternalLink size={11}/></a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <p className="text-[11px] text-gray-400 text-center pb-2">
        Portal ratings are manually updated. Edit <code className="bg-gray-100 px-1 rounded">PORTAL_DATA</code> in the page source to update values.
      </p>

      {/* ── MoM View Modal ── */}
      {momPortal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setMomPortal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn("px-2.5 py-1 rounded text-[11px] font-semibold", momPortal.color, momPortal.textColor)}>
                  {momPortal.platform}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Month-over-Month Ratings</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Last 12 months — {bizFilter === "All" ? "all brands" : bizFilter}</p>
                </div>
              </div>
              <button onClick={() => setMomPortal(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                <X size={15}/>
              </button>
            </div>

            {/* Pivot table: rows = brands, columns = months (newest left) */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 text-left px-5 py-3 text-gray-500 font-semibold border-b border-r border-gray-100 min-w-[140px]">
                      Brand
                    </th>
                    {momPortal.entries[0]?.history.map(h => (
                      <th key={h.month} className="bg-gray-50 text-center px-4 py-3 text-gray-500 font-semibold border-b border-gray-100 whitespace-nowrap min-w-[80px]">
                        {monthLabel(h.month)}
                      </th>
                    ))}
                    <th className="bg-gray-50 text-center px-4 py-3 text-gray-500 font-semibold border-b border-gray-100 whitespace-nowrap min-w-[90px]">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {momPortal.entries
                    .filter(e => bizFilter === "All" || e.brand === bizFilter)
                    .map((entry, ei) => {
                      return (
                        <tr key={entry.brand} className={cn(ei % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                          <td className={cn("sticky left-0 z-10 px-5 py-3.5 font-semibold text-gray-700 border-r border-gray-100 whitespace-nowrap", ei % 2 === 0 ? "bg-white" : "bg-gray-50/80")}>
                            <div className="flex items-center gap-2">
                              <BusinessTag biz={entry.brand}/>
                              <a href={entry.profileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-600">
                                <ExternalLink size={10}/>
                              </a>
                            </div>
                          </td>
                          {entry.history.map((h, hi) => {
                            const prev = entry.history[hi + 1]?.rating ?? null;
                            const d    = h.rating !== null && prev !== null ? Math.round((h.rating - prev) * 10) / 10 : null;
                            const rCol = h.rating === null ? "text-gray-300"
                              : h.rating >= 4.0 ? "text-green-600"
                              : h.rating >= 3.5 ? "text-amber-500" : "text-red-500";
                            const bg   = hi === 0 ? "bg-indigo-50/60" : "";
                            return (
                              <td key={h.month} className={cn("px-4 py-3.5 text-center align-middle", bg)}>
                                {h.rating !== null ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={cn("font-bold text-[13px]", rCol)}>{h.rating.toFixed(1)}</span>
                                    {d !== null && (
                                      <span className={cn("text-[10px] font-medium",
                                        d > 0 ? "text-green-500" : d < 0 ? "text-red-400" : "text-gray-400")}>
                                        {d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-200 text-lg">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex justify-center">
                              <MiniSparkline history={entry.history}/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-6 text-[10px] text-gray-400 flex-shrink-0">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-50/60 border border-indigo-100 inline-block"/> Current month</span>
              <span className="flex items-center gap-1"><span className="text-green-500 font-bold">+</span> MoM increase</span>
              <span className="flex items-center gap-1"><span className="text-red-400 font-bold">-</span> MoM decrease</span>
              <span className="ml-auto">Data manually updated monthly — edit PORTAL_DATA in source</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

type TabId = "gmb" | "portals";

export default function GmbDashboardPage() {
  // ── Data ──
  const [data,    setData]    = useState<GmbData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── UI state ──
  const [activeTab,  setActiveTab]  = useState<TabId>("gmb");
  const [copied,     setCopied]     = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [expanded,   setExpanded]   = useState<string | null>(null);

  // ── Modals ──
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [editLoc,        setEditLoc]        = useState<GmbLocation | null>(null);

  // ── Scrape state ──
  const [scraping,        setScraping]        = useState(false);
  const [scrapeResult,    setScrapeResult]    = useState<{
    message: string;
    found: number;
    total: number;
    results: { id: string; name: string; city: string; business: string; rating: number | null; reviewCount: number | null; source: string }[];
  } | null>(null);
  const [apiKeyError,     setApiKeyError]     = useState<string | null>(null);

  // ── Filters (global — affect both summary cards and table) ──
  const [bizFilter,     setBizFilter]     = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [period,        setPeriod]        = useState("latest");
  const [search,        setSearch]        = useState("");

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/orm/gmb?t=${Date.now()}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runSeed() {
    setSeeding(true);
    try {
      const res  = await fetch("/api/orm/seed-gmb", { method: "POST" });
      const json = await res.json();
      if (json.error) { alert(json.error); return; }
      alert(`✅ ${json.message}`);
      await load();
    } catch (e) { alert("Seed failed: " + String(e)); }
    finally { setSeeding(false); }
  }

  async function runScrape() {
    setScraping(true); setScrapeResult(null); setApiKeyError(null);
    try {
      const res  = await fetch("/api/orm/gmb/scrape-ratings", { method: "POST" });
      const json = await res.json();
      if (json.error === "missing_api_key") {
        setApiKeyError(json.message);
        return;
      }
      if (json.error) { alert(json.error); return; }
      setScrapeResult(json);
      await load();   // reload to show newly populated ratings
    } catch (e) { alert("Scrape failed: " + String(e)); }
    finally { setScraping(false); }
  }

  function copyReport() {
    if (!data) return;
    const text = buildWhatsAppReport(data.locations);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── Derived filter options ──
  const businesses = useMemo(
    () => ["All", ...Array.from(new Set((data?.locations ?? []).map(l => l.business))).sort()],
    [data]
  );
  const countries = useMemo(
    () => ["All", ...Array.from(new Set((data?.locations ?? []).map(l => l.country))).sort()],
    [data]
  );

  // ── Globally filtered locations (affect summary cards, chart, table) ──
  const globalFiltered = useMemo(() => {
    return (data?.locations ?? []).filter(l => {
      const matchBiz     = bizFilter     === "All" || l.business === bizFilter;
      const matchCountry = countryFilter === "All" || l.country  === countryFilter;
      return matchBiz && matchCountry;
    });
  }, [data, bizFilter, countryFilter]);

  // ── Table-only: also apply search ──
  const tableFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return globalFiltered.filter(l =>
      q === "" || [l.name, l.city, l.business, l.country].some(f => f?.toLowerCase().includes(q))
    );
  }, [globalFiltered, search]);

  // ── Summary stats: computed client-side from filtered locations + period ──
  const stats = useMemo(() => {
    const withData = globalFiltered
      .map(l => { const p = getPeriodData(l, period); return { ...l, pR: p.rating, pD: p.delta }; })
      .filter(l => l.pR !== null);
    const avg          = withData.length ? +(withData.reduce((s, l) => s + l.pR!, 0) / withData.length).toFixed(1) : null;
    const topGrowing   = [...withData].filter(l => (l.pD ?? 0) > 0).sort((a, b) => (b.pD ?? 0) - (a.pD ?? 0)).slice(0, 5);
    const needsAttn    = [...withData].filter(l => (l.pR ?? 5) < 4.0).sort((a, b) => (a.pR ?? 0) - (b.pR ?? 0));
    return { avg, topGrowing, needsAttn, tracked: withData.length, total: globalFiltered.length };
  }, [globalFiltered, period]);

  // ── Portfolio trend chart (using filtered locations) ──
  const chartData = useMemo(() => {
    const weekMap: Record<string, { total: number; n: number }> = {};
    for (const loc of globalFiltered) {
      for (const h of loc.history) {
        if (h.rating === null) continue;
        const k = h.weekStart.split("T")[0];
        weekMap[k] = weekMap[k] ? { total: weekMap[k].total + h.rating, n: weekMap[k].n + 1 } : { total: h.rating, n: 1 };
      }
    }
    return Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).map(([week, v]) => ({
      week: fmtDate(week), avg: +(v.total / v.n).toFixed(1), n: v.n,
    }));
  }, [globalFiltered]);

  // ── Shared select / input styles ──
  const selCls = "text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400";

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="ORM Ratings Dashboard"
        subtitle="Online Reputation Management — ratings across GMB and review portals"
      />

      {/* ── Global filter bar ── */}
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {/* Business */}
        <select value={bizFilter} onChange={e => setBizFilter(e.target.value)} className={selCls}>
          {businesses.map(b => <option key={b} value={b}>{b === "All" ? "All Businesses" : b}</option>)}
        </select>

        {/* Country */}
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className={selCls}>
          {countries.map(c => <option key={c} value={c}>{c === "All" ? "All Countries" : c}</option>)}
        </select>

        {/* Period */}
        <select value={period} onChange={e => setPeriod(e.target.value)} className={selCls}>
          {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {/* Search */}
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white min-w-40">
          <Search size={12} className="text-gray-400 shrink-0"/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search city, brand…"
            className="text-xs flex-1 outline-none bg-transparent placeholder-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""}/>
            Refresh
          </button>
          <button onClick={runSeed} disabled={seeding}
            className="flex items-center gap-1.5 text-xs border border-indigo-200 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50">
            <Database size={12} className={seeding ? "animate-pulse" : ""}/>
            {seeding ? "Syncing…" : "Re-sync Data"}
          </button>
          <button onClick={runScrape} disabled={scraping}
            className="flex items-center gap-1.5 text-xs border border-amber-200 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-50"
            title="Fetch missing ratings from Google Maps">
            <Zap size={12} className={scraping ? "animate-pulse" : ""}/>
            {scraping ? "Scraping Google…" : "Scrape Ratings"}
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium">
            <Plus size={12}/> Add GMB
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 mt-4 border-b border-gray-200">
        {([ { id: "gmb" as TabId, label: "📍 GMB" }, { id: "portals" as TabId, label: "🌐 Portals" } ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Portals tab ── */}
      {activeTab === "portals" && <PortalsTab bizFilter={bizFilter}/>}

      {/* ── GMB tab ── */}
      {activeTab === "gmb" && <>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="mt-6 grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"/>)}
          </div>
        )}

        {data && <>
          {/* ── Summary cards (reflect global filter + period) ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
            <Card className="p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{stats.tracked} with rating data</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Top Grower</p>
              {stats.topGrowing.length > 0 ? (
                <>
                  <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                    <TrendingUp size={13}/> +{stats.topGrowing[0].pD?.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{stats.topGrowing[0].name}</p>
                </>
              ) : <p className="text-sm text-gray-400">No change</p>}
            </Card>
            <Card className="p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Needs Attention</p>
              {stats.needsAttn.length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-red-500 flex items-center gap-1">
                    <AlertTriangle size={16}/> {stats.needsAttn.length}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Locations below 4.0 ★</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={16}/> 0</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">All ratings above 4.0 ★</p>
                </>
              )}
            </Card>
          </div>

          {/* ── Portfolio trend chart (filtered) ── */}
          {chartData.length >= 2 && (
            <Card className="mt-5 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Portfolio Avg Rating Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}/>
                  <YAxis domain={[3.0, 5.0]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(1)}/>
                  <Tooltip formatter={(v: number) => [v.toFixed(1) + " ★", "Avg Rating"]} contentStyle={{ fontSize: 11, borderRadius: 8 }}/>
                  <ReferenceLine y={4.0} stroke="#f97316" strokeDasharray="3 3" label={{ value: "4.0", fontSize: 9, fill: "#f97316" }}/>
                  <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* ── WhatsApp report button + inline panel ── */}
          <div className="mt-5 flex items-center gap-2">
            <button onClick={() => setShowReport(r => !r)}
              className={cn(
                "flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg",
                showReport ? "border-green-300 bg-green-100 text-green-800" : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              )}>
              💬 {showReport ? "Hide Report" : "WhatsApp Report"}
            </button>
          </div>
          {showReport && (
            <Card className="mt-3 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-green-50/50">
                <span className="text-sm font-semibold text-gray-700">💬 WhatsApp Report Preview</span>
                <button onClick={copyReport}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                    copied ? "bg-green-500 text-white" : "bg-white border border-green-200 text-green-700 hover:bg-green-50"
                  )}>
                  {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Click to copy</>}
                </button>
              </div>
              <div className="p-4 max-h-[420px] overflow-y-auto">
                <div className="bg-[#DCF8C6] rounded-xl p-4 text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed text-gray-800 shadow-sm">
                  {buildWhatsAppReport(data.locations)}
                </div>
              </div>
            </Card>
          )}

          {/* ── Top growing ── */}
          {stats.topGrowing.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-green-500"/> Top Growing Locations
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {stats.topGrowing.map(loc => (
                  <Card key={loc.id} className="p-3">
                    <BusinessTag biz={loc.business}/>
                    <p className="text-xs font-semibold text-gray-800 mt-1.5 leading-snug truncate">{loc.city}</p>
                    <div className="flex items-center justify-between mt-2">
                      <StarRating rating={loc.pR ?? null}/>
                      <DeltaBadge delta={loc.pD ?? null}/>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Needs attention ── */}
          {stats.needsAttn.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-red-400"/> Needs Attention (below 4.0 ★)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.needsAttn.map(loc => (
                  <Card key={loc.id} className="p-3 border-red-100 bg-red-50/30">
                    <BusinessTag biz={loc.business}/>
                    <p className="text-xs font-semibold text-gray-800 mt-1.5 leading-snug truncate">{loc.city}</p>
                    <div className="flex items-center justify-between mt-2">
                      <StarRating rating={loc.pR ?? null}/>
                      <DeltaBadge delta={loc.pD ?? null}/>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Location table ── */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Building2 size={12}/> All Locations ({tableFiltered.length})
            </p>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold w-8">#</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">Location</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">Handled By</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-semibold">Rating</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-semibold">WoW</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-semibold">New Reviews</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-semibold">Trend</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-semibold">Status</th>
                      <th className="px-4 py-3"/>
                    </tr>
                  </thead>
                  <tbody>
                    {tableFiltered.map((loc, i) => {
                      const pd         = getPeriodData(loc, period);
                      const isExpanded = expanded === loc.id;
                      const chartPts   = loc.history
                        .filter(h => h.rating !== null)
                        .map(h => ({ w: fmtDate(h.weekStart), r: h.rating as number }));

                      return (
                        <>
                          <tr key={loc.id}
                            className={cn(
                              "border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors",
                              loc.status === "permanently_closed" && "opacity-50",
                              isExpanded && "bg-indigo-50/30"
                            )}
                            onClick={() => setExpanded(isExpanded ? null : loc.id)}
                          >
                            <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-gray-800">{loc.name}</span>
                                <span className="text-gray-400">{loc.city}, {loc.country}</span>
                                <BusinessTag biz={loc.business}/>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{loc.handledBy ?? "—"}</td>
                            <td className="px-4 py-3 text-center">
                              <StarRating rating={pd.rating}/>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <DeltaBadge delta={pd.delta}/>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">
                              {loc.newReviews !== null ? `+${loc.newReviews}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Sparkline data={loc.history}/>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {loc.status === "active"
                                ? <span className="bg-green-100 text-green-700 text-[10px] font-medium px-1.5 py-0.5 rounded">Active</span>
                                : <span className="bg-gray-100 text-gray-500 text-[10px] font-medium px-1.5 py-0.5 rounded">Closed</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={e => { e.stopPropagation(); setEditLoc(loc); }}
                                  className="text-gray-400 hover:text-indigo-600 p-0.5 rounded hover:bg-indigo-50"
                                  title="Edit"
                                >
                                  <Pencil size={12}/>
                                </button>
                                <a
                                  href={loc.gmbUrl} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-indigo-500 hover:text-indigo-700"
                                >
                                  <ExternalLink size={11}/>
                                </a>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded row */}
                          {isExpanded && (
                            <tr key={`${loc.id}-exp`} className="bg-indigo-50/20 border-b border-indigo-100">
                              <td colSpan={9} className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase">Rating History</p>
                                    {chartPts.length >= 2 ? (
                                      <ResponsiveContainer width="100%" height={100}>
                                        <LineChart data={chartPts} margin={{ left: -5, right: 5 }}>
                                          <XAxis dataKey="w" tick={{ fontSize: 9 }} tickLine={false} axisLine={false}/>
                                          <YAxis domain={[3.0, 5.0]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(1)}/>
                                          <Tooltip formatter={(v: number) => [v.toFixed(1) + " ★", "Rating"]} contentStyle={{ fontSize: 10, borderRadius: 6 }}/>
                                          <ReferenceLine y={4.0} stroke="#f97316" strokeDasharray="3 3"/>
                                          <Line type="monotone" dataKey="r" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }}/>
                                        </LineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <p className="text-[10px] text-gray-400">Not enough history data</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Details</p>
                                    <div className="flex items-start gap-1.5">
                                      <MapPin size={11} className="text-gray-400 mt-0.5 shrink-0"/>
                                      <span className="text-[11px] text-gray-600">{loc.address}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-600 space-y-1">
                                      <div><span className="text-gray-400">Last updated:</span> {fmtDate(loc.lastUpdated)}</div>
                                      <div><span className="text-gray-400">Total reviews:</span> {loc.currentReviews ?? "—"}</div>
                                      <div><span className="text-gray-400">Prev rating:</span> {fmtRating(pd.prevRating)}</div>
                                      <div><span className="text-gray-400">Handled by:</span> {loc.handledBy ?? "—"}</div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <a href={loc.gmbUrl} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline">
                                        <ExternalLink size={10}/> Open GMB Profile
                                      </a>
                                      {loc.mapsUrl && (
                                        <a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[11px] text-green-600 hover:underline">
                                          <MapPin size={10}/> Google Maps
                                        </a>
                                      )}
                                    </div>
                                    <button
                                      onClick={e => { e.stopPropagation(); setEditLoc(loc); }}
                                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 mt-1"
                                    >
                                      <Pencil size={10}/> Edit / Update Rating
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>

                {tableFiltered.length === 0 && (
                  <div className="p-12 text-center">
                    <Building2 size={32} className="mx-auto text-gray-200 mb-3"/>
                    <p className="text-sm text-gray-400">No locations match your filters.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>}
      </>}

      {/* ── Modals ── */}
      {showAddModal && (
        <AddGmbModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); load(); }}
        />
      )}
      {editLoc && (
        <EditGmbModal
          loc={editLoc}
          onClose={() => setEditLoc(null)}
          onSaved={() => { setEditLoc(null); load(); }}
        />
      )}

      {/* ── API key missing modal ── */}
      {apiKeyError && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setApiKeyError(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-amber-600"/>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Google Places API Key Required</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">One-time setup needed to enable live rating scraping</p>
                </div>
              </div>
              <button onClick={() => setApiKeyError(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                <X size={15}/>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                The scraper uses the <strong>Google Places API</strong> to reliably fetch live ratings. To enable it:
              </p>
              <ol className="space-y-3 text-xs text-gray-700">
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                  <span>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">console.cloud.google.com</a> → select or create a project</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                  <span>Go to <strong>APIs &amp; Services → Library</strong> → search for <strong>Places API</strong> → Enable it</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                  <span>Go to <strong>APIs &amp; Services → Credentials</strong> → Create an API key</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">4</span>
                  <span>In Vercel, go to your project → <strong>Settings → Environment Variables</strong> → add:</span>
                </li>
              </ol>
              <div className="bg-gray-900 rounded-lg px-4 py-3 font-mono text-xs text-green-400 select-all">
                GOOGLE_PLACES_API_KEY=your_key_here
              </div>
              <p className="text-[11px] text-gray-400">After adding the key, redeploy your app and click &quot;Scrape Ratings&quot; again.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setApiKeyError(null)}
                className="px-4 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scrape results modal ── */}
      {scrapeResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setScrapeResult(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Scrape Results</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">{scrapeResult.message}</p>
              </div>
              <button onClick={() => setScrapeResult(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                <X size={15}/>
              </button>
            </div>

            {/* Summary bar */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-6 text-xs">
              <span className="text-green-700 font-semibold">✅ Found: {scrapeResult.found}</span>
              <span className="text-red-600 font-semibold">❌ Not found: {scrapeResult.total - scrapeResult.found}</span>
              <span className="text-gray-500">Total scanned: {scrapeResult.total}</span>
            </div>

            {/* Results table */}
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-gray-500 font-semibold">Location</th>
                    <th className="text-left px-5 py-2.5 text-gray-500 font-semibold">Business</th>
                    <th className="text-center px-5 py-2.5 text-gray-500 font-semibold">Rating</th>
                    <th className="text-center px-5 py-2.5 text-gray-500 font-semibold">Reviews</th>
                    <th className="text-center px-5 py-2.5 text-gray-500 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scrapeResult.results.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 font-medium text-gray-700">{r.name}</td>
                      <td className="px-5 py-2.5 text-gray-500">{r.business}</td>
                      <td className="px-5 py-2.5 text-center">
                        {r.rating !== null ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                            <Star size={11} fill="currentColor"/> {r.rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-center text-gray-500 text-[11px]">
                        {r.reviewCount != null ? r.reviewCount.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        {r.rating !== null ? (
                          <span className="bg-green-100 text-green-700 text-[10px] font-medium px-1.5 py-0.5 rounded">Saved ✓</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-[10px] font-medium px-1.5 py-0.5 rounded">Manual entry needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 text-[11px] text-gray-400">
              Ratings fetched via Google Places API. Locations not found can be updated manually via the ✏️ Edit button in the table.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
