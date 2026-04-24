// Cria cobrança via Stripe usando a chave PRÓPRIA da agência (NÃO a STRIPE_SECRET_KEY do Master).
// Suporta multi-moeda (currency dinâmico, fallback 'brl').
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsRes.claims.sub;

    const body = await req.json();
    const {
      client_id,
      amount,
      due_date,
      description,
      agency_id,
      payment_id,
      currency: currencyInput,
    } = body ?? {};

    if (!client_id || !amount || !due_date || !agency_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GUARDRAIL 1 — currency dinâmico, fallback 'brl'
    const currency = (typeof currencyInput === "string" && currencyInput.trim()
      ? currencyInput
      : "brl"
    ).toLowerCase();

    // Verificar membership do usuário na agência
    const { data: membership } = await userClient
      .from("agency_users")
      .select("id, role")
      .eq("user_id", userId)
      .eq("agency_id", agency_id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden: not a member of this agency" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carregar chave Stripe da agência via service role (RLS bypass para leitura interna)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: agency, error: agencyErr } = await admin
      .from("agencies")
      .select("id, name, stripe_secret_key")
      .eq("id", agency_id)
      .maybeSingle();
    if (agencyErr || !agency?.stripe_secret_key) {
      return new Response(JSON.stringify({ error: "Stripe not configured for this agency" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client } = await admin
      .from("clients")
      .select("id, name, email")
      .eq("id", client_id)
      .eq("agency_id", agency_id)
      .maybeSingle();
    if (!client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert do client_payments
    let paymentRow: { id: string } | null = null;
    if (payment_id) {
      const { data } = await admin
        .from("client_payments")
        .select("id")
        .eq("id", payment_id)
        .eq("agency_id", agency_id)
        .maybeSingle();
      paymentRow = data ?? null;
    }
    if (!paymentRow) {
      const { data: created, error: insErr } = await admin
        .from("client_payments")
        .insert({
          agency_id,
          client_id,
          amount,
          due_date,
          description: description ?? null,
          billing_type: "stripe",
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr || !created) {
        return new Response(JSON.stringify({ error: insErr?.message ?? "Failed to create payment" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      paymentRow = created;
    }

    const agencyStripeKey = agency.stripe_secret_key as string;
    const agencyStripeClient = new Stripe(agencyStripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
    const successUrl = `${origin}/dashboard/finance?stripe=success&payment_id=${paymentRow.id}`;
    const cancelUrl = `${origin}/dashboard/finance?stripe=cancel&payment_id=${paymentRow.id}`;

    const session = await agencyStripeClient.checkout.sessions.create({
      mode: "payment",
      customer_email: client.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description?.trim() || `Cobrança — ${client.name}`,
              description: `Cliente: ${client.name}`,
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        payment_id: paymentRow.id,
        agency_id,
        client_id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // GUARDRAIL 2 — persistir checkout URL imediatamente
    await admin
      .from("client_payments")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_checkout_url: session.url,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        invoice_url: session.url,
      })
      .eq("id", paymentRow.id);

    const { data: payment } = await admin
      .from("client_payments")
      .select("*")
      .eq("id", paymentRow.id)
      .single();

    return new Response(
      JSON.stringify({ payment, checkout_url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-agency-stripe-charge]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
