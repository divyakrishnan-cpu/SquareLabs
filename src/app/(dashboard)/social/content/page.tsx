"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import {
  Calendar, Clock, Upload, Send, CheckCircle2, AlertTriangle,
  ExternalLink, RotateCcw, Filter, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const VERTICALS = [
  { value: "all",            label: "All Verticals" },
  { value: "SY_INDIA",       label: "Square Yards India" },
  { value: "SY_UAE",         label: "Square Yards UAE" },
  { value: "INTERIOR",       label: "Interior Company" },
  { value: "SQUARE_CONNECT", label: "Square Connect" },
  { value: "UM",             label: "UM" },
];

const STATUS_OPTIONS = [
  { value: "all",              label: "All Statuses" },
  { value: "PLANNED",          label: "Planned" },
  { value: "SCRIPT_READY",     label: "Script Ready" },
  { value: "VIDEO_UPLOADED",   label: "Video Uploaded" },
  { value: "SCHEDULED",        label: "Scheduled" },
  { value: "PUBLISHED",        label: "Published" },
  { value: "DELAYED",          label: "Delayed" },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PLANNED:        { bg: "bg-gray-100",   text: "text-gray-600",   label: "Planned" },
  SCRIPT_READY:   { bg: "bg-blue-100",   text: "text-blue-700",   label: "Script Ready" },
  VIDEO_UPLOADED: { bg: "bg-purple-100", text: "text-purple-700", label: "Video Uploaded" },
  SCHEDULED:      { bg: "bg-indigo-100", text: "text-indigo-700", label: "Scheduled" },
  PUBLISHED:      { bg: "bg-green-100",  text: "text-green-700",  label: "Published" },
  DELAYED:        { bg: "bg-amber-100",  text: "text-amber-700",  label: "Delayed" },
  RESCHEDULED:    { bg: "bg-orange-100", text: "text-orange-700", label: "Rescheduled" },
};

const DELAY_REASONS = [
  "Shoot Pending",
  "Delayed due to shoot",
  "Delayed due to editing",
  "Approval pending",
  "Creative not ready",
  "Talent unavailable",
  "Technical issue",
  "Strategy change",
  "Other",
];

const SERIES_MAP: Record<string, { name: string; emoji: string; color: string }> = {
  s1: { name: "She Leads",       emoji: "👩‍💼", color: "#ec4899" },
  s2: { name: "Ghar Wapsi",      emoji: "🏡",  color: "#f97316" },
  s3: { name: "Market Mondays",  emoji: "📊",  color: "#2563eb" },
  s4: { name: "Dubai Decoded",   emoji: "🌆",  color: "#0891b2" },
  s5: { name: "Design Diaries",  emoji: "🎨",  color: "#7c3aed" },
};

const MOCK_ITEMS = [
  { id:"c1", title:"Pune Real Estate Market Report Q1 2026", seriesId:"s3", vertical:"SY India", platforms:["IG","YT","LI"], type:"Reel", plannedDate:"5 Mar 2026", status:"PUBLISHED", assignee:"Rahul V", instagramLink:"https://instagram.com/p/abc", youtubeLink:"https://youtube.com/watch?v=xyz", linkedinLink:"https://linkedin.com/post/def" },
  { id:"c2", title:"Top 5 Dubai Investment Hotspots 2026", seriesId:"s4", vertical:"SY UAE", platforms:["IG","LI"], type:"Carousel", plannedDate:"8 Mar 2026", status:"DELAYED", assignee:"Sneha R", delayReason:"Delayed due to editing" },
  { id:"c3", title:"Interior Design Trends for Modern Homes", seriesId:"s5", vertical:"Interior", platforms:["IG","FB"], type:"Reel", plannedDate:"10 Mar 2026", status:"SCRIPT_READY", assignee:"Priya S" },
  { id:"c4", title:"How Square Connect Helps Agents Close Deals", seriesId:null, vertical:"SQ Connect", platforms:["LI","YT"], type:"Video", plannedDate:"12 Mar 2026", status:"VIDEO_UPLOADED", assignee:"Karan M" },
  { id:"c5", title:"UM Property Investment Guide 2026", seriesId:null, vertical:"UM", platforms:["IG"], type:"Reel", plannedDate:"15 Mar 2026", status:"SCHEDULED", assignee:"Anjali T", scheduledAt:"15 Mar 2026, 10:00 AM" },
  { id:"c6", title:"NRI Investment Opportunities in India", seriesId:"s2", vertical:"SY India", platforms:["IG","LI","YT"], type:"Reel", plannedDate:"17 Mar 2026", status:"PLANNED", assignee:"Rahul V" },
];

function SeriesBadge({ seriesId }: { seriesId: string | null }) {
  if (!seriesId || !SERIES_MAP[seriesId]) return <span className="text-[10px] text-gray-400">—</span>;
  const s = SERIES_MAP[seriesId];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ backgroundColor: s.color + "15", color: s.color, borderColor: s.color + "40" }}>
      {s.emoji} {s.name}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.PLANNED;
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

function PlatformBadge({ p }: { p: string }) {
  const colors: Record<string,string> = {
    IG: "bg-pink-100 text-pink-700",
    LI: "bg-blue-100 text-blue-700",
    FB: "bg-indigo-100 text-indigo-700",
    YT: "bg-red-100 text-red-700",
  };
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", colors[p] ?? "bg-gray-100 text-gray-600")}>{p}</span>;
}

export default function ContentManagementPage() {
  const [vertical, setVertical] = useState("all");
  const [status, setStatus]     = useState("all");
  const [scheduleModal, setScheduleModal] = useState<string|null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<string|null>(null);
  const [delayReason, setDelayReason] = useState(DELAY_REASONS[0]);
  const [delayNote, setDelayNote] = useState("");

  const filtered = MOCK_ITEMS.filter(i =>
    (vertical === "all" || i.vertical.toLowerCase().includes(vertical.toLowerCase().replace("_"," "))) &&
    (status === "all" || i.status === status)
  );

  const total     = MOCK_ITEMS.length;
  const published = MOCK_ITEMS.filter(i => i.status === "PUBLISHED").length;
  const delayed   = MOCK_ITEMS.filter(i => i.status === "DELAYED").length;
  const adherence = Math.round((published / total) * 100);

  return (
    <>
      <Header title="Content Management" subtitle="Track, schedule and publish your social media content" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{adherence}%</p>
          <p className="text-xs text-gray-500 mt-0.5">On-schedule adherence</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{published}</p>
          <p className="text-xs text-gray-500 mt-0.5">Published this month</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{delayed}</p>
          <p className="text-xs text-gray-500 mt-0.5">Delayed items</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mt-5">
        <Select value={vertical} onChange={v => setVertical(v)} options={VERTICALS} className="w-48" />
        <Select value={status}   onChange={v => setStatus(v)}   options={STATUS_OPTIONS} className="w-44" />
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Title</th>
                <th>Series</th>
                <th>Vertical</th>
                <th>Platforms</th>
                <th>Type</th>
                <th>Planned Date</th>
                <th>Assigned</th>
                <th>Status</th>
                <th>Links</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className={cn(item.status === "DELAYED" && "bg-amber-50/30")}>
                  <td>
                    <div className="max-w-[220px]">
                      <p className="font-medium text-gray-900 text-xs truncate">{item.title}</p>
                      {item.status === "DELAYED" && item.delayReason && (
                        <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={9}/> {item.delayReason}
                        </p>
                      )}
                      {item.status === "SCHEDULED" && (item as any).scheduledAt && (
                        <p className="text-[10px] text-indigo-600 mt-0.5 flex items-center gap-1">
                          <Clock size={9}/> {(item as any).scheduledAt}
                        </p>
                      )}
                    </div>
                  </td>
                  <td><SeriesBadge seriesId={(item as any).seriesId}/></td>
                  <td><span className="text-xs text-gray-600">{item.vertical}</span></td>
                  <td><div className="flex gap-1">{item.platforms.map(p => <PlatformBadge key={p} p={p}/>)}</div></td>
                  <td><span className="text-xs text-gray-600">{item.type}</span></td>
                  <td><span className="text-xs text-gray-600">{item.plannedDate}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-accent-100 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-accent-700">{item.assignee.split(" ").map(w=>w[0]).join("")}</span>
                      </div>
                      <span className="text-xs text-gray-600">{item.assignee}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={item.status}/></td>
                  <td>
                    {item.status === "PUBLISHED" && (
                      <div className="flex gap-2">
                        {item.instagramLink && <a href={item.instagramLink} target="_blank" className="text-pink-500 hover:text-pink-700"><ExternalLink size={12}/></a>}
                        {item.youtubeLink   && <a href={item.youtubeLink}   target="_blank" className="text-red-500 hover:text-red-700"><ExternalLink size={12}/></a>}
                        {item.linkedinLink  && <a href={item.linkedinLink}  target="_blank" className="text-blue-500 hover:text-blue-700"><ExternalLink size={12}/></a>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {(item.status === "SCRIPT_READY" || item.status === "VIDEO_UPLOADED" || item.status === "PLANNED") && (
                        <button onClick={() => setScheduleModal(item.id)}
                          className="text-[11px] bg-accent-500 text-white px-2 py-1 rounded hover:bg-accent-600 flex items-center gap-1">
                          <Send size={10}/> Schedule
                        </button>
                      )}
                      {item.status === "SCHEDULED" && (
                        <button className="text-[11px] bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 flex items-center gap-1">
                          <CheckCircle2 size={10}/> Mark Published
                        </button>
                      )}
                      {(item.status === "DELAYED" || item.status === "PLANNED") && (
                        <button onClick={() => setRescheduleModal(item.id)}
                          className="text-[11px] bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 flex items-center gap-1">
                          <RotateCcw size={10}/> Reschedule
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Schedule Post</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Upload Video</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <Upload size={20} className="mx-auto text-gray-400 mb-2"/>
                  <p className="text-xs text-gray-500">Drag & drop or click to upload</p>
                  <p className="text-[10px] text-gray-400 mt-1">MP4, MOV up to 500MB</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Caption</label>
                <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none" placeholder="Write your caption..."/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Schedule Date & Time</label>
                <input type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setScheduleModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setScheduleModal(null)} className="flex-1 bg-accent-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-accent-600">Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Reschedule Post</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">New Date</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Reason for delay</label>
                <select value={delayReason} onChange={e => setDelayReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                  {DELAY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Additional notes (optional)</label>
                <textarea rows={2} value={delayNote} onChange={e => setDelayNote(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none" placeholder="Any additional context..."/>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setRescheduleModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setRescheduleModal(null)} className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-amber-600">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
