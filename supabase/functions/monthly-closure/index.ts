import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-billing-worker-secret",
};

type BillingType = "manual" | "asaas" | "conexa" | "stripe";

interface MonthlyClosureStats {
  paymentsGenerated: number;
  gatewayJobsPending: number;
  gatewayJobsSkipped: number;
  gatewayJobsFailed: number;
  duplicatesPrevented: number;
  paymentErrors: number;
  recurringExpensesGenerated: number;
  installmentsGenerated: number;
  salariesGenerated: number;
}

interface ClosureContext {
  cycleMonth: string;
  nextMonthStart: string;
  year: number;
  month: number;
  force: boolean;
  dryRun: boolean;
  requestNow: Date;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(Number(day) || 1, 1), lastDayOfMonth(year, month));
}

function addMonthClamped(dateStr: string): string {
  const { year, month, day } = parseDate(dateStr);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return formatDate(nextYear, nextMonth, clampDay(nextYear, nextMonth, day));
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
  };
}

function resolveClosureContext(body: Record<string, unknown>): ClosureContext {
  const requestNow = body.business_now ? new Date(String(body.business_now)) : new Date();
  const force = body.force === true;
  const dryRun = body.dry_run === true;
  const parts = getZonedParts(requestNow, "America/Sao_Paulo");

  const cycleMonth = typeof body.cycle_month === "string" && /^\d{4}-\d{2}-01$/.test(body.cycle_month)
    ? body.cycle_month
    : formatDate(parts.year, parts.month, 1);
  const cycle = parseDate(cycleMonth);
  const nextMonth = cycle.month === 12 ? 1 : cycle.month + 1;
  const nextYear = cycle.month === 12 ? cycle.year + 1 : cycle.year;

  return {
    cycleMonth,
    nextMonthStart: formatDate(nextYear, nextMonth, 1),
    year: cycle.year,
    month: cycle.month,
    force,
    dryRun,
    requestNow,
  };
}

function shouldRunNow(context: ClosureContext): boolean {
  if (context.force || context.dryRun) return true;
  const parts = getZonedParts(context.requestNow, "America/Sao_Paulo");
  return parts.day === 1 && parts.hour === 0;
}

function resolveBillingType(raw: string | null | undefined): BillingType {
  return raw === "asaas" || raw === "conexa" || raw === "stripe" ? raw : "manual";
}

function generationStateForBillingType(billingType: BillingType) {
  if (billingType === "manual") {
    return { generation_status: "skipped", generation_last_error: null };
  }
  if (billingType === "stripe") {
    return {
      generation_status: "failed",
      generation_last_error:
        "Geracao automatica mensal via Stripe ainda nao possui adapter server-to-server seguro. A obrigacao local foi preservada.",
    };
  }
  return { generation_status: "pending", generation_last_error: null };
}

async function isVaultWorkerSecretValid(supabase: any, requestSecret: string | null): Promise<boolean> {
  if (!requestSecret) return false;
  try {
    const { data, error } = await supabase.rpc("is_valid_billing_worker_secret", {
      p_secret: requestSecret,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.warn("[monthly-closure] Could not validate worker secret:", error);
    return false;
  }
}

async function isInternalRequest(req: Request, supabase: any): Promise<boolean> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  if (serviceKey && bearer === serviceKey) return true;

  const requestSecret = req.headers.get("x-billing-worker-secret");
  const envSecret = Deno.env.get("BILLING_WORKER_SECRET");
  if (requestSecret && envSecret && requestSecret === envSecret) return true;

  return await isVaultWorkerSecretValid(supabase, requestSecret);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (!(await isInternalRequest(req, supabase))) {
      return jsonResponse({ error: "Unauthorized monthly closure request" }, 401);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const context = resolveClosureContext(body);

    if (!shouldRunNow(context)) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "outside_monthly_closure_window",
        timezone: "America/Sao_Paulo",
        cycleMonth: context.cycleMonth,
        checkedAt: new Date().toISOString(),
      });
    }

    console.log("[monthly-closure] Starting monthly closure", {
      cycleMonth: context.cycleMonth,
      dryRun: context.dryRun,
      force: context.force,
    });

    const { data: agencies, error: agenciesError } = await supabase
      .from("agencies")
      .select("id, name")
      .eq("is_active", true);

    if (agenciesError) throw agenciesError;

    const results = [];
    for (const agency of agencies || []) {
      try {
        const stats = await processAgencyClosure(supabase, agency.id, context);
        results.push({ agencyId: agency.id, agencyName: agency.name, success: true, stats });
        console.log(`[monthly-closure] Agency ${agency.name} processed`, stats);
      } catch (error: any) {
        console.error(`[monthly-closure] Agency ${agency.name} failed:`, error.message);
        results.push({
          agencyId: agency.id,
          agencyName: agency.name,
          success: false,
          error: error.message,
        });
      }
    }

    return jsonResponse({
      success: true,
      cycleMonth: context.cycleMonth,
      dryRun: context.dryRun,
      results,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[monthly-closure] Fatal error:", error);
    return jsonResponse({ error: error.message || "Monthly closure failed" }, 500);
  }
});

async function processAgencyClosure(
  supabase: any,
  agencyId: string,
  context: ClosureContext,
): Promise<MonthlyClosureStats> {
  const stats: MonthlyClosureStats = {
    paymentsGenerated: 0,
    gatewayJobsPending: 0,
    gatewayJobsSkipped: 0,
    gatewayJobsFailed: 0,
    duplicatesPrevented: 0,
    paymentErrors: 0,
    recurringExpensesGenerated: 0,
    installmentsGenerated: 0,
    salariesGenerated: 0,
  };

  const { data: existingClosure } = await supabase
    .from("monthly_closures")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("closure_month", context.cycleMonth)
    .maybeSingle();

  if (existingClosure) {
    console.log(`[monthly-closure] Closure already exists for agency ${agencyId} and cycle ${context.cycleMonth}`);
    return stats;
  }

  await generateClientPayments(supabase, agencyId, context, stats);
  await generateRecurringExpenses(supabase, agencyId, context, stats);
  await generateInstallments(supabase, agencyId, context, stats);
  await generateSalaries(supabase, agencyId, context, stats);

  if (!context.dryRun) {
    await createMonthlySnapshot(supabase, agencyId, context);

    const { error: closureError } = await supabase.from("monthly_closures").insert({
      agency_id: agencyId,
      closure_month: context.cycleMonth,
      payments_generated: stats.paymentsGenerated,
      recurring_expenses_generated: stats.recurringExpensesGenerated,
      installments_generated: stats.installmentsGenerated,
      salaries_generated: stats.salariesGenerated,
      execution_details: stats,
    });

    if (closureError) throw closureError;
  }

  return stats;
}

async function generateClientPayments(
  supabase: any,
  agencyId: string,
  context: ClosureContext,
  stats: MonthlyClosureStats,
) {
  const { data: activeClients, error } = await supabase
    .from("clients")
    .select("id, monthly_value, due_date, default_billing_type")
    .eq("agency_id", agencyId)
    .eq("active", true);

  if (error) throw error;

  for (const client of activeClients || []) {
    if (!client.monthly_value || Number(client.monthly_value) <= 0) continue;

    const billingType = resolveBillingType(client.default_billing_type);
    const generationState = generationStateForBillingType(billingType);
    const dueDay = clampDay(context.year, context.month, client.due_date || 10);
    const dueDate = formatDate(context.year, context.month, dueDay);

    const paymentPayload = {
      client_id: client.id,
      agency_id: agencyId,
      amount: client.monthly_value,
      due_date: dueDate,
      status: "pending",
      billing_type: billingType,
      source: "monthly_contract",
      billing_cycle_month: context.cycleMonth,
      generation_status: generationState.generation_status,
      generation_last_error: generationState.generation_last_error,
      generation_next_attempt_at: billingType === "asaas" || billingType === "conexa"
        ? new Date().toISOString()
        : null,
    };

    if (context.dryRun) {
      stats.paymentsGenerated++;
      if (billingType === "manual") stats.gatewayJobsSkipped++;
      else if (billingType === "stripe") stats.gatewayJobsFailed++;
      else stats.gatewayJobsPending++;
      continue;
    }

    const { error: insertError } = await supabase.from("client_payments").insert(paymentPayload);

    if (!insertError) {
      stats.paymentsGenerated++;
      if (billingType === "manual") stats.gatewayJobsSkipped++;
      else if (billingType === "stripe") stats.gatewayJobsFailed++;
      else stats.gatewayJobsPending++;
      continue;
    }

    if (insertError.code === "23505") {
      stats.duplicatesPrevented++;
      console.log(`[monthly-closure] Duplicate monthly payment prevented for client ${client.id}`);
      continue;
    }

    stats.paymentErrors++;
    console.error(`[monthly-closure] Failed to create client payment ${client.id}:`, insertError.message);
  }
}

async function generateRecurringExpenses(
  supabase: any,
  agencyId: string,
  context: ClosureContext,
  stats: MonthlyClosureStats,
) {
  const { data: recurringExpenses, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("expense_type", "recorrente")
    .eq("is_active", true)
    .eq("subscription_status", "active")
    .is("parent_expense_id", null);

  if (error) throw error;

  for (const expense of recurringExpenses || []) {
    const dueDay = clampDay(context.year, context.month, expense.recurrence_day || parseDate(expense.due_date).day);
    const dueDate = formatDate(context.year, context.month, dueDay);

    const { data: existingExpense } = await supabase
      .from("expenses")
      .select("id")
      .eq("parent_expense_id", expense.id)
      .eq("agency_id", agencyId)
      .gte("due_date", context.cycleMonth)
      .lt("due_date", context.nextMonthStart)
      .maybeSingle();

    if (existingExpense) continue;
    if (context.dryRun) {
      stats.recurringExpensesGenerated++;
      continue;
    }

    const { error: insertError } = await supabase.from("expenses").insert({
      agency_id: agencyId,
      name: expense.name,
      amount: expense.amount,
      due_date: dueDate,
      status: "pending",
      expense_type: "recorrente",
      category: expense.category,
      description: expense.description,
      recurrence_day: dueDay,
      parent_expense_id: expense.id,
      is_active: false,
    });

    if (insertError) {
      console.error(`[monthly-closure] Failed to create recurring expense ${expense.id}:`, insertError.message);
    } else {
      stats.recurringExpensesGenerated++;
    }
  }
}

async function generateInstallments(
  supabase: any,
  agencyId: string,
  context: ClosureContext,
  stats: MonthlyClosureStats,
) {
  const { data: parcelledExpenses, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("expense_type", "parcelada")
    .not("installment_current", "is", null)
    .not("installment_total", "is", null);

  if (error) throw error;

  for (const expense of parcelledExpenses || []) {
    const nextInstallment = Number(expense.installment_current) + 1;
    if (nextInstallment > Number(expense.installment_total)) continue;

    const { data: existingInstallment } = await supabase
      .from("expenses")
      .select("id")
      .eq("parent_expense_id", expense.parent_expense_id || expense.id)
      .eq("installment_current", nextInstallment)
      .maybeSingle();

    if (existingInstallment) continue;
    if (context.dryRun) {
      stats.installmentsGenerated++;
      continue;
    }

    const { error: insertError } = await supabase.from("expenses").insert({
      agency_id: agencyId,
      name: expense.name,
      amount: expense.amount,
      due_date: addMonthClamped(expense.due_date),
      status: "pending",
      expense_type: "parcelada",
      category: expense.category,
      description: expense.description,
      installment_current: nextInstallment,
      installment_total: expense.installment_total,
      parent_expense_id: expense.parent_expense_id || expense.id,
    });

    if (insertError) {
      console.error(`[monthly-closure] Failed to create installment ${expense.id}:`, insertError.message);
    } else {
      stats.installmentsGenerated++;
    }
  }
}

async function generateSalaries(
  supabase: any,
  agencyId: string,
  context: ClosureContext,
  stats: MonthlyClosureStats,
) {
  const { data: activeEmployees, error } = await supabase
    .from("employees")
    .select("id, name, base_salary, payment_day")
    .eq("agency_id", agencyId)
    .eq("is_active", true);

  if (error) throw error;

  for (const employee of activeEmployees || []) {
    const dueDay = clampDay(context.year, context.month, employee.payment_day || 5);
    const dueDate = formatDate(context.year, context.month, dueDay);

    const { data: existingSalary } = await supabase
      .from("salaries")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("agency_id", agencyId)
      .gte("due_date", context.cycleMonth)
      .lt("due_date", context.nextMonthStart)
      .maybeSingle();

    if (existingSalary) continue;
    if (context.dryRun) {
      stats.salariesGenerated++;
      continue;
    }

    const { error: insertError } = await supabase.from("salaries").insert({
      agency_id: agencyId,
      employee_id: employee.id,
      employee_name: employee.name,
      amount: employee.base_salary,
      due_date: dueDate,
      status: "pending",
    });

    if (insertError) {
      console.error(`[monthly-closure] Failed to create salary ${employee.id}:`, insertError.message);
    } else {
      stats.salariesGenerated++;
    }
  }
}

async function createMonthlySnapshot(supabase: any, agencyId: string, context: ClosureContext) {
  const monthEnd = formatDate(
    context.year,
    context.month,
    lastDayOfMonth(context.year, context.month),
  );

  const { data: payments } = await supabase
    .from("client_payments")
    .select("amount, status")
    .eq("agency_id", agencyId)
    .gte("due_date", context.cycleMonth)
    .lte("due_date", monthEnd);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, status")
    .eq("agency_id", agencyId)
    .gte("due_date", context.cycleMonth)
    .lte("due_date", monthEnd);

  const { data: salaries } = await supabase
    .from("salaries")
    .select("amount, status")
    .eq("agency_id", agencyId)
    .gte("due_date", context.cycleMonth)
    .lte("due_date", monthEnd);

  const { count: activeClientsCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("active", true);

  const pays = (payments || []) as Array<{ status: string; amount: number }>;
  const exps = (expenses || []) as Array<{ status: string; amount: number }>;
  const sals = (salaries || []) as Array<{ status: string; amount: number }>;
  const totalRevenue = pays.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = exps.filter((e) => e.status === "paid").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalSalaries = sals.filter((s) => s.status === "paid").reduce((sum, s) => sum + Number(s.amount), 0);

  const { error } = await supabase.from("monthly_snapshots").insert({
    agency_id: agencyId,
    snapshot_month: context.cycleMonth,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    total_salaries: totalSalaries,
    net_profit: totalRevenue - totalExpenses - totalSalaries,
    active_clients_count: activeClientsCount || 0,
    paid_payments_count: pays.filter((p) => p.status === "paid").length,
    pending_payments_count: pays.filter((p) => p.status === "pending").length,
    overdue_payments_count: pays.filter((p) => p.status === "overdue").length,
    paid_expenses_count: exps.filter((e) => e.status === "paid").length,
    pending_expenses_count: exps.filter((e) => e.status === "pending").length,
    paid_salaries_count: sals.filter((s) => s.status === "paid").length,
    pending_salaries_count: sals.filter((s) => s.status === "pending").length,
  });

  if (error) throw error;
}
