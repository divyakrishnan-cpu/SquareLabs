"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams }                            from "next/navigation";
import { Header }   from "@/components/layout/Header";
import { Card }     from "@/components/ui/Card";
import {
  CheckCircle2, XCircle, ExternalLink, RefreshCw,
  Plus, Loader2, AlertTriangle, Users, Image, Film,
  TrendingUp, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface MetaAccount {
  id: string;
  pageId: string;
  pageName: string;
  vertical: string | null;
  instagramAccountId: string | null;
  instagramHandle: string | null;
  instagramName: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  tokenExpiresAt: string | null;
}

// ── Static integration config ─────────────────────────────────────────────

const INTEGRATIONS = [
  {
    id: "meta",
    name: "Instagram & Facebook",
    description:
      "Connect via Meta's official Graph API to retrieve followers, reach, impressions, post performance, audience demographics and story metrics.",
    icon: "📸",
    color: "bg-gradient-to-br from-pink-500 to-purple-600",
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

const VERTICAL_LABELS: Record<string, string> = {
  SY_INDIA: "Square Yards India", SY_UAE: "Square Yards UAE",
  INTERIOR: "Interior Company",   SQUARE_CONNECT: "Square Connect", UM: "UM",
};

// ── Helper: days until token expires ─────────────────────────────────────

function tokenDaysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  return days;
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ───────

function SettingsInner() {
  const searchParams = useSearchParams();
  const [activeTab,      setActiveTab]     = useState<"integrations" | "accounts" | "sync">("integrations");
  const [metaAccounts,   setMetaAccounts]  = useState<MetaAccount[]>([]);
  const [loadingMeta,    setLoadingMeta]   = useState(true);
  const [disconnecting,  setDisconnecting] = useState<string | null>(null);
  const [showSteps,      setShowSteps]     = useState(false);

  // Sync data state
  const [syncAccount,    setSyncAccount]   = useState<MetaAccount | null>(null);
  const [syncData,       setSyncData]      = useState<{
    overview: any; posts: any[]; audience: any[]; stories: any[];
  } | null>(null);
  const [syncLoading,    setSyncLoading]   = useState(false);
  const [syncError,      setSyncError]     = useState<string | null>(null);

  // Success / error banners from OAuth redirect
  const successFlag = searchParams.get("success");
  const errorFlag   = searchParams.get("error");
  const pagesCount  = searchParams.get("pages");
  const igCount     = searchParams.get("ig");

  // ── Fetch connected Meta accounts ────────────────────────────────────────

  const fetchMetaAccounts = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const res  = await fetch("/api/meta/accounts");
      const data = await res.json();
      setMetaAccounts(data.accounts ?? []);
    } catch {
      setMetaAccounts([]);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => { fetchMetaAccounts(); }, [fetchMetaAccounts]);

  // Auto-switch to Sync tab after successful connection
  useEffect(() => {
    if (successFlag === "meta_connected") setActiveTab("sync");
  }, [successFlag]);

  // ── Disconnect a Meta page ────────────────────────────────────────────────

  async function disconnect(pageId: string) {
    setDisconnecting(pageId);
    try {
      await fetch("/api/meta/accounts", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pageId }),
      });
      setMetaAccounts(prev => prev.filter(a => a.pageId !== pageId));
    } finally {
      setDisconnecting(null);
    }
  }

  // ── Pull sync data for a chosen account ──────────────────────────────────

  async function loadSyncData(account: MetaAccount) {
    if (!account.instagramAccountId) return;
    setSyncAccount(account);
    setSyncData(null);
    setSyncError(null);
    setSyncLoading(true);
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
      setSyncData({
        overview: ov.profile,
        posts:    posts.posts ?? [],
        audience: aud.audience ?? [],
        stories:  stories.stories ?? [],
      });
    } catch (e) {
      setSyncError(String(e));
    } finally {
      setSyncLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const hasMetaAccounts = metaAccounts.length > 0;

  return (
    <>
      <Header title="Settings" subtitle="Manage your social media integrations and account connections" />

      {/* OAuth result banners */}
      {successFlag === "meta_connected" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-green-700">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold">All brands connected successfully!</p>
            <p className="text-xs text-green-600 mt-0.5">
              {pagesCount ?? "0"} Facebook Pages and {igCount ?? "0"} Instagram Business Accounts are now synced.
              Their data is available in the <strong>Synced Data</strong> tab below.
            </p>
          </div>
        </div>
      )}
      {errorFlag && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0"/>
          Meta connection failed ({errorFlag}). Please try again or check your Meta App configuration.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mt-4 w-fit">
        {[
          { key: "integrations", label: "Platform Integrations" },
          { key: "accounts",     label: "Vertical Accounts" },
          { key: "sync",         label: `Synced Data${hasMetaAccounts ? ` (${metaAccounts.length})` : ""}` },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === tab.key
                ? "bg-white text-accent-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── INTEGRATIONS TAB ──────────────────────────────────────────────── */}
      {activeTab === "integrations" && (
        <div className="mt-5 space-y-4">

          {/* ── Meta card (Instagram + Facebook, real OAuth) ──── */}
          <Card className="p-5 border-pink-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-gradient-to-br from-pink-500 to-purple-600">
                📸
              </div>
              <div className="flex-1 min-w-0">

                {/* Header row */}
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
                  One click connects <strong>all brands</strong> under your Square Yards Business Portfolio —
                  Square Yards, Interior Company, Square Connect, Urban Money and more.
                  SquareLabs auto-detects each brand from the Page name.
                </p>

                {/* ── Connected: show pages grouped by brand ── */}
                {!loadingMeta && hasMetaAccounts && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Connected Pages</p>
                    <div className="space-y-2">
                      {metaAccounts.map(acc => {
                        const days         = tokenDaysLeft(acc.tokenExpiresAt);
                        const expiringSoon = days !== null && days < 7;
                        const brandLabel   = acc.vertical ? (VERTICAL_LABELS[acc.vertical] ?? acc.vertical) : "Other";
                        return (
                          <div key={acc.id}
                            className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                            {/* Avatar */}
                            {acc.profilePictureUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={acc.profilePictureUrl} alt={acc.instagramHandle ?? ""}
                                className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"/>
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(acc.instagramHandle ?? acc.pageName ?? "?")[0].toUpperCase()}
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-semibold text-gray-800">
                                  {acc.instagramHandle ? `@${acc.instagramHandle}` : acc.pageName}
                                </p>
                                <span className="text-[10px] bg-accent-50 text-accent-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {brandLabel}
                                </span>
                                {expiringSoon && (
                                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <AlertTriangle size={8}/> Token expires {days}d
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {acc.pageName && acc.instagramHandle && (
                                  <span className="text-[10px] text-gray-400">FB: {acc.pageName}</span>
                                )}
                                {acc.followersCount != null && (
                                  <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                    <Users size={8}/> {acc.followersCount.toLocaleString()} followers
                                  </span>
                                )}
                                {!acc.instagramAccountId && (
                                  <span className="text-[10px] text-gray-400 italic">No IG Business account linked</span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1.5 shrink-0">
                              {acc.instagramAccountId && (
                                <button
                                  onClick={() => { setActiveTab("sync"); loadSyncData(acc); }}
                                  className="text-[10px] text-accent-600 border border-accent-200 px-2 py-1 rounded-lg hover:bg-accent-50 flex items-center gap-1">
                                  <TrendingUp size={9}/> Data
                                </button>
                              )}
                              <button
                                onClick={() => disconnect(acc.pageId)}
                                disabled={disconnecting === acc.pageId}
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

                {/* ── How-to guide (collapsible) ── */}
                {!hasMetaAccounts && !loadingMeta && (
                  <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                    <p className="font-semibold mb-1">⚡ Quick setup (3 steps):</p>
                    <p className="mb-0.5">1. Make sure <code className="bg-amber-100 px-1 rounded">META_APP_ID</code> &amp; <code className="bg-amber-100 px-1 rounded">META_APP_SECRET</code> are in Vercel env vars.</p>
                    <p className="mb-0.5">2. In your Meta App → Facebook Login → Settings, add redirect URI: <code className="bg-amber-100 px-1 rounded text-[10px]">https://square-labs.vercel.app/api/meta/callback</code></p>
                    <p>3. Click the button below and when Facebook asks which pages to share — <strong>select ALL pages</strong> from your Square Yards portfolio.</p>
                  </div>
                )}

                {/* ── Important: Select ALL pages note ── */}
                {!loadingMeta && (
                  <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                      💡 When the Facebook dialog opens:
                    </p>
                    <p>
                      Facebook will ask <em>"Which pages do you want to share?"</em> — click{" "}
                      <strong className="text-blue-800">"Select all Pages"</strong> or manually tick every brand page
                      (Square Yards India, Square Yards UAE, Interior Company, Square Connect, Urban Money, etc.).
                      All selected pages are stored in one connection — you won&apos;t need to reconnect per brand.
                    </p>
                  </div>
                )}

                {/* ── Connect / Reconnect button ── */}
                <div className="flex gap-2 flex-wrap items-center">
                  <a href="/api/meta/connect"
                    className="inline-flex items-center gap-2 text-[11px] bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold shadow-sm">
                    {hasMetaAccounts ? (
                      <><RefreshCw size={11}/> Reconnect All Brands</>
                    ) : (
                      <><Plus size={11}/> Connect All Brands — Square Yards Portfolio</>
                    )}
                  </a>
                  {hasMetaAccounts && (
                    <button onClick={fetchMetaAccounts}
                      className="inline-flex items-center gap-1.5 text-[11px] border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50">
                      <RefreshCw size={10}/> Refresh
                    </button>
                  )}
                </div>

                {hasMetaAccounts && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    Token lasts 60 days. Click &quot;Reconnect All Brands&quot; before expiry to renew.
                  </p>
                )}

              </div>
            </div>
          </Card>

          {/* ── Other integrations ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTEGRATIONS.filter(i => i.id !== "meta").map(integration => (
              <Card key={integration.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", integration.color)}>
                    <span>{integration.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{integration.name}</h3>
                      {(integration as any).connected ? (
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
                    {(integration as any).connected && (integration as any).accounts?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Connected accounts</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(integration as any).accounts.map((acc: string) => (
                            <span key={acc} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{acc}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {(integration as any).connected ? (
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
        </div>
      )}

      {/* ── VERTICAL ACCOUNTS TAB ─────────────────────────────────────────── */}
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

      {/* ── SYNCED DATA TAB ───────────────────────────────────────────────── */}
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
              {/* Account selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Choose account:</p>
                {metaAccounts.map(acc => (
                  <button key={acc.id}
                    onClick={() => loadSyncData(acc)}
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

              {/* Prompt before selection */}
              {!syncAccount && !syncLoading && (
                <Card className="p-6 text-center text-sm text-gray-400">
                  Select an account above to load its synced data.
                </Card>
              )}

              {/* Loading state */}
              {syncLoading && (
                <Card className="p-8 flex items-center justify-center gap-3 text-gray-500 text-sm">
                  <Loader2 size={18} className="animate-spin text-accent-500"/>
                  Fetching live data from Meta Graph API…
                </Card>
              )}

              {/* Error state */}
              {syncError && (
                <Card className="p-5 border-red-200 bg-red-50">
                  <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                    <AlertTriangle size={14}/> Failed to load data
                  </p>
                  <p className="text-xs text-red-500 mt-1">{syncError}</p>
                </Card>
              )}

              {/* Synced data display */}
              {syncData && syncAccount && (
                <div className="space-y-5">

                  {/* Profile overview */}
                  <Card className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      {syncAccount.profilePictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={syncAccount.profilePictureUrl} alt=""
                          className="w-14 h-14 rounded-full border-2 border-pink-200 object-cover"/>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                          {(syncData.overview?.username ?? "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 text-base">
                          @{syncData.overview?.username ?? syncAccount.instagramHandle}
                        </p>
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
                        <p className="text-2xl font-bold text-gray-900">
                          {(syncData.overview?.followers_count ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><Users size={10}/> Followers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {(syncData.overview?.media_count ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><Image size={10}/> Posts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {(syncData.overview?.follows_count ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><TrendingUp size={10}/> Following</p>
                      </div>
                    </div>
                  </Card>

                  {/* Latest Posts */}
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
                              <th className="px-4 py-2.5"></th>
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
                                    <a href={post.permalink} target="_blank" rel="noreferrer"
                                      className="text-accent-500 hover:text-accent-600">
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

                  {/* Stories */}
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

                  {/* Audience */}
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
    </>
  );
}

// ── Default export — wraps inner component in Suspense ────────────────────
// Required because SettingsInner calls useSearchParams() which opts out of
// static prerendering and needs a Suspense boundary in Next.js 14.

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}
