"use client";

import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { MetricCard, Card, SectionHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Users, Eye, MousePointerClick, Heart, ExternalLink,
  Download, RefreshCw,
} from "lucide-react";
import { VERTICAL_LABELS, PLATFORM_LABELS, type Vertical, type SocialPlatform } from "@/types";
import { formatNumber, pct } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Mock data (replace with API calls) ────────────────────────────────────────
const MOCK_KPI = {
  SY_INDIA: {
    followers:     312450,
    deltaFollowers:+4820,
    follows:       6130,
    unfollows:     1310,
    netFollowers:  4820,
    views:         2840000,
    deltaViews:    +180000,
    reach:         1620000,
    deltaReach:    +95000,
    interactions:  98400,
    deltaInteractions: +7200,
    linkClicks:    14200,
    profileVisits: 87500,
    totalContacts: 2310,
    postsPublished:   48,
    videosPublished:  21,
    staticsPublished: 27,
  },
};

const MONTHLY_FOLLOWERS = [
  { month: "Oct", follows: 4200, unfollows: 900,  followers: 298000 },
  { month: "Nov", follows: 4800, unfollows: 1100, followers: 301700 },
  { month: "Dec", follows: 5200, unfollows: 1050, followers: 305850 },
  { month: "Jan", follows: 5800, unfollows: 1200, followers: 310450 },
  { month: "Feb", follows: 5500, unfollows: 1100, followers: 314850 },
  { month: "Mar", follows: 6130, unfollows: 1310, followers: 319670 },
];

const PLATFORM_BREAKDOWN = [
  { platform: "Instagram", followers: 185000, reach: 820000, interactions: 52000, posts: 22, videos: 14, statics: 8 },
  { platform: "Facebook",  followers: 78000,  reach: 450000, interactions: 21000, posts: 15, videos: 4,  statics: 11 },
  { platform: "LinkedIn",  followers: 31000,  reach: 210000, interactions: 14000, posts: 7,  videos: 2,  statics: 5 },
  { platform: "YouTube",   followers: 18450,  reach: 140000, interactions: 11400, posts: 4,  videos: 4,  statics: 0 },
];

const CONTENT_MIX = [
  { name: "Reels",    value: 14, color: "#2563EB" },
  { name: "Carousel", value: 12, color: "#7C3AED" },
  { name: "Static",   value: 15, color: "#059669" },
  { name: "Stories",  value: 7,  color: "#D97706" },
];

const TOP_POSTS = [
  { title: "Is Now the Best Time to Buy?", platform: "Instagram", reach: 142000, engRate: 8.4, type: "Reel" },
  { title: "Top 5 Investment Hotspots Dubai",platform:"LinkedIn",  reach: 89000,  engRate: 6.2, type: "Carousel" },
  { title: "Home Loan Tips Banks Won't Tell",platform:"Facebook",  reach: 76000,  engRate: 5.8, type: "Reel" },
  { title: "Before & After Transformation", platform: "Instagram", reach: 68000,  engRate: 9.1, type: "Reel" },
  { title: "Mumbai Property Report Q1 2026", platform:"LinkedIn",  reach: 54000,  engRate: 4.7, type: "Carousel" },
];

const PERIOD_OPTIONS = [
  { value: "7",  label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const PLATFORM_OPTIONS = [
  { value: "ALL",       label: "All Platforms" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK",  label: "Facebook" },
  { value: "LINKEDIN",  label: "LinkedIn" },
  { value: "YOUTUBE",   label: "YouTube" },
];

export function PerformanceDashboard() {
  const [vertical, setVertical] = useState<Vertical>("SY_INDIA");
  const [period,   setPeriod]   = useState("30");
  const [platform, setPlatform] = useState("ALL");

  const kpi = MOCK_KPI[vertical as keyof typeof MOCK_KPI] ?? MOCK_KPI.SY_INDIA;

  const verticalOptions = Object.entries(VERTICAL_LABELS).map(([v, l]) => ({
    value: v, label: l,
  }));

  return (
    <div className="space-y-6">
      {/* ── Controls bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={vertical}
          onChange={(v) => setVertical(v as Vertical)}
          options={verticalOptions}
          className="w-52"
        />
        <Select value={period}   onChange={setPeriod}   options={PERIOD_OPTIONS}  className="w-36" />
        <Select value={platform} onChange={setPlatform} options={PLATFORM_OPTIONS} className="w-40" />

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={13} />}>Refresh</Button>
          <Button variant="secondary" size="sm" leftIcon={<Download size={13} />}>Export</Button>
        </div>
      </div>

      {/* ── Platform tabs (when ALL selected, show a tab per platform) ── */}
      {platform === "ALL" && (
        <div className="flex gap-1 border-b border-gray-200">
          {["All", "Instagram", "Facebook", "LinkedIn", "YouTube"].map((p) => (
            <button
              key={p}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                p === "All"
                  ? "border-accent-500 text-accent-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Row 1: KPI cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Net Followers"
          value={kpi.netFollowers}
          delta={kpi.netFollowers}
          deltaLabel="this period"
          icon={<Users size={16} />}
        />
        <MetricCard
          label="Total Reach"
          value={kpi.reach}
          delta={kpi.deltaReach}
          deltaLabel="vs last period"
          icon={<Eye size={16} />}
        />
        <MetricCard
          label="Content Interactions"
          value={kpi.interactions}
          delta={kpi.deltaInteractions}
          deltaLabel="vs last period"
          icon={<Heart size={16} />}
        />
        <MetricCard
          label="Link Clicks"
          value={kpi.linkClicks}
          delta={undefined}
          icon={<MousePointerClick size={16} />}
        />
      </div>

      {/* ── Row 1b: secondary metrics ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Followers"      value={kpi.followers}      delta={kpi.deltaFollowers} deltaLabel="MoM" />
        <MetricCard label="Total Views"          value={kpi.views}          delta={kpi.deltaViews}     deltaLabel="MoM" />
        <MetricCard label="Profile Visits"       value={kpi.profileVisits} />
        <MetricCard label="Total Contacts"       value={kpi.totalContacts} />
      </div>

      {/* ── Row 2: MoM chart + Content mix ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Followers trend */}
        <Card className="lg:col-span-2 p-5">
          <SectionHeader title="Followers Growth (MoM)" subtitle="Follows vs unfollows over 6 months" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY_FOLLOWERS} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFollows" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="follows"   stroke="#2563EB" fill="url(#gradFollows)" strokeWidth={2} dot={false} name="Follows" />
              <Line  type="monotone" dataKey="unfollows" stroke="#DC2626"                          strokeWidth={2} dot={false} name="Unfollows" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Content mix donut */}
        <Card className="p-5">
          <SectionHeader title="Content Mix" subtitle={`${kpi.postsPublished} posts total`} />
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={CONTENT_MIX} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                paddingAngle={3} dataKey="value">
                {CONTENT_MIX.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
            {CONTENT_MIX.map((c) => (
              <div key={c.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span>{c.name}</span>
                <span className="ml-auto font-medium text-gray-800">{c.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 3: Platform breakdown table ───────────────────── */}
      <Card padding={false}>
        <div className="p-5 pb-0">
          <SectionHeader title="Platform Breakdown" subtitle="All metrics aggregated per channel" />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                {["Platform","Followers","Reach","Interactions","Posts","Videos","Statics","Eng. Rate"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLATFORM_BREAKDOWN.map((row) => {
                const er = ((row.interactions / Math.max(row.followers, 1)) * 100).toFixed(2);
                return (
                  <tr key={row.platform}>
                    <td className="font-medium text-gray-900">{row.platform}</td>
                    <td className="tabular-nums">{formatNumber(row.followers)}</td>
                    <td className="tabular-nums">{formatNumber(row.reach)}</td>
                    <td className="tabular-nums">{formatNumber(row.interactions)}</td>
                    <td className="tabular-nums">{row.posts}</td>
                    <td className="tabular-nums">{row.videos}</td>
                    <td className="tabular-nums">{row.statics}</td>
                    <td>
                      <span className={cn("font-medium", Number(er) >= 5 ? "text-green-600" : Number(er) >= 2 ? "text-amber-600" : "text-red-500")}>
                        {er}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Row 4: Top performing posts ───────────────────────── */}
      <Card padding={false}>
        <div className="p-5 pb-0">
          <SectionHeader title="Top 5 Posts" subtitle="Ranked by reach this period" />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                {["#","Title","Platform","Type","Reach","Eng. Rate",""].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_POSTS.map((post, i) => (
                <tr key={i}>
                  <td className="text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="font-medium text-gray-900 max-w-xs truncate">{post.title}</td>
                  <td>
                    <Badge variant="info">{post.platform}</Badge>
                  </td>
                  <td>
                    <Badge>{post.type}</Badge>
                  </td>
                  <td className="tabular-nums font-medium">{formatNumber(post.reach)}</td>
                  <td>
                    <span className={cn("font-semibold text-sm", post.engRate >= 7 ? "text-green-600" : post.engRate >= 4 ? "text-amber-600" : "text-gray-500")}>
                      {post.engRate}%
                    </span>
                  </td>
                  <td>
                    <button className="text-gray-400 hover:text-gray-700">
                      <ExternalLink size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Row 5: Publishing stats summary ──────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total Published"         value={kpi.postsPublished}   />
        <MetricCard label="Video Content Published" value={kpi.videosPublished}  />
        <MetricCard label="Static Content Published"value={kpi.staticsPublished} />
      </div>
    </div>
  );
}
