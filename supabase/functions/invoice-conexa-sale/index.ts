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

    const { data: payment, error: paymentError } = await userClient
      .from("client_payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      return jsonResponse({ error: "Payment not found or access denied" }, 404);
    }

    const userId = String(claimsData.claims.sub ?? "");
    const { data: membership } = await userClient
      .from("agency_users")
      .select("agency_id")
      .eq("agency_id", payment.agency_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return jsonResponse({ error: "Agency access denied" }, 403);

    // Aceita conexa_sale_id (novo) ou conexa_charge_id (legado pré-faturamento)
    const saleId: string | null =
      payment.conexa_sale_id ??
      (payment.conexa_invoice_url ? null : payment.conexa_charge_id) ??
      null;

    if (!saleId) {
      return jsonResponse({ error: "Este pagamento não possui uma venda Conexa vinculada." }, 422);
    }
    if (!payment.conexa_sale_id && payment.conexa_charge_id) {
      return jsonResponse({
        error: "Registro Conexa legado sem ID de venda confirmado. Confirme os IDs externamente antes de emitir outra cobrança.",
      }, 409);
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

    let chargeId = payment.conexa_charge_id && payment.conexa_sale_id
      ? String(payment.conexa_charge_id)
      : null;
    let chargeCreateRaw: unknown = payment.conexa_raw_charge ?? null;

    if (!chargeId) {
      const lockToken = `invoice:${crypto.randomUUID()}`;
      const lockedAt = payment.generation_locked_at
        ? new Date(payment.generation_locked_at).getTime()
        : null;
      const staleLock = lockedAt !== null && lockedAt < Date.now() - 5 * 60 * 1000;
      let lockQuery = adminClient
        .from("client_payments")
        .update({
          generation_status: "processing",
          generation_locked_at: new Date().toISOString(),
          generation_locked_by: lockToken,
          generation_last_attempt_at: new Date().toISOString(),
          generation_attempts: Number(payment.generation_attempts ?? 0) + 1,
        })
        .eq("id", payment_id);
      if (!payment.generation_locked_at) {
        lockQuery = lockQuery.is("generation_locked_at", null);
      } else if (staleLock) {
        lockQuery = lockQuery.eq("generation_locked_by", payment.generation_locked_by);
      } else {
        return jsonResponse(
          { error: "Esta cobrança já está sendo emitida.", payment_id, recoverable: true },
          409,
        );
      }
      const { data: lockedPayment, error: lockError } = await lockQuery
        .select("id")
        .maybeSingle();
      if (lockError || !lockedPayment) {
        return jsonResponse(
          { error: "Esta cobrança já está sendo emitida.", payment_id, recoverable: true },
          409,
        );
      }

      const createdCharge = await createConexaCharge(
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
      chargeId = createdCharge.chargeId;
      chargeCreateRaw = createdCharge.raw;

      const { error: persistIdError } = await adminClient
        .from("client_payments")
        .update({
          conexa_charge_id: chargeId,
          conexa_raw_charge: chargeCreateRaw,
          conexa_billing_status: "charge_created",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment_id);
      if (persistIdError) {
        return jsonResponse(
          {
            error: "Cobrança criada no Conexa, mas o ID externo não pôde ser confirmado localmente.",
            details: persistIdError.message,
            payment_id,
            charge_id: chargeId,
            recoverable: true,
          },
          500,
        );
      }
    }

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

    const updates: Record<string, unknown> = {
      conexa_sale_id: saleId,
      conexa_charge_id: chargeId,
      conexa_raw_charge: details.raw ?? chargeCreateRaw,
      conexa_billing_status: billingStatus,
      conexa_last_sync_at: new Date().toISOString(),
      generation_status: "generated",
      generation_last_error: null,
      generation_locked_at: null,
      generation_locked_by: null,
      generated_at: new Date().toISOString(),
      status: "pending",
    };
    if (details.chargeUrl) {
      updates.conexa_charge_url = details.chargeUrl;
      updates.conexa_invoice_url = details.chargeUrl;
    }
    if (details.billetUrl) updates.conexa_billet_url = details.billetUrl;
    if (pix?.copyPasteCode) {
      updates.conexa_pix_copy_paste = pix.copyPasteCode;
    }
    if (pix?.qrCode) updates.conexa_pix_qr_code = pix.qrCode;

    const { error: updateError } = await adminClient
      .from("client_payments")
      .update(updates)
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
      billingPending: autoBillet && !details.billetUrl,
      message: autoBillet && !details.billetUrl
        ? "A cobrança já existe no Conexa, mas o boleto Efí ainda está pendente. A mesma cobrança será enriquecida posteriormente, sem reemissão."
        : null,
    });
  } catch (err: unknown) {
    console.error("Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
