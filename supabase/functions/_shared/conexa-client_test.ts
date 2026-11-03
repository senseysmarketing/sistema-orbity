// Deno unit tests; the _test.ts suffix keeps them outside the Vitest suite.
import {
  normalizeConexaChargeResponse,
  normalizeConexaPixResponse,
} from "./conexa-client.ts";
import { generateConexaCharge } from "./billing-gateway.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fakeSupabase() {
  const updates: Record<string, unknown>[] = [];
  return {
    updates,
    client: {
      from(table: string) {
        return {
          insert: async (_payload: unknown) => ({ error: null }),
          update(payload: Record<string, unknown>) {
            if (table === "client_payments") updates.push(payload);
            return {
              eq: async (_column: string, _value: unknown) => ({ error: null }),
            };
          },
        };
      },
    },
  };
}

const basePayment = {
  id: "00000000-0000-4000-8000-000000000001",
  agency_id: "00000000-0000-4000-8000-000000000002",
  client_id: "00000000-0000-4000-8000-000000000003",
  amount: 100,
  due_date: "2026-11-15",
  description: "Mensalidade",
  billing_type: "conexa",
};

const client = {
  id: basePayment.client_id,
  name: "Cliente Teste",
  email: "cliente@example.com",
  document: "12345678901",
  conexa_customer_id: "99",
};

const settings = {
  conexa_enabled: true,
  conexa_billing_enabled: true,
  conexa_api_key: "test-token",
  conexa_subdomain: "test",
  conexa_default_product_id: 1,
  conexa_unit_id: 1,
  conexa_auto_generate_billet: false,
};

Deno.test("normaliza Pix retornado como array, objeto e vazio", () => {
  const arrayPix = normalizeConexaPixResponse([
    { copyPasteCode: "pix-array", qrCode: "qr-array" },
  ]);
  assert(arrayPix?.copyPasteCode === "pix-array", "Pix em array não foi lido");
  assert(arrayPix?.qrCode === "qr-array", "QR em array não foi lido");

  const objectPix = normalizeConexaPixResponse({
    copy_paste_code: "pix-object",
    qr_code: "qr-object",
  });
  assert(objectPix?.copyPasteCode === "pix-object", "Pix em objeto não foi lido");
  assert(objectPix?.qrCode === "qr-object", "QR em objeto não foi lido");
  assert(normalizeConexaPixResponse([]) === null, "Array vazio deve ser nulo");
  assert(
    normalizeConexaPixResponse({ error: "not available" }) === null,
    "Resposta sem dados Pix deve ser nula",
  );
});

Deno.test("normaliza status do boleto aninhado sem inventar URL", () => {
  const charge = normalizeConexaChargeResponse("test-charge", {
    chargeUrl: "https://conexa.example/charge/test-charge",
    billet: { status: "notGenerated" },
  });
  assert(charge.status === "notGenerated", "Status do boleto não foi preservado");
  assert(charge.billetUrl === null, "URL de cobrança não pode virar URL de boleto");
});

Deno.test("worker persiste IDs e reutiliza cobrança sem POST duplicado", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ method: string; url: string }> = [];
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({ method, url });
    if (method === "POST" && url.endsWith("/sale")) {
      return Promise.resolve(Response.json({ id: 101 }));
    }
    if (method === "POST" && url.endsWith("/charge")) {
      return Promise.resolve(Response.json({ id: 201 }));
    }
    if (url.endsWith("/charge/201")) {
      return Promise.resolve(Response.json({
        chargeUrl: "https://conexa.example/charge/201",
        billet: { status: "notGenerated" },
      }));
    }
    if (url.endsWith("/charge/pix/201")) {
      return Promise.resolve(Response.json([
        { copyPasteCode: "test-pix", qrCode: "test-qr" },
      ]));
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  };

  try {
    const firstDb = fakeSupabase();
    const first = await generateConexaCharge(
      firstDb.client as never,
      basePayment,
      client,
      settings,
    );
    assert(first.externalId === "201", "ID da cobrança não foi retornado");
    assert(
      first.updates.conexa_billing_status === "charge_created_without_billet",
      "Boleto ausente deve ser pendência da cobrança",
    );
    assert(first.updates.conexa_pix_copy_paste === "test-pix", "Pix não foi persistido");
    assert(
      firstDb.updates.some((update) => update.conexa_sale_id === "101"),
      "Venda deve ser persistida antes da cobrança",
    );
    assert(
      firstDb.updates.some((update) => update.conexa_charge_id === "201"),
      "Cobrança deve ser persistida antes do enriquecimento",
    );

    requests.length = 0;
    const retryDb = fakeSupabase();
    await generateConexaCharge(
      retryDb.client as never,
      { ...basePayment, conexa_sale_id: "101", conexa_charge_id: "201" },
      client,
      settings,
    );
    assert(
      requests.every((request) => request.method !== "POST"),
      "Retentativa com IDs existentes não pode criar venda ou cobrança",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("falha após venda mantém sale id para retentativa", async () => {
  const originalFetch = globalThis.fetch;
  let chargeAttempts = 0;
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.endsWith("/sale")) {
      return Promise.resolve(Response.json({ id: 102 }));
    }
    if (method === "POST" && url.endsWith("/charge")) {
      chargeAttempts += 1;
      return Promise.resolve(new Response("temporary failure", { status: 500 }));
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  };

  try {
    const db = fakeSupabase();
    let failed = false;
    try {
      await generateConexaCharge(db.client as never, basePayment, client, settings);
    } catch {
      failed = true;
    }
    assert(failed, "Falha parcial deveria ser propagada");
    assert(chargeAttempts === 1, "Cobrança deve ter uma única tentativa");
    assert(
      db.updates.some((update) => update.conexa_sale_id === "102"),
      "ID da venda deve sobreviver à falha posterior",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
