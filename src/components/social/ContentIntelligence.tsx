"use client";

/**
 * ContentIntelligence
 *
 * Replaces the old "Top Videos Last 7 Days" + "Content Tips" section.
 * Shows per-post analytics (top 3 / bottom 3 for any metric) across
 * Instagram, YouTube, and LinkedIn, plus a Claude AI content strategy panel.
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { cn }   from "@/lib/utils";
import {
  Play, Image, AlignJustify, ExternalLink,
  Heart, MessageCircle, Bookmark, Share2,
  Eye, MousePointerClick, UserCheck, BarChart2,
  TrendingUp, TrendingDown, Sparkles, RefreshCw,
  ChevronDown, ChevronUp, Trophy, AlertTriangle,
  Lightbulb, Layers, CheckCircle2, XCircle,
  Instagram, Youtube, Linkedin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PostPerformance } from "@/app/api/social/top-posts/route";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform = "INSTAGRAM" | "YOUTUBE" | "LINKEDIN";

type Metric = {
  key:       keyof PostPerformance | string;
  label:     string;
  icon:      LucideIcon;
  platforms: Platform[];
};

interface StrategyAnalysis {
  doMore:             string[];
  doLess:             string[];
  insights:           string[];
  contentIdeas:       string[];
  bestPostingPattern: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const METRICS: Metric[] = [
  { key: "engagement",  label: "Engagement",    icon: Heart,             platforms: ["INSTAGRAM","YOUTUBE","LINKEDIN"] },
  { key: "views",       label: "Views / Plays",  icon: Play,              platforms: ["INSTAGRAM","YOUTUBE"] },
  { key: "impressions", label: "Impressions",    icon: Eye,               platforms: ["INSTAGRAM","YOUTUBE","LINKEDIN"] },
  { key: "reach",       label: "Reach",          icon: BarChart2,         platforms: ["INSTAGRAM","LINKEDIN"] },
  { key: "saves",       label: "Saves",          icon: Bookmark,          platforms: ["INSTAGRAM"] },
  { key: "shares",      label: "Shares",         icon: Share2,            platforms: ["INSTAGRAM","LINKEDIN","YOUTUBE"] },
  { key: "linkClicks",  label: "Link Clicks",    icon: MousePointerClick, platforms: ["INSTAGRAM","LINKEDIN"] },
];

const PLATFORM_CONFIG: Record<Platform, {
  label: string;
  color: string;
  bg:    string;
  ring:  string;
  Icon:  LucideIcon;
}> = {
  INSTAGRAM: { label: "Instagram", color: "text-pink-600",   bg: "bg-pink-50",   ring: "ring-pink-200",  Icon: Instagram },
  YOUTUBE:   { label: "YouTube",   color: "text-red-600",    bg: "bg-red-50",    ring: "ring-red-200",   Icon: Youtube   },
  LINKEDIN:  { label: "LinkedIn",  color: "text-blue-700",   bg: "bg-blue-50",   ring: "ring-blue-200",  Icon: Linkedin  },
};

const TYPE_ICON: Record<string, LucideIcon> = {
  REEL:     Play,
  VIDEO:    Play,
  IMAGE:    Image,
  CAROUSEL: AlignJustify,
  ARTICLE:  AlignJustify,
  NONE:     AlignJustify,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10_000)    return (n / 1_000).toFixed(0) + "K";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function metricVal(p: PostPerformance, metric: string): number {
  return ((p as unknown as Record<string, unknown>)[metric] as number) ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Post Card
// ─────────────────────────────────────────────────────────────────────────────

function PostCard({
  post,
  rank,
  isTop,
  activeMetric,
  platform,
}: {
  post:         PostPerformance;
  rank:         number;
  isTop:        boolean;
  activeMetric: string;
  platform:     Platform;
}) {
  const cfg      = PLATFORM_CONFIG[platform];
  const TypeIcon = TYPE_ICON[post.type] ?? AlignJustify;
  const val      = metricVal(post, activeMetric);
  const medals   = ["🥇", "🥈", "🥉"];

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-white"
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
        {post.thumbnail
          ? <img src={post.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center">
              <TypeIcon size={18} className="text-gray-300" />
            </div>
        }
        {/* Type badge */}
        <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[9px] font-medium px-1 py-0.5 rounded">
          {post.type === "CAROUSEL_ALBUM" ? "Carousel" : post.type === "REEL" ? "Reel" : post.type}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="text-[10px] text-gray-400">{fmtDate(post.publishedAt)}</span>
          <div className="flex items-center gap-1">
            {isTop
              ? <span className="text-base leading-none">{medals[rank] ?? "🏅"}</span>
              : <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  rank === 0 ? "bg-red-100 text-red-600" : "bg-orange-50 text-orange-500"
                }`}>#{rank + 1} lowest</span>
            }
          </div>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed line-clamp-2 mb-1.5">{post.title}</p>

        {/* Primary metric (large) */}
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mb-1.5 ${
          isTop ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
        }`}>
          {isTop ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {fmtNum(val)} {activeMetric}
        </div>

        {/* Secondary metrics row */}
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-400">
          {post.likes > 0     && <span className="flex items-center gap-0.5"><Heart size={8} className="text-rose-400"/>{fmtNum(post.likes)}</span>}
          {post.comments > 0  && <span className="flex items-center gap-0.5"><MessageCircle size={8} className="text-blue-400"/>{fmtNum(post.comments)}</span>}
          {post.saves > 0     && <span className="flex items-center gap-0.5"><Bookmark size={8} className="text-purple-400"/>{fmtNum(post.saves)}</span>}
          {post.shares > 0    && <span className="flex items-center gap-0.5"><Share2 size={8} className="text-green-500"/>{fmtNum(post.shares)}</span>}
          {post.views > 0     && <span className="flex items-center gap-0.5"><Play size={8} className="text-gray-400"/>{fmtNum(post.views)}</span>}
          {post.impressions > 0 && <span className="flex items-center gap-0.5"><Eye size={8} className="text-gray-400"/>{fmtNum(post.impressions)}</span>}
          {post.linkClicks > 0  && <span className="flex items-center gap-0.5"><MousePointerClick size={8} className="text-indigo-400"/>{fmtNum(post.linkClicks)}</span>}
        </div>
      </div>

      <ExternalLink size={10} className="flex-shrink-0 mt-0.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Panel
// ─────────────────────────────────────────────────────────────────────────────

function StrategyPanel({
  analysis,
  loading,
  error,
  onGenerate,
  platform,
}: {
  analysis: StrategyAnalysis | null;
  loading:  boolean;
  error:    string | null;
  onGenerate: () => void;
  platform:   Platform;
}) {
  const cfg = PLATFORM_CONFIG[platform];

  if (!analysis && !loading && !error) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-0.5">AI Content Strategy</p>
          <p className="text-xs text-gray-500">
            Generate data-driven recommendations for your next month's content calendar.
          </p>
        </div>
        <button
          onClick={onGenerate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap ml-3"
        >
          <Sparkles size={12} />
          Analyze with AI
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-violet-200" />
          <div className="absolute inset-0 rounded-full border-2 border-t-violet-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-700">Analyzing your content…</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Claude is reviewing your top &amp; bottom performers</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-100">
        <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-red-700 mb-0.5">Analysis failed</p>
          <p className="text-xs text-red-500">{error}</p>
          <button onClick={onGenerate} className="text-xs text-red-700 font-semibold mt-1 hover:underline">Try again</button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-violet-500" />
          <span className="text-xs font-semibold text-gray-800">AI Content Strategy</span>
          <span className="text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-medium">Claude</span>
        </div>
        <button onClick={onGenerate} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw size={9} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Do More */}
        {analysis.doMore.length > 0 && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Do More Of</span>
            </div>
            <ul className="space-y-1.5">
              {analysis.doMore.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-800 leading-relaxed">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">↑</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Do Less */}
        {analysis.doLess.length > 0 && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-1.5 mb-2">
              <XCircle size={12} className="text-red-500" />
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Do Less Of</span>
            </div>
            <ul className="space-y-1.5">
              {analysis.doLess.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-red-700 leading-relaxed">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">↓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Content Ideas */}
      {analysis.contentIdeas.length > 0 && (
        <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Layers size={12} className="text-violet-600" />
            <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">Content Ideas for Next Month</span>
          </div>
          <ul className="space-y-1.5">
            {analysis.contentIdeas.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-violet-800 leading-relaxed">
                <span className="text-violet-400 mt-0.5 flex-shrink-0">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Insights */}
      {analysis.insights.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={12} className="text-amber-600" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Key Insights</span>
          </div>
          <ul className="space-y-1.5">
            {analysis.insights.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800 leading-relaxed">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Posting Pattern */}
      {analysis.bestPostingPattern && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={12} className="text-blue-600" />
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Posting Pattern</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">{analysis.bestPostingPattern}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface ContentIntelligenceProps {
  vertical:  string;
  from:      string;
  to:        string;
}

export function ContentIntelligence({ vertical, from, to }: ContentIntelligenceProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>("INSTAGRAM");
  const [activeMetric,   setActiveMetric]   = useState<string>("engagement");
  const [posts,          setPosts]          = useState<PostPerformance[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [loaded,         setLoaded]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [analysis,       setAnalysis]       = useState<StrategyAnalysis | null>(null);
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiError,        setAiError]        = useState<string | null>(null);
  const [strategyOpen,   setStrategyOpen]   = useState(true);

  // ── Fetch posts ────────────────────────────────────────────────────────────

  const loadPosts = useCallback(async (platform: Platform) => {
    setLoading(true);
    setError(null);
    setPosts([]);
    setAnalysis(null);
    setAiError(null);
    try {
      const res  = await fetch(
        `/api/social/top-posts?platform=${platform}&vertical=${vertical}&from=${from}&to=${to}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPosts(data.posts ?? []);
      setLoaded(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [vertical, from, to]);

  // Load on mount
  useEffect(() => {
    loadPosts("INSTAGRAM");
  }, [loadPosts]);

  // ── Switch platform ────────────────────────────────────────────────────────

  function switchPlatform(p: Platform) {
    if (p === activePlatform) return;
    setActivePlatform(p);
    setActiveMetric("engagement"); // reset metric on platform switch
    setAnalysis(null);
    setAiError(null);
    loadPosts(p);
  }

  // ── Sort & slice top/bottom ─────────────────────────────────────────────

  const sorted = [...posts].sort((a, b) => metricVal(b, activeMetric) - metricVal(a, activeMetric));
  const top3   = sorted.slice(0, 3);
  // Bottom 3: exclude posts with 0 value (likely no data) unless all are 0
  const nonZero = sorted.filter(p => metricVal(p, activeMetric) > 0);
  const bottom3 = (nonZero.length >= 6 ? nonZero : sorted)
    .slice(-3)
    .reverse()
    .slice(0, 3);

  // ── Available metrics for this platform ───────────────────────────────────

  const availableMetrics = METRICS.filter(m => m.platforms.includes(activePlatform));

  // ── Generate AI strategy ──────────────────────────────────────────────────

  async function generateStrategy() {
    setAiLoading(true);
    setAiError(null);
    setAnalysis(null);
    setStrategyOpen(true);
    try {
      const res = await fetch("/api/social/strategy/suggest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          platform:    activePlatform,
          vertical,
          metric:      activeMetric,
          dateRange:   `${from} to ${to}`,
          topPosts:    top3,
          bottomPosts: bottom3,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (e) {
      setAiError(String(e));
    } finally {
      setAiLoading(false);
    }
  }

  const cfg = PLATFORM_CONFIG[activePlatform];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Card className="p-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Content Performance Intelligence</h3>
          <span className="text-[10px] text-gray-400">top & bottom performers by metric</span>
        </div>

        {/* Platform tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["INSTAGRAM","YOUTUBE","LINKEDIN"] as Platform[]).map(p => {
            const pc = PLATFORM_CONFIG[p];
            return (
              <button
                key={p}
                onClick={() => switchPlatform(p)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  activePlatform === p
                    ? `bg-white shadow-sm ${pc.color} font-semibold`
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <pc.Icon size={11} />
                {pc.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Metric tabs ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {availableMetrics.map(m => {
          const MIcon = m.icon;
          return (
            <button
              key={m.key as string}
              onClick={() => { setActiveMetric(m.key as string); setAnalysis(null); setAiError(null); }}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                activeMetric === m.key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
              )}
            >
              <MIcon size={9} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ── Content area ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-gray-100" />
            <div className="absolute inset-0 rounded-full border-2 border-t-gray-500 animate-spin" />
          </div>
          <p className="text-xs text-gray-400">Loading {cfg.label} posts…</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
          <AlertTriangle size={13} />
          {error}
          <button onClick={() => loadPosts(activePlatform)} className="ml-auto underline font-medium">Retry</button>
        </div>
      ) : !loaded ? null : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <cfg.Icon size={24} className="text-gray-200 mb-2" />
          <p className="text-xs text-gray-400">No posts found for this period on {cfg.label}.</p>
          <p className="text-[10px] text-gray-300 mt-1">Try a wider date range or check your account connection.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Top 3 / Bottom 3 grid ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top performers */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={11} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                  Top 3 by {METRICS.find(m => m.key === activeMetric)?.label ?? activeMetric}
                </span>
                <span className="text-[9px] text-gray-400 ml-auto">{posts.length} posts analysed</span>
              </div>
              <div className="space-y-2">
                {top3.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No data</p>
                ) : top3.map((p, i) => (
                  <PostCard key={p.id} post={p} rank={i} isTop platform={activePlatform} activeMetric={activeMetric} />
                ))}
              </div>
            </div>

            {/* Bottom performers */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={11} className="text-red-400" />
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                  Bottom 3 by {METRICS.find(m => m.key === activeMetric)?.label ?? activeMetric}
                </span>
                <span className="text-[9px] text-gray-400 ml-auto">least effective</span>
              </div>
              <div className="space-y-2">
                {bottom3.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">Not enough posts</p>
                ) : bottom3.map((p, i) => (
                  <PostCard key={p.id} post={p} rank={i} isTop={false} platform={activePlatform} activeMetric={activeMetric} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Divider + AI Strategy ───────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-4">
            {/* Collapsible header when analysis exists */}
            {analysis && (
              <button
                onClick={() => setStrategyOpen(v => !v)}
                className="flex items-center gap-1.5 w-full text-left mb-3 group"
              >
                <Sparkles size={13} className="text-violet-500" />
                <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">AI Content Strategy</span>
                {strategyOpen
                  ? <ChevronUp size={12} className="text-gray-400 ml-auto" />
                  : <ChevronDown size={12} className="text-gray-400 ml-auto" />
                }
              </button>
            )}

            {(!analysis || strategyOpen) && (
              <StrategyPanel
                analysis={analysis}
                loading={aiLoading}
                error={aiError}
                onGenerate={generateStrategy}
                platform={activePlatform}
              />
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
