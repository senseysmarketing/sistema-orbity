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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check for Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found in Stripe");
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
      logStep("No active subscription found");
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

    logStep("Active subscription found", { 
      subscriptionId: activeSubscription.id, 
      status: activeSubscription.status 
    });

    const priceId = activeSubscription.items.data[0].price.id;
    const subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
    const trialEnd = activeSubscription.trial_end ? 
      new Date(activeSubscription.trial_end * 1000).toISOString() : null;

    // Get plan name from our database based on price ID
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('name, slug')
      .eq('stripe_price_id_monthly', priceId)
      .single();

    const planName = plan?.name || 'Unknown Plan';

    logStep("Subscription details retrieved", { 
      priceId, 
      planName, 
      subscriptionEnd, 
      trialEnd 
    });

    // Update agency subscription in our database
    const { error: updateError } = await supabaseClient
      .from('agency_subscriptions')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSubscription.id,
        status: activeSubscription.status === 'trialing' ? 'trial' : 'active',
        current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: subscriptionEnd,
        trial_end: trialEnd,
        updated_at: new Date().toISOString()
      })
      .eq('agency_id', user.id); // This should be the agency_id from user context

    if (updateError) {
      logStep("Warning: Could not update agency subscription", { error: updateError.message });
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