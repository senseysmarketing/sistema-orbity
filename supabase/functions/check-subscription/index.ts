import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Parse optional agency_id from request body (front-end source of truth)
    let requestedAgencyId: string | null = null;
    try {
      const body = await req.json().catch(() => null);
      if (body && typeof body.agency_id === 'string' && body.agency_id.length > 0) {
        requestedAgencyId = body.agency_id;
      }
    } catch (_e) {
      // No body or invalid JSON - fall back to auto-selection
    }

    // Get ALL agencies the user belongs to (no .single() - users can have multiple)
    const { data: agencyUsers, error: agencyError } = await supabaseClient
      .from('agency_users')
      .select('agency_id, role, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (agencyError || !agencyUsers || agencyUsers.length === 0) {
      logStep("No agency found for user", { error: agencyError?.message });
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: 'none',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let agencyId: string | null = null;

    // 1) If front-end passed an agency_id, validate the user belongs to it and use it
    if (requestedAgencyId) {
      const match = agencyUsers.find((a: any) => a.agency_id === requestedAgencyId);
      if (match) {
        agencyId = match.agency_id;
        logStep("Using agency_id from request body", { agencyId, role: match.role });
      } else {
        logStep("Requested agency_id does not belong to user, falling back to auto-selection", { requestedAgencyId });
      }
    }

    // 2) Auto-selection: prioritize agency with active subscription
    if (!agencyId) {
      const userAgencyIds = agencyUsers.map((a: any) => a.agency_id);
      const { data: activeSubs } = await supabaseClient
        .from('agency_subscriptions')
        .select('agency_id, status, trial_end')
        .in('agency_id', userAgencyIds)
        .in('status', ['active', 'trial', 'trialing', 'past_due']);

      const nowIso = new Date();
      const validSubs = (activeSubs || []).filter((s: any) => {
        if (s.status === 'active' || s.status === 'past_due') return true;
        // trial / trialing -> must have trial_end in the future
        return s.trial_end && new Date(s.trial_end) > nowIso;
      });
      const activeAgencyIds = new Set(validSubs.map((s: any) => s.agency_id));

      // Prefer: active subscription + admin role (oldest first)
      const adminWithSub = agencyUsers.find((a: any) =>
        activeAgencyIds.has(a.agency_id) && ['owner', 'admin'].includes(a.role)
      );
      // Then: active subscription with any role
      const memberWithSub = agencyUsers.find((a: any) => activeAgencyIds.has(a.agency_id));
      // Then: admin role without active subscription
      const adminAny = agencyUsers.find((a: any) => ['owner', 'admin'].includes(a.role));
      // Fallback: oldest agency
      const fallback = agencyUsers[0];

      const chosen = adminWithSub || memberWithSub || adminAny || fallback;
      agencyId = chosen.agency_id;
      logStep("Auto-selected agency", { agencyId, role: chosen.role, hasActiveSub: activeAgencyIds.has(chosen.agency_id), totalAgencies: agencyUsers.length });
    }

    // ALWAYS check Stripe FIRST (source of truth for payments)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key, falling back to local subscription check");
      return await returnLocalSubscription(supabaseClient, agencyId);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    logStep("Checking Stripe for customer and subscriptions");
    
    // Check for Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking local subscription");
      return await returnLocalSubscription(supabaseClient, agencyId);
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Save customer ID to agency
    await supabaseClient
      .from('agencies')
      .update({ stripe_customer_id: customerId })
      .eq('id', agencyId);

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
      return await returnLocalSubscription(supabaseClient, agencyId);
    }

    logStep("Active subscription found in Stripe", { 
      subscriptionId: activeSubscription.id, 
      status: activeSubscription.status 
    });

    const priceId = activeSubscription.items.data[0].price.id;

    const toIsoOrNull = (seconds?: number | null): string | null => {
      if (typeof seconds !== 'number' || !isFinite(seconds)) return null;
      try { return new Date(seconds * 1000).toISOString(); } catch { return null; }
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

    const planName = plan?.name || 'Personalizado';

    logStep("Subscription details retrieved from Stripe", { priceId, planName, subscriptionEnd, trialEnd });

    // Check if local subscription exists
    const { data: existingSubscription } = await supabaseClient
      .from('agency_subscriptions')
      .select('id, status')
      .eq('agency_id', agencyId)
      .maybeSingle();

    const syncData: any = {
      agency_id: agencyId,
      stripe_customer_id: customerId,
      stripe_subscription_id: activeSubscription.id,
      stripe_price_id: priceId,
      status: 'active',
      current_period_start: periodStart,
      current_period_end: subscriptionEnd,
      billing_cycle: 'monthly',
      updated_at: new Date().toISOString()
    };

    if (plan?.id) {
      syncData.plan_id = plan.id;
    }

    if (existingSubscription) {
      const { error: updateError } = await supabaseClient
        .from('agency_subscriptions')
        .update(syncData)
        .eq('agency_id', agencyId);

      if (updateError) {
        logStep("Warning: Could not update subscription", { error: updateError.message });
      } else {
        logStep("Successfully updated local subscription from Stripe");
      }
    } else {
      // Need a plan_id for insert
      if (!syncData.plan_id) {
        const { data: basicPlan } = await supabaseClient
          .from('subscription_plans')
          .select('id')
          .eq('slug', 'basic')
          .eq('is_active', true)
          .single();
        syncData.plan_id = basicPlan?.id;
      }

      const { error: insertError } = await supabaseClient
        .from('agency_subscriptions')
        .insert(syncData);

      if (insertError) {
        logStep("Warning: Could not insert subscription", { error: insertError.message });
      } else {
        logStep("Successfully created local subscription from Stripe");
      }
    }

    // Also update agency is_active to true when subscription is valid
    await supabaseClient
      .from('agencies')
      .update({ is_active: true })
      .eq('id', agencyId);

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

async function returnLocalSubscription(supabaseClient: any, agencyId: string) {
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
    const isActive = localSubscription.status === 'active';

    // Detect expired trial: status='trial' but trial_end already passed
    let effectiveStatus = localSubscription.status;
    if (localSubscription.status === 'trial') {
      const trialExpired = localSubscription.trial_end &&
        new Date(localSubscription.trial_end) <= new Date();
      if (trialExpired) {
        effectiveStatus = 'trial_expired';
      }
    }

    logStep("Local subscription found", { status: localSubscription.status, effectiveStatus, isActive });

    return new Response(JSON.stringify({
      subscribed: isActive,
      subscription_status: effectiveStatus,
      plan_name: plan.name,
      trial_end: localSubscription.trial_end,
      subscription_end: localSubscription.current_period_end,
      customer_id: localSubscription.stripe_customer_id,
      subscription_id: localSubscription.stripe_subscription_id,
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
