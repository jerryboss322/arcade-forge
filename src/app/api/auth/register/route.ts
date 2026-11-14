import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  BOSS_COOKIE_NAME,
  buildCookieOptions,
  createBossToken,
  hashSecret,
} from "@/lib/auth";
import { db, ensureAuthSchema } from "@/lib/db";
import { PLAN_CONFIG } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      email?: unknown;
      username?: unknown;
      password?: unknown;
    } | null;

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid work email address." }, { status: 400 });
    }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3–24 characters using letters, numbers, or underscores." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await ensureAuthSchema();

    const existing = (await db`
      SELECT "id", "email", "username"
      FROM "User"
      WHERE lower("email") = ${email} OR lower("username") = ${username}
      LIMIT 1
    `) as Array<{ id: string; email: string; username: string }>;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An admin account with this email or username already exists." },
        { status: 409 }
      );
    }

    const userId = `boss_${crypto.randomBytes(10).toString("hex")}`;
    const passwordHash = hashSecret(password);

    await db`
      INSERT INTO "User" ("id", "email", "username", "passwordHash", "plan", "role", "createdAt", "updatedAt")
      VALUES (${userId}, ${email}, ${username}, ${passwordHash}, 'FREE', 'BOSS', NOW(), NOW())
    `;

    const token = createBossToken({ id: userId, email, username });
    const res = NextResponse.json(
      {
        user: { id: userId, email, username, plan: "FREE", role: "BOSS" },
        limits: PLAN_CONFIG.FREE,
      },
      { status: 201 }
    );
    res.cookies.set(BOSS_COOKIE_NAME, token, buildCookieOptions(7 * 24 * 60 * 60));
    return res;
  } catch (err) {
    console.error("[auth/register] Failed:", err);
    return NextResponse.json({ error: "Unable to create admin account." }, { status: 500 });
  }
}
