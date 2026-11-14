import { db, ensureAuthSchema } from "./db";
import { PlanTier, PLAN_CONFIG, RESERVED_SPACE_SLUGS, normalizePlanTier } from "./plans";
import {
  getCachedSpacePolicy,
  invalidateCachedSpacePolicy,
  setCachedSpacePolicy,
} from "./space/spaceStore";

export interface SpacePolicy {
  slug: string;
  isManaged: boolean;
  name?: string;
  ownerId?: string;
  planTier: PlanTier | "DEMO";
  maxParticipants: number;
  allowScreenShare: boolean;
  requiresPasscode: boolean;
}

export function extractSpaceSlug(channelOrSlug: string): string {
  const raw = channelOrSlug.trim().toLowerCase();
  return raw.startsWith("forgespace_") ? raw.slice("forgespace_".length) : raw;
}

export function defaultDemoPolicy(slug: string): SpacePolicy {
  return {
    slug,
    isManaged: false,
    planTier: "DEMO",
    maxParticipants: PLAN_CONFIG.FREE.maxParticipants,
    allowScreenShare: true,
    requiresPasscode: false,
  };
}

export async function syncWorkspacePolicyCache(workspace: {
  slug: string;
  name: string;
  ownerId: string;
  planTier: string;
  passcode: string | null;
}): Promise<SpacePolicy> {
  const tier = normalizePlanTier(workspace.planTier);
  const entitlements = PLAN_CONFIG[tier];
  const policy: SpacePolicy = {
    slug: workspace.slug,
    isManaged: true,
    name: workspace.name,
    ownerId: workspace.ownerId,
    planTier: tier,
    maxParticipants: entitlements.maxParticipants,
    allowScreenShare: entitlements.allowScreenShare,
    requiresPasscode: Boolean(workspace.passcode),
  };
  await setCachedSpacePolicy(workspace.slug, policy, 180);
  return policy;
}

export async function clearWorkspacePolicyCache(slug: string): Promise<void> {
  await invalidateCachedSpacePolicy(slug);
}

/**
 * Resolves room access policy from Redis cache first (zero Neon DB hits during calls),
 * falling back to Neon Postgres only on cache miss for non-reserved slugs.
 */
export async function getSpacePolicy(channelOrSlug: string): Promise<SpacePolicy> {
  const slug = extractSpaceSlug(channelOrSlug);

  const cached = await getCachedSpacePolicy<SpacePolicy>(slug);
  if (cached) {
    return cached;
  }

  if (RESERVED_SPACE_SLUGS.has(slug) || slug.startsWith("diag-room-")) {
    return defaultDemoPolicy(slug);
  }

  // Avoid live network Neon lookups during automated unit tests unless injected in cache
  if (process.env.VITEST || (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production")) {
    return defaultDemoPolicy(slug);
  }

  try {
    await ensureAuthSchema();
    const rows = (await db`
      SELECT
        w."slug",
        w."name",
        w."ownerId",
        w."passcode",
        u."plan" AS "ownerPlan"
      FROM "Workspace" w
      JOIN "User" u ON u."id" = w."ownerId"
      WHERE w."slug" = ${slug}
      LIMIT 1
    `) as Array<{
      slug: string;
      name: string;
      ownerId: string;
      passcode: string | null;
      ownerPlan: string;
    }>;

    const row = rows[0];
    if (!row) {
      const demo = defaultDemoPolicy(slug);
      await setCachedSpacePolicy(slug, demo, 60);
      return demo;
    }

    return await syncWorkspacePolicyCache({
      slug: row.slug,
      name: row.name,
      ownerId: row.ownerId,
      planTier: row.ownerPlan,
      passcode: row.passcode,
    });
  } catch (err) {
    console.warn(`[workspacePolicy] DB lookup failed for slug=${slug}:`, err);
    throw err;
  }
}
