import crypto from "node:crypto";

export const BOSS_COOKIE_NAME = "fs_boss_session";
export const SPACE_COOKIE_NAME = "fs_space_access";

const BOSS_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SPACE_ACCESS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_GRANTED_SLUGS = 20;

export interface BossSessionPayload {
  userId: string;
  email: string;
  username: string;
  exp: number;
}

interface SpaceAccessPayload {
  slugs: Record<string, number>;
}

export function getAuthSecret(env: Record<string, string | undefined> = process.env): string {
  const configured = env.AUTH_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production (min 16 characters).");
  }
  return "forgespace-local-dev-secret-do-not-use-in-prod";
}

export function hashSecret(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifySecret(plain: string, stored: string | null | undefined): boolean {
  if (!plain || !stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(plain, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function signPayload(payload: object, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifySignedPayload<T>(token: string | undefined, secret: string): T | null {
  if (!token) return null;
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0) return null;
  const encoded = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!encoded || !sig) return null;

  const expectedSig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function createBossToken(
  user: { id: string; email: string; username: string },
  now = Date.now(),
  secret = getAuthSecret()
): string {
  const payload: BossSessionPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    exp: now + BOSS_SESSION_TTL_MS,
  };
  return signPayload(payload, secret);
}

export function verifyBossToken(
  token: string | undefined,
  now = Date.now(),
  secret = getAuthSecret()
): BossSessionPayload | null {
  const payload = verifySignedPayload<BossSessionPayload>(token, secret);
  if (!payload || !payload.userId || typeof payload.exp !== "number") return null;
  if (payload.exp <= now) return null;
  return payload;
}

export function grantSpaceAccessToken(
  existingToken: string | undefined,
  slug: string,
  now = Date.now(),
  secret = getAuthSecret()
): string {
  const prev = verifySignedPayload<SpaceAccessPayload>(existingToken, secret);
  const entries = Object.entries(prev?.slugs ?? {}).filter(([, exp]) => typeof exp === "number" && exp > now);
  const nextSlugs: Record<string, number> = Object.fromEntries(entries);
  nextSlugs[slug] = now + SPACE_ACCESS_TTL_MS;

  // Cap token size cleanly if user visits many offices
  const trimmedEntries = Object.entries(nextSlugs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_GRANTED_SLUGS);

  return signPayload({ slugs: Object.fromEntries(trimmedEntries) }, secret);
}

export function hasSpaceAccessToken(
  token: string | undefined,
  slug: string,
  now = Date.now(),
  secret = getAuthSecret()
): boolean {
  const payload = verifySignedPayload<SpaceAccessPayload>(token, secret);
  const exp = payload?.slugs?.[slug];
  return typeof exp === "number" && exp > now;
}

export function parseCookieHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(eqIdx + 1).trim());
    }
  }
  return undefined;
}

export function buildCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
