/**
 * GET /api/meta/debug
 * Deep diagnostic — tests stored page tokens for Instagram access.
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
  if (stored.length === 0) return NextResponse.json({ error: "no pages stored yet" });

  // Test ALL stored page tokens — check what each can see for Instagram
  const results = await Promise.all(stored.map(async (page) => {
    const token = page.pageAccessToken;

    const [
      igFieldRes,        // instagram_business_account field on page
      igAccountsRes,     // /instagram_accounts edge (older endpoint)
      tokenDebugRes,     // token permissions
    ] = await Promise.all([
      fetch(`${META_GRAPH}/${page.pageId}?fields=id,name,instagram_business_account&access_token=${token}`),
      fetch(`${META_GRAPH}/${page.pageId}/instagram_accounts?access_token=${token}`),
      fetch(`${META_GRAPH}/debug_token?input_token=${token}&access_token=${token}`),
    ]);

    const [igField, igAccounts, tokenDebug] = await Promise.all([
      igFieldRes.json(),
      igAccountsRes.json(),
      tokenDebugRes.json(),
    ]);

    return {
      page_name:               page.pageName,
      page_id:                 page.pageId,
      stored_ig_handle:        page.instagramHandle,
      ig_business_account_field: igField.instagram_business_account ?? igField.error ?? null,
      ig_accounts_edge:        igAccounts.data ?? igAccounts.error ?? null,
      token_scopes:            tokenDebug?.data?.scopes ?? tokenDebug?.error ?? null,
      token_type:              tokenDebug?.data?.type ?? null,
    };
  }));

  return NextResponse.json({ page_count: stored.length, results }, { status: 200 });
}
