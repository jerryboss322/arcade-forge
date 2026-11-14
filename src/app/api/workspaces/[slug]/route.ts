import { NextResponse } from "next/server";
import { hashSecret } from "@/lib/auth";
import { db, ensureAuthSchema } from "@/lib/db";
import { normalizeWorkspaceSlug } from "@/lib/plans";
import { getAuthenticatedBoss } from "@/lib/requestAuth";
import { clearWorkspacePolicyCache, syncWorkspacePolicyCache } from "@/lib/workspacePolicy";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const boss = await getAuthenticatedBoss(req);
    if (!boss) {
      return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    }

    const { slug: rawSlug } = await context.params;
    const slug = normalizeWorkspaceSlug(rawSlug);
    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
      passcode?: unknown;
    } | null;

    await ensureAuthSchema();
    const rows = (await db`
      SELECT "id", "slug", "name", "passcode", "ownerId"
      FROM "Workspace"
      WHERE "slug" = ${slug}
      LIMIT 1
    `) as Array<{
      id: string;
      slug: string;
      name: string;
      passcode: string | null;
      ownerId: string;
    }>;

    const existing = rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    if (existing.ownerId !== boss.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const nextName =
      typeof body?.name === "string" && body.name.trim().length >= 2
        ? body.name.trim().slice(0, 48)
        : existing.name;

    const newPasscodePlain = typeof body?.passcode === "string" ? body.passcode.trim() : "";
    let nextPasscodeHash = existing.passcode;
    if (newPasscodePlain) {
      if (newPasscodePlain.length < 4 || newPasscodePlain.length > 64) {
        return NextResponse.json(
          { error: "Passcode must be 4–64 characters." },
          { status: 400 }
        );
      }
      nextPasscodeHash = hashSecret(newPasscodePlain);
    }

    await db`
      UPDATE "Workspace"
      SET "name" = ${nextName}, "passcode" = ${nextPasscodeHash}, "updatedAt" = NOW()
      WHERE "id" = ${existing.id}
    `;

    await syncWorkspacePolicyCache({
      slug: existing.slug,
      name: nextName,
      ownerId: boss.id,
      planTier: boss.plan,
      passcode: nextPasscodeHash,
    });

    return NextResponse.json({
      success: true,
      name: nextName,
      invitePath: newPasscodePlain
        ? `/space/${existing.slug}?code=${encodeURIComponent(newPasscodePlain)}`
        : undefined,
    });
  } catch (err) {
    console.error("[workspaces/[slug] PATCH] Failed:", err);
    return NextResponse.json({ error: "Unable to update workspace." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const boss = await getAuthenticatedBoss(req);
    if (!boss) {
      return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    }

    const { slug: rawSlug } = await context.params;
    const slug = normalizeWorkspaceSlug(rawSlug);
    await ensureAuthSchema();

    const rows = (await db`
      SELECT "id", "ownerId" FROM "Workspace" WHERE "slug" = ${slug} LIMIT 1
    `) as Array<{ id: string; ownerId: string }>;

    const existing = rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    if (existing.ownerId !== boss.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await db`DELETE FROM "Workspace" WHERE "id" = ${existing.id}`;
    await clearWorkspacePolicyCache(slug);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[workspaces/[slug] DELETE] Failed:", err);
    return NextResponse.json({ error: "Unable to delete workspace." }, { status: 500 });
  }
}
