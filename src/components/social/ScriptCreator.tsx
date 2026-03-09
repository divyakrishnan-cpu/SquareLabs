"use client";

import { useState } from "react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Copy, RefreshCw, CheckCircle2, Bot, ChevronDown, Upload, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type HookType = "PATTERN_INTERRUPT" | "CURIOSITY_GAP" | "SHOCK_STAT" | "STORY_OPEN" | "BOLD_CLAIM";

const HOOK_TYPE_LABELS: Record<HookType, { label: string; desc: string; icon: string }> = {
  PATTERN_INTERRUPT: { label: "Pattern Interrupt", desc: "Stop the scroll immediately", icon: "✋" },
  CURIOSITY_GAP:     { label: "Curiosity Gap",     desc: "Make them need to know",       icon: "🔍" },
  SHOCK_STAT:        { label: "Shock Stat",         desc: "Open with a surprising number", icon: "📊" },
  STORY_OPEN:        { label: "Story Open",         desc: "Pull them into a narrative",   icon: "📖" },
  BOLD_CLAIM:        { label: "Bold Claim",         desc: "Make a strong statement",      icon: "⚡" },
};

// ── Mock generated hooks ──────────────────────────────────────────────────────
const SAMPLE_HOOKS: Record<HookType, string> = {
  PATTERN_INTERRUPT: "Stop scrolling if you're planning to buy a home in 2026 — this will change your decision.",
  CURIOSITY_GAP:     "Here's what no one tells you about buying a flat in Mumbai right now.",
  SHOCK_STAT:        "Mumbai property prices have gone up 34% in 18 months — here's what that actually means for your budget.",
  STORY_OPEN:        "This couple almost lost ₹40 lakhs on a property deal. What happened next saved them.",
  BOLD_CLAIM:        "This is the single best time in 5 years to buy a 3BHK in Pune — and here's the data to prove it.",
};

const SAMPLE_SCRIPT = {
  body: `[Scene 1 — Talking head, energetic]
Good time to buy? Here's the honest answer.

[Scene 2 — Screen recording / infographic B-roll]
Property prices in Mumbai have risen 34% since 2024. But here's what most people miss — interest rates are actually lower today than they were 18 months ago. Your EMI on a ₹80L home is ₹8,200 less per month than it would have been in mid-2024.

[Scene 3 — Back to face cam]
So yes, prices are higher — but your purchasing power hasn't changed as much as headlines make you think. If you're waiting for prices to drop, you might be waiting a long time.

[Scene 4 — Text overlay on screen]
3 things to do RIGHT NOW if you're serious about buying:
1. Lock in your pre-approval while rates are low
2. Focus on micro-markets like Thane, Navi Mumbai and Panvel
3. Talk to a Square Yards advisor — zero brokerage, no hidden fees`,
  cta: "Drop a '1' in the comments if you want our free property buying checklist — we'll DM it to you. And follow for more honest real estate takes.",
  captionInsta: `Is 2026 the right time to buy? Short answer — it depends on your city 🏠\n\nWe break down the numbers so you don't have to.\n\n#RealEstate #MumbaiProperty #HomeBuying #SquareYards #PropertyInvestment #IndianRealEstate #FirstTimeBuyer #HomeLoan #PropertyTips2026`,
  captionLinkedin: `Market update for real estate professionals and serious buyers:\n\nMumbai residential prices are up 34% since 2024 — but EMIs are actually ₹8,200/month lower than 18 months ago due to rate movements.\n\nThis counterintuitive data point has significant implications for buyer sentiment and deal velocity in Q2 2026.\n\nFull analysis below 👇`,
};

// ── Hook Selector ─────────────────────────────────────────────────────────────
function HookSelector({
  selectedType, selectedHook, onTypeChange, onHookChange, generating,
}: {
  selectedType: HookType;
  selectedHook: string;
  onTypeChange: (t: HookType) => void;
  onHookChange: (h: string) => void;
  generating: boolean;
}) {
  return (
    <Card className="p-5">
      <SectionHeader title="Step 1 — Choose Your Hook" subtitle="The first 3 seconds determine everything" />

      {/* Hook type pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(HOOK_TYPE_LABELS) as HookType[]).map((type) => {
          const cfg = HOOK_TYPE_LABELS[type];
          return (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                selectedType === type
                  ? "bg-accent-500 text-white border-accent-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-accent-300"
              )}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Generated hook */}
      <div className="relative">
        <div className={cn(
          "p-4 rounded-lg border-2 bg-gray-50 text-gray-900 text-base font-medium leading-relaxed min-h-[64px]",
          "transition-all",
          generating ? "border-accent-200 animate-pulse" : "border-gray-200"
        )}>
          {generating ? (
            <span className="text-gray-400">Generating hook...</span>
          ) : (
            <span className="italic">"{selectedHook}"</span>
          )}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={() => onHookChange(SAMPLE_HOOKS[selectedType])}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white text-gray-400 hover:text-accent-600"
            title="Regenerate">
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(selectedHook)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white text-gray-400 hover:text-gray-700"
            title="Copy">
            <Copy size={13} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        <span className="font-medium">{HOOK_TYPE_LABELS[selectedType].label}:</span>{" "}
        {HOOK_TYPE_LABELS[selectedType].desc}
      </p>

      <Button
        variant="ghost" size="sm" className="mt-3"
        leftIcon={<Sparkles size={13} />}
        onClick={() => onHookChange(SAMPLE_HOOKS[selectedType])}
      >
        Generate 5 variants
      </Button>
    </Card>
  );
}

// ── Script Editor ─────────────────────────────────────────────────────────────
function ScriptEditor({ script, onScriptChange }: { script: typeof SAMPLE_SCRIPT; onScriptChange: (s: typeof SAMPLE_SCRIPT) => void }) {
  const [activeTab, setActiveTab] = useState<"body" | "cta" | "captions">("body");
  const [copied, setCopied]        = useState(false);

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const tabs = [
    { id: "body",     label: "Body Script" },
    { id: "cta",      label: "CTA" },
    { id: "captions", label: "Captions" },
  ] as const;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <SectionHeader title="Step 3 — Script" subtitle="Edit, then approve to push to calendar" />
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-[10px]">~90 seconds</Badge>
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={13} />}>Regenerate</Button>
          <Button variant="primary" size="sm" leftIcon={<CheckCircle2 size={13} />}>Approve Script</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-accent-500 text-accent-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "body" && (
        <div className="relative">
          <textarea
            value={script.body}
            onChange={(e) => onScriptChange({ ...script, body: e.target.value })}
            rows={12}
            className="w-full font-mono text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500 leading-relaxed"
          />
          <button onClick={() => copy(script.body)} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded hover:bg-white text-gray-400 hover:text-gray-700">
            {copied ? <CheckCircle2 size={13} className="text-green-500" /> : <Copy size={13} />}
          </button>
        </div>
      )}

      {activeTab === "cta" && (
        <textarea
          value={script.cta}
          onChange={(e) => onScriptChange({ ...script, cta: e.target.value })}
          rows={4}
          className="w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500 leading-relaxed"
        />
      )}

      {activeTab === "captions" && (
        <div className="space-y-4">
          {[
            { label: "Instagram / Facebook", key: "captionInsta" as const },
            { label: "LinkedIn",             key: "captionLinkedin" as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-600">{label}</label>
                <button onClick={() => copy(script[key])} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                  <Copy size={11} /> Copy
                </button>
              </div>
              <textarea
                value={script[key]}
                onChange={(e) => onScriptChange({ ...script, [key]: e.target.value })}
                rows={5}
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500 leading-relaxed"
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Main ScriptCreator ────────────────────────────────────────────────────────
export function ScriptCreator() {
  const [topic, setTopic]           = useState("");
  const [audience, setAudience]     = useState("FIRST_TIME_BUYER");
  const [hookType, setHookType]     = useState<HookType>("CURIOSITY_GAP");
  const [hook, setHook]             = useState(SAMPLE_HOOKS["CURIOSITY_GAP"]);
  const [script, setScript]         = useState(SAMPLE_SCRIPT);
  const [step, setStep]             = useState(1);
  const [generating, setGenerating] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);

  const audienceOptions = [
    { value: "FIRST_TIME_BUYER",  label: "First-Time Buyer" },
    { value: "INVESTOR",          label: "Property Investor" },
    { value: "NRI",               label: "NRI" },
    { value: "INTERIOR",          label: "Interior Enthusiast" },
    { value: "AGENT",             label: "Real Estate Agent" },
  ];

  function generate() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setStep(3);
    }, 2000);
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setUploadMode(false)}
            className={cn("px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
              !uploadMode ? "bg-accent-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <Bot size={13} /> Generate Script
          </button>
          <button
            onClick={() => setUploadMode(true)}
            className={cn("px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
              uploadMode ? "bg-accent-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <Upload size={13} /> Upload & Review
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {uploadMode ? "Upload an existing script and get AI feedback" : "Generate a full reel script from a topic"}
        </p>
      </div>

      {/* Step 1: Topic + audience */}
      {!uploadMode && (
        <Card className="p-5">
          <SectionHeader title="Step 1 — Brief" subtitle="What's this reel about?" />
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Topic / Title</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Is 2026 the right time to buy property in Mumbai?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  {audienceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <Button
                variant="primary" size="md" loading={generating}
                leftIcon={<Sparkles size={14} />}
                onClick={generate}
                disabled={!topic.trim()}
              >
                Generate Script
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Hook selector */}
      {(step >= 2 || !uploadMode) && (
        <HookSelector
          selectedType={hookType}
          selectedHook={hook}
          onTypeChange={(t) => { setHookType(t); setHook(SAMPLE_HOOKS[t]); }}
          onHookChange={setHook}
          generating={generating}
        />
      )}

      {/* Step 3: Script */}
      {(step >= 3 && !generating) && (
        <ScriptEditor script={script} onScriptChange={setScript} />
      )}

      {generating && (
        <Card className="p-8 text-center">
          <Zap size={32} className="mx-auto text-accent-500 mb-3 animate-bounce" />
          <p className="font-semibold text-gray-900">Writing your reel script...</p>
          <p className="text-sm text-gray-500 mt-1">Crafting hook · Writing body · Generating captions</p>
        </Card>
      )}

      {/* Upload mode */}
      {uploadMode && (
        <Card className="p-5">
          <SectionHeader title="Upload Script for Review" subtitle="Paste or upload your existing script" />
          <textarea
            rows={10}
            placeholder="Paste your script here..."
            className="w-full font-mono text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
          <div className="flex items-center gap-2 mt-3">
            <Button variant="brand" size="sm" leftIcon={<Sparkles size={13} />}>
              Analyse & Improve
            </Button>
            <span className="text-xs text-gray-400">AI will score your hook, check pacing, and suggest improvements</span>
          </div>
        </Card>
      )}
    </div>
  );
}
