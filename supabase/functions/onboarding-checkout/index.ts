import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ONBOARDING-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { companyData, adminUser, planSlug, billingCycle } = await req.json();
    logStep("Request received", { planSlug, billingCycle });

    if (!companyData || !adminUser || !planSlug) {
      throw new Error("Missing required data: companyData, adminUser, or planSlug");
    }

    // 1. Get plan details
    const { data: planData, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();

    if (planError || !planData) {
      throw new Error(`Plan not found: ${planSlug}`);
    }

    logStep("Plan found", { planId: planData.id, planName: planData.name });

    // 2. Create or get user
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        name: adminUser.name,
        role: 'agency_admin'
      }
    });

    if (authError) {
      // If user already exists, try to get it
      const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
      const user = existingUser?.users?.find(u => u.email === adminUser.email);
      
      if (!user) {
        throw new Error(`Failed to create or find user: ${authError.message}`);
      }
      
      logStep("Existing user found", { userId: user.id });
      authData.user = user;
    } else {
      logStep("New user created", { userId: authData.user.id });
    }

    const userId = authData.user.id;

    // 3. Create agency
    const agencySlug = companyData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    const { data: agencyData, error: agencyError } = await supabaseClient
      .from("agencies")
      .insert({
        name: companyData.name,
        slug: agencySlug,
        description: companyData.description,
        contact_email: companyData.contactEmail,
        contact_phone: companyData.contactPhone,
      })
      .select()
      .single();

    if (agencyError) throw new Error(`Failed to create agency: ${agencyError.message}`);
    
    logStep("Agency created", { agencyId: agencyData.id });

    // 4. Associate user with agency
    const { error: agencyUserError } = await supabaseClient
      .from("agency_users")
      .insert({
        agency_id: agencyData.id,
        user_id: userId,
        role: "owner",
      });

    if (agencyUserError) {
      throw new Error(`Failed to associate user with agency: ${agencyUserError.message}`);
    }

    logStep("User associated with agency");

    // 5. Create subscription with pending_payment status
    const { error: subscriptionError } = await supabaseClient
      .from("agency_subscriptions")
      .insert({
        agency_id: agencyData.id,
        plan_id: planData.id,
        status: "pending_payment",
        billing_cycle: "monthly",
      });

    if (subscriptionError) {
      throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
    }

    logStep("Subscription created with pending_payment status");

    // 6. Create Stripe checkout session
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: adminUser.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Use yearly price if available and billing cycle is yearly, otherwise monthly
    const priceId = (billingCycle === 'yearly' && planData.stripe_price_id_yearly) 
      ? planData.stripe_price_id_yearly 
      : planData.stripe_price_id_monthly;

    if (!priceId) {
      throw new Error(`No Stripe price ID found for plan ${planSlug} with billing cycle ${billingCycle || 'monthly'}`);
    }

    // Fast-Track discount: check if agency is eligible for the R$100 onboarding coupon
    const { data: agencyFlags } = await supabaseClient
      .from('agencies')
      .select('onboarding_discount_eligible')
      .eq('id', agencyData.id)
      .maybeSingle();

    const fastTrackCouponId = Deno.env.get('STRIPE_FAST_TRACK_COUPON_ID');
    const discounts = (agencyFlags?.onboarding_discount_eligible && fastTrackCouponId)
      ? [{ coupon: fastTrackCouponId }]
      : undefined;

    if (discounts) {
      logStep("Applying Fast-Track discount", { couponId: fastTrackCouponId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : adminUser.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      // Stripe rejects discounts + allow_promotion_codes simultaneously
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      success_url: `${req.headers.get("origin")}/subscription-success?session_id={CHECKOUT_SESSION_ID}&onboarding=true`,
      cancel_url: `${req.headers.get("origin")}/subscription-canceled`,
      metadata: {
        agency_id: agencyData.id,
        user_id: userId,
        plan_slug: planSlug,
        onboarding: "true",
        fast_track_discount: discounts ? "true" : "false",
      },
    });

    logStep("Stripe checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: session.url,
        agencyId: agencyData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
