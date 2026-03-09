"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, SectionHeader } from "@/components/ui/Card";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const INTEGRATIONS = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Connect your Instagram Business account to publish posts, reels, and stories.",
    icon: "📸",
    color: "bg-gradient-to-br from-pink-500 to-purple-600",
    connected: false,
    accounts: [],
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect Facebook Pages to publish content and manage comments.",
    icon: "👤",
    color: "bg-blue-600",
    connected: true,
    accounts: ["Square Yards India", "Square Yards UAE"],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Connect LinkedIn Company Pages to publish professional content.",
    icon: "💼",
    color: "bg-blue-700",
    connected: true,
    accounts: ["Square Yards", "Interior Company"],
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Connect YouTube channels to upload videos and manage content.",
    icon: "▶️",
    color: "bg-red-600",
    connected: false,
    accounts: [],
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    description: "Connect X accounts to publish tweets and threads.",
    icon: "𝕏",
    color: "bg-gray-900",
    connected: false,
    accounts: [],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect WhatsApp Business to receive post-publish notifications.",
    icon: "💬",
    color: "bg-green-500",
    connected: true,
    accounts: ["+91 98765 43210"],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect Slack workspace to receive team notifications and alerts.",
    icon: "🔷",
    color: "bg-purple-600",
    connected: true,
    accounts: ["#social-media-team"],
  },
];

const VERTICALS = [
  { id: "SY_INDIA",       label: "Square Yards India",  accounts: { instagram: "@squareyards", facebook: "Square Yards India", linkedin: "Square Yards", youtube: "Square Yards" } },
  { id: "SY_UAE",         label: "Square Yards UAE",    accounts: { instagram: "@squareyardsuae", facebook: "Square Yards UAE", linkedin: "", youtube: "" } },
  { id: "INTERIOR",       label: "Interior Company",    accounts: { instagram: "@interiorco", facebook: "", linkedin: "Interior Company", youtube: "" } },
  { id: "SQUARE_CONNECT", label: "Square Connect",      accounts: { instagram: "@squareconnect", facebook: "", linkedin: "Square Connect", youtube: "" } },
  { id: "UM",             label: "UM",                  accounts: { instagram: "@um_realty", facebook: "", linkedin: "", youtube: "" } },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"integrations" | "accounts">("integrations");

  return (
    <>
      <Header title="Settings" subtitle="Manage your social media integrations and account connections" />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mt-4 w-fit">
        {[
          { key: "integrations", label: "Platform Integrations" },
          { key: "accounts",     label: "Vertical Accounts" },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === tab.key ? "bg-white text-accent-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "integrations" && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTEGRATIONS.map(integration => (
            <Card key={integration.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", integration.color)}>
                  <span>{integration.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{integration.name}</h3>
                    {integration.connected ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={9}/> Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        <XCircle size={9}/> Not connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{integration.description}</p>

                  {integration.connected && integration.accounts.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Connected accounts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {integration.accounts.map(acc => (
                          <span key={acc} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{acc}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {integration.connected ? (
                      <>
                        <button className="text-[11px] border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                          <RefreshCw size={10}/> Reconnect
                        </button>
                        <button className="text-[11px] border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50">
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button className="text-[11px] bg-accent-500 text-white px-3 py-1.5 rounded-lg hover:bg-accent-600 flex items-center gap-1">
                        <Plus size={10}/> Connect {integration.name}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "accounts" && (
        <div className="mt-5 space-y-4">
          <div className="callout-info text-sm">
            Map each vertical to its specific social media handles. These are used for publishing and analytics.
          </div>
          {VERTICALS.map(vertical => (
            <Card key={vertical.id} className="p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">{vertical.label}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(vertical.accounts).map(([platform, handle]) => (
                  <div key={platform}>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1 capitalize">{platform}</label>
                    <input
                      type="text"
                      defaultValue={handle}
                      placeholder={`@${platform}_handle`}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                ))}
              </div>
              <button className="mt-3 text-[11px] bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700">
                Save
              </button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
