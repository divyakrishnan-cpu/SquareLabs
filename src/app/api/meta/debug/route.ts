/**
 * GET /api/meta/debug
 *
 * Deep diagnostic — tests BOTH stored page tokens AND the user token
 * for Instagram access. This helps identify:
 *   1. Whether the user token has instagram_manage_insights scope
 *   2. Whether instagram_business_account field returns data
 *   3. Which token type is needed for each call
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db as prisma }              from "@/lib/db";

const META_GRAPH = "https://graph.facebook.com/v20.0";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const stored = await prisma.metaIntegration.findMany({ where: { userId: user.id } });
  if (stored.length === 0) return NextResponse.json({ error: "no pages stored yet — connect Meta first" });

  // Get the user token from the first row that has one
  const userToken = stored.find(p => p.userAccessToken)?.userAccessToken ?? null;

  // ── 1. Debug the USER token (if we have one) ─────────────────────────────
  let userTokenInfo: object | null = null;
  if (userToken) {
    try {
      const r = await fetch(
        `${META_GRAPH}/debug_token?input_token=${userToken}&access_token=${userToken}`
      );
      const d = await r.json();
      userTokenInfo = {
        type:    d?.data?.type ?? null,
        scopes:  d?.data?.scopes ?? null,
        expires: d?.data?.expires_at ?? null,
        is_valid: d?.data?.is_valid ?? null,
        error:   d?.error ?? null,
      };
    } catch (e) {
      userTokenInfo = { error: String(e) };
    }
  }

  // ── 2. Per-page: test BOTH page token AND user token for IG access ────────
  const results = await Promise.all(stored.map(async (page) => {
    const pageToken = page.pageAccessToken;

    // Test A: instagram_business_account field with PAGE token
    const [igFieldPage, igFieldUser, igAccountsEdge, tokenDebug] = await Promise.all([
      fetch(`${META_GRAPH}/${page.pageId}?fields=id,name,instagram_business_account&access_token=${pageToken}`)
        .then(r => r.json()).catch(e => ({ fetch_error: String(e) })),

      userToken
        ? fetch(`${META_GRAPH}/${page.pageId}?fields=id,name,instagram_business_account&access_token=${userToken}`)
            .then(r => r.json()).catch(e => ({ fetch_error: String(e) }))
        : Promise.resolve({ skipped: "no user token stored" }),

      fetch(`${META_GRAPH}/${page.pageId}/instagram_accounts?fields=id,username,name&access_token=${pageToken}`)
        .then(r => r.json()).catch(e => ({ fetch_error: String(e) })),

      fetch(`${META_GRAPH}/debug_token?input_token=${pageToken}&access_token=${pageToken}`)
        .then(r => r.json()).catch(e => ({ fetch_error: String(e) })),
    ]);

    return {
      page_name:                 page.pageName,
      page_id:                   page.pageId,
      stored_ig_id:              page.instagramAccountId,
      stored_ig_handle:          page.instagramHandle,
      has_user_token_stored:     !!page.userAccessToken,

      // Field with page token
      ig_field_via_page_token: {
        instagram_business_account: (igFieldPage as any).instagram_business_account ?? null,
        error: (igFieldPage as any).error ?? null,
      },

      // Field with user token (most reliable for IG)
      ig_field_via_user_token: {
        instagram_business_account: (igFieldUser as any).instagram_business_account ?? null,
        error: (igFieldUser as any).error ?? null,
        skipped: (igFieldUser as any).skipped ?? null,
      },

      // /instagram_accounts edge (older API)
      ig_accounts_edge: {
        data:  (igAccountsEdge as any).data  ?? null,
        error: (igAccountsEdge as any).error ?? null,
      },

      // Page token scopes
      page_token_info: {
        type:    (tokenDebug as any)?.data?.type    ?? null,
        scopes:  (tokenDebug as any)?.data?.scopes  ?? null,
        is_valid: (tokenDebug as any)?.data?.is_valid ?? null,
        error:   (tokenDebug as any)?.error ?? null,
      },
    };
  }));

  return NextResponse.json({
    page_count:      stored.length,
    has_user_token:  !!userToken,
    user_token_info: userTokenInfo,
    // Summary: how many pages have each IG discovery method working
    summary: {
      ig_via_page_token: results.filter(r => r.ig_field_via_page_token.instagram_business_account).length,
      ig_via_user_token: results.filter(r => r.ig_field_via_user_token.instagram_business_account).length,
      ig_via_edge:       results.filter(r => r.ig_accounts_edge.data && (r.ig_accounts_edge.data as any[]).length > 0).length,
      stored_ig_ids:     results.filter(r => r.stored_ig_id).length,
    },
    results,
  }, { status: 200 });
}
