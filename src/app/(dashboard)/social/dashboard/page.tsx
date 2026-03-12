"use client";

import { useState, useEffect, useCallback } from "react";
import { Header }      from "@/components/layout/Header";
import { Card }        from "@/components/ui/Card";
import {
  Users, TrendingUp, TrendingDown, Heart, MessageCircle,
  Bookmark, Share2, Play, Eye, Calendar, ExternalLink, QrCode, X,
  RefreshCw, Instagram,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface MediaItem {
  id:         string;
  caption:    string;
  mediaType:  string;
  permalink:  string;
  thumbnail:  string | null;
  timestamp:  string;
  date:       string;
  likes:      number;
  comments:   number;
  saves:      number;
  shares:     number;
  reach:      number;
  plays:      number;
  engagement: number;
  handle?:    string;
  vertical?:  string | null;
}

interface AnalyticsData {
  summary: {
    totalFollowers: number;
    accountCount:   number;
    dateRange:      { from: string; to: string; days: number };
  };
  allTopEngagement: MediaItem[];
  allGainDayMedia:  MediaItem[];
  allLossDayMedia:  MediaItem[];
  accounts: {
    igId:               string;
    handle:             string;
    name:               string;
    vertical:           string | null;
    profilePicture:     string | null;
    followers:          number;
    hasFollowerInsights: boolean;
    gainDays:           string[];
    lossDays:           string[];
    totalMediaInRange:  number;
    topByEngagement:    MediaItem[];
    gainDayMedia:       MediaItem[];
    lossDayMedia:       MediaItem[];
    followerTimeline:   { date: string; change: number }[];
  }[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: "7 days",  days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const VERTICAL_COLORS: Record<string, string> = {
  SY_INDIA:       "bg-blue-100 text-blue-700",
  SY_UAE:         "bg-purple-100 text-purple-700",
  INTERIOR:       "bg-amber-100 text-amber-700",
  SQUARE_CONNECT: "bg-green-100 text-green-700",
  UM:             "bg-rose-100 text-rose-700",
};

const VERTICAL_LABELS: Record<string, string> = {
  SY_INDIA:       "SY India",
  SY_UAE:         "SY UAE",
  INTERIOR:       "Interior Co.",
  SQUARE_CONNECT: "Sq Connect",
  UM:             "Urban Money",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function captionSnippet(caption: string, len = 80): string {
  if (!caption) return "No caption";
  return caption.length > len ? caption.slice(0, len) + "…" : caption;
}

function mediaTypeLabel(type: string): string {
  if (type === "VIDEO" || type === "REEL") return "Reel";
  if (type === "CAROUSEL_ALBUM")           return "Carousel";
  return "Image";
}

// ── QR Code Modal ─────────────────────────────────────────────────────────

function QRModal({ media, onClose }: { media: MediaItem; onClose: () => void }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(media.permalink)}&format=png&margin=10`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Thumbnail */}
        <div className="relative bg-gray-100 aspect-video">
          {media.thumbnail ? (
            <img src={media.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Instagram size={40} className="text-gray-300" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X size={16} />
          </button>
          <span className="absolute top-3 left-3 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            {mediaTypeLabel(media.mediaType)}
          </span>
          {media.vertical && (
            <span className={cn(
              "absolute bottom-3 left-3 text-[10px] font-medium px-2 py-0.5 rounded-full",
              VERTICAL_COLORS[media.vertical] ?? "bg-gray-100 text-gray-600"
            )}>
              {VERTICAL_LABELS[media.vertical] ?? media.vertical}
            </span>
          )}
        </div>

        <div className="p-5">
          {/* Handle + date */}
          <div className="flex items-center gap-2 mb-3">
            {media.handle && (
              <span className="text-xs font-medium text-gray-500">{media.handle}</span>
            )}
            <span className="text-xs text-gray-400">· {fmtDate(media.date)}</span>
          </div>

          {/* Caption */}
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            {captionSnippet(media.caption, 160)}
          </p>

          {/* Metrics grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { icon: <Heart size={13} className="text-rose-500" />,        label: "Likes",    val: media.likes },
              { icon: <MessageCircle size={13} className="text-blue-500" />, label: "Comments", val: media.comments },
              { icon: <Bookmark size={13} className="text-amber-500" />,    label: "Saves",    val: media.saves },
              { icon: <Share2 size={13} className="text-green-500" />,      label: "Shares",   val: media.shares },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <div className="flex justify-center mb-1">{m.icon}</div>
                <p className="text-sm font-bold text-gray-900">{fmtNum(m.val)}</p>
                <p className="text-[10px] text-gray-400">{m.label}</p>
              </div>
            ))}
          </div>

          {(media.reach > 0 || media.plays > 0) && (
            <p className="text-xs text-gray-400 mb-4 text-center">
              {media.reach > 0 && <><Eye size={11} className="inline mr-1" />{fmtNum(media.reach)} reach</>}
              {media.plays > 0 && <span className="ml-2"><Play size={11} className="inline mr-0.5" />{fmtNum(media.plays)} plays</span>}
            </p>
          )}

          {/* QR Code */}
          <div className="flex flex-col items-center gap-2 bg-gray-50 rounded-xl p-4 mb-4">
            <img
              src={qrUrl}
              alt="QR code to Instagram post"
              className="w-28 h-28 rounded-lg"
            />
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <QrCode size={10} /> Scan to view on Instagram
            </p>
          </div>

          {/* Open link */}
          <a
            href={media.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={14} />
            Open on Instagram
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Video Card ─────────────────────────────────────────────────────────────

function VideoCard({ media, onClick }: { media: MediaItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-200 transition-all flex-shrink-0 w-52"
    >
      <div className="relative bg-gray-100 aspect-square">
        {media.thumbnail ? (
          <img src={media.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Instagram size={28} className="text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
            <QrCode size={16} className="text-gray-700" />
          </div>
        </div>
        <span className="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
          {mediaTypeLabel(media.mediaType)}
        </span>
        {media.vertical && (
          <span className={cn(
            "absolute bottom-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded-full",
            VERTICAL_COLORS[media.vertical] ?? "bg-gray-100 text-gray-600"
          )}>
            {VERTICAL_LABELS[media.vertical] ?? media.vertical}
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="text-[11px] text-gray-500 mb-1.5">{fmtDate(media.date)}</p>
        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed mb-2">
          {captionSnippet(media.caption, 70)}
        </p>
        <div className="flex items-center gap-2.5 text-[10px] text-gray-500">
          <span className="flex items-center gap-0.5"><Heart size={9} className="text-rose-400" />{fmtNum(media.likes)}</span>
          <span className="flex items-center gap-0.5"><MessageCircle size={9} className="text-blue-400" />{fmtNum(media.comments)}</span>
          <span className="flex items-center gap-0.5"><Bookmark size={9} className="text-amber-400" />{fmtNum(media.saves)}</span>
          <span className="flex items-center gap-0.5"><Share2 size={9} className="text-green-400" />{fmtNum(media.shares)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Section Title ─────────────────────────────────────────────────────────

function SectionTitle({ icon, title, subtitle, badge }: {
  icon: React.ReactNode; title: string; subtitle?: string; badge?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          {badge && (
            <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Instagram size={18} className="text-gray-300 mb-2" />
      <p className="text-xs text-gray-400">{message}</p>
    </div>
  );
}

// ── Video Row (horizontal scroll) ─────────────────────────────────────────

function VideoRow({ items, onSelect }: { items: MediaItem[]; onSelect: (m: MediaItem) => void }) {
  if (!items.length) return <EmptyState message="No posts found for this period" />;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
      {items.map(m => (
        <VideoCard key={m.id} media={m} onClick={() => onSelect(m)} />
      ))}
    </div>
  );
}

// ── Mini follower bar chart ────────────────────────────────────────────────

function FollowerMiniChart({ data }: { data: { date: string; change: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Math.abs(d.change)), 1);
  const w = 4, gap = 2, h = 32;
  return (
    <svg width={data.length * (w + gap)} height={h} className="overflow-visible">
      {data.map((d, i) => {
        const barH  = Math.max(2, (Math.abs(d.change) / max) * h);
        const isPos = d.change >= 0;
        return (
          <rect key={i} x={i * (w + gap)} y={isPos ? h - barH : 0}
            width={w} height={barH} rx={1}
            fill={isPos ? "#22c55e" : "#ef4444"} opacity={0.75} />
        );
      })}
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SocialDashboardPage() {
  const [daysPreset, setDaysPreset] = useState(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [useCustom,  setUseCustom]  = useState(false);

  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/meta/instagram/analytics?";
      if (useCustom && customFrom && customTo) {
        url += `from=${customFrom}&to=${customTo}`;
      } else {
        url += `days=${daysPreset}`;
      }
      const res  = await fetch(url);
      const json = await res.json();
      if (json.error) {
        setError(json.message ?? json.error);
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [daysPreset, useCustom, customFrom, customTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      <Header
        title="Instagram Analytics"
        subtitle="Real-time performance across all connected brands"
      />

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {DATE_PRESETS.map(p => (
            <button
              key={p.days}
              onClick={() => { setDaysPreset(p.days); setUseCustom(false); }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                !useCustom && daysPreset === p.days
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input type="date" value={customFrom}
            onChange={e => { setCustomFrom(e.target.value); setUseCustom(true); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={customTo}
            onChange={e => { setCustomTo(e.target.value); setUseCustom(true); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <button
          onClick={fetchData} disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {!loading && error && (
        <Card className="mt-6 p-8 text-center">
          <Instagram size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            {error.includes("no_instagram") ? "No Instagram accounts connected" : "Something went wrong"}
          </p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <a href="/settings" className="text-xs text-blue-600 hover:underline">
            → Go to Settings to connect Instagram
          </a>
        </Card>
      )}

      {/* ── Dashboard ────────────────────────────────────────────────────── */}
      {!loading && data && (
        <div className="mt-5 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-blue-500" />
                <span className="text-xs text-gray-500">Total Followers</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtNum(data.summary.totalFollowers)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">across {data.summary.accountCount} accounts</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-purple-500" />
                <span className="text-xs text-gray-500">Date Range</span>
              </div>
              <p className="text-base font-bold text-gray-900">
                {fmtDate(data.summary.dateRange.from)} – {fmtDate(data.summary.dateRange.to)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{data.summary.dateRange.days} days</p>
            </Card>

            <Card className="p-4 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <Instagram size={14} className="text-pink-500" />
                <span className="text-xs text-gray-500">Connected Accounts</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.accounts.map(a => (
                  <span key={a.igId} className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    VERTICAL_COLORS[a.vertical ?? ""] ?? "bg-gray-100 text-gray-600"
                  )}>
                    {a.handle}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          {/* Followers per account */}
          <Card className="p-5">
            <SectionTitle
              icon={<Users size={15} className="text-blue-500" />}
              title="Followers per Account"
              subtitle="Current follower count with daily change sparkline"
            />
            <div className="space-y-3">
              {data.accounts.map(a => {
                const totalChange = a.followerTimeline.reduce((s, d) => s + d.change, 0);
                return (
                  <div key={a.igId} className="flex items-center gap-4 py-1">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 overflow-hidden shrink-0 flex items-center justify-center text-white text-xs font-bold">
                      {a.profilePicture
                        ? <img src={a.profilePicture} alt="" className="w-full h-full object-cover" />
                        : a.handle.slice(1, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{a.handle}</p>
                        {a.vertical && (
                          <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                            VERTICAL_COLORS[a.vertical] ?? "bg-gray-100 text-gray-600"
                          )}>
                            {VERTICAL_LABELS[a.vertical] ?? a.vertical}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {fmtNum(a.followers)} followers · {a.totalMediaInRange} posts this period
                      </p>
                    </div>
                    {a.hasFollowerInsights && a.followerTimeline.length > 0 && (
                      <div className="hidden md:block">
                        <FollowerMiniChart data={a.followerTimeline} />
                      </div>
                    )}
                    {a.hasFollowerInsights && (
                      <div className={cn(
                        "text-xs font-semibold flex items-center gap-0.5 shrink-0",
                        totalChange >= 0 ? "text-green-600" : "text-red-500"
                      )}>
                        {totalChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {totalChange >= 0 ? "+" : ""}{fmtNum(totalChange)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top Engagement Videos */}
          <Card className="p-5">
            <SectionTitle
              icon={<Heart size={15} className="text-rose-500" />}
              title="Top Engagement Videos"
              subtitle="Posts with highest likes + comments + saves + shares — tap any to get QR code"
              badge={`${data.allTopEngagement.length} posts`}
            />
            <VideoRow items={data.allTopEngagement} onSelect={setSelectedMedia} />
          </Card>

          {/* Gain + Loss sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <SectionTitle
                icon={<TrendingUp size={15} className="text-green-500" />}
                title="Follower Growth Days"
                subtitle="Content published on days with the highest follower gains"
                badge={data.allGainDayMedia.length > 0 ? `${data.allGainDayMedia.length} posts` : undefined}
              />
              {data.allGainDayMedia.length > 0 ? (
                <VideoRow items={data.allGainDayMedia} onSelect={setSelectedMedia} />
              ) : (
                <EmptyState message={
                  data.accounts.some(a => a.hasFollowerInsights)
                    ? "No posts on peak follower gain days this period"
                    : "Follower insight data not available (needs 100+ followers)"
                } />
              )}
            </Card>

            <Card className="p-5">
              <SectionTitle
                icon={<TrendingDown size={15} className="text-red-400" />}
                title="Unfollow Days"
                subtitle="Content published on days with the most unfollows"
                badge={data.allLossDayMedia.length > 0 ? `${data.allLossDayMedia.length} posts` : undefined}
              />
              {data.allLossDayMedia.length > 0 ? (
                <VideoRow items={data.allLossDayMedia} onSelect={setSelectedMedia} />
              ) : (
                <EmptyState message={
                  data.accounts.some(a => a.hasFollowerInsights)
                    ? "No significant unfollow days this period 🎉"
                    : "Follower insight data not available (needs 100+ followers)"
                } />
              )}
            </Card>
          </div>

          {/* Per-account breakdown */}
          {data.accounts.map(account => (
            <Card key={account.igId} className="p-5">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 overflow-hidden shrink-0 flex items-center justify-center text-white text-sm font-bold">
                  {account.profilePicture
                    ? <img src={account.profilePicture} alt="" className="w-full h-full object-cover" />
                    : account.handle.slice(1, 3).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{account.handle}</p>
                    {account.vertical && (
                      <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                        VERTICAL_COLORS[account.vertical] ?? "bg-gray-100 text-gray-600"
                      )}>
                        {VERTICAL_LABELS[account.vertical] ?? account.vertical}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {fmtNum(account.followers)} followers · {account.totalMediaInRange} posts this period
                  </p>
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-3">Top posts by engagement</p>
              <VideoRow
                items={account.topByEngagement.map(m => ({ ...m, handle: account.handle, vertical: account.vertical }))}
                onSelect={setSelectedMedia}
              />
            </Card>
          ))}

        </div>
      )}

      {/* ── QR Modal ────────────────────────────────────────────────────── */}
      {selectedMedia && (
        <QRModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </>
  );
}
