"use client";

import { useState, useEffect } from "react";
import {
  Users, Shield, Edit2, X, Check, Plus, Trash2, RefreshCw,
  ChevronDown, Eye, EyeOff, Search, Copy, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_SECTIONS, ROLE_LABELS, ROLE_COLORS, SECTION_LABELS, SECTION_ICONS,
  type AppSection, type UserRole,
} from "@/lib/permissions";

// ── Types ─────────────────────────────────────────────────────────────────

interface Member {
  id:             string;
  name:           string;
  email:          string;
  role:           UserRole;
  department:     string | null;
  accessSections: AppSection[];
  isActive:       boolean;
  createdAt:      string;
  team?:          { name: string; slug: string } | null;
}

const DEPT_OPTIONS = ["Social", "Design", "Marketing", "Paid Campaign", "HR", "Leadership"];
const ROLE_OPTIONS: UserRole[] = ["ADMIN","HEAD_OF_MARKETING","TEAM_LEAD","TEAM_MEMBER","HR_VIEWER"];

// Preset access bundles for quick assignment
const ACCESS_PRESETS: { label: string; sections: AppSection[] }[] = [
  { label: "Social Team",  sections: ["DASHBOARD","SOCIAL"] },
  { label: "Design Team",  sections: ["DASHBOARD","DESIGN_OPS"] },
  { label: "Marketing",    sections: ["DASHBOARD","SOCIAL","GMB","PORTALS"] },
  { label: "Admin / Full", sections: ["DASHBOARD","SOCIAL","DESIGN_OPS","GMB","PORTALS","SETTINGS","TEAM_HUB"] },
];

// ── Main component ────────────────────────────────────────────────────────

export default function TeamHubPage() {
  const [members, setMembers]     = useState<Member[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search,  setSearch]      = useState("");
  const [editId,  setEditId]      = useState<string | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/team");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = members.filter(m => {
    if (!showInactive && !m.isActive) return false;
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.department ?? "").toLowerCase().includes(q);
  });

  const stats = {
    total:    members.filter(m => m.isActive).length,
    admins:   members.filter(m => m.role === "ADMIN" && m.isActive).length,
    social:   members.filter(m => m.accessSections?.includes("SOCIAL") && m.isActive).length,
    design:   members.filter(m => m.accessSections?.includes("DESIGN_OPS") && m.isActive).length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-blue-600"/> Team Hub
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage team members, roles, and section access permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""}/>
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-700">
            <Plus size={15}/> Add Member
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Members", value: stats.total,  icon: "👥", color: "text-blue-600" },
          { label: "Admins",         value: stats.admins, icon: "🛡️", color: "text-purple-600" },
          { label: "Social Access",  value: stats.social, icon: "📅", color: "text-green-600" },
          { label: "Design Access",  value: stats.design, icon: "🎬", color: "text-orange-600" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</span>
            </div>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, department…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <button onClick={() => setShowInactive(p => !p)}
          className={cn("flex items-center gap-2 text-sm px-3 py-2 rounded-xl border font-medium",
            showInactive ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 text-orange-700 dark:text-orange-400"
                         : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700")}>
          {showInactive ? <Eye size={14}/> : <EyeOff size={14}/>}
          {showInactive ? "Showing inactive" : "Show inactive"}
        </button>
      </div>

      {/* Members table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading
          ? <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2"/> Loading…</div>
          : filtered.length === 0
            ? <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users size={32} className="mb-2 opacity-40"/>
                <p className="text-sm">No members found</p>
              </div>
            : <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Member</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Department</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Section Access</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map(m => (
                    editId === m.id
                      ? <EditRow key={m.id} member={m} onSave={updated => {
                          setMembers(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x));
                          setEditId(null);
                        }} onCancel={() => setEditId(null)}/>
                      : <ViewRow key={m.id} member={m} onEdit={() => setEditId(m.id)}
                          onToggleActive={async () => {
                            await fetch(`/api/team/${m.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ isActive: !m.isActive }),
                            });
                            load();
                          }}/>
                  ))}
                </tbody>
              </table>
        }
      </div>

      {/* Add member modal */}
      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onAdded={m => { setMembers(prev => [m, ...prev]); setShowAdd(false); }}/>}
    </div>
  );
}

// ── View Row ───────────────────────────────────────────────────────────────

function ViewRow({ member: m, onEdit, onToggleActive }: {
  member: Member; onEdit: () => void; onToggleActive: () => void;
}) {
  const avatarBg = ["bg-blue-500","bg-purple-500","bg-green-500","bg-orange-500","bg-pink-500","bg-indigo-500"];
  const color    = avatarBg[(m.name.charCodeAt(0) ?? 0) % avatarBg.length];
  const initials = m.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();

  return (
    <tr className={cn("hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors", !m.isActive && "opacity-50")}>
      {/* Member */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", color)}>
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{m.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{m.email}</p>
          </div>
        </div>
      </td>
      {/* Role */}
      <td className="px-4 py-3">
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", ROLE_COLORS[m.role])}>
          {m.role === "ADMIN" && <span className="mr-1">🛡️</span>}
          {ROLE_LABELS[m.role]}
        </span>
      </td>
      {/* Department */}
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {m.department ?? <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
      </td>
      {/* Access */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {(m.accessSections ?? []).length === 0
            ? <span className="text-xs text-gray-400 italic">No access</span>
            : (m.accessSections ?? []).map(s => (
              <span key={s} className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                <span>{SECTION_ICONS[s]}</span> {SECTION_LABELS[s]}
              </span>
            ))
          }
        </div>
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
          m.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                     : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400")}>
          {m.isActive ? "● Active" : "○ Inactive"}
        </span>
      </td>
      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors">
            <Edit2 size={14}/>
          </button>
          <button onClick={onToggleActive} title={m.isActive ? "Deactivate" : "Reactivate"}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-orange-500 transition-colors">
            {m.isActive ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Edit Row ───────────────────────────────────────────────────────────────

function EditRow({ member: m, onSave, onCancel }: {
  member: Member;
  onSave: (updated: Partial<Member>) => void;
  onCancel: () => void;
}) {
  const [name,       setName]       = useState(m.name);
  const [role,       setRole]       = useState<UserRole>(m.role);
  const [dept,       setDept]       = useState(m.department ?? "");
  const [sections,   setSections]   = useState<AppSection[]>(m.accessSections ?? []);
  const [saving,     setSaving]     = useState(false);

  function toggleSection(s: AppSection) {
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/team/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, department: dept || null, accessSections: sections }),
    });
    if (res.ok) { const d = await res.json(); onSave(d); }
    setSaving(false);
  }

  return (
    <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-y border-blue-200 dark:border-blue-800">
      <td className="px-4 py-3">
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </td>
      <td className="px-4 py-3">
        <select value={role} onChange={e => setRole(e.target.value as UserRole)}
          className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <select value={dept} onChange={e => setDept(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">— None —</option>
          {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </td>
      <td className="px-4 py-3" colSpan={2}>
        {/* Presets */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {ACCESS_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => setSections(p.sections)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap">
              {p.label}
            </button>
          ))}
        </div>
        {/* Section toggles */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_SECTIONS.map(s => (
            <button key={s}
              onClick={() => toggleSection(s)}
              className={cn(
                "flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                sections.includes(s)
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400"
              )}>
              {SECTION_ICONS[s]} {SECTION_LABELS[s]}
            </button>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button onClick={save} disabled={saving}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
            <Check size={14}/>
          </button>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X size={14}/>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Add Member Modal ───────────────────────────────────────────────────────

function AddMemberModal({ onClose, onAdded }: {
  onClose: () => void;
  onAdded: (m: Member) => void;
}) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [role,     setRole]     = useState<UserRole>("TEAM_MEMBER");
  const [dept,     setDept]     = useState("");
  const [sections, setSections] = useState<AppSection[]>(["DASHBOARD"]);
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState<{tempPassword: string; name: string} | null>(null);
  const [error,    setError]    = useState("");

  function toggleSection(s: AppSection) {
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function create() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true); setError("");
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, department: dept || null, accessSections: sections }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to create user"); return; }
    setDone({ tempPassword: data.tempPassword, name: data.name });
    onAdded(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
            {done ? "✅ Member Added" : "Add Team Member"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18}/>
          </button>
        </div>

        <div className="p-6">
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{done.name}</strong> has been added. Share the temporary password below — they should change it on first login.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold uppercase mb-1">Temporary Password</p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="text-lg font-mono font-bold text-yellow-800 dark:text-yellow-300">{done.tempPassword}</code>
                  <button onClick={() => navigator.clipboard.writeText(done.tempPassword)}
                    className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400">
                    <Copy size={16}/>
                  </button>
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl px-4 py-3 flex gap-2 text-left">
                <AlertTriangle size={14} className="text-orange-500 mt-0.5 shrink-0"/>
                <p className="text-xs text-orange-700 dark:text-orange-400">Share this password securely. It will not be shown again.</p>
              </div>
              <button onClick={onClose} className="bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-700">
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Full Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Email *</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="priya@squareyards.com"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Role</label>
                  <select value={role} onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Department</label>
                  <select value={dept} onChange={e => setDept(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select —</option>
                    {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Section access */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Section Access</label>
                  <div className="flex gap-1.5">
                    {ACCESS_PRESETS.map(p => (
                      <button key={p.label} onClick={() => setSections(p.sections)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 font-medium">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_SECTIONS.map(s => (
                    <button key={s} onClick={() => toggleSection(s)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all",
                        sections.includes(s)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400"
                      )}>
                      <span>{SECTION_ICONS[s]}</span> {SECTION_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={create} disabled={saving || !name.trim() || !email.trim()}
                className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin"/> : <Plus size={14}/>}
                Create Member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
