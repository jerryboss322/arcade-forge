import { NextResponse } from "next/server";
import { BOSS_COOKIE_NAME, buildCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(BOSS_COOKIE_NAME, "", buildCookieOptions(0));
  return res;
}
