import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { priceId, agencyId, email: bodyEmail, mode: checkoutMode } = await req.json().catch(() => ({}));
    
    if (!priceId && !agencyId) {
      throw new Error("Either priceId or agencyId is required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Resolve user
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | null = null;
    let userId: string | null = null;

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (userError) throw new Error(`Authentication error: ${userError.message}`);
        if (userData.user?.email) {
          userEmail = userData.user.email;
          userId = userData.user.id;
          logStep("User authenticated", { userId, email: userEmail });
        }
      } catch (e) {
        logStep("Auth via token failed", { message: e instanceof Error ? e.message : String(e) });
      }
    }

    if (!userEmail && bodyEmail) {
      userEmail = bodyEmail;
      logStep("Using email from request body", { email: userEmail });
    }

    if (!userEmail) {
      throw new Error("Authentication error: no email available");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Determine the price to use
    let finalPriceId = priceId;

    // If agencyId provided, create dynamic price from monthly_value
    if (agencyId && !priceId) {
      logStep("Dynamic pricing mode - fetching agency data", { agencyId });

      const { data: agency, error: agencyError } = await supabaseAdmin
        .from('agencies')
        .select('id, name, monthly_value, stripe_product_id, stripe_price_id')
        .eq('id', agencyId)
        .single();

      if (agencyError || !agency) {
        throw new Error(`Agency not found: ${agencyError?.message || 'unknown'}`);
      }

      if (!agency.monthly_value || agency.monthly_value <= 0) {
        throw new Error("Agency has no monthly_value configured");
      }

      logStep("Agency found", { name: agency.name, monthlyValue: agency.monthly_value });

      // Reuse existing price if already created and same value
      if (agency.stripe_price_id) {
        try {
          const existingPrice = await stripe.prices.retrieve(agency.stripe_price_id);
          if (existingPrice.active && existingPrice.unit_amount === Math.round(agency.monthly_value * 100)) {
            finalPriceId = agency.stripe_price_id;
            logStep("Reusing existing Stripe price", { priceId: finalPriceId });
          } else {
            logStep("Existing price mismatch or inactive, creating new one");
            agency.stripe_price_id = null;
          }
        } catch {
          logStep("Could not retrieve existing price, creating new one");
          agency.stripe_price_id = null;
        }
      }

      if (!finalPriceId) {
        // Find or create product
        let productId = agency.stripe_product_id;

        if (productId) {
          try {
            const existingProduct = await stripe.products.retrieve(productId);
            if (!existingProduct.active) {
              productId = null;
            }
          } catch {
            productId = null;
          }
        }

        if (!productId) {
          const product = await stripe.products.create({
            name: `Assinatura Orbity - ${agency.name}`,
            metadata: { agency_id: agencyId },
          });
          productId = product.id;
          logStep("Created Stripe product", { productId });
        }

        // Create price
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: Math.round(agency.monthly_value * 100),
          currency: 'brl',
          recurring: { interval: 'month' },
          metadata: { agency_id: agencyId },
        });
        finalPriceId = price.id;
        logStep("Created Stripe price", { priceId: finalPriceId, amount: agency.monthly_value });

        // Save Stripe IDs back to agency
        await supabaseAdmin
          .from('agencies')
          .update({
            stripe_product_id: productId,
            stripe_price_id: finalPriceId,
          })
          .eq('id', agencyId);
        logStep("Saved Stripe IDs to agency");
      }
    }

    if (!finalPriceId) {
      throw new Error("No price ID resolved");
    }

    // Check if customer exists
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail!,
      line_items: [{ price: finalPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription-canceled`,
      allow_promotion_codes: true,
      metadata: {
        user_id: userId ?? 'unknown',
        user_email: userEmail!,
        agency_id: agencyId || 'unknown',
        mode: checkoutMode || 'new',
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Save customer ID to agency if we have it
    if (agencyId && customerId) {
      await supabaseAdmin
        .from('agencies')
        .update({ stripe_customer_id: customerId })
        .eq('id', agencyId);
    }

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
