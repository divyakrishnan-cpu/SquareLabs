"use client";

import { useState } from "react";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  Calendar, Upload, CheckCircle2, Clock, AlertTriangle,
  MoreHorizontal, ExternalLink, Send, ArrowRight, X, FileText,
} from "lucide-react";
import {
  VERTICAL_LABELS, DELAY_REASON_LABELS, STATUS_CONFIG,
  type ContentCalendarItem, type CalendarItemStatus,
  type Vertical, type DelayReason,
} from "@/types";
import { cn } from "@/lib/utils";
import { shortDate, formatDateTime } from "@/lib/utils";

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_ITEMS: ContentCalendarItem[] = [
  {
    id:"1", vertical:"SY_INDIA", platforms:["INSTAGRAM","YOUTUBE","LINKEDIN"],
    contentType:"REEL", category:"EDUCATION",
    title:"Is Now the Best Time to Buy a 2BHK in Mumbai?",
    hook:"Stop scrolling if you're planning to buy property in 2026",
    assignedTo:{ id:"u1", name:"Priya Sharma" },
    plannedDate:"2026-03-10", scheduledAt:"2026-03-10T10:00:00",
    status:"SCHEDULED",
    instagramLink:"", youtubeLink:"", linkedinLink:"",
  },
  {
    id:"2", vertical:"SY_UAE", platforms:["INSTAGRAM","FACEBOOK"],
    contentType:"CAROUSEL", category:"LISTING",
    title:"Top 5 Investment Hotspots in Dubai 2026",
    hook:"Dubai real estate is booming — here's where smart money is going",
    assignedTo:{ id:"u2", name:"Rahul Verma" },
    plannedDate:"2026-03-11", status:"SCRIPT_READY",
  },
  {
    id:"3", vertical:"INTERIOR", platforms:["INSTAGRAM"],
    contentType:"REEL", category:"BEHIND_SCENES",
    title:"Before & After: Interior Transformation in 15 Days",
    hook:"We transformed this 3BHK in just 15 days — watch till the end",
    assignedTo:{ id:"u1", name:"Priya Sharma" },
    plannedDate:"2026-03-08", status:"DELAYED",
    delayReason:"SHOOT_DELAYED",
  },
  {
    id:"4", vertical:"SY_INDIA", platforms:["INSTAGRAM","YOUTUBE"],
    contentType:"YOUTUBE_VIDEO", category:"EDUCATION",
    title:"How NRIs Can Buy Property in India — Step by Step",
    hook:"If you're an NRI thinking about buying back home, watch this first",
    assignedTo:{ id:"u2", name:"Rahul Verma" },
    plannedDate:"2026-03-12", status:"VIDEO_UPLOADED",
    videoUrl:"https://drive.google.com/file/example",
  },
  {
    id:"5", vertical:"SY_INDIA", platforms:["INSTAGRAM","FACEBOOK","LINKEDIN"],
    contentType:"REEL", category:"MARKET_UPDATE",
    title:"Pune Real Estate Market Report — March 2026",
    hook:"Pune prices up 22% — here's what it means for buyers",
    assignedTo:{ id:"u1", name:"Priya Sharma" },
    plannedDate:"2026-03-05", status:"PUBLISHED",
    publishedAt:"2026-03-05T10:15:00",
    instagramLink:"https://instagram.com/p/abc123",
    youtubeLink:  "https://youtube.com/watch?v=xyz789",
    linkedinLink: "https://linkedin.com/posts/def456",
  },
  {
    id:"6", vertical:"SQUARE_CONNECT", platforms:["LINKEDIN"],
    contentType:"CAROUSEL", category:"BRAND",
    title:"Top 3 Agent Success Stories — Square Connect",
    hook:"These 3 agents closed ₹12 Cr+ in one month using Square Connect",
    assignedTo:{ id:"u3", name:"Amit Patel" },
    plannedDate:"2026-03-13", status:"PLANNED",
  },
  {
    id:"7", vertical:"UM", platforms:["INSTAGRAM","YOUTUBE"],
    contentType:"REEL", category:"LISTING",
    title:"Luxury Living at UM — Property Tour",
    hook:"Step inside this ₹8 Cr penthouse in the heart of South Mumbai",
    assignedTo:{ id:"u1", name:"Priya Sharma" },
    plannedDate:"2026-03-14", status:"SCRIPT_IN_PROGRESS",
  },
  {
    id:"8", vertical:"SY_INDIA", platforms:["INSTAGRAM","FACEBOOK"],
    contentType:"REEL", category:"TIPS",
    title:"Home Loan Tips That Banks Don't Tell You",
    hook:"Your bank won't tell you this — but we will",
    assignedTo:{ id:"u2", name:"Rahul Verma" },
    plannedDate:"2026-03-07", status:"RESCHEDULED",
    delayReason:"EDIT_DELAYED", rescheduledFrom:"2026-03-07",
  },
];

// ── Adherence widget ──────────────────────────────────────────────────────────
function AdherenceWidget({ items }: { items: ContentCalendarItem[] }) {
  const total      = items.length;
  const onTime     = items.filter((i) => i.status === "PUBLISHED").length;
  const delayed    = items.filter((i) => i.status === "DELAYED" || i.status === "RESCHEDULED").length;
  const notPub     = items.filter((i) => !["PUBLISHED","CANCELLED"].includes(i.status)).length;
  const adherence  = total > 0 ? Math.round((onTime / total) * 100) : 0;

  const byVertical = Object.keys(VERTICAL_LABELS).map((v) => {
    const vItems   = items.filter((i) => i.vertical === v);
    const vOnTime  = vItems.filter((i) => i.status === "PUBLISHED").length;
    const vDelayed = vItems.filter((i) => i.status === "DELAYED" || i.status === "RESCHEDULED").length;
    return { vertical: v, label: VERTICAL_LABELS[v as Vertical], total: vItems.length, onTime: vOnTime, delayed: vDelayed };
  }).filter((v) => v.total > 0);

  return (
    <Card className="p-5">
      <SectionHeader title="Publishing Adherence" subtitle="On-plan vs off-plan this month" />
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{adherence}%</p>
          <p className="text-xs text-gray-500 mt-0.5">Adherence Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{onTime}</p>
          <p className="text-xs text-gray-500 mt-0.5">Published on Time</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{delayed}</p>
          <p className="text-xs text-gray-500 mt-0.5">Delayed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-600">{notPub}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending</p>
        </div>
      </div>
      {/* Per-vertical bars */}
      <div className="space-y-2.5">
        {byVertical.map((v) => (
          <div key={v.vertical}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-700 truncate w-36">{v.label}</span>
              <span className="text-gray-400">{v.total} planned</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-0.5">
              <div
                className="bg-green-500 rounded-full transition-all"
                style={{ width: `${v.total > 0 ? (v.onTime  / v.total) * 100 : 0}%` }}
              />
              <div
                className="bg-amber-400 rounded-full transition-all"
                style={{ width: `${v.total > 0 ? (v.delayed / v.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
function RescheduleModal({
  item, onClose, onSave,
}: {
  item: ContentCalendarItem;
  onClose: () => void;
  onSave: (newDate: string, reason: DelayReason, note: string) => void;
}) {
  const [newDate, setNewDate] = useState("");
  const [reason,  setReason]  = useState<DelayReason>("SHOOT_DELAYED");
  const [note,    setNote]    = useState("");

  const reasonOptions = Object.entries(DELAY_REASON_LABELS).map(([v, l]) => ({
    value: v, label: l,
  }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Reschedule Post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="callout-warning text-sm">
            <strong>"{item.title}"</strong> was planned for {shortDate(item.plannedDate)}.
            Please select a new date and reason.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New publish date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Delay reason <span className="text-red-500">*</span>
            </label>
            <Select
              value={reason}
              onChange={(v) => setReason(v as DelayReason)}
              options={reasonOptions}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="Any additional context..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary" size="sm"
            disabled={!newDate || !reason}
            onClick={() => onSave(newDate, reason, note)}
            leftIcon={<ArrowRight size={14} />}
          >
            Reschedule
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule to Publish Modal ─────────────────────────────────────────────────
function ScheduleModal({
  item, onClose, onSave,
}: {
  item: ContentCalendarItem;
  onClose: () => void;
  onSave: (datetime: string, caption: string) => void;
}) {
  const [datetime, setDatetime] = useState(item.plannedDate + "T10:00");
  const [caption, setCaption]   = useState(item.hook ?? "");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Schedule to Publish</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="callout-info text-sm">
            This will schedule <strong>"{item.title}"</strong> to auto-publish on the selected platforms:
            {" "}{item.platforms.join(", ")}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload video <span className="text-red-500">*</span></label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-accent-400 transition-colors cursor-pointer">
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Drop video file here, or <span className="text-accent-600 font-medium">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">MP4, MOV up to 2GB</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Caption & copy</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule date & time <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onSave(datetime, caption)} leftIcon={<Send size={14} />}>
            Schedule Post
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main CalendarTable ────────────────────────────────────────────────────────
export function CalendarTable() {
  const [items, setItems]             = useState<ContentCalendarItem[]>(MOCK_ITEMS);
  const [filterVertical, setFV]       = useState("ALL");
  const [filterStatus,   setFS]       = useState("ALL");
  const [rescheduleItem, setRescheduleItem] = useState<ContentCalendarItem | null>(null);
  const [scheduleItem,   setScheduleItem]   = useState<ContentCalendarItem | null>(null);

  const verticalOptions = [
    { value: "ALL", label: "All Verticals" },
    ...Object.entries(VERTICAL_LABELS).map(([v, l]) => ({ value: v, label: l })),
  ];
  const statusOptions = [
    { value: "ALL",       label: "All Statuses" },
    ...Object.keys(STATUS_CONFIG).map((s) => ({ value: s, label: STATUS_CONFIG[s as CalendarItemStatus].label })),
  ];

  const filtered = items.filter((i) => {
    if (filterVertical !== "ALL" && i.vertical !== filterVertical) return false;
    if (filterStatus   !== "ALL" && i.status   !== filterStatus)   return false;
    return true;
  });

  function handleReschedule(newDate: string, reason: DelayReason, note: string) {
    if (!rescheduleItem) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === rescheduleItem.id
          ? { ...i, status: "RESCHEDULED", plannedDate: newDate, delayReason: reason, delayNote: note, rescheduledFrom: i.plannedDate }
          : i
      )
    );
    setRescheduleItem(null);
  }

  function handleMarkPublished(id: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "PUBLISHED", publishedAt: new Date().toISOString() } : i
      )
    );
  }

  function handleSchedule(datetime: string, caption: string) {
    if (!scheduleItem) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === scheduleItem.id
          ? { ...i, status: "SCHEDULED", scheduledAt: datetime, caption }
          : i
      )
    );
    setScheduleItem(null);
  }

  return (
    <div className="space-y-5">
      {/* Adherence widget */}
      <AdherenceWidget items={items} />

      {/* Table */}
      <Card padding={false}>
        <div className="p-5 pb-0 flex flex-wrap items-center gap-3">
          <SectionHeader
            title="Content Calendar"
            subtitle={`${filtered.length} items`}
          />
          <div className="flex flex-wrap gap-2 ml-auto">
            <Select value={filterVertical} onChange={setFV} options={verticalOptions} size="sm" />
            <Select value={filterStatus}   onChange={setFS} options={statusOptions}   size="sm" />
            <Button variant="brand" size="sm" leftIcon={<Calendar size={13} />}>
              + Add Content
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="data-table w-full min-w-[1100px]">
            <thead>
              <tr>
                <th>Title</th>
                <th>Vertical</th>
                <th>Platforms</th>
                <th>Type</th>
                <th>Planned Date</th>
                <th>Assigned</th>
                <th>Status</th>
                <th>Delay Reason</th>
                <th>Links</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className={cn(item.status === "DELAYED" && "bg-amber-50/40")}>
                  {/* Title */}
                  <td className="max-w-xs">
                    <div className="font-medium text-gray-900 truncate">{item.title}</div>
                    {item.hook && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">{item.hook}</div>
                    )}
                  </td>

                  {/* Vertical */}
                  <td>
                    <span className="text-xs text-gray-600">{VERTICAL_LABELS[item.vertical]}</span>
                  </td>

                  {/* Platforms */}
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {item.platforms.map((p) => (
                        <Badge key={p} variant="info" className="text-[10px]">{p.slice(0,2)}</Badge>
                      ))}
                    </div>
                  </td>

                  {/* Type */}
                  <td>
                    <Badge>{item.contentType.replace("_", " ")}</Badge>
                  </td>

                  {/* Planned date */}
                  <td>
                    <div className="flex items-center gap-1.5 text-sm">
                      {item.status === "DELAYED" && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                      <span className={cn(item.status === "DELAYED" && "text-amber-700 font-medium")}>
                        {shortDate(item.plannedDate)}
                      </span>
                    </div>
                    {item.scheduledAt && (
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {formatDateTime(item.scheduledAt)}
                      </div>
                    )}
                  </td>

                  {/* Assigned */}
                  <td>
                    {item.assignedTo ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {item.assignedTo.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <span className="text-xs text-gray-700">{item.assignedTo.name}</span>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Status */}
                  <td><StatusBadge status={item.status} /></td>

                  {/* Delay reason */}
                  <td>
                    {item.delayReason ? (
                      <span className="text-xs text-amber-700 max-w-[140px] block truncate">
                        {DELAY_REASON_LABELS[item.delayReason]}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Published links */}
                  <td>
                    {item.status === "PUBLISHED" ? (
                      <div className="flex items-center gap-1.5">
                        {item.instagramLink && (
                          <a href={item.instagramLink} target="_blank" rel="noreferrer"
                            className="text-xs text-pink-500 hover:underline flex items-center gap-0.5">
                            IG <ExternalLink size={10} />
                          </a>
                        )}
                        {item.youtubeLink && (
                          <a href={item.youtubeLink} target="_blank" rel="noreferrer"
                            className="text-xs text-red-500 hover:underline flex items-center gap-0.5">
                            YT <ExternalLink size={10} />
                          </a>
                        )}
                        {item.linkedinLink && (
                          <a href={item.linkedinLink} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap=0.5">
                            LI <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex items-center gap-1">
                      {/* Script */}
                      <button title="View/Edit Script"
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <FileText size={14} />
                      </button>

                      {/* Schedule */}
                      {["SCRIPT_READY","VIDEO_UPLOADED","PLANNED"].includes(item.status) && (
                        <button
                          title="Schedule to Publish"
                          onClick={() => setScheduleItem(item)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-gray-400 hover:text-accent-600">
                          <Send size={14} />
                        </button>
                      )}

                      {/* Mark published */}
                      {item.status === "SCHEDULED" && (
                        <button
                          title="Mark as Published"
                          onClick={() => handleMarkPublished(item.id)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-green-50 text-gray-400 hover:text-green-600">
                          <CheckCircle2 size={14} />
                        </button>
                      )}

                      {/* Reschedule */}
                      {(item.status === "DELAYED" || item.status === "PLANNED") && (
                        <button
                          title="Reschedule"
                          onClick={() => setRescheduleItem(item)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600">
                          <Calendar size={14} />
                        </button>
                      )}

                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {rescheduleItem && (
        <RescheduleModal
          item={rescheduleItem}
          onClose={() => setRescheduleItem(null)}
          onSave={handleReschedule}
        />
      )}
      {scheduleItem && (
        <ScheduleModal
          item={scheduleItem}
          onClose={() => setScheduleItem(null)}
          onSave={handleSchedule}
        />
      )}
    </div>
  );
}
