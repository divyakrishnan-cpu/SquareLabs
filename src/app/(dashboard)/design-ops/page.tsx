"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutGrid, List, BarChart2, Plus, RefreshCw, Loader2,
  ChevronDown, AlertTriangle, Clock, CheckCircle2,
  Filter, Search, X, FileVideo, Image as ImageIcon,
  Users, TrendingUp, Circle, ArrowRight, Edit2, MessageSquare,
  Send, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type Status      = "NEW" | "ASSIGNED" | "IN_PROGRESS" | "REVIEW" | "DELIVERED" | "CANCELLED";
type ReqType     = "VIDEO_EDIT" | "VIDEO_SHOOT" | "GRAPHIC_SOCIAL" | "GRAPHIC_CAMPAIGN" | "OTHER";
type ReqTeam     = "SOCIAL" | "PAID_CAMPAIGN" | "MARKETING" | "HR" | "OTHER";
type Priority    = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Designer { id: string; name: string; email: string; activeRequests: number; }

interface DesignRequest {
  id:             string;
  refId:          string;
  title:          string;
  brief:          string;
  type:           ReqType;
  requestingTeam: ReqTeam;
  priority:       Priority;
  status:         Status;
  dueDate:        string | null;
  referenceLinks: string | null;
  tatHours:       number | null;
  revisionCount:  number;
  submittedAt:    string;
  assignedAt:     string | null;
  startedAt:      string | null;
  reviewAt:       string | null;
  deliveredAt:    string | null;
  requestedBy:    { id: string; name: string } | null;
  assignedTo:     { id: string; name: string } | null;
  notes:          { id: string; body: string; isSystem: boolean; createdAt: string }[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: string; target?: string }> = {
  NEW:         { label: "New",         color: "text-indigo-700", bg: "bg-indigo-50",  icon: "🆕" },
  ASSIGNED:    { label: "Assigned",    color: "text-blue-700",   bg: "bg-blue-50",    icon: "📋" },
  IN_PROGRESS: { label: "In Progress", color: "text-yellow-700", bg: "bg-yellow-50",  icon: "⚙️" },
  REVIEW:      { label: "Review",      color: "text-orange-700", bg: "bg-orange-50",  icon: "👁️" },
  DELIVERED:   { label: "Delivered",   color: "text-green-700",  bg: "bg-green-50",   icon: "✅" },
  CANCELLED:   { label: "Cancelled",   color: "text-gray-500",   bg: "bg-gray-100",   icon: "🚫" },
};

const TYPE_CONFIG: Record<ReqType, { label: string; icon: string; target: number }> = {
  VIDEO_EDIT:       { label: "Video Edit",       icon: "🎬", target: 48 },
  VIDEO_SHOOT:      { label: "Video Shoot+Edit", icon: "🎥", target: 72 },
  GRAPHIC_SOCIAL:   { label: "Graphic – Social", icon: "🖼️", target: 24 },
  GRAPHIC_CAMPAIGN: { label: "Graphic – Ads",    icon: "📣", target: 24 },
  OTHER:            { label: "Other",            icon: "📝", target: 48 },
};

const TEAM_CONFIG: Record<ReqTeam, { label: string; color: string }> = {
  SOCIAL:        { label: "Social",      color: "bg-blue-100 text-blue-700" },
  PAID_CAMPAIGN: { label: "Paid",        color: "bg-orange-100 text-orange-700" },
  MARKETING:     { label: "Marketing",   color: "bg-gray-100 text-gray-700" },
  HR:            { label: "HR",          color: "bg-purple-100 text-purple-700" },
  OTHER:         { label: "Other",       color: "bg-gray-100 text-gray-600" },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string }> = {
  LOW:    { label: "Low",    dot: "bg-gray-400"  },
  MEDIUM: { label: "Normal", dot: "bg-gray-400"  },
  HIGH:   { label: "High",   dot: "bg-yellow-500" },
  URGENT: { label: "Urgent", dot: "bg-red-500"   },
};

const KANBAN_ORDER: Status[] = ["NEW", "ASSIGNED", "IN_PROGRESS", "REVIEW", "DELIVERED"];

// ── Utility ────────────────────────────────────────────────────────────────

function elapsedHours(from: string | null): number {
  if (!from) return 0;
  return (Date.now() - new Date(from).getTime()) / 3_600_000;
}

function isOverdue(r: DesignRequest): boolean {
  if (!r.dueDate) return false;
  if (r.status === "DELIVERED" || r.status === "CANCELLED") return false;
  return new Date(r.dueDate) < new Date();
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-700",
];

function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════

export default function DesignOpsPage() {
  const [view, setView]           = useState<"board" | "list" | "analytics">("board");
  const [requests, setRequests]   = useState<DesignRequest[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<DesignRequest | null>(null);
  const [showForm, setShowForm]   = useState(false);

  // Filters
  const [filterType,    setFilterType]    = useState("");
  const [filterTeam,    setFilterTeam]    = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterSearch,  setFilterSearch]  = useState("");

  // ── Data loading ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType)    params.set("type",           filterType);
      if (filterTeam)    params.set("requestingTeam", filterTeam);
      if (filterAssignee) params.set("assignedToId",  filterAssignee);
      if (filterSearch)  params.set("search",         filterSearch);

      const [rRes, dRes] = await Promise.all([
        fetch(`/api/design-ops/requests?${params}`),
        fetch("/api/design-ops/designers"),
      ]);
      const [rData, dData] = await Promise.all([rRes.json(), dRes.json()]);
      setRequests(Array.isArray(rData) ? rData : []);
      setDesigners(Array.isArray(dData) ? dData : []);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterTeam, filterAssignee, filterSearch]);

  useEffect(() => { load(); }, [load]);

  // ── Grouped for kanban ──────────────────────────────────────────────────
  const grouped = KANBAN_ORDER.reduce<Record<Status, DesignRequest[]>>((acc, s) => {
    acc[s] = requests.filter(r => r.status === s);
    return acc;
  }, {} as Record<Status, DesignRequest[]>);

  const overdueCount = requests.filter(isOverdue).length;

  // ── Status update helper ────────────────────────────────────────────────
  async function updateStatus(id: string, status: Status, extra?: Record<string, unknown>) {
    await fetch(`/api/design-ops/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    load();
    if (selected?.id === id) {
      const res = await fetch(`/api/design-ops/requests/${id}`);
      setSelected(await res.json());
    }
  }

  async function assignTo(id: string, assignedToId: string) {
    const d = designers.find(d => d.id === assignedToId);
    await fetch(`/api/design-ops/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId, assigneeName: d?.name ?? assignedToId }),
    });
    load();
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Design Ops Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            End-to-end design request tracking with TAT analytics
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
            {(["board", "list", "analytics"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  view === v
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                )}>
                {v === "board" ? <><LayoutGrid size={12} className="inline mr-1"/>Board</> :
                 v === "list"  ? <><List size={12} className="inline mr-1"/>List</> :
                 <><BarChart2 size={12} className="inline mr-1"/>Analytics</>}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""}/>
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus size={14}/> New Request
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active", val: requests.filter(r => !["DELIVERED","CANCELLED"].includes(r.status)).length, color: "text-blue-600" },
          { label: "Overdue", val: overdueCount, color: overdueCount > 0 ? "text-red-600" : "text-gray-600" },
          { label: "In Review", val: requests.filter(r => r.status === "REVIEW").length, color: "text-orange-600" },
          { label: "Delivered (total)", val: requests.filter(r => r.status === "DELIVERED").length, color: "text-green-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={cn("text-2xl font-bold mt-0.5", color)}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input placeholder="Search requests…" value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">All Teams</option>
          {Object.entries(TEAM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">All Assignees</option>
          {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {(filterType || filterTeam || filterAssignee || filterSearch) && (
          <button onClick={() => { setFilterType(""); setFilterTeam(""); setFilterAssignee(""); setFilterSearch(""); }}
            className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
            <X size={11}/> Clear
          </button>
        )}
      </div>

      {/* ── BOARD VIEW ────────────────────────────────────────────────── */}
      {view === "board" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3" style={{ minWidth: "900px" }}>
            {KANBAN_ORDER.map(status => {
              const cfg = STATUS_CONFIG[status];
              const cols = grouped[status] ?? [];
              return (
                <div key={status} className="flex-1 min-w-[175px]">
                  <div className={cn("rounded-xl p-3", "bg-gray-100 dark:bg-gray-800/60")}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        {cfg.icon} {cfg.label}
                      </span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                        {cols.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {cols.map(r => (
                        <KanbanCard key={r.id} request={r} onClick={() => setSelected(r)} />
                      ))}
                      {cols.length === 0 && (
                        <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-600">
                          Nothing here
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Team</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
                <th>TAT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400"><Loader2 size={16} className="animate-spin inline mr-2"/>Loading…</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No requests found</td></tr>
              ) : requests.map(r => {
                const tc = TYPE_CONFIG[r.type];
                const sc = STATUS_CONFIG[r.status];
                const pc = PRIORITY_CONFIG[r.priority];
                const overdue = isOverdue(r);
                return (
                  <tr key={r.id} onClick={() => setSelected(r)} className="cursor-pointer">
                    <td className="font-mono text-xs text-gray-400">{r.refId}</td>
                    <td>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{r.title}</span>
                      {overdue && <span className="ml-2 text-[10px] text-red-600 font-bold">OVERDUE</span>}
                    </td>
                    <td><span className="text-xs">{tc.icon} {tc.label}</span></td>
                    <td>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", TEAM_CONFIG[r.requestingTeam].color)}>
                        {TEAM_CONFIG[r.requestingTeam].label}
                      </span>
                    </td>
                    <td>
                      {r.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold", avatarColor(r.assignedTo.name))}>
                            {initials(r.assignedTo.name)}
                          </div>
                          <span className="text-xs">{r.assignedTo.name}</span>
                        </div>
                      ) : <span className="text-xs text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", pc.dot)}/>
                        <span className="text-xs">{pc.label}</span>
                      </div>
                    </td>
                    <td>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", sc.bg, sc.color)}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td className={cn("text-xs", overdue ? "text-red-600 font-semibold" : "")}>
                      {formatDate(r.dueDate)}
                    </td>
                    <td className="text-xs font-mono">
                      {r.tatHours != null
                        ? <span className={cn("font-bold", r.tatHours <= tc.target ? "text-green-600" : "text-red-500")}>{r.tatHours}h</span>
                        : r.status !== "DELIVERED" && r.startedAt
                        ? <span className="text-gray-400">{Math.round(elapsedHours(r.startedAt))}h…</span>
                        : "—"
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ANALYTICS VIEW ────────────────────────────────────────────── */}
      {view === "analytics" && (
        <AnalyticsView />
      )}

      {/* Detail modal */}
      {selected && (
        <RequestDetailModal
          request={selected}
          designers={designers}
          onClose={() => setSelected(null)}
          onRefresh={() => { load(); }}
          onStatusChange={updateStatus}
          onAssign={assignTo}
        />
      )}

      {/* New request form */}
      {showForm && (
        <NewRequestModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// KANBAN CARD
// ══════════════════════════════════════════════════════════════════════════

function KanbanCard({ request: r, onClick }: { request: DesignRequest; onClick: () => void }) {
  const tc = TYPE_CONFIG[r.type];
  const pc = PRIORITY_CONFIG[r.priority];
  const overdue = isOverdue(r);

  return (
    <div onClick={onClick}
      className={cn(
        "bg-white dark:bg-gray-700 border rounded-xl p-3 cursor-pointer transition-all",
        "hover:shadow-md hover:-translate-y-0.5",
        overdue ? "border-red-300 dark:border-red-700 border-l-4 border-l-red-500"
                : "border-gray-200 dark:border-gray-600"
      )}>
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{r.refId}</span>
        <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", pc.dot)} title={pc.label}/>
      </div>
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2 leading-snug line-clamp-2">{r.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-[10px] bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
          {tc.icon} {tc.label}
        </span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", TEAM_CONFIG[r.requestingTeam].color)}>
          {TEAM_CONFIG[r.requestingTeam].label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        {r.assignedTo ? (
          <div className="flex items-center gap-1">
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0", avatarColor(r.assignedTo.name))}>
              {initials(r.assignedTo.name)}
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[70px]">{r.assignedTo.name}</span>
          </div>
        ) : <span className="text-[10px] text-gray-400 italic">Unassigned</span>}
        <span className={cn("text-[10px]", overdue ? "text-red-600 font-bold" : "text-gray-400")}>
          {overdue ? "OVERDUE" : formatDate(r.dueDate)}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REQUEST DETAIL MODAL
// ══════════════════════════════════════════════════════════════════════════

function RequestDetailModal({
  request, designers, onClose, onRefresh, onStatusChange, onAssign,
}: {
  request:        DesignRequest;
  designers:      Designer[];
  onClose:        () => void;
  onRefresh:      () => void;
  onStatusChange: (id: string, s: Status, extra?: Record<string, unknown>) => Promise<void>;
  onAssign:       (id: string, uid: string) => Promise<void>;
}) {
  const [noteText,  setNoteText]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [assignId,  setAssignId]  = useState(request.assignedTo?.id ?? "");

  const tc = TYPE_CONFIG[request.type];
  const sc = STATUS_CONFIG[request.status];
  const overdue = isOverdue(request);

  const NEXT_STATUS: Partial<Record<Status, Status>> = {
    NEW:         "ASSIGNED",
    ASSIGNED:    "IN_PROGRESS",
    IN_PROGRESS: "REVIEW",
    REVIEW:      "DELIVERED",
  };
  const nextStatus = NEXT_STATUS[request.status];

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    await fetch(`/api/design-ops/requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    });
    setNoteText("");
    setSaving(false);
    onRefresh();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[11px] text-gray-400 font-mono">{request.refId}</span>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base mt-0.5">{request.title}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", sc.bg, sc.color)}>
                  {sc.icon} {sc.label}
                </span>
                {overdue && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">⚠ OVERDUE</span>}
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", TEAM_CONFIG[request.requestingTeam].color)}>
                  {TEAM_CONFIG[request.requestingTeam].label}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={18}/></button>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              ["Type",    `${tc.icon} ${tc.label}`],
              ["Target TAT", `${tc.target}h`],
              ["Priority", PRIORITY_CONFIG[request.priority].label],
              ["Due Date", formatDate(request.dueDate)],
              ["Submitted", formatDate(request.submittedAt)],
              ["TAT so far", request.tatHours != null ? `${request.tatHours}h` : request.startedAt ? `${Math.round(elapsedHours(request.startedAt))}h (live)` : "—"],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{val}</p>
              </div>
            ))}
          </div>

          {/* Brief */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Brief</p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {request.brief}
            </div>
          </div>

          {/* References */}
          {request.referenceLinks && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">References</p>
              <a href={request.referenceLinks} target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 hover:underline break-all">{request.referenceLinks}</a>
            </div>
          )}

          {/* Assign */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assigned To</p>
            <div className="flex gap-2">
              <select value={assignId} onChange={e => setAssignId(e.target.value)}
                className="flex-1 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Select designer —</option>
                {designers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.activeRequests} active)</option>
                ))}
              </select>
              <button onClick={() => assignId && onAssign(request.id, assignId)}
                disabled={!assignId}
                className="text-sm bg-blue-600 text-white px-4 rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700">
                Assign
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Timeline</p>
            <div className="space-y-1.5">
              {[
                ["Submitted",   request.submittedAt],
                ["Assigned",    request.assignedAt],
                ["In Progress", request.startedAt],
                ["Review",      request.reviewAt],
                ["Delivered",   request.deliveredAt],
              ].map(([label, ts]) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", ts ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600")}/>
                  <span className={cn("font-medium", ts ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-600")}>{label}</span>
                  <span className="ml-auto text-gray-400">{ts ? formatDate(ts) + ", " + new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes / Activity */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Activity</p>
            <div className="space-y-2 max-h-36 overflow-y-auto mb-3">
              {request.notes?.length === 0 && (
                <p className="text-xs text-gray-400 italic">No notes yet.</p>
              )}
              {request.notes?.map(n => (
                <div key={n.id} className={cn("text-xs px-3 py-2 rounded-lg", n.isSystem ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300")}>
                  <p>{n.body}</p>
                  <p className="text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note…"
                className="flex-1 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => e.key === "Enter" && addNote()} />
              <button onClick={addNote} disabled={saving || !noteText.trim()}
                className="px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button onClick={onClose} className="flex-1 text-sm border border-gray-200 dark:border-gray-600 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
              Close
            </button>
            {nextStatus && (
              <button
                onClick={() => onStatusChange(request.id, nextStatus)}
                className="flex-1 text-sm bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 font-semibold">
                {nextStatus === "ASSIGNED"    && "Assign →"}
                {nextStatus === "IN_PROGRESS" && "▶ Start Work"}
                {nextStatus === "REVIEW"      && "👁 Submit for Review"}
                {nextStatus === "DELIVERED"   && "✅ Mark Delivered"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// NEW REQUEST FORM MODAL
// ══════════════════════════════════════════════════════════════════════════

function NewRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm]   = useState({
    type:           "" as ReqType | "",
    title:          "",
    brief:          "",
    requestingTeam: "SOCIAL" as ReqTeam,
    priority:       "MEDIUM" as Priority,
    dueDate:        "",
    referenceLinks: "",
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    await fetch("/api/design-ops/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">New Design Request</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={18}/></button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                  step >= s ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500")}>
                  {s}
                </div>
                {s < 3 && <div className={cn("flex-1 h-0.5", step > s ? "bg-blue-400" : "bg-gray-200 dark:bg-gray-700")}/>}
              </div>
            ))}
          </div>

          {/* Step 1: Type */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">What do you need?</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPE_CONFIG).filter(([k]) => k !== "OTHER").map(([k, v]) => (
                  <button key={k} onClick={() => update("type", k)}
                    className={cn("border-2 rounded-xl p-3 text-left transition-all",
                      form.type === k
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                    )}>
                    <p className="text-xl mb-1">{v.icon}</p>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{v.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Target TAT: {v.target}h</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => form.type && setStep(2)} disabled={!form.type}
                  className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Title *</label>
                <input value={form.title} onChange={e => update("title", e.target.value)}
                  placeholder="e.g. Holi Campaign – Instagram Reel"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Team *</label>
                  <select value={form.requestingTeam} onChange={e => update("requestingTeam", e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {Object.entries(TEAM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Priority *</label>
                  <select value={form.priority} onChange={e => update("priority", e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => update("dueDate", e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Brief *</label>
                <textarea value={form.brief} onChange={e => update("brief", e.target.value)} rows={4}
                  placeholder="Describe exactly what you need, messaging, dimensions, brand guidelines…"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Reference Link <span className="text-gray-400 font-normal">(Drive / Figma)</span></label>
                <input value={form.referenceLinks} onChange={e => update("referenceLinks", e.target.value)}
                  placeholder="https://drive.google.com/…"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"/>
              </div>
              <div className="flex justify-between pt-1">
                <button onClick={() => setStep(1)} className="text-sm border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">← Back</button>
                <button onClick={() => form.title && form.brief && setStep(3)} disabled={!form.title || !form.brief}
                  className="bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Review & Submit</p>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 mb-4 text-sm">
                {[
                  ["Type",     `${TYPE_CONFIG[form.type as ReqType]?.icon} ${TYPE_CONFIG[form.type as ReqType]?.label}`],
                  ["Title",    form.title],
                  ["Team",     TEAM_CONFIG[form.requestingTeam]?.label],
                  ["Priority", PRIORITY_CONFIG[form.priority]?.label],
                  ["Due",      form.dueDate || "Not set"],
                  ["TAT Target", `${TYPE_CONFIG[form.type as ReqType]?.target}h`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{k}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 mb-4">
                📋 Design team lead will be notified. You'll get a confirmation once it's assigned (typically within 2 business hours).
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="text-sm border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">← Back</button>
                <button onClick={submit} disabled={saving}
                  className="bg-green-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
                  Submit Request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ANALYTICS VIEW (fetches from /api/design-ops/analytics)
// ══════════════════════════════════════════════════════════════════════════

function AnalyticsView() {
  const [period, setPeriod] = useState(30);
  const [data,   setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/design-ops/analytics?days=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [period]);

  if (loading || !data) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="animate-spin text-gray-400"/>
    </div>
  );

  const { tatStats, onTimePct, statusCounts, volumeByTeam, stageAvg, overdue, totalActive } = data;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setPeriod(d)}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
              period === d ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400")}>
            Last {d} days
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Requests</p>
          <p className="text-2xl font-bold text-blue-600 mt-0.5">{totalActive}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">On-time Delivery</p>
          <p className={cn("text-2xl font-bold mt-0.5", onTimePct >= 80 ? "text-green-600" : onTimePct >= 60 ? "text-orange-500" : "text-red-600")}>
            {onTimePct ?? "—"}{onTimePct != null ? "%" : ""}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Overdue Now</p>
          <p className={cn("text-2xl font-bold mt-0.5", overdue.length > 0 ? "text-red-600" : "text-green-600")}>{overdue.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Delivered ({period}d)</p>
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-0.5">{statusCounts?.DELIVERED ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* TAT per person */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-4">Avg TAT per Designer</h3>
          {tatStats.length === 0
            ? <p className="text-sm text-gray-400 italic">No completed requests in this period.</p>
            : <div className="space-y-3">
              {tatStats.map((s: any) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold", avatarColor(s.name))}>
                        {initials(s.name)}
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                      <span className="text-[10px] text-gray-400">{s.type === "video" ? "🎬" : "🖼️"} {s.count} jobs</span>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-xs font-bold", s.avgTat <= s.target ? "text-green-600" : "text-red-500")}>
                        {s.avgTat}h
                      </span>
                      <span className="text-[10px] text-gray-400"> / {s.target}h target</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className={cn("h-2 rounded-full", s.avgTat <= s.target ? "bg-green-500" : "bg-red-500")}
                      style={{ width: `${Math.min((s.avgTat / (s.target * 1.5)) * 100, 100)}%` }}/>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.onTimePct}% on time</p>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Bottleneck */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">Stage Bottleneck</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Avg hours spent in each stage</p>
          <div className="space-y-3">
            {[
              ["New → Assigned",    stageAvg?.newToAssigned,     2],
              ["Assigned → Start",  stageAvg?.assignedToStart,   3],
              ["Start → Review",    stageAvg?.startToReview,     36, true],
              ["Review → Delivered",stageAvg?.reviewToDelivered, 4],
            ].map(([label, val, warn, isBottleneck]) => (
              <div key={label as string}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={cn("text-gray-600 dark:text-gray-400", isBottleneck ? "font-semibold" : "")}>{label as string}</span>
                  <span className={cn("font-bold", val == null ? "text-gray-400" : Number(val) > Number(warn) ? "text-red-500" : "text-green-600")}>
                    {val != null ? `${val}h` : "No data"}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className={cn("h-2 rounded-full", Number(val) > Number(warn) ? "bg-red-400" : "bg-green-400")}
                    style={{ width: `${val != null ? Math.min((Number(val) / 50) * 100, 100) : 0}%` }}/>
                </div>
              </div>
            ))}
          </div>
          {stageAvg?.startToReview && stageAvg.startToReview > 36 && (
            <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-xs text-orange-700 dark:text-orange-300">
              💡 <strong>Bottleneck:</strong> Most time is spent in "In Progress." Consider daily check-ins for tasks running over 24h.
            </div>
          )}
        </div>
      </div>

      {/* Volume by team + overdue list */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-4">Requests by Team</h3>
          <div className="space-y-2">
            {Object.entries(volumeByTeam ?? {}).map(([team, { video, graphic }]: any) => (
              <div key={team}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={cn("font-medium px-1.5 py-0.5 rounded text-[10px]", TEAM_CONFIG[team as ReqTeam]?.color)}>
                    {TEAM_CONFIG[team as ReqTeam]?.label ?? team}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{video + graphic} total · {video}🎬 {graphic}🖼️</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <div className="bg-purple-400 h-2" style={{ width: `${(video / (video + graphic)) * 100}%` }}/>
                  <div className="bg-green-400 h-2" style={{ width: `${(graphic / (video + graphic)) * 100}%` }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-4">
            Overdue Requests <span className="text-red-500 font-bold">{overdue.length > 0 ? `(${overdue.length})` : ""}</span>
          </h3>
          {overdue.length === 0
            ? <p className="text-xs text-green-600 font-medium">🎉 No overdue requests!</p>
            : <div className="space-y-2">
              {overdue.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-xs border-l-2 border-red-400 pl-2">
                  <span className="font-mono text-gray-400">{r.refId}</span>
                  <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{r.title}</span>
                  <span className="text-red-500 font-semibold shrink-0">{formatDate(r.dueDate)}</span>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
