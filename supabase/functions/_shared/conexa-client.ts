// Cliente compartilhado para a API v2 da Conexa.
// Centraliza chamadas HTTP, parsing de URLs (boleto/Pix), validação de meio
// de faturamento e logging estruturado em conexa_api_logs.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const DEFAULT_TIMEOUT_MS = 15_000;

export interface ConexaCreds {
  baseUrl: string; // https://<sub>.conexa.app/index.php/api/v2
  apiKey: string;
}

export interface InvoicingMethod {
  id: number;
  name: string;
  type: string; // "billet" | "others" | "pix" | ...
  isActive: boolean;
  companyId?: number | null;
}

export interface ChargeDetails {
  chargeId: string;
  chargeUrl: string | null;
  billetUrl: string | null;
  status: string | null;
  raw: any;
}

export interface PixDetails {
  copyPasteCode: string | null;
  qrCode: string | null;
  raw: any;
}

interface LogParams {
  agencyId: string | null;
  paymentId?: string | null;
  clientId?: string | null;
  operation: string;
  endpoint: string;
  httpStatus: number | null;
  success: boolean;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
}

// --- Logging ---

export async function logConexaApi(
  supabase: SupabaseClient,
  entry: LogParams,
): Promise<void> {
  try {
    await supabase.from("conexa_api_logs").insert({
      agency_id: entry.agencyId,
      payment_id: entry.paymentId ?? null,
      client_id: entry.clientId ?? null,
      operation: entry.operation,
      endpoint: entry.endpoint,
      http_status: entry.httpStatus,
      success: entry.success,
      request_payload: sanitizeConexaPayloadForLogs(entry.requestPayload ?? null),
      response_payload: sanitizeConexaPayloadForLogs(entry.responsePayload ?? null),
      error_message: entry.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[conexa-client] Failed to persist api log:", err);
  }
}

export function sanitizeConexaPayloadForLogs(payload: unknown): unknown {
  if (payload === null || payload === undefined) return null;
  try {
    const json = JSON.parse(JSON.stringify(payload));
    stripSecrets(json);
    return json;
  } catch {
    return null;
  }
}

function stripSecrets(node: any): void {
  if (!node || typeof node !== "object") return;
  for (const k of Object.keys(node)) {
    const lower = k.toLowerCase();
    if (
      lower === "authorization" ||
      lower === "apikey" ||
      lower === "api_key" ||
      lower === "token" ||
      lower === "access_token" ||
      lower === "bearer"
    ) {
      node[k] = "***";
      continue;
    }
    if (typeof node[k] === "object") stripSecrets(node[k]);
  }
}

// --- HTTP core ---

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export interface ConexaRequestOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

export async function conexaRequest<T = any>(
  creds: ConexaCreds,
  path: string,
  opts: ConexaRequestOptions = {},
): Promise<{ ok: boolean; status: number; data: T | null; rawText: string }> {
  const method = opts.method ?? "GET";
  const url = `${creds.baseUrl}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };

  const res = await fetchWithTimeout(url, init, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const rawText = await res.text().catch(() => "");
  let data: any = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }
  return { ok: res.ok, status: res.status, data, rawText };
}

// --- Invoicing methods ---

export async function listInvoicingMethods(
  supabase: SupabaseClient,
  creds: ConexaCreds,
  opts: { companyId?: number | null; type?: string; agencyId: string },
): Promise<InvoicingMethod[]> {
  const qs = new URLSearchParams();
  if (opts.companyId) qs.append("companyId[]", String(opts.companyId));
  if (opts.type) qs.append("type", opts.type);
  qs.append("isActive", "1");
  qs.append("limit", "100");
  const path = `/invoicingMethods?${qs.toString()}`;

  const res = await conexaRequest<any>(creds, path, { method: "GET" });

  await logConexaApi(supabase, {
    agencyId: opts.agencyId,
    operation: "invoicing_methods_list",
    endpoint: path,
    httpStatus: res.status,
    success: res.ok,
    responsePayload: res.ok ? res.data : { error: res.rawText.slice(0, 1000) },
    errorMessage: res.ok ? null : `HTTP ${res.status}`,
  });

  if (!res.ok) {
    throw new Error(`Falha ao listar meios de faturamento (${res.status}): ${res.rawText.slice(0, 300)}`);
  }

  const items = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
  return (items as any[]).map((it) => ({
    id: Number(it.id),
    name: String(it.name ?? it.description ?? `#${it.id}`),
    type: String(it.type ?? "others"),
    isActive: it.isActive === true || it.isActive === 1 || it.isActive === "1",
    companyId: it.companyId ?? null,
  }));
}

export async function validateInvoicingMethod(
  supabase: SupabaseClient,
  creds: ConexaCreds,
  opts: {
    invoicingMethodId: number;
    companyId?: number | null;
    agencyId: string;
    expectedType?: string; // default "billet"
  },
): Promise<InvoicingMethod> {
  const list = await listInvoicingMethods(supabase, creds, {
    companyId: opts.companyId ?? null,
    agencyId: opts.agencyId,
    // não filtra por type aqui — queremos achar o método mesmo se ele tiver outro tipo, pra mensagem clara
  });

  const expected = opts.expectedType ?? "billet";
  const found = list.find((m) => m.id === opts.invoicingMethodId);

  await logConexaApi(supabase, {
    agencyId: opts.agencyId,
    operation: "invoicing_method_validate",
    endpoint: `/invoicingMethods#${opts.invoicingMethodId}`,
    httpStatus: 200,
    success: !!(found && found.isActive && found.type === expected),
    requestPayload: { invoicingMethodId: opts.invoicingMethodId, expectedType: expected },
    responsePayload: found ?? null,
    errorMessage: !found
      ? "method_not_found"
      : !found.isActive
        ? "method_inactive"
        : found.type !== expected
          ? `wrong_type:${found.type}`
          : null,
  });

  if (!found) {
    throw new Error(
      `Meio de faturamento ${opts.invoicingMethodId} não encontrado no Conexa. Vá em Configurações → Integrações → Conexa e selecione novamente.`,
    );
  }
  if (!found.isActive) {
    throw new Error(
      `Meio de faturamento "${found.name}" está inativo no Conexa. Ative-o ou selecione outro.`,
    );
  }
  if (found.type !== expected) {
    throw new Error(
      `Meio de faturamento "${found.name}" é do tipo "${found.type}", esperado "${expected}". Selecione um meio do tipo Boleto (ex.: Boleto Gerencianet/Efí).`,
    );
  }
  return found;
}

// --- Charge ---

export interface CreateChargeInput {
  saleId: string | number;
  dueDate: string;
  notes?: string | null;
  invoicingMethodId?: number | null;
}

export async function createConexaCharge(
  supabase: SupabaseClient,
  creds: ConexaCreds,
  input: CreateChargeInput,
  ctx: { agencyId: string; paymentId?: string | null; clientId?: string | null },
): Promise<{ chargeId: string; raw: any }> {
  const body: Record<string, unknown> = {
    salesIds: [Number(input.saleId)],
    dueDate: input.dueDate,
  };
  if (input.notes) body.notes = input.notes;
  if (input.invoicingMethodId) body.invoicingMethodId = input.invoicingMethodId;

  console.log("[Conexa] POST /charge body:", JSON.stringify(body));

  const res = await conexaRequest<any>(creds, "/charge", { method: "POST", body });

  await logConexaApi(supabase, {
    agencyId: ctx.agencyId,
    paymentId: ctx.paymentId ?? null,
    clientId: ctx.clientId ?? null,
    operation: "charge_create",
    endpoint: "/charge",
    httpStatus: res.status,
    success: res.ok,
    requestPayload: body,
    responsePayload: res.ok ? res.data : { error: res.rawText.slice(0, 1500) },
    errorMessage: res.ok ? null : `HTTP ${res.status}`,
  });

  if (!res.ok || !res.data?.id) {
    const raw = res.rawText ?? "";
    if (raw.toLowerCase().includes("invoicingmethod")) {
      throw new Error(
        `Conexa recusou o meio de faturamento informado. Verifique se o meio selecionado está ativo e é do tipo Boleto. Detalhes: ${raw.slice(0, 200)}`,
      );
    }
    throw new Error(`Erro ao criar cobrança no Conexa (${res.status}): ${raw.slice(0, 300)}`);
  }

  return { chargeId: String(res.data.id), raw: res.data };
}

export async function getConexaCharge(
  supabase: SupabaseClient,
  creds: ConexaCreds,
  chargeId: string,
  ctx: { agencyId: string; paymentId?: string | null; clientId?: string | null; operation?: string },
): Promise<ChargeDetails> {
  const path = `/charge/${chargeId}`;
  const res = await conexaRequest<any>(creds, path, { method: "GET" });

  await logConexaApi(supabase, {
    agencyId: ctx.agencyId,
    paymentId: ctx.paymentId ?? null,
    clientId: ctx.clientId ?? null,
    operation: ctx.operation ?? "charge_fetch",
    endpoint: path,
    httpStatus: res.status,
    success: res.ok,
    responsePayload: res.ok ? res.data : { error: res.rawText.slice(0, 1000) },
    errorMessage: res.ok ? null : `HTTP ${res.status}`,
  });

  if (!res.ok || !res.data) {
    return { chargeId, chargeUrl: null, billetUrl: null, status: null, raw: null };
  }

  const d = res.data;
  return {
    chargeId,
    chargeUrl: d.chargeUrl ?? d.charge_url ?? null,
    billetUrl: d.billetUrl ?? d.billet_url ?? null,
    status: d.status ?? null,
    raw: d,
  };
}

export async function getConexaPix(
  supabase: SupabaseClient,
  creds: ConexaCreds,
  chargeId: string,
  ctx: { agencyId: string; paymentId?: string | null; clientId?: string | null },
): Promise<PixDetails | null> {
  const path = `/charge/pix/${chargeId}`;
  const res = await conexaRequest<any>(creds, path, { method: "GET" });

  // Logamos mesmo em erro, mas não joga exceção — Pix é opcional.
  await logConexaApi(supabase, {
    agencyId: ctx.agencyId,
    paymentId: ctx.paymentId ?? null,
    clientId: ctx.clientId ?? null,
    operation: "pix_fetch",
    endpoint: path,
    httpStatus: res.status,
    success: res.ok,
    responsePayload: res.ok ? res.data : { error: res.rawText.slice(0, 600) },
    errorMessage: res.ok ? null : `HTTP ${res.status}`,
  });

  if (!res.ok || !res.data) return null;
  const d = res.data;
  return {
    copyPasteCode: d.copyPasteCode ?? d.copy_paste_code ?? d.pixCopyPaste ?? null,
    qrCode: d.qrCode ?? d.qr_code ?? d.qrCodeImage ?? null,
    raw: d,
  };
}
