import { NextResponse } from "next/server";
import { getPlanEntitlements } from "@/lib/plans";
import { getAuthenticatedBoss } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedBoss(req);
    if (!user) {
      return NextResponse.json({ user: null, limits: getPlanEntitlements("FREE") });
    }
    return NextResponse.json({
      user,
      limits: getPlanEntitlements(user.plan),
    });
  } catch (err) {
    console.error("[auth/me] Failed:", err);
    return NextResponse.json({ error: "Unable to verify session." }, { status: 500 });
  }
}
