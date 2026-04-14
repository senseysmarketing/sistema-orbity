import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ──────────────────────────────────────────────────────────

function getTodayBRT(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  }); // YYYY-MM-DD
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatBRL(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMessage(
  template: string,
  vars: Record<string, string>
): string {
  return template
    .replace(/\{nome_cliente\}/g, vars.nome_cliente ?? "")
    .replace(/\{valor\}/g, vars.valor ?? "")
    .replace(/\{data_vencimento\}/g, vars.data_vencimento ?? "")
    .replace(/\{link_pagamento\}/g, vars.link_pagamento ?? "");
}

type Gateway = "manual" | "conexa" | "asaas";

function resolveGateway(
  paymentBillingType: string | null,
  activeGateway: string
): Gateway {
  const bt = paymentBillingType ?? activeGateway ?? "manual";
  if (["manual", "conexa", "asaas"].includes(bt)) return bt as Gateway;
  return "manual";
}

// ── Main ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const today = getTodayBRT();
  let totalSent = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  console.log(`[billing-reminders] Starting run for date ${today} (BRT)`);

  try {
    // 1. Fetch agencies with billing settings that have WhatsApp notifications enabled
    const { data: settingsRows, error: settingsErr } = await supabase
      .from("agency_payment_settings")
      .select("*")
      .eq("notify_via_whatsapp", true);

    if (settingsErr) throw settingsErr;
    if (!settingsRows || settingsRows.length === 0) {
      console.log("[billing-reminders] No agencies with notify_via_whatsapp enabled");
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const settings of settingsRows) {
      const agencyId = settings.agency_id;

      try {
        // 2. Check for connected WhatsApp account
        const { data: waAccounts } = await supabase
          .from("whatsapp_accounts")
          .select("id")
          .eq("agency_id", agencyId)
          .eq("status", "connected")
          .limit(1);

        if (!waAccounts || waAccounts.length === 0) {
          console.log(`[billing-reminders] Agency ${agencyId}: no connected WhatsApp, skipping`);
          continue;
        }
        const waAccountId = waAccounts[0].id;

        // 3. Check if at least one gateway billing is enabled
        const manualOn = settings.manual_billing_enabled === true;
        const conexaOn = settings.conexa_billing_enabled === true;
        const asaasOn = settings.asaas_billing_enabled === true;
        if (!manualOn && !conexaOn && !asaasOn) {
          console.log(`[billing-reminders] Agency ${agencyId}: all gateway billings disabled, skipping`);
          continue;
        }

        // 4. Compute target dates
        const reminderBeforeDays = settings.reminder_before_days ?? 3;
        const overdueDays = settings.reminder_overdue_days ?? 1;

        const targetDates: { date: string; type: "reminder" | "overdue" }[] = [];

        if (settings.reminder_due_date_enabled) {
          targetDates.push({ date: today, type: "reminder" });
        }
        if (settings.reminder_before_enabled) {
          targetDates.push({
            date: addDays(today, reminderBeforeDays),
            type: "reminder",
          });
        }
        if (settings.reminder_overdue_enabled) {
          targetDates.push({
            date: addDays(today, -overdueDays),
            type: "overdue",
          });
        }

        if (targetDates.length === 0) {
          console.log(`[billing-reminders] Agency ${agencyId}: no reminder rules enabled, skipping`);
          continue;
        }

        const dueDates = [...new Set(targetDates.map((t) => t.date))];

        // 5. Fetch pending payments for those due dates, with client info
        const { data: payments, error: payErr } = await supabase
          .from("client_payments")
          .select("id, client_id, amount, due_date, billing_type, invoice_url, conexa_invoice_url, clients!inner(name, contact, billing_automation_enabled)")
          .eq("agency_id", agencyId)
          .in("status", ["pending", "overdue"])
          .in("due_date", dueDates);

        if (payErr) {
          console.error(`[billing-reminders] Agency ${agencyId}: query error`, payErr);
          continue;
        }
        if (!payments || payments.length === 0) continue;

        // 6. Process each payment
        for (const payment of payments) {
          try {
            const client = payment.clients as any;
            if (!client) continue;

            // Check client-level toggle
            if (client.billing_automation_enabled !== true) {
              totalSkipped++;
              continue;
            }

            // Check phone
            const phone = client.contact;
            if (!phone) {
              totalSkipped++;
              continue;
            }

            // Determine message type for this payment's due_date
            const matchingTarget = targetDates.find(
              (t) => t.date === payment.due_date
            );
            if (!matchingTarget) continue;
            const msgType = matchingTarget.type; // 'reminder' | 'overdue'

            // Resolve gateway and check toggle
            const gw = resolveGateway(payment.billing_type, settings.active_gateway);
            const gwEnabled =
              gw === "manual" ? manualOn : gw === "conexa" ? conexaOn : asaasOn;
            if (!gwEnabled) {
              totalSkipped++;
              continue;
            }

            // Select template
            const templateKey =
              msgType === "reminder"
                ? `${gw}_template_reminder`
                : `${gw}_template_overdue`;
            const template = settings[templateKey] as string | null;
            if (!template || template.trim() === "") {
              totalSkipped++;
              continue;
            }

            // Deduplication
            const dedupType = `billing_${msgType}:${today}`;
            const { data: existing } = await supabase
              .from("notification_tracking")
              .select("id")
              .eq("entity_id", payment.id)
              .eq("notification_type", dedupType)
              .limit(1);

            if (existing && existing.length > 0) {
              totalSkipped++;
              continue;
            }

            // Build payment link
            const paymentLink =
              payment.invoice_url ||
              payment.conexa_invoice_url ||
              "";

            // Format message
            const message = formatMessage(template, {
              nome_cliente: client.name ?? "",
              valor: formatBRL(payment.amount),
              data_vencimento: formatDateBR(payment.due_date),
              link_pagamento: paymentLink,
            });

            // Send via whatsapp-send
            const sendRes = await fetch(
              `${supabaseUrl}/functions/v1/whatsapp-send`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({
                  account_id: waAccountId,
                  phone_number: phone,
                  message,
                }),
              }
            );

            const sendData = await sendRes.json();

            if (!sendRes.ok || !sendData.success) {
              console.error(
                `[billing-reminders] Send failed for payment ${payment.id}:`,
                sendData
              );
              totalErrors++;
            } else {
              // Insert dedup tracking
              // Use a system UUID as user_id placeholder
              const systemUserId = "00000000-0000-0000-0000-000000000000";
              await supabase.from("notification_tracking").insert({
                user_id: systemUserId,
                entity_id: payment.id,
                notification_type: dedupType,
              });

              totalSent++;
              console.log(
                `[billing-reminders] ✅ Sent ${msgType} to ${phone} for payment ${payment.id}`
              );
            }

            // Rate limit: 1s between sends
            await sleep(1000);
          } catch (paymentErr) {
            console.error(
              `[billing-reminders] Error processing payment ${payment.id}:`,
              paymentErr
            );
            totalErrors++;
          }
        }
      } catch (agencyErr) {
        console.error(
          `[billing-reminders] Error processing agency ${agencyId}:`,
          agencyErr
        );
        totalErrors++;
      }
    }
  } catch (globalErr) {
    console.error("[billing-reminders] Global error:", globalErr);
    return new Response(
      JSON.stringify({ ok: false, error: String(globalErr) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const summary = { ok: true, date: today, sent: totalSent, skipped: totalSkipped, errors: totalErrors };
  console.log("[billing-reminders] Run complete:", summary);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
