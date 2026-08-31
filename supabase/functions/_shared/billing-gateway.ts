// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  createConexaCharge,
  getConexaCharge,
  getConexaPix,
  logConexaApi,
  validateInvoicingMethod,
  type ConexaCreds,
} from "./conexa-client.ts";

export type BillingGateway = "manual" | "asaas" | "conexa" | "stripe";

export interface BillingClient {
  id: string;
  name: string;
  legal_name?: string | null;
  email: string | null;
  document: string | null;
  contact?: string | null;
  asaas_customer_id?: string | null;
  conexa_customer_id?: string | null;
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  complement?: string | null;
}

export interface BillingPayment {
  id: string;
  agency_id: string;
  client_id: string;
  amount: number;
  due_date: string;
  description: string | null;
  billing_type: BillingGateway | string | null;
  status?: string | null;
  generation_attempts?: number | null;
  invoice_url?: string | null;
  asaas_payment_id?: string | null;
  conexa_sale_id?: string | null;
  conexa_charge_id?: string | null;
  conexa_invoice_url?: string | null;
  conexa_charge_url?: string | null;
  conexa_billet_url?: string | null;
  stripe_checkout_session_id?: string | null;
}

export interface GatewayGenerationResult {
  gateway: BillingGateway;
  updates: Record<string, unknown>;
  externalId?: string | null;
}

export function resolveAsaasBaseUrl(settings: Record<string, unknown>): string {
  return settings.asaas_sandbox === true
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

export function normalizeDocument(document: string | null | undefined): string {
  return document?.replace(/\D/g, "") ?? "";
}

export function normalizePhone(phone: string | null | undefined): string {
  let cleanPhone = phone?.replace(/\D/g, "") ?? "";
  if (cleanPhone.startsWith("55") && cleanPhone.length > 11) {
    cleanPhone = cleanPhone.substring(2);
  }
  if (cleanPhone.length > 11) {
    cleanPhone = cleanPhone.slice(-11);
  }
  return cleanPhone;
}

function gatewayDescription(
  payment: BillingPayment,
  client: BillingClient,
): string {
  return (
    payment.description ||
    `Contrato mensal - ${client.legal_name?.trim() || client.name}`
  );
}

export async function ensureAsaasCustomer(
  client: BillingClient,
  baseUrl: string,
  apiKey: string,
  adminClient: SupabaseClient,
): Promise<string> {
  if (client.asaas_customer_id) return client.asaas_customer_id;

  const payload: Record<string, unknown> = {
    name: client.legal_name?.trim() || client.name,
  };
  if (client.email) payload.email = client.email;
  if (client.document) payload.cpfCnpj = client.document;

  const res = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Asaas customer creation failed (${res.status}): ${err.slice(0, 500)}`,
    );
  }

  const data = await res.json();
  const customerId = String(data.id ?? "");
  if (!customerId) {
    throw new Error("Asaas did not return a customer id.");
  }

  await adminClient
    .from("clients")
    .update({ asaas_customer_id: customerId })
    .eq("id", client.id);

  return customerId;
}

export async function createAsaasPayment(
  customerId: string,
  amount: number,
  dueDate: string,
  description: string | null,
  settings: Record<string, unknown>,
  baseUrl: string,
  apiKey: string,
) {
  const body: Record<string, unknown> = {
    customer: customerId,
    billingType: "UNDEFINED",
    value: amount,
    dueDate,
    description: description || "Cobranca",
  };

  const fine = Number(settings.default_fine_percentage ?? 0);
  const interest = Number(settings.default_interest_percentage ?? 0);
  const discountPct = Number(settings.discount_percentage ?? 0);
  const discountDays = Number(settings.discount_days_before ?? 0);

  if (fine > 0) body.fine = { value: fine };
  if (interest > 0) body.interest = { value: interest };
  if (discountPct > 0) {
    body.discount = {
      value: discountPct,
      dueDateLimitDays: discountDays || 0,
      type: "PERCENTAGE",
    };
  }

  const res = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Asaas payment creation failed (${res.status}): ${err.slice(0, 500)}`,
    );
  }

  return await res.json();
}

export async function ensureConexaCustomer(
  client: BillingClient,
  baseUrl: string,
  apiKey: string,
  adminClient: SupabaseClient,
  unitId: number,
): Promise<string> {
  if (client.conexa_customer_id) return client.conexa_customer_id;

  if (!Number.isInteger(unitId) || unitId <= 0) {
    throw new Error(
      "ID da Unidade do Conexa nao configurado para esta agencia.",
    );
  }

  const cleanDocument = normalizeDocument(client.document);
  const isCnpj = cleanDocument.length > 11;
  const cleanPhone = normalizePhone(client.contact);
  const addressPayload = client.zip_code
    ? {
        address: {
          zipCode: normalizeDocument(client.zip_code),
          street: client.street || "",
          number: client.number || "S/N",
          neighborhood: client.neighborhood || "",
          city: client.city || "",
          state: client.state || "",
          additionalDetails: client.complement || "",
        },
      }
    : {};

  const customerBody: Record<string, unknown> = {
    companyId: unitId,
    name: client.legal_name?.trim() || client.name,
    emailsFinancialMessages: client.email ? [client.email] : undefined,
    emailsMessage: client.email ? [client.email] : undefined,
    cellNumber: cleanPhone || undefined,
    ...addressPayload,
    ...(cleanDocument && isCnpj
      ? { legalPerson: { cnpj: client.document } }
      : cleanDocument
        ? { naturalPerson: { cpf: client.document } }
        : {}),
  };

  const res = await fetch(`${baseUrl}/customer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(customerBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Conexa customer creation failed (${res.status}): ${errText.slice(0, 500)}`,
    );
  }

  const data = await res.json();
  const customerId = String(data.id ?? "");
  if (!customerId) {
    throw new Error("Conexa did not return a customer id.");
  }

  await adminClient
    .from("clients")
    .update({ conexa_customer_id: customerId })
    .eq("id", client.id);

  return customerId;
}

export async function createConexaSale(
  customerId: string,
  amount: number,
  description: string | null,
  productId: number,
  baseUrl: string,
  apiKey: string,
) {
  const body: Record<string, unknown> = {
    customerId: parseInt(customerId, 10),
    productId,
    quantity: 1,
    amount,
    referenceDate: new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00"),
  };

  if (description) {
    body.notes = description;
  }

  const res = await fetch(`${baseUrl}/sale`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    if (
      err.includes("product") &&
      (err.includes("company") || err.includes("unit"))
    ) {
      throw new Error(
        `Produto Conexa configurado nao pertence a unidade do cliente. Erro original: ${err.slice(0, 300)}`,
      );
    }
    throw new Error(
      `Conexa sale creation failed (${res.status}): ${err.slice(0, 500)}`,
    );
  }

  return await res.json();
}

async function persistPaymentUpdates(
  adminClient: SupabaseClient,
  paymentId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await adminClient
    .from("client_payments")
    .update(updates)
    .eq("id", paymentId);

  if (error) {
    throw new Error(
      `Failed to persist payment gateway state: ${error.message}`,
    );
  }
}

async function generateAsaasCharge(
  adminClient: SupabaseClient,
  payment: BillingPayment,
  client: BillingClient,
  settings: Record<string, unknown>,
): Promise<GatewayGenerationResult> {
  if (payment.asaas_payment_id) {
    return {
      gateway: "asaas",
      externalId: payment.asaas_payment_id,
      updates: { generated_at: new Date().toISOString() },
    };
  }

  if (
    settings.asaas_enabled === false ||
    settings.asaas_billing_enabled === false
  ) {
    throw new Error("Asaas esta desativado para faturamento nesta agencia.");
  }
  if (!settings.asaas_api_key) {
    throw new Error("Asaas API key nao configurada para esta agencia.");
  }

  const baseUrl = resolveAsaasBaseUrl(settings);
  const customerId = await ensureAsaasCustomer(
    client,
    baseUrl,
    String(settings.asaas_api_key),
    adminClient,
  );

  const asaasResponse = await createAsaasPayment(
    customerId,
    Number(payment.amount),
    payment.due_date,
    gatewayDescription(payment, client),
    settings,
    baseUrl,
    String(settings.asaas_api_key),
  );

  const updates = {
    asaas_payment_id: asaasResponse.id || null,
    invoice_url: asaasResponse.invoiceUrl || null,
    pix_copy_paste: asaasResponse.pixCopiaECola || null,
  };

  await persistPaymentUpdates(adminClient, payment.id, updates);

  return {
    gateway: "asaas",
    externalId: updates.asaas_payment_id,
    updates,
  };
}

async function generateConexaCharge(
  adminClient: SupabaseClient,
  payment: BillingPayment,
  client: BillingClient,
  settings: Record<string, unknown>,
): Promise<GatewayGenerationResult> {
  if (
    settings.conexa_enabled === false ||
    settings.conexa_billing_enabled === false
  ) {
    throw new Error("Conexa esta desativado para faturamento nesta agencia.");
  }
  if (!settings.conexa_api_key) {
    throw new Error("Token de acesso do Conexa nao configurado.");
  }
  if (!settings.conexa_subdomain) {
    throw new Error("Subdominio do Conexa nao configurado.");
  }
  if (!settings.conexa_default_product_id) {
    throw new Error("ID do Produto Padrao do Conexa nao configurado.");
  }
  if (!settings.conexa_unit_id) {
    throw new Error("ID da Unidade do Conexa nao configurado.");
  }

  const autoBillet = settings.conexa_auto_generate_billet === true;
  if (autoBillet && !settings.conexa_invoicing_method_id) {
    throw new Error(
      "Auto-geracao de boleto Conexa ativa sem Meio de Faturamento selecionado.",
    );
  }

  const conexaBaseUrl = `https://${settings.conexa_subdomain}.conexa.app/index.php/api/v2`;
  const conexaCreds: ConexaCreds = {
    baseUrl: conexaBaseUrl,
    apiKey: String(settings.conexa_api_key),
  };

  if (autoBillet) {
    await validateInvoicingMethod(adminClient, conexaCreds, {
      invoicingMethodId: Number(settings.conexa_invoicing_method_id),
      companyId: Number(settings.conexa_company_id ?? settings.conexa_unit_id),
      agencyId: payment.agency_id,
      expectedType: "billet",
    });
  }

  let saleId = payment.conexa_sale_id ? String(payment.conexa_sale_id) : null;
  let chargeId = payment.conexa_charge_id
    ? String(payment.conexa_charge_id)
    : null;
  let chargeCreateRaw: unknown = null;

  if (!saleId) {
    let conexaCustomerId = await ensureConexaCustomer(
      client,
      conexaBaseUrl,
      String(settings.conexa_api_key),
      adminClient,
      Number(settings.conexa_unit_id),
    );

    let conexaResponse;
    try {
      conexaResponse = await createConexaSale(
        conexaCustomerId,
        Number(payment.amount),
        gatewayDescription(payment, client),
        Number(settings.conexa_default_product_id),
        conexaBaseUrl,
        String(settings.conexa_api_key),
      );
    } catch (saleError: any) {
      if (!saleError.message?.includes("Customer does not exist")) {
        throw saleError;
      }

      await adminClient
        .from("clients")
        .update({ conexa_customer_id: null })
        .eq("id", client.id);

      conexaCustomerId = await ensureConexaCustomer(
        { ...client, conexa_customer_id: null },
        conexaBaseUrl,
        String(settings.conexa_api_key),
        adminClient,
        Number(settings.conexa_unit_id),
      );

      conexaResponse = await createConexaSale(
        conexaCustomerId,
        Number(payment.amount),
        gatewayDescription(payment, client),
        Number(settings.conexa_default_product_id),
        conexaBaseUrl,
        String(settings.conexa_api_key),
      );
    }

    saleId = conexaResponse.id ? String(conexaResponse.id) : null;
    await logConexaApi(adminClient, {
      agencyId: payment.agency_id,
      paymentId: payment.id,
      clientId: client.id,
      operation: "sale_create",
      endpoint: "/sale",
      httpStatus: 200,
      success: !!saleId,
      responsePayload: conexaResponse,
    });

    if (!saleId) {
      throw new Error("Conexa sale creation did not return sale id.");
    }

    await persistPaymentUpdates(adminClient, payment.id, {
      conexa_sale_id: saleId,
      conexa_billing_status: "sale_created",
    });
  }

  if (!saleId) {
    throw new Error("Conexa sale id unavailable after sale preparation.");
  }

  if (!chargeId) {
    const createdCharge = await createConexaCharge(
      adminClient,
      conexaCreds,
      {
        saleId,
        dueDate: payment.due_date,
        notes: gatewayDescription(payment, client),
        invoicingMethodId: autoBillet
          ? Number(settings.conexa_invoicing_method_id)
          : null,
      },
      {
        agencyId: payment.agency_id,
        paymentId: payment.id,
        clientId: client.id,
      },
    );

    chargeId = createdCharge.chargeId;
    chargeCreateRaw = createdCharge.raw;

    await persistPaymentUpdates(adminClient, payment.id, {
      conexa_charge_id: chargeId,
      conexa_billing_status: "charge_created",
    });
  }

  if (!chargeId) {
    throw new Error("Conexa charge id unavailable after charge preparation.");
  }

  const details = await getConexaCharge(adminClient, conexaCreds, chargeId, {
    agencyId: payment.agency_id,
    paymentId: payment.id,
    clientId: client.id,
  });

  const pix = await getConexaPix(adminClient, conexaCreds, chargeId, {
    agencyId: payment.agency_id,
    paymentId: payment.id,
    clientId: client.id,
  });

  const updates = {
    conexa_sale_id: saleId,
    conexa_charge_id: chargeId,
    conexa_charge_url: details.chargeUrl,
    conexa_invoice_url: details.chargeUrl,
    conexa_billet_url: details.billetUrl,
    conexa_pix_copy_paste: pix?.copyPasteCode ?? null,
    conexa_pix_qr_code: pix?.qrCode ?? null,
    conexa_raw_charge: details.raw ?? chargeCreateRaw,
    conexa_billing_status: details.billetUrl
      ? "billet_available"
      : "charge_created",
    conexa_last_sync_at: new Date().toISOString(),
  };

  await persistPaymentUpdates(adminClient, payment.id, updates);

  return {
    gateway: "conexa",
    externalId: chargeId,
    updates,
  };
}

export async function generateGatewayChargeForPayment(
  adminClient: SupabaseClient,
  args: {
    payment: BillingPayment;
    client: BillingClient;
    settings: Record<string, unknown>;
  },
): Promise<GatewayGenerationResult> {
  const gateway = (args.payment.billing_type || "manual") as BillingGateway;

  if (gateway === "manual") {
    return { gateway, updates: { generation_status: "skipped" } };
  }
  if (gateway === "asaas") {
    return await generateAsaasCharge(
      adminClient,
      args.payment,
      args.client,
      args.settings,
    );
  }
  if (gateway === "conexa") {
    return await generateConexaCharge(
      adminClient,
      args.payment,
      args.client,
      args.settings,
    );
  }
  if (gateway === "stripe") {
    throw new Error(
      "Geracao automatica mensal via Stripe ainda nao possui adapter server-to-server seguro. A obrigacao local foi preservada para cobranca manual/ajuste.",
    );
  }

  throw new Error(`Gateway de faturamento invalido: ${gateway}`);
}
