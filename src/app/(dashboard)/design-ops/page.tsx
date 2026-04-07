"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus, Search, RefreshCw, X, Loader2, Bell, BellDot,
  Video, Image, Megaphone, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, RotateCcw, Upload, Check, Eye, Film,
  Camera, Scissors, ThumbsUp, ThumbsDown, UserCheck, Zap,
  FileText, Users, XCircle, Flag, ChevronDown, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  SOCIAL_GRAPHICS: { label: "Social Graphics", icon: Image,     color: "bg-purple-100 text-purple-700" },
  VIDEO:           { label: "Video",            icon: Video,     color: "bg-blue-100 text-blue-700"    },
  PAID_CAMPAIGN:   { label: "Paid Campaign",    icon: Megaphone, color: "bg-orange-100 text-orange-700"},
};

const VIDEO_SUBTYPE_LABELS: Record<string, string> = {
  VERTICAL:   "Vertical (9:16)",
  HORIZONTAL: "Horizontal (16:9)",
};

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  INSTAGRAM: { label: "Instagram", color: "bg-pink-100 text-pink-700"    },
  YOUTUBE:   { label: "YouTube",   color: "bg-red-100 text-red-700"      },
  LINKEDIN:  { label: "LinkedIn",  color: "bg-blue-100 text-blue-800"    },
  FACEBOOK:  { label: "Facebook",  color: "bg-indigo-100 text-indigo-700"},
  WHATSAPP:  { label: "WhatsApp",  color: "bg-green-100 text-green-700"  },
  PINTEREST: { label: "Pinterest", color: "bg-rose-100 text-rose-700"    },
};

const POC_ROLE_META: Record<string, { label: string; color: string }> = {
  DESIGN:    { label: "Design POC",    color: "bg-purple-100 text-purple-700" },
  VIDEO:     { label: "Video POC",     color: "bg-blue-100 text-blue-700"    },
  CONTENT:   { label: "Content POC",   color: "bg-emerald-100 text-emerald-700"},
  SOCIAL:    { label: "Social POC",    color: "bg-pink-100 text-pink-700"    },
  UPLOADING: { label: "Uploading POC", color: "bg-amber-100 text-amber-700"  },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  NEW:                 { label: "New",                  color: "bg-gray-100 text-gray-600"     },
  ASSIGNED:            { label: "Assigned",              color: "bg-blue-100 text-blue-700"    },
  IN_PROGRESS:         { label: "In Progress",           color: "bg-indigo-100 text-indigo-700"},
  COMPLETED:           { label: "Completed",             color: "bg-cyan-100 text-cyan-700"    },
  SHOOT_PLANNED:       { label: "Shoot Planned",         color: "bg-sky-100 text-sky-700"      },
  SHOOT_DONE:          { label: "Shoot Done",            color: "bg-teal-100 text-teal-700"    },
  EDITING_IN_PROGRESS: { label: "Editing in Progress",   color: "bg-violet-100 text-violet-700"},
  EDIT_DONE:           { label: "Edit Done",             color: "bg-cyan-100 text-cyan-700"    },
  REVIEW:              { label: "In Review",             color: "bg-amber-100 text-amber-700"  },
  CHANGES_REQUESTED:   { label: "Changes Requested",     color: "bg-orange-100 text-orange-700"},
  ALL_APPROVED:        { label: "All Approved",          color: "bg-teal-100 text-teal-700"    },
  UPLOADED_CLOSED:     { label: "Uploaded & Closed ✅",  color: "bg-green-100 text-green-700"  },
  APPROVED:            { label: "Approved",              color: "bg-teal-100 text-teal-700"    },
  READY_TO_UPLOAD:     { label: "Ready to Upload",       color: "bg-lime-100 text-lime-700"    },
  UPLOAD_DONE:         { label: "Upload Done ✅",         color: "bg-green-100 text-green-700"  },
  CANCELLED:           { label: "Cancelled",             color: "bg-red-100 text-red-700"      },
};

// Workflow steps per type
const DESIGN_STEPS = [
  { key: "NEW",             label: "Submitted",    icon: FileText    },
  { key: "ASSIGNED",        label: "Assigned",     icon: UserCheck   },
  { key: "IN_PROGRESS",     label: "In Progress",  icon: Zap         },
  { key: "COMPLETED",       label: "Completed",    icon: Check       },
  { key: "REVIEW",          label: "Review",       icon: Eye         },
  { key: "CHANGES_REQUESTED",label:"Changes",      icon: RotateCcw   },
  { key: "ALL_APPROVED",    label: "Approved",     icon: ThumbsUp    },
  { key: "UPLOADED_CLOSED", label: "Closed ✅",    icon: CheckCircle2},
];

const VIDEO_STEPS = [
  { key: "NEW",                 label: "Submitted",  icon: FileText    },
  { key: "ASSIGNED",            label: "Assigned",   icon: UserCheck   },
  { key: "SHOOT_PLANNED",       label: "Shoot Plan", icon: Camera      },
  { key: "SHOOT_DONE",          label: "Shoot Done", icon: Film        },
  { key: "EDITING_IN_PROGRESS", label: "Editing",    icon: Scissors    },
  { key: "EDIT_DONE",           label: "Edit Done",  icon: Check       },
  { key: "REVIEW",              label: "Review",     icon: Eye         },
  { key: "CHANGES_REQUESTED",   label: "Changes",    icon: RotateCcw   },
  { key: "APPROVED",            label: "Approved",   icon: ThumbsUp    },
  { key: "READY_TO_UPLOAD",     label: "Ready",      icon: Upload      },
  { key: "UPLOAD_DONE",         label: "Done ✅",    icon: CheckCircle2},
];

const TERMINAL = new Set(["UPLOADED_CLOSED", "UPLOAD_DONE", "CANCELLED"]);

const REQUESTING_TEAMS: Record<string, string> = {
  SOCIAL: "Social Team", MANAGEMENT: "Management", ADMIN_TEAM: "Admin Team",
  PERFORMANCE_MARKETING: "Performance Marketing", TECH: "Tech", HR: "HR",
  CONTENT: "Content", SEO: "SEO", PAID_CAMPAIGN: "Paid Campaign",
  MARKETING: "Marketing", BUSINESS_UM: "Business · UM",
  BUSINESS_AZURO: "Business · Azuro", BUSINESS_PROPVR: "Business · PropVr",
  BUSINESS_IPM: "Business · IPM", BUSINESS_NRI: "Business · NRI",
  BUSINESS_INDIA_SALES: "Business · India Sales", OTHER: "Others / Misc",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface POCUser { id: string; name: string; email: string; image?: string; department?: string }
interface POC     { id: string; userId: string; role: string; user: POCUser }
interface Note    { id: string; body: string; isSystem: boolean; createdAt: string; authorId?: string }
interface ReviewCycle { id: string; cycleNumber: number; action: string; note?: string; createdAt: string; reviewedBy: POCUser }
interface DesignReq {
  id: string; refId: string; title: string; brief: string;
  type: string; videoSubType?: string; channels: string[];
  requestingTeam: string; subTeam?: string;
  priority: string; status: string; dueDate?: string;
  referenceLinks?: string; submittedAt: string;
  requestedBy?: POCUser; assignedTo?: POCUser;
  pocs: POC[]; notes: Note[]; reviewCycles: ReviewCycle[];
  reviewCycleCount: number; tatHours?: number;
}
interface Notif {
  id: string; title: string; body: string; read: boolean; createdAt: string;
  request?: { refId: string; title: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", m.color)}>{m.label}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type];
  if (!m) return null;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", m.color)}>
      <Icon size={11} />{m.label}
    </span>
  );
}

function ChannelChip({ ch }: { ch: string }) {
  const m = CHANNEL_META[ch] ?? { label: ch, color: "bg-gray-100 text-gray-600" };
  return <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", m.color)}>{m.label}</span>;
}

function isOverdue(req: DesignReq) {
  return req.dueDate && !TERMINAL.has(req.status) && new Date(req.dueDate) < new Date();
}

// ─────────────────────────────────────────────────────────────────────────────
// New Request Form
// ─────────────────────────────────────────────────────────────────────────────

function NewRequestModal({
  onClose, onCreated, users,
}: {
  onClose: () => void;
  onCreated: () => void;
  users: POCUser[];
}) {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", brief: "", type: "SOCIAL_GRAPHICS", videoSubType: "",
    channels: [] as string[], requestingTeam: "SOCIAL", subTeam: "",
    priority: "MEDIUM", dueDate: "", referenceLinks: "",
    designPocId: "", videoPocId: "", contentPocId: "", socialPocId: "", uploadingPocId: "",
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleChannel = (ch: string) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }));
  };

  const submit = async () => {
    if (!form.title.trim() || !form.brief.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/design-ops/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          videoSubType:   form.type === "VIDEO" && form.videoSubType ? form.videoSubType : undefined,
          designPocId:    form.designPocId    || undefined,
          videoPocId:     form.videoPocId     || undefined,
          contentPocId:   form.contentPocId   || undefined,
          socialPocId:    form.socialPocId    || undefined,
          uploadingPocId: form.uploadingPocId || undefined,
        }),
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700";
  const labelCls = "block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Design Request</h2>
            <p className="text-xs text-gray-500">Submit a request to the design team</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          {/* Auto-filled name */}
          <div>
            <label className={labelCls}>Your Name <span className="text-gray-400 font-normal">(auto-filled)</span></label>
            <input className={cn(inputCls, "bg-gray-50 cursor-not-allowed text-gray-500")} value={session?.user?.name ?? ""} readOnly />
          </div>

          {/* Type + Sub-type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type *</label>
              <select className={inputCls} value={form.type} onChange={e => set("type", e.target.value)}>
                <option value="SOCIAL_GRAPHICS">Social Graphics</option>
                <option value="VIDEO">Video</option>
                <option value="PAID_CAMPAIGN">Paid Campaign</option>
              </select>
            </div>
            {form.type === "VIDEO" && (
              <div>
                <label className={labelCls}>Video Orientation</label>
                <select className={inputCls} value={form.videoSubType} onChange={e => set("videoSubType", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="VERTICAL">Vertical (Reels/Shorts 9:16)</option>
                  <option value="HORIZONTAL">Horizontal (YouTube 16:9)</option>
                </select>
              </div>
            )}
          </div>

          {/* Channels */}
          <div>
            <label className={labelCls}>Channels</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CHANNEL_META).map(([ch, m]) => (
                <button key={ch} type="button"
                  onClick={() => toggleChannel(ch)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    form.channels.includes(ch)
                      ? cn(m.color, "border-current ring-1 ring-current")
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Request Title *</label>
            <input className={inputCls} placeholder="e.g. 3 Instagram Reels for She Leads — April batch"
              value={form.title} onChange={e => set("title", e.target.value)} />
          </div>

          {/* Requesting Team + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Requesting Team *</label>
              <select className={inputCls} value={form.requestingTeam} onChange={e => set("requestingTeam", e.target.value)}>
                {Object.entries(REQUESTING_TEAMS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select className={inputCls} value={form.priority} onChange={e => set("priority", e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" className={inputCls} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
          </div>

          {/* Brief */}
          <div>
            <label className={labelCls}>Brief / Description *</label>
            <textarea rows={4} className={inputCls} placeholder="Describe what you need — dimensions, formats, reference style, platform targeting, sizes…"
              value={form.brief} onChange={e => set("brief", e.target.value)} />
          </div>

          {/* Reference Links */}
          <div>
            <label className={labelCls}>Reference Links <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className={inputCls} placeholder="Drive link, Notion doc, inspiration URL…"
              value={form.referenceLinks} onChange={e => set("referenceLinks", e.target.value)} />
          </div>

          {/* POC section */}
          <div>
            <label className={labelCls}>Points of Contact <span className="text-gray-400 font-normal">(optional — team lead will assign)</span></label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "designPocId",    label: "Design POC"    },
                { key: "videoPocId",     label: "Video POC"     },
                { key: "contentPocId",   label: "Content POC"   },
                { key: "socialPocId",    label: "Social POC"    },
                { key: "uploadingPocId", label: "Uploading POC" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <select className={inputCls} value={(form as any)[key]} onChange={e => set(key, e.target.value)}>
                    <option value="">— Assign later —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} {u.department ? `(${u.department})` : ""}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !form.title.trim() || !form.brief.trim()}
            className="px-5 py-2 text-sm rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Stepper
// ─────────────────────────────────────────────────────────────────────────────

function WorkflowStepper({ req }: { req: DesignReq }) {
  const steps = req.type === "VIDEO" ? VIDEO_STEPS : DESIGN_STEPS;
  const currentIdx = steps.findIndex(s => s.key === req.status);

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const done    = i < currentIdx || TERMINAL.has(req.status);
        const active  = step.key === req.status;
        const Icon    = step.icon;
        const isLast  = i === steps.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                active  ? "border-indigo-600 bg-indigo-600 text-white shadow-md scale-110" :
                done    ? "border-green-500 bg-green-500 text-white" :
                          "border-gray-200 bg-white text-gray-400 dark:bg-gray-800 dark:border-gray-600"
              )}>
                {done && !active ? <Check size={12} /> : <Icon size={12} />}
              </div>
              <span className={cn(
                "text-[9px] font-semibold mt-1 text-center w-12",
                active ? "text-indigo-600" : done ? "text-green-600" : "text-gray-400"
              )}>{step.label}</span>
            </div>
            {!isLast && (
              <div className={cn("h-0.5 w-6 mx-0.5 mb-4 flex-shrink-0",
                i < currentIdx ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POC Row
// ─────────────────────────────────────────────────────────────────────────────

function POCSection({
  req, users, onRefresh,
}: {
  req: DesignReq; users: POCUser[]; onRefresh: () => void;
}) {
  const roles = ["DESIGN", "VIDEO", "CONTENT", "SOCIAL", "UPLOADING"];
  const [saving, setSaving] = useState<string | null>(null);

  const pocByRole = (role: string) => req.pocs.find(p => p.role === role);

  const assign = async (role: string, userId: string) => {
    if (!userId) return;
    setSaving(role);
    await fetch(`/api/design-ops/requests/${req.id}/pocs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, userId }),
    });
    setSaving(null);
    onRefresh();
  };

  const remove = async (role: string) => {
    setSaving(role);
    await fetch(`/api/design-ops/requests/${req.id}/pocs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setSaving(null);
    onRefresh();
  };

  return (
    <div className="space-y-2">
      {roles.map(role => {
        const poc  = pocByRole(role);
        const meta = POC_ROLE_META[role];
        const busy = saving === role;
        return (
          <div key={role} className="flex items-center gap-3 py-1.5 border-b last:border-0 dark:border-gray-700">
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold w-24 text-center flex-shrink-0", meta.color)}>
              {meta.label}
            </span>
            {poc ? (
              <div className="flex items-center gap-2 flex-1">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 flex-shrink-0">
                  {poc.user.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{poc.user.name}</span>
                {poc.user.department && <span className="text-xs text-gray-400">{poc.user.department}</span>}
                <button onClick={() => remove(role)} className="ml-auto text-gray-400 hover:text-red-500">
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <select
                  className="flex-1 text-xs border rounded px-2 py-1 text-gray-600 dark:bg-gray-800 dark:border-gray-700"
                  defaultValue=""
                  onChange={e => e.target.value && assign(role, e.target.value)}
                >
                  <option value="">— Assign {meta.label} —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ""}</option>
                  ))}
                </select>
                {busy && <Loader2 size={12} className="animate-spin text-indigo-500" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────

const DESIGN_NEXT: Record<string, string[]> = {
  NEW:               ["ASSIGNED"],
  ASSIGNED:          ["IN_PROGRESS"],
  IN_PROGRESS:       ["COMPLETED"],
  COMPLETED:         ["REVIEW"],
  REVIEW:            ["CHANGES_REQUESTED", "ALL_APPROVED"],
  CHANGES_REQUESTED: ["IN_PROGRESS"],
  ALL_APPROVED:      ["UPLOADED_CLOSED"],
};

const VIDEO_NEXT: Record<string, string[]> = {
  NEW:                 ["ASSIGNED"],
  ASSIGNED:            ["SHOOT_PLANNED"],
  SHOOT_PLANNED:       ["SHOOT_DONE"],
  SHOOT_DONE:          ["EDITING_IN_PROGRESS"],
  EDITING_IN_PROGRESS: ["EDIT_DONE"],
  EDIT_DONE:           ["REVIEW"],
  REVIEW:              ["CHANGES_REQUESTED", "APPROVED"],
  CHANGES_REQUESTED:   ["EDITING_IN_PROGRESS"],
  APPROVED:            ["READY_TO_UPLOAD"],
  READY_TO_UPLOAD:     ["UPLOAD_DONE"],
};

function RequestDrawer({
  reqId, users, onClose, onUpdate,
}: {
  reqId: string; users: POCUser[]; onClose: () => void; onUpdate: () => void;
}) {
  const [req, setReq]         = useState<DesignReq | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving]   = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/design-ops/requests/${reqId}`);
    setReq(await r.json());
    setLoading(false);
  }, [reqId]);

  useEffect(() => { load(); }, [load]);

  const moveStatus = async (status: string) => {
    if (!req) return;
    setMoving(true);
    await fetch(`/api/design-ops/requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote: reviewNote || undefined }),
    });
    setReviewNote("");
    await load();
    onUpdate();
    setMoving(false);
  };

  if (loading || !req) {
    return (
      <div className="fixed inset-y-0 right-0 w-[520px] bg-white dark:bg-gray-900 shadow-2xl border-l dark:border-gray-700 flex items-center justify-center z-40">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const nextStatuses = req.type === "VIDEO"
    ? (VIDEO_NEXT[req.status] ?? [])
    : (DESIGN_NEXT[req.status] ?? []);

  const isReviewStage = req.status === "REVIEW";
  const isChangeStage = req.status === "CHANGES_REQUESTED";

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white dark:bg-gray-900 shadow-2xl border-l dark:border-gray-700 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b dark:border-gray-700">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-gray-400">{req.refId}</span>
            <StatusBadge status={req.status} />
            <TypeBadge type={req.type} />
            {req.videoSubType && (
              <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
                {VIDEO_SUBTYPE_LABELS[req.videoSubType]}
              </span>
            )}
            {isOverdue(req) && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <AlertTriangle size={10} />Overdue
              </span>
            )}
          </div>
          <h2 className="font-bold text-gray-900 dark:text-white text-base leading-snug">{req.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {REQUESTING_TEAMS[req.requestingTeam] ?? req.requestingTeam}
            {req.requestedBy && ` · by ${req.requestedBy.name}`}
          </p>
          {/* Channels */}
          {req.channels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {req.channels.map(ch => <ChannelChip key={ch} ch={ch} />)}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Workflow stepper */}
        <div className="px-5 pt-4 pb-3 border-b dark:border-gray-700">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Workflow Progress</p>
          <WorkflowStepper req={req} />
        </div>

        {/* Move status */}
        {!TERMINAL.has(req.status) && nextStatuses.length > 0 && (
          <div className="px-5 py-4 border-b dark:border-gray-700 bg-indigo-50/40 dark:bg-indigo-900/10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Move Status</p>

            {/* Review stage — show approve + changes requested */}
            {isReviewStage ? (
              <div className="space-y-2">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  📋 Social POC review: approve the work or request changes below.
                </p>
                <textarea rows={2} placeholder="Leave a note (required for changes requested)…"
                  className="w-full text-xs border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => moveStatus("ALL_APPROVED")}
                    disabled={moving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                    {moving ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={13} />}
                    {req.type === "VIDEO" ? "Approve" : "All Approved"}
                  </button>
                  <button onClick={() => moveStatus("CHANGES_REQUESTED")}
                    disabled={moving || !reviewNote.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                    {moving ? <Loader2 size={12} className="animate-spin" /> : <ThumbsDown size={13} />}
                    Request Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(s => (
                  <button key={s} onClick={() => moveStatus(s)} disabled={moving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                    {moving ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={13} />}
                    {STATUS_META[s]?.label ?? s}
                  </button>
                ))}
                <button onClick={() => moveStatus("CANCELLED")} disabled={moving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 disabled:opacity-50">
                  <XCircle size={13} />Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Changes requested banner */}
        {isChangeStage && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
            <p className="text-xs font-semibold text-orange-700">Changes requested</p>
            {req.reviewCycles[0]?.note && (
              <p className="text-xs text-orange-600 mt-1">{req.reviewCycles[0].note}</p>
            )}
          </div>
        )}

        {/* Brief */}
        <div className="px-5 py-4 border-b dark:border-gray-700">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Brief</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{req.brief}</p>
          {req.referenceLinks && (
            <p className="text-xs text-indigo-600 mt-2 break-all">{req.referenceLinks}</p>
          )}
          {req.dueDate && (
            <p className={cn("text-xs mt-2 font-medium", isOverdue(req) ? "text-red-500" : "text-gray-500")}>
              Due: {format(parseISO(req.dueDate), "dd MMM yyyy")}
              {isOverdue(req) && " — OVERDUE"}
            </p>
          )}
        </div>

        {/* POCs */}
        <div className="px-5 py-4 border-b dark:border-gray-700">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Points of Contact</p>
          <POCSection req={req} users={users} onRefresh={load} />
        </div>

        {/* Review cycles */}
        {req.reviewCycles.length > 0 && (
          <div className="px-5 py-4 border-b dark:border-gray-700">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Review History</p>
            <div className="space-y-2">
              {req.reviewCycles.map(rc => (
                <div key={rc.id} className={cn(
                  "rounded-lg px-3 py-2 text-xs border",
                  rc.action === "APPROVED"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-orange-50 border-orange-200 text-orange-800"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      Cycle #{rc.cycleNumber} — {rc.action === "APPROVED" ? "✅ Approved" : "🔄 Changes Requested"}
                    </span>
                    <span className="text-[10px] opacity-70">{format(parseISO(rc.createdAt), "dd MMM, HH:mm")}</span>
                  </div>
                  <p className="text-xs opacity-80">by {rc.reviewedBy.name}</p>
                  {rc.note && <p className="mt-1 opacity-90">{rc.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity log */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Activity Log</p>
          <div className="space-y-2">
            {req.notes.map(n => (
              <div key={n.id} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p>{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{format(parseISO(n.createdAt), "dd MMM, HH:mm")}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Submitted: {format(parseISO(req.submittedAt), "dd MMM yyyy, hh:mm a")}
            {req.tatHours != null && ` · TAT: ${req.tatHours}h`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Bell
// ─────────────────────────────────────────────────────────────────────────────

function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    const r = await fetch("/api/design-ops/notifications");
    const d = await r.json();
    setNotifs(d.notifications ?? []);
    setUnread(d.unreadCount ?? 0);
  }, []);

  useEffect(() => { fetch_(); const t = setInterval(fetch_, 30_000); return () => clearInterval(t); }, [fetch_]);

  const markAll = async () => {
    await fetch("/api/design-ops/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await fetch_();
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(o => !o); if (!open) { setLoading(true); fetch_().finally(() => setLoading(false)); } }}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
        {unread > 0 ? <BellDot size={18} className="text-indigo-600" /> : <Bell size={18} className="text-gray-500" />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
            <span className="font-bold text-sm text-gray-900 dark:text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-indigo-600 hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y dark:divide-gray-700">
            {loading && <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-indigo-500" /></div>}
            {!loading && notifs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No notifications yet</p>
            )}
            {notifs.map(n => (
              <div key={n.id} className={cn("px-4 py-3", !n.read && "bg-indigo-50/60 dark:bg-indigo-900/10")}>
                <div className="flex items-start gap-2">
                  {!n.read && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{format(parseISO(n.createdAt), "dd MMM, HH:mm")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Card (list view)
// ─────────────────────────────────────────────────────────────────────────────

function RequestCard({ req, onClick }: { req: DesignReq; onClick: () => void }) {
  const overdue = isOverdue(req);
  return (
    <div onClick={onClick}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border p-4 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all",
        overdue ? "border-red-200 dark:border-red-800" : "border-gray-200 dark:border-gray-700"
      )}>
      <div className="flex items-start gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-bold text-gray-400">{req.refId}</span>
        <StatusBadge status={req.status} />
        <TypeBadge type={req.type} />
        {req.videoSubType && (
          <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold">
            {VIDEO_SUBTYPE_LABELS[req.videoSubType]}
          </span>
        )}
        {overdue && (
          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
            <AlertTriangle size={9} />Overdue
          </span>
        )}
        <ChevronRight size={14} className="ml-auto text-gray-300" />
      </div>

      <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1">{req.title}</p>
      <p className="text-xs text-gray-500 mb-2">{REQUESTING_TEAMS[req.requestingTeam] ?? req.requestingTeam}</p>

      {/* Channels */}
      {req.channels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {req.channels.map(ch => <ChannelChip key={ch} ch={ch} />)}
        </div>
      )}

      {/* POC avatars */}
      {req.pocs.length > 0 && (
        <div className="flex items-center gap-1">
          {req.pocs.slice(0, 5).map(p => (
            <div key={p.id} title={`${POC_ROLE_META[p.role]?.label}: ${p.user.name}`}
              className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700 border border-white">
              {p.user.name.charAt(0)}
            </div>
          ))}
          <span className="text-[10px] text-gray-400 ml-1">{req.pocs.map(p => POC_ROLE_META[p.role]?.label).join(", ")}</span>
        </div>
      )}

      {req.dueDate && (
        <p className={cn("text-[10px] mt-2 font-medium", overdue ? "text-red-500" : "text-gray-400")}>
          Due {format(parseISO(req.dueDate), "dd MMM yyyy")}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

function DesignOpsInner() {
  const [requests, setRequests]     = useState<DesignReq[]>([]);
  const [users, setUsers]           = useState<POCUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showNew, setShowNew]       = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rr, ur] = await Promise.all([
      fetch("/api/design-ops/requests"),
      fetch("/api/users?active=1"),
    ]);
    const [reqs, usrs] = await Promise.all([rr.json(), ur.json()]);
    setRequests(Array.isArray(reqs) ? reqs : []);
    setUsers(Array.isArray(usrs) ? usrs : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = requests.filter(r => {
    if (filterType   && r.type   !== filterType)   return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.refId.includes(search)) return false;
    return true;
  });

  // Stats
  const total    = requests.length;
  const active   = requests.filter(r => !TERMINAL.has(r.status)).length;
  const inReview = requests.filter(r => r.status === "REVIEW").length;
  const overdue  = requests.filter(r => isOverdue(r)).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Design Ops</h1>
          <p className="text-xs text-gray-500">Request tracker — Design, Video, Paid Campaign</p>
        </div>
        <NotificationBell />
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
          <Plus size={15} />New Request
        </button>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="px-6 py-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Requests",  value: total,    icon: FileText,       color: "text-gray-600"  },
            { label: "Active",          value: active,   icon: Zap,            color: "text-indigo-600"},
            { label: "In Review",       value: inReview, icon: Eye,            color: "text-amber-600" },
            { label: "Overdue",         value: overdue,  icon: AlertTriangle,  color: "text-red-500"   },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex items-center gap-3">
              <s.icon size={20} className={s.color} />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search by title or REQ-…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Types</option>
            <option value="SOCIAL_GRAPHICS">Social Graphics</option>
            <option value="VIDEO">Video</option>
            <option value="PAID_CAMPAIGN">Paid Campaign</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {(filterType || filterStatus || search) && (
            <button onClick={() => { setFilterType(""); setFilterStatus(""); setSearch(""); }}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
              <X size={12} />Clear
            </button>
          )}
        </div>

        {/* Request grid */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No requests found</p>
            <p className="text-sm">Try adjusting filters or submit a new request</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => (
              <RequestCard key={r.id} req={r} onClick={() => setSelectedId(r.id)} />
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showNew && (
        <NewRequestModal
          users={users}
          onClose={() => setShowNew(false)}
          onCreated={load}
        />
      )}

      {/* Detail Drawer */}
      {selectedId && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedId(null)} />
          <RequestDrawer
            reqId={selectedId}
            users={users}
            onClose={() => setSelectedId(null)}
            onUpdate={load}
          />
        </>
      )}
    </div>
  );
}

export default function DesignOpsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>}>
      <DesignOpsInner />
    </Suspense>
  );
}
