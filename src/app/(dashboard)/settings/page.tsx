"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams }                            from "next/navigation";
import { Header }   from "@/components/layout/Header";
import { Card }     from "@/components/ui/Card";
import {
  CheckCircle2, XCircle, ExternalLink, RefreshCw,
  Plus, Loader2, AlertTriangle, Users, Image, Film,
  TrendingUp, Globe, Trash2, Youtube, Linkedin, Palette, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useChartColors,
  DEFAULT_CHART_COLORS,
  DEFAULT_BRAND_COLORS,
  BRAND_LABELS,
} from "@/hooks/useChartColors";

// ── Types ──────────────────────────────────────────────────────────────────

interface MetaAccount {
  id: string; pageId: string; pageName: string; vertical: string | null;
  instagramAccountId: string | null; instagramHandle: string | null;
  instagramName: string | null; profilePictureUrl: string | null;
  followersCount: number | null; followsCount: number | null;
  mediaCount: number | null; tokenExpiresAt: string | null;
}
interface YoutubeAccount {
  id: string; channelId: string; channelName: string | null;
  channelHandle: string | null; thumbnailUrl: string | null;
  subscriberCount: number | null; videoCount: number | null;
  viewCount: string | null; tokenExpiresAt: string | null;
}
interface LinkedinAccount {
  id: string; organizationId: string; name: string | null;
  vanityName: string | null; logoUrl: string | null;
  followerCount: number | null; tokenExpiresAt: string | null;
}

// ── Static config ──────────────────────────────────────────────────────────

const VERTICAL_LABELS: Record<string, string> = {
  SY_INDIA: "Square Yards India", SY_UAE: "Square Yards UAE",
  INTERIOR: "Interior Company",   SQUARE_CONNECT: "Square Connect", UM: "UM",
};

const VERTICALS = [
  { id: "SY_INDIA", label: "Square Yards India",
    accounts: { instagram: "@squareyards", facebook: "Square Yards India", linkedin: "Square Yards", youtube: "Square Yards" } },
  { id: "SY_UAE",   label: "Square Yards UAE",
    accounts: { instagram: "@squareyardsuae", facebook: "Square Yards UAE", linkedin: "", youtube: "" } },
  { id: "INTERIOR", label: "Interior Company",
    accounts: { instagram: "@interiorco", facebook: "", linkedin: "Interior Company", youtube: "" } },
  { id: "SQUARE_CONNECT", label: "Square Connect",
    accounts: { instagram: "@squareconnect", facebook: "", linkedin: "Square Connect", youtube: "" } },
  { id: "UM",       label: "UM",
    accounts: { instagram: "@um_realty", facebook: "", linkedin: "", youtube: "" } },
];

// ── Helper ─────────────────────────────────────────────────────────────────

function tokenDaysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function TokenBadge({ expiresAt }: { expiresAt: string | null }) {
  const days = tokenDaysLeft(expiresAt);
  if (days === null) return null;
  if (days < 0) return (
    <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
      <AlertTriangle size={8}/> Token expired
    </span>
  );
  if (days < 7) return (
    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
      <AlertTriangle size={8}/> Expires in {days}d
    </span>
  );
  return (
    <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
      Token valid · {days}d left
    </span>
  );
}

// ── Setup guide card ───────────────────────────────────────────────────────

function SetupGuide({ platform }: { platform: "youtube" | "linkedin" }) {
  const yt = platform === "youtube";
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 space-y-3">
      <p className="font-semibold">⚡ One-time setup required ({yt ? "3" : "4"} steps):</p>
      {yt ? (
        <ol className="space-y-1.5 list-none">
          <li>1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">console.cloud.google.com</a> → Create/select a project.</li>
          <li>2. Enable <strong>YouTube Data API v3</strong> and <strong>YouTube Analytics API</strong>.</li>
          <li>3. Go to <strong>APIs &amp; Services → Credentials → Create OAuth 2.0 Client ID</strong> (type: Web App).
            Add redirect URI: <code className="bg-amber-100 px-1 rounded text-[10px]">https://square-labs.vercel.app/api/youtube/callback</code></li>
          <li>4. Add to Vercel env vars:
            <code className="bg-amber-100 px-1 rounded text-[10px] ml-1">GOOGLE_CLIENT_ID</code> and
            <code className="bg-amber-100 px-1 rounded text-[10px] ml-1">GOOGLE_CLIENT_SECRET</code> → Redeploy.
          </li>
        </ol>
      ) : (
        <ol className="space-y-1.5 list-none">
          <li>1. Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline font-medium">linkedin.com/developers/apps</a> → Create app.</li>
          <li>2. Under <strong>Auth</strong>, add redirect URL: <code className="bg-amber-100 px-1 rounded text-[10px]">https://square-labs.vercel.app/api/linkedin/callback</code></li>
          <li>3. Under <strong>Products</strong>, request access to <strong>Marketing Developer Platform</strong> (enables company page management).</li>
          <li>4. Add to Vercel env vars:
            <code className="bg-amber-100 px-1 rounded text-[10px] ml-1">LINKEDIN_CLIENT_ID</code> and
            <code className="bg-amber-100 px-1 rounded text-[10px] ml-1">LINKEDIN_CLIENT_SECRET</code> → Redeploy.
          </li>
        </ol>
      )}
    </div>
  );
}

// ── Inner component ────────────────────────────────────────────────────────

function SettingsInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"integrations" | "accounts" | "sync" | "appearance">("integrations");
  const {
    chartColors, brandColors, hydrated,
    updateChartColor, updateBrandColor,
    resetAll, resetChartColors, resetBrandColors,
  } = useChartColors();

  // Meta
  const [metaAccounts,  setMetaAccounts]  = useState<MetaAccount[]>([]);
  const [loadingMeta,   setLoadingMeta]   = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [resettingMeta, setResettingMeta] = useState(false);

  // YouTube
  const [ytAccounts,    setYtAccounts]    = useState<YoutubeAccount[]>([]);
  const [loadingYt,     setLoadingYt]     = useState(true);
  const [disconnectingYt, setDisconnectingYt] = useState<string | null>(null);

  // LinkedIn
  const [liAccounts,    setLiAccounts]    = useState<LinkedinAccount[]>([]);
  const [loadingLi,     setLoadingLi]     = useState(true);
  const [disconnectingLi, setDisconnectingLi] = useState<string | null>(null);

  // Sync tab
  const [syncAccount,   setSyncAccount]   = useState<MetaAccount | null>(null);
  const [syncData,      setSyncData]      = useState<{ overview: any; posts: any[]; audience: any[]; stories: any[] } | null>(null);
  const [syncLoading,   setSyncLoading]   = useState(false);
  const [syncError,     setSyncError]     = useState<string | null>(null);

  const successFlag = searchParams.get("success");
  const errorFlag   = searchParams.get("error");
  const pagesCount  = searchParams.get("pages");
  const igCount     = searchParams.get("ig");
  const ytChannels  = searchParams.get("channels");

  // ── Fetch functions ──────────────────────────────────────────────────────

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const res  = await fetch("/api/meta/accounts");
      const data = await res.json();
      setMetaAccounts(data.accounts ?? []);
    } catch { setMetaAccounts([]); }
    finally  { setLoadingMeta(false); }
  }, []);

  const fetchYt = useCallback(async () => {
    setLoadingYt(true);
    try {
      const res  = await fetch("/api/youtube/accounts");
      const data = await res.json();
      setYtAccounts(data.accounts ?? []);
    } catch { setYtAccounts([]); }
    finally  { setLoadingYt(false); }
  }, []);

  const fetchLi = useCallback(async () => {
    setLoadingLi(true);
    try {
      const res  = await fetch("/api/linkedin/accounts");
      const data = await res.json();
      setLiAccounts(data.accounts ?? []);
    } catch { setLiAccounts([]); }
    finally  { setLoadingLi(false); }
  }, []);

  useEffect(() => { fetchMeta(); fetchYt(); fetchLi(); }, [fetchMeta, fetchYt, fetchLi]);
  useEffect(() => { if (successFlag === "meta_connected") setActiveTab("sync"); }, [successFlag]);

  // ── Disconnect handlers ──────────────────────────────────────────────────

  async function disconnectMeta(pageId: string) {
    setDisconnecting(pageId);
    try {
      await fetch("/api/meta/accounts", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      setMetaAccounts(prev => prev.filter(a => a.pageId !== pageId));
    } finally { setDisconnecting(null); }
  }

  async function resetAllMeta() {
    if (!confirm("This will remove ALL Facebook/Instagram connections. You'll need to reconnect. Continue?")) return;
    setResettingMeta(true);
    try {
      await fetch("/api/meta/reset", { method: "POST" });
      setMetaAccounts([]);
    } finally { setResettingMeta(false); }
  }

  async function disconnectYt(channelId: string) {
    setDisconnectingYt(channelId);
    try {
      await fetch("/api/youtube/accounts", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      setYtAccounts(prev => prev.filter(a => a.channelId !== channelId));
    } finally { setDisconnectingYt(null); }
  }

  async function disconnectLi(organizationId: string) {
    setDisconnectingLi(organizationId);
    try {
      await fetch("/api/linkedin/accounts", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      setLiAccounts(prev => prev.filter(a => a.organizationId !== organizationId));
    } finally { setDisconnectingLi(null); }
  }

  // ── Sync data ────────────────────────────────────────────────────────────

  async function loadSyncData(account: MetaAccount) {
    if (!account.instagramAccountId) return;
    setSyncAccount(account); setSyncData(null); setSyncError(null); setSyncLoading(true);
    const qp = `?accountId=${account.instagramAccountId}`;
    try {
      const [ovRes, postsRes, audRes, storiesRes] = await Promise.all([
        fetch(`/api/meta/instagram/overview${qp}`),
        fetch(`/api/meta/instagram/posts${qp}`),
        fetch(`/api/meta/instagram/audience${qp}`),
        fetch(`/api/meta/instagram/stories${qp}`),
      ]);
      const [ov, posts, aud, stories] = await Promise.all([
        ovRes.json(), postsRes.json(), audRes.json(), storiesRes.json(),
      ]);
      setSyncData({ overview: ov.profile, posts: posts.posts ?? [], audience: aud.audience ?? [], stories: stories.stories ?? [] });
    } catch (e) { setSyncError(String(e)); }
    finally { setSyncLoading(false); }
  }

  const hasMetaAccounts = metaAccounts.length > 0;
  const hasYtAccounts   = ytAccounts.length > 0;
  const hasLiAccounts   = liAccounts.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Header title="Settings" subtitle="Manage your social media integrations and account connections" />

      {/* ── OAuth result banners ── */}
      {successFlag === "meta_connected" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-green-700">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold">Facebook &amp; Instagram connected!</p>
            <p className="text-xs text-green-600 mt-0.5">
              {pagesCount ?? "0"} Facebook Pages and {igCount ?? "0"} Instagram accounts synced.
            </p>
          </div>
        </div>
      )}
      {successFlag === "youtube_connected" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-green-700">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold">YouTube connected!</p>
            <p className="text-xs text-green-600 mt-0.5">{ytChannels ?? "0"} channel(s) synced successfully.</p>
          </div>
        </div>
      )}
      {successFlag === "linkedin_connected" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-green-700">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold">LinkedIn connected!</p>
            <p className="text-xs text-green-600 mt-0.5">{pagesCount ?? "0"} company page(s) synced.</p>
          </div>
        </div>
      )}
      {errorFlag && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
          <div>
            {errorFlag === "meta_no_pages" ? (
              <>
                <p className="font-semibold">Connected but no pages found.</p>
                <p className="text-xs text-red-500 mt-1">Make sure <strong>business_management</strong> scope is approved in your Meta App and your Facebook account has Admin access on at least one page.</p>
              </>
            ) : errorFlag === "youtube_no_channels" ? (
              <>
                <p className="font-semibold">YouTube connected but no channels found.</p>
                <p className="text-xs text-red-500 mt-1">Ensure the Google account you used has YouTube channels linked to it.</p>
              </>
            ) : errorFlag === "linkedin_no_pages" ? (
              <>
                <p className="font-semibold">LinkedIn connected but no company pages found.</p>
                <p className="text-xs text-red-500 mt-1">You need to be an Admin of at least one LinkedIn Company Page, and the <strong>Marketing Developer Platform</strong> product must be approved in your LinkedIn app.</p>
              </>
            ) : (
              <>
                <p className="font-semibold">Connection failed ({errorFlag}).</p>
                <p className="text-xs text-red-500 mt-1">Please try again or check your app configuration.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mt-4 w-fit">
        {[
          { key: "integrations", label: "Platform Integrations" },
          { key: "accounts",     label: "Vertical Accounts" },
          { key: "sync",         label: `Synced Data${hasMetaAccounts ? ` (${metaAccounts.length})` : ""}` },
          { key: "appearance",   label: "🎨 Appearance" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === tab.key ? "bg-white text-accent-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* INTEGRATIONS TAB                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "integrations" && (
        <div className="mt-5 space-y-4">

          {/* ── Meta (Instagram + Facebook) ────────────────────────────── */}
          <Card className="p-5 border-pink-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-gradient-to-br from-pink-500 to-purple-600">
                📸
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm">Instagram &amp; Facebook</h3>
                  {loadingMeta ? (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Loader2 size={9} className="animate-spin"/> Checking…
                    </span>
                  ) : hasMetaAccounts ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={9}/> {metaAccounts.length} page{metaAccounts.length > 1 ? "s" : ""} connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      <XCircle size={9}/> Not connected
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  One click connects <strong>all brands</strong> under your Square Yards Business Portfolio.
                  SquareLabs auto-detects each brand from the page name.
                </p>

                {/* Connected pages list */}
                {!loadingMeta && hasMetaAccounts && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Connected Pages</p>
                    <div className="space-y-2">
                      {metaAccounts.map(acc => {
                        const brandLabel = acc.vertical ? (VERTICAL_LABELS[acc.vertical] ?? acc.vertical) : "Other";
                        return (
                          <div key={acc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                            {acc.profilePictureUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={acc.profilePictureUrl} alt={acc.instagramHandle ?? ""}
                                className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"/>
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(acc.instagramHandle ?? acc.pageName ?? "?")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-semibold text-gray-800">
                                  {acc.instagramHandle ? `@${acc.instagramHandle}` : acc.pageName}
                                </p>
                                <span className="text-[10px] bg-accent-50 text-accent-700 px-1.5 py-0.5 rounded-full font-medium">{brandLabel}</span>
                                <TokenBadge expiresAt={acc.tokenExpiresAt}/>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {acc.pageName && acc.instagramHandle && (
                                  <span className="text-[10px] text-gray-400">FB: {acc.pageName}</span>
                                )}
                                {acc.followersCount != null && (
                                  <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                    <Users size={8}/> {acc.followersCount.toLocaleString()}
                                  </span>
                                )}
                                {!acc.instagramAccountId && (
                                  <span className="text-[10px] text-gray-400 italic">No IG Business account linked</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              {acc.instagramAccountId && (
                                <button onClick={() => { setActiveTab("sync"); loadSyncData(acc); }}
                                  className="text-[10px] text-accent-600 border border-accent-200 px-2 py-1 rounded-lg hover:bg-accent-50 flex items-center gap-1">
                                  <TrendingUp size={9}/> Data
                                </button>
                              )}
                              <button onClick={() => disconnectMeta(acc.pageId)} disabled={disconnecting === acc.pageId}
                                className="text-[10px] text-red-500 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50">
                                {disconnecting === acc.pageId ? <Loader2 size={9} className="animate-spin"/> : "Remove"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Setup tip when not connected */}
                {!hasMetaAccounts && !loadingMeta && (
                  <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                    <p className="font-semibold mb-1">⚡ Quick setup (3 steps):</p>
                    <p className="mb-0.5">1. Add <code className="bg-amber-100 px-1 rounded">META_APP_ID</code> &amp; <code className="bg-amber-100 px-1 rounded">META_APP_SECRET</code> to Vercel env vars.</p>
                    <p className="mb-0.5">2. In your Meta App → Facebook Login → Settings, add redirect URI: <code className="bg-amber-100 px-1 rounded text-[10px]">https://square-labs.vercel.app/api/meta/callback</code></p>
                    <p>3. Click Connect and <strong>select ALL pages</strong> from the Square Yards portfolio.</p>
                  </div>
                )}

                {!loadingMeta && (
                  <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    <p className="font-semibold mb-1">💡 When the Facebook dialog opens:</p>
                    <p>Click <strong>"Select all Pages"</strong> to connect all brands in one go. All selected pages are stored in a single connection.</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 flex-wrap items-center">
                  <a href="/api/meta/connect"
                    className="inline-flex items-center gap-2 text-[11px] bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold shadow-sm">
                    {hasMetaAccounts ? <><RefreshCw size={11}/> Reconnect All Brands</> : <><Plus size={11}/> Connect All Brands</>}
                  </a>
                  {hasMetaAccounts && (
                    <button onClick={fetchMeta}
                      className="inline-flex items-center gap-1.5 text-[11px] border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50">
                      <RefreshCw size={10}/> Refresh
                    </button>
                  )}
                  {hasMetaAccounts && (
                    <button onClick={resetAllMeta} disabled={resettingMeta}
                      className="inline-flex items-center gap-1.5 text-[11px] border border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50">
                      {resettingMeta ? <Loader2 size={10} className="animate-spin"/> : <Trash2 size={10}/>}
                      Reset All Connections
                    </button>
                  )}
                </div>
                {hasMetaAccounts && (
                  <p className="text-[10px] text-gray-400 mt-2">Token lasts 60 days. Reconnect before expiry to renew.</p>
                )}
              </div>
            </div>
          </Card>

          {/* ── YouTube ─────────────────────────────────────────────────── */}
          <Card className="p-5 border-red-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-600">
                <Youtube size={20} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm">YouTube</h3>
                  {loadingYt ? (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Loader2 size={9} className="animate-spin"/> Checking…
                    </span>
                  ) : hasYtAccounts ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={9}/> {ytAccounts.length} channel{ytAccounts.length > 1 ? "s" : ""} connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      <XCircle size={9}/> Not connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Connect YouTube channels via Google OAuth to track subscribers, views, and video performance across all Square Yards brands.
                </p>

                {/* Connected channels */}
                {!loadingYt && hasYtAccounts && (
                  <div className="mb-4 space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Connected Channels</p>
                    {ytAccounts.map(ch => (
                      <div key={ch.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        {ch.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ch.thumbnailUrl} alt={ch.channelName ?? ""} className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"/>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <Youtube size={16} className="text-red-600"/>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold text-gray-800">{ch.channelName ?? ch.channelId}</p>
                            {ch.channelHandle && <span className="text-[10px] text-gray-400">@{ch.channelHandle}</span>}
                            <TokenBadge expiresAt={ch.tokenExpiresAt}/>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {ch.subscriberCount != null && (
                              <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                <Users size={8}/> {ch.subscriberCount.toLocaleString()} subscribers
                              </span>
                            )}
                            {ch.videoCount != null && (
                              <span className="text-[10px] text-gray-500">{ch.videoCount.toLocaleString()} videos</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => disconnectYt(ch.channelId)} disabled={disconnectingYt === ch.channelId}
                          className="text-[10px] text-red-500 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 shrink-0">
                          {disconnectingYt === ch.channelId ? <Loader2 size={9} className="animate-spin"/> : "Remove"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Setup guide when not connected */}
                {!loadingYt && !hasYtAccounts && <SetupGuide platform="youtube"/>}

                <div className="flex gap-2 flex-wrap mt-4">
                  <a href="/api/youtube/connect"
                    className="inline-flex items-center gap-2 text-[11px] bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold shadow-sm">
                    {hasYtAccounts ? <><RefreshCw size={11}/> Reconnect YouTube</> : <><Plus size={11}/> Connect YouTube Channels</>}
                  </a>
                  {hasYtAccounts && (
                    <button onClick={fetchYt}
                      className="inline-flex items-center gap-1.5 text-[11px] border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50">
                      <RefreshCw size={10}/> Refresh
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* ── LinkedIn ─────────────────────────────────────────────────── */}
          <Card className="p-5 border-blue-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-700">
                <Linkedin size={20} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm">LinkedIn</h3>
                  {loadingLi ? (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Loader2 size={9} className="animate-spin"/> Checking…
                    </span>
                  ) : hasLiAccounts ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={9}/> {liAccounts.length} page{liAccounts.length > 1 ? "s" : ""} connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      <XCircle size={9}/> Not connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Connect LinkedIn Company Pages via OAuth to manage posts and analytics for Square Yards, Interior Company, and other brands.
                </p>

                {/* Connected pages */}
                {!loadingLi && hasLiAccounts && (
                  <div className="mb-4 space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Connected Pages</p>
                    {liAccounts.map(page => (
                      <div key={page.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        {page.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={page.logoUrl} alt={page.name ?? ""} className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0"/>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <Linkedin size={16} className="text-blue-700"/>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold text-gray-800">{page.name ?? page.organizationId}</p>
                            {page.vanityName && (
                              <a href={`https://linkedin.com/company/${page.vanityName}`} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                                <ExternalLink size={8}/> linkedin.com/company/{page.vanityName}
                              </a>
                            )}
                            <TokenBadge expiresAt={page.tokenExpiresAt}/>
                          </div>
                          {page.followerCount != null && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                              <Users size={8}/> {page.followerCount.toLocaleString()} followers
                            </span>
                          )}
                        </div>
                        <button onClick={() => disconnectLi(page.organizationId)} disabled={disconnectingLi === page.organizationId}
                          className="text-[10px] text-red-500 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 shrink-0">
                          {disconnectingLi === page.organizationId ? <Loader2 size={9} className="animate-spin"/> : "Remove"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Setup guide when not connected */}
                {!loadingLi && !hasLiAccounts && <SetupGuide platform="linkedin"/>}

                <div className="flex gap-2 flex-wrap mt-4">
                  <a href="/api/linkedin/connect"
                    className="inline-flex items-center gap-2 text-[11px] bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-semibold shadow-sm">
                    {hasLiAccounts ? <><RefreshCw size={11}/> Reconnect LinkedIn</> : <><Plus size={11}/> Connect LinkedIn Pages</>}
                  </a>
                  {hasLiAccounts && (
                    <button onClick={fetchLi}
                      className="inline-flex items-center gap-1.5 text-[11px] border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50">
                      <RefreshCw size={10}/> Refresh
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* VERTICAL ACCOUNTS TAB                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
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
                    <input type="text" defaultValue={handle} placeholder={`@${platform}_handle`}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent-500"/>
                  </div>
                ))}
              </div>
              <button className="mt-3 text-[11px] bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700">Save</button>
            </Card>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SYNCED DATA TAB                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "sync" && (
        <div className="mt-5 space-y-5">
          {!hasMetaAccounts && !loadingMeta ? (
            <Card className="p-8 text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">No Meta accounts connected yet</p>
              <p className="text-xs text-gray-400 mb-4">Connect your Instagram Business Account to see real-time data here.</p>
              <a href="/api/meta/connect"
                className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 font-medium">
                <Plus size={12}/> Connect Instagram &amp; Facebook
              </a>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Choose account:</p>
                {metaAccounts.map(acc => (
                  <button key={acc.id} onClick={() => loadSyncData(acc)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                      syncAccount?.id === acc.id
                        ? "bg-accent-500 text-white border-accent-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}>
                    {acc.profilePictureUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={acc.profilePictureUrl} alt="" className="w-4 h-4 rounded-full"/>
                    )}
                    {acc.instagramHandle ? `@${acc.instagramHandle}` : acc.pageName}
                  </button>
                ))}
              </div>

              {!syncAccount && !syncLoading && (
                <Card className="p-6 text-center text-sm text-gray-400">Select an account above to load its synced data.</Card>
              )}
              {syncLoading && (
                <Card className="p-8 flex items-center justify-center gap-3 text-gray-500 text-sm">
                  <Loader2 size={18} className="animate-spin text-accent-500"/>
                  Fetching live data from Meta Graph API…
                </Card>
              )}
              {syncError && (
                <Card className="p-5 border-red-200 bg-red-50">
                  <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                    <AlertTriangle size={14}/> Failed to load data
                  </p>
                  <p className="text-xs text-red-500 mt-1">{syncError}</p>
                </Card>
              )}

              {syncData && syncAccount && (
                <div className="space-y-5">
                  <Card className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      {syncAccount.profilePictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={syncAccount.profilePictureUrl} alt="" className="w-14 h-14 rounded-full border-2 border-pink-200 object-cover"/>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                          {(syncData.overview?.username ?? "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 text-base">@{syncData.overview?.username ?? syncAccount.instagramHandle}</p>
                        <p className="text-xs text-gray-500">{syncData.overview?.biography ?? ""}</p>
                        {syncData.overview?.website && (
                          <a href={syncData.overview.website} target="_blank" rel="noreferrer"
                            className="text-xs text-accent-600 flex items-center gap-1 mt-0.5">
                            <Globe size={10}/> {syncData.overview.website}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{(syncData.overview?.followers_count ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><Users size={10}/> Followers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{(syncData.overview?.media_count ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><Image size={10}/> Posts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{(syncData.overview?.follows_count ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><TrendingUp size={10}/> Following</p>
                      </div>
                    </div>
                  </Card>

                  {syncData.posts.length > 0 && (
                    <Card className="overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                        <Film size={14} className="text-gray-400"/>
                        <h3 className="font-semibold text-gray-800 text-sm">Latest Posts &amp; Reels</h3>
                        <span className="text-[10px] text-gray-400 ml-auto">{syncData.posts.length} posts</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Caption</th>
                              <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Type</th>
                              <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Date</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Likes</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Comments</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Reach</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Saves</th>
                              <th className="px-4 py-2.5"/>
                            </tr>
                          </thead>
                          <tbody>
                            {syncData.posts.slice(0, 10).map((post: any) => (
                              <tr key={post.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                <td className="px-4 py-2.5 max-w-[200px]">
                                  <p className="truncate text-gray-800 font-medium">{post.caption ?? "—"}</p>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{post.media_type}</span>
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                                  {new Date(post.timestamp).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-gray-700">{(post.like_count ?? 0).toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">{(post.comments_count ?? 0).toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">{(post.insights?.reach ?? "—").toLocaleString?.() ?? "—"}</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">{(post.insights?.saved ?? "—").toLocaleString?.() ?? "—"}</td>
                                <td className="px-4 py-2.5">
                                  {post.permalink && (
                                    <a href={post.permalink} target="_blank" rel="noreferrer" className="text-accent-500 hover:text-accent-600">
                                      <ExternalLink size={11}/>
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {syncData.stories.length > 0 && (
                    <Card className="p-5">
                      <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <span>📱</span> Active Stories ({syncData.stories.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {syncData.stories.map((story: any) => (
                          <div key={story.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 mb-1.5">
                              {new Date(story.timestamp).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                            </p>
                            <div className="space-y-0.5 text-[10px]">
                              <p className="text-gray-600 flex justify-between"><span>Reach</span><span className="font-semibold">{story.insights?.reach ?? "—"}</span></p>
                              <p className="text-gray-600 flex justify-between"><span>Impressions</span><span className="font-semibold">{story.insights?.impressions ?? "—"}</span></p>
                              <p className="text-gray-600 flex justify-between"><span>Replies</span><span className="font-semibold">{story.insights?.replies ?? "—"}</span></p>
                              <p className="text-gray-600 flex justify-between"><span>Exits</span><span className="font-semibold">{story.insights?.exits ?? "—"}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {syncData.audience.length > 0 && (
                    <Card className="p-5">
                      <h3 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
                        <Users size={14}/> Audience Insights
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {syncData.audience.map((metric: any) => (
                          <div key={metric.name}>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 capitalize">
                              {metric.name.replace(/_/g, " ").replace("audience ", "")}
                            </p>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {Object.entries(metric.values?.[0]?.value ?? {})
                                .sort((a: any, b: any) => b[1] - a[1])
                                .slice(0, 10)
                                .map(([key, val]: any) => {
                                  const total = Object.values(metric.values?.[0]?.value ?? {}).reduce((s: any, v: any) => s + v, 0) as number;
                                  const pct   = total > 0 ? Math.round((val / total) * 100) : 0;
                                  return (
                                    <div key={key}>
                                      <div className="flex items-center justify-between text-[10px] text-gray-600 mb-0.5">
                                        <span>{key}</span>
                                        <span className="font-semibold">{val.toLocaleString()} ({pct}%)</span>
                                      </div>
                                      <div className="w-full bg-gray-100 rounded-full h-1">
                                        <div className="h-1 bg-accent-500 rounded-full" style={{ width:`${pct}%` }}/>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* APPEARANCE TAB                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "appearance" && (
        <div className="mt-5 space-y-5">

          {/* ── Competitor chart colors ─────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Palette size={15} className="text-gray-400"/>
                <h3 className="font-semibold text-gray-900 text-sm">Competitor Chart Colors</h3>
              </div>
              <button onClick={resetChartColors}
                className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">
                <RotateCcw size={10}/> Reset to defaults
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              These 8 colors are assigned sequentially to competitors in all charts across the Social Dashboard.
              Color 1 is always the first competitor listed, Color 2 the second, and so on.
            </p>

            {!hydrated ? (
              <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin"/> Loading…</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {chartColors.map((hex, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      Color {i + 1}
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Color preview + native picker */}
                      <label className="cursor-pointer group relative">
                        <div
                          className="w-9 h-9 rounded-xl border-2 border-white shadow-md ring-1 ring-gray-200 group-hover:ring-gray-400 transition-all"
                          style={{ background: hex }}
                        />
                        <input
                          type="color"
                          value={hex}
                          onChange={e => updateChartColor(i, e.target.value)}
                          className="sr-only"
                        />
                      </label>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={hex}
                          onChange={e => {
                            const v = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateChartColor(i, v.length === 7 ? v : hex);
                          }}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-accent-500"
                          maxLength={7}
                        />
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          default: {DEFAULT_CHART_COLORS[i]}
                        </p>
                      </div>
                    </div>
                    {hex !== DEFAULT_CHART_COLORS[i] && (
                      <button
                        onClick={() => updateChartColor(i, DEFAULT_CHART_COLORS[i])}
                        className="text-[9px] text-accent-500 hover:underline text-left">
                        ↺ reset
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Live preview swatches */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Preview</p>
              <div className="flex gap-1.5 flex-wrap">
                {chartColors.map((hex, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-6 h-6 rounded-md shadow-sm" style={{ background: hex }}/>
                    <span className="text-[8px] text-gray-400">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ── Brand / vertical colors ──────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Palette size={15} className="text-gray-400"/>
                <h3 className="font-semibold text-gray-900 text-sm">Brand Colors</h3>
              </div>
              <button onClick={resetBrandColors}
                className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">
                <RotateCcw size={10}/> Reset to defaults
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              One color per brand. Used for chart lines, tab highlights, and badges throughout the dashboard.
            </p>

            {!hydrated ? (
              <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin"/> Loading…</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {Object.entries(BRAND_LABELS).map(([key, label]) => {
                  const hex     = brandColors[key] ?? DEFAULT_BRAND_COLORS[key];
                  const isDefault = hex === DEFAULT_BRAND_COLORS[key];
                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">{label}</label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer group relative">
                          <div
                            className="w-9 h-9 rounded-xl border-2 border-white shadow-md ring-1 ring-gray-200 group-hover:ring-gray-400 transition-all"
                            style={{ background: hex }}
                          />
                          <input
                            type="color"
                            value={hex}
                            onChange={e => updateBrandColor(key, e.target.value)}
                            className="sr-only"
                          />
                        </label>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={hex}
                            onChange={e => {
                              const v = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateBrandColor(key, v.length === 7 ? v : hex);
                            }}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-accent-500"
                            maxLength={7}
                          />
                          <p className="text-[9px] text-gray-400 mt-0.5">default: {DEFAULT_BRAND_COLORS[key]}</p>
                        </div>
                      </div>
                      {!isDefault && (
                        <button
                          onClick={() => updateBrandColor(key, DEFAULT_BRAND_COLORS[key])}
                          className="text-[9px] text-accent-500 hover:underline text-left">
                          ↺ reset
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live preview */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Preview</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(BRAND_LABELS).map(([key, label]) => {
                  const hex = brandColors[key] ?? DEFAULT_BRAND_COLORS[key];
                  return (
                    <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-medium"
                      style={{ background: hex }}>
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* ── Reset all ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">Changes are saved automatically and apply immediately across the dashboard.</p>
            <button onClick={resetAll}
              className="inline-flex items-center gap-1.5 text-[11px] text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
              <RotateCcw size={10}/> Reset all to defaults
            </button>
          </div>

        </div>
      )}

    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}
