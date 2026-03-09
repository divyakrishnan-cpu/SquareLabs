"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  MessageSquare, Reply, Trash2, CheckCircle2, AlertTriangle,
  ThumbsUp, ThumbsDown, Star, Filter, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { value: "all",       label: "All Platforms" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook",  label: "Facebook" },
  { value: "youtube",   label: "YouTube" },
  { value: "linkedin",  label: "LinkedIn" },
];

const SENTIMENTS = [
  { value: "all",      label: "All Sentiments" },
  { value: "positive", label: "Positive" },
  { value: "neutral",  label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const MOCK_COMMENTS = [
  { id:"o1", platform:"Instagram", post:"Pune Real Estate Market Report Q1 2026", user:"@rajesh_kumar92", comment:"Amazing content! Really helpful for first time buyers like me. Can you do one for Mumbai too?", sentiment:"positive", time:"2h ago", replied:false },
  { id:"o2", platform:"Instagram", post:"Pune Real Estate Market Report Q1 2026", user:"@priya_nair_", comment:"These prices are too high for middle class families. Not helpful at all.", sentiment:"negative", time:"3h ago", replied:false },
  { id:"o3", platform:"YouTube",   post:"Top 5 Dubai Investment Hotspots 2026", user:"NRI_Investor_88", comment:"Great video! What about Ras Al Khaimah? I heard it has better ROI now.", sentiment:"positive", time:"5h ago", replied:true, reply:"Thank you! Great suggestion — we'll cover RAK in our next video. Stay tuned!" },
  { id:"o4", platform:"Facebook",  post:"Interior Design Trends 2026", user:"Meena Sharma", comment:"Spam link — click here to win free furniture!!!", sentiment:"negative", time:"6h ago", replied:false, flagged:true },
  { id:"o5", platform:"LinkedIn",  post:"How Square Connect Helps Agents", user:"Vikram Desai", comment:"Really insightful. The agent network feature sounds promising. Would love a demo.", sentiment:"positive", time:"8h ago", replied:false },
  { id:"o6", platform:"Instagram", post:"NRI Investment Guide", user:"@sunita.reddy", comment:"The information is okay but the video quality could be better.", sentiment:"neutral", time:"10h ago", replied:false },
  { id:"o7", platform:"YouTube",   post:"Interior Design Trends 2026", user:"DesignLover2024", comment:"Why is this showing up in my feed? Not relevant to me at all.", sentiment:"negative", time:"1d ago", replied:false },
  { id:"o8", platform:"Facebook",  post:"Pune Real Estate Market Report", user:"Arjun Mehta", comment:"Perfect timing! We were just looking at properties in Pune. Can we schedule a call?", sentiment:"positive", time:"1d ago", replied:true, reply:"Hi Arjun! We'd love to help. Please DM us or call 1800-XXX-XXXX and our team will assist you!" },
];

const SENTIMENT_CONFIG = {
  positive: { icon: <ThumbsUp size={12}/>, bg: "bg-green-100", text: "text-green-700", label: "Positive" },
  negative: { icon: <ThumbsDown size={12}/>, bg: "bg-red-100",   text: "text-red-700",   label: "Negative" },
  neutral:  { icon: <Star size={12}/>,      bg: "bg-gray-100",  text: "text-gray-600",  label: "Neutral" },
};

const PLATFORM_COLOR: Record<string, string> = {
  Instagram: "bg-pink-100 text-pink-700",
  Facebook:  "bg-blue-100 text-blue-700",
  YouTube:   "bg-red-100 text-red-700",
  LinkedIn:  "bg-indigo-100 text-indigo-700",
};

const AI_REPLIES: Record<string, string> = {
  positive: "Thank you so much for your kind words! We're thrilled this was helpful. Do follow us for more insights on real estate. 🏡",
  negative: "We're sorry to hear this didn't meet your expectations. We'd love to improve — could you share more details? Feel free to DM us.",
  neutral:  "Thank you for your feedback! We're always looking to improve. Stay tuned for more content. 😊",
};

export default function ORMPage() {
  const [platform,  setPlatform]  = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [replyText, setReplyText] = useState<Record<string,string>>({});
  const [replying,  setReplying]  = useState<string|null>(null);
  const [deleted,   setDeleted]   = useState<string[]>([]);

  const filtered = MOCK_COMMENTS.filter(c =>
    !deleted.includes(c.id) &&
    (platform  === "all" || c.platform.toLowerCase()  === platform) &&
    (sentiment === "all" || c.sentiment === sentiment)
  );

  const positive = MOCK_COMMENTS.filter(c => c.sentiment === "positive").length;
  const negative = MOCK_COMMENTS.filter(c => c.sentiment === "negative").length;
  const flagged  = MOCK_COMMENTS.filter(c => (c as any).flagged).length;

  function suggestReply(id: string, sent: string) {
    setReplyText(prev => ({ ...prev, [id]: AI_REPLIES[sent] ?? AI_REPLIES.neutral }));
    setReplying(id);
  }

  return (
    <>
      <Header title="ORM — Online Reputation Management" subtitle="Monitor and respond to comments across all platforms" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{positive}</p>
          <p className="text-xs text-gray-500 mt-0.5">Positive comments</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{negative}</p>
          <p className="text-xs text-gray-500 mt-0.5">Negative comments</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{flagged}</p>
          <p className="text-xs text-gray-500 mt-0.5">Flagged / Spam</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mt-5">
        <Select value={platform}  onChange={e => setPlatform(e.target.value)}  options={PLATFORMS}  className="w-44" />
        <Select value={sentiment} onChange={e => setSentiment(e.target.value)} options={SENTIMENTS} className="w-40" />
      </div>

      {/* Comments */}
      <div className="mt-4 space-y-3">
        {filtered.map(comment => {
          const sent   = SENTIMENT_CONFIG[comment.sentiment as keyof typeof SENTIMENT_CONFIG];
          const isOpen = replying === comment.id;

          return (
            <Card key={comment.id} className={cn("p-4", (comment as any).flagged && "border-amber-200 bg-amber-50/30")}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <MessageSquare size={14} className="text-gray-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gray-900">{comment.user}</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", PLATFORM_COLOR[comment.platform])}>{comment.platform}</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5", sent.bg, sent.text)}>
                      {sent.icon} {sent.label}
                    </span>
                    {(comment as any).flagged && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-0.5">
                        <AlertTriangle size={10}/> Spam/Flagged
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto">{comment.time}</span>
                  </div>

                  <p className="text-xs text-gray-600 mb-1">On: <span className="text-gray-700 font-medium">{comment.post}</span></p>
                  <p className="text-sm text-gray-800">{comment.comment}</p>

                  {/* Existing reply */}
                  {comment.replied && comment.reply && (
                    <div className="mt-2 pl-3 border-l-2 border-accent-200 bg-accent-50/50 rounded-r-lg p-2">
                      <p className="text-[10px] font-semibold text-accent-600 mb-0.5">Your reply</p>
                      <p className="text-xs text-gray-700">{comment.reply}</p>
                    </div>
                  )}

                  {/* Reply box */}
                  {isOpen && (
                    <div className="mt-3">
                      <textarea
                        rows={2}
                        value={replyText[comment.id] ?? ""}
                        onChange={e => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                        placeholder="Write your reply..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setReplying(null)} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button className="text-xs bg-accent-500 text-white px-3 py-1.5 rounded-lg hover:bg-accent-600 flex items-center gap-1">
                          <Send size={11}/> Send Reply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!isOpen && (
                    <div className="flex gap-2 mt-3">
                      {!comment.replied && (
                        <>
                          <button onClick={() => setReplying(comment.id)}
                            className="text-[11px] border border-gray-200 px-2.5 py-1 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                            <Reply size={10}/> Reply
                          </button>
                          <button onClick={() => suggestReply(comment.id, comment.sentiment)}
                            className="text-[11px] bg-accent-50 border border-accent-200 text-accent-600 px-2.5 py-1 rounded-lg hover:bg-accent-100 flex items-center gap-1">
                            ✨ AI Reply
                          </button>
                        </>
                      )}
                      {comment.replied && (
                        <span className="text-[11px] text-green-600 flex items-center gap-1">
                          <CheckCircle2 size={11}/> Replied
                        </span>
                      )}
                      <button onClick={() => setDeleted(prev => [...prev, comment.id])}
                        className="text-[11px] border border-red-200 text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-50 flex items-center gap-1 ml-auto">
                        <Trash2 size={10}/> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card className="p-12 text-center">
            <MessageSquare size={32} className="mx-auto text-gray-300 mb-3"/>
            <p className="text-sm text-gray-500">No comments found for the selected filters.</p>
          </Card>
        )}
      </div>
    </>
  );
}
