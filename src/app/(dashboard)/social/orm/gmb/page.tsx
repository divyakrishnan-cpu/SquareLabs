"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card }   from "@/components/ui/Card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Star, TrendingUp, MapPin, Minus,
  ExternalLink, RefreshCw, ChevronUp, ChevronDown,
  Building2, Search, AlertTriangle, CheckCircle2,
  Database, Copy, Check, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Portal ratings data (static seed — update manually each week) ──────────

interface PortalRating {
  platform:    string;
  color:       string;       // Tailwind bg class for the badge
  textColor:   string;
  url:         string;
  entries: {
    brand:       string;
    rating:      number | null;
    reviews:     number | null;
    prevRating:  number | null;
    profileUrl:  string;
  }[];
}

const PORTAL_DATA: PortalRating[] = [
  {
    platform: "Glassdoor", color: "bg-emerald-100", textColor: "text-emerald-700",
    url: "https://www.glassdoor.co.in",
    entries: [
      { brand: "Square Yards",     rating: 3.9, reviews: 1820, prevRating: 3.8, profileUrl: "https://www.glassdoor.co.in/Reviews/Square-Yards-Reviews-E1234567.htm" },
      { brand: "Interior Company", rating: 3.7, reviews:  210, prevRating: 3.7, profileUrl: "https://www.glassdoor.co.in/Reviews/Interior-Company-Reviews-E9876543.htm" },
      { brand: "Urban Money",      rating: 3.8, reviews:  340, prevRating: 3.6, profileUrl: "https://www.glassdoor.co.in/Reviews/Urban-Money-Reviews-E3456789.htm" },
    ],
  },
  {
    platform: "Ambition Box", color: "bg-orange-100", textColor: "text-orange-700",
    url: "https://www.ambitionbox.com",
    entries: [
      { brand: "Square Yards",     rating: 3.8, reviews: 2540, prevRating: 3.7, profileUrl: "https://www.ambitionbox.com/reviews/square-yards-reviews" },
      { brand: "Interior Company", rating: 3.6, reviews:  185, prevRating: 3.6, profileUrl: "https://www.ambitionbox.com/reviews/interior-company-reviews" },
      { brand: "Urban Money",      rating: 3.9, reviews:  410, prevRating: 3.8, profileUrl: "https://www.ambitionbox.com/reviews/urban-money-reviews" },
    ],
  },
  {
    platform: "Trustpilot", color: "bg-green-100", textColor: "text-green-700",
    url: "https://www.trustpilot.com",
    entries: [
      { brand: "Square Yards",     rating: 4.1, reviews:  520, prevRating: 4.0, profileUrl: "https://www.trustpilot.com/review/squareyards.com" },
      { brand: "Interior Company", rating: null, reviews: null, prevRating: null, profileUrl: "https://www.trustpilot.com" },
      { brand: "Urban Money",      rating: null, reviews: null, prevRating: null, profileUrl: "https://www.trustpilot.com" },
    ],
  },
  {
    platform: "MouthShut", color: "bg-rose-100", textColor: "text-rose-700",
    url: "https://www.mouthshut.com",
    entries: [
      { brand: "Square Yards",     rating: 3.5, reviews:  290, prevRating: 3.5, profileUrl: "https://www.mouthshut.com/review/squareyards" },
      { brand: "Interior Company", rating: null, reviews: null, prevRating: null, profileUrl: "https://www.mouthshut.com" },
      { brand: "Urban Money",      rating: 3.6, reviews:   88, prevRating: 3.4, profileUrl: "https://www.mouthshut.com/review/urbanmoney" },
    ],
  },
];

// ── Portals Tab Component ───────────────────────────────────────────────────

function PortalsTab() {
  const allBrands = Array.from(new Set(PORTAL_DATA.flatMap(p => p.entries.map(e => e.brand))));

  return (
    <div className="mt-5 space-y-6">
      {/* Platform cards */}
      {PORTAL_DATA.map(portal => (
        <Card key={portal.platform} className="overflow-hidden">
          {/* Platform header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2.5">
              <Globe size={14} className="text-gray-400"/>
              <span className="font-semibold text-gray-800 text-sm">{portal.platform}</span>
              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5"
              >
                <ExternalLink size={10}/> visit
              </a>
            </div>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", portal.color, portal.textColor)}>
              {portal.platform}
            </span>
          </div>

          {/* Ratings table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="text-left px-5 py-2.5 text-gray-400 font-semibold">Brand</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-semibold">Rating</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-semibold">WoW</th>
                  <th className="text-center px-5 py-2.5 text-gray-400 font-semibold">Total Reviews</th>
                  <th className="px-5 py-2.5"/>
                </tr>
              </thead>
              <tbody>
                {portal.entries.map(entry => {
                  const delta = entry.rating !== null && entry.prevRating !== null
                    ? Math.round((entry.rating - entry.prevRating) * 10) / 10
                    : null;
                  const ratingColor = entry.rating === null ? "text-gray-300"
                    : entry.rating >= 4.0 ? "text-green-600"
                    : entry.rating >= 3.5 ? "text-amber-500"
                    : "text-red-500";

                  return (
                    <tr key={entry.brand} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-semibold text-gray-700">{entry.brand}</td>
                      <td className="px-5 py-3 text-center">
                        {entry.rating !== null ? (
                          <span className={cn("flex items-center justify-center gap-1 font-bold", ratingColor)}>
                            <Star size={11} fill="currentColor"/> {entry.rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-[10px]">No profile</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {delta === null ? (
                          <span className="text-gray-300">—</span>
                        ) : delta > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-green-600 font-semibold">
                            <ChevronUp size={11}/> +{delta.toFixed(1)}
                          </span>
                        ) : delta < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-red-500 font-semibold">
                            <ChevronDown size={11}/> {delta.toFixed(1)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-gray-400">
                            <Minus size={9}/> 0.0
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">
                        {entry.reviews !== null ? entry.reviews.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a
                          href={entry.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-600"
                        >
                          <ExternalLink size={11}/>
                        </a>
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
    </div>
  );
}

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

interface Summary {
  total:           number;
  tracked:         number;
  avgRating:       number | null;
  topGrowing:      GmbLocation[];
  needsAttention:  GmbLocation[];
}

interface GmbData {
  locations: GmbLocation[];
  summary:   Summary;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtRating(r: number | null) {
  return r !== null ? r.toFixed(1) : "—";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

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
  if (rating === null) return <span className="text-gray-300 text-sm">No data</span>;
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

// ── WhatsApp report generator ──────────────────────────────────────────────

function getReportGroup(loc: GmbLocation): string {
  if (loc.business === "Square Yards" && loc.country === "India") return "Square Yards India";
  if (loc.business === "Square Yards") return "International";
  if (loc.business === "Interior Company") return "INCO";
  return loc.business; // Azuro, Urban Money, etc.
}

const GROUP_ORDER = ["Square Yards India", "International", "AZURO", "Urban Money", "INCO", "PropVR", "Square Connect"];

function buildWhatsAppReport(locations: GmbLocation[]): string {
  const today    = new Date();
  const dateStr  = today.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const lines: string[] = [];
  lines.push(`Reviews And Ratings Report - ${dateStr}`);
  lines.push("");

  // Group active locations that have a rating and a mapsUrl
  const byGroup: Record<string, GmbLocation[]> = {};
  for (const loc of locations) {
    if (loc.status !== "active")    continue;
    if (loc.currentRating === null) continue;
    if (!loc.mapsUrl)               continue;
    const grp = getReportGroup(loc);
    if (!byGroup[grp]) byGroup[grp] = [];
    byGroup[grp].push(loc);
  }

  // Sort within each group by rating desc
  for (const grp of Object.keys(byGroup)) {
    byGroup[grp].sort((a, b) => (b.currentRating ?? 0) - (a.currentRating ?? 0));
  }

  // Emit groups in defined order, then any extras
  const allGroups = [...GROUP_ORDER, ...Object.keys(byGroup).filter(g => !GROUP_ORDER.includes(g))];

  for (const grp of allGroups) {
    const locs = byGroup[grp];
    if (!locs || locs.length === 0) continue;

    lines.push(grp);
    for (const loc of locs) {
      const label   = loc.displayLabel ?? loc.city;
      const curr    = loc.currentRating!.toFixed(1);
      const prev    = loc.prevRating !== null ? loc.prevRating.toFixed(1) : curr;
      lines.push(`${label}- ${curr}⭐️(${prev})`);
      lines.push(loc.mapsUrl!);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

// Mini sparkline for a location
function Sparkline({ data }: { data: HistoryPoint[] }) {
  const pts = data.filter(d => d.rating !== null).map(d => ({
    w: fmtDate(d.weekStart), r: d.rating as number,
  }));
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

// ── Main Component ─────────────────────────────────────────────────────────

const ALL_BUSINESSES = "All Businesses";

type TabId = "gmb" | "portals";

export default function GmbDashboardPage() {
  const [activeTab,  setActiveTab]  = useState<TabId>("gmb");
  const [data,       setData]       = useState<GmbData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [seeding,    setSeeding]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [search,     setSearch]     = useState("");
  const [bizFilter,  setBizFilter]  = useState(ALL_BUSINESSES);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/orm/gmb?t=${Date.now()}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
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
    } catch (e) {
      alert("Seed failed: " + String(e));
    } finally {
      setSeeding(false);
    }
  }

  function copyReport() {
    if (!data) return;
    const text = buildWhatsAppReport(data.locations);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── Filter ─────────────────────────────────────────────────────────────

  const businesses = data
    ? [ALL_BUSINESSES, ...Array.from(new Set(data.locations.map(l => l.business))).sort()]
    : [ALL_BUSINESSES];

  const filtered = (data?.locations ?? []).filter(l => {
    const matchBiz    = bizFilter === ALL_BUSINESSES || l.business === bizFilter;
    const matchSearch = search === "" || [l.name, l.city, l.business, l.country]
      .some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchBiz && matchSearch;
  });

  // ── Summary stats ───────────────────────────────────────────────────────

  const s = data?.summary;

  // ── Chart data: avg rating per month across tracked locations ───────────
  // Build a combined weekly avg chart
  const chartData: { week: string; avg: number; n: number }[] = [];
  if (data) {
    const weekMap: Record<string, { total: number; n: number }> = {};
    for (const loc of data.locations) {
      for (const h of loc.history) {
        if (h.rating === null) continue;
        const k = h.weekStart.split("T")[0];
        weekMap[k] = weekMap[k]
          ? { total: weekMap[k].total + h.rating, n: weekMap[k].n + 1 }
          : { total: h.rating, n: 1 };
      }
    }
    Object.entries(weekMap).sort(([a],[b]) => a.localeCompare(b)).forEach(([week, v]) => {
      chartData.push({ week: fmtDate(week), avg: Math.round((v.total / v.n) * 10) / 10, n: v.n });
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="ORM Ratings Dashboard"
        subtitle="Online Reputation Management — ratings across GMB and review portals"
      />

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 mt-4 border-b border-gray-200">
        {([
          { id: "gmb"     as TabId, label: "📍 GMB" },
          { id: "portals" as TabId, label: "🌐 Portals" },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Portals Tab ── */}
      {activeTab === "portals" && <PortalsTab />}

      {/* ── GMB Tab ── */}
      {activeTab === "gmb" && <>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""}/>
          Refresh
        </button>
        <button
          onClick={runSeed}
          disabled={seeding}
          className="flex items-center gap-1.5 text-xs border border-indigo-200 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          <Database size={12} className={seeding ? "animate-pulse" : ""}/>
          {seeding ? "Seeding…" : "Seed / Re-sync Data"}
        </button>
        <button
          onClick={() => setShowReport(r => !r)}
          className={cn(
            "flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg",
            showReport
              ? "border-green-300 bg-green-100 text-green-800"
              : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          )}
        >
          💬 {showReport ? "Hide Report" : "WhatsApp Report"}
        </button>

        {/* Business filter */}
        <select
          value={bizFilter}
          onChange={e => setBizFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {businesses.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Search */}
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 min-w-40 max-w-64">
          <Search size={12} className="text-gray-400 shrink-0"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search city, brand…"
            className="text-xs flex-1 outline-none bg-transparent placeholder-gray-400"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"/>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <Card className="p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900">{s!.total}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s!.tracked} with rating data</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Portfolio Avg Rating</p>
              <p className={cn("text-2xl font-bold", s!.avgRating && s!.avgRating >= 4.0 ? "text-green-600" : "text-amber-500")}>
                {s!.avgRating !== null ? (
                  <span className="flex items-center gap-1"><Star size={16} fill="currentColor"/>{s!.avgRating}</span>
                ) : "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Across tracked listings</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Top Grower</p>
              {s!.topGrowing.length > 0 ? (
                <>
                  <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                    <TrendingUp size={13}/> +{s!.topGrowing[0].ratingDelta?.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{s!.topGrowing[0].name}</p>
                </>
              ) : <p className="text-sm text-gray-400">No change</p>}
            </Card>
            <Card className="p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Needs Attention</p>
              {s!.needsAttention.length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-red-500 flex items-center gap-1">
                    <AlertTriangle size={16}/> {s!.needsAttention.length}
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

          {/* ── Avg Rating Trend Chart ── */}
          {chartData.length >= 2 && (
            <Card className="mt-5 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Portfolio Avg Rating Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}/>
                  <YAxis domain={[3.0, 5.0]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(1)}/>
                  <Tooltip
                    formatter={(v: number) => [v.toFixed(1) + " ★", "Avg Rating"]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <ReferenceLine y={4.0} stroke="#f97316" strokeDasharray="3 3" label={{ value: "4.0", fontSize: 9, fill: "#f97316" }}/>
                  <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* ── Top Growing ── */}
          {s!.topGrowing.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-green-500"/> Top Growing Locations
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {s!.topGrowing.map(loc => (
                  <Card key={loc.id} className="p-3">
                    <BusinessTag biz={loc.business}/>
                    <p className="text-xs font-semibold text-gray-800 mt-1.5 leading-snug truncate">{loc.city}</p>
                    <div className="flex items-center justify-between mt-2">
                      <StarRating rating={loc.currentRating}/>
                      <DeltaBadge delta={loc.ratingDelta}/>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Needs Attention ── */}
          {s!.needsAttention.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-red-400"/> Needs Attention (below 4.0 ★)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {s!.needsAttention.map(loc => (
                  <Card key={loc.id} className="p-3 border-red-100 bg-red-50/30">
                    <BusinessTag biz={loc.business}/>
                    <p className="text-xs font-semibold text-gray-800 mt-1.5 leading-snug truncate">{loc.city}</p>
                    <div className="flex items-center justify-between mt-2">
                      <StarRating rating={loc.currentRating}/>
                      <DeltaBadge delta={loc.ratingDelta}/>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Full Location Table ── */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 size={12}/> All Locations ({filtered.length})
              </p>
            </div>

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
                    {filtered.map((loc, i) => {
                      const isExpanded = expanded === loc.id;
                      const chartPts = loc.history
                        .filter(h => h.rating !== null)
                        .map(h => ({ w: fmtDate(h.weekStart), r: h.rating as number }));

                      return (
                        <>
                          <tr
                            key={loc.id}
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
                              <StarRating rating={loc.currentRating}/>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <DeltaBadge delta={loc.ratingDelta}/>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">
                              {loc.newReviews !== null ? `+${loc.newReviews}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Sparkline data={loc.history}/>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {loc.status === "active" ? (
                                <span className="bg-green-100 text-green-700 text-[10px] font-medium px-1.5 py-0.5 rounded">Active</span>
                              ) : (
                                <span className="bg-gray-100 text-gray-500 text-[10px] font-medium px-1.5 py-0.5 rounded">Closed</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <a
                                href={loc.gmbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
                              >
                                <ExternalLink size={11}/>
                              </a>
                            </td>
                          </tr>

                          {/* Expanded row */}
                          {isExpanded && (
                            <tr key={`${loc.id}-exp`} className="bg-indigo-50/20 border-b border-indigo-100">
                              <td colSpan={9} className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Rating history chart */}
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

                                  {/* Details */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Details</p>
                                    <div className="flex items-start gap-1.5">
                                      <MapPin size={11} className="text-gray-400 mt-0.5 shrink-0"/>
                                      <span className="text-[11px] text-gray-600">{loc.address}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-600 space-y-1">
                                      <div><span className="text-gray-400">Last updated:</span> {fmtDate(loc.lastUpdated)}</div>
                                      <div><span className="text-gray-400">Total reviews:</span> {loc.currentReviews ?? "—"}</div>
                                      <div><span className="text-gray-400">Prev rating:</span> {fmtRating(loc.prevRating)}</div>
                                      <div><span className="text-gray-400">Handled by:</span> {loc.handledBy ?? "—"}</div>
                                    </div>
                                    <a
                                      href={loc.gmbUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline mt-1"
                                    >
                                      <ExternalLink size={10}/> Open GMB Profile
                                    </a>
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

                {filtered.length === 0 && (
                  <div className="p-12 text-center">
                    <Building2 size={32} className="mx-auto text-gray-200 mb-3"/>
                    <p className="text-sm text-gray-400">No locations match your filters.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── WhatsApp Report Panel (inline) ── */}
      {showReport && data && (
        <div className="mt-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-green-50/50">
              <span className="text-sm font-semibold text-gray-700">💬 WhatsApp Report Preview</span>
              <button
                onClick={copyReport}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-white border border-green-200 text-green-700 hover:bg-green-50"
                )}
              >
                {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Click to copy</>}
              </button>
            </div>
            <div className="p-4 max-h-[420px] overflow-y-auto">
              <div className="bg-[#DCF8C6] rounded-xl p-4 text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed text-gray-800 shadow-sm">
                {buildWhatsAppReport(data.locations)}
              </div>
            </div>
          </Card>
        </div>
      )}

      </> /* end GMB tab */}
    </>
  );
}
