import { NextResponse } from "next/server";
import { updateBossPlanTier, verifyStripeSignature } from "@/lib/billing";
import { db, ensureAuthSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook secret not configured." }, { status: 501 });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature");
  if (!verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    type?: string;
    data?: {
      object?: {
        client_reference_id?: string;
        customer?: string;
        subscription?: string;
        id?: string;
        status?: string;
      };
    };
  };

  const obj = event.data?.object;
  if (!obj) {
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed" && obj.client_reference_id) {
    await updateBossPlanTier(obj.client_reference_id, "PRO", {
      customerId: obj.customer,
      subscriptionId: obj.subscription,
    });
  } else if (event.type === "customer.subscription.deleted" && obj.customer) {
    await ensureAuthSchema();
    const rows = (await db`
      SELECT "id" FROM "User" WHERE "stripeCustomerId" = ${obj.customer} LIMIT 1
    `) as Array<{ id: string }>;
    if (rows[0]) {
      await updateBossPlanTier(rows[0].id, "FREE");
    }
  }

  return NextResponse.json({ received: true });
}
