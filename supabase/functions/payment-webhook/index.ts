import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Event mapping
const ASAAS_EVENT_MAP: Record<string, string> = {
  PAYMENT_RECEIVED: "paid",
  PAYMENT_CONFIRMED: "paid",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "cancelled",
};

const CONEXA_EVENT_MAP: Record<string, string> = {
  "charge.paid": "paid",
  "charge.overdue": "overdue",
  "charge.cancelled": "cancelled",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const gateway = url.searchParams.get("gateway");
    const agencyId = url.searchParams.get("agency_id");

    if (!gateway || !agencyId) {
      return new Response(
        JSON.stringify({ error: "Missing gateway or agency_id" }),
        { status: 400 }
      );
    }

    if (!["asaas", "conexa"].includes(gateway)) {
      return new Response(
        JSON.stringify({ error: "Invalid gateway" }),
        { status: 400 }
      );
    }

    // 1. Fetch agency payment settings for token validation
    const { data: settings, error: settingsError } = await supabase
      .from("agency_payment_settings")
      .select("asaas_webhook_token, conexa_webhook_token")
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error("Settings lookup failed:", settingsError?.message);
      return new Response("Agency not found", { status: 404 });
    }

    // 2. Validate webhook token
    if (gateway === "asaas") {
      const expectedToken = settings.asaas_webhook_token;
      const receivedToken = req.headers.get("asaas-access-token");
      if (!expectedToken || receivedToken !== expectedToken) {
        console.warn(`[payment-webhook] Invalid Asaas token for agency ${agencyId}`);
        return new Response("Unauthorized", { status: 401 });
      }
    } else {
      const expectedToken = settings.conexa_webhook_token;
      const receivedToken =
        req.headers.get("x-conexa-token") ||
        req.headers.get("authorization")?.replace("Bearer ", "");
      if (!expectedToken || receivedToken !== expectedToken) {
        console.warn(`[payment-webhook] Invalid Conexa token for agency ${agencyId}`);
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // 3. Parse payload
    const body = await req.json();
    let eventName: string;
    let paymentExternalId: string;
    let value: number;
    let netValue: number;
    let lookupColumn: string;

    if (gateway === "asaas") {
      eventName = body.event;
      paymentExternalId = body.payment?.id;
      value = body.payment?.value ?? 0;
      netValue = body.payment?.netValue ?? value;
      lookupColumn = "asaas_payment_id";
    } else {
      eventName = body.event;
      paymentExternalId = body.data?.id || body.data?.charge_id;
      value = body.data?.amount ?? body.data?.value ?? 0;
      netValue = body.data?.net_amount ?? body.data?.netValue ?? value;
      lookupColumn = "conexa_charge_id";
    }

    if (!eventName || !paymentExternalId) {
      console.warn("[payment-webhook] Missing event or payment ID in payload");
      return new Response("OK", { status: 200 });
    }

    // 4. Map event to status
    const eventMap = gateway === "asaas" ? ASAAS_EVENT_MAP : CONEXA_EVENT_MAP;
    const newStatus = eventMap[eventName];

    if (!newStatus) {
      // Unknown event — acknowledge silently
      console.log(`[payment-webhook] Ignoring unknown event: ${eventName}`);
      return new Response("OK", { status: 200 });
    }

    // 5. Fetch current payment (idempotency check)
    const { data: payment, error: paymentError } = await supabase
      .from("client_payments")
      .select("id, status, agency_id, client_id, amount")
      .eq(lookupColumn, paymentExternalId)
      .maybeSingle();

    if (paymentError || !payment) {
      console.warn(`[payment-webhook] Payment not found for ${lookupColumn}=${paymentExternalId}`);
      return new Response("OK", { status: 200 });
    }

    // Idempotency: if already in target status, skip
    if (payment.status === newStatus) {
      console.log(`[payment-webhook] Already processed: ${payment.id} is ${newStatus}`);
      return new Response("Already processed", { status: 200 });
    }

    // 6. Update payment
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === "paid") {
      updateData.amount_paid = value;
      updateData.gateway_fee = Math.round((value - netValue) * 100) / 100;
      updateData.paid_date = new Date().toISOString().split("T")[0];
    }

    const { error: updateError } = await supabase
      .from("client_payments")
      .update(updateData)
      .eq("id", payment.id);

    if (updateError) {
      console.error(`[payment-webhook] Update failed for payment ${payment.id}:`, updateError.message);
      return new Response("OK", { status: 200 });
    }

    console.log(`[payment-webhook] Payment ${payment.id} updated to ${newStatus}`);

    // 7. Enqueue notification for PAYMENT_RECEIVED
    if (newStatus === "paid") {
      // Find agency owner
      const { data: owner } = await supabase
        .from("agency_users")
        .select("user_id")
        .eq("agency_id", payment.agency_id)
        .eq("role", "owner")
        .maybeSingle();

      if (owner?.user_id) {
        // Get client name for the notification
        const { data: client } = await supabase
          .from("clients")
          .select("name")
          .eq("id", payment.client_id)
          .maybeSingle();

        const clientName = client?.name ?? "Cliente";
        const formattedAmount = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(netValue);

        await supabase.from("notification_queue").insert({
          agency_id: payment.agency_id,
          user_id: owner.user_id,
          channel: "in_app",
          payload: {
            title: "Pagamento Recebido! 🎉",
            body: `${clientName} pagou ${formattedAmount} via ${gateway === "asaas" ? "Asaas" : "Conexa"}.`,
            type: "payment",
            action_url: "/dashboard/admin",
            payment_id: payment.id,
            gateway,
          },
        });

        console.log(`[payment-webhook] Notification enqueued for owner ${owner.user_id}`);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[payment-webhook] Unexpected error:", err);
    // Always return 200 to prevent gateway retries
    return new Response("OK", { status: 200 });
  }
});
