"use client";

import { useState } from "react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { VERTICAL_LABELS, type Vertical } from "@/types";
import {
  Bot, Sparkles, TrendingUp, Upload, ChevronRight,
  RefreshCw, Lightbulb, Target, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Mock competitor insights ──────────────────────────────────────────────────
const COMPETITOR_INSIGHTS = {
  SY_INDIA: {
    topCompetitors: ["NoBroker","MagicBricks","99acres","Housing.com","PropTiger"],
    contentGaps: [
      "NRI property buying guides (competitors avg 8% more engagement on this topic)",
      "Budget season explainer content (competitors gaining 3x followers on budget-related posts)",
      "City comparison reels (under-indexed vs MagicBricks who gets 2.1x reach)",
    ],
    trendingFormats: [
      { format: "Reels with trending audio", avgEngRate: "8.4%", trend: "+34% reach MoM" },
      { format: "Before/After transformation", avgEngRate: "9.1%", trend: "High save rate" },
      { format: "Expert tip carousels (10 slides)", avgEngRate: "6.2%", trend: "+18% shares" },
    ],
    whatWorking: [
      { insight: "Property tour Reels get 3.2× more reach than static posts", icon: "📈" },
      { insight: "Educational content on home loans gets highest save rate (avg 4.2%)", icon: "💾" },
      { insight: "Posting at 7–9 AM IST on weekdays drives 28% more profile visits", icon: "⏰" },
      { insight: "NRI-focused content gets 2.1× more engagement from UAE and US audiences", icon: "🌍" },
    ],
  },
};

// ── Mock generated calendar ───────────────────────────────────────────────────
const GENERATED_CALENDAR = [
  { date:"Apr 1",  platform:"Instagram",         type:"Reel",     category:"EDUCATION",    topic:"Is Budget 2026 Good or Bad for Home Buyers?",       hook:"Your budget questions — answered in 60 seconds",        confidence: 0.94 },
  { date:"Apr 2",  platform:"LinkedIn",           type:"Carousel", category:"MARKET_UPDATE",topic:"Mumbai Real Estate Q1 Report",                       hook:"Here's what actually happened to Mumbai prices in Q1",   confidence: 0.88 },
  { date:"Apr 3",  platform:"Instagram + YouTube",type:"Reel",     category:"LISTING",     topic:"₹1 Crore Gets You THIS in Different Cities",         hook:"You won't believe what ₹1Cr buys in each city",         confidence: 0.91 },
  { date:"Apr 5",  platform:"Instagram",          type:"Reel",     category:"TIPS",         topic:"5 Things No One Tells You About Home Loans",         hook:"Your bank is hiding this from you",                     confidence: 0.85 },
  { date:"Apr 7",  platform:"All platforms",      type:"Carousel", category:"EDUCATION",    topic:"NRI Property Buying Guide 2026 — Step by Step",      hook:"If you're an NRI, this could save you ₹20 lakhs",       confidence: 0.96 },
  { date:"Apr 9",  platform:"Instagram",          type:"Reel",     category:"TESTIMONIAL",  topic:"First Home Buyer Success Story — Pune",              hook:"This family almost gave up. Then they found this deal.", confidence: 0.82 },
  { date:"Apr 10", platform:"YouTube",            type:"Video",    category:"MARKET_UPDATE",topic:"Hyderabad vs Pune: Where to Invest in 2026",         hook:"The data will surprise you",                            confidence: 0.87 },
  { date:"Apr 12", platform:"Instagram + Facebook",type:"Carousel",category:"TIPS",        topic:"RERA Checklist: What to Verify Before Buying",        hook:"Don't sign anything until you read this",               confidence: 0.90 },
];

const GOAL_OPTIONS = [
  { value: "AWARENESS",   label: "Brand Awareness" },
  { value: "LEADS",       label: "Lead Generation" },
  { value: "ENGAGEMENT",  label: "Engagement" },
  { value: "PROMOTION",   label: "Product Promotion" },
  { value: "FESTIVE",     label: "Festive Campaign" },
];

const FREQ_OPTIONS = [
  { value: "1", label: "1× per week" },
  { value: "2", label: "2× per week" },
  { value: "3", label: "3× per week" },
  { value: "5", label: "Daily (5×/week)" },
];

function ConfidencePill({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? "bg-green-50 text-green-700" : pct >= 80 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500";
  return <span className={cn("badge text-[10px]", color)}>{pct}% AI</span>;
}

export function ContentPlanner() {
  const [vertical, setVertical] = useState<Vertical>("SY_INDIA");
  const [goal,     setGoal]     = useState("AWARENESS");
  const [freq,     setFreq]     = useState("3");
  const [mode,     setMode]     = useState<"ai" | "upload">("ai");
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const insights = COMPETITOR_INSIGHTS[vertical as keyof typeof COMPETITOR_INSIGHTS]
    ?? COMPETITOR_INSIGHTS.SY_INDIA;

  const verticalOptions = Object.entries(VERTICAL_LABELS).map(([v, l]) => ({ value: v, label: l }));

  function handleGenerate() {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2000);
  }

  return (
    <div className="space-y-6">
      {/* ── Step 1: Inputs ─────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeader title="Step 1 — Configure Your Plan" subtitle="Select vertical, goal and frequency for the calendar" />
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Vertical</label>
            <Select value={vertical} onChange={(v) => { setVertical(v as Vertical); setGenerated(false); }} options={verticalOptions} className="w-52" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Content Goal</label>
            <Select value={goal} onChange={setGoal} options={GOAL_OPTIONS} className="w-44" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Posting Frequency</label>
            <Select value={freq} onChange={setFreq} options={FREQ_OPTIONS} className="w-36" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Calendar Mode</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["ai","upload"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
                    mode === m ? "bg-accent-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {m === "ai" ? <><Bot size={13} /> AI Generate</> : <><Upload size={13} /> Upload & Tweak</>}
                </button>
              ))}
            </div>
          </div>
          {mode === "upload" && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Upload existing calendar</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg px-4 py-2 text-xs text-gray-400 text-center cursor-pointer hover:border-accent-400 transition-colors">
                Drop CSV / Excel here or click to browse
              </div>
            </div>
          )}
          <Button variant="brand" size="md" loading={generating} onClick={handleGenerate} leftIcon={<Sparkles size={14} />}>
            {mode === "ai" ? "Generate April Calendar" : "Analyse & Improve"}
          </Button>
        </div>
      </Card>

      {/* ── Step 2: Competitor & Performance Insights ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* What competitors are doing */}
        <Card className="p-5">
          <SectionHeader
            title="Competitor Intelligence"
            subtitle={`Tracking: ${insights.topCompetitors.slice(0,3).join(", ")} +${insights.topCompetitors.length - 3} more`}
            actions={<button className="text-gray-400 hover:text-gray-700"><RefreshCw size={14} /></button>}
          />
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Content gaps you can win on</p>
            {insights.contentGaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">!</div>
                {gap}
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trending formats</p>
            {insights.trendingFormats.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-green-500 shrink-0" />
                  <span className="text-gray-700">{f.format}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium">{f.avgEngRate}</span>
                  <Badge variant="success" className="text-[10px]">{f.trend}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* What's working for you */}
        <Card className="p-5">
          <SectionHeader
            title="What's Working For You"
            subtitle="Based on last 90 days performance"
            actions={<Badge variant="info" className="text-[10px]">AI Analysis</Badge>}
          />
          <div className="space-y-3">
            {insights.whatWorking.map((w, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <span className="text-xl shrink-0">{w.icon}</span>
                <span>{w.insight}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Generated Calendar ─────────────────────────────── */}
      {generated && (
        <Card padding={false}>
          <div className="p-5 pb-0 flex items-center justify-between">
            <SectionHeader
              title="Generated Content Calendar — April 2026"
              subtitle={`${GENERATED_CALENDAR.length} posts planned for ${VERTICAL_LABELS[vertical]}`}
            />
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={13} />}>Regenerate</Button>
              <Button variant="brand" size="sm" leftIcon={<ChevronRight size={14} />}>
                Push to Calendar →
              </Button>
            </div>
          </div>
          <div className="callout-info mx-5 my-3 text-xs">
            <strong>AI generated this plan</strong> based on competitor gaps, your top-performing content types, and real estate seasonal calendar. Click any row to edit, or drag to reorder.
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Platform(s)</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Topic</th>
                  <th>Suggested Hook</th>
                  <th>AI Confidence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {GENERATED_CALENDAR.map((row, i) => (
                  <tr key={i} className="cursor-pointer hover:bg-blue-50/30 transition-colors">
                    <td className="font-medium text-gray-900 whitespace-nowrap">{row.date}</td>
                    <td className="text-xs text-gray-600 whitespace-nowrap">{row.platform}</td>
                    <td><Badge>{row.type}</Badge></td>
                    <td>
                      <Badge variant={row.category === "EDUCATION" ? "info" : row.category === "LISTING" ? "success" : "default"} className="text-[10px]">
                        {row.category}
                      </Badge>
                    </td>
                    <td className="max-w-xs">
                      <span className="font-medium text-gray-900 text-sm">{row.topic}</span>
                    </td>
                    <td className="max-w-xs text-xs text-gray-500 italic">"{row.hook}"</td>
                    <td><ConfidencePill score={row.confidence} /></td>
                    <td>
                      <button className="text-xs text-accent-600 font-medium hover:underline whitespace-nowrap">
                        Create Script →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!generated && !generating && (
        <div className="callout-info text-sm">
          <Lightbulb size={15} className="inline mr-1.5 text-accent-600" />
          Configure your vertical, goal, and frequency above, then click <strong>Generate April Calendar</strong> to get an AI-powered content plan based on competitor analysis and your best-performing posts.
        </div>
      )}
      {generating && (
        <Card className="p-8 text-center">
          <Bot size={32} className="mx-auto text-accent-500 mb-3 animate-pulse" />
          <p className="font-semibold text-gray-900">Analysing competitor data and your performance...</p>
          <p className="text-sm text-gray-500 mt-1">Scanning 5 competitors · Reviewing last 90 days · Building your calendar</p>
        </Card>
      )}
    </div>
  );
}
