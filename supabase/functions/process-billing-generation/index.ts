import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  generateGatewayChargeForPayment,
  type BillingClient,
  type BillingPayment,
} from "../_shared/billing-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-billing-worker-secret",
};

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MINUTES = [0, 2, 10, 30, 120];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nextRetryAt(attempt: number): string {
  const index = Math.max(
    0,
    Math.min(attempt - 1, RETRY_DELAYS_MINUTES.length - 1),
  );
  const date = new Date();
  date.setMinutes(date.getMinutes() + RETRY_DELAYS_MINUTES[index]);
  return date.toISOString();
}

function isTransientBillingError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return [
    "timeout",
    "network",
    "fetch failed",
    "temporarily",
    "rate limit",
    "too many requests",
    "http 429",
    "http 500",
    "http 502",
    "http 503",
    "http 504",
    "(429)",
    "(500)",
    "(502)",
    "(503)",
    "(504)",
  ].some((needle) => message.includes(needle));
}

async function isVaultWorkerSecretValid(
  supabase: any,
  requestSecret: string | null,
): Promise<boolean> {
  if (!requestSecret) return false;
  try {
    const { data, error } = await supabase.rpc(
      "is_valid_billing_worker_secret",
      {
        p_secret: requestSecret,
      },
    );
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.warn(
      "[billing-generation] Could not validate worker secret:",
      error,
    );
    return false;
  }
}

async function isInternalRequest(
  req: Request,
  supabase: any,
): Promise<boolean> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : "";
  if (serviceKey && bearer === serviceKey) return true;

  const requestSecret = req.headers.get("x-billing-worker-secret");
  const envSecret = Deno.env.get("BILLING_WORKER_SECRET");
  if (requestSecret && envSecret && requestSecret === envSecret) return true;

  return await isVaultWorkerSecretValid(supabase, requestSecret);
}

async function logBillingGeneration(
  supabase: any,
  entry: {
    agencyId: string;
    paymentId: string;
    clientId: string | null;
    billingType: string | null;
    event: string;
    status: string;
    attempt?: number | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from("billing_generation_logs").insert({
      agency_id: entry.agencyId,
      payment_id: entry.paymentId,
      client_id: entry.clientId,
      billing_type: entry.billingType,
      event: entry.event,
      status: entry.status,
      attempt: entry.attempt ?? null,
      message: entry.message ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    console.error("[billing-generation] Failed to write log:", error);
  }
}

async function clearGenerationLock(
  supabase: any,
  paymentId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("client_payments")
    .update({
      ...updates,
      generation_locked_at: null,
      generation_locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (error) throw error;
}

function externalIdFor(payment: BillingPayment): string | null {
  if (payment.billing_type === "asaas") return payment.asaas_payment_id ?? null;
  // Conexa can persist sale/charge ids before every detail URL is available.
  // Route retries through the shared helper so it enriches the existing charge instead of duplicating it.
  if (payment.billing_type === "conexa") return null;
  if (payment.billing_type === "stripe")
    return payment.stripe_checkout_session_id ?? null;
  return null;
}

async function fetchPaymentContext(supabase: any, paymentId: string) {
  const { data: payment, error: paymentError } = await supabase
    .from("client_payments")
    .select(
      `
      *,
      clients!inner(
        id,
        name,
        legal_name,
        email,
        document,
        contact,
        asaas_customer_id,
        conexa_customer_id,
        zip_code,
        street,
        number,
        neighborhood,
        city,
        state,
        complement
      )
    `,
    )
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error(
      `Payment not found after reservation: ${paymentError?.message ?? paymentId}`,
    );
  }

  let settings: Record<string, unknown> = {};
  if (payment.billing_type !== "stripe") {
    const { data, error: settingsError } = await supabase
      .from("agency_payment_settings")
      .select("*")
      .eq("agency_id", payment.agency_id)
      .maybeSingle();

    if (settingsError || !data) {
      throw new Error(
        `Payment settings not found for agency ${payment.agency_id}`,
      );
    }
    settings = data as Record<string, unknown>;
  }

  return {
    payment: payment as BillingPayment,
    client: payment.clients as BillingClient,
    settings,
  };
}

async function processPayment(supabase: any, reservedPayment: BillingPayment) {
  const attempt = Number(reservedPayment.generation_attempts ?? 1);
  let payment = reservedPayment;
  let clientId: string | null = reservedPayment.client_id ?? null;

  await logBillingGeneration(supabase, {
    agencyId: reservedPayment.agency_id,
    paymentId: reservedPayment.id,
    clientId,
    billingType: reservedPayment.billing_type,
    event: "reserved",
    status: "processing",
    attempt,
  });

  try {
    const context = await fetchPaymentContext(supabase, reservedPayment.id);
    payment = context.payment;
    clientId = context.client.id;

    if (!["pending", "overdue"].includes((payment as any).status)) {
      await clearGenerationLock(supabase, payment.id, {
        generation_status: "skipped",
        generation_last_error: "Payment is no longer pending or overdue.",
        generation_next_attempt_at: null,
      });
      await logBillingGeneration(supabase, {
        agencyId: payment.agency_id,
        paymentId: payment.id,
        clientId,
        billingType: payment.billing_type,
        event: "skipped",
        status: "skipped",
        attempt,
        message: "Payment is no longer pending or overdue.",
      });
      return { status: "skipped", paymentId: payment.id };
    }

    const existingExternalId = externalIdFor(payment);
    if (existingExternalId) {
      await clearGenerationLock(supabase, payment.id, {
        generation_status: "generated",
        generation_last_error: null,
        generation_next_attempt_at: null,
        generated_at: new Date().toISOString(),
      });
      await logBillingGeneration(supabase, {
        agencyId: payment.agency_id,
        paymentId: payment.id,
        clientId,
        billingType: payment.billing_type,
        event: "idempotency_hit",
        status: "generated",
        attempt,
        message:
          "External gateway id already exists; no duplicate charge was created.",
        metadata: { externalId: existingExternalId },
      });
      return {
        status: "generated",
        paymentId: payment.id,
        externalId: existingExternalId,
      };
    }

    const result = await generateGatewayChargeForPayment(supabase, {
      payment,
      client: context.client,
      settings: context.settings,
    });

    await clearGenerationLock(supabase, payment.id, {
      ...result.updates,
      generation_status: "generated",
      generation_last_error: null,
      generation_next_attempt_at: null,
      generated_at: new Date().toISOString(),
    });

    await logBillingGeneration(supabase, {
      agencyId: payment.agency_id,
      paymentId: payment.id,
      clientId,
      billingType: payment.billing_type,
      event: "generated",
      status: "generated",
      attempt,
      message: "Gateway charge generated successfully.",
      metadata: {
        gateway: result.gateway,
        externalId: result.externalId ?? null,
      },
    });

    return {
      status: "generated",
      paymentId: payment.id,
      externalId: result.externalId ?? null,
    };
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    const transient = isTransientBillingError(err);
    const canRetry = transient && attempt < MAX_ATTEMPTS;
    const nextStatus = canRetry ? "retrying" : "failed";
    const nextAttemptAt = canRetry ? nextRetryAt(attempt) : null;

    await clearGenerationLock(supabase, payment.id, {
      generation_status: nextStatus,
      generation_last_error: err.message,
      generation_next_attempt_at: nextAttemptAt,
    });

    await logBillingGeneration(supabase, {
      agencyId: payment.agency_id,
      paymentId: payment.id,
      clientId,
      billingType: payment.billing_type,
      event: canRetry ? "retry_scheduled" : "failed",
      status: nextStatus,
      attempt,
      message: err.message,
      metadata: { transient, nextAttemptAt },
    });

    console.error(
      `[billing-generation] Payment ${payment.id} failed:`,
      err.message,
    );
    return {
      status: nextStatus,
      paymentId: payment.id,
      error: err.message,
      nextAttemptAt,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (!(await isInternalRequest(req, supabase))) {
      return jsonResponse(
        { error: "Unauthorized billing generation request" },
        401,
      );
    }

    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.max(1, Math.min(Number(body.limit ?? 5) || 5, 25));
    const workerId = `billing-worker-${crypto.randomUUID()}`;

    const { data: payments, error: reserveError } = await supabase.rpc(
      "reserve_billing_generation_payments",
      {
        p_limit: limit,
        p_worker_id: workerId,
      },
    );

    if (reserveError) throw reserveError;

    const reservedPayments = (payments || []) as BillingPayment[];
    if (reservedPayments.length === 0) {
      return jsonResponse({
        success: true,
        workerId,
        reserved: 0,
        results: [],
        processedAt: new Date().toISOString(),
      });
    }

    const results = [];
    for (const payment of reservedPayments) {
      results.push(await processPayment(supabase, payment));
    }

    return jsonResponse({
      success: true,
      workerId,
      reserved: reservedPayments.length,
      results,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[billing-generation] Fatal error:", error);
    return jsonResponse(
      { error: error.message || "Billing generation failed" },
      500,
    );
  }
});
