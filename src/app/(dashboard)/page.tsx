import { Header } from "@/components/layout/Header";
import { Card, MetricCard, SectionHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  TrendingUp, Users, FileText, BarChart2, Calendar,
  Bell, CheckCircle2, Clock, AlertTriangle, Zap,
} from "lucide-react";

const QUICK_STATS = [
  { label: "Social Posts This Month", value: "47", delta: "+12", up: true, icon: <BarChart2 size={18} className="text-accent-500" /> },
  { label: "Content On Schedule", value: "82%", delta: "+5%", up: true, icon: <CheckCircle2 size={18} className="text-green-500" /> },
  { label: "Delayed Items", value: "8", delta: "-3", up: true, icon: <AlertTriangle size={18} className="text-amber-500" /> },
  { label: "Pending Scripts", value: "5", delta: null, up: null, icon: <FileText size={18} className="text-purple-500" /> },
];

const ACTIVITY = [
  { action: "Published", title: "Pune Real Estate Market Report — March 2026", time: "5 Mar, 10:15 AM", vertical: "SY India", status: "published" as const },
  { action: "Delayed", title: "Top 5 Investment Hotspots in Dubai 2026", time: "8 Mar, 9:00 AM", vertical: "SY UAE", status: "delayed" as const },
  { action: "Script Ready", title: "Interior Design Trends for 2026 Homes", time: "7 Mar, 3:30 PM", vertical: "Interior", status: "script_ready" as const },
  { action: "Scheduled", title: "Square Connect Agent Success Stories", time: "9 Mar, 11:00 AM", vertical: "Square Connect", status: "scheduled" as const },
];

const MODULES = [
  { name: "Social Media Performance", href: "/social/performance", icon: "📊", desc: "Analytics across all verticals" },
  { name: "AI Content Planner", href: "/social/planner", icon: "🤖", desc: "Competitor-informed monthly calendars" },
  { name: "Script Creator", href: "/social/scripts", icon: "✍️", desc: "AI-powered reel scripts & hooks" },
  { name: "Content Calendar", href: "/social/calendar", icon: "📅", desc: "Publish workflow & adherence tracking" },
  { name: "Notifications", href: "/social/notifications", icon: "🔔", desc: "Post-publish alerts & channel config" },
];

const statusStyle: Record<string, string> = {
  published: "bg-green-50 text-green-700 border-green-200",
  delayed:   "bg-amber-50 text-amber-700 border-amber-200",
  script_ready: "bg-blue-50 text-blue-700 border-blue-200",
  scheduled: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Marketing Intelligence Platform"
        subtitle="Welcome back, Divya — here's your team overview for today"
      />

      <div className="mt-6 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_STATS.map((s) => (
            <Card key={s.label} className="p-4 flex items-start gap-3">
              <div className="mt-0.5">{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                {s.delta && (
                  <p className={`text-xs font-medium ${s.up ? "text-green-600" : "text-red-600"}`}>
                    {s.delta} vs last month
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent activity */}
          <div className="lg:col-span-2">
            <SectionHeader title="Recent Activity" subtitle="Latest updates across your social media teams" />
            <div className="space-y-2">
              {ACTIVITY.map((a, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${statusStyle[a.status]}`}>
                          {a.action}
                        </span>
                        <span className="text-xs text-gray-400">{a.vertical}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <Clock size={11} />
                      {a.time}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <SectionHeader title="Quick Access" subtitle="Jump to any module" />
            <div className="space-y-2">
              {MODULES.map((m) => (
                <a key={m.name} href={m.href}>
                  <Card className="p-3 hover:shadow-card-hover transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.desc}</p>
                      </div>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Info callout */}
        <div className="callout-info text-sm">
          <strong>🚀 SquareLabs is live.</strong> More modules coming soon: Task Management, KPI Dashboard, ORM,
          AI Creative Generator, Competitor Analysis, and HR & Headcount. Contact your admin to enable early access.
        </div>
      </div>
    </>
  );
}
