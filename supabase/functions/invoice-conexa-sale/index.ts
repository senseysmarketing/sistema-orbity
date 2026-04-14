import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Creates a Conexa Charge from an existing Sale, then fetches the charge URL.
 * Reusable helper — also used by create-gateway-charge for auto_invoice.
 */
async function createConexaCharge(
  saleId: string,
  dueDate: string,
  notes: string | null,
  baseUrl: string,
  apiKey: string
): Promise<{ chargeId: string; chargeUrl: string | null; billetUrl: string | null }> {
  // Step 1: POST /charge
  const chargeBody = {
    salesIds: [parseInt(saleId, 10)],
    dueDate,
    notes: notes || undefined,
  };

  console.log("[Conexa] Creating charge with body:", JSON.stringify(chargeBody));

  const chargeRes = await fetch(`${baseUrl}/charge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(chargeBody),
  });

  if (!chargeRes.ok) {
    const errText = await chargeRes.text();
    throw new Error(`Erro ao criar cobrança no Conexa (${chargeRes.status}): ${errText}`);
  }

  const chargeData = await chargeRes.json();
  const chargeId = String(chargeData.id);

  console.log("[Conexa] Charge created with ID:", chargeId);

  // Step 2: GET /charge/{chargeId} to retrieve URLs
  const getRes = await fetch(`${baseUrl}/charge/${chargeId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  let chargeUrl: string | null = null;
  let billetUrl: string | null = null;

  if (getRes.ok) {
    const chargeDetail = await getRes.json();
    chargeUrl = chargeDetail.chargeUrl || null;
    billetUrl = chargeDetail.billetUrl || null;
    console.log("[Conexa] Charge URLs:", { chargeUrl, billetUrl });
  } else {
    const errText = await getRes.text();
    console.warn("[Conexa] Could not fetch charge details:", errText);
  }

  return { chargeId, chargeUrl, billetUrl };
}

// --------------- Main handler ---------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 2. Parse input
    const { payment_id } = await req.json();
    if (!payment_id) {
      return jsonResponse({ error: "Missing required field: payment_id" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Fetch payment
    const { data: payment, error: paymentError } = await adminClient
      .from("client_payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      return jsonResponse({ error: "Payment not found" }, 404);
    }

    if (!payment.conexa_charge_id) {
      return jsonResponse({ error: "Este pagamento não possui uma venda Conexa vinculada." }, 422);
    }

    if (payment.conexa_invoice_url) {
      return jsonResponse({ error: "Esta fatura já foi emitida anteriormente." }, 422);
    }

    // 4. Fetch agency payment settings
    const { data: settings, error: settingsError } = await adminClient
      .from("agency_payment_settings")
      .select("*")
      .eq("agency_id", payment.agency_id)
      .single();

    if (settingsError || !settings) {
      return jsonResponse({ error: "Configurações de pagamento não encontradas para esta agência." }, 422);
    }

    if (!settings.conexa_api_key || !settings.conexa_subdomain) {
      return jsonResponse({ error: "Token ou subdomínio do Conexa não configurado." }, 422);
    }

    const conexaBaseUrl = `https://${settings.conexa_subdomain}.conexa.app/index.php/api/v2`;

    // 5. Create charge + fetch URLs
    const { chargeId, chargeUrl, billetUrl } = await createConexaCharge(
      payment.conexa_charge_id,
      payment.due_date,
      payment.description,
      conexaBaseUrl,
      settings.conexa_api_key
    );

    // 6. Update payment in Orbity — overwrite conexa_charge_id with chargeId
    const { error: updateError } = await adminClient
      .from("client_payments")
      .update({
        conexa_charge_id: chargeId,
        conexa_invoice_url: chargeUrl,
        conexa_pix_copy_paste: billetUrl,
        status: "pending",
      })
      .eq("id", payment_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonResponse({ error: "Cobrança criada no Conexa mas falhou ao salvar no banco local.", details: updateError.message }, 500);
    }

    return jsonResponse({
      success: true,
      chargeId,
      chargeUrl,
      billetUrl,
    });
  } catch (err: unknown) {
    console.error("Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
