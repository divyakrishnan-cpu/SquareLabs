"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart2, Layers, CalendarDays, User2, Plus, Search, RefreshCw,
  Clock, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Filter, ChevronDown, X, Edit2, Eye, Loader2, ArrowUpRight,
  Inbox, Users, Zap, Timer, Target, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter, isBefore, subDays } from "date-fns";

// ── Constants ─────────────────────────────────────────────────────────────

const REQUESTING_TEAMS: Record<string, { label: string; color: string; group: string }> = {
  SOCIAL:               { label: "Social Team",          color: "bg-green-100 text-green-700",   group: "Core" },
  MANAGEMENT:           { label: "Management",            color: "bg-violet-100 text-violet-700", group: "Core" },
  ADMIN_TEAM:           { label: "Admin Team",            color: "bg-slate-100 text-slate-700",   group: "Core" },
  PERFORMANCE_MARKETING:{ label: "Performance Marketing", color: "bg-orange-100 text-orange-700", group: "Core" },
  TECH:                 { label: "Tech Team",             color: "bg-blue-100 text-blue-700",     group: "Core" },
  HR:                   { label: "HR Team",               color: "bg-pink-100 text-pink-700",     group: "Core" },
  CONTENT:              { label: "Content Team",          color: "bg-emerald-100 text-emerald-700",group: "Core" },
  SEO:                  { label: "SEO Team",              color: "bg-yellow-100 text-yellow-700", group: "Core" },
  BUSINESS_UM:          { label: "Business · UM",         color: "bg-cyan-100 text-cyan-700",     group: "Business" },
  BUSINESS_AZURO:       { label: "Business · Azuro",      color: "bg-teal-100 text-teal-700",     group: "Business" },
  BUSINESS_PROPVR:      { label: "Business · PropVr",     color: "bg-indigo-100 text-indigo-700", group: "Business" },
  BUSINESS_IPM:         { label: "Business · IPM",        color: "bg-sky-100 text-sky-700",       group: "Business" },
  BUSINESS_NRI:         { label: "Business · NRI",        color: "bg-blue-100 text-blue-800",     group: "Business" },
  BUSINESS_INDIA_SALES: { label: "Business · India Sales",color: "bg-purple-100 text-purple-700", group: "Business" },
  PAID_CAMPAIGN:        { label: "Paid Campaign",         color: "bg-red-100 text-red-700",       group: "Core" },
  MARKETING:            { label: "Marketing",             color: "bg-amber-100 text-amber-700",   group: "Core" },
  OTHER:                { label: "Others / Misc",         color: "bg-gray-100 text-gray-600",     group: "Core" },
};

const STATUS_COLORS: Record<string, string> = {
  NEW:         "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  ASSIGNED:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  REVIEW:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELIVERED:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress",
  REVIEW: "In Review", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};

const TYPE_LABELS: Record<string, string> = {
  VIDEO_EDIT: "Video Edit", VIDEO_SHOOT: "Video Shoot",
  GRAPHIC_SOCIAL: "Social Graphic", GRAPHIC_CAMPAIGN: "Campaign Graphic", OTHER: "Other",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    "text-gray-400",
  MEDIUM: "text-blue-500",
  HIGH:   "text-orange-500",
  URGENT: "text-red-600 font-bold",
};

const PIE_PALETTE = ["#6366f1","#3b82f6","#f59e0b","#10b981","#ef4444","#8b5cf6"];

// ── Types ─────────────────────────────────────────────────────────────────

interface DesignReq {
  id: string; refId: string; title: string; brief: string;
  type: string; requestingTeam: string; requesterName?: string; subTeam?: string;
  priority: string; status: string; dueDate?: string;
  submittedAt: string; deliveredAt?: string; tatHours?: number;
  assignedTo?: { name: string } | null;
  requestedBy?: { name: string } | null;
  revisionCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function TeamBadge({ team }: { team: string }) {
  const t = REQUESTING_TEAMS[team];
  if (!t) return <span className="text-xs text-gray-400">{team}</span>;
  return <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", t.color)}>{t.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_COLORS[status] ?? "bg-gray-100 text-gray-500")}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function isOverdue(req: DesignReq) {
  if (!req.dueDate) return false;
  if (req.status === "DELIVERED" || req.status === "CANCELLED") return false;
  return isBefore(parseISO(req.dueDate), new Date());
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function DesignOpsPage() {
  return (
    <Suspense fallback={<PageLoader/>}>
      <DesignHubInner/>
    </Suspense>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-blue-500"/>
    </div>
  );
}

function DesignHubInner() {
  const params    = useSearchParams();
  const activeTab = params.get("tab") ?? "overview";

  const [requests, setRequests] = useState<DesignReq[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/design-ops/requests");
      if (res.ok) setRequests(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs = [
    { id: "overview",  label: "Overview",  icon: BarChart2 },
    { id: "requests",  label: "Requests",  icon: Layers },
    { id: "calendar",  label: "Calendar",  icon: CalendarDays },
    { id: "my-work",   label: "My Work",   icon: User2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
              <Layers size={19} className="text-white"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Design Hub</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unified design requests, calendar & analytics</p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:opacity-90 shadow-sm"
          >
            <Plus size={15}/> New Request
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <a key={t.id} href={`/design-ops?tab=${t.id}`}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}>
                <Icon size={14}/>
                {t.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "overview"  && <OverviewTab  requests={requests} loading={loading} onRefresh={load}/>}
        {activeTab === "requests"  && <RequestsTab  requests={requests} loading={loading} onRefresh={load} onNew={() => setShowNew(true)}/>}
        {activeTab === "calendar"  && <CalendarTab/>}
        {activeTab === "my-work"   && <MyWorkTab/>}
      </div>

      {showNew && <NewRequestModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }}/>}
    </div>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────

function OverviewTab({ requests, loading, onRefresh }: { requests: DesignReq[]; loading: boolean; onRefresh: () => void }) {
  const active   = requests.filter(r => !["DELIVERED","CANCELLED"].includes(r.status));
  const overdue  = requests.filter(isOverdue);
  const inReview = requests.filter(r => r.status === "REVIEW");
  const delivered30 = requests.filter(r => r.status === "DELIVERED" && r.deliveredAt &&
    isAfter(parseISO(r.deliveredAt), subDays(new Date(), 30)));

  const avgTat = (() => {
    const withTat = requests.filter(r => r.tatHours && r.tatHours > 0);
    if (!withTat.length) return null;
    return (withTat.reduce((s, r) => s + (r.tatHours ?? 0), 0) / withTat.length).toFixed(1);
  })();

  // By-team bar chart data
  const byTeam = Object.entries(
    requests.reduce<Record<string, number>>((acc, r) => {
      const label = REQUESTING_TEAMS[r.requestingTeam]?.label ?? r.requestingTeam;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 12)
   .map(([name, value]) => ({ name: name.replace("Business · ",""), value }));

  // Status donut
  const byStatus = Object.entries(
    requests.reduce<Record<string, number>>((acc, r) => {
      acc[STATUS_LABELS[r.status] ?? r.status] = (acc[STATUS_LABELS[r.status] ?? r.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Type breakdown
  const byType = Object.entries(
    requests.reduce<Record<string, number>>((acc, r) => {
      const label = TYPE_LABELS[r.type] ?? r.type;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  // Stuck = IN_PROGRESS > 7 days or ASSIGNED > 3 days
  const stuck = requests.filter(r => {
    if (r.status === "IN_PROGRESS") return isBefore(parseISO(r.submittedAt), subDays(new Date(), 7));
    if (r.status === "ASSIGNED")    return isBefore(parseISO(r.submittedAt), subDays(new Date(), 3));
    return false;
  });

  const kpis = [
    { label: "Active Requests",  value: active.length,       icon: Inbox,         color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Overdue",          value: overdue.length,      icon: AlertTriangle,  color: "text-red-600",     bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "In Review",        value: inReview.length,     icon: Eye,            color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Delivered (30d)",  value: delivered30.length,  icon: CheckCircle2,   color: "text-green-600",   bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Avg TAT (hrs)",    value: avgTat ?? "—",        icon: Timer,          color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Stuck / Blocked",  value: stuck.length,        icon: Zap,            color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-900/20" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={cn("rounded-2xl p-4 border border-transparent", k.bg)}>
              <div className="flex items-start justify-between mb-2">
                <Icon size={16} className={k.color}/>
              </div>
              <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Requests by team — bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Requests by Team</h3>
            <span className="text-xs text-gray-400">{requests.length} total</span>
          </div>
          {byTeam.length === 0
            ? <EmptyChart/>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byTeam} margin={{ top: 0, right: 0, left: -25, bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0}/>
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false}/>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}/>
                  <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} name="Requests"/>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Status donut */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Status Breakdown</h3>
          {byStatus.length === 0
            ? <EmptyChart/>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={75} innerRadius={45}>
                    {byStatus.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}/>
                  <Legend wrapperStyle={{ fontSize: 10 }}/>
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Stuck / overdue table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} className="text-orange-500"/>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Stuck & Overdue</h3>
            <span className="ml-auto text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 px-2 py-0.5 rounded-full font-medium">
              {stuck.length + overdue.length} items
            </span>
          </div>
          {stuck.length + overdue.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">✅ Nothing stuck right now</p>
            : <div className="space-y-2 max-h-56 overflow-y-auto">
                {Array.from(new Set([...stuck, ...overdue])).slice(0,10).map(r => (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/60 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                    <AlertTriangle size={13} className="text-orange-500 mt-0.5 shrink-0"/>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TeamBadge team={r.requestingTeam}/>
                        <span className={cn("text-[10px] font-medium", STATUS_COLORS[r.status]?.split(" ").slice(0,2).join(" "))}>{STATUS_LABELS[r.status]}</span>
                        {r.dueDate && <span className="text-[10px] text-red-500">Due {format(parseISO(r.dueDate),"d MMM")}</span>}
                      </div>
                    </div>
                    {r.assignedTo && (
                      <span className="text-[10px] text-gray-400 shrink-0">{r.assignedTo.name.split(" ")[0]}</span>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Type breakdown + top requesters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Work Type Breakdown</h3>
          <div className="space-y-2">
            {byType.length === 0
              ? <EmptyChart/>
              : byType.map((t, i) => {
                  const pct = Math.round((t.value / requests.length) * 100);
                  return (
                    <div key={t.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-300">{t.name}</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-100">{t.value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length] }}/>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return <div className="flex items-center justify-center h-40 text-sm text-gray-400">No data yet — submit your first request!</div>;
}

// ── REQUESTS TAB ──────────────────────────────────────────────────────────

function RequestsTab({ requests, loading, onRefresh, onNew }: {
  requests: DesignReq[]; loading: boolean; onRefresh: () => void; onNew: () => void;
}) {
  const [search,      setSearch]      = useState("");
  const [filterTeam,  setFilterTeam]  = useState("all");
  const [filterStatus,setFilterStatus]= useState("all");
  const [filterType,  setFilterType]  = useState("all");
  const [sortBy,      setSortBy]      = useState<"date"|"priority"|"team">("date");

  const filtered = useMemo(() => {
    return requests
      .filter(r => {
        if (filterTeam   !== "all" && r.requestingTeam !== filterTeam)   return false;
        if (filterStatus !== "all" && r.status         !== filterStatus) return false;
        if (filterType   !== "all" && r.type           !== filterType)   return false;
        const q = search.toLowerCase();
        return !q ||
          r.title.toLowerCase().includes(q) ||
          (r.requesterName ?? "").toLowerCase().includes(q) ||
          (REQUESTING_TEAMS[r.requestingTeam]?.label ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const order = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return (order[a.priority as keyof typeof order] ?? 4) - (order[b.priority as keyof typeof order] ?? 4);
        }
        if (sortBy === "team") return a.requestingTeam.localeCompare(b.requestingTeam);
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
  }, [requests, search, filterTeam, filterStatus, filterType, sortBy]);

  const overdueCount = filtered.filter(isOverdue).length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title, requester…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
          </div>
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white">
            <option value="all">All Teams</option>
            {Object.entries(REQUESTING_TEAMS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white">
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white">
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white">
            <option value="date">Sort: Newest</option>
            <option value="priority">Sort: Priority</option>
            <option value="team">Sort: Team</option>
          </select>
          <button onClick={onRefresh} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          </button>
          <button onClick={onNew}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-sm font-medium">
            <Plus size={13}/> New
          </button>
          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} requests
            {overdueCount > 0 && <span className="ml-2 text-red-500 font-medium">· {overdueCount} overdue</span>}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Ref</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Requesting Team</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Requested By</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Priority</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Due</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Assigned To</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && (
              <tr><td colSpan={9} className="text-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin mx-auto"/></td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">No requests match your filters</td></tr>
            )}
            {!loading && filtered.map(r => {
              const overdue = isOverdue(r);
              return (
                <tr key={r.id} className={cn("hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors", overdue && "bg-red-50/40 dark:bg-red-900/10")}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.refId}</td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                    {r.revisionCount > 0 && <span className="text-[10px] text-amber-600">↻ {r.revisionCount} revision{r.revisionCount > 1 ? "s" : ""}</span>}
                  </td>
                  <td className="px-4 py-3"><TeamBadge team={r.requestingTeam}/></td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {r.requesterName ?? r.requestedBy?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{TYPE_LABELS[r.type] ?? r.type}</td>
                  <td className={cn("px-4 py-3 text-xs font-semibold", PRIORITY_COLORS[r.priority])}>{r.priority}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.dueDate
                      ? <span className={cn(overdue ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400")}>
                          {format(parseISO(r.dueDate), "d MMM")}
                          {overdue && " ⚠️"}
                        </span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {r.assignedTo?.name ?? <span className="text-gray-300 dark:text-gray-600">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CALENDAR TAB (shell — reuse existing logic) ───────────────────────────

function CalendarTab() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center">
      <CalendarDays size={32} className="mx-auto text-indigo-400 mb-3"/>
      <p className="font-semibold text-gray-700 dark:text-gray-200">Content Calendar</p>
      <p className="text-sm text-gray-400 mt-1 mb-4">Full calendar moved here from Social — coming in next update.</p>
      <a href="/social/calendar" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline font-medium">
        Open current calendar <ArrowUpRight size={14}/>
      </a>
    </div>
  );
}

// ── MY WORK TAB ───────────────────────────────────────────────────────────

function MyWorkTab() {
  const [users,   setUsers]   = useState<{id:string;name:string}[]>([]);
  const [userId,  setUserId]  = useState("");
  const [summary, setSummary] = useState("");
  const [hours,   setHours]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);

  useEffect(() => {
    fetch("/api/team").then(r => r.json()).then(data => {
      const designers = data.filter((u: any) =>
        ["Design","Video"].includes(u.department ?? "")
      );
      setUsers(designers);
    }).catch(() => {});
  }, []);

  async function save() {
    if (!userId || !summary) return;
    setSaving(true);
    await fetch("/api/design-ops/daily-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, summary, hoursWorked: hours ? parseFloat(hours) : null }),
    });
    setSaving(false);
    setDone(true);
    setSummary(""); setHours("");
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Log Today's Work</h3>
        <p className="text-sm text-gray-400 mb-5">What did the design team complete today?</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Designer</label>
            <select value={userId} onChange={e => setUserId(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">Select designer…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Work Summary</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4}
              placeholder="e.g. Completed 3 reels for She Leads series, reviewed brand guidelines for Azuro…"
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"/>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Hours worked <span className="text-gray-300 font-normal">(optional)</span></label>
            <input type="number" value={hours} onChange={e => setHours(e.target.value)} min="0" max="24" step="0.5"
              placeholder="e.g. 7.5"
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
          </div>

          <button onClick={save} disabled={saving || !userId || !summary}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
            {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : done ? "✓ Saved!" : "Save Today's Log"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NEW REQUEST MODAL ─────────────────────────────────────────────────────

const BUSINESS_SUBTEAMS = ["UM","Azuro","PropVr","IPM","NRI","India Sales"];

function NewRequestModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: "", brief: "", type: "GRAPHIC_SOCIAL", requestingTeam: "SOCIAL",
    requesterName: "", priority: "MEDIUM", dueDate: "", referenceLinks: "",
  });
  const [subTeam, setSubTeam] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState("");

  const isBusinessTeam = form.requestingTeam.startsWith("BUSINESS_");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.brief) { setError("Title and brief are required."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/design-ops/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, subTeam: isBusinessTeam ? subTeam : undefined }),
    });
    setSaving(false);
    if (res.ok) { onSaved(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
  }

  function field(key: keyof typeof form, val: string) { setForm(p => ({ ...p, [key]: val })); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">New Design Request</h2>
            <p className="text-xs text-gray-400 mt-0.5">Submit a request to the design team</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X size={16}/></button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">

          {/* Requesting Team */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Requesting Team *</label>
            <select value={form.requestingTeam} onChange={e => field("requestingTeam", e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <optgroup label="Core Teams">
                {Object.entries(REQUESTING_TEAMS).filter(([,v]) => v.group === "Core").map(([k,v]) =>
                  <option key={k} value={k}>{v.label}</option>
                )}
              </optgroup>
              <optgroup label="Business / Sales Teams">
                {Object.entries(REQUESTING_TEAMS).filter(([,v]) => v.group === "Business").map(([k,v]) =>
                  <option key={k} value={k}>{v.label}</option>
                )}
              </optgroup>
            </select>
          </div>

          {/* Requester name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Your Name *</label>
            <input value={form.requesterName} onChange={e => field("requesterName", e.target.value)}
              placeholder="e.g. Anjali Tyagi"
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Request Title *</label>
            <input value={form.title} onChange={e => field("title", e.target.value)}
              placeholder="e.g. 3 Instagram Reels for She Leads — April batch"
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Type</label>
              <select value={form.type} onChange={e => field("type", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => field("priority", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">🔴 Urgent</option>
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => field("dueDate", e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
          </div>

          {/* Brief */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Brief / Description *</label>
            <textarea value={form.brief} onChange={e => field("brief", e.target.value)} rows={3}
              placeholder="Describe what you need, dimensions, formats, reference style…"
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"/>
          </div>

          {/* Reference links */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Reference Links <span className="font-normal text-gray-400">(optional)</span></label>
            <input value={form.referenceLinks} onChange={e => field("referenceLinks", e.target.value)}
              placeholder="Drive link, Notion doc, inspiration URL…"
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin"/> Submitting…</> : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
