import crypto from "node:crypto";
import { db, ensureAuthSchema } from "./db";
import { PlanTier, PLAN_CONFIG } from "./plans";
import { clearWorkspacePolicyCache } from "./workspacePolicy";

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!signatureHeader || !webhookSecret) return false;
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t" && v) timestamp = v;
    if (k === "v1" && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > 300) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "utf8");
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

/**
 * Updates a Boss/Admin account's plan tier and synchronizes all owned workspace limits
 * plus Upstash Redis room policies.
 */
export async function updateBossPlanTier(
  userId: string,
  plan: PlanTier,
  stripe?: { customerId?: string; subscriptionId?: string }
): Promise<void> {
  await ensureAuthSchema();
  const entitlements = PLAN_CONFIG[plan];

  await db`
    UPDATE "User"
    SET
      "plan" = ${plan},
      "planUpdatedAt" = NOW(),
      "stripeCustomerId" = COALESCE(${stripe?.customerId ?? null}, "stripeCustomerId"),
      "stripeSubscriptionId" = COALESCE(${stripe?.subscriptionId ?? null}, "stripeSubscriptionId"),
      "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `;

  const updatedSpaces = (await db`
    UPDATE "Workspace"
    SET
      "planTier" = ${plan},
      "maxParticipants" = ${entitlements.maxParticipants},
      "allowScreenShare" = ${entitlements.allowScreenShare},
      "updatedAt" = NOW()
    WHERE "ownerId" = ${userId}
    RETURNING "slug"
  `) as Array<{ slug: string }>;

  for (const row of updatedSpaces) {
    await clearWorkspacePolicyCache(row.slug);
  }
}
