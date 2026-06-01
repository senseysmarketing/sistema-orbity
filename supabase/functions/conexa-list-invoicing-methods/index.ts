// Edge function: lista meios de faturamento ativos da Conexa para a agência atual.
// Usado pela UI ConexaIntegration para popular o select "Meio de Faturamento (Boleto)".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { listInvoicingMethods, logConexaApi } from "../_shared/conexa-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const { agency_id, type } = await req.json().catch(() => ({}));
    if (!agency_id) return json({ error: "Missing agency_id" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Confirma que o usuário pertence à agência
    const { data: member } = await admin
      .from("agency_users")
      .select("user_id")
      .eq("agency_id", agency_id)
      .eq("user_id", claimsData.claims.sub)
      .maybeSingle();
    if (!member) return json({ error: "Forbidden" }, 403);

    const { data: settings, error: settingsError } = await admin
      .from("agency_payment_settings")
      .select("conexa_api_key, conexa_subdomain, conexa_company_id, conexa_unit_id")
      .eq("agency_id", agency_id)
      .single();

    if (settingsError || !settings?.conexa_api_key || !settings?.conexa_subdomain) {
      return json({ error: "Configure subdomínio e token Conexa antes de buscar meios de faturamento." }, 422);
    }

    const creds = {
      baseUrl: `https://${settings.conexa_subdomain}.conexa.app/index.php/api/v2`,
      apiKey: settings.conexa_api_key,
    };

    try {
      const methods = await listInvoicingMethods(admin, creds, {
        companyId: (settings.conexa_company_id as number | null) ?? (settings.conexa_unit_id as number | null) ?? null,
        type: type || undefined,
        agencyId: agency_id,
      });
      return json({ methods });
    } catch (err) {
      await logConexaApi(admin, {
        agencyId: agency_id,
        operation: "invoicing_methods_list",
        endpoint: "/invoicingMethods",
        httpStatus: null,
        success: false,
        errorMessage: (err as Error).message,
      });
      return json({ error: (err as Error).message }, 502);
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
