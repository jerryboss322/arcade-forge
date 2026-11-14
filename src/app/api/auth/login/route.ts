import { NextResponse } from "next/server";
import {
  BOSS_COOKIE_NAME,
  buildCookieOptions,
  createBossToken,
  verifySecret,
} from "@/lib/auth";
import { db, ensureAuthSchema } from "@/lib/db";
import { getPlanEntitlements, normalizePlanTier } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      email?: unknown;
      password?: unknown;
    } | null;

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    await ensureAuthSchema();
    const rows = (await db`
      SELECT "id", "email", "username", "passwordHash", "plan", "role"
      FROM "User"
      WHERE lower("email") = ${email}
      LIMIT 1
    `) as Array<{
      id: string;
      email: string;
      username: string;
      passwordHash: string | null;
      plan: string;
      role: string;
    }>;

    const user = rows[0];
    if (!user || !verifySecret(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const plan = normalizePlanTier(user.plan);
    const token = createBossToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        plan,
        role: user.role,
      },
      limits: getPlanEntitlements(plan),
    });
    res.cookies.set(BOSS_COOKIE_NAME, token, buildCookieOptions(7 * 24 * 60 * 60));
    return res;
  } catch (err) {
    console.error("[auth/login] Failed:", err);
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
