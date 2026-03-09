import { Header } from "@/components/layout/Header";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Send, CheckCircle2, ExternalLink, Bell } from "lucide-react";

const MOCK_NOTIFICATIONS = [
  {
    id: "n1",
    title: "Pune Real Estate Market Report — March 2026",
    publishedAt: "5 Mar 2026, 10:15 AM IST",
    vertical: "Square Yards India",
    channels: ["WhatsApp", "Slack", "Email"],
    links: {
      instagram: "https://instagram.com/p/abc123",
      youtube:   "https://youtube.com/watch?v=xyz789",
      linkedin:  "https://linkedin.com/posts/def456",
    },
    status: "sent",
  },
  {
    id: "n2",
    title: "Top 5 Investment Hotspots in Dubai 2026",
    publishedAt: "8 Mar 2026, 9:00 AM GST",
    vertical: "Square Yards UAE",
    channels: ["Slack"],
    links: {
      instagram: "https://instagram.com/p/xyz456",
      linkedin:  "https://linkedin.com/posts/ghi789",
    },
    status: "sent",
  },
];

function NotificationPreview({ notif }: { notif: (typeof MOCK_NOTIFICATIONS)[0] }) {
  const linkStr = [
    notif.links.instagram ? `Insta: ${notif.links.instagram}` : null,
    notif.links.youtube   ? `YouTube: ${notif.links.youtube}` : null,
    notif.links.linkedin  ? `LinkedIn: ${notif.links.linkedin}` : null,
    notif.links.facebook  ? `FB: ${(notif.links as any).facebook}` : null,
  ].filter(Boolean).join("  ");

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={15} className="text-green-500 shrink-0" />
            <span className="text-xs text-green-600 font-medium">Published successfully</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{notif.publishedAt}</span>
          </div>

          {/* Formatted notification message */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 font-mono text-sm text-gray-800 mb-3">
            <span className="text-gray-500">📣 </span>
            <strong>{notif.title}</strong>
            {" — "}
            <span className="text-gray-600">{linkStr}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Sent to:</span>
            {notif.channels.map((c) => (
              <Badge key={c} variant="info" className="text-[10px]">{c}</Badge>
            ))}
            <span className="text-xs text-gray-400 ml-auto">{notif.vertical}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" leftIcon={<Send size={12} />}>Resend</Button>
        </div>
      </div>
    </Card>
  );
}

export default function NotificationsPage() {
  return (
    <>
      <Header
        title="Post-Publish Notifications"
        subtitle="Automated messages sent on every successful publish"
        actions={<Button variant="secondary" size="sm" leftIcon={<Bell size={13} />}>Configure Channels</Button>}
      />

      <div className="mt-6 space-y-6">
        {/* Config panel */}
        <Card className="p-5">
          <SectionHeader title="Notification Settings" subtitle="Configure where publish alerts are sent per vertical" />
          <div className="callout-info text-sm mb-4">
            When a post is successfully published, the system sends a formatted message to all configured channels:
            {" "}<code className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs font-mono">📣 {"<Title>"} — Insta: {"<link>"} YouTube: {"<link>"} LinkedIn: {"<link>"}</code>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { channel: "WhatsApp Group", icon: "💬", desc: "Via WhatsApp Business API", connected: true },
              { channel: "Slack Channel", icon: "⚡", desc: "#social-live per vertical", connected: true },
              { channel: "Email", icon: "📧", desc: "divya.krishnan@squareyards.com", connected: true },
            ].map((c) => (
              <div key={c.channel} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                <span className="text-xl">{c.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{c.channel}</p>
                    <Badge variant="success" className="text-[10px]">Connected</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent notifications */}
        <div>
          <SectionHeader title="Recent Notifications" subtitle="Last 30 days" />
          <div className="space-y-3">
            {MOCK_NOTIFICATIONS.map((n) => <NotificationPreview key={n.id} notif={n} />)}
          </div>
        </div>
      </div>
    </>
  );
}
