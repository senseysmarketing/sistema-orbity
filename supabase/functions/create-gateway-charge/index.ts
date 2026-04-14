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

// --------------- Asaas helpers ---------------

async function ensureAsaasCustomer(
  client: { name: string; email: string | null; document: string | null; asaas_customer_id: string | null },
  baseUrl: string,
  apiKey: string,
  adminClient: ReturnType<typeof createClient>,
  clientId: string
): Promise<string> {
  if (client.asaas_customer_id) return client.asaas_customer_id;

  const payload: Record<string, unknown> = { name: client.name };
  if (client.email) payload.email = client.email;
  if (client.document) payload.cpfCnpj = client.document;

  const res = await fetch(`${baseUrl}/v3/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asaas customer creation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const customerId: string = data.id;

  // Persist on clients table (service role to bypass RLS)
  await adminClient
    .from("clients")
    .update({ asaas_customer_id: customerId })
    .eq("id", clientId);

  return customerId;
}

async function createAsaasPayment(
  customerId: string,
  amount: number,
  dueDate: string,
  description: string | null,
  settings: Record<string, unknown>,
  baseUrl: string,
  apiKey: string
) {
  const body: Record<string, unknown> = {
    customer: customerId,
    billingType: "UNDEFINED",
    value: amount,
    dueDate, // yyyy-MM-dd
    description: description || "Cobrança",
  };

  // Financial rules
  const fine = settings.default_fine_percentage as number | null;
  const interest = settings.default_interest_percentage as number | null;
  const discountPct = settings.discount_percentage as number | null;
  const discountDays = settings.discount_days_before as number | null;

  if (fine && fine > 0) body.fine = { value: fine };
  if (interest && interest > 0) body.interest = { value: interest };
  if (discountPct && discountPct > 0) {
    body.discount = {
      value: discountPct,
      dueDateLimitDays: discountDays || 0,
      type: "PERCENTAGE",
    };
  }

  const res = await fetch(`${baseUrl}/v3/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asaas payment creation failed (${res.status}): ${err}`);
  }

  return await res.json();
}

// --------------- Conexa helpers ---------------

async function ensureConexaCustomer(
  client: { name: string; email: string | null; document: string | null; conexa_customer_id: string | null },
  apiKey: string,
  adminClient: ReturnType<typeof createClient>,
  clientId: string
): Promise<string> {
  if (client.conexa_customer_id) return client.conexa_customer_id;

  const payload: Record<string, unknown> = { name: client.name };
  if (client.email) payload.email = client.email;
  if (client.document) payload.cpfCnpj = client.document;

  const res = await fetch("https://api.conexa.app/v1/customers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Conexa customer creation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const customerId: string = data.id;

  await adminClient
    .from("clients")
    .update({ conexa_customer_id: customerId })
    .eq("id", clientId);

  return customerId;
}

async function createConexaCharge(
  customerId: string,
  amount: number,
  dueDate: string,
  description: string | null,
  apiKey: string
) {
  const body: Record<string, unknown> = {
    customerId,
    amount,
    dueDate,
    description: description || "Cobrança",
  };

  const res = await fetch("https://api.conexa.app/v1/charges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Conexa charge creation failed (${res.status}): ${err}`);
  }

  return await res.json();
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

    // 2. Parse & validate input
    const {
      client_id,
      amount,
      due_date,
      description,
      billing_type,
      agency_id,
      status,
      paid_date,
    } = await req.json();

    if (!client_id || !amount || !due_date || !agency_id) {
      return jsonResponse(
        { error: "Missing required fields: client_id, amount, due_date, agency_id" },
        400
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Fetch client data (user-scoped for RLS)
    const { data: client, error: clientError } = await userClient
      .from("clients")
      .select("id, name, email, document, asaas_customer_id, conexa_customer_id")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return jsonResponse({ error: "Client not found or access denied" }, 404);
    }

    // Variables to populate from gateway responses
    let asaas_payment_id: string | null = null;
    let invoice_url: string | null = null;
    let pix_copy_paste: string | null = null;
    let conexa_charge_id: string | null = null;
    let conexa_invoice_url: string | null = null;
    let conexa_pix_copy_paste: string | null = null;
    let gateway_fee: number | null = null;

    const effectiveBillingType = billing_type || "manual";

    // 4. Gateway routing
    if (effectiveBillingType === "asaas" || effectiveBillingType === "conexa") {
      // Fetch agency payment settings (admin to bypass RLS)
      const { data: settings, error: settingsError } = await adminClient
        .from("agency_payment_settings")
        .select("*")
        .eq("agency_id", agency_id)
        .single();

      if (settingsError || !settings) {
        return jsonResponse(
          { error: "Payment settings not found for this agency" },
          422
        );
      }

      if (effectiveBillingType === "asaas") {
        if (!settings.asaas_api_key) {
          return jsonResponse({ error: "Asaas API key not configured" }, 422);
        }

        const baseUrl = settings.asaas_sandbox
          ? "https://sandbox.asaas.com/api"
          : "https://api.asaas.com";

        // 4a. Ensure customer exists in Asaas
        const customerId = await ensureAsaasCustomer(
          client,
          baseUrl,
          settings.asaas_api_key,
          adminClient,
          client_id
        );

        // 4b. Create payment
        const asaasResponse = await createAsaasPayment(
          customerId,
          amount,
          due_date,
          description,
          settings,
          baseUrl,
          settings.asaas_api_key
        );

        // 4c. Capture response data
        asaas_payment_id = asaasResponse.id || null;
        invoice_url = asaasResponse.invoiceUrl || null;
        pix_copy_paste = asaasResponse.pixCopiaECola || null;
      } else if (effectiveBillingType === "conexa") {
        if (!settings.conexa_api_key) {
          return jsonResponse({ error: "Conexa API key not configured" }, 422);
        }

        // 4a. Ensure customer exists in Conexa
        const customerId = await ensureConexaCustomer(
          client,
          settings.conexa_api_key,
          adminClient,
          client_id
        );

        // 4b. Create charge
        const conexaResponse = await createConexaCharge(
          customerId,
          amount,
          due_date,
          description,
          settings.conexa_api_key
        );

        // 4c. Capture response data
        conexa_charge_id = conexaResponse.id || null;
        conexa_invoice_url = conexaResponse.invoiceUrl || null;
        conexa_pix_copy_paste = conexaResponse.pixCopiaECola || null;
      }
    }

    // 5. INSERT into client_payments (always via admin to guarantee write)
    const insertPayload = {
      client_id,
      amount,
      due_date,
      description: description || null,
      billing_type: effectiveBillingType,
      status: status || "pending",
      paid_date: paid_date || null,
      agency_id,
      asaas_payment_id,
      invoice_url,
      pix_copy_paste,
      conexa_charge_id,
      conexa_invoice_url,
      conexa_pix_copy_paste,
      gateway_fee,
    };

    const { data: payment, error: insertError } = await adminClient
      .from("client_payments")
      .insert([insertPayload])
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonResponse(
        { error: "Failed to save payment", details: insertError.message },
        500
      );
    }

    return jsonResponse({ success: true, payment });
  } catch (err: unknown) {
    console.error("Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
