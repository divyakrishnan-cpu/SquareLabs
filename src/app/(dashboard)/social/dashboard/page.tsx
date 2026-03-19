"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChartColors } from "@/hooks/useChartColors";
import { Header } from "@/components/layout/Header";
import { Card }   from "@/components/ui/Card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, TrendingUp, TrendingDown, Heart, MessageCircle,
  Bookmark, Share2, Play, Eye, ExternalLink, QrCode, X,
  RefreshCw, Instagram, ChevronRight, MapPin, Globe,
  Lightbulb, Calendar, BarChart2, Target, Star,
  MousePointerClick, UserCheck, UserMinus, Clapperboard,
  Image, AlignJustify,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DailyPoint { date: string; value: number }

interface MetricsTotals {
  views:               number;
  reach:               number;
  contentInteractions: number;
  likes:               number;
  comments:            number;
  saves:               number;
  shares:              number;
  linkClicks:          number;
  profileVisits:       number;
  follows:             number;
  unfollows:           number;
  netFollowers:        number;
  postsPublished:      number;
  videoPosts:          number;
  staticPosts:         number;
  carouselPosts:       number;
}

interface MetricsData {
  connected:   boolean;
  message?:    string;
  vertical:    string;
  platform:    string;
  accountInfo: {
    igId:           string;
    handle:         string;
    name:           string;
    followers:      number;
    profilePicture: string | null;
  };
  current: {
    period: { from: string; to: string };
    totals: MetricsTotals;
    daily:  Record<string, DailyPoint[]>;
  };
  comparison: {
    period: { from: string; to: string };
    totals: MetricsTotals;
    daily:  Record<string, DailyPoint[]>;
  } | null;
  demographics: {
    genderTotal:  Record<string, number>;
    ageGroups:    { age: string; value: number }[];
    topCities:    { name: string; value: number }[];
    topCountries: { name: string; value: number }[];
  } | null;
  topVideosLastWeek: VideoItem[];
  insightErrors?: string[];
  interactionErrors?: string[];
  dataSource?: "database" | "meta_api";
  dbDaysStored?: number;
  dbActualRange?: { from: string; to: string } | null;
}

interface VideoItem {
  id:        string;
  caption:   string;
  mediaType: string;
  permalink: string;
  thumbnail: string | null;
  timestamp: string;
  date:      string;
  likes:     number;
  comments:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VERTICALS = [
  { key: "SY_INDIA",       label: "SQY India",       color: "blue" },
  { key: "SY_UAE",         label: "SQY UAE",         color: "purple" },
  { key: "INTERIOR",       label: "Interior Co.",    color: "amber" },
  { key: "SQUARE_CONNECT", label: "Square Connect",  color: "green" },
  { key: "UM",             label: "Urban Money",     color: "rose" },
];

const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook",  label: "Facebook" },
  { key: "youtube",   label: "YouTube" },
  { key: "linkedin",  label: "LinkedIn" },
  { key: "pinterest", label: "Pinterest", interiorOnly: true },
];

const DATE_PRESETS = [
  { label: "7d",        days: 7 },
  { label: "30d",       days: 30 },
  { label: "90d",       days: 90 },
  { label: "Last Year", days: 365 },
];

const V_BG: Record<string, string> = {
  SY_INDIA:       "bg-blue-100 text-blue-700 border-blue-200",
  SY_UAE:         "bg-purple-100 text-purple-700 border-purple-200",
  INTERIOR:       "bg-amber-100 text-amber-700 border-amber-200",
  SQUARE_CONNECT: "bg-green-100 text-green-700 border-green-200",
  UM:             "bg-rose-100 text-rose-700 border-rose-200",
};

const V_ACTIVE: Record<string, string> = {
  SY_INDIA:       "bg-blue-600 text-white shadow-blue-200",
  SY_UAE:         "bg-purple-600 text-white shadow-purple-200",
  INTERIOR:       "bg-amber-500 text-white shadow-amber-200",
  SQUARE_CONNECT: "bg-green-600 text-white shadow-green-200",
  UM:             "bg-rose-600 text-white shadow-rose-200",
};

// CHART_COLORS is now user-editable via Settings → Appearance (stored in localStorage).
// The live value is exposed via useChartColors() inside the component.

// Competitor data per vertical
const COMPETITORS: Record<string, { name: string; followers: string; engRate: string; postsPerWeek: number; strength: string; gap: string }[]> = {
  SY_INDIA: [
    { name: "MagicBricks",    followers: "1.2M", engRate: "1.8%", postsPerWeek: 12, strength: "Listing videos",      gap: "Thought leadership" },
    { name: "99acres",        followers: "890K", engRate: "1.2%", postsPerWeek: 9,  strength: "Market reports",      gap: "Reels & short-form" },
    { name: "Housing.com",    followers: "680K", engRate: "2.1%", postsPerWeek: 14, strength: "Interactive stories", gap: "Long-form content" },
  ],
  SY_UAE: [
    { name: "Bayut",          followers: "320K", engRate: "2.4%", postsPerWeek: 10, strength: "Lifestyle content",   gap: "Educational posts" },
    { name: "Property Finder",followers: "280K", engRate: "1.9%", postsPerWeek: 8,  strength: "Market data reels",   gap: "Community building" },
    { name: "Dubizzle",       followers: "210K", engRate: "1.5%", postsPerWeek: 6,  strength: "User testimonials",   gap: "Video walkthroughs" },
  ],
  INTERIOR: [
    { name: "Livspace",       followers: "890K", engRate: "3.2%", postsPerWeek: 18, strength: "Before/After reels",  gap: "DIY tips content" },
    { name: "HomeLane",       followers: "620K", engRate: "2.8%", postsPerWeek: 15, strength: "Design inspiration",  gap: "Process transparency" },
    { name: "Houzz India",    followers: "440K", engRate: "2.0%", postsPerWeek: 11, strength: "Community UGC",       gap: "Pricing content" },
  ],
  SQUARE_CONNECT: [
    { name: "Square Yards",   followers: "1.4M", engRate: "1.6%", postsPerWeek: 11, strength: "Brand recall",        gap: "Agent spotlights" },
    { name: "PropTiger",      followers: "320K", engRate: "1.1%", postsPerWeek: 7,  strength: "News & updates",      gap: "Video testimonials" },
    { name: "NoBroker",       followers: "480K", engRate: "2.2%", postsPerWeek: 13, strength: "User stories",        gap: "Professional content" },
  ],
  UM: [
    { name: "BankBazaar",     followers: "560K", engRate: "1.9%", postsPerWeek: 10, strength: "Finance tips",        gap: "Real estate finance" },
    { name: "Groww",          followers: "2.1M", engRate: "3.4%", postsPerWeek: 21, strength: "Explainer reels",     gap: "Mortgage content" },
    { name: "ET Money",       followers: "390K", engRate: "2.1%", postsPerWeek: 12, strength: "Infographics",        gap: "Personal finance hooks" },
  ],
};

// Content recommendations per vertical
const RECOMMENDATIONS: Record<string, string[]> = {
  SY_INDIA: [
    "Post 3× city-specific property tours per week — these get 2× avg reach",
    "Reels under 30s with 'Price revealed' hook show highest saves",
    "Thursday 7–9 PM slots drive peak engagement (per follower data)",
    "Behind-the-scenes site visits boost credibility signals",
    "Carousel posts with market stats see +40% share rate",
  ],
  SY_UAE: [
    "Luxury lifestyle + property combos outperform listing-only content",
    "Post in both English and Arabic to double organic reach",
    "Sunday–Monday posts perform best (UAE weekend rhythm)",
    "Waterfront and skyline thumbnails get 35% higher click-through",
    "Stories with polls drive DMs and inquiry conversion",
  ],
  INTERIOR: [
    "Before/After transformation reels are top-performing format",
    "5–10s quick 'design hack' reels see 4× replay rate",
    "Saturday morning posts peak for home décor audience",
    "Pin inspirational boards — Pinterest drives high-intent traffic",
    "Client testimonial carousels boost saves and shares together",
  ],
  SQUARE_CONNECT: [
    "Agent spotlight reels build personal brand trust",
    "Market update infographics get saved 3× more than other formats",
    "Friday afternoon is optimal for B2B-adjacent content",
    "Success story videos with real numbers see highest shares",
    "LinkedIn cross-posting amplifies professional content 2×",
  ],
  UM: [
    "Finance myth-busting reels get highest comment engagement",
    "EMI calculator posts drive DMs and link clicks",
    "Weekday morning (8–10 AM) posts peak for finance audience",
    "Infographic carousels explaining home loans → highest saves",
    "Collaborate with real estate accounts for cross-audience reach",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function deltaColor(pct: number): string {
  if (pct > 0)  return "text-green-600 bg-green-50";
  if (pct < 0)  return "text-red-500 bg-red-50";
  return "text-gray-400 bg-gray-50";
}

function calcDelta(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function addDays(date: Date, d: number): Date {
  const r = new Date(date); r.setDate(r.getDate() + d); return r;
}

function toYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph Modal
// ─────────────────────────────────────────────────────────────────────────────

interface GraphModalProps {
  label:      string;
  dailyKey:   string;
  currentPeriod:    { from: string; to: string };
  currentDaily:     Record<string, DailyPoint[]>;
  comparisonPeriod: { from: string; to: string } | null;
  comparisonDaily:  Record<string, DailyPoint[]> | null;
  currentTotal:     number | null;
  compTotal:        number | null;
  onClose: () => void;
}

function GraphModal({
  label, dailyKey, currentPeriod, currentDaily,
  comparisonPeriod, comparisonDaily, currentTotal, compTotal, onClose,
}: GraphModalProps) {
  const currData = currentDaily[dailyKey] ?? [];
  const compData = comparisonDaily?.[dailyKey] ?? [];

  // Align comparison data to current data by index (offset days)
  const chartData = currData.map((d, i) => ({
    date:       fmtDate(d.date),
    Current:    d.value,
    Comparison: compData[i]?.value ?? null,
  }));

  const avg   = currData.length ? Math.round(currData.reduce((s, d) => s + d.value, 0) / currData.length) : 0;
  const peak  = currData.length ? Math.max(...currData.map(d => d.value)) : 0;
  const delta = calcDelta(currentTotal, compTotal);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {fmtDate(currentPeriod.from)} – {fmtDate(currentPeriod.to)}
              {comparisonPeriod && (
                <span className="ml-2 text-purple-500">
                  vs {fmtDate(comparisonPeriod.from)} – {fmtDate(comparisonPeriod.to)}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-50">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Total</p>
            <p className="text-2xl font-bold text-gray-900">{fmtNum(currentTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Daily Avg</p>
            <p className="text-2xl font-bold text-gray-900">{fmtNum(avg)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Peak Day</p>
            <p className="text-2xl font-bold text-gray-900">{fmtNum(peak)}</p>
          </div>
        </div>
        {delta !== null && (
          <div className="px-6 py-2 border-b border-gray-50">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", deltaColor(delta))}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}% vs comparison period
            </span>
          </div>
        )}

        {/* Chart */}
        <div className="px-6 py-4">
          {currData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No daily data available for this metric
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  interval={Math.floor(chartData.length / 6)} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => fmtNum(v)} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(v: number) => fmtNum(v)}
                />
                {compData.length > 0 && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
                <Line type="monotone" dataKey="Current"    stroke={chartColors[0]} strokeWidth={2} dot={false} />
                {compData.length > 0 && (
                  <Line type="monotone" dataKey="Comparison" stroke="#a78bfa" strokeWidth={1.5}
                    strokeDasharray="4 2" dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR Modal
// ─────────────────────────────────────────────────────────────────────────────

function QRModal({ media, onClose }: { media: VideoItem; onClose: () => void }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(media.permalink)}&format=png&margin=10`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="relative bg-gray-100 aspect-video">
          {media.thumbnail ? (
            <img src={media.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Instagram size={32} className="text-gray-300" />
            </div>
          )}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{media.caption || "No caption"}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { icon: <Heart size={12} className="text-rose-500" />,        label: "Likes",    val: media.likes },
              { icon: <MessageCircle size={12} className="text-blue-500" />, label: "Comments", val: media.comments },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <div className="flex justify-center mb-1">{m.icon}</div>
                <p className="text-sm font-bold text-gray-900">{fmtNum(m.val)}</p>
                <p className="text-[10px] text-gray-400">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 bg-gray-50 rounded-xl p-4 mb-4">
            <img src={qrUrl} alt="QR" className="w-24 h-24 rounded-lg" />
            <p className="text-[10px] text-gray-400">Scan to view on Instagram</p>
          </div>
          <a href={media.permalink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
            <ExternalLink size={13} /> Open on Instagram
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric row definition
// ─────────────────────────────────────────────────────────────────────────────

interface MetricDef {
  key:         keyof MetricsTotals;
  dailyKey:    string;
  label:       string;
  icon:        React.ReactNode;
  color:       string;
  description: string;
  section?:    string; // optional section divider label shown above this row
}

const METRIC_DEFS: MetricDef[] = [
  // ── Reach & Visibility ────────────────────────────────────────────────────
  { key: "views",               dailyKey: "views",               section: "Reach & Visibility",
    label: "Views (Impressions)",     icon: <Eye size={14} />,               color: "text-indigo-500",
    description: "Total times your posts, Stories, and Reels were seen in the period. One person watching multiple times counts each view." },
  { key: "reach",               dailyKey: "reach",
    label: "Reach",                   icon: <Globe size={14} />,             color: "text-blue-500",
    description: "Unique accounts that saw your content at least once. Each person counted once, no matter how many times they viewed." },

  // ── Engagement ────────────────────────────────────────────────────────────
  { key: "contentInteractions", dailyKey: "total_interactions",  section: "Engagement",
    label: "Total Interactions",      icon: <Heart size={14} />,             color: "text-rose-500",
    description: "Sum of all interactions (likes + comments + saves + shares) on your posts during this period, as reported by Meta Insights API." },
  { key: "likes",               dailyKey: "likes",
    label: "  ↳ Likes",               icon: <Heart size={12} />,             color: "text-rose-400",
    description: "Likes received on your posts during this period." },
  { key: "comments",            dailyKey: "comments",
    label: "  ↳ Comments",            icon: <MessageCircle size={12} />,     color: "text-blue-400",
    description: "Comments on your posts during this period." },
  { key: "saves",               dailyKey: "saves",
    label: "  ↳ Saves",               icon: <Bookmark size={12} />,          color: "text-amber-400",
    description: "Times people saved your posts during this period." },
  { key: "shares",              dailyKey: "shares",
    label: "  ↳ Shares",              icon: <Share2 size={12} />,            color: "text-green-400",
    description: "Times your posts were shared (DMs, Story shares) during this period." },

  // ── Profile & Discovery ───────────────────────────────────────────────────
  { key: "linkClicks",          dailyKey: "website_clicks",      section: "Profile & Discovery",
    label: "Link Clicks",             icon: <MousePointerClick size={14} />, color: "text-cyan-500",
    description: "Taps on the website link in your bio or swipe-up links in Stories." },
  { key: "profileVisits",       dailyKey: "profile_views",
    label: "Profile Visits",          icon: <Users size={14} />,             color: "text-violet-500",
    description: "Number of times your Instagram profile page was visited during this period." },

  // ── Audience Growth ───────────────────────────────────────────────────────
  { key: "follows",             dailyKey: "follows",             section: "Audience Growth",
    label: "Follows",                 icon: <UserCheck size={14} />,         color: "text-green-500",
    description: "New accounts that followed you during this period." },
  { key: "unfollows",           dailyKey: "unfollows",
    label: "Unfollows",               icon: <UserMinus size={14} />,         color: "text-red-500",
    description: "Accounts that unfollowed you during this period." },
  { key: "netFollowers",        dailyKey: "follows",
    label: "Net Followers",           icon: <TrendingUp size={14} />,        color: "text-emerald-500",
    description: "Follows minus Unfollows. Positive = net audience growth in the period." },

  // ── Content Published ─────────────────────────────────────────────────────
  { key: "postsPublished",      dailyKey: "posts",               section: "Content Published",
    label: "Total Content Published", icon: <AlignJustify size={14} />,      color: "text-gray-500",
    description: "Total posts (images, videos, Reels, carousels) published during the selected period." },
  { key: "videoPosts",          dailyKey: "videos",
    label: "Video / Reel Content",    icon: <Clapperboard size={14} />,      color: "text-pink-500",
    description: "Video and Reel posts published during the selected period." },
  { key: "staticPosts",         dailyKey: "statics",
    label: "Static / Image Content",  icon: <Image size={14} />,             color: "text-amber-500",
    description: "Static image posts published during the selected period." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Demographics section
// ─────────────────────────────────────────────────────────────────────────────

function Demographics({ demo, chartColors }: {
  chartColors: string[];
  demo: {
    genderTotal:  Record<string, number>;
    ageGroups:    { age: string; value: number }[];
    topCities:    { name: string; value: number }[];
    topCountries: { name: string; value: number }[];
  }
}) {
  const genderData = Object.entries(demo.genderTotal).map(([name, value]) => ({ name, value }));
  const genderColors = [chartColors[0] ?? "#6366f1", chartColors[7] ?? "#ec4899", chartColors[1] ?? "#10b981"];
  const totalGender = genderData.reduce((s, d) => s + d.value, 0);

  const maxCity = Math.max(...demo.topCities.map(c => c.value), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Gender */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Gender Split</p>
        <div className="flex items-center gap-4">
          <PieChart width={100} height={100}>
            <Pie data={genderData} cx={45} cy={45} innerRadius={28} outerRadius={45}
              dataKey="value" paddingAngle={2}>
              {genderData.map((_, i) => <Cell key={i} fill={genderColors[i % genderColors.length]} />)}
            </Pie>
          </PieChart>
          <div className="space-y-1.5">
            {genderData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: genderColors[i % genderColors.length] }} />
                <span className="text-xs text-gray-600">{d.name === "M" ? "Male" : d.name === "F" ? "Female" : d.name}</span>
                <span className="text-xs font-semibold text-gray-900 ml-auto">
                  {totalGender ? Math.round((d.value / totalGender) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Age groups */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Age Groups</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={demo.ageGroups} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <XAxis dataKey="age" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={fmtNum} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => fmtNum(v)} />
            <Bar dataKey="value" fill={chartColors[0] ?? "#6366f1"} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top cities */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
          <MapPin size={11} /> Top Cities
        </p>
        <div className="space-y-2">
          {demo.topCities.slice(0, 5).map(c => (
            <div key={c.name} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-20 truncate">{c.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${(c.value / maxCity) * 100}%` }} />
              </div>
              <span className="text-[10px] text-gray-400 w-8 text-right">{fmtNum(c.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar planning
// ─────────────────────────────────────────────────────────────────────────────

function CalendarPlan({ vertical, totals }: { vertical: string; totals: MetricsTotals }) {
  const recs = RECOMMENDATIONS[vertical] ?? RECOMMENDATIONS["SY_INDIA"];

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthName = nextMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const engRate = totals.follows > 0 && totals.reach > 0
    ? ((totals.follows / totals.reach) * 100).toFixed(2) : null;

  const videoRatio = totals.postsPublished > 0
    ? Math.round((totals.videoPosts / totals.postsPublished) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Calendar size={14} className="text-indigo-500" />
        Content Plan for <span className="text-indigo-600">{monthName}</span>
        <span className="text-xs text-gray-400 font-normal">(based on this period's insights)</span>
      </div>

      {/* Insight summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Recommended posts/week", value: totals.postsPublished > 20 ? "14–21" : totals.postsPublished > 10 ? "10–14" : "7–10", color: "bg-indigo-50 text-indigo-700" },
          { label: "Video ratio target",     value: `${Math.max(videoRatio + 10, 40)}%`,   color: "bg-pink-50 text-pink-700" },
          { label: "Best format",            value: videoRatio > 50 ? "Reels" : "Carousels", color: "bg-amber-50 text-amber-700" },
          { label: "Engagement rate",        value: engRate ? `${engRate}%` : "N/A",        color: "bg-green-50 text-green-700" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl p-3", s.color)}>
            <p className="text-[10px] opacity-70 mb-0.5">{s.label}</p>
            <p className="text-base font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        {recs.map((rec, i) => (
          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-xs text-gray-700 leading-relaxed">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Competitor section
// ─────────────────────────────────────────────────────────────────────────────

function CompetitorSection({ vertical }: { vertical: string }) {
  const comps = COMPETITORS[vertical] ?? COMPETITORS["SY_INDIA"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">Competitor</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">Followers</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">Eng. Rate</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">Posts/Wk</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Their Strength</th>
            <th className="text-left py-2 pl-3 text-gray-400 font-medium">Our Opportunity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {comps.map(c => (
            <tr key={c.name} className="hover:bg-gray-50 transition-colors">
              <td className="py-2.5 pr-4">
                <p className="font-medium text-gray-800">{c.name}</p>
              </td>
              <td className="py-2.5 px-3 text-right text-gray-600">{c.followers}</td>
              <td className="py-2.5 px-3 text-right text-gray-600">{c.engRate}</td>
              <td className="py-2.5 px-3 text-right text-gray-600">{c.postsPerWeek}</td>
              <td className="py-2.5 px-3">
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  {c.strength}
                </span>
              </td>
              <td className="py-2.5 pl-3">
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  {c.gap}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-300 mt-3 text-right">* Competitor data is estimated benchmark intelligence</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SocialDashboardPage() {
  // ── Color palette (user-editable in Settings → Appearance) ─────────────────
  const { chartColors, brandColors } = useChartColors();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [vertical, setVertical] = useState("SY_INDIA");
  const [platform, setPlatform] = useState("instagram");
  const [preset,   setPreset]   = useState(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [useCustom,  setUseCustom]  = useState(false);
  const [showComp,   setShowComp]   = useState(false);
  const [compMode,   setCompMode]   = useState<"prev" | "custom">("prev");
  const [compFrom,   setCompFrom]   = useState("");
  const [compTo,     setCompTo]     = useState("");

  // ── Data state ──────────────────────────────────────────────────────────────
  const [data,    setData]    = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [graphMetric,   setGraphMetric]   = useState<MetricDef | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState<string | null>(null);

  // ── Build date params ────────────────────────────────────────────────────────
  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ vertical, platform });

    let fromDate: Date, toDate: Date;
    if (useCustom && customFrom && customTo) {
      fromDate = new Date(customFrom);
      toDate   = new Date(customTo);
    } else {
      toDate   = new Date();
      fromDate = addDays(toDate, -preset);
    }
    params.set("from", toYMD(fromDate));
    params.set("to",   toYMD(toDate));

    if (showComp) {
      if (compMode === "prev") {
        const span = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
        const cTo  = addDays(fromDate, -1);
        const cFrom = addDays(cTo, -span);
        params.set("compFrom", toYMD(cFrom));
        params.set("compTo",   toYMD(cTo));
      } else if (compFrom && compTo) {
        params.set("compFrom", compFrom);
        params.set("compTo",   compTo);
      }
    }
    return params.toString();
  }, [vertical, platform, useCustom, customFrom, customTo, preset, showComp, compMode, compFrom, compTo]);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res  = await fetch(`/api/meta/instagram/analytics/metrics?${buildParams()}`);
      const json = await res.json();
      if (!json.connected) {
        setError(json.message ?? "Not connected");
      } else {
        setData(json);
      }
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/meta/instagram/sync-daily", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ vertical }),
      });
      const json = await res.json();
      setSyncMsg(`Synced ${json.synced ?? 0} account(s) — refreshing…`);
      setTimeout(() => { fetchData(); setSyncMsg(null); }, 1500);
    } catch {
      setSyncMsg("Sync failed. Try again.");
    } finally {
      setSyncing(false);
    }
  }, [vertical, fetchData]);

  const [backfilling, setBackfilling] = useState(false);
  const backfillHistory = useCallback(async () => {
    setBackfilling(true);
    setSyncMsg(null);
    try {
      setSyncMsg("Backfilling last 30 days… this may take ~30 seconds");
      const res  = await fetch("/api/meta/instagram/backfill", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ vertical, days: 30 }),
      });
      const json = await res.json();
      setSyncMsg(`Backfill complete — ${json.filled} snapshots stored. Refreshing…`);
      setTimeout(() => { fetchData(); setSyncMsg(null); }, 2000);
    } catch {
      setSyncMsg("Backfill failed. Try again.");
    } finally {
      setBackfilling(false);
    }
  }, [vertical, fetchData]);

  // ── Available platforms (Pinterest only for Interior) ────────────────────────
  const availablePlatforms = PLATFORMS.filter(p => !p.interiorOnly || vertical === "INTERIOR");

  return (
    <>
      <Header title="Social Analytics" subtitle="Real-time performance across all brands and platforms" />

      {/* ══════════════════════════════════════════════════════════════════════
          FILTER STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="mt-4 space-y-3">

        {/* Business tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {VERTICALS.map(v => (
            <button
              key={v.key}
              onClick={() => { setVertical(v.key); if (platform === "pinterest" && v.key !== "INTERIOR") setPlatform("instagram"); }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm",
                vertical === v.key ? V_ACTIVE[v.key] : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Platform pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          {availablePlatforms.map(p => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                platform === p.key
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 bg-gray-100 p-1 rounded-lg">
            {DATE_PRESETS.map(p => (
              <button
                key={p.days}
                onClick={() => { setPreset(p.days); setUseCustom(false); }}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all",
                  !useCustom && preset === p.days ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <input type="date" value={customFrom}
            onChange={e => { setCustomFrom(e.target.value); setUseCustom(true); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={customTo}
            onChange={e => { setCustomTo(e.target.value); setUseCustom(true); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />

          {/* Compare toggle */}
          <button
            onClick={() => setShowComp(!showComp)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              showComp ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            )}
          >
            {showComp ? "✓ Comparing" : "+ Compare"}
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* Backfill last 30 days into DB */}
            <button onClick={backfillHistory} disabled={backfilling || syncing || loading}
              title="Fetch & store the last 30 days of historical data from Meta API"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={backfilling ? "animate-spin" : ""} />
              {backfilling ? "Backfilling…" : "Backfill 30d"}
            </button>
            {/* Sync today's data into DB */}
            <button onClick={syncNow} disabled={syncing || backfilling || loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync Today"}
            </button>
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
        {syncMsg && (
          <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">{syncMsg}</p>
        )}

        {/* Comparison sub-row */}
        {showComp && (
          <div className="flex flex-wrap items-center gap-3 pl-2 py-2 border-l-2 border-purple-200 bg-purple-50/50 rounded-r-lg">
            <div className="flex gap-1 bg-white border border-gray-200 p-0.5 rounded-lg">
              <button onClick={() => setCompMode("prev")}
                className={cn("px-3 py-1 text-xs rounded-md transition-all",
                  compMode === "prev" ? "bg-purple-600 text-white" : "text-gray-500")}>
                Previous period
              </button>
              <button onClick={() => setCompMode("custom")}
                className={cn("px-3 py-1 text-xs rounded-md transition-all",
                  compMode === "custom" ? "bg-purple-600 text-white" : "text-gray-500")}>
                Custom
              </button>
            </div>
            {compMode === "custom" && (
              <>
                <input type="date" value={compFrom} onChange={e => setCompFrom(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={compTo} onChange={e => setCompTo(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none" />
              </>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LOADING
      ══════════════════════════════════════════════════════════════════════ */}
      {loading && (
        <div className="mt-6 space-y-4 animate-pulse">
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-64 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          NOT CONNECTED / ERROR
      ══════════════════════════════════════════════════════════════════════ */}
      {!loading && error && (
        <Card className="mt-6 p-10 text-center">
          <Instagram size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">Not connected</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <a href="/settings" className="text-xs text-blue-600 hover:underline">→ Go to Settings to connect</a>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DASHBOARD
      ══════════════════════════════════════════════════════════════════════ */}
      {!loading && data && (
        <div className="mt-5 space-y-5">

          {/* Account info bar */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 overflow-hidden shrink-0 flex items-center justify-center text-white text-sm font-bold">
              {data.accountInfo.profilePicture
                ? <img src={data.accountInfo.profilePicture} alt="" className="w-full h-full object-cover" />
                : data.accountInfo.handle.slice(1, 3).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{data.accountInfo.handle}</p>
              <p className="text-xs text-gray-400">{data.accountInfo.name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-gray-900">{fmtNum(data.accountInfo.followers)}</p>
              <p className="text-[10px] text-gray-400">Followers</p>
            </div>
            <div className="text-right text-xs text-gray-400 shrink-0">
              <p>{fmtDate(data.current.period.from)} – {fmtDate(data.current.period.to)}</p>
              {data.comparison && (
                <p className="text-purple-500">vs {fmtDate(data.comparison.period.from)} – {fmtDate(data.comparison.period.to)}</p>
              )}
              {data.dataSource === "database" ? (
                <span className="inline-flex items-center gap-1 mt-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  ● DB · {data.dbDaysStored}d stored
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-1 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  ● Live · tap Sync Today to store
                </span>
              )}
            </div>
          </div>

          {/* ── Partial DB coverage warning ───────────────────────────────── */}
          {(() => {
            if (!data.dbActualRange) return null;
            const requestedFrom = data.current.period.from;
            const requestedTo   = data.current.period.to;
            const isPartial     = data.dbActualRange.from > requestedFrom || data.dbActualRange.to < requestedTo;
            if (!isPartial) return null;
            return (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-lg shrink-0">📅</span>
                  <div>
                    <p className="text-sm font-semibold text-orange-800 mb-1">
                      Data available from {fmtDate(data.dbActualRange.from)} – {fmtDate(data.dbActualRange.to)} only
                    </p>
                    <p className="text-xs text-orange-700 mb-2">
                      You selected {fmtDate(requestedFrom)} – {fmtDate(requestedTo)} but the daily sync only has {data.dbDaysStored} day{data.dbDaysStored !== 1 ? "s" : ""} stored so far.
                      All metrics reflect <strong>{data.dbActualRange.from} → {data.dbActualRange.to}</strong> so they compare fairly.
                    </p>
                    <button onClick={backfillHistory} disabled={backfilling}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-100 border border-orange-300 text-orange-800 hover:bg-orange-200 transition-colors disabled:opacity-50 font-medium">
                      <RefreshCw size={11} className={backfilling ? "animate-spin" : ""} />
                      {backfilling ? "Backfilling…" : "Backfill last 30 days now"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Insight errors warning ────────────────────────────────────── */}
          {data.insightErrors && data.insightErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    Instagram Insights API is not returning data
                  </p>
                  <p className="text-xs text-amber-700 mb-2">
                    Views, Reach, Follows, Link Clicks and other insight metrics require the
                    <strong> instagram_manage_insights</strong> permission to be approved by Meta. This usually means:
                  </p>
                  <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside mb-2">
                    <li>Your Meta app may need App Review for <code>instagram_manage_insights</code></li>
                    <li>Or the Instagram account needs to be a Business / Creator account</li>
                    <li>Or you need to <a href="/settings" className="underline font-medium">reconnect Meta</a> with updated permissions</li>
                  </ul>
                  <details className="text-[10px] text-amber-600">
                    <summary className="cursor-pointer font-medium">View API errors</summary>
                    <div className="mt-1 space-y-0.5 font-mono">
                      {data.insightErrors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* ── Interaction breakdown errors (likes/comments/saves/shares) ──── */}
          {data.interactionErrors && data.interactionErrors.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 text-lg shrink-0">ℹ️</span>
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    Likes / Comments / Saves / Shares — partial data
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    Some interaction breakdown metrics could not be fetched from the Insights API for this account.
                    These metrics require the <strong>instagram_manage_insights</strong> permission — make sure
                    the connected account is a Business or Creator account and has this permission granted.
                  </p>
                  <details className="text-[10px] text-blue-600">
                    <summary className="cursor-pointer font-medium">View errors</summary>
                    <div className="mt-1 space-y-0.5 font-mono">
                      {data.interactionErrors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* ── Metrics Table ─────────────────────────────────────────────── */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <BarChart2 size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-900">Performance Metrics</h3>
              <span className="text-xs text-gray-400 ml-1">— tap any row to view graph</span>
            </div>

            <div>
              {METRIC_DEFS.map(m => {
                const curr  = data.current.totals[m.key] as number | null;
                const comp  = data.comparison?.totals[m.key] as number | null | undefined;
                const delta = calcDelta(curr, comp ?? null);

                return (
                  <div key={m.key}>
                    {/* Section divider */}
                    {m.section && (
                      <div className="px-5 pt-4 pb-1.5 bg-gray-50 border-t border-b border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                          {m.section}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => setGraphMetric(m)}
                      className={cn(
                        "w-full flex items-center gap-4 py-3 hover:bg-gray-50 transition-colors text-left group border-b border-gray-50",
                        m.label.startsWith("  ↳") ? "pl-10 pr-5 bg-gray-50/50" : "px-5",
                      )}
                    >
                      <span className={cn("shrink-0", m.color)}>{m.icon}</span>
                      <span className={cn("flex-1 flex items-center gap-1.5 text-gray-700", m.label.startsWith("  ↳") ? "text-xs text-gray-500" : "text-sm")}>
                        {m.label.replace(/^\s+↳\s*/, "↳ ")}
                        {/* (i) tooltip */}
                        <span
                          className="relative shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <span className="peer inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold cursor-default select-none hover:bg-indigo-100 hover:text-indigo-600 transition-colors">
                            i
                          </span>
                          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden peer-hover:block w-72 rounded-lg bg-gray-900 text-white text-[11px] leading-snug px-3 py-2 shadow-xl">
                            {m.description}
                            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                          </span>
                        </span>
                      </span>
                      <span className={cn("font-semibold text-gray-900 w-20 text-right", m.label.startsWith("  ↳") ? "text-xs" : "text-sm font-bold")}>
                        {fmtNum(curr)}
                      </span>
                      {data.comparison && (
                        <span className="text-xs text-gray-300 w-20 text-right">
                          {fmtNum(comp ?? null)}
                        </span>
                      )}
                      {delta !== null ? (
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full w-16 text-center", deltaColor(delta))}>
                          {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
                        </span>
                      ) : (
                        <span className="w-16" />
                      )}
                      <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ── Top Videos Last 7 Days + Recommendations ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Top videos (2/3 width) */}
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Play size={14} className="text-pink-500" />
                <h3 className="text-sm font-semibold text-gray-900">Top Videos — Last 7 Days</h3>
              </div>

              {data.topVideosLastWeek.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Instagram size={18} className="text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400">No videos in the last 7 days</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
                  {data.topVideosLastWeek.map(v => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVideo(v)}
                      className="group relative flex-shrink-0 w-44 bg-white border border-gray-100 rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
                    >
                      <div className="relative bg-gray-100 aspect-square">
                        {v.thumbnail
                          ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          : <div className="w-full h-full flex items-center justify-center"><Instagram size={24} className="text-gray-300" /></div>
                        }
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 rounded-full p-2 shadow-lg"><QrCode size={15} className="text-gray-700" /></div>
                        </div>
                        <span className="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                          {v.mediaType === "VIDEO" || v.mediaType === "REEL" ? "Reel" : v.mediaType === "CAROUSEL_ALBUM" ? "Carousel" : "Image"}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-[10px] text-gray-400 mb-1">{fmtDate(v.date)}</p>
                        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                          {v.caption ? v.caption.slice(0, 60) : "No caption"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                          <span className="flex items-center gap-0.5"><Heart size={9} className="text-rose-400" />{fmtNum(v.likes)}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle size={9} className="text-blue-400" />{fmtNum(v.comments)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recommendations card (1/3 width) */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={14} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">Content Tips</h3>
              </div>
              <div className="space-y-2.5">
                {(RECOMMENDATIONS[vertical] ?? []).slice(0, 4).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Star size={10} className="text-amber-400 mt-1 shrink-0" />
                    <p className="text-xs text-gray-600 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Competitor Benchmark ──────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target size={14} className="text-red-500" />
              <h3 className="text-sm font-semibold text-gray-900">Competitor Benchmark</h3>
              <span className="text-xs text-gray-400">— estimated intelligence</span>
            </div>
            <CompetitorSection vertical={vertical} />
          </Card>

          {/* ── Demographics ──────────────────────────────────────────────── */}
          {data.demographics ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <Users size={14} className="text-violet-500" />
                <h3 className="text-sm font-semibold text-gray-900">Audience Demographics</h3>
              </div>
              <Demographics demo={data.demographics} chartColors={chartColors} />
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-gray-700">Audience Demographics</h3>
              </div>
              <p className="text-xs text-gray-400">Demographics unavailable — requires a professional/business Instagram account with sufficient audience data.</p>
            </Card>
          )}

          {/* ── Calendar Planning ──────────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-900">Next Month Calendar Plan</h3>
            </div>
            <CalendarPlan vertical={vertical} totals={data.current.totals} />
          </Card>

        </div>
      )}

      {/* ── Graph Modal ──────────────────────────────────────────────────────── */}
      {graphMetric && data && (
        <GraphModal
          label={graphMetric.label}
          dailyKey={graphMetric.dailyKey}
          currentPeriod={data.current.period}
          currentDaily={data.current.daily}
          comparisonPeriod={data.comparison?.period ?? null}
          comparisonDaily={data.comparison?.daily ?? null}
          currentTotal={data.current.totals[graphMetric.key] as number | null}
          compTotal={(data.comparison?.totals[graphMetric.key] ?? null) as number | null}
          onClose={() => setGraphMetric(null)}
        />
      )}

      {/* ── QR Modal ─────────────────────────────────────────────────────────── */}
      {selectedVideo && (
        <QRModal media={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </>
  );
}
