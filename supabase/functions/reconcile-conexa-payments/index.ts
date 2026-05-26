// Cron de reconciliação Conexa.
// Roda a cada 30 min. Para cada agência com conexa_enabled=true, busca cobranças
// pending recentes e consulta GET /charge/{id} na Conexa para detectar quitações
// que não chegaram pelo webhook.

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

const PAYMENT_LOOKBACK_DAYS = 60;
const PAYMENT_LOOKAHEAD_DAYS = 7;
const MAX_PAYMENTS_PER_AGENCY = 200;
const FETCH_TIMEOUT_MS = 12_000;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

interface AgencySettings {
  agency_id: string;
  conexa_subdomain: string | null;
  conexa_api_key: string | null;
}

async function reconcileAgency(s: AgencySettings) {
  const summary = {
    agency_id: s.agency_id,
    checked: 0,
    updated_to_paid: 0,
    already_paid: 0,
    api_errors: 0,
    no_change: 0,
  };

  if (!s.conexa_api_key || !s.conexa_subdomain) {
    return { ...summary, skipped: "missing_credentials" as const };
  }

  const baseUrl = `https://${s.conexa_subdomain}.conexa.app/index.php/api/v2`;

  const today = new Date();
  const from = new Date(today.getTime() - PAYMENT_LOOKBACK_DAYS * 86400000);
  const to = new Date(today.getTime() + PAYMENT_LOOKAHEAD_DAYS * 86400000);

  const { data: payments, error } = await supabase
    .from("client_payments")
    .select("id, conexa_charge_id, due_date, agency_id, status")
    .eq("agency_id", s.agency_id)
    .eq("billing_type", "conexa")
    .eq("status", "pending")
    .not("conexa_charge_id", "is", null)
    .gte("due_date", from.toISOString().split("T")[0])
    .lte("due_date", to.toISOString().split("T")[0])
    .order("due_date", { ascending: true })
    .limit(MAX_PAYMENTS_PER_AGENCY);

  if (error) {
    console.error(`[reconcile-conexa] Query failed for agency ${s.agency_id}:`, error.message);
    return { ...summary, skipped: "query_failed" as const, error: error.message };
  }

  if (!payments || payments.length === 0) {
    return summary;
  }

  for (const p of payments) {
    summary.checked += 1;
    try {
      const res = await fetchWithTimeout(
        `${baseUrl}/charge/${p.conexa_charge_id}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${s.conexa_api_key}` },
        },
        FETCH_TIMEOUT_MS,
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        await logConexaWebhook(supabase, {
          agencyId: s.agency_id,
          paymentId: p.id,
          source: "reconcile_cron",
          rawBody: { http_status: res.status, body: text.slice(0, 1000) },
          parsedChargeId: p.conexa_charge_id,
          matchStatus: "cron_api_error",
          errorMessage: `HTTP ${res.status}`,
        });
        summary.api_errors += 1;
        continue;
      }

      const detail = await res.json();
      const parsed = parseConexaPayload(detail);

      if (parsed.kind !== "settled" && parsed.kind !== "cancelled") {
        // Cobrança ainda pendente na Conexa — nada a fazer
        summary.no_change += 1;
        continue;
      }

      const result = await applyConexaPaymentUpdate(supabase, parsed, {
        agencyIdHint: s.agency_id,
      });

      await logConexaWebhook(supabase, {
        agencyId: s.agency_id,
        paymentId: result.paymentId ?? p.id,
        source: "reconcile_cron",
        rawBody: detail,
        parsedChargeId: parsed.chargeId,
        parsedEvent: parsed.kind,
        matchStatus:
          result.status === "matched_and_updated"
            ? "reconciled_by_cron"
            : result.status === "already_processed"
            ? "already_processed"
            : result.status,
        errorMessage: result.errorMessage ?? null,
      });

      if (result.status === "matched_and_updated" && result.newStatus === "paid" && result.agencyId) {
        summary.updated_to_paid += 1;
        await enqueuePaidNotification(
          supabase,
          result.agencyId,
          result.clientId ?? null,
          result.paymentId!,
          parsed.kind === "settled" ? parsed.paidAmount : 0,
        );
      } else if (result.status === "already_processed") {
        summary.already_paid += 1;
      } else {
        summary.no_change += 1;
      }
    } catch (err) {
      await logConexaWebhook(supabase, {
        agencyId: s.agency_id,
        paymentId: p.id,
        source: "reconcile_cron",
        rawBody: { error: (err as Error).message },
        parsedChargeId: p.conexa_charge_id,
        matchStatus: "cron_api_error",
        errorMessage: (err as Error).message,
      });
      summary.api_errors += 1;
    }
  }

  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });

  try {
    const { data: agencies, error } = await supabase
      .from("agency_payment_settings")
      .select("agency_id, conexa_subdomain, conexa_api_key")
      .eq("conexa_enabled", true);

    if (error) {
      console.error("[reconcile-conexa] Failed to fetch agencies:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const ag of agencies ?? []) {
      results.push(await reconcileAgency(ag as AgencySettings));
    }

    return new Response(
      JSON.stringify({ ok: true, ran_at: new Date().toISOString(), agencies: results }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[reconcile-conexa] Unexpected error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
