"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Download,
  Instagram, Youtube, Facebook, Linkedin, ChevronDown, ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform  = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "YOUTUBE";
type Vertical  = "SY_INDIA" | "SY_UAE" | "INTERIOR" | "SQUARE_CONNECT" | "UM";
type ViewMode  = "MoM" | "QoQ" | "YoY";
type MetricKey =
  | "followers" | "follows" | "unfollows" | "netFollowers"
  | "views" | "reach" | "impressions"
  | "interactions" | "likes" | "comments" | "saves" | "shares"
  | "linkClicks" | "profileVisits"
  | "postsPublished" | "videosPublished";

interface MonthlySnapshot {
  year: number; month: number; platform: Platform;
  followers: number; follows: number; unfollows: number; netFollowers: number;
  views: number; reach: number; impressions: number;
  interactions: number; likes: number; comments: number; saves: number; shares: number;
  linkClicks: number; profileVisits: number;
  postsPublished: number; videosPublished: number; staticsPublished: number;
  daysStored: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VERTICALS: { value: Vertical; label: string }[] = [
  { value: "SY_INDIA",       label: "SQY India"      },
  { value: "SY_UAE",         label: "SQY UAE"        },
  { value: "INTERIOR",       label: "Interior Co."   },
  { value: "SQUARE_CONNECT", label: "Square Connect" },
  { value: "UM",             label: "Urban Money"    },
];

const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: "INSTAGRAM", label: "Instagram", color: "text-pink-600"   },
  { value: "FACEBOOK",  label: "Facebook",  color: "text-blue-600"   },
  { value: "LINKEDIN",  label: "LinkedIn",  color: "text-sky-700"    },
  { value: "YOUTUBE",   label: "YouTube",   color: "text-red-600"    },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const METRIC_GROUPS: { label: string; metrics: { key: MetricKey; label: string; isChild?: boolean }[] }[] = [
  {
    label: "Audience",
    metrics: [
      { key: "followers",    label: "Total Followers"   },
      { key: "follows",      label: "New Followers"     },
      { key: "unfollows",    label: "Unfollows"         },
      { key: "netFollowers", label: "Net Followers"     },
    ],
  },
  {
    label: "Reach & Visibility",
    metrics: [
      { key: "views",        label: "Views / Impressions" },
      { key: "reach",        label: "Reach (Unique)"      },
    ],
  },
  {
    label: "Engagement",
    metrics: [
      { key: "interactions", label: "Total Interactions" },
      { key: "likes",        label: "↳ Likes",     isChild: true },
      { key: "comments",     label: "↳ Comments",  isChild: true },
      { key: "saves",        label: "↳ Saves",     isChild: true },
      { key: "shares",       label: "↳ Shares",    isChild: true },
      { key: "linkClicks",   label: "Link Clicks"  },
      { key: "profileVisits",label: "Profile Visits" },
    ],
  },
  {
    label: "Publishing",
    metrics: [
      { key: "postsPublished",  label: "Posts Published"  },
      { key: "videosPublished", label: "↳ Videos / Reels", isChild: true },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function delta(curr: number, prev: number): number | null {
  if (prev <= 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (Math.abs(pct) > 9_999) return null;
  return pct;
}

function DeltaBadge({ curr, prev }: { curr: number; prev: number | null }) {
  if (prev === null) return <span className="text-gray-300 text-[10px]">—</span>;
  const pct = delta(curr, prev);
  if (pct === null) return <span className="text-gray-300 text-[10px]">—</span>;
  if (pct === 0)    return <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Minus size={9}/> 0%</span>;
  return pct > 0
    ? <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5"><TrendingUp size={9}/> +{pct}%</span>
    : <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5"><TrendingDown size={9}/> {pct}%</span>;
}

function PlatformIcon({ p, size = 12 }: { p: Platform; size?: number }) {
  const cls = PLATFORMS.find(x => x.value === p)?.color ?? "text-gray-500";
  switch (p) {
    case "INSTAGRAM": return <Instagram size={size} className={cls} />;
    case "FACEBOOK":  return <Facebook  size={size} className={cls} />;
    case "LINKEDIN":  return <Linkedin  size={size} className={cls} />;
    case "YOUTUBE":   return <Youtube   size={size} className={cls} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Data hooks
// ─────────────────────────────────────────────────────────────────────────────

function useMonthlyData(vertical: Vertical, fromYear: number, toYear: number, platforms: Platform[]) {
  const [data,    setData]    = useState<MonthlySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const platformsKey = platforms.slice().sort().join(",");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/social/reports/monthly?vertical=${vertical}&fromYear=${fromYear}&toYear=${toYear}&platforms=${platformsKey}`)
      .then(r => r.json())
      .then(d => { setData(d.months ?? []); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [vertical, fromYear, toYear, platformsKey]);

  return { data, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregation helpers
// ─────────────────────────────────────────────────────────────────────────────

// Combine snapshots across multiple platforms into a single row
function aggregateSnapshots(snaps: MonthlySnapshot[]): Omit<MonthlySnapshot, "platform"> & { platform: "ALL" } {
  const base: Record<MetricKey, number> = {
    followers: 0, follows: 0, unfollows: 0, netFollowers: 0,
    views: 0, reach: 0, impressions: 0,
    interactions: 0, likes: 0, comments: 0, saves: 0, shares: 0,
    linkClicks: 0, profileVisits: 0, postsPublished: 0, videosPublished: 0,
  };
  if (!snaps.length) return { ...snaps[0] ?? { year: 0, month: 0, daysStored: 0, staticsPublished: 0 }, platform: "ALL", ...base };
  for (const s of snaps) {
    base.followers    = Math.max(base.followers, s.followers);  // take max (not sum) for followers
    base.follows         += s.follows;
    base.unfollows       += s.unfollows;
    base.netFollowers    += s.netFollowers;
    base.views           += s.views;
    base.reach           += s.reach;
    base.impressions     += s.impressions;
    base.interactions    += s.interactions;
    base.likes           += s.likes;
    base.comments        += s.comments;
    base.saves           += s.saves;
    base.shares          += s.shares;
    base.linkClicks      += s.linkClicks;
    base.profileVisits   += s.profileVisits;
    base.postsPublished  += s.postsPublished;
    base.videosPublished += s.videosPublished;
  }
  return {
    year: snaps[0].year, month: snaps[0].month, platform: "ALL" as any,
    daysStored: Math.max(...snaps.map(s => s.daysStored)),
    staticsPublished: snaps.reduce((a, s) => a + s.staticsPublished, 0),
    ...base,
  };
}

type MonthKey = string; // "YYYY-MM"
function mkKey(year: number, month: number) { return `${year}-${String(month).padStart(2, "0")}`; }

// Get comparison period snapshot for a given view mode
function getCompSnapshot(
  key: MonthKey,
  byKey: Map<MonthKey, ReturnType<typeof aggregateSnapshots>>,
  mode: ViewMode,
): ReturnType<typeof aggregateSnapshots> | null {
  const [y, m] = key.split("-").map(Number);
  if (mode === "MoM") {
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return byKey.get(mkKey(py, pm)) ?? null;
  }
  if (mode === "QoQ") {
    const pm = m <= 3 ? m + 9 : m - 3;
    const py = m <= 3 ? y - 1 : y;
    return byKey.get(mkKey(py, pm)) ?? null;
  }
  if (mode === "YoY") {
    return byKey.get(mkKey(y - 1, m)) ?? null;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export CSV
// ─────────────────────────────────────────────────────────────────────────────

function exportCsv(data: MonthlySnapshot[], vertical: string) {
  const headers = ["Year","Month","Platform","Followers","New Followers","Unfollows","Net Followers",
    "Views","Reach","Impressions","Interactions","Likes","Comments","Saves","Shares",
    "Link Clicks","Profile Visits","Posts","Videos","Days Stored"];
  const rows = data.map(s => [
    s.year, MONTH_NAMES[s.month-1], s.platform,
    s.followers, s.follows, s.unfollows, s.netFollowers,
    s.views, s.reach, s.impressions, s.interactions, s.likes, s.comments, s.saves, s.shares,
    s.linkClicks, s.profileVisits, s.postsPublished, s.videosPublished, s.daysStored,
  ]);
  const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url;
  a.download = `social-report-${vertical}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SocialReportsPage() {
  const currentYear = new Date().getFullYear();

  const [vertical,        setVertical]        = useState<Vertical>("SY_INDIA");
  const [fromYear,        setFromYear]        = useState(currentYear - 1);
  const [toYear,          setToYear]          = useState(currentYear);
  const [activePlatforms, setActivePlatforms] = useState<Platform[]>(["INSTAGRAM","FACEBOOK","LINKEDIN","YOUTUBE"]);
  const [viewMode,        setViewMode]        = useState<ViewMode>("MoM");
  const [showPlatBreak,   setShowPlatBreak]   = useState(false);
  const [expandedGroups,  setExpandedGroups]  = useState<Set<string>>(new Set(["Audience","Reach & Visibility","Engagement","Publishing"]));
  const [syncing,         setSyncing]         = useState(false);

  const { data, loading, error } = useMonthlyData(vertical, fromYear, toYear, activePlatforms);

  // Build per-month combined aggregates (all active platforms merged)
  const monthlyAgg = useMemo(() => {
    const map = new Map<MonthKey, ReturnType<typeof aggregateSnapshots>>();
    // Group by year+month
    const byMonth = new Map<MonthKey, MonthlySnapshot[]>();
    for (const s of data) {
      const k = mkKey(s.year, s.month);
      if (!byMonth.has(k)) byMonth.set(k, []);
      byMonth.get(k)!.push(s);
    }
    Array.from(byMonth.entries()).forEach(([k, snaps]) => {
      map.set(k, aggregateSnapshots(snaps));
    });
    return map;
  }, [data]);

  // Build per-month per-platform breakdown
  const byPlatform = useMemo(() => {
    const map = new Map<Platform, Map<MonthKey, MonthlySnapshot>>();
    for (const s of data) {
      if (!map.has(s.platform)) map.set(s.platform, new Map());
      map.get(s.platform)!.set(mkKey(s.year, s.month), s);
    }
    return map;
  }, [data]);

  // Sorted list of available month keys
  const monthKeys = useMemo(() =>
    Array.from(monthlyAgg.keys()).sort(), [monthlyAgg]);

  const togglePlatform = (p: Platform) =>
    setActivePlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const toggleGroup = (label: string) =>
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  async function triggerSync() {
    setSyncing(true);
    try {
      await fetch("/api/social/sync-daily", { method: "POST" });
      await fetch("/api/meta/instagram/sync-daily", { method: "POST" });
    } finally { setSyncing(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Social Performance Report</h1>
            <p className="text-sm text-gray-500">Month-on-Month · Quarter-on-Quarter · Year-on-Year</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportCsv(data, vertical)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download size={12} /> Export CSV
            </button>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync Today"}
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap items-center gap-4">
        {/* Vertical */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Brand:</span>
          <select
            value={vertical}
            onChange={e => setVertical(e.target.value as Vertical)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {VERTICALS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>

        {/* Year range */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">From:</span>
          <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none">
            {[currentYear - 2, currentYear - 1, currentYear].map(y =>
              <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-xs text-gray-400">→</span>
          <select value={toYear} onChange={e => setToYear(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none">
            {[currentYear - 1, currentYear, currentYear + 1].map(y =>
              <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* View mode */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(["MoM","QoQ","YoY"] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >{m}</button>
          ))}
        </div>

        {/* Platform toggle */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 font-medium mr-1">Platforms:</span>
          {PLATFORMS.map(p => (
            <button
              key={p.value}
              onClick={() => togglePlatform(p.value)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${
                activePlatforms.includes(p.value)
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-400 bg-white"
              }`}
            >
              <PlatformIcon p={p.value} size={10} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Per-platform breakdown toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500">
          <input type="checkbox" checked={showPlatBreak} onChange={e => setShowPlatBreak(e.target.checked)}
            className="rounded" />
          Per-platform breakdown
        </label>
      </div>

      {/* Table */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading data…
        </div>
      )}
      {error && (
        <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}
      {!loading && !error && monthKeys.length === 0 && (
        <div className="m-6 p-8 bg-white rounded-xl border border-gray-200 text-center">
          <p className="text-gray-500 text-sm mb-2">No data stored yet for this brand.</p>
          <p className="text-gray-400 text-xs">Click <strong>Sync Today</strong> to pull today&apos;s metrics, or wait for the nightly cron (00:15 UTC) to run.</p>
        </div>
      )}

      {!loading && monthKeys.length > 0 && (
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <thead>
              {/* Year row */}
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 bg-white z-10 text-left px-4 py-2 text-gray-400 font-medium w-48 min-w-[180px]">Metric</th>
                {(() => {
                  // Group months by year for header spanning
                  const yearGroups: { year: number; count: number }[] = [];
                  for (const k of monthKeys) {
                    const yr = parseInt(k);
                    if (yearGroups.length === 0 || yearGroups[yearGroups.length - 1].year !== yr) {
                      yearGroups.push({ year: yr, count: 1 });
                    } else {
                      yearGroups[yearGroups.length - 1].count++;
                    }
                  }
                  return yearGroups.map(g => (
                    <th key={g.year} colSpan={g.count} className="text-center px-2 py-2 font-bold text-gray-700 border-l border-gray-100">
                      {g.year}
                    </th>
                  ));
                })()}
              </tr>
              {/* Month row */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 bg-gray-50 z-10 text-left px-4 py-2 text-gray-500 font-semibold text-[11px] tracking-wide uppercase">
                  {viewMode} comparison
                </th>
                {monthKeys.map(k => {
                  const [, m] = k.split("-");
                  const agg   = monthlyAgg.get(k)!;
                  return (
                    <th key={k} className="text-center px-3 py-2 font-semibold text-gray-600 border-l border-gray-100 min-w-[90px]">
                      <div>{MONTH_NAMES[parseInt(m) - 1]}</div>
                      {agg.daysStored < 28 && (
                        <div className="text-[9px] font-normal text-orange-400">{agg.daysStored}d</div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {METRIC_GROUPS.map(group => {
                const expanded = expandedGroups.has(group.label);
                return [
                  // Group header row
                  <tr key={`grp-${group.label}`} className="bg-gray-50 border-t border-gray-200 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleGroup(group.label)}>
                    <td className="sticky left-0 bg-gray-50 z-10 px-4 py-2 font-semibold text-gray-500 text-[10px] uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        {group.label}
                      </span>
                    </td>
                    {monthKeys.map(k => <td key={k} className="border-l border-gray-100" />)}
                  </tr>,

                  // Metric rows
                  ...(!expanded ? [] : group.metrics.map(metric => (
                    <tr key={metric.key} className={`border-t border-gray-50 hover:bg-blue-50/30 transition-colors ${metric.isChild ? "bg-gray-50/40" : ""}`}>
                      <td className={`sticky left-0 bg-white z-10 px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap ${metric.isChild ? "pl-8 text-gray-500 text-[11px]" : ""}`}>
                        {metric.label}
                      </td>
                      {monthKeys.map(k => {
                        const agg  = monthlyAgg.get(k)!;
                        const comp = getCompSnapshot(k, monthlyAgg, viewMode);
                        const val  = agg[metric.key as MetricKey] as number;
                        const prev = comp ? (comp[metric.key as MetricKey] as number) : null;

                        return (
                          <td key={k} className="border-l border-gray-100 px-3 py-2.5 text-center align-top">
                            <div className="font-semibold text-gray-900">{fmt(val)}</div>
                            <div className="mt-0.5">
                              <DeltaBadge curr={val} prev={prev} />
                            </div>
                            {/* Platform breakdown */}
                            {showPlatBreak && activePlatforms.length > 1 && (
                              <div className="mt-1.5 space-y-0.5">
                                {activePlatforms.map(p => {
                                  const ps = byPlatform.get(p)?.get(k);
                                  const pv = ps ? (ps[metric.key as keyof MonthlySnapshot] as number) : 0;
                                  return pv > 0 ? (
                                    <div key={p} className="flex items-center justify-center gap-0.5 text-[9px] text-gray-400">
                                      <PlatformIcon p={p} size={8} />
                                      {fmt(pv)}
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))),
                ];
              })}
            </tbody>
          </table>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><TrendingUp size={10} className="text-emerald-500" /> Better than {viewMode} period</span>
            <span className="flex items-center gap-1"><TrendingDown size={10} className="text-red-400" /> Worse than {viewMode} period</span>
            <span className="flex items-center gap-1"><Minus size={10} /> No prior data or 0</span>
            <span>Orange day-count = partial month (sync started mid-month)</span>
          </div>
        </div>
      )}
    </div>
  );
}
