import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Buscar cliente pelo token
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, name, agency_id, report_token, report_expires_at, report_ad_account_id, report_date_from, report_date_to, report_snapshot")
      .eq("report_token", token)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validar expiração
    const expiresAt = new Date(client.report_expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: "expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar nome da agência
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("name, logo_url")
      .eq("id", client.agency_id)
      .single();

    // 4. Use snapshot data if available
    const snapshot = client.report_snapshot as any;

    const dateFrom = client.report_date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dateTo = client.report_date_to || new Date().toISOString().split("T")[0];

    const payload = {
      client_name: client.name,
      agency_name: agency?.name || "Agência",
      agency_logo: agency?.logo_url || null,
      metrics: snapshot?.metrics || {
        spend: 0,
        conversions: 0,
        cpa: 0,
        active_campaigns: 0,
        impressions: 0,
        clicks: 0,
        cpm: 0,
        cpc: 0,
        ctr: 0,
      },
      top_campaigns: snapshot?.top_campaigns || [],
      chart_data: snapshot?.chart_data || [],
      active_campaigns: snapshot?.active_campaigns || 0,
      actionTypeLabel: snapshot?.actionTypeLabel || null,
      is_mock: !snapshot,
      period: { from: dateFrom, to: dateTo },
    };

    // Ensure metrics has active_campaigns and cpa
    if (payload.metrics && !payload.metrics.cpa) {
      payload.metrics.cpa = payload.metrics.conversions > 0
        ? payload.metrics.spend / payload.metrics.conversions
        : 0;
    }
    if (payload.metrics && !payload.metrics.active_campaigns) {
      payload.metrics.active_campaigns = payload.active_campaigns;
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in public-client-report:", error);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
