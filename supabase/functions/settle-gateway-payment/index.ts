import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth: create user-scoped client from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse body
    const { paymentId, paidDate, paidAmount, syncWithGateway } = await req.json();

    if (!paymentId || !paidDate || paidAmount == null) {
      return new Response(JSON.stringify({ error: "Missing required fields: paymentId, paidDate, paidAmount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch payment (via user client – RLS enforced)
    const { data: payment, error: paymentError } = await userClient
      .from("client_payments")
      .select("id, agency_id, asaas_payment_id, conexa_charge_id, status")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "paid") {
      return new Response(JSON.stringify({ error: "Payment already settled" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. If syncWithGateway === true, call gateway API
    if (syncWithGateway === true) {
      // Use service_role to read protected agency_payment_settings
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      if (payment.asaas_payment_id) {
        const { data: settings, error: settingsError } = await adminClient
          .from("agency_payment_settings")
          .select("asaas_api_key, asaas_sandbox")
          .eq("agency_id", payment.agency_id)
          .single();

        if (settingsError || !settings?.asaas_api_key) {
          return new Response(JSON.stringify({ error: "Asaas API key not configured for this agency" }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const baseUrl = settings.asaas_sandbox
          ? "https://sandbox.asaas.com/api"
          : "https://api.asaas.com";

        const asaasUrl = `${baseUrl}/v3/payments/${payment.asaas_payment_id}/receiveInCash`;

        const asaasResponse = await fetch(asaasUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": settings.asaas_api_key,
          },
          body: JSON.stringify({
            paymentDate: paidDate,
            value: paidAmount,
            notifyCustomer: false,
          }),
        });

        if (!asaasResponse.ok) {
          const asaasError = await asaasResponse.text();
          console.error("Asaas receiveInCash error:", asaasResponse.status, asaasError);
          return new Response(JSON.stringify({
            error: "Failed to settle payment on Asaas",
            details: asaasError,
          }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (payment.conexa_charge_id) {
        const { data: cxSettings, error: cxSettingsError } = await adminClient
          .from("agency_payment_settings")
          .select("conexa_subdomain, conexa_api_key, conexa_account_id, conexa_receiving_method_id")
          .eq("agency_id", payment.agency_id)
          .single();

        if (cxSettingsError || !cxSettings?.conexa_api_key || !cxSettings?.conexa_subdomain) {
          return new Response(JSON.stringify({ error: "Conexa API key or subdomain not configured for this agency" }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!cxSettings.conexa_account_id || !cxSettings.conexa_receiving_method_id) {
          return new Response(JSON.stringify({ error: "Conexa account ID or receiving method ID not configured" }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const conexaUrl = `https://${cxSettings.conexa_subdomain}.conexa.app/index.php/api/v2/charge/settle/${payment.conexa_charge_id}`;

        const conexaResponse = await fetch(conexaUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cxSettings.conexa_api_key}`,
          },
          body: JSON.stringify({
            settlementDate: paidDate,
            receivingMethod: {
              id: cxSettings.conexa_receiving_method_id,
              installmentsQuantity: 1,
            },
            accountId: cxSettings.conexa_account_id,
            paidAmount: paidAmount,
            sendEmail: false,
          }),
        });

        if (!conexaResponse.ok) {
          const conexaError = await conexaResponse.text();
          console.error("Conexa settle error:", conexaResponse.status, conexaError);
          return new Response(JSON.stringify({
            error: "Failed to settle payment on Conexa",
            details: conexaError,
          }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // 5. Update local payment (via user client – RLS enforced)
    const { error: updateError } = await userClient
      .from("client_payments")
      .update({
        status: "paid" as any,
        paid_date: paidDate,
        amount_paid: paidAmount,
      })
      .eq("id", paymentId);

    if (updateError) {
      console.error("Local update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update payment locally", details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      syncedWithGateway: syncWithGateway === true && !!(payment.asaas_payment_id || payment.conexa_charge_id),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
