"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, Users, Eye, Heart, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";

const VERTICALS = [
  { value: "SY_INDIA",       label: "Square Yards India" },
  { value: "SY_UAE",         label: "Square Yards UAE" },
  { value: "INTERIOR",       label: "Interior Company" },
  { value: "SQUARE_CONNECT", label: "Square Connect" },
  { value: "UM",             label: "UM" },
];

const CHANNELS = ["All", "Instagram", "LinkedIn", "Facebook", "YouTube"];

const METRICS: Record<string, any[]> = {
  SY_INDIA: [
    { label: "Net Followers",   value: "12,480", delta: "+8.2%",  up: true,  icon: <Users size={16}/> },
    { label: "Reach",           value: "3.4M",   delta: "+14.1%", up: true,  icon: <Eye size={16}/> },
    { label: "Interactions",    value: "48,200", delta: "+5.3%",  up: true,  icon: <Heart size={16}/> },
    { label: "Link Clicks",     value: "9,340",  delta: "-2.1%",  up: false, icon: <MousePointer size={16}/> },
  ],
  SY_UAE: [
    { label: "Net Followers",   value: "5,210",  delta: "+11.4%", up: true,  icon: <Users size={16}/> },
    { label: "Reach",           value: "1.2M",   delta: "+9.7%",  up: true,  icon: <Eye size={16}/> },
    { label: "Interactions",    value: "22,100", delta: "+3.8%",  up: true,  icon: <Heart size={16}/> },
    { label: "Link Clicks",     value: "4,890",  delta: "+7.2%",  up: true,  icon: <MousePointer size={16}/> },
  ],
  INTERIOR: [
    { label: "Net Followers",   value: "3,890",  delta: "+6.5%",  up: true,  icon: <Users size={16}/> },
    { label: "Reach",           value: "890K",   delta: "+4.2%",  up: true,  icon: <Eye size={16}/> },
    { label: "Interactions",    value: "18,400", delta: "-1.2%",  up: false, icon: <Heart size={16}/> },
    { label: "Link Clicks",     value: "2,340",  delta: "+2.8%",  up: true,  icon: <MousePointer size={16}/> },
  ],
  SQUARE_CONNECT: [
    { label: "Net Followers",   value: "2,140",  delta: "+3.1%",  up: true,  icon: <Users size={16}/> },
    { label: "Reach",           value: "540K",   delta: "+7.9%",  up: true,  icon: <Eye size={16}/> },
    { label: "Interactions",    value: "11,200", delta: "+9.4%",  up: true,  icon: <Heart size={16}/> },
    { label: "Link Clicks",     value: "1,890",  delta: "-3.5%",  up: false, icon: <MousePointer size={16}/> },
  ],
  UM: [
    { label: "Net Followers",   value: "1,320",  delta: "+2.4%",  up: true,  icon: <Users size={16}/> },
    { label: "Reach",           value: "320K",   delta: "+5.1%",  up: true,  icon: <Eye size={16}/> },
    { label: "Interactions",    value: "7,800",  delta: "+1.8%",  up: true,  icon: <Heart size={16}/> },
    { label: "Link Clicks",     value: "980",    delta: "-0.9%",  up: false, icon: <MousePointer size={16}/> },
  ],
};

const FOLLOWER_TREND = [
  { month: "Oct", followers: 9200 },
  { month: "Nov", followers: 10100 },
  { month: "Dec", followers: 10800 },
  { month: "Jan", followers: 11200 },
  { month: "Feb", followers: 11900 },
  { month: "Mar", followers: 12480 },
];

// What to do / not to do based on performance
const PERFORMANCE_INSIGHTS: Record<string, { do: any[]; dont: any[] }> = {
  All: {
    do: [
      { type: "Reels (60–90s)",       reason: "3.2× avg reach vs static posts",          eng: "8.4%" },
      { type: "Before/After content", reason: "Highest saves and shares this month",       eng: "7.1%" },
      { type: "Market tips (carousel)",reason: "2× link clicks vs single image",           eng: "6.8%" },
      { type: "Founder/Expert talk",  reason: "Strong comment engagement from investors",  eng: "6.2%" },
    ],
    dont: [
      { type: "Plain listing posts",  reason: "Below avg reach, low save rate",           eng: "1.2%" },
      { type: "Long-form static text",reason: "High scroll-past rate on Instagram",       eng: "0.9%" },
      { type: "Reposted news articles",reason: "Near-zero organic reach",                 eng: "0.4%" },
    ],
  },
  Instagram: {
    do: [
      { type: "Reels with trending audio", reason: "Pushed by algorithm — 4× reach",     eng: "9.1%" },
      { type: "Story polls & questions",   reason: "Top driver of profile visits",        eng: "7.4%" },
      { type: "Carousel education posts",  reason: "High saves, boosted in explore",      eng: "6.9%" },
    ],
    dont: [
      { type: "Static single image",       reason: "Organic reach down 40% vs reels",    eng: "1.4%" },
      { type: "Long caption without hook", reason: "Users skip after first 2 lines",      eng: "0.7%" },
    ],
  },
  LinkedIn: {
    do: [
      { type: "Market data posts",    reason: "High share rate among professionals",      eng: "5.8%" },
      { type: "Personal experience",  reason: "3× comments vs company updates",           eng: "5.2%" },
      { type: "Short video (< 2min)", reason: "Native video boosted in feed",             eng: "4.9%" },
    ],
    dont: [
      { type: "Promotional listings", reason: "Flagged as low-value by algorithm",        eng: "0.6%" },
      { type: "Cross-posted reels",   reason: "LinkedIn suppresses Instagram reposts",    eng: "0.3%" },
    ],
  },
  Facebook: {
    do: [
      { type: "Video tours (3–5min)", reason: "Facebook still rewards long video",        eng: "4.2%" },
      { type: "Community questions",  reason: "Drives comments and group engagement",     eng: "3.8%" },
    ],
    dont: [
      { type: "Link-heavy posts",     reason: "Reach reduced when external links present", eng: "0.8%" },
      { type: "Text-only posts",      reason: "Very low organic reach on Facebook",       eng: "0.5%" },
    ],
  },
  YouTube: {
    do: [
      { type: "Property walk-through", reason: "Avg 8 min watch time — top performer",   eng: "12.4%" },
      { type: "Expert interview",      reason: "High subscriber conversion rate",         eng: "9.8%" },
      { type: "Shorts (< 60s)",        reason: "Shorts feed driving new subscribers",     eng: "7.2%" },
    ],
    dont: [
      { type: "Low-quality thumbnails",reason: "CTR drops 60% without strong thumbnail", eng: "2.1%" },
      { type: "No chapters/timestamps",reason: "Watch time lower without navigation",    eng: "3.4%" },
    ],
  },
};

// Competitor insights
const COMPETITOR_INSIGHTS: Record<string, { working: any[]; notWorking: any[] }> = {
  All: {
    working: [
      { competitor: "Lodha Group",       content: "60s reels on lifestyle aspects of homes",   reach: "420K", eng: "7.8%" },
      { competitor: "Godrej Properties", content: "Infographic carousels — market updates",    reach: "310K", eng: "6.2%" },
      { competitor: "Prestige Group",    content: "Customer testimonial reels",                reach: "280K", eng: "5.9%" },
      { competitor: "DLF",               content: "Before/after renovation stories",           reach: "195K", eng: "5.1%" },
    ],
    notWorking: [
      { competitor: "Sobha Ltd",         content: "Press release reposts",                     reach: "8K",  eng: "0.3%" },
      { competitor: "Puravankara",       content: "Price-focused listing posts",               reach: "12K", eng: "0.5%" },
      { competitor: "Brigade Group",     content: "Long text announcements",                   reach: "6K",  eng: "0.2%" },
    ],
  },
  Instagram: {
    working: [
      { competitor: "Lodha Group",       content: "Reels with trending audio",                 reach: "380K", eng: "9.2%" },
      { competitor: "Godrej Properties", content: "Story Q&A about property buying",           reach: "210K", eng: "7.1%" },
    ],
    notWorking: [
      { competitor: "Sobha Ltd",         content: "Static listing photos",                     reach: "5K",  eng: "0.4%" },
      { competitor: "Puravankara",       content: "Promotional banners",                       reach: "8K",  eng: "0.3%" },
    ],
  },
  LinkedIn: {
    working: [
      { competitor: "Godrej Properties", content: "CEO market commentary posts",               reach: "95K",  eng: "6.4%" },
      { competitor: "DLF",               content: "Employee spotlight stories",                reach: "72K",  eng: "5.8%" },
    ],
    notWorking: [
      { competitor: "Brigade Group",     content: "Generic award announcements",               reach: "4K",  eng: "0.2%" },
      { competitor: "Prestige Group",    content: "Copied press releases",                     reach: "3K",  eng: "0.1%" },
    ],
  },
  Facebook: {
    working: [
      { competitor: "Prestige Group",    content: "Virtual tour videos (5–8min)",              reach: "140K", eng: "4.8%" },
      { competitor: "Lodha Group",       content: "Live Q&A sessions",                         reach: "89K",  eng: "4.2%" },
    ],
    notWorking: [
      { competitor: "Sobha Ltd",         content: "Text-only market updates",                  reach: "2K",  eng: "0.2%" },
    ],
  },
  YouTube: {
    working: [
      { competitor: "Lodha Group",       content: "Full property walk-through series",         reach: "220K", eng: "14.1%" },
      { competitor: "Godrej Properties", content: "Expert panel discussions (20min)",          reach: "180K", eng: "11.2%" },
    ],
    notWorking: [
      { competitor: "Puravankara",       content: "Low-production ad reposts",                 reach: "3K",  eng: "1.1%" },
    ],
  },
};

export default function SocialDashboardPage() {
  const [vertical, setVertical]   = useState("SY_INDIA");
  const [channel, setChannel]     = useState("All");

  const metrics     = METRICS[vertical] ?? METRICS.SY_INDIA;
  const perfInsight = PERFORMANCE_INSIGHTS[channel] ?? PERFORMANCE_INSIGHTS.All;
  const compInsight = COMPETITOR_INSIGHTS[channel]  ?? COMPETITOR_INSIGHTS.All;

  return (
    <>
      <Header
        title="Social Media Dashboard"
        subtitle="1-month performance overview with content recommendations"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <Select
          value={vertical}
          onChange={v => setVertical(v)}
          options={VERTICALS}
          className="w-52"
        />
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {CHANNELS.map(ch => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                channel === ch
                  ? "bg-white text-accent-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map(m => (
            <Card key={m.label} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">{m.icon}</span>
                <span className={cn(
                  "text-xs font-medium flex items-center gap-0.5",
                  m.up ? "text-green-600" : "text-red-500"
                )}>
                  {m.up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                  {m.delta}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{m.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
            </Card>
          ))}
        </div>

        {/* Follower trend */}
        <Card className="p-5">
          <SectionHeader title="Follower Growth — Last 6 Months" subtitle="Net follower trend" />
          <div className="h-48 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FOLLOWER_TREND}>
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                <Tooltip formatter={(v: any) => [v.toLocaleString(), "Followers"]}/>
                <Area type="monotone" dataKey="followers" stroke="#2563eb" strokeWidth={2} fill="url(#fg)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* What to do / not to do */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Do */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-green-500"/>
              <h3 className="font-semibold text-gray-900 text-sm">What to do — based on your performance</h3>
            </div>
            <div className="space-y-3">
              {perfInsight.do.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.type}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded shrink-0">
                    {item.eng} eng
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Don't */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <XCircle size={16} className="text-red-400"/>
              <h3 className="font-semibold text-gray-900 text-sm">What not to do — underperforming content</h3>
            </div>
            <div className="space-y-3">
              {perfInsight.dont.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <XCircle size={14} className="text-red-400 mt-0.5 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.type}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                  </div>
                  <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded shrink-0">
                    {item.eng} eng
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Competitor insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Competitor - what works */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-accent-500"/>
              <h3 className="font-semibold text-gray-900 text-sm">Competitor — top performing content</h3>
            </div>
            <div className="space-y-2">
              {compInsight.working.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center shrink-0">
                    <span className="text-accent-700 font-bold text-[10px]">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{item.competitor}</p>
                    <p className="text-xs text-gray-500 truncate">{item.content}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-accent-600">{item.eng}</p>
                    <p className="text-[10px] text-gray-400">{item.reach} reach</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Competitor - what doesn't work */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={16} className="text-amber-500"/>
              <h3 className="font-semibold text-gray-900 text-sm">Competitor — low performing content</h3>
            </div>
            <div className="space-y-2">
              {compInsight.notWorking.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-amber-100 rounded-lg bg-amber-50/40">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <TrendingDown size={12} className="text-amber-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{item.competitor}</p>
                    <p className="text-xs text-gray-500 truncate">{item.content}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-amber-600">{item.eng}</p>
                    <p className="text-[10px] text-gray-400">{item.reach} reach</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
