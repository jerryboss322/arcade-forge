import { NextResponse } from "next/server";
import {
  SPACE_COOKIE_NAME,
  buildCookieOptions,
  grantSpaceAccessToken,
  parseCookieHeader,
  verifySecret,
} from "@/lib/auth";
import { db, ensureAuthSchema } from "@/lib/db";
import { normalizeWorkspaceSlug } from "@/lib/plans";
import { syncWorkspacePolicyCache } from "@/lib/workspacePolicy";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = normalizeWorkspaceSlug(rawSlug);
    const body = (await req.json().catch(() => null)) as { passcode?: unknown } | null;
    const passcode = typeof body?.passcode === "string" ? body.passcode.trim() : "";

    if (!slug || !passcode) {
      return NextResponse.json({ error: "Workspace slug and passcode are required." }, { status: 400 });
    }

    await ensureAuthSchema();
    const rows = (await db`
      SELECT
        w."slug",
        w."name",
        w."passcode",
        w."ownerId",
        u."plan" AS "ownerPlan"
      FROM "Workspace" w
      JOIN "User" u ON u."id" = w."ownerId"
      WHERE w."slug" = ${slug}
      LIMIT 1
    `) as Array<{
      slug: string;
      name: string;
      passcode: string | null;
      ownerId: string;
      ownerPlan: string;
    }>;

    const workspace = rows[0];
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    if (workspace.passcode && !verifySecret(passcode, workspace.passcode)) {
      return NextResponse.json({ error: "Incorrect workspace passcode." }, { status: 401 });
    }

    const policy = await syncWorkspacePolicyCache({
      slug: workspace.slug,
      name: workspace.name,
      ownerId: workspace.ownerId,
      planTier: workspace.ownerPlan,
      passcode: workspace.passcode,
    });

    const existingAccess = parseCookieHeader(req.headers.get("cookie"), SPACE_COOKIE_NAME);
    const nextToken = grantSpaceAccessToken(existingAccess, slug);

    const res = NextResponse.json({
      unlocked: true,
      slug: policy.slug,
      name: policy.name,
      planTier: policy.planTier,
      maxParticipants: policy.maxParticipants,
      allowScreenShare: policy.allowScreenShare,
    });
    res.cookies.set(SPACE_COOKIE_NAME, nextToken, buildCookieOptions(24 * 60 * 60));
    return res;
  } catch (err) {
    console.error("[workspaces/[slug]/unlock POST] Failed:", err);
    return NextResponse.json({ error: "Unable to verify workspace passcode." }, { status: 500 });
  }
}
