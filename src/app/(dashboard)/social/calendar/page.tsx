"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  Plus, Target, TrendingUp, CheckCircle2, Clock,
  Edit2, Trash2, ChevronDown, ChevronRight, BarChart2,
  Film, X, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Series {
  id: string;
  name: string;
  description: string;
  vertical: string;
  color: string;
  emoji: string;
  targetPerMonth: number;
  targetPerWeek: number;
  platforms: string[];
  isActive: boolean;
}

interface CalendarItem {
  id: string;
  title: string;
  seriesId: string | null;
  vertical: string;
  platforms: string[];
  type: string;
  plannedDate: string;
  status: string;
  assignee: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_SERIES: Series[] = [
  {
    id: "s1", name: "She Leads", emoji: "👩‍💼",
    description: "Women in real estate — leadership stories, career journeys and industry insights.",
    vertical: "SY_INDIA", color: "#ec4899",
    targetPerMonth: 4, targetPerWeek: 1,
    platforms: ["IG", "LI"], isActive: true,
  },
  {
    id: "s2", name: "Ghar Wapsi", emoji: "🏡",
    description: "Stories of employees and customers returning home — emotional NRI journey content.",
    vertical: "SY_INDIA", color: "#f97316",
    targetPerMonth: 4, targetPerWeek: 1,
    platforms: ["IG", "YT"], isActive: true,
  },
  {
    id: "s3", name: "Market Mondays", emoji: "📊",
    description: "Weekly real estate market updates, trends and price analysis.",
    vertical: "SY_INDIA", color: "#2563eb",
    targetPerMonth: 4, targetPerWeek: 1,
    platforms: ["IG", "LI", "YT"], isActive: true,
  },
  {
    id: "s4", name: "Dubai Decoded", emoji: "🌆",
    description: "Investment insights and lifestyle content for the UAE market.",
    vertical: "SY_UAE", color: "#0891b2",
    targetPerMonth: 6, targetPerWeek: 2,
    platforms: ["IG", "YT"], isActive: true,
  },
  {
    id: "s5", name: "Design Diaries", emoji: "🎨",
    description: "Interior design inspiration, before/after transformations and expert tips.",
    vertical: "INTERIOR", color: "#7c3aed",
    targetPerMonth: 8, targetPerWeek: 2,
    platforms: ["IG", "FB"], isActive: true,
  },
];

const MOCK_ITEMS: CalendarItem[] = [
  { id:"i1",  title:"She Leads — Priya Sharma's Journey from Agent to Director", seriesId:"s1", vertical:"SY_INDIA", platforms:["IG","LI"], type:"Reel", plannedDate:"3 Mar", status:"PUBLISHED", assignee:"Rahul V" },
  { id:"i2",  title:"She Leads — Breaking Barriers in Commercial Real Estate",    seriesId:"s1", vertical:"SY_INDIA", platforms:["IG","LI"], type:"Reel", plannedDate:"10 Mar", status:"PUBLISHED", assignee:"Rahul V" },
  { id:"i3",  title:"She Leads — Women's Day Special — Top 5 Women Leaders",      seriesId:"s1", vertical:"SY_INDIA", platforms:["IG","LI"], type:"Carousel", plannedDate:"15 Mar", status:"SCRIPT_READY", assignee:"Priya S" },
  { id:"i4",  title:"She Leads — NRI Women Investing in India",                   seriesId:"s1", vertical:"SY_INDIA", platforms:["IG"],      type:"Reel", plannedDate:"22 Mar", status:"PLANNED", assignee:"Rahul V" },
  { id:"i5",  title:"Ghar Wapsi — Ramesh's Story: 10 Years in Dubai, Home in Pune", seriesId:"s2", vertical:"SY_INDIA", platforms:["IG","YT"], type:"Reel", plannedDate:"5 Mar", status:"PUBLISHED", assignee:"Karan M" },
  { id:"i6",  title:"Ghar Wapsi — Coming Home for the First Time in 5 Years",    seriesId:"s2", vertical:"SY_INDIA", platforms:["IG","YT"], type:"Reel", plannedDate:"12 Mar", status:"DELAYED", assignee:"Karan M" },
  { id:"i7",  title:"Ghar Wapsi — The Emotional Journey of Buying Your First Home", seriesId:"s2", vertical:"SY_INDIA", platforms:["YT"],      type:"Video", plannedDate:"19 Mar", status:"PLANNED", assignee:"Karan M" },
  { id:"i8",  title:"Market Mondays — Pune Property Prices March Week 1",         seriesId:"s3", vertical:"SY_INDIA", platforms:["IG","LI","YT"], type:"Reel", plannedDate:"3 Mar", status:"PUBLISHED", assignee:"Anjali T" },
  { id:"i9",  title:"Market Mondays — Top Localities to Invest in Pune 2026",     seriesId:"s3", vertical:"SY_INDIA", platforms:["IG","LI","YT"], type:"Carousel", plannedDate:"10 Mar", status:"PUBLISHED", assignee:"Anjali T" },
  { id:"i10", title:"Market Mondays — Is Now a Good Time to Buy in Bangalore?",   seriesId:"s3", vertical:"SY_INDIA", platforms:["IG","LI"],    type:"Reel", plannedDate:"17 Mar", status:"SCHEDULED", assignee:"Anjali T" },
  { id:"i11", title:"Market Mondays — March End Market Wrap-Up",                  seriesId:"s3", vertical:"SY_INDIA", platforms:["IG","LI","YT"], type:"Reel", plannedDate:"31 Mar", status:"PLANNED", assignee:"Anjali T" },
  { id:"i12", title:"Dubai Decoded — Why RAK is the New Investment Hotspot",      seriesId:"s4", vertical:"SY_UAE",   platforms:["IG","YT"], type:"Reel", plannedDate:"4 Mar", status:"PUBLISHED", assignee:"Sneha R" },
  { id:"i13", title:"Dubai Decoded — Downtown Dubai vs Business Bay — Where to Invest", seriesId:"s4", vertical:"SY_UAE", platforms:["IG","YT"], type:"Reel", plannedDate:"8 Mar", status:"PUBLISHED", assignee:"Sneha R" },
  { id:"i14", title:"Dubai Decoded — Golden Visa for Property Investors Explained", seriesId:"s4", vertical:"SY_UAE", platforms:["IG"],       type:"Carousel", plannedDate:"12 Mar", status:"SCRIPT_READY", assignee:"Sneha R" },
  { id:"i15", title:"Design Diaries — 2BHK Mumbai Flat Transformation",           seriesId:"s5", vertical:"INTERIOR", platforms:["IG","FB"], type:"Reel", plannedDate:"2 Mar", status:"PUBLISHED", assignee:"Priya S" },
  { id:"i16", title:"Design Diaries — Japandi Style for Small Apartments",        seriesId:"s5", vertical:"INTERIOR", platforms:["IG","FB"], type:"Carousel", plannedDate:"9 Mar", status:"PUBLISHED", assignee:"Priya S" },
];

const VERTICALS = [
  { value: "all",            label: "All Verticals" },
  { value: "SY_INDIA",       label: "Square Yards India" },
  { value: "SY_UAE",         label: "Square Yards UAE" },
  { value: "INTERIOR",       label: "Interior Company" },
  { value: "SQUARE_CONNECT", label: "Square Connect" },
  { value: "UM",             label: "UM" },
];

const PLATFORM_OPTIONS = ["IG", "LI", "FB", "YT"];
const VERTICAL_OPTIONS = ["SY_INDIA", "SY_UAE", "INTERIOR", "SQUARE_CONNECT", "UM"];
const VERTICAL_LABELS: Record<string, string> = {
  SY_INDIA: "Square Yards India", SY_UAE: "Square Yards UAE",
  INTERIOR: "Interior Company", SQUARE_CONNECT: "Square Connect", UM: "UM",
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PUBLISHED:      { bg: "bg-green-100",   text: "text-green-700",   label: "Published" },
  SCHEDULED:      { bg: "bg-indigo-100",  text: "text-indigo-700",  label: "Scheduled" },
  SCRIPT_READY:   { bg: "bg-blue-100",    text: "text-blue-700",    label: "Script Ready" },
  VIDEO_UPLOADED: { bg: "bg-purple-100",  text: "text-purple-700",  label: "Video Uploaded" },
  DELAYED:        { bg: "bg-amber-100",   text: "text-amber-700",   label: "Delayed" },
  PLANNED:        { bg: "bg-gray-100",    text: "text-gray-600",    label: "Planned" },
};

// ── Empty series form ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "", description: "", vertical: "SY_INDIA", color: "#2563eb",
  emoji: "🎬", targetPerMonth: 4, targetPerWeek: 1, platforms: ["IG"],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [tab,            setTab]            = useState<"overview"|"series"|"calendar">("overview");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [seriesList,     setSeriesList]     = useState<Series[]>(INITIAL_SERIES);
  const [items]                             = useState<CalendarItem[]>(MOCK_ITEMS);
  const [expanded,       setExpanded]       = useState<string[]>(["s1","s2","s3"]);
  const [showForm,       setShowForm]       = useState(false);
  const [editingSeries,  setEditingSeries]  = useState<Series | null>(null);
  const [form,           setForm]           = useState({ ...EMPTY_FORM });

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredSeries = seriesList.filter(s =>
    verticalFilter === "all" || s.vertical === verticalFilter
  );

  function getSeriesItems(seriesId: string) {
    return items.filter(i => i.seriesId === seriesId);
  }

  function getPublished(seriesId: string) {
    return items.filter(i => i.seriesId === seriesId && i.status === "PUBLISHED").length;
  }

  function getProgress(series: Series) {
    const published = getPublished(series.id);
    const target    = series.targetPerMonth;
    return { published, target, pct: Math.min(100, Math.round((published / target) * 100)) };
  }

  // ── Form handlers ────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingSeries(null);
    setShowForm(true);
  }

  function openEdit(s: Series) {
    setForm({
      name: s.name, description: s.description, vertical: s.vertical,
      color: s.color, emoji: s.emoji, targetPerMonth: s.targetPerMonth,
      targetPerWeek: s.targetPerWeek, platforms: s.platforms,
    });
    setEditingSeries(s);
    setShowForm(true);
  }

  function saveSeries() {
    if (!form.name.trim()) return;
    if (editingSeries) {
      setSeriesList(prev => prev.map(s =>
        s.id === editingSeries.id ? { ...s, ...form } : s
      ));
    } else {
      setSeriesList(prev => [...prev, {
        id: `s${Date.now()}`, ...form, isActive: true,
      }]);
    }
    setShowForm(false);
  }

  function deleteSeries(id: string) {
    setSeriesList(prev => prev.filter(s => s.id !== id));
  }

  function toggleExpand(id: string) {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function togglePlatform(p: string) {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  }

  // ── Summary stats ────────────────────────────────────────────────────────────

  const totalTarget    = filteredSeries.reduce((a, s) => a + s.targetPerMonth, 0);
  const totalPublished = filteredSeries.reduce((a, s) => a + getPublished(s.id), 0);
  const onTrack        = filteredSeries.filter(s => { const p = getProgress(s); return p.pct >= 50; }).length;
  const behindCount    = filteredSeries.filter(s => { const p = getProgress(s); return p.pct < 50; }).length;

  return (
    <>
      <Header
        title="AI Content Calendar"
        subtitle="Plan monthly content by series, set targets and track execution"
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-accent-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-600">
            <Plus size={15}/> New Series
          </button>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mt-4 w-fit">
        {[
          { key:"overview", label:"Overview" },
          { key:"series",   label:"Manage Series" },
          { key:"calendar", label:"Calendar View" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              tab === t.key ? "bg-white text-accent-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Vertical filter */}
      <div className="mt-4">
        <Select value={verticalFilter} onChange={v => setVerticalFilter(v)} options={VERTICALS} className="w-52"/>
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="mt-5 space-y-5">

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{filteredSeries.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active Series</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-accent-600">{totalTarget}</p>
              <p className="text-xs text-gray-500 mt-0.5">Videos targeted / month</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{totalPublished}</p>
              <p className="text-xs text-gray-500 mt-0.5">Published this month</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{behindCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Series behind target</p>
            </Card>
          </div>

          {/* Per-series progress */}
          <div className="space-y-3">
            {filteredSeries.map(series => {
              const { published, target, pct } = getProgress(series);
              const isExpanded = expanded.includes(series.id);
              const seriesItems = getSeriesItems(series.id);
              const behind = pct < 50;

              return (
                <Card key={series.id} className={cn("overflow-hidden", behind && "border-amber-200")}>
                  {/* Series header */}
                  <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(series.id)}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: series.color + "20", border: `2px solid ${series.color}40` }}>
                      {series.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm">{series.name}</h3>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {VERTICAL_LABELS[series.vertical] ?? series.vertical}
                        </span>
                        {behind && (
                          <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={9}/> Behind target
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width:`${pct}%`, backgroundColor: series.color }}/>
                        </div>
                        <span className="text-xs font-semibold shrink-0" style={{ color: series.color }}>
                          {published}/{target} videos
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          Target: {series.targetPerWeek}/week · {series.targetPerMonth}/month
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      {series.platforms.map(p => (
                        <span key={p} className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                      {isExpanded ? <ChevronDown size={14} className="text-gray-400 ml-1"/> : <ChevronRight size={14} className="text-gray-400 ml-1"/>}
                    </div>
                  </div>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {seriesItems.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No content planned for this series yet.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium text-gray-500">Title</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-500">Type</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-500">Planned</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-500">Assignee</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seriesItems.map(item => {
                              const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.PLANNED;
                              return (
                                <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5">
                                    <p className="font-medium text-gray-800 truncate max-w-[300px]">{item.title}</p>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500">{item.type}</td>
                                  <td className="px-4 py-2.5 text-gray-500">{item.plannedDate}</td>
                                  <td className="px-4 py-2.5 text-gray-500">{item.assignee}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", st.bg, st.text)}>
                                      {st.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      {/* Add item to series */}
                      <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                        <button className="text-xs text-accent-600 hover:text-accent-700 flex items-center gap-1 font-medium">
                          <Plus size={12}/> Add video to {series.name}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SERIES TAB ────────────────────────────────────────────────────────── */}
      {tab === "series" && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSeries.map(series => {
              const { published, target, pct } = getProgress(series);
              return (
                <Card key={series.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: series.color + "20", border:`2px solid ${series.color}40` }}>
                      {series.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm">{series.name}</h3>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(series)} className="text-gray-400 hover:text-accent-500 p-1"><Edit2 size={13}/></button>
                          <button onClick={() => deleteSeries(series.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={13}/></button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{series.description}</p>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">Monthly progress</span>
                          <span className="font-semibold" style={{ color: series.color }}>{published}/{target} videos</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width:`${pct}%`, backgroundColor: series.color }}/>
                        </div>

                        <div className="flex gap-3 text-[10px] text-gray-500 pt-1">
                          <span className="flex items-center gap-1"><Target size={9}/> {series.targetPerMonth}/month</span>
                          <span className="flex items-center gap-1"><Clock size={9}/> {series.targetPerWeek}/week</span>
                          <span className="text-gray-400">{VERTICAL_LABELS[series.vertical] ?? series.vertical}</span>
                        </div>

                        <div className="flex gap-1 pt-1">
                          {series.platforms.map(p => (
                            <span key={p} className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Add new series card */}
            <button onClick={openCreate}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center hover:border-accent-300 hover:bg-accent-50/30 transition-all group">
              <Plus size={24} className="mx-auto text-gray-300 group-hover:text-accent-400 mb-2"/>
              <p className="text-sm font-medium text-gray-400 group-hover:text-accent-500">Create New Series</p>
              <p className="text-xs text-gray-300 mt-1">e.g. She Leads, Ghar Wapsi</p>
            </button>
          </div>
        </div>
      )}

      {/* ── CALENDAR TAB ──────────────────────────────────────────────────────── */}
      {tab === "calendar" && (
        <div className="mt-5">
          <div className="callout-info text-sm mb-4">
            Showing March 2026 — all content grouped by series. Items without a series are shown at the bottom.
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px] w-[180px]">Series</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]">Title</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]">Platforms</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]">Assignee</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSeries.map(series => {
                    const si = getSeriesItems(series.id).filter(i =>
                      verticalFilter === "all" || i.vertical === verticalFilter
                    );
                    if (si.length === 0) return null;
                    return si.map((item, idx) => {
                      const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.PLANNED;
                      return (
                        <tr key={item.id} className={cn("border-t border-gray-100 hover:bg-gray-50/50", item.status === "DELAYED" && "bg-amber-50/20")}>
                          {idx === 0 && (
                            <td className="px-4 py-2.5 align-top" rowSpan={si.length}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm shrink-0"
                                  style={{ backgroundColor: series.color + "20" }}>
                                  {series.emoji}
                                </div>
                                <span className="font-semibold text-xs" style={{ color: series.color }}>{series.name}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-800 max-w-[280px] truncate">{item.title}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              {item.platforms.map(p => (
                                <span key={p} className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{item.plannedDate}</td>
                          <td className="px-4 py-2.5 text-gray-500">{item.assignee}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", st.bg, st.text)}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── SERIES FORM MODAL ────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">{editingSeries ? "Edit Series" : "Create New Series"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-1/4">
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Emoji</label>
                  <input value={form.emoji} onChange={e => setForm(p => ({...p, emoji: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xl text-center focus:outline-none focus:ring-2 focus:ring-accent-500"/>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Series Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                    placeholder="e.g. She Leads, Ghar Wapsi"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                  placeholder="What is this series about?"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Vertical</label>
                  <select value={form.vertical} onChange={e => setForm(p => ({...p, vertical: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                    {VERTICAL_OPTIONS.map(v => <option key={v} value={v}>{VERTICAL_LABELS[v]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Series Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.color} onChange={e => setForm(p => ({...p, color: e.target.value}))}
                      className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5"/>
                    <span className="text-xs text-gray-500">{form.color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    <Target size={11} className="inline mr-1"/>Target videos / month
                  </label>
                  <input type="number" min={1} max={31} value={form.targetPerMonth}
                    onChange={e => setForm(p => ({...p, targetPerMonth: +e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    <Clock size={11} className="inline mr-1"/>Target videos / week
                  </label>
                  <input type="number" min={1} max={7} value={form.targetPerWeek}
                    onChange={e => setForm(p => ({...p, targetPerWeek: +e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Platforms</label>
                <div className="flex gap-2">
                  {PLATFORM_OPTIONS.map(p => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        form.platforms.includes(p)
                          ? "bg-accent-500 text-white border-accent-500"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      )}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveSeries}
                className="flex-1 bg-accent-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-accent-600">
                {editingSeries ? "Save Changes" : "Create Series"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
