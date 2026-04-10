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
      .select("id, name, agency_id, report_token, report_expires_at, report_ad_account_id, report_date_from, report_date_to")
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
      .select("name, logo_url, crm_ad_account_id")
      .eq("id", client.agency_id)
      .single();

    // 4. Determine date range from saved values or default to last 30 days
    const dateFrom = client.report_date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dateTo = client.report_date_to || new Date().toISOString().split("T")[0];

    // 5. Buscar ad accounts - filter by specific account if saved
    let adAccountsQuery = supabaseAdmin
      .from("selected_ad_accounts")
      .select("ad_account_id, ad_account_name, currency, current_month_spend, active_campaigns_count, connection_id")
      .eq("agency_id", client.agency_id)
      .eq("is_active", true);

    if (client.report_ad_account_id) {
      adAccountsQuery = adAccountsQuery.eq("ad_account_id", client.report_ad_account_id);
    }

    const { data: adAccounts } = await adAccountsQuery;

    let metricsPayload = {
      spend: 0,
      conversions: 0,
      cpa: 0,
      active_campaigns: 0,
    };
    let topCampaigns: any[] = [];
    let isMock = true;

    if (adAccounts && adAccounts.length > 0) {
      try {
        const connectionIds = [...new Set(adAccounts.map((a) => a.connection_id))];
        const { data: connections } = await supabaseAdmin
          .from("facebook_connections")
          .select("id, access_token")
          .in("id", connectionIds)
          .eq("is_active", true);

        if (connections && connections.length > 0) {
          const accessToken = connections[0].access_token;
          let totalSpend = 0;
          let totalConversions = 0;
          let totalActiveCampaigns = 0;
          const allCampaigns: any[] = [];

          for (const account of adAccounts) {
            try {
              const insightsUrl = `https://graph.facebook.com/v21.0/act_${account.ad_account_id}/insights?fields=spend,actions&time_range={"since":"${dateFrom}","until":"${dateTo}"}&access_token=${accessToken}`;
              const insightsRes = await fetch(insightsUrl);
              const insightsData = await insightsRes.json();

              if (insightsData.data && insightsData.data.length > 0) {
                const insight = insightsData.data[0];
                const spend = parseFloat(insight.spend || "0");
                totalSpend += spend;

                const conversions = (insight.actions || [])
                  .filter((a: any) => ["offsite_conversion", "lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"].includes(a.action_type))
                  .reduce((sum: number, a: any) => sum + parseInt(a.value || "0"), 0);
                totalConversions += conversions;
                isMock = false;
              }

              const campaignsUrl = `https://graph.facebook.com/v21.0/act_${account.ad_account_id}/campaigns?fields=name,status,objective,insights.time_range({"since":"${dateFrom}","until":"${dateTo}"}){spend,actions}&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=10&access_token=${accessToken}`;
              const campaignsRes = await fetch(campaignsUrl);
              const campaignsData = await campaignsRes.json();

              if (campaignsData.data) {
                totalActiveCampaigns += campaignsData.data.length;
                for (const camp of campaignsData.data) {
                  const campSpend = camp.insights?.data?.[0]?.spend ? parseFloat(camp.insights.data[0].spend) : 0;
                  const campConversions = (camp.insights?.data?.[0]?.actions || [])
                    .filter((a: any) => ["offsite_conversion", "lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"].includes(a.action_type))
                    .reduce((sum: number, a: any) => sum + parseInt(a.value || "0"), 0);

                  allCampaigns.push({
                    name: camp.name,
                    objective: camp.objective,
                    spend: campSpend,
                    conversions: campConversions,
                  });
                }
              }
            } catch (e) {
              console.error(`Error fetching data for account ${account.ad_account_id}:`, e);
            }
          }

          metricsPayload = {
            spend: totalSpend,
            conversions: totalConversions,
            cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
            active_campaigns: totalActiveCampaigns,
          };

          topCampaigns = allCampaigns
            .sort((a, b) => b.spend - a.spend)
            .slice(0, 3);
        }
      } catch (metaError) {
        console.error("Error fetching Meta data:", metaError);
      }

      if (isMock) {
        const totalSpend = adAccounts.reduce((sum, a) => sum + (a.current_month_spend || 0), 0);
        const totalCampaigns = adAccounts.reduce((sum, a) => sum + (a.active_campaigns_count || 0), 0);
        metricsPayload = {
          spend: totalSpend,
          conversions: 0,
          cpa: 0,
          active_campaigns: totalCampaigns,
        };
      }
    }

    const payload = {
      client_name: client.name,
      agency_name: agency?.name || "Agência",
      agency_logo: agency?.logo_url || null,
      metrics: metricsPayload,
      top_campaigns: topCampaigns,
      is_mock: isMock,
      period: { from: dateFrom, to: dateTo },
    };

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
