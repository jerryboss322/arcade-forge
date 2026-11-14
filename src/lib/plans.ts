export type PlanTier = "FREE" | "PRO";

export interface PlanEntitlements {
  tier: PlanTier;
  label: string;
  priceLabel: string;
  maxWorkspaces: number;
  maxParticipants: number;
  allowScreenShare: boolean;
  features: string[];
}

export const PLAN_CONFIG: Record<PlanTier, PlanEntitlements> = {
  FREE: {
    tier: "FREE",
    label: "Free Starter (Limited)",
    priceLabel: "$0 / mo",
    maxWorkspaces: 1,
    maxParticipants: 4,
    allowScreenShare: false,
    features: [
      "1 Boss/Admin workspace with passworded invite link",
      "Up to 4 simultaneous coworkers per room",
      "P2P webcam, spatial mic audio & room chat",
      "3D & 2D interactive floorplans (no employee accounts required)",
    ],
  },
  PRO: {
    tier: "PRO",
    label: "Boss Pro Team",
    priceLabel: "$9 / mo flat",
    maxWorkspaces: 20,
    maxParticipants: 30,
    allowScreenShare: true,
    features: [
      "Up to 20 passworded workspaces — $0 per employee seat",
      "Up to 30 simultaneous team members per room",
      "HD screen sharing & Watch theater mode unlocked",
      "Instant password rotation & priority TURN relay support",
    ],
  },
};

export const RESERVED_SPACE_SLUGS = new Set([
  "acme-hq",
  "indie-studio",
  "indie-forge",
  "study-cafe",
  "hacker-den",
  "executive-floor",
  "wellness-retreat",
]);

export function normalizePlanTier(raw: unknown): PlanTier {
  return String(raw ?? "").toUpperCase() === "PRO" ? "PRO" : "FREE";
}

export function getPlanEntitlements(rawPlan: unknown): PlanEntitlements {
  return PLAN_CONFIG[normalizePlanTier(rawPlan)];
}

export function normalizeWorkspaceSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
