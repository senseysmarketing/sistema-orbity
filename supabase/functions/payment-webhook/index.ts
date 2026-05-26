import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import {
  applyConexaPaymentUpdate,
  enqueuePaidNotification,
  logConexaWebhook,
  parseConexaPayload,
} from "../_shared/conexa-payment-update.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ASAAS_EVENT_MAP: Record<string, string> = {
  PAYMENT_RECEIVED: "paid",
  PAYMENT_CONFIRMED: "paid",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "cancelled",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const gateway = url.searchParams.get("gateway");
  const agencyId = url.searchParams.get("agency_id");

  if (!gateway || !agencyId) {
    return new Response(JSON.stringify({ error: "Missing gateway or agency_id" }), { status: 400 });
  }
  if (!["asaas", "conexa"].includes(gateway)) {
    return new Response(JSON.stringify({ error: "Invalid gateway" }), { status: 400 });
  }

  // ===== CONEXA: PARSER TOLERANTE + AUDITORIA PERSISTIDA =====
  if (gateway === "conexa") {
    // 1. Ler body cru imediatamente (antes de qualquer validação) para auditoria.
    let rawText = "";
    let rawBody: unknown = null;
    try {
      rawText = await req.text();
      rawBody = rawText ? JSON.parse(rawText) : null;
    } catch (err) {
      await logConexaWebhook(supabase, {
        agencyId,
        source: "webhook",
        rawBody: { _raw_text: rawText.slice(0, 4000) },
        matchStatus: "invalid_payload",
        errorMessage: `json_parse_error: ${(err as Error).message}`,
      });
      return new Response("OK", { status: 200 });
    }

    // 2. Validar secret
    const { data: settings } = await supabase
      .from("agency_payment_settings")
      .select("conexa_webhook_token")
      .eq("agency_id", agencyId)
      .maybeSingle();

    const expectedToken = settings?.conexa_webhook_token;
    const receivedSecret = url.searchParams.get("secret");
    if (!expectedToken || receivedSecret !== expectedToken) {
      await logConexaWebhook(supabase, {
        agencyId,
        source: "webhook",
        rawBody,
        matchStatus: "unauthorized",
        errorMessage: "invalid_or_missing_secret",
      });
      console.warn(`[payment-webhook] Invalid Conexa secret for agency ${agencyId}`);
      return new Response("Unauthorized", { status: 401 });
    }

    // 3. Parser tolerante
    const parsed = parseConexaPayload(rawBody);

    if (parsed.kind === "invalid_payload") {
      await logConexaWebhook(supabase, {
        agencyId,
        source: "webhook",
        rawBody,
        parsedEvent: "invalid_payload",
        matchStatus: "invalid_payload",
        errorMessage: parsed.reason,
      });
      return new Response("OK", { status: 200 });
    }

    if (parsed.kind === "unknown_event") {
      await logConexaWebhook(supabase, {
        agencyId,
        source: "webhook",
        rawBody,
        parsedChargeId: parsed.chargeId,
        parsedEvent: "unknown_event",
        matchStatus: "unknown_event",
      });
      return new Response("OK", { status: 200 });
    }

    // 4. Aplicar update
    const result = await applyConexaPaymentUpdate(supabase, parsed, { agencyIdHint: agencyId });

    await logConexaWebhook(supabase, {
      agencyId,
      paymentId: result.paymentId ?? null,
      source: "webhook",
      rawBody,
      parsedChargeId: parsed.chargeId,
      parsedEvent: parsed.kind,
      matchStatus: result.status,
      errorMessage: result.errorMessage ?? null,
    });

    if (result.status === "matched_and_updated" && result.newStatus === "paid" && result.agencyId) {
      await enqueuePaidNotification(
        supabase,
        result.agencyId,
        result.clientId ?? null,
        result.paymentId!,
        parsed.kind === "settled" ? parsed.paidAmount : 0,
      );
    }

    return new Response("OK", { status: 200 });
  }

  // ===== ASAAS: mantém comportamento original =====
  try {
    const { data: settings, error: settingsError } = await supabase
      .from("agency_payment_settings")
      .select("asaas_webhook_token")
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response("Agency not found", { status: 404 });
    }

    const expectedToken = settings.asaas_webhook_token;
    const receivedToken = req.headers.get("asaas-access-token");
    if (!expectedToken || receivedToken !== expectedToken) {
      console.warn(`[payment-webhook] Invalid Asaas token for agency ${agencyId}`);
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const eventName: string = body.event;
    const paymentExternalId: string = body.payment?.id;
    const value: number = body.payment?.value ?? 0;
    const netValue: number = body.payment?.netValue ?? value;

    if (!eventName || !paymentExternalId) {
      console.warn("[payment-webhook] Asaas: missing event or payment id");
      return new Response("OK", { status: 200 });
    }

    const newStatus = ASAAS_EVENT_MAP[eventName];
    if (!newStatus) {
      console.log(`[payment-webhook] Asaas: ignoring event ${eventName}`);
      return new Response("OK", { status: 200 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("client_payments")
      .select("id, status, agency_id, client_id, amount")
      .eq("asaas_payment_id", paymentExternalId)
      .maybeSingle();

    if (paymentError || !payment) {
      console.warn(`[payment-webhook] Asaas payment not found: ${paymentExternalId}`);
      return new Response("OK", { status: 200 });
    }

    if (payment.status === newStatus) {
      return new Response("Already processed", { status: 200 });
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "paid") {
      updateData.amount_paid = value;
      updateData.gateway_fee = Math.round((value - netValue) * 100) / 100;
      const paidTimestamp = body.payment?.paymentDate || new Date().toISOString();
      updateData.paid_at = paidTimestamp;
      updateData.paid_date = paidTimestamp.split("T")[0];
    }

    const { error: updateError } = await supabase
      .from("client_payments")
      .update(updateData)
      .eq("id", payment.id);

    if (updateError) {
      console.error(`[payment-webhook] Asaas update failed for ${payment.id}:`, updateError.message);
      return new Response("OK", { status: 200 });
    }

    if (newStatus === "paid") {
      await enqueuePaidNotification(
        supabase,
        payment.agency_id,
        payment.client_id,
        payment.id,
        value,
      );
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[payment-webhook] Asaas unexpected error:", err);
    return new Response("OK", { status: 200 });
  }
});
