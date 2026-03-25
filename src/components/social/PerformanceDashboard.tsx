"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { MetricCard, Card, SectionHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  Users, Eye, MousePointerClick, Heart, RefreshCw, PenLine,
  TrendingUp, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { VERTICAL_LABELS, type Vertical } from "@/types";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => ({
  value: String(y), label: String(y),
}));
const PLATFORMS = ["Instagram","Facebook","LinkedIn","YouTube"];

const PIE_PALETTE = ["#6366f1","#3b82f6","#10b981","#f59e0b"];

// Roles that can log monthly data
const CAN_LOG_ROLES = new Set(["ADMIN","HEAD_OF_MARKETING","TEAM_LEAD"]);

// ── Types ──────────────────────────────────────────────────────────────────

interface PlatformRow {
  platform: string;
  followers: number;
  reach: number;
  interactions: number;
  posts: number;
  videos: number;
  statics: number;
}

interface MonthlyReport {
  id: string;
  vertical: string;
  year: number;
  month: number;
  totalFollowers: number;
  newFollowers: number;
  unfollows: number;
  netFollowers: number;
  totalViews: number;
  totalReach: number;
  totalImpressions: number;
  interactions: number;
  linkClicks: number;
  profileVisits: number;
  totalContacts: number;
  postsPublished: number;
  videosPublished: number;
  staticsPublished: number;
  platformBreakdown: PlatformRow[] | null;
  notes: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function emptyPlatformRows(): PlatformRow[] {
  return PLATFORMS.map(p => ({ platform: p, followers: 0, reach: 0, interactions: 0, posts: 0, videos: 0, statics: 0 }));
}

function emptyFormData() {
  return {
    totalFollowers: "", newFollowers: "", unfollows: "", netFollowers: "",
    totalViews: "", totalReach: "", totalImpressions: "",
    interactions: "", linkClicks: "", profileVisits: "", totalContacts: "",
    postsPublished: "", videosPublished: "", staticsPublished: "",
    notes: "",
    platformBreakdown: emptyPlatformRows(),
  };
}

type FormData = ReturnType<typeof emptyFormData>;

// ── Log Month Modal ────────────────────────────────────────────────────────

interface LogModalProps {
  vertical: Vertical;
  defaultYear: number;
  defaultMonth: number;
  existingReport: MonthlyReport | null;
  onClose: () => void;
  onSaved: () => void;
}

function LogModal({ vertical, defaultYear, defaultMonth, existingReport, onClose, onSaved }: LogModalProps) {
  const [year,  setYear]  = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [form,  setForm]  = useState<FormData>(() => {
    if (existingReport) {
      const pb = existingReport.platformBreakdown ?? emptyPlatformRows();
      return {
        totalFollowers:   String(existingReport.totalFollowers),
        newFollowers:     String(existingReport.newFollowers),
        unfollows:        String(existingReport.unfollows),
        netFollowers:     String(existingReport.netFollowers),
        totalViews:       String(existingReport.totalViews),
        totalReach:       String(existingReport.totalReach),
        totalImpressions: String(existingReport.totalImpressions),
        interactions:     String(existingReport.interactions),
        linkClicks:       String(existingReport.linkClicks),
        profileVisits:    String(existingReport.profileVisits),
        totalContacts:    String(existingReport.totalContacts),
        postsPublished:   String(existingReport.postsPublished),
        videosPublished:  String(existingReport.videosPublished),
        staticsPublished: String(existingReport.staticsPublished),
        notes:            existingReport.notes ?? "",
        platformBreakdown: pb,
      };
    }
    return emptyFormData();
  });
  const [showPlatform, setShowPlatform] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Auto-calc net followers
  useEffect(() => {
    const nf = (parseInt(form.newFollowers) || 0) - (parseInt(form.unfollows) || 0);
    setForm(f => ({ ...f, netFollowers: String(nf) }));
  }, [form.newFollowers, form.unfollows]);

  function setField(key: keyof Omit<FormData, "platformBreakdown">, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function setPlatformField(idx: number, key: keyof PlatformRow, val: string) {
    setForm(f => {
      const pb = [...f.platformBreakdown];
      pb[idx] = { ...pb[idx], [key]: key === "platform" ? val : parseInt(val) || 0 };
      return { ...f, platformBreakdown: pb };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/social/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical, year, month,
          totalFollowers:   parseInt(form.totalFollowers)   || 0,
          newFollowers:     parseInt(form.newFollowers)     || 0,
          unfollows:        parseInt(form.unfollows)        || 0,
          netFollowers:     parseInt(form.netFollowers)     || 0,
          totalViews:       parseInt(form.totalViews)       || 0,
          totalReach:       parseInt(form.totalReach)       || 0,
          totalImpressions: parseInt(form.totalImpressions) || 0,
          interactions:     parseInt(form.interactions)     || 0,
          linkClicks:       parseInt(form.linkClicks)       || 0,
          profileVisits:    parseInt(form.profileVisits)    || 0,
          totalContacts:    parseInt(form.totalContacts)    || 0,
          postsPublished:   parseInt(form.postsPublished)   || 0,
          videosPublished:  parseInt(form.videosPublished)  || 0,
          staticsPublished: parseInt(form.staticsPublished) || 0,
          platformBreakdown: form.platformBreakdown,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e: any) {
      setError(e.message ?? "Network error");
    } finally {
      setSaving(false);
    }
  }

  const monthOptions = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Log Monthly Metrics</h2>
            <p className="text-xs text-gray-400 mt-0.5">Data is saved per vertical · month · year</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vertical</label>
              <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium">
                {VERTICAL_LABELS[vertical]}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Year</label>
              <Select value={String(year)} onChange={v => setYear(Number(v))} options={YEAR_OPTIONS} className="w-24" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Month</label>
              <Select value={String(month)} onChange={v => setMonth(Number(v))} options={monthOptions} className="w-28" />
            </div>
          </div>

          {/* Section: Audience */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Audience</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Total Followers (end of month)" value={form.totalFollowers} onChange={v => setField("totalFollowers", v)} />
              <NumInput label="New Follows (gained)" value={form.newFollowers} onChange={v => setField("newFollowers", v)} />
              <NumInput label="Unfollows (lost)" value={form.unfollows} onChange={v => setField("unfollows", v)} />
              <NumInput label="Net Followers (auto)" value={form.netFollowers} readOnly />
            </div>
          </div>

          {/* Section: Reach & Visibility */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Reach & Visibility</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Total Views" value={form.totalViews} onChange={v => setField("totalViews", v)} />
              <NumInput label="Total Reach" value={form.totalReach} onChange={v => setField("totalReach", v)} />
              <NumInput label="Total Impressions" value={form.totalImpressions} onChange={v => setField("totalImpressions", v)} />
              <NumInput label="Profile Visits" value={form.profileVisits} onChange={v => setField("profileVisits", v)} />
            </div>
          </div>

          {/* Section: Engagement */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Engagement</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Total Interactions (likes+comments+shares+saves)" value={form.interactions} onChange={v => setField("interactions", v)} />
              <NumInput label="Link Clicks" value={form.linkClicks} onChange={v => setField("linkClicks", v)} />
              <NumInput label="Total Contacts / Leads" value={form.totalContacts} onChange={v => setField("totalContacts", v)} />
            </div>
          </div>

          {/* Section: Publishing */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Publishing</h3>
            <div className="grid grid-cols-3 gap-3">
              <NumInput label="Total Posts" value={form.postsPublished} onChange={v => setField("postsPublished", v)} />
              <NumInput label="Videos" value={form.videosPublished} onChange={v => setField("videosPublished", v)} />
              <NumInput label="Statics" value={form.staticsPublished} onChange={v => setField("staticsPublished", v)} />
            </div>
          </div>

          {/* Section: Platform Breakdown (collapsible) */}
          <div>
            <button
              onClick={() => setShowPlatform(p => !p)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors w-full"
            >
              {showPlatform ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              Platform Breakdown (optional)
            </button>
            {showPlatform && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      {["Platform","Followers","Reach","Interactions","Posts","Videos","Statics"].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {form.platformBreakdown.map((row, idx) => (
                      <tr key={row.platform}>
                        <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 text-xs">{row.platform}</td>
                        {(["followers","reach","interactions","posts","videos","statics"] as const).map(k => (
                          <td key={k} className="px-2 py-1">
                            <input
                              type="number" min="0"
                              value={row[k] === 0 ? "" : String(row[k])}
                              onChange={e => setPlatformField(idx, k, e.target.value)}
                              placeholder="0"
                              className="w-20 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              placeholder="Any context, highlights, or observations for this month…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Error / success */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 border border-red-200 dark:border-red-800">
              <AlertTriangle size={14}/> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-2.5 border border-green-200 dark:border-green-800">
              <CheckCircle2 size={14}/> Saved!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors shadow-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
            {saving ? "Saving…" : success ? "Saved!" : `Save ${MONTHS[month-1]} ${year}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Small reusable number input
function NumInput({ label, value, onChange, readOnly }: {
  label: string; value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder="0"
        className={cn(
          "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300",
          readOnly
            ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-default"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
        )}
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function PerformanceDashboard() {
  const { data: session } = useSession();
  const [vertical,   setVertical]   = useState<Vertical>("SY_INDIA");
  const [selYear,    setSelYear]    = useState(CURRENT_YEAR);
  const [selMonth,   setSelMonth]   = useState(new Date().getMonth() + 1); // 1-12
  const [reports,    setReports]    = useState<MonthlyReport[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [showModal,  setShowModal]  = useState(false);

  const canLog = CAN_LOG_ROLES.has((session?.user as any)?.role ?? "");

  // ── Fetch yearly data for the vertical ──
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/monthly?vertical=${vertical}&year=${selYear}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch { setReports([]); }
    finally { setLoading(false); }
  }, [vertical, selYear]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Derived state ──
  const currentReport  = reports.find(r => r.month === selMonth) ?? null;
  const prevReport     = reports.find(r => r.month === selMonth - 1) ?? null;

  // Delta vs previous month
  const delta = (cur: number, prev: number | undefined) =>
    prev !== undefined ? cur - prev : undefined;

  // Trend data for the year (all 12 months, null where no data)
  const trendData = MONTHS.map((m, i) => {
    const r = reports.find(r => r.month === i + 1);
    return {
      month: m,
      followers:    r?.totalFollowers   ?? null,
      newFollowers: r?.newFollowers      ?? null,
      unfollows:    r?.unfollows         ?? null,
      reach:        r?.totalReach        ?? null,
      interactions: r?.interactions      ?? null,
      views:        r?.totalViews        ?? null,
    };
  });

  // Content mix pie — from platform breakdown if available, else from publishing totals
  const contentPie = currentReport ? [
    { name: "Videos",  value: currentReport.videosPublished,  color: "#6366f1" },
    { name: "Statics", value: currentReport.staticsPublished, color: "#3b82f6" },
  ].filter(d => d.value > 0) : [];

  const verticalOptions = Object.entries(VERTICAL_LABELS).map(([v, l]) => ({ value: v, label: l }));

  return (
    <div className="space-y-5">
      {/* ── Controls bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={vertical}
          onChange={v => setVertical(v as Vertical)}
          options={verticalOptions}
          className="w-52"
        />
        <Select
          value={String(selYear)}
          onChange={v => setSelYear(Number(v))}
          options={YEAR_OPTIONS}
          className="w-24"
        />

        {/* Month selector — pill tabs */}
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m, i) => {
            const hasData = reports.some(r => r.month === i + 1);
            return (
              <button
                key={m}
                onClick={() => setSelMonth(i + 1)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-colors relative",
                  selMonth === i + 1
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-700"
                )}
              >
                {m}
                {hasData && selMonth !== i + 1 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full"/>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {canLog && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <PenLine size={13}/> Log Month Data
            </button>
          )}
          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          </button>
        </div>
      </div>

      {/* ── Period label ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm">
        <TrendingUp size={14} className="text-indigo-400"/>
        <span className="text-gray-500">Showing</span>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{MONTHS[selMonth-1]} {selYear}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">{VERTICAL_LABELS[vertical]}</span>
        {!currentReport && !loading && (
          <span className="ml-1 text-amber-500 text-xs font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            No data logged
          </span>
        )}
        {currentReport?.notes && (
          <span className="ml-1 text-gray-400 text-xs italic truncate max-w-xs">"{currentReport.notes}"</span>
        )}
      </div>

      {/* ── Empty state ───────────────────────────────────────── */}
      {!currentReport && !loading && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-8 text-center">
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">
            No metrics logged for {MONTHS[selMonth-1]} {selYear}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {reports.length > 0
              ? `You have data for ${reports.length} other month${reports.length > 1 ? "s" : ""} this year.`
              : "No data has been logged for this vertical in " + selYear + " yet."}
          </p>
          {canLog && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <PenLine size={13}/> Log {MONTHS[selMonth-1]} data
            </button>
          )}
        </div>
      )}

      {/* ── KPI rows (only shown if data exists) ─────────────── */}
      {currentReport && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Net Followers"
              value={currentReport.netFollowers}
              delta={delta(currentReport.netFollowers, prevReport?.netFollowers)}
              deltaLabel="vs prev month"
              icon={<Users size={16}/>}
            />
            <MetricCard
              label="Total Reach"
              value={currentReport.totalReach}
              delta={delta(currentReport.totalReach, prevReport?.totalReach)}
              deltaLabel="vs prev month"
              icon={<Eye size={16}/>}
            />
            <MetricCard
              label="Interactions"
              value={currentReport.interactions}
              delta={delta(currentReport.interactions, prevReport?.interactions)}
              deltaLabel="vs prev month"
              icon={<Heart size={16}/>}
            />
            <MetricCard
              label="Link Clicks"
              value={currentReport.linkClicks}
              delta={delta(currentReport.linkClicks, prevReport?.linkClicks)}
              icon={<MousePointerClick size={16}/>}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total Followers"  value={currentReport.totalFollowers}  delta={delta(currentReport.totalFollowers, prevReport?.totalFollowers)} deltaLabel="MoM" />
            <MetricCard label="Total Views"      value={currentReport.totalViews}      delta={delta(currentReport.totalViews, prevReport?.totalViews)} deltaLabel="MoM" />
            <MetricCard label="Profile Visits"   value={currentReport.profileVisits} />
            <MetricCard label="Total Contacts"   value={currentReport.totalContacts} />
          </div>
        </>
      )}

      {/* ── Yearly trend charts ───────────────────────────────── */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Followers growth */}
          <Card className="lg:col-span-2 p-5">
            <SectionHeader title="Followers Growth" subtitle={`Monthly trends · ${selYear}`} />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradNF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                  formatter={(val: any) => val === null ? "—" : formatNumber(val)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Area type="monotone" dataKey="newFollowers" stroke="#6366f1" fill="url(#gradNF)" strokeWidth={2} dot name="New Follows" connectNulls={false}/>
                <Area type="monotone" dataKey="unfollows" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="4 2" dot name="Unfollows" connectNulls={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Reach trend or content mix */}
          <Card className="p-5">
            <SectionHeader title="Reach by Month" subtitle={selYear.toString()} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                  formatter={(val: any) => val === null ? "—" : formatNumber(val)}
                />
                <Bar dataKey="reach" fill="#3b82f6" radius={[4,4,0,0]} name="Reach"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── Platform breakdown (from logged data) ────────────── */}
      {currentReport?.platformBreakdown && currentReport.platformBreakdown.length > 0 && (
        <Card padding={false}>
          <div className="p-5 pb-0">
            <SectionHeader title="Platform Breakdown" subtitle={`${MONTHS[selMonth-1]} ${selYear}`}/>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  {["Platform","Followers","Reach","Interactions","Posts","Videos","Statics","Eng. Rate"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentReport.platformBreakdown.map(row => {
                  const er = ((row.interactions / Math.max(row.followers, 1)) * 100).toFixed(2);
                  return (
                    <tr key={row.platform}>
                      <td className="font-medium text-gray-900 dark:text-gray-100">{row.platform}</td>
                      <td className="tabular-nums">{formatNumber(row.followers)}</td>
                      <td className="tabular-nums">{formatNumber(row.reach)}</td>
                      <td className="tabular-nums">{formatNumber(row.interactions)}</td>
                      <td className="tabular-nums">{row.posts}</td>
                      <td className="tabular-nums">{row.videos}</td>
                      <td className="tabular-nums">{row.statics}</td>
                      <td>
                        <span className={cn("font-medium", Number(er) >= 5 ? "text-green-600" : Number(er) >= 2 ? "text-amber-600" : "text-red-500")}>
                          {er}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Publishing summary ────────────────────────────────── */}
      {currentReport && (
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Total Published"          value={currentReport.postsPublished}   />
          <MetricCard label="Video Content Published"  value={currentReport.videosPublished}  />
          <MetricCard label="Static Content Published" value={currentReport.staticsPublished} />
        </div>
      )}

      {/* ── Yearly summary table ──────────────────────────────── */}
      {reports.length > 1 && (
        <Card padding={false}>
          <div className="p-5 pb-0">
            <SectionHeader title={`${selYear} Summary — All Months`} subtitle={`${VERTICAL_LABELS[vertical]} · click a month tab above to drill in`}/>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-xs">
              <thead>
                <tr>
                  {["Month","Followers","Net","Views","Reach","Interactions","Posts"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr
                    key={r.month}
                    onClick={() => setSelMonth(r.month)}
                    className={cn("cursor-pointer transition-colors",
                      r.month === selMonth ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <td className="font-medium text-gray-800 dark:text-gray-200">{MONTHS[r.month-1]}</td>
                    <td className="tabular-nums">{formatNumber(r.totalFollowers)}</td>
                    <td className={cn("tabular-nums font-medium", r.netFollowers >= 0 ? "text-green-600" : "text-red-500")}>
                      {r.netFollowers >= 0 ? "+" : ""}{formatNumber(r.netFollowers)}
                    </td>
                    <td className="tabular-nums">{formatNumber(r.totalViews)}</td>
                    <td className="tabular-nums">{formatNumber(r.totalReach)}</td>
                    <td className="tabular-nums">{formatNumber(r.interactions)}</td>
                    <td className="tabular-nums">{r.postsPublished}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Log Modal ─────────────────────────────────────────── */}
      {showModal && (
        <LogModal
          vertical={vertical}
          defaultYear={selYear}
          defaultMonth={selMonth}
          existingReport={currentReport}
          onClose={() => setShowModal(false)}
          onSaved={() => { fetchReports(); }}
        />
      )}
    </div>
  );
}
