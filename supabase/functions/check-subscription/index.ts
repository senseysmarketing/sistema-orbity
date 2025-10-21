import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header provided - returning unsubscribed");
      return new Response(JSON.stringify({
        subscribed: false,
        subscription_status: 'none'
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      logStep("Authentication error or missing email - returning unsubscribed", { error: userError?.message });
      return new Response(JSON.stringify({
        subscribed: false,
        subscription_status: 'none'
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });
    

    // Get user's agency
    const { data: agencyUser, error: agencyError } = await supabaseClient
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (agencyError || !agencyUser) {
      logStep("No agency found for user");
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: 'none',
        plan_name: null,
        trial_end: null,
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const agencyId = agencyUser.agency_id;
    logStep("Found user agency", { agencyId });

    // ALWAYS check Stripe FIRST (source of truth for payments)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key, falling back to local subscription check");
      
      // Check local subscription only if Stripe is unavailable
      const { data: localSubscription } = await supabaseClient
        .from('agency_subscriptions')
        .select(`
          *,
          subscription_plans!inner (
            name,
            slug
          )
        `)
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (localSubscription && localSubscription.subscription_plans) {
        const plan = localSubscription.subscription_plans;
        const isValidTrial = localSubscription.status === 'trial' && 
          new Date(localSubscription.trial_end) > new Date();
        
        return new Response(JSON.stringify({
          subscribed: localSubscription.status === 'active' || isValidTrial,
          subscription_status: localSubscription.status,
          plan_name: plan.name,
          trial_end: localSubscription.trial_end,
          subscription_end: localSubscription.current_period_end,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: 'none',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    logStep("Checking Stripe for customer and subscriptions");
    
    // Check for Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking local subscription");
      
      // Fallback to local subscription
      const { data: localSubscription } = await supabaseClient
        .from('agency_subscriptions')
        .select(`
          *,
          subscription_plans!inner (
            name,
            slug
          )
        `)
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (localSubscription && localSubscription.subscription_plans) {
        const plan = localSubscription.subscription_plans;
        const isValidTrial = localSubscription.status === 'trial' && 
          new Date(localSubscription.trial_end) > new Date();
        
        return new Response(JSON.stringify({
          subscribed: localSubscription.status === 'active' || isValidTrial,
          subscription_status: localSubscription.status,
          plan_name: plan.name,
          trial_end: localSubscription.trial_end,
          subscription_end: localSubscription.current_period_end,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: 'none',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const activeSubscription = subscriptions.data.find((sub: any) => 
      ['active', 'trialing', 'past_due'].includes(sub.status)
    );

    if (!activeSubscription) {
      logStep("No active Stripe subscription, checking local for trial");
      
      // Check local for trial period
      const { data: localSubscription } = await supabaseClient
        .from('agency_subscriptions')
        .select(`
          *,
          subscription_plans!inner (
            name,
            slug
          )
        `)
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (localSubscription && localSubscription.subscription_plans) {
        const plan = localSubscription.subscription_plans;
        const isValidTrial = localSubscription.status === 'trial' && 
          new Date(localSubscription.trial_end) > new Date();
        
        return new Response(JSON.stringify({
          subscribed: isValidTrial,
          subscription_status: localSubscription.status,
          plan_name: plan.name,
          trial_end: localSubscription.trial_end,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: 'none',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Active subscription found in Stripe", { 
      subscriptionId: activeSubscription.id, 
      status: activeSubscription.status 
    });

    const priceId = activeSubscription.items.data[0].price.id;

    const toIsoOrNull = (seconds?: number | null): string | null => {
      if (typeof seconds !== 'number' || !isFinite(seconds)) return null;
      const d = new Date(seconds * 1000);
      try {
        return d.toISOString();
      } catch {
        return null;
      }
    };

    const subscriptionEnd = toIsoOrNull(activeSubscription.current_period_end);
    const trialEnd = toIsoOrNull(activeSubscription.trial_end);
    const periodStart = toIsoOrNull(activeSubscription.current_period_start);

    // Get plan details from database based on price ID
    const { data: plan } = await supabaseClient
      .from('subscription_plans')
      .select('id, name, slug')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .maybeSingle();

    const planName = plan?.name || 'Básico';

    logStep("Subscription details retrieved from Stripe", { 
      priceId, 
      planName, 
      subscriptionEnd, 
      trialEnd 
    });

    // Sync to local database (upsert)
    const { error: syncError } = await supabaseClient
      .from('agency_subscriptions')
      .upsert({
        agency_id: agencyId,
        plan_id: plan?.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSubscription.id,
        stripe_price_id: priceId,
        status: activeSubscription.status === 'trialing' ? 'trial' : 'active',
        current_period_start: periodStart,
        current_period_end: subscriptionEnd,
        trial_end: trialEnd,
        billing_cycle: 'monthly',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'agency_id'
      });

    if (syncError) {
      logStep("Warning: Could not sync subscription to local database", { error: syncError.message });
    } else {
      logStep("Successfully synced Stripe subscription to local database");
    }

    return new Response(JSON.stringify({
      subscribed: true,
      subscription_status: activeSubscription.status,
      plan_name: planName,
      price_id: priceId,
      trial_end: trialEnd,
      subscription_end: subscriptionEnd,
      customer_id: customerId,
      subscription_id: activeSubscription.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});