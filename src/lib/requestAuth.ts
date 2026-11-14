import {
  BOSS_COOKIE_NAME,
  SPACE_COOKIE_NAME,
  parseCookieHeader,
  verifyBossToken,
  hasSpaceAccessToken,
} from "./auth";
import { db, ensureAuthSchema } from "./db";
import { normalizePlanTier, PlanTier } from "./plans";

export interface AuthenticatedBoss {
  id: string;
  email: string;
  username: string;
  plan: PlanTier;
  role: string;
}

export function getBossSessionFromRequest(req: Request) {
  const token = parseCookieHeader(req.headers.get("cookie"), BOSS_COOKIE_NAME);
  return verifyBossToken(token);
}

export function hasSpaceAccessInRequest(req: Request, slug: string): boolean {
  const token = parseCookieHeader(req.headers.get("cookie"), SPACE_COOKIE_NAME);
  return hasSpaceAccessToken(token, slug);
}

export async function getAuthenticatedBoss(req: Request): Promise<AuthenticatedBoss | null> {
  const session = getBossSessionFromRequest(req);
  if (!session) return null;

  await ensureAuthSchema();
  const rows = (await db`
    SELECT "id", "email", "username", "plan", "role"
    FROM "User"
    WHERE "id" = ${session.userId}
    LIMIT 1
  `) as Array<{
    id: string;
    email: string;
    username: string;
    plan: string;
    role: string;
  }>;

  const user = rows[0];
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    plan: normalizePlanTier(user.plan),
    role: user.role,
  };
}
