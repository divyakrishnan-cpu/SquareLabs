"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users, ShieldCheck, GitBranch, Plus, Search, RefreshCw,
  Edit2, X, Check, Copy, AlertTriangle, Eye, EyeOff,
  ChevronDown, Filter, UserPlus, MoreHorizontal, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_SECTIONS, ROLE_LABELS, ROLE_COLORS, SECTION_LABELS, SECTION_ICONS,
  type AppSection, type UserRole,
} from "@/lib/permissions";

// ── Types ─────────────────────────────────────────────────────────────────

interface Member {
  id: string; name: string; email: string; role: UserRole;
  department: string | null; accessSections: AppSection[];
  isActive: boolean; createdAt: string;
  team?: { name: string } | null;
}

const DEPT_OPTIONS  = ["Social","Design","Video","Marketing","Paid Campaign","HR","Leadership","SEO","Content","PR","Branding","Azuro","Product","Performance Marketing","Web Marketing"];
const ROLE_OPTIONS: UserRole[] = ["ADMIN","HEAD_OF_MARKETING","TEAM_LEAD","TEAM_MEMBER","HR_VIEWER"];
const ACCESS_PRESETS = [
  { label:"Social Team",   icon:"📅", sections:["DASHBOARD","SOCIAL"] as AppSection[] },
  { label:"Design Team",   icon:"🎬", sections:["DASHBOARD","DESIGN_OPS"] as AppSection[] },
  { label:"Marketing",     icon:"📊", sections:["DASHBOARD","SOCIAL","GMB","PORTALS"] as AppSection[] },
  { label:"Full Access",   icon:"🛡️", sections:ALL_SECTIONS },
  { label:"Dashboard Only",icon:"🏠", sections:["DASHBOARD"] as AppSection[] },
];

const TEAM_COLORS: Record<string,string> = {
  Design:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Video:"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Socials:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Content:"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PR:"bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  SEO:"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Performance Marketing":"bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Azuro:"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Product:"bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Branding:"bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "Web Marketing":"bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  Head:"bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const AVATAR_COLORS = [
  "bg-blue-500","bg-purple-500","bg-green-500","bg-orange-500",
  "bg-pink-500","bg-indigo-500","bg-teal-500","bg-rose-500",
  "bg-amber-500","bg-cyan-500","bg-lime-600","bg-fuchsia-500",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
}

// ── Main Page ─────────────────────────────────────────────────────────────

function TeamPageInner() {
  const router       = useSearchParams();
  const activeTab    = (router.get("tab") as string) || "members";

  const [members,    setMembers]    = useState<Member[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [importDone, setImportDone] = useState<{created:number;updated:number}|null>(null);
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "HEAD_OF_MARKETING";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/team");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active   = members.filter(m => m.isActive);
  const inactive = members.filter(m => !m.isActive);

  const teamCounts = active.reduce<Record<string,number>>((acc, m) => {
    const t = m.department ?? "Other";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const tabs = [
    { id:"members",     label:"Members",     icon:Users,       count: active.length },
    { id:"permissions", label:"Permissions", icon:ShieldCheck, count: null },
    { id:"org",         label:"Org Chart",   icon:GitBranch,   count: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Hero Header ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Users size={20} className="text-white"/>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Team Management</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage members, roles & access permissions</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""}/>
              </button>
              {isAdmin && (
                <button
                  onClick={async () => {
                    if (!confirm(`Import all 67 team members from CSV data?\nExisting users won't have passwords changed.`)) return;
                    setImporting(true);
                    const res = await fetch("/api/admin/seed-team", { method: "POST" });
                    const data = await res.json();
                    setImporting(false);
                    if (res.ok) { setImportDone(data.summary); load(); }
                    else alert("Import failed: " + data.error);
                  }}
                  disabled={importing}
                  className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Download size={14} className={importing ? "animate-bounce" : ""}/>
                  {importing ? "Importing…" : "Import Team"}
                </button>
              )}
              {importDone && (
                <span className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
                  ✓ {importDone.created} added, {importDone.updated} updated
                </span>
              )}
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:opacity-90 shadow-sm transition-opacity">
                <UserPlus size={15}/> Add Member
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-3 mb-5">
            {[
              { label:"Total",   value: active.length,                                     color:"text-blue-600",   bg:"bg-blue-50 dark:bg-blue-900/20" },
              { label:"Admins",  value: active.filter(m=>m.role==="ADMIN").length,          color:"text-purple-600", bg:"bg-purple-50 dark:bg-purple-900/20" },
              { label:"Leads",   value: active.filter(m=>["HEAD_OF_MARKETING","TEAM_LEAD"].includes(m.role)).length, color:"text-indigo-600", bg:"bg-indigo-50 dark:bg-indigo-900/20" },
              { label:"Social ✓",value: active.filter(m=>m.accessSections?.includes("SOCIAL")).length,      color:"text-green-600",  bg:"bg-green-50 dark:bg-green-900/20" },
              { label:"Design ✓",value: active.filter(m=>m.accessSections?.includes("DESIGN_OPS")).length,  color:"text-orange-600", bg:"bg-orange-50 dark:bg-orange-900/20" },
              { label:"Inactive",value: inactive.length,                                   color:"text-gray-500",   bg:"bg-gray-100 dark:bg-gray-800" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl px-4 py-3 text-center", s.bg)}>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(t => {
              const Icon    = t.icon;
              const isActive = activeTab === t.id;
              return (
                <a key={t.id} href={`/team${t.id === "members" ? "" : `?tab=${t.id}`}`}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
                    isActive
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}>
                  <Icon size={15}/>
                  {t.label}
                  {t.count !== null && (
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      isActive ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                               : "bg-gray-100 dark:bg-gray-700 text-gray-500")}>
                      {t.count}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading && activeTab === "members"
          ? <LoadingGrid/>
          : activeTab === "members"
            ? <MembersTab members={members} teamCounts={teamCounts} onRefresh={load}/>
            : activeTab === "permissions"
              ? <PermissionsTab members={members.filter(m=>m.isActive)} onRefresh={load}/>
              : <OrgTab members={members.filter(m=>m.isActive)}/>
        }
      </div>

      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onAdded={m => { setMembers(prev => [m, ...prev]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<LoadingGrid/>}>
      <TeamPageInner/>
    </Suspense>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────
function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({length:8}).map((_,i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700"/>
            <div className="flex-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"/>
              <div className="h-2 bg-gray-100 dark:bg-gray-600 rounded w-32"/>
            </div>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded w-full mb-2"/>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded w-2/3"/>
        </div>
      ))}
    </div>
  );
}

// ── Members Tab ────────────────────────────────────────────────────────────
function MembersTab({ members, teamCounts, onRefresh }: {
  members: Member[]; teamCounts: Record<string,number>; onRefresh: () => void;
}) {
  const [search,        setSearch]        = useState("");
  const [filterTeam,    setFilterTeam]    = useState("all");
  const [filterRole,    setFilterRole]    = useState("all");
  const [showInactive,  setShowInactive]  = useState(false);
  const [editId,        setEditId]        = useState<string|null>(null);

  const teams = Object.keys(teamCounts).sort();

  const filtered = members.filter(m => {
    if (!showInactive && !m.isActive) return false;
    if (filterTeam !== "all" && m.department !== filterTeam) return false;
    if (filterRole !== "all" && m.role !== filterRole) return false;
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.department ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, department…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
        </div>

        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="all">All Teams</option>
          {teams.map(t => <option key={t} value={t}>{t} ({teamCounts[t]})</option>)}
        </select>

        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>

        <button onClick={() => setShowInactive(p=>!p)}
          className={cn("flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border font-medium transition-all",
            showInactive
              ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 text-orange-700"
              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 bg-white dark:bg-gray-800")}>
          {showInactive ? <Eye size={14}/> : <EyeOff size={14}/>}
          {showInactive ? "Showing all" : "Active only"}
        </button>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} members</span>
      </div>

      {/* Grid */}
      {filtered.length === 0
        ? <EmptyState/>
        : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(m =>
              editId === m.id
                ? <EditCard key={m.id} member={m}
                    onSave={updated => { onRefresh(); setEditId(null); }}
                    onCancel={() => setEditId(null)}/>
                : <MemberCard key={m.id} member={m}
                    onEdit={() => setEditId(m.id)}
                    onToggle={async () => {
                      await fetch(`/api/team/${m.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({isActive:!m.isActive}) });
                      onRefresh();
                    }}/>
            )}
          </div>
      }
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Users size={28} className="text-gray-400"/>
      </div>
      <p className="font-semibold text-gray-600 dark:text-gray-400">No members found</p>
      <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
    </div>
  );
}

// ── Member Card ────────────────────────────────────────────────────────────
function MemberCard({ member: m, onEdit, onToggle }: {
  member: Member; onEdit: () => void; onToggle: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bg = avatarColor(m.name);
  const tc = TEAM_COLORS[m.department ?? ""] ?? "bg-gray-100 text-gray-600";

  return (
    <div className={cn(
      "group bg-white dark:bg-gray-800 rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5",
      m.isActive ? "border-gray-100 dark:border-gray-700" : "border-dashed border-gray-200 dark:border-gray-700 opacity-60"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm", bg)}>
            {initials(m.name)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{m.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{m.email}</p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(p=>!p)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-all">
            <MoreHorizontal size={15}/>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 w-36"
              onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={() => { onEdit(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <Edit2 size={12}/> Edit
              </button>
              <button onClick={() => { onToggle(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                {m.isActive ? <><EyeOff size={12}/> Deactivate</> : <><Eye size={12}/> Reactivate</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Role + Department row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", ROLE_COLORS[m.role])}>
          {m.role === "ADMIN" && "🛡️ "}
          {ROLE_LABELS[m.role]}
        </span>
        {m.department && (
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", tc)}>
            {m.department}
          </span>
        )}
      </div>

      {/* Section access */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-2">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-2">Access</p>
        <div className="flex flex-wrap gap-1">
          {(m.accessSections ?? []).length === 0
            ? <span className="text-[10px] text-gray-400 italic">Full access</span>
            : (m.accessSections ?? []).slice(0, 5).map(s => (
              <span key={s} className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                <span>{SECTION_ICONS[s]}</span>
                <span>{SECTION_LABELS[s]?.split(" ")[0]}</span>
              </span>
            ))
          }
          {(m.accessSections ?? []).length > 5 && (
            <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
              +{m.accessSections.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Status dot */}
      <div className="flex items-center gap-1.5 mt-3">
        <div className={cn("w-2 h-2 rounded-full", m.isActive ? "bg-green-500" : "bg-gray-300")}/>
        <span className="text-[10px] text-gray-400">{m.isActive ? "Active" : "Inactive"}</span>
      </div>
    </div>
  );
}

// ── Edit Card ──────────────────────────────────────────────────────────────
function EditCard({ member: m, onSave, onCancel }: {
  member: Member; onSave: (u: Partial<Member>) => void; onCancel: () => void;
}) {
  const [name,     setName]     = useState(m.name);
  const [role,     setRole]     = useState<UserRole>(m.role);
  const [dept,     setDept]     = useState(m.department ?? "");
  const [sections, setSections] = useState<AppSection[]>(m.accessSections ?? []);
  const [saving,   setSaving]   = useState(false);

  function toggleSection(s: AppSection) {
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/team/${m.id}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, role, department: dept || null, accessSections: sections }),
    });
    if (res.ok) onSave(await res.json());
    setSaving(false);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-400 dark:border-blue-600 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Editing</p>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <X size={14}/>
        </button>
      </div>

      <div className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full text-sm font-semibold border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>

        <select value={role} onChange={e => setRole(e.target.value as UserRole)}
          className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>

        <select value={dept} onChange={e => setDept(e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">No Department</option>
          {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Presets */}
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-2">Quick Access Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {ACCESS_PRESETS.map(p => (
              <button key={p.label} onClick={() => setSections(p.sections)}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 transition-colors">
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section toggles */}
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-2">Section Access</p>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_SECTIONS.map(s => (
              <button key={s} onClick={() => toggleSection(s)}
                className={cn(
                  "flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-all",
                  sections.includes(s)
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-300"
                )}>
                <span>{SECTION_ICONS[s]}</span>
                <span className="truncate">{SECTION_LABELS[s].split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50">
            {saving ? <RefreshCw size={12} className="animate-spin"/> : <Check size={12}/>} Save
          </button>
          <button onClick={onCancel} className="flex-1 text-xs font-bold py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Permissions Tab ────────────────────────────────────────────────────────
function PermissionsTab({ members, onRefresh }: { members: Member[]; onRefresh: () => void }) {
  const [pending, setPending] = useState<Record<string, AppSection[]>>({});
  const [saving,  setSaving]  = useState<string|null>(null);
  const [search,  setSearch]  = useState("");
  const [filterTeam, setFilterTeam] = useState("all");

  const teams = Array.from(new Set(members.map((m: Member) => m.department ?? "Other"))).sort();

  const filtered = members.filter(m => {
    if (filterTeam !== "all" && m.department !== filterTeam) return false;
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q);
  });

  function getSections(m: Member): AppSection[] {
    return pending[m.id] ?? m.accessSections ?? [];
  }

  function toggleAccess(memberId: string, section: AppSection, current: AppSection[]) {
    const next = current.includes(section)
      ? current.filter(s => s !== section)
      : [...current, section];
    setPending(prev => ({ ...prev, [memberId]: next }));
  }

  async function saveOne(memberId: string) {
    setSaving(memberId);
    await fetch(`/api/team/${memberId}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ accessSections: pending[memberId] }),
    });
    setSaving(null);
    setPending(prev => { const n = {...prev}; delete n[memberId]; return n; });
    onRefresh();
  }

  const hasPending = Object.keys(pending).length > 0;

  async function saveAll() {
    for (const [id, sections] of Object.entries(pending)) {
      await fetch(`/api/team/${id}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ accessSections: sections }),
      });
    }
    setPending({});
    onRefresh();
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
        </div>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Teams</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {hasPending && (
          <button onClick={saveAll}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 animate-pulse">
            <Check size={14}/> Save All Changes ({Object.keys(pending).length})
          </button>
        )}
      </div>

      {/* Permission matrix */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-gray-900 to-gray-800">
                <th className="text-left px-5 py-4 text-white font-bold text-sm w-56">Member</th>
                <th className="px-3 py-4 text-white font-bold text-[10px] uppercase tracking-wide w-24">Role</th>
                {ALL_SECTIONS.map(s => (
                  <th key={s} className="px-3 py-4 text-center min-w-[90px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg">{SECTION_ICONS[s]}</span>
                      <span className="text-[9px] font-bold text-gray-300 whitespace-nowrap">{SECTION_LABELS[s].replace(" Calendar","").replace(" Ops","")}</span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-4 w-20"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((m, ri) => {
                const sections  = getSections(m);
                const isDirty   = !!pending[m.id];
                const isAdmin   = m.role === "ADMIN";
                const bg = ri % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/50 dark:bg-gray-700/20";

                return (
                  <tr key={m.id} className={cn(bg, isDirty && "ring-1 ring-inset ring-blue-200 dark:ring-blue-800 bg-blue-50/30 dark:bg-blue-900/10")}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0", avatarColor(m.name))}>
                          {initials(m.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{m.name}</p>
                          {m.department && (
                            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", TEAM_COLORS[m.department] ?? "bg-gray-100 text-gray-500")}>
                              {m.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full", ROLE_COLORS[m.role])}>
                        {m.role === "ADMIN" ? "🛡️ Admin" : ROLE_LABELS[m.role].split(" ")[0]}
                      </span>
                    </td>
                    {ALL_SECTIONS.map(s => {
                      const hasAccess = isAdmin || sections.includes(s);
                      const locked    = isAdmin; // Admin always has all
                      return (
                        <td key={s} className="px-3 py-3 text-center">
                          <button
                            disabled={locked}
                            onClick={() => !locked && toggleAccess(m.id, s, sections)}
                            title={locked ? "Admin has full access" : hasAccess ? `Remove ${SECTION_LABELS[s]} access` : `Grant ${SECTION_LABELS[s]} access`}
                            className={cn(
                              "w-9 h-5 rounded-full transition-all mx-auto flex items-center relative",
                              locked
                                ? "bg-purple-200 dark:bg-purple-800 cursor-not-allowed"
                                : hasAccess
                                  ? "bg-blue-600 cursor-pointer hover:bg-blue-700"
                                  : "bg-gray-200 dark:bg-gray-600 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500"
                            )}>
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute transition-all",
                              hasAccess ? "right-0.5" : "left-0.5"
                            )}/>
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3">
                      {isDirty && (
                        <button onClick={() => saveOne(m.id)} disabled={saving === m.id}
                          className="flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 whitespace-nowrap">
                          {saving === m.id ? <RefreshCw size={10} className="animate-spin"/> : <Check size={10}/>} Save
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-400">🔵 Toggle switches to grant/revoke access per section · 🛡️ Admin always has full access</p>
          {hasPending && (
            <button onClick={saveAll} className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">
              Save All Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Org Chart Tab ──────────────────────────────────────────────────────────
function OrgTab({ members }: { members: Member[] }) {
  const byCode: Record<string, Member & { code: string }> = {};
  const EMAIL_CODE: Record<string,string> = {};

  // Build lookup by first name match (simplified)
  const orgData = [
    {code:"SQY44089",name:"Divya Krishnan",     desig:"Head of Design",                team:"Head",                sup:null},
    {code:"SBL0055", name:"Lalit Bhardwaj",     desig:"AVP - Brand Design",            team:"Design",              sup:"SQY44089"},
    {code:"SDC4035", name:"Sukhmani",           desig:"AVP - Socials",                 team:"Socials",             sup:"SQY44089"},
    {code:"SQY59401",name:"Sunita Mishra",      desig:"Content Strategy Head",         team:"Content",             sup:"SQY44089"},
    {code:"SBL0105", name:"Rohit Rajoriya",     desig:"Senior Manager – Azuro",        team:"Azuro",               sup:"SQY44089"},
    {code:"SQY56122",name:"Paramjeet",          desig:"Manager – Performance Mkt",     team:"Performance Marketing",sup:"SQY44089"},
    {code:"SQY59542",name:"Shivam Chanana",     desig:"AGM – SEO / Branding",          team:"Branding",            sup:"SQY44089"},
    {code:"SDC5405", name:"Ashish Singh",       desig:"Product Manager",               team:"Product",             sup:"SQY44089"},
    {code:"SQY55352",name:"Bharath Subramani",  desig:"Sr. Executive – Perf. Mkt",     team:"Performance Marketing",sup:"SQY44089"},
    {code:"SQY60167",name:"Chinmay Gaur",       desig:"Generative Engine Optimization",team:"SEO",                 sup:"SQY44089"},
    {code:"SQY60797",name:"Dhruv Thakur",       desig:"Copy Lead",                     team:"Branding",            sup:"SQY44089"},
    // Design
    {code:"SDC4564", name:"Sunita Kumari",      desig:"Manager – Brand Design",        team:"Design",              sup:"SBL0055"},
    {code:"SDC4682", name:"Sandeep Chaurasia",  desig:"Brand Design Lead",             team:"Design",              sup:"SBL0055"},
    {code:"SDC4963", name:"Divya Garg",         desig:"Manager – Brand Design",        team:"Design",              sup:"SBL0055"},
    {code:"SQY55954",name:"Namita Aggarwal",    desig:"Senior Graphic Designer",       team:"Design",              sup:"SBL0055"},
    {code:"SQY56416",name:"Garima Banwala",     desig:"Senior Graphic Designer",       team:"Design",              sup:"SBL0055"},
    {code:"SQY57180",name:"Rishabh Singh",      desig:"Graphic Designer",              team:"Design",              sup:"SBL0055"},
    {code:"SQY57973",name:"Sidharth Bharti",    desig:"Graphic Designer",              team:"Design",              sup:"SBL0055"},
    {code:"SIN3939", name:"Raj Gaurav",         desig:"Intern",                        team:"Design",              sup:"SBL0055"},
    // Video
    {code:"SQY59015",name:"Manish Kumar Sharma",desig:"AI Video Creator & Editor",     team:"Video",               sup:"SBL0055"},
    {code:"SDC6287", name:"John Westly Antony", desig:"Senior Videographer",           team:"Video",               sup:"SBL0055"},
    {code:"SQY55707",name:"Ankit Rawat",        desig:"Senior Video Editor",           team:"Video",               sup:"SBL0055"},
    {code:"SQY55953",name:"Abhay Gupta",        desig:"Senior Videographer",           team:"Video",               sup:"SBL0055"},
    {code:"SQY58916",name:"Rahul Chatterjee",   desig:"Video Editor",                  team:"Video",               sup:"SBL0055"},
    {code:"SQY56773",name:"Akash Bhatt",        desig:"Video Editor",                  team:"Video",               sup:"SBL0055"},
    // Socials
    {code:"SQY56333",name:"Parth Sharma",       desig:"Marketing Lead",                team:"Socials",             sup:"SDC4035"},
    {code:"SQY54370",name:"Ritika Tyagi",       desig:"Marketing Executive",           team:"Socials",             sup:"SDC4035"},
    {code:"SQY55706",name:"Aaryan Sharma",      desig:"Social Media Executive",        team:"Socials",             sup:"SDC4035"},
    {code:"SQY55708",name:"Prakriti Singh",     desig:"Social Media Executive",        team:"Socials",             sup:"SDC4035"},
    {code:"SQY59715",name:"Aditi Arora",        desig:"Marketing Executive",           team:"Socials",             sup:"SDC4035"},
    {code:"SQY58633",name:"Pranjal Sapra",      desig:"Senior Content Writer",         team:"Socials",             sup:"SDC4035"},
    {code:"SQY60413",name:"Abhilasa Bhattacharya",desig:"Senior Marketing Strategist", team:"Socials",             sup:"SDC4035"},
    {code:"SQY60437",name:"Simran Shankar",     desig:"Marketing Executive",           team:"Socials",             sup:"SDC4035"},
    {code:"SQY57146",name:"Piyush Sharma",      desig:"Marketing Executive",           team:"Socials",             sup:"SQY56333"},
    {code:"SIN3981", name:"Diva Bindal",        desig:"Intern",                        team:"Socials",             sup:"SDC4035"},
    {code:"SQY56974",name:"Ashish Kumar",       desig:"Senior Investment Manager",     team:"Socials",             sup:"SDC4035"},
    // Content
    {code:"SDC5595", name:"Kunal Sachdeva",     desig:"AGM – Content",                 team:"Content",             sup:"SQY59401"},
    {code:"SQY58858",name:"Abheet Chawla",      desig:"Content Manager",               team:"Content",             sup:"SDC5595"},
    {code:"SDC5596", name:"Vimal Vijayan",      desig:"Senior Content Editor",         team:"Content",             sup:"SDC5595"},
    {code:"SQY42700",name:"Rishabh Baisoy",     desig:"Senior Content Writer",         team:"Content",             sup:"SDC5595"},
    {code:"SQY46789",name:"Shubham Sandhu",     desig:"Content Writer",                team:"Content",             sup:"SDC5595"},
    {code:"SQY46790",name:"Thejus K S",         desig:"Content Writer",                team:"Content",             sup:"SDC5595"},
    {code:"SQY51435",name:"Rahul Gautam",       desig:"Content Writer",                team:"Content",             sup:"SDC5595"},
    {code:"SQY59196",name:"Abigail Venessa Simmons",desig:"Content Writer",            team:"Content",             sup:"SDC5595"},
    {code:"SQY59215",name:"Drishti Katyal",     desig:"Content Writer",                team:"Content",             sup:"SDC5595"},
    {code:"SQY59407",name:"Muskan Shafi",       desig:"Senior Content Writer",         team:"Content",             sup:"SDC5595"},
    // PR
    {code:"SDC6596", name:"Sakshi Saxena",      desig:"Sr. Manager: Research & Media", team:"PR",                  sup:"SQY59401"},
    {code:"SQY60210",name:"Riddhi Chatterji",   desig:"Content Writer",                team:"PR",                  sup:"SQY59401"},
    // SEO
    {code:"SDC5674", name:"Vikesh Verma",       desig:"AGM – SEO",                     team:"SEO",                 sup:"SQY59542"},
    {code:"SQY35817",name:"Abhishek Kumar Singh",desig:"AGM – SEO",                    team:"SEO",                 sup:"SQY59542"},
    {code:"SQY58651",name:"Mitesh Kumar Singh", desig:"AGM – SEO",                     team:"SEO",                 sup:"SQY59542"},
    {code:"SQY60597",name:"Vishesh Paliwal",    desig:"Marketing Lead",                team:"SEO",                 sup:"SQY59542"},
    {code:"SBL0065", name:"Nitin Kumar",        desig:"Manager – SEO",                 team:"SEO",                 sup:"SQY59542"},
    {code:"SDC5026", name:"Shiv Kumar Gupta",   desig:"Manager – SEO",                 team:"SEO",                 sup:"SQY59542"},
    {code:"SQY38120",name:"Ankur Rawat",        desig:"Associate Manager – CMS",       team:"SEO",                 sup:"SQY59542"},
    {code:"SQY54136",name:"Devansh Sharma",     desig:"Associate Manager – GA",        team:"SEO",                 sup:"SQY59542"},
    {code:"SDC5216", name:"Gaurav Dhiman",      desig:"SEO Executive",                 team:"SEO",                 sup:"SDC5674"},
    {code:"SIN3991", name:"Aditya Kumar Mishra",desig:"SEO Intern",                    team:"SEO",                 sup:"SQY59542"},
    {code:"SIN3994", name:"Prateek Jain",       desig:"Intern",                        team:"SEO",                 sup:"SQY59542"},
    // Perf Mkt
    {code:"SQY56101",name:"Sudhir",             desig:"Manager – Performance Mkt",     team:"Performance Marketing",sup:"SQY56122"},
    {code:"SQY36075",name:"Karan Deep",         desig:"Web Developer",                 team:"Performance Marketing",sup:"SQY56122"},
    // Azuro
    {code:"SBL2166", name:"Supriya Boruah",     desig:"Sr. Executive – Marketing",     team:"Azuro",               sup:"SBL0105"},
    {code:"SBL2609", name:"Chaitali Sudhir Manjrekar",desig:"Marketing Executive",     team:"Azuro",               sup:"SBL0105"},
    {code:"SBL2638", name:"Shweta Tawade",      desig:"Marketing Executive",           team:"Azuro",               sup:"SBL0105"},
    {code:"SQY54135",name:"Bhavika Anant Modsing",desig:"Marketing Executive",         team:"Azuro",               sup:"SBL0105"},
    {code:"SQY59917",name:"Jyotsna Santosh Chudji",desig:"Marketing Executive",        team:"Azuro",               sup:"SBL0105"},
    // Product / Web Mkt
    {code:"SQY59928",name:"Tanishka Jamwal",    desig:"Marketing Executive",           team:"Web Marketing",        sup:"SDC5405"},
  ];

  const childMap: Record<string, typeof orgData> = {};
  orgData.forEach(p => {
    if (p.sup) {
      if (!childMap[p.sup]) childMap[p.sup] = [];
      childMap[p.sup].push(p);
    }
  });
  const nodeMap: Record<string, typeof orgData[0]> = {};
  orgData.forEach(p => nodeMap[p.code] = p);

  function OrgNode({ code, depth = 0 }: { code: string; depth?: number }) {
    const [open, setOpen] = useState(depth < 2);
    const node = nodeMap[code];
    const kids = childMap[code] ?? [];
    if (!node) return null;
    const tc = TEAM_COLORS[node.team] ?? "bg-gray-100 text-gray-600";
    const av = avatarColor(node.name);
    const isRoot = depth === 0;

    return (
      <div className="flex flex-col items-center">
        <div
          onClick={() => kids.length && setOpen(p => !p)}
          className={cn(
            "relative bg-white dark:bg-gray-800 border rounded-2xl p-3.5 transition-all select-none",
            isRoot ? "w-52 border-2 border-blue-500 shadow-lg" : "w-44 border border-gray-200 dark:border-gray-700 shadow-sm",
            kids.length ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "",
          )}>
          <div className="flex items-center gap-2.5">
            <div className={cn("rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm",
              isRoot ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs", av)}>
              {initials(node.name)}
            </div>
            <div className="min-w-0">
              <p className={cn("font-bold text-gray-900 dark:text-gray-100 truncate", isRoot ? "text-sm" : "text-xs")}>
                {node.name.split(" ").slice(0,2).join(" ")}
              </p>
              <p className="text-[9px] text-gray-400 truncate leading-tight">{node.desig}</p>
            </div>
          </div>
          <span className={cn("inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full mt-2", tc)}>
            {node.team}
          </span>
          {kids.length > 0 && (
            <span className="absolute top-2 right-2 text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
              {open ? "▲" : `▼${kids.length}`}
            </span>
          )}
        </div>

        {open && kids.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-5 bg-gray-200 dark:bg-gray-600"/>
            <div className="relative flex gap-3 items-start">
              {kids.length > 1 && (
                <div className="absolute top-0 left-[calc(50%-50%)] right-0 h-0.5 bg-gray-200 dark:bg-gray-600"
                  style={{left:`calc(50% - ${(kids.length-1)*100/2}px)`, width:`${(kids.length-1)*100}px`, maxWidth:"100%"}}/>
              )}
              {kids.map(k => (
                <div key={k.code} className="flex flex-col items-center">
                  <div className="w-0.5 h-5 bg-gray-200 dark:bg-gray-600"/>
                  <OrgNode code={k.code} depth={depth+1}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Organisation Hierarchy</h3>
          <p className="text-xs text-gray-400 mt-0.5">Click any node to expand/collapse · {members.length} active members</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-max flex justify-center pb-6">
          <OrgNode code="SQY44089" depth={0}/>
        </div>
      </div>
    </div>
  );
}

// ── Add Member Modal ───────────────────────────────────────────────────────
function AddMemberModal({ onClose, onAdded }: { onClose: ()=>void; onAdded: (m:Member)=>void }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [role,     setRole]     = useState<UserRole>("TEAM_MEMBER");
  const [dept,     setDept]     = useState("");
  const [sections, setSections] = useState<AppSection[]>(["DASHBOARD"]);
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState<{tempPassword:string; name:string}|null>(null);
  const [error,    setError]    = useState("");

  function toggleSection(s: AppSection) {
    setSections(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s]);
  }

  async function create() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true); setError("");
    const res = await fetch("/api/team", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name, email, role, department: dept||null, accessSections: sections }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setDone({ tempPassword: data.tempPassword, name: data.name });
    onAdded(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserPlus size={15} className="text-blue-600"/>
            </div>
            <h2 className="font-bold text-gray-800 dark:text-gray-200">{done ? "Member Added ✅" : "Add Team Member"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6">
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{done.name}</strong> has been added. Share their temporary password securely.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-bold uppercase mb-2">Temporary Password</p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-xl font-mono font-bold text-amber-800 dark:text-amber-300 tracking-wider">{done.tempPassword}</code>
                  <button onClick={() => navigator.clipboard.writeText(done.tempPassword)}
                    className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 hover:bg-amber-200 transition-colors">
                    <Copy size={14}/>
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl px-4 py-3 text-left">
                <AlertTriangle size={13} className="text-orange-500 mt-0.5 shrink-0"/>
                <p className="text-xs text-orange-700 dark:text-orange-400">This password won't be shown again. Ask them to reset it on first login.</p>
              </div>
              <button onClick={onClose} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Done</button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Full Name *</label>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Priya Sharma"
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Work Email *</label>
                  <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="name@squareyards.com"
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Role</label>
                  <select value={role} onChange={e=>setRole(e.target.value as UserRole)}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ROLE_OPTIONS.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Department</label>
                  <select value={dept} onChange={e=>setDept(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select —</option>
                    {DEPT_OPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Section Access</label>
                  <div className="flex gap-1">
                    {ACCESS_PRESETS.map(p=>(
                      <button key={p.label} onClick={()=>setSections(p.sections)}
                        className="text-[9px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 font-semibold transition-colors">
                        {p.icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SECTIONS.map(s=>(
                    <button key={s} onClick={()=>toggleSection(s)}
                      className={cn(
                        "flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all",
                        sections.includes(s)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300 bg-white dark:bg-gray-700"
                      )}>
                      <span>{SECTION_ICONS[s]}</span> {SECTION_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={create} disabled={saving||!name.trim()||!email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 shadow-sm">
                {saving ? <RefreshCw size={14} className="animate-spin"/> : <UserPlus size={14}/>}
                Create Member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
