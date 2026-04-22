import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// IMPORTANT: Inserts run in chunks of 50 to avoid:
// - Trigger cascade timeouts (notify_*, lead history, etc.)
// - DB connection exhaustion under load
// - Webhook event loops (clients table may have downstream listeners)
// Do NOT switch to row-by-row inserts.
const CHUNK_SIZE = 50;

const RowSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
  status: z.enum(["LEAD", "ATIVO"]),
  monthly_fee: z.number().nullable().optional(),
  due_day: z.number().int().min(1).max(31).nullable().optional(),
});

const BodySchema = z.object({
  agency_id: z.string().uuid(),
  job_id: z.string().uuid(),
  rows: z.array(RowSchema).min(1).max(5000),
  sync_gateway: z.boolean().default(false),
  add_to_mrr: z.boolean().default(true),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

interface GatewayConfig {
  asaas_enabled: boolean;
  asaas_api_key: string | null;
  asaas_sandbox: boolean | null;
  conexa_enabled: boolean;
  conexa_token: string | null;
  conexa_subdomain: string | null;
  conexa_unit_id: number | null;
}

async function lookupAsaasByDocument(baseUrl: string, apiKey: string, doc: string): Promise<string | null> {
  try {
    const r = await fetch(`${baseUrl}/v3/customers?cpfCnpj=${encodeURIComponent(doc)}`, {
      headers: { access_token: apiKey },
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (Array.isArray(j?.data) && j.data.length > 0) return String(j.data[0].id);
    return null;
  } catch {
    return null;
  }
}

async function createAsaasCustomer(baseUrl: string, apiKey: string, c: { name: string; email: string | null; document: string | null }): Promise<string> {
  const payload: Record<string, unknown> = { name: c.name };
  if (c.email) payload.email = c.email;
  if (c.document) payload.cpfCnpj = c.document;

  const r = await fetch(`${baseUrl}/v3/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Asaas create failed (${r.status})`);
  const j = await r.json();
  return String(j.id);
}

async function lookupConexaByDocument(baseUrl: string, token: string, doc: string): Promise<string | null> {
  try {
    const r = await fetch(`${baseUrl}/customer?document=${encodeURIComponent(doc)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (Array.isArray(j?.data) && j.data.length > 0) return String(j.data[0].id);
    if (j?.id) return String(j.id);
    return null;
  } catch {
    return null;
  }
}

async function createConexaCustomer(baseUrl: string, token: string, unitId: number, c: { name: string; email: string | null; phone: string | null; document: string | null }): Promise<string> {
  const cleanDoc = c.document?.replace(/\D/g, "") || "";
  const isCnpj = cleanDoc.length > 11;
  let cleanPhone = c.phone?.replace(/\D/g, "") || "";
  if (cleanPhone.startsWith("55") && cleanPhone.length > 11) cleanPhone = cleanPhone.slice(2);
  if (cleanPhone.length > 11) cleanPhone = cleanPhone.slice(-11);

  const body: Record<string, unknown> = {
    companyId: unitId,
    name: c.name,
    emailsFinancialMessages: c.email ? [c.email] : undefined,
    emailsMessage: c.email ? [c.email] : undefined,
    cellNumber: cleanPhone || undefined,
    ...(cleanDoc && isCnpj ? { legalPerson: { cnpj: cleanDoc } } : cleanDoc ? { naturalPerson: { cpf: cleanDoc } } : {}),
  };

  const r = await fetch(`${baseUrl}/customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Conexa create failed (${r.status})`);
  const j = await r.json();
  return String(j.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

    const { agency_id, job_id, rows, sync_gateway, add_to_mrr } = parsed.data;

    // Authorization: must be admin of the agency
    const { data: isAdmin } = await userClient.rpc("is_agency_admin", { agency_uuid: agency_id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load gateway config if needed
    let gw: GatewayConfig | null = null;
    if (sync_gateway) {
      const { data } = await admin
        .from("agency_payment_settings")
        .select("asaas_enabled, asaas_api_key, asaas_sandbox, conexa_enabled, conexa_token, conexa_subdomain, conexa_unit_id")
        .eq("agency_id", agency_id)
        .maybeSingle();
      gw = data as any;
    }

    // Pre-fetch existing clients for idempotency
    const { data: existing } = await admin
      .from("clients")
      .select("id, name, document, asaas_customer_id, conexa_customer_id, monthly_fee")
      .eq("agency_id", agency_id)
      .range(0, 4999);

    const byDoc = new Map<string, any>();
    const byName = new Map<string, any>();
    (existing || []).forEach((c: any) => {
      if (c.document) byDoc.set(String(c.document).replace(/\D/g, ""), c);
      byName.set(normalizeName(c.name), c);
    });

    let processed = 0;
    let success = 0;
    let errors = 0;
    let synced = 0;
    let skipped = 0;
    const errorList: any[] = [];

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const upsertPayloads: any[] = [];
      const chunkRefs: { row: any; existing: any | null }[] = [];

      for (const row of chunk) {
        const docDigits = row.document ? row.document.replace(/\D/g, "") : null;
        const match = (docDigits && byDoc.get(docDigits)) || byName.get(normalizeName(row.name)) || null;

        const isActive = row.status === "ATIVO";
        const payload: any = {
          agency_id,
          name: row.name,
          email: row.email || null,
          contact: row.phone || null,
          document: docDigits || null,
        };
        if (isActive && add_to_mrr) {
          payload.active = true;
          payload.monthly_value = row.monthly_fee ?? null;
          payload.due_date = row.due_day ?? null;
        } else if (!isActive) {
          payload.active = false;
        }
        if (match?.id) payload.id = match.id;

        upsertPayloads.push(payload);
        chunkRefs.push({ row, existing: match });
      }

      const { data: upserted, error: upsertErr } = await admin
        .from("clients")
        .upsert(upsertPayloads, { onConflict: "id" })
        .select("id, name, document, asaas_customer_id, conexa_customer_id");

      if (upsertErr) {
        errors += chunk.length;
        errorList.push({ chunk_start: i, message: upsertErr.message });
      } else {
        success += upserted?.length ?? 0;

        // Refresh in-memory maps with new IDs
        (upserted || []).forEach((c: any) => {
          if (c.document) byDoc.set(String(c.document).replace(/\D/g, ""), c);
          byName.set(normalizeName(c.name), c);
        });

        // Gateway sync (only ACTIVE clients)
        if (sync_gateway && gw) {
          for (let k = 0; k < chunkRefs.length; k++) {
            const { row } = chunkRefs[k];
            if (row.status !== "ATIVO") continue;

            const dbClient = byName.get(normalizeName(row.name));
            if (!dbClient) continue;

            const docDigits = row.document?.replace(/\D/g, "") || "";

            try {
              // Asaas
              if (gw.asaas_enabled && gw.asaas_api_key) {
                if (dbClient.asaas_customer_id) {
                  skipped++;
                } else if (docDigits) {
                  const baseUrl = gw.asaas_sandbox ? "https://api-sandbox.asaas.com" : "https://api.asaas.com";
                  const found = await lookupAsaasByDocument(baseUrl, gw.asaas_api_key, docDigits);
                  if (found) {
                    await admin.from("clients").update({ asaas_customer_id: found }).eq("id", dbClient.id);
                    skipped++;
                  } else {
                    const created = await createAsaasCustomer(baseUrl, gw.asaas_api_key, { name: row.name, email: row.email ?? null, document: docDigits });
                    await admin.from("clients").update({ asaas_customer_id: created }).eq("id", dbClient.id);
                    synced++;
                  }
                } else {
                  errorList.push({ row: row.name, warning: "Sem CPF/CNPJ — não sincronizado no gateway" });
                }
              }
              // Conexa
              else if (gw.conexa_enabled && gw.conexa_token && gw.conexa_subdomain && gw.conexa_unit_id) {
                const baseUrl = `https://${gw.conexa_subdomain}.conexa.app/index.php/api/v2`;
                if (dbClient.conexa_customer_id) {
                  skipped++;
                } else if (docDigits) {
                  const found = await lookupConexaByDocument(baseUrl, gw.conexa_token, docDigits);
                  if (found) {
                    await admin.from("clients").update({ conexa_customer_id: found }).eq("id", dbClient.id);
                    skipped++;
                  } else {
                    const created = await createConexaCustomer(baseUrl, gw.conexa_token, gw.conexa_unit_id, { name: row.name, email: row.email ?? null, phone: row.phone ?? null, document: docDigits });
                    await admin.from("clients").update({ conexa_customer_id: created }).eq("id", dbClient.id);
                    synced++;
                  }
                } else {
                  errorList.push({ row: row.name, warning: "Sem CPF/CNPJ — não sincronizado no gateway" });
                }
              }
            } catch (e: any) {
              errorList.push({ row: row.name, error: e?.message ?? String(e) });
            }
          }
        }
      }

      processed += chunk.length;

      await admin
        .from("import_jobs")
        .update({
          processed_rows: processed,
          success_count: success,
          error_count: errors,
          gateway_synced_count: synced,
          gateway_skipped_count: skipped,
          errors: errorList.slice(0, 500),
        })
        .eq("id", job_id);
    }

    await admin
      .from("import_jobs")
      .update({
        status: "done",
        processed_rows: processed,
        success_count: success,
        error_count: errors,
        gateway_synced_count: synced,
        gateway_skipped_count: skipped,
        errors: errorList.slice(0, 500),
      })
      .eq("id", job_id);

    return json({ ok: true, processed, success, errors, synced, skipped });
  } catch (e: any) {
    console.error("[process-batch-import] error", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});
