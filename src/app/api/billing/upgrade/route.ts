import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { updateBossPlanTier } from "@/lib/billing";
import { PLAN_CONFIG } from "@/lib/plans";
import { getAuthenticatedBoss } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

function safeSecretEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  try {
    const boss = await getAuthenticatedBoss(req);
    if (!boss) {
      return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      activationCode?: unknown;
      action?: unknown;
    } | null;

    if (body?.action === "downgrade" && process.env.NODE_ENV !== "production") {
      await updateBossPlanTier(boss.id, "FREE");
      return NextResponse.json({ plan: "FREE", limits: PLAN_CONFIG.FREE });
    }

    // Option 1: Admin Pro Activation Key (`PRO_ACTIVATION_CODE`)
    const activationInput =
      typeof body?.activationCode === "string" ? body.activationCode.trim() : "";
    const configuredKey = process.env.PRO_ACTIVATION_CODE?.trim();
    if (activationInput) {
      if (configuredKey && safeSecretEqual(activationInput, configuredKey)) {
        await updateBossPlanTier(boss.id, "PRO");
        return NextResponse.json({
          plan: "PRO",
          limits: PLAN_CONFIG.PRO,
          activatedVia: "license_key",
        });
      }
      return NextResponse.json(
        { error: "Invalid Boss Pro activation key." },
        { status: 403 }
      );
    }

    // Option 2: Live Stripe Checkout Session when Stripe keys are configured
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    const stripePriceId = process.env.STRIPE_PRO_PRICE_ID?.trim();
    if (stripeKey && stripePriceId) {
      const origin =
        req.headers.get("origin") ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "https://arcade-forge-olive.vercel.app";

      const params = new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": stripePriceId,
        "line_items[0][quantity]": "1",
        client_reference_id: boss.id,
        customer_email: boss.email,
        success_url: `${origin}/admin?upgraded=1`,
        cancel_url: `${origin}/admin?canceled=1`,
      });

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const stripeData = (await stripeRes.json().catch(() => null)) as {
        url?: string;
        error?: { message?: string };
      } | null;

      if (!stripeRes.ok || !stripeData?.url) {
        console.error("[billing/upgrade] Stripe checkout failed:", stripeData?.error?.message);
        return NextResponse.json(
          { error: "Payment provider rejected checkout request." },
          { status: 502 }
        );
      }

      return NextResponse.json({ checkoutUrl: stripeData.url });
    }

    // Option 3: Non-production local test upgrade (never enabled in production)
    if (process.env.NODE_ENV !== "production" && body?.action === "test_upgrade") {
      await updateBossPlanTier(boss.id, "PRO");
      return NextResponse.json({
        plan: "PRO",
        limits: PLAN_CONFIG.PRO,
        activatedVia: "dev_sandbox",
      });
    }

    return NextResponse.json(
      {
        error:
          "Online card checkout requires STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID in Vercel env, or provide a valid PRO_ACTIVATION_CODE key.",
        code: "billing_not_configured",
      },
      { status: 501 }
    );
  } catch (err) {
    console.error("[billing/upgrade POST] Failed:", err);
    return NextResponse.json({ error: "Unable to process upgrade request." }, { status: 500 });
  }
}
