import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-INVOICES] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's agency
    const { data: agencyUser } = await supabaseClient
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!agencyUser) throw new Error("User is not associated with any agency");
    const agencyId = agencyUser.agency_id;

    // Get agency subscription
    const { data: subscription } = await supabaseClient
      .from('agency_subscriptions')
      .select('id, stripe_customer_id, plan_id')
      .eq('agency_id', agencyId)
      .single();

    if (!subscription?.stripe_customer_id) {
      logStep("No Stripe customer found for agency");
      return new Response(JSON.stringify({ message: "No invoices found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 100,
    });

    logStep(`Found ${invoices.data.length} invoices in Stripe`);

    // Sync invoices to database
    const syncedInvoices = [];
    for (const invoice of invoices.data) {
      const billingPeriodStart = invoice.period_start 
        ? new Date(invoice.period_start * 1000).toISOString()
        : new Date().toISOString();
      
      const billingPeriodEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : new Date().toISOString();

      const dueDate = invoice.due_date
        ? new Date(invoice.due_date * 1000).toISOString()
        : null;

      const paidDate = invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : null;

      const { error: upsertError } = await supabaseClient
        .from('billing_history')
        .upsert({
          agency_id: agencyId,
          subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid / 100, // Convert from cents to currency units
          currency: invoice.currency.toUpperCase(),
          status: invoice.status || 'pending',
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          due_date: dueDate,
          paid_date: paidDate,
          invoice_url: invoice.hosted_invoice_url || invoice.invoice_pdf,
        }, {
          onConflict: 'stripe_invoice_id',
        });

      if (upsertError) {
        logStep("Error syncing invoice", { invoiceId: invoice.id, error: upsertError.message });
      } else {
        syncedInvoices.push(invoice.id);
      }
    }

    logStep(`Synced ${syncedInvoices.length} invoices to database`);

    return new Response(JSON.stringify({ 
      synced: syncedInvoices.length,
      message: `Successfully synced ${syncedInvoices.length} invoices`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-invoices", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
