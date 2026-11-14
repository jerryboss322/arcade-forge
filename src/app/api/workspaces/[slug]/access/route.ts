import { NextResponse } from "next/server";
import { normalizeWorkspaceSlug } from "@/lib/plans";
import { getBossSessionFromRequest, hasSpaceAccessInRequest } from "@/lib/requestAuth";
import { getSpacePolicy } from "@/lib/workspacePolicy";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = normalizeWorkspaceSlug(rawSlug);
    if (!slug) {
      return NextResponse.json({ error: "Invalid workspace slug." }, { status: 400 });
    }

    const policy = await getSpacePolicy(slug);
    if (!policy.isManaged) {
      return NextResponse.json({
        slug,
        isManaged: false,
        unlocked: true,
        requiresPasscode: false,
        planTier: policy.planTier,
        maxParticipants: policy.maxParticipants,
        allowScreenShare: policy.allowScreenShare,
        isOwner: false,
      });
    }

    const bossSession = getBossSessionFromRequest(req);
    const isOwner = Boolean(bossSession && bossSession.userId === policy.ownerId);
    const unlocked = !policy.requiresPasscode || isOwner || hasSpaceAccessInRequest(req, slug);

    return NextResponse.json({
      slug,
      name: policy.name,
      isManaged: true,
      unlocked,
      requiresPasscode: policy.requiresPasscode,
      planTier: policy.planTier,
      maxParticipants: policy.maxParticipants,
      allowScreenShare: policy.allowScreenShare,
      isOwner,
    });
  } catch (err) {
    console.error("[workspaces/[slug]/access GET] Failed:", err);
    return NextResponse.json({ error: "Unable to verify workspace access." }, { status: 503 });
  }
}
