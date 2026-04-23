// Stripe webhook EXCLUSIVO da agência (cobranças de clientes finais).
// ATENÇÃO: NÃO confundir com `stripe-webhook` (Master/Orbity).
// Isolamento total: usa `agencies.stripe_secret_key` + `agencies.stripe_webhook_secret`
// (nunca STRIPE_SECRET_KEY do ambiente).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // GUARDRAIL 3 — Fail-fast: validar agency_id ANTES de qualquer acesso ao DB.
  const url = new URL(req.url);
  const agencyId = url.searchParams.get("agency_id");
  if (!agencyId || !UUID_RE.test(agencyId)) {
    return new Response("Missing or invalid agency_id", { status: 400, headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400, headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: agency, error: agencyErr } = await admin
      .from("agencies")
      .select("id, stripe_secret_key, stripe_webhook_secret")
      .eq("id", agencyId)
      .maybeSingle();

    if (agencyErr || !agency?.stripe_secret_key || !agency?.stripe_webhook_secret) {
      return new Response("Agency Stripe not configured", { status: 400, headers: corsHeaders });
    }

    const agencyStripeKey = agency.stripe_secret_key as string;
    const agencyWebhookSecret = agency.stripe_webhook_secret as string;

    const agencyStripeClient = new Stripe(agencyStripeKey, { apiVersion: "2025-08-27.basil" });
    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = await agencyStripeClient.webhooks.constructEventAsync(
        rawBody,
        signature,
        agencyWebhookSecret,
      );
    } catch (err) {
      console.error("[stripe-agency-webhook] signature verification failed", err);
      return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    }

    // Helper de update idempotente
    const markPaid = async (
      filter: { col: "stripe_checkout_session_id" | "stripe_payment_intent_id" | "id"; value: string },
      amountPaidCents: number | null,
    ) => {
      const { data: existing } = await admin
        .from("client_payments")
        .select("id, status")
        .eq(filter.col, filter.value)
        .eq("agency_id", agencyId)
        .maybeSingle();

      if (!existing) {
        console.warn(`[stripe-agency-webhook] payment not found for ${filter.col}=${filter.value}`);
        return;
      }
      if (existing.status === "paid") {
        console.log(`[stripe-agency-webhook] payment ${existing.id} already paid — skipping (idempotent)`);
        return;
      }

      const update: Record<string, unknown> = {
        status: "paid",
        paid_date: new Date().toISOString().slice(0, 10),
        paid_at: new Date().toISOString(),
      };
      if (amountPaidCents != null) update.amount_paid = amountPaidCents / 100;

      const { error: upErr } = await admin
        .from("client_payments")
        .update(update)
        .eq("id", existing.id);
      if (upErr) console.error("[stripe-agency-webhook] update error", upErr);
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.payment_id;
        if (paymentId) {
          await markPaid({ col: "id", value: paymentId }, session.amount_total ?? null);
        } else {
          await markPaid(
            { col: "stripe_checkout_session_id", value: session.id },
            session.amount_total ?? null,
          );
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const paymentId = pi.metadata?.payment_id;
        if (paymentId) {
          await markPaid({ col: "id", value: paymentId }, pi.amount_received ?? null);
        } else {
          await markPaid(
            { col: "stripe_payment_intent_id", value: pi.id },
            pi.amount_received ?? null,
          );
        }
        break;
      }
      case "payment_intent.payment_failed": {
        console.log("[stripe-agency-webhook] payment_intent.payment_failed", event.id);
        break;
      }
      default:
        console.log(`[stripe-agency-webhook] unhandled event ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[stripe-agency-webhook] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
