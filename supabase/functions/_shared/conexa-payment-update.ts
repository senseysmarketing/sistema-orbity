// Helper compartilhado: aplica atualização de pagamento Conexa.
// Usado pelo webhook (payment-webhook) e pelo cron (reconcile-conexa-payments).
// O objetivo é manter EXATAMENTE a mesma lógica de update em ambos os caminhos.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

export type ConexaParseResult =
  | {
      kind: "settled";
      chargeId: string;
      paidAmount: number;
      paidAt: string; // ISO timestamp
    }
  | {
      kind: "cancelled";
      chargeId: string;
    }
  | {
      kind: "unknown_event";
      chargeId: string | null;
    }
  | {
      kind: "invalid_payload";
      reason: string;
    };

// --- Helpers de extração tolerantes ---

function pickString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = getDeep(obj, k);
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v);
    }
  }
  return null;
}

function pickNumber(obj: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = getDeep(obj, k);
    if (v === undefined || v === null || v === "") continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function getDeep(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function normalizeIsoDate(raw: string): string {
  // Aceita ISO completo, "YYYY-MM-DD HH:MM:SS" e "YYYY-MM-DD".
  // Retorna ISO timestamp.
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }
  // Se for "YYYY-MM-DD HH:MM:SS" sem timezone, assume UTC.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}.000Z`;
  }
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}

const SETTLED_STATUSES = new Set([
  "paid",
  "quitado",
  "quitada",
  "liquidado",
  "liquidada",
  "settled",
  "pago",
]);

const CANCELLED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "cancelado",
  "cancelada",
  "excluded",
  "excluido",
  "excluída",
  "deleted",
  "deletado",
]);

const CHARGE_ID_KEYS = [
  "chargeId",
  "id",
  "charge.id",
  "charge.chargeId",
  "cobrancaId",
  "numeroCobranca",
  "codigoCobranca",
  "cobranca.id",
  "data.chargeId",
  "data.id",
  "data.charge.id",
];

const PAID_AMOUNT_KEYS = [
  "paidAmount",
  "paid_amount",
  "valorPago",
  "valor_pago",
  "amountPaid",
  "amount_paid",
  "charge.paidAmount",
  "data.paidAmount",
];

const PAID_DATE_KEYS = [
  "paymentOperationDate",
  "payment_operation_date",
  "paymentDate",
  "payment_date",
  "dataPagamento",
  "data_pagamento",
  "dataQuitacao",
  "data_quitacao",
  "quitacaoDate",
  "settledAt",
  "settled_at",
  "charge.paymentDate",
  "data.paymentDate",
];

const AMOUNT_KEYS = ["amount", "valor", "value", "charge.amount"];
const STATUS_KEYS = ["status", "situacao", "charge.status", "data.status"];

export function parseConexaPayload(body: any): ConexaParseResult {
  if (!body || typeof body !== "object") {
    return { kind: "invalid_payload", reason: "body_not_object" };
  }

  const chargeId = pickString(body, CHARGE_ID_KEYS);
  const status = pickString(body, STATUS_KEYS)?.toLowerCase() ?? null;
  const paidAmount = pickNumber(body, PAID_AMOUNT_KEYS);
  const paidDateRaw = pickString(body, PAID_DATE_KEYS);
  const amount = pickNumber(body, AMOUNT_KEYS);

  // Quitação: tem valor pago + data, OU status "pago/quitado" com algum valor.
  if (paidAmount !== null && paidDateRaw) {
    if (!chargeId) return { kind: "invalid_payload", reason: "missing_charge_id" };
    return {
      kind: "settled",
      chargeId,
      paidAmount,
      paidAt: normalizeIsoDate(paidDateRaw),
    };
  }

  if (status && SETTLED_STATUSES.has(status)) {
    if (!chargeId) return { kind: "invalid_payload", reason: "missing_charge_id" };
    return {
      kind: "settled",
      chargeId,
      paidAmount: paidAmount ?? amount ?? 0,
      paidAt: paidDateRaw ? normalizeIsoDate(paidDateRaw) : new Date().toISOString(),
    };
  }

  if (status && CANCELLED_STATUSES.has(status)) {
    if (!chargeId) return { kind: "invalid_payload", reason: "missing_charge_id" };
    return { kind: "cancelled", chargeId };
  }

  return { kind: "unknown_event", chargeId: chargeId ?? null };
}

// --- Update compartilhado ---

export interface ApplyResult {
  status:
    | "matched_and_updated"
    | "already_processed"
    | "payment_not_found"
    | "update_error";
  paymentId?: string;
  agencyId?: string;
  clientId?: string;
  newStatus?: "paid" | "cancelled";
  errorMessage?: string;
}

export async function applyConexaPaymentUpdate(
  supabase: SupabaseClient,
  parsed: Extract<ConexaParseResult, { kind: "settled" } | { kind: "cancelled" }>,
  opts: { agencyIdHint?: string | null } = {},
): Promise<ApplyResult> {
  const newStatus = parsed.kind === "settled" ? "paid" : "cancelled";

  // Lookup do pagamento por conexa_charge_id (escopado por agência quando possível)
  let query = supabase
    .from("client_payments")
    .select("id, status, agency_id, client_id, amount")
    .eq("conexa_charge_id", parsed.chargeId);

  if (opts.agencyIdHint) {
    query = query.eq("agency_id", opts.agencyIdHint);
  }

  const { data: payment, error: paymentError } = await query.maybeSingle();

  if (paymentError) {
    return {
      status: "update_error",
      errorMessage: `lookup_failed: ${paymentError.message}`,
    };
  }
  if (!payment) {
    return { status: "payment_not_found" };
  }

  if (payment.status === newStatus) {
    return {
      status: "already_processed",
      paymentId: payment.id,
      agencyId: payment.agency_id,
      clientId: payment.client_id,
      newStatus,
    };
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (parsed.kind === "settled") {
    updateData.amount_paid = parsed.paidAmount;
    updateData.paid_at = parsed.paidAt;
    updateData.paid_date = parsed.paidAt.split("T")[0];
  }

  const { error: updateError } = await supabase
    .from("client_payments")
    .update(updateData)
    .eq("id", payment.id);

  if (updateError) {
    return {
      status: "update_error",
      paymentId: payment.id,
      agencyId: payment.agency_id,
      errorMessage: `update_failed: ${updateError.message}`,
    };
  }

  return {
    status: "matched_and_updated",
    paymentId: payment.id,
    agencyId: payment.agency_id,
    clientId: payment.client_id,
    newStatus,
  };
}

export async function enqueuePaidNotification(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string | null,
  paymentId: string,
  amount: number,
) {
  const { data: owner } = await supabase
    .from("agency_users")
    .select("user_id")
    .eq("agency_id", agencyId)
    .eq("role", "owner")
    .maybeSingle();

  if (!owner?.user_id) return;

  let clientName = "Cliente";
  if (clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .maybeSingle();
    if (client?.name) clientName = client.name;
  }

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);

  await supabase.from("notification_queue").insert({
    agency_id: agencyId,
    user_id: owner.user_id,
    channel: "in_app",
    payload: {
      title: "Pagamento Recebido! 🎉",
      body: `${clientName} pagou ${formattedAmount} via Conexa.`,
      type: "payment",
      action_url: "/dashboard/admin",
      payment_id: paymentId,
      gateway: "conexa",
    },
  });
}

export async function logConexaWebhook(
  supabase: SupabaseClient,
  entry: {
    agencyId: string | null;
    paymentId?: string | null;
    source: "webhook" | "reconcile_cron";
    rawBody: unknown;
    headers?: Record<string, string>;
    parsedChargeId?: string | null;
    parsedEvent?: string | null;
    matchStatus: string;
    errorMessage?: string | null;
  },
) {
  try {
    await supabase.from("conexa_webhook_log").insert({
      agency_id: entry.agencyId,
      payment_id: entry.paymentId ?? null,
      source: entry.source,
      raw_body: entry.rawBody ?? null,
      headers: entry.headers ?? null,
      parsed_charge_id: entry.parsedChargeId ?? null,
      parsed_event: entry.parsedEvent ?? null,
      match_status: entry.matchStatus,
      error_message: entry.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[conexa-log] Failed to persist audit log:", err);
  }
}
