import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { hashSecret } from "@/lib/auth";
import { db, ensureAuthSchema } from "@/lib/db";
import {
  getPlanEntitlements,
  normalizeWorkspaceSlug,
  RESERVED_SPACE_SLUGS,
} from "@/lib/plans";
import { getAuthenticatedBoss } from "@/lib/requestAuth";
import { syncWorkspacePolicyCache } from "@/lib/workspacePolicy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const boss = await getAuthenticatedBoss(req);
    if (!boss) {
      return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    }

    const limits = getPlanEntitlements(boss.plan);
    const rows = (await db`
      SELECT
        "id",
        "slug",
        "name",
        "description",
        "planTier",
        "maxParticipants",
        "allowScreenShare",
        ("passcode" IS NOT NULL) AS "hasPasscode",
        "createdAt",
        "updatedAt"
      FROM "Workspace"
      WHERE "ownerId" = ${boss.id}
      ORDER BY "createdAt" DESC
    `) as Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      planTier: string;
      maxParticipants: number;
      allowScreenShare: boolean;
      hasPasscode: boolean;
      createdAt: string;
      updatedAt: string;
    }>;

    // Reflect Boss's current plan limits on every workspace returned
    const workspaces = rows.map((w) => ({
      ...w,
      planTier: boss.plan,
      maxParticipants: limits.maxParticipants,
      allowScreenShare: limits.allowScreenShare,
    }));

    return NextResponse.json({ user: boss, limits, workspaces });
  } catch (err) {
    console.error("[workspaces GET] Failed:", err);
    return NextResponse.json({ error: "Unable to load workspaces." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const boss = await getAuthenticatedBoss(req);
    if (!boss) {
      return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
      slug?: unknown;
      passcode?: unknown;
      description?: unknown;
    } | null;

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const slugInput = typeof body?.slug === "string" && body.slug.trim() ? body.slug : name;
    const slug = normalizeWorkspaceSlug(slugInput);
    const passcode = typeof body?.passcode === "string" ? body.passcode.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim().slice(0, 200) : null;

    if (name.length < 2 || name.length > 48) {
      return NextResponse.json(
        { error: "Workspace name must be between 2 and 48 characters." },
        { status: 400 }
      );
    }
    if (slug.length < 3 || RESERVED_SPACE_SLUGS.has(slug) || slug.startsWith("diag-room-")) {
      return NextResponse.json(
        { error: "Choose another slug (at least 3 characters; public demo slugs are reserved)." },
        { status: 400 }
      );
    }
    if (passcode.length < 4 || passcode.length > 64) {
      return NextResponse.json(
        { error: "Workspace passcode must be 4–64 characters." },
        { status: 400 }
      );
    }

    await ensureAuthSchema();

    const limits = getPlanEntitlements(boss.plan);
    const countRows = (await db`
      SELECT COUNT(*)::int AS "cnt"
      FROM "Workspace"
      WHERE "ownerId" = ${boss.id}
    `) as Array<{ cnt: number }>;
    const existingCount = Number(countRows[0]?.cnt ?? 0);

    if (existingCount >= limits.maxWorkspaces) {
      return NextResponse.json(
        {
          error:
            boss.plan === "FREE"
              ? "Free Starter plan is limited to 1 workspace. Upgrade to Boss Pro or remove your existing workspace."
              : `Workspace quota reached (${limits.maxWorkspaces}).`,
          code: "workspace_limit_reached",
        },
        { status: 403 }
      );
    }

    const conflict = (await db`
      SELECT "id" FROM "Workspace" WHERE "slug" = ${slug} LIMIT 1
    `) as Array<{ id: string }>;
    if (conflict.length > 0) {
      return NextResponse.json(
        { error: "That workspace URL slug is already taken. Try another one." },
        { status: 409 }
      );
    }

    const id = `ws_${crypto.randomBytes(10).toString("hex")}`;
    const passcodeHash = hashSecret(passcode);

    await db`
      INSERT INTO "Workspace" (
        "id", "slug", "name", "description", "passcode",
        "planTier", "maxParticipants", "allowScreenShare",
        "officeMap", "ownerId", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${slug}, ${name}, ${description}, ${passcodeHash},
        ${boss.plan}, ${limits.maxParticipants}, ${limits.allowScreenShare},
        '{}'::jsonb, ${boss.id}, NOW(), NOW()
      )
    `;

    await syncWorkspacePolicyCache({
      slug,
      name,
      ownerId: boss.id,
      planTier: boss.plan,
      passcode: passcodeHash,
    });

    return NextResponse.json(
      {
        workspace: {
          id,
          slug,
          name,
          description,
          planTier: boss.plan,
          maxParticipants: limits.maxParticipants,
          allowScreenShare: limits.allowScreenShare,
          hasPasscode: true,
        },
        invitePath: `/space/${slug}?code=${encodeURIComponent(passcode)}`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[workspaces POST] Failed:", err);
    return NextResponse.json({ error: "Unable to create workspace." }, { status: 500 });
  }
}
