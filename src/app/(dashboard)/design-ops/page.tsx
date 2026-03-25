"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart2, Layers, CalendarDays, User2, Plus, Search, RefreshCw,
  Clock, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Filter, ChevronDown, X, Edit2, Eye, Loader2, ArrowUpRight, Check,
  Inbox, Users, Zap, Timer, Target, FileText,
  Download, Upload, FileUp, CheckCheck, SkipForward, XCircle,
  ThumbsUp, ThumbsDown, UserPlus, UserCheck, Milestone, MessageSquare,
  ChevronRight, BadgeCheck, RotateCcw, ShieldCheck, Flag,
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
  NEW:               "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  ASSIGNED:          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS:       "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  DESIGNER_DONE:     "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  IN_REVIEW:         "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  APPROVED:          "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  FINAL_DONE:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  // Legacy
  REVIEW:            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELIVERED:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED:         "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  NEW:               "New",
  ASSIGNED:          "Assigned",
  IN_PROGRESS:       "In Progress",
  DESIGNER_DONE:     "Designer Done",
  IN_REVIEW:         "In Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED:          "Approved",
  FINAL_DONE:        "Final Done ✅",
  REVIEW:            "In Review",
  DELIVERED:         "Delivered",
  CANCELLED:         "Cancelled",
};

// Ordered workflow steps for the progress stepper
const WORKFLOW_STEPS = [
  { key: "NEW",               label: "Submitted",         icon: FileText },
  { key: "ASSIGNED",          label: "Assigned",          icon: UserCheck },
  { key: "IN_PROGRESS",       label: "In Progress",       icon: Zap },
  { key: "DESIGNER_DONE",     label: "Designer Done",     icon: CheckCheck },
  { key: "IN_REVIEW",         label: "In Review",         icon: Eye },
  { key: "CHANGES_REQUESTED", label: "Changes Requested", icon: RotateCcw },
  { key: "APPROVED",          label: "Approved",          icon: ThumbsUp },
  { key: "FINAL_DONE",        label: "Final Done",        icon: BadgeCheck },
];

const POC_ROLE_LABELS: Record<string, string> = {
  DESIGN: "Design POC", SOCIAL: "Social POC", OTHER: "POC",
};
const POC_ROLE_COLORS: Record<string, string> = {
  DESIGN: "bg-purple-100 text-purple-700", SOCIAL: "bg-green-100 text-green-700", OTHER: "bg-gray-100 text-gray-600",
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

interface DesignPOC {
  id: string;
  userId: string;
  role: "DESIGN" | "SOCIAL" | "OTHER";
  addedAt: string;
  user: { id: string; name: string; email: string; department?: string };
}

interface DesignReviewCycle {
  id: string;
  reviewedById: string;
  action: "APPROVED" | "CHANGES_REQUESTED";
  note?: string;
  cycleNumber: number;
  createdAt: string;
  reviewedBy: { id: string; name: string };
}

interface DesignNote {
  id: string; body: string; isSystem: boolean; authorId?: string; createdAt: string;
}

interface DesignReq {
  id: string; refId: string; title: string; brief: string;
  type: string; requestingTeam: string; requesterName?: string; subTeam?: string;
  priority: string; status: string; dueDate?: string;
  submittedAt: string;
  designerDoneAt?: string;
  changesRequestedAt?: string;
  approvedAt?: string;
  finalDoneAt?: string;
  deliveredAt?: string;
  tatHours?: number;
  reviewCycleCount?: number;
  assignedTo?: { id: string; name: string } | null;
  requestedBy?: { id: string; name: string } | null;
  revisionCount: number;
  pocs?: DesignPOC[];
  reviewCycles?: DesignReviewCycle[];
  notes?: DesignNote[];
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

const TERMINAL_STATUSES = ["DELIVERED", "FINAL_DONE", "CANCELLED", "APPROVED"];

function isOverdue(req: DesignReq) {
  if (!req.dueDate) return false;
  if (TERMINAL_STATUSES.includes(req.status)) return false;
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

  const [requests,       setRequests]       = useState<DesignReq[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showNew,        setShowNew]        = useState(false);
  const [selectedReqId,  setSelectedReqId]  = useState<string | null>(null);

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
        {activeTab === "requests"  && <RequestsTab  requests={requests} loading={loading} onRefresh={load} onNew={() => setShowNew(true)} onSelect={setSelectedReqId}/>}
        {activeTab === "calendar"  && <CalendarTab/>}
        {activeTab === "my-work"   && <MyWorkTab onSelect={setSelectedReqId}/>}
      </div>

      {showNew && <NewRequestModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }}/>}

      {selectedReqId && (
        <RequestDetailDrawer
          requestId={selectedReqId}
          onClose={() => setSelectedReqId(null)}
          onUpdated={() => { load(); }}
        />
      )}
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

function RequestsTab({ requests, loading, onRefresh, onNew, onSelect }: {
  requests: DesignReq[]; loading: boolean; onRefresh: () => void; onNew: () => void;
  onSelect: (id: string) => void;
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
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Team</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Due</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Designer</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">POCs</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"/>
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
              const pocs    = r.pocs ?? [];
              const cycles  = r.reviewCycleCount ?? 0;
              return (
                <tr key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={cn(
                    "hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer",
                    overdue && "bg-red-50/40 dark:bg-red-900/10"
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.refId}</td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.revisionCount > 0 && <span className="text-[10px] text-amber-600">↻ {r.revisionCount} rev</span>}
                      {cycles > 0 && <span className="text-[10px] text-orange-500">🔄 {cycles} review{cycles > 1 ? "s" : ""}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><TeamBadge team={r.requestingTeam}/></td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{TYPE_LABELS[r.type] ?? r.type}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.dueDate
                      ? <span className={cn(overdue ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400")}>
                          {format(parseISO(r.dueDate), "d MMM")}{overdue && " ⚠️"}
                        </span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {r.assignedTo?.name ?? <span className="text-gray-300 dark:text-gray-600">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    {pocs.length === 0
                      ? <span className="text-[10px] text-gray-300">None</span>
                      : <div className="flex flex-wrap gap-1">
                          {pocs.slice(0, 2).map(p => (
                            <span key={p.id} className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", POC_ROLE_COLORS[p.role])}>
                              {p.user.name.split(" ")[0]}
                            </span>
                          ))}
                          {pocs.length > 2 && <span className="text-[10px] text-gray-400">+{pocs.length - 2}</span>}
                        </div>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status}/></td>
                  <td className="px-4 py-3 text-gray-300 dark:text-gray-600"><ChevronRight size={14}/></td>
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
  const [dragging,     setDragging]     = useState(false);
  const [file,         setFile]         = useState<File | null>(null);
  const [importing,    setImporting]    = useState(false);
  const [result,       setResult]       = useState<{
    summary: { total: number; created: number; skipped: number; errors: number };
    results: { row: number; title: string; status: "created"|"skipped"|"error"; reason?: string }[];
  } | null>(null);
  const [importError,  setImportError]  = useState("");

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const f = files[0];
    if (!f.name.match(/\.(xlsx?|csv)$/i)) {
      setImportError("Please upload an .xlsx or .csv file.");
      return;
    }
    setFile(f);
    setResult(null);
    setImportError("");
  }

  async function doImport() {
    if (!file) return;
    setImporting(true);
    setImportError("");
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/design-ops/calendar/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setImportError(data.error ?? "Import failed"); return; }
      setResult(data);
    } catch (e: any) {
      setImportError(e.message ?? "Network error");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    window.open("/api/design-ops/calendar/template", "_blank");
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Import Content Calendar</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Upload an XLSX or CSV to bulk-add calendar entries</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-700"
        >
          <Download size={15}/> Download Template
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer",
          dragging
            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
            : file
            ? "border-green-300 bg-green-50 dark:bg-green-900/10"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
        )}
        onClick={() => {
          const inp = document.createElement("input");
          inp.type = "file";
          inp.accept = ".xlsx,.xls,.csv";
          inp.onchange = (e) => handleFiles((e.target as HTMLInputElement).files);
          inp.click();
        }}
      >
        {file ? (
          <>
            <FileUp size={32} className="mx-auto text-green-500 mb-2"/>
            <p className="font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
            <p className="text-sm text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · click to change</p>
          </>
        ) : (
          <>
            <Upload size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2"/>
            <p className="font-medium text-gray-600 dark:text-gray-300">Drag & drop your file here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse · .xlsx or .csv</p>
          </>
        )}
      </div>

      {/* Error */}
      {importError && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="shrink-0 mt-0.5"/> {importError}
        </div>
      )}

      {/* Import button */}
      {file && !result && (
        <button
          onClick={doImport}
          disabled={importing}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors shadow-sm"
        >
          {importing ? <Loader2 size={15} className="animate-spin"/> : <FileUp size={15}/>}
          {importing ? "Importing…" : "Import Now"}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm font-medium text-green-700 dark:text-green-400">
              <CheckCheck size={15}/> {result.summary.created} created
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-medium text-amber-700 dark:text-amber-400">
              <SkipForward size={15}/> {result.summary.skipped} skipped
            </div>
            {result.summary.errors > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-700 dark:text-red-400">
                <XCircle size={15}/> {result.summary.errors} errors
              </div>
            )}
          </div>

          {/* Row-level results */}
          {result.results.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 max-h-72 overflow-y-auto">
              {result.results.map((r, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span className="text-xs text-gray-400 w-8 shrink-0 pt-0.5">r{r.row}</span>
                  {r.status === "created"
                    ? <CheckCircle2 size={14} className="shrink-0 text-green-500 mt-0.5"/>
                    : r.status === "skipped"
                    ? <SkipForward  size={14} className="shrink-0 text-amber-400 mt-0.5"/>
                    : <XCircle      size={14} className="shrink-0 text-red-500 mt-0.5"/>}
                  <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{r.title}</span>
                  {r.reason && <span className="text-xs text-gray-400 shrink-0 ml-2">{r.reason}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Import another */}
          <button
            onClick={() => { setFile(null); setResult(null); setImportError(""); }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Import another file
          </button>
        </div>
      )}

      {/* Link to live calendar */}
      <div className="flex items-center gap-2 text-sm text-gray-400 pt-1">
        <CalendarDays size={13}/>
        <a href="/social/calendar" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          View the live content calendar <ArrowUpRight size={12} className="inline"/>
        </a>
      </div>
    </div>
  );
}

// ── MY WORK TAB ───────────────────────────────────────────────────────────

function MyWorkTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [users,        setUsers]        = useState<{id:string;name:string}[]>([]);
  const [userId,       setUserId]       = useState("");
  const [myRequests,   setMyRequests]   = useState<DesignReq[]>([]);
  const [loadingReqs,  setLoadingReqs]  = useState(false);
  // Map of requestId → new status update ("" means no change, "DELIVERED" etc)
  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({});
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [hours,        setHours]        = useState("");
  const [saving,       setSaving]       = useState(false);
  const [done,         setDone]         = useState(false);

  // Load designer list (Design + Video teams)
  useEffect(() => {
    fetch("/api/team").then(r => r.json()).then(data => {
      const designers = data.filter((u: any) =>
        ["Design","Video"].includes(u.department ?? "")
      );
      setUsers(designers);
    }).catch(() => {});
  }, []);

  // Load that designer's active requests when userId changes
  useEffect(() => {
    if (!userId) { setMyRequests([]); return; }
    setLoadingReqs(true);
    fetch(`/api/design-ops/requests?assignedToId=${userId}`)
      .then(r => r.json())
      .then(data => {
        // Show active requests (not fully complete or cancelled)
        setMyRequests(
          (Array.isArray(data) ? data : [])
            .filter((r: DesignReq) => !["DELIVERED","FINAL_DONE","CANCELLED","APPROVED"].includes(r.status))
        );
        setSelectedIds(new Set());
        setStatusUpdates({});
      })
      .catch(() => {})
      .finally(() => setLoadingReqs(false));
  }, [userId]);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    if (!userId || selectedIds.size === 0) return;
    setSaving(true);

    // Update status for each selected request that has a status change
    await Promise.all(
      Array.from(selectedIds).map(async id => {
        const newStatus = statusUpdates[id];
        if (newStatus) {
          await fetch(`/api/team/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
        }
      })
    );

    // Save daily log with selected request IDs as summary
    const selectedTitles = myRequests
      .filter(r => selectedIds.has(r.id))
      .map(r => r.title)
      .join("; ");

    await fetch("/api/design-ops/daily-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        summary: selectedTitles,
        hoursWorked: hours ? parseFloat(hours) : null,
        requestIds: Array.from(selectedIds),
      }),
    });

    setSaving(false);
    setDone(true);
    setSelectedIds(new Set());
    setStatusUpdates({});
    setHours("");
    // Reload requests
    const fresh = await fetch(`/api/design-ops/requests?assignedToId=${userId}`).then(r => r.json());
    setMyRequests(
      (Array.isArray(fresh) ? fresh : [])
        .filter((r: DesignReq) => !["DELIVERED","FINAL_DONE","CANCELLED","APPROVED"].includes(r.status))
    );
    setTimeout(() => setDone(false), 3000);
  }

  const WORK_STATUSES = [
    { value: "",              label: "No change" },
    { value: "IN_PROGRESS",   label: "Still in progress" },
    { value: "DESIGNER_DONE", label: "Done — ready for review ✓" },
    { value: "IN_REVIEW",     label: "Sent for review" },
    { value: "FINAL_DONE",    label: "Final Done ✅" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Step 1 — Pick designer */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Step 1 — Select Designer</p>
        <select value={userId} onChange={e => setUserId(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">Choose a designer…</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {/* Step 2 — Pick requests worked on today */}
      {userId && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Step 2 — What did you work on today?</p>
            {myRequests.length > 0 && (
              <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
            )}
          </div>

          {loadingReqs && (
            <div className="flex items-center gap-2 py-6 justify-center text-gray-400 text-sm">
              <Loader2 size={15} className="animate-spin"/> Loading requests…
            </div>
          )}

          {!loadingReqs && myRequests.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 size={28} className="mx-auto text-green-400 mb-2"/>
              <p className="text-sm text-gray-500 dark:text-gray-400">No active requests assigned to this designer.</p>
            </div>
          )}

          {!loadingReqs && myRequests.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {myRequests.map(r => {
                const selected = selectedIds.has(r.id);
                return (
                  <div key={r.id}
                    className={cn(
                      "rounded-xl border p-3 transition-all cursor-pointer select-none",
                      selected
                        ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700"
                        : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
                    )}
                    onClick={() => toggleSelect(r.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                        selected
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-gray-300 dark:border-gray-600"
                      )}>
                        {selected && <Check size={11} className="text-white"/>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.title}</p>
                          <span className="text-[10px] font-mono text-gray-400">{r.refId}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <TeamBadge team={r.requestingTeam}/>
                          <StatusBadge status={r.status}/>
                          {r.dueDate && (
                            <span className={cn("text-[10px]", isOverdue(r) ? "text-red-500 font-semibold" : "text-gray-400")}>
                              Due {format(parseISO(r.dueDate), "d MMM")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status update dropdown + View details — only show when selected */}
                    {selected && (
                      <div className="mt-3 ml-8 space-y-2" onClick={e => e.stopPropagation()}>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Update status to</label>
                          <select
                            value={statusUpdates[r.id] ?? ""}
                            onChange={e => setStatusUpdates(p => ({ ...p, [r.id]: e.target.value }))}
                            className="w-full border border-indigo-200 dark:border-indigo-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            {WORK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                        <button
                          onClick={() => onSelect(r.id)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Eye size={11}/> View full details, POCs &amp; review history
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Hours + save */}
      {userId && selectedIds.size > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Step 3 — Wrap Up</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Hours worked today <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input type="number" value={hours} onChange={e => setHours(e.target.value)}
                min="0" max="24" step="0.5" placeholder="e.g. 7.5"
                className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors whitespace-nowrap">
              {saving
                ? <><Loader2 size={14} className="animate-spin"/> Saving…</>
                : done
                  ? "✓ Saved!"
                  : `Save ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`
              }
            </button>
          </div>
        </div>
      )}
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

// ── REQUEST DETAIL DRAWER ─────────────────────────────────────────────────
// Side drawer that shows full request details, workflow progress, POC
// management, and review actions (approve / request changes).

function RequestDetailDrawer({
  requestId,
  onClose,
  onUpdated,
}: {
  requestId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [req,          setReq]          = useState<DesignReq | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [allUsers,     setAllUsers]     = useState<{id:string;name:string;department?:string}[]>([]);
  const [pocUserId,    setPocUserId]    = useState("");
  const [pocRole,      setPocRole]      = useState<"DESIGN"|"SOCIAL"|"OTHER">("SOCIAL");
  const [addingPOC,    setAddingPOC]    = useState(false);
  const [reviewNote,   setReviewNote]   = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [statusAction, setStatusAction] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchReq = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/design-ops/requests/${requestId}`);
      if (res.ok) setReq(await res.json());
    } catch {}
    setLoading(false);
  }, [requestId]);

  useEffect(() => { fetchReq(); }, [fetchReq]);

  useEffect(() => {
    fetch("/api/team").then(r => r.json()).then(data => {
      setAllUsers(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  async function handleReview(action: "APPROVED" | "CHANGES_REQUESTED") {
    if (!req) return;
    setSubmitting(true);
    await fetch(`/api/design-ops/requests/${requestId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: reviewNote || undefined }),
    });
    setReviewNote("");
    await fetchReq();
    onUpdated();
    setSubmitting(false);
  }

  async function handleAddPOC() {
    if (!pocUserId) return;
    setAddingPOC(true);
    await fetch(`/api/design-ops/requests/${requestId}/pocs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: pocUserId, role: pocRole }),
    });
    setPocUserId("");
    await fetchReq();
    onUpdated();
    setAddingPOC(false);
  }

  async function handleRemovePOC(userId: string) {
    await fetch(`/api/design-ops/requests/${requestId}/pocs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await fetchReq();
    onUpdated();
  }

  async function handleStatusUpdate() {
    if (!statusAction) return;
    setUpdatingStatus(true);
    await fetch(`/api/design-ops/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusAction }),
    });
    setStatusAction("");
    await fetchReq();
    onUpdated();
    setUpdatingStatus(false);
  }

  // Determine which workflow step is current
  const stepIndex = req
    ? WORKFLOW_STEPS.findIndex(s => s.key === req.status)
    : -1;

  const existingPOCIds = new Set((req?.pocs ?? []).map(p => p.userId));
  const availableUsers = allUsers.filter(u => !existingPOCIds.has(u.id));

  // Which status transitions are valid from current status
  const validNextStatuses: Record<string, string[]> = {
    NEW:               ["ASSIGNED", "CANCELLED"],
    ASSIGNED:          ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS:       ["DESIGNER_DONE", "CANCELLED"],
    DESIGNER_DONE:     ["IN_REVIEW", "IN_PROGRESS"],
    IN_REVIEW:         ["APPROVED", "CHANGES_REQUESTED"],
    CHANGES_REQUESTED: ["IN_PROGRESS"],
    APPROVED:          ["FINAL_DONE"],
    FINAL_DONE:        [],
    REVIEW:            ["DELIVERED", "CANCELLED"],
    DELIVERED:         [],
    CANCELLED:         [],
  };

  const nextStatuses = req ? (validNextStatuses[req.status] ?? []) : [];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose}/>

      {/* Drawer */}
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex-1 min-w-0 pr-4">
            {loading ? (
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"/>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{req?.refId}</span>
                  {req && <StatusBadge status={req.status}/>}
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{req?.title}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {req && REQUESTING_TEAMS[req.requestingTeam]?.label} · {req && TYPE_LABELS[req.type]}
                  {req?.assignedTo && <> · <span className="text-indigo-600 dark:text-indigo-400">{req.assignedTo.name}</span></>}
                </p>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 shrink-0">
            <X size={16}/>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 py-20 text-gray-400">
            <Loader2 size={24} className="animate-spin"/>
          </div>
        ) : req ? (
          <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">

            {/* ── Workflow progress stepper ─────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Workflow Progress</p>
              <div className="flex items-start gap-0">
                {WORKFLOW_STEPS.filter(s => !["REVIEW","DELIVERED"].includes(s.key)).map((step, i, arr) => {
                  const Icon   = step.icon;
                  const done   = stepIndex > i;
                  const active = stepIndex === i;
                  const isLast = i === arr.length - 1;
                  return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                          done   ? "bg-green-500 border-green-500 text-white" :
                          active ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900" :
                                   "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                        )}>
                          {done ? <Check size={14}/> : <Icon size={13}/>}
                        </div>
                        <span className={cn(
                          "text-[9px] font-semibold mt-1 text-center leading-tight max-w-[56px]",
                          active ? "text-indigo-600 dark:text-indigo-400" :
                          done   ? "text-green-600 dark:text-green-400" : "text-gray-400"
                        )}>{step.label}</span>
                      </div>
                      {!isLast && (
                        <div className={cn(
                          "flex-1 h-0.5 mb-5 mx-1",
                          done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                        )}/>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Quick status update ───────────────────────────────────── */}
            {nextStatuses.length > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                  <Flag size={12}/> Move Status
                </p>
                <div className="flex gap-2">
                  <select
                    value={statusAction}
                    onChange={e => setStatusAction(e.target.value)}
                    className="flex-1 border border-indigo-200 dark:border-indigo-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white"
                  >
                    <option value="">Select next status…</option>
                    {nextStatuses.map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={!statusAction || updatingStatus}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    {updatingStatus ? <Loader2 size={14} className="animate-spin"/> : "Update"}
                  </button>
                </div>
              </div>
            )}

            {/* ── POC Management ────────────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users size={11}/> Points of Contact
              </p>

              {/* Current POCs */}
              {(req.pocs ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 mb-3">No POCs assigned yet.</p>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {(req.pocs ?? []).map(poc => (
                    <div key={poc.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", POC_ROLE_COLORS[poc.role])}>
                          {POC_ROLE_LABELS[poc.role]}
                        </span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{poc.user.name}</span>
                        {poc.user.department && (
                          <span className="text-xs text-gray-400">· {poc.user.department}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemovePOC(poc.userId)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <X size={13}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add POC */}
              <div className="flex gap-2">
                <select
                  value={pocRole}
                  onChange={e => setPocRole(e.target.value as any)}
                  className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white"
                >
                  <option value="SOCIAL">Social POC</option>
                  <option value="DESIGN">Design POC</option>
                  <option value="OTHER">Other POC</option>
                </select>
                <select
                  value={pocUserId}
                  onChange={e => setPocUserId(e.target.value)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white"
                >
                  <option value="">Add person as POC…</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ""}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddPOC}
                  disabled={!pocUserId || addingPOC}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-medium"
                >
                  {addingPOC ? <Loader2 size={12} className="animate-spin"/> : <><UserPlus size={12}/> Add</>}
                </button>
              </div>
            </div>

            {/* ── Review Panel (for IN_REVIEW / DESIGNER_DONE) ──────────── */}
            {["DESIGNER_DONE", "IN_REVIEW"].includes(req.status) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={13}/> Review this work
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                  {req.status === "DESIGNER_DONE"
                    ? "The designer has marked this as done. Review the work and approve or request changes."
                    : "This is currently in review. Submit your decision below."}
                </p>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Add feedback or notes (required if requesting changes)…"
                  rows={3}
                  className="w-full border border-amber-200 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white mb-3 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview("CHANGES_REQUESTED")}
                    disabled={submitting || !reviewNote.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 font-semibold text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-40 transition-colors"
                  >
                    <RotateCcw size={14}/> Request Changes
                  </button>
                  <button
                    onClick={() => handleReview("APPROVED")}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
                  >
                    <ThumbsUp size={14}/> Approve
                  </button>
                </div>
                {submitting && <p className="text-xs text-center text-gray-400 mt-2">Submitting…</p>}
              </div>
            )}

            {/* ── Review Cycle History ──────────────────────────────────── */}
            {(req.reviewCycles ?? []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Milestone size={11}/> Review History ({req.reviewCycles!.length} cycle{req.reviewCycles!.length > 1 ? "s" : ""})
                </p>
                <div className="space-y-2">
                  {req.reviewCycles!.map(cycle => (
                    <div key={cycle.id} className={cn(
                      "rounded-lg px-3 py-2.5 border-l-2",
                      cycle.action === "APPROVED"
                        ? "bg-green-50 dark:bg-green-900/20 border-green-400"
                        : "bg-orange-50 dark:bg-orange-900/20 border-orange-400"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {cycle.action === "APPROVED"
                            ? <ThumbsUp size={12} className="text-green-600"/>
                            : <RotateCcw size={12} className="text-orange-600"/>}
                          <span className={cn(
                            "text-xs font-bold",
                            cycle.action === "APPROVED" ? "text-green-700 dark:text-green-400" : "text-orange-700 dark:text-orange-400"
                          )}>
                            {cycle.action === "APPROVED" ? "Approved" : "Changes Requested"}
                          </span>
                          <span className="text-[10px] text-gray-400">— Cycle {cycle.cycleNumber}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{cycle.reviewedBy.name}</p>
                          <p className="text-[10px] text-gray-400">{format(parseISO(cycle.createdAt), "d MMM, h:mm a")}</p>
                        </div>
                      </div>
                      {cycle.note && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 italic">"{cycle.note}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Timeline / Notes ─────────────────────────────────────── */}
            {(req.notes ?? []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MessageSquare size={11}/> Activity Log
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {[...(req.notes ?? [])].reverse().map(note => (
                    <div key={note.id} className={cn(
                      "text-xs px-3 py-2 rounded-lg",
                      note.isSystem
                        ? "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <p>{note.body}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {format(parseISO(note.createdAt), "d MMM")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Key timestamps ────────────────────────────────────────── */}
            <div className="text-xs text-gray-400 space-y-0.5 border-t border-gray-100 dark:border-gray-700 pt-4">
              <p>Submitted: {format(parseISO(req.submittedAt), "d MMM yyyy, h:mm a")}</p>
              {req.designerDoneAt && <p>Designer Done: {format(parseISO(req.designerDoneAt), "d MMM yyyy, h:mm a")}</p>}
              {req.changesRequestedAt && <p>Last Changes Requested: {format(parseISO(req.changesRequestedAt), "d MMM yyyy, h:mm a")}</p>}
              {req.approvedAt && <p>Approved: {format(parseISO(req.approvedAt), "d MMM yyyy, h:mm a")}</p>}
              {req.finalDoneAt && <p>Final Done: {format(parseISO(req.finalDoneAt), "d MMM yyyy, h:mm a")}</p>}
              {req.tatHours && <p>TAT: <span className="font-medium text-gray-600 dark:text-gray-300">{req.tatHours}h</span></p>}
              {(req.reviewCycleCount ?? 0) > 0 && <p>Review cycles: {req.reviewCycleCount}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 py-20 text-sm text-red-400">Request not found.</div>
        )}
      </div>
    </div>
  );
}
