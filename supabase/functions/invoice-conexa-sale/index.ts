// Edge function: fatura uma venda Conexa ainda não cobrada.
// Lê conexa_sale_id (fallback conexa_charge_id legado) e chama POST /charge,
// enriquecendo com GET /charge/:id e GET /charge/pix/:id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import {
  createConexaCharge,
  getConexaCharge,
  getConexaPix,
  validateInvoicingMethod,
  type ConexaCreds,
} from "../_shared/conexa-client.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Unauthorized" }, 401);

    const { payment_id } = await req.json();
    if (!payment_id) return jsonResponse({ error: "Missing required field: payment_id" }, 400);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: payment, error: paymentError } = await adminClient
      .from("client_payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) return jsonResponse({ error: "Payment not found" }, 404);

    // Aceita conexa_sale_id (novo) ou conexa_charge_id (legado pré-faturamento)
    const saleId: string | null =
      payment.conexa_sale_id ??
      (payment.conexa_invoice_url ? null : payment.conexa_charge_id) ??
      null;

    if (!saleId) {
      return jsonResponse({ error: "Este pagamento não possui uma venda Conexa vinculada." }, 422);
    }
    if (payment.conexa_charge_url || (payment.conexa_invoice_url && payment.conexa_charge_id !== payment.conexa_sale_id)) {
      return jsonResponse({ error: "Esta fatura já foi emitida anteriormente." }, 422);
    }

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

    const conexaCreds: ConexaCreds = {
      baseUrl: `https://${settings.conexa_subdomain}.conexa.app/index.php/api/v2`,
      apiKey: settings.conexa_api_key,
    };

    const autoBillet = settings.conexa_auto_generate_billet === true;
    if (autoBillet && !settings.conexa_invoicing_method_id) {
      return jsonResponse({
        error: "Auto-geração de boleto está ativa, mas nenhum Meio de Faturamento foi selecionado.",
      }, 422);
    }

    if (autoBillet) {
      try {
        await validateInvoicingMethod(adminClient, conexaCreds, {
          invoicingMethodId: settings.conexa_invoicing_method_id,
          companyId: settings.conexa_company_id ?? settings.conexa_unit_id,
          agencyId: payment.agency_id,
          expectedType: "billet",
        });
      } catch (err) {
        return jsonResponse({ error: (err as Error).message }, 422);
      }
    }

    const { chargeId, raw: chargeCreateRaw } = await createConexaCharge(
      adminClient,
      conexaCreds,
      {
        saleId,
        dueDate: payment.due_date,
        notes: payment.description,
        invoicingMethodId: autoBillet ? settings.conexa_invoicing_method_id : null,
      },
      { agencyId: payment.agency_id, paymentId: payment.id, clientId: payment.client_id },
    );

    const details = await getConexaCharge(adminClient, conexaCreds, chargeId, {
      agencyId: payment.agency_id,
      paymentId: payment.id,
      clientId: payment.client_id,
    });

    const pix = await getConexaPix(adminClient, conexaCreds, chargeId, {
      agencyId: payment.agency_id,
      paymentId: payment.id,
      clientId: payment.client_id,
    });

    let billingStatus = "charge_created";
    if (details.billetUrl) billingStatus = "billet_available";
    else if (autoBillet) billingStatus = "charge_created_without_billet";

    const { error: updateError } = await adminClient
      .from("client_payments")
      .update({
        conexa_sale_id: saleId,
        conexa_charge_id: chargeId,
        conexa_charge_url: details.chargeUrl,
        conexa_invoice_url: details.chargeUrl, // legado
        conexa_billet_url: details.billetUrl,
        conexa_pix_copy_paste: pix?.copyPasteCode ?? null,
        conexa_pix_qr_code: pix?.qrCode ?? null,
        conexa_raw_charge: details.raw ?? chargeCreateRaw,
        conexa_billing_status: billingStatus,
        conexa_last_sync_at: new Date().toISOString(),
        status: "pending",
      })
      .eq("id", payment_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonResponse(
        { error: "Cobrança criada no Conexa mas falhou ao salvar no banco local.", details: updateError.message },
        500,
      );
    }

    return jsonResponse({
      success: true,
      chargeId,
      chargeUrl: details.chargeUrl,
      billetUrl: details.billetUrl,
      pixCopyPaste: pix?.copyPasteCode ?? null,
      billingStatus,
    });
  } catch (err: unknown) {
    console.error("Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
