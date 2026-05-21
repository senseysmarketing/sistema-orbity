import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { assertAgencyAccess, HttpError } from '../_shared/auth.ts';

interface PeriodRow {
  id: string;
  agency_id: string;
  start_date: string;
  end_date: string;
  status: string;
  ppr_percent: number;
  bonus_pool_mode: string;
  bonus_pool_manual_amount: number | null;
  profit_target: number;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthsBetween(start: string, end: string): Array<{ start: string; end: string }> {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  const out: Array<{ start: string; end: string }> = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0));
    // Clamp to period
    const s = ymd(monthStart) < start ? start : ymd(monthStart);
    const e = ymd(monthEnd) > end ? end : ymd(monthEnd);
    out.push({ start: s, end: e });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function effDate(row: { paid_at: string | null; paid_date: string | null }): string | null {
  if (row.paid_at) return row.paid_at.slice(0, 10);
  return row.paid_date;
}

function revenueValue(row: { amount: number; amount_paid: number | null }): number {
  const ap = row.amount_paid;
  if (ap !== null && ap !== undefined && Number(ap) > 0) return Number(ap);
  return Number(row.amount);
}

function buildSnapshot(items: any[], valueFn: (r: any) => number) {
  const list = items.map((r) => ({
    id: r.id,
    amount: valueFn(r),
    date: effDate(r),
  }));
  return {
    count: list.length,
    total: list.reduce((s, r) => s + r.amount, 0),
    items: list,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let periodId: string | null = null;
  let periodAgencyId: string | null = null;
  let actorUserId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body.action || 'recalculate';
    periodId = body.period_id;

    if (!periodId) throw new HttpError(400, 'period_id is required');

    // Load period
    const { data: period, error: pErr } = await supabase
      .from('bonus_periods')
      .select('*')
      .eq('id', periodId)
      .maybeSingle();
    if (pErr || !period) throw new HttpError(404, 'Period not found');

    const p = period as PeriodRow;
    periodAgencyId = p.agency_id;

    // Authorize
    const auth = await assertAgencyAccess(req, supabase as any, p.agency_id, ['owner', 'admin']);
    actorUserId = auth.user?.id || null;

    if (action === 'recalculate' && p.status === 'closed') {
      throw new HttpError(400, 'Cannot recalculate a closed period');
    }

    // Handle reopen action without recalculation
    if (action === 'reopen') {
      const reason = String(body.reason || '').trim();
      if (!reason) throw new HttpError(400, 'reason is required');
      if (p.status !== 'closed') throw new HttpError(400, 'Period is not closed');
      const { error: rErr } = await supabase
        .from('bonus_periods')
        .update({ status: 'open', closed_at: null, closed_by: null, updated_at: new Date().toISOString() })
        .eq('id', p.id);
      if (rErr) throw new Error(`reopen: ${rErr.message}`);
      await supabase.from('ppr_calculation_logs').insert({
        period_id: p.id,
        agency_id: p.agency_id,
        action: 'period_reopened',
        details: { reason },
        actor_user_id: actorUserId,
      });
      return new Response(
        JSON.stringify({ ok: true, period_id: p.id, action: 'reopen' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Compute monthly buckets
    const buckets = monthsBetween(p.start_date, p.end_date);

    // Fetch all payments/expenses/salaries/adjustments within the full period at once
    const [paymentsRes, expensesRes, salariesRes, adjustmentsRes] = await Promise.all([
      supabase
        .from('client_payments')
        .select('id, amount, amount_paid, paid_at, paid_date, status')
        .eq('agency_id', p.agency_id)
        .eq('status', 'paid')
        .range(0, 4999),
      supabase
        .from('expenses')
        .select('id, amount, paid_at, paid_date, status')
        .eq('agency_id', p.agency_id)
        .eq('status', 'paid')
        .range(0, 4999),
      supabase
        .from('salaries')
        .select('id, amount, paid_at, paid_date, status')
        .eq('agency_id', p.agency_id)
        .eq('status', 'paid')
        .range(0, 4999),
      supabase
        .from('ppr_financial_adjustments')
        .select('id, amount, adjustment_type, effective_date')
        .eq('agency_id', p.agency_id)
        .gte('effective_date', p.start_date)
        .lte('effective_date', p.end_date)
        .range(0, 4999),
    ]);

    if (paymentsRes.error) throw new Error(`payments: ${paymentsRes.error.message}`);
    if (expensesRes.error) throw new Error(`expenses: ${expensesRes.error.message}`);
    if (salariesRes.error) throw new Error(`salaries: ${salariesRes.error.message}`);
    if (adjustmentsRes.error) throw new Error(`adjustments: ${adjustmentsRes.error.message}`);

    const allPayments = paymentsRes.data || [];
    const allExpenses = expensesRes.data || [];
    const allSalaries = salariesRes.data || [];
    const allAdjustments = adjustmentsRes.data || [];

    let totalProfit = 0;
    const monthRows: any[] = [];

    for (const b of buckets) {
      const inRange = <T extends { paid_at?: any; paid_date?: any }>(r: T) => {
        const d = effDate(r as any);
        return d !== null && d >= b.start && d <= b.end;
      };
      const payments = allPayments.filter(inRange);
      const expenses = allExpenses.filter(inRange);
      const salaries = allSalaries.filter(inRange);
      const adjustments = allAdjustments.filter(
        (a: any) => a.effective_date >= b.start && a.effective_date <= b.end,
      );

      const revenue = payments.reduce((s, r: any) => s + revenueValue(r), 0);
      const expensesTotal = expenses.reduce((s, r: any) => s + Number(r.amount), 0);
      const salariesTotal = salaries.reduce((s, r: any) => s + Number(r.amount), 0);
      const adjTotal = adjustments.reduce((s, r: any) => {
        const sign = r.adjustment_type === 'revenue_adjustment' ? 1
          : r.adjustment_type === 'expense_adjustment' ? -1
          : r.adjustment_type === 'salary_adjustment' ? -1
          : 1;
        return s + sign * Number(r.amount);
      }, 0);

      const netProfit = revenue - expensesTotal - salariesTotal + adjTotal;
      totalProfit += netProfit;

      const snapshot = {
        client_payments: buildSnapshot(payments, revenueValue),
        expenses: buildSnapshot(expenses, (r: any) => Number(r.amount)),
        salaries: buildSnapshot(salaries, (r: any) => Number(r.amount)),
        adjustments: {
          count: adjustments.length,
          total: adjTotal,
          items: adjustments.map((r: any) => ({
            id: r.id,
            amount: Number(r.amount),
            type: r.adjustment_type,
            date: r.effective_date,
          })),
        },
      };

      monthRows.push({
        period_id: p.id,
        agency_id: p.agency_id,
        month_start: b.start,
        month_end: b.end,
        revenue,
        expenses: expensesTotal,
        salaries: salariesTotal,
        adjustments: adjTotal,
        net_profit: netProfit,
        bonus_pool: 0, // filled below per-period only
        source_snapshot: snapshot,
        calculated_at: new Date().toISOString(),
      });
    }

    // Compute pool
    let pool = 0;
    if (p.bonus_pool_mode === 'manual') {
      pool = Math.max(0, Number(p.bonus_pool_manual_amount || 0));
    } else {
      pool = Math.max(0, totalProfit * (Number(p.ppr_percent) / 100));
    }

    // Distribute pool proportionally across months (by net_profit share, only positive months)
    const positiveProfitSum = monthRows.reduce((s, m) => s + (m.net_profit > 0 ? m.net_profit : 0), 0);
    if (positiveProfitSum > 0 && pool > 0) {
      for (const m of monthRows) {
        m.bonus_pool = m.net_profit > 0 ? (m.net_profit / positiveProfitSum) * pool : 0;
      }
    }

    // Upsert period months
    const { error: upMonthsErr } = await supabase
      .from('ppr_period_months')
      .upsert(monthRows, { onConflict: 'period_id,month_start' });
    if (upMonthsErr) throw new Error(`upsert months: ${upMonthsErr.message}`);

    // Eligible employees
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, name, eligibility_weight, is_active, eligible_for_ppr')
      .eq('agency_id', p.agency_id)
      .eq('is_active', true)
      .eq('eligible_for_ppr', true);
    if (empErr) throw new Error(`employees: ${empErr.message}`);

    const eligible = (employees || []).filter((e: any) => Number(e.eligibility_weight) > 0);
    const totalWeight = eligible.reduce((s: number, e: any) => s + Number(e.eligibility_weight), 0);

    // Scorecards for period
    const { data: scorecards } = await supabase
      .from('employee_scorecards')
      .select('employee_id, weighted_average')
      .eq('period_id', p.id);
    const scoreMap = new Map<string, number>();
    for (const s of scorecards || []) {
      scoreMap.set((s as any).employee_id, Number((s as any).weighted_average) || 0);
    }

    const employeeRows: any[] = [];
    for (const e of eligible) {
      const w = Number(e.eligibility_weight);
      const baseShare = totalWeight > 0 ? pool * w / totalWeight : 0;
      const scoreFinal = scoreMap.get(e.id) ?? 0;
      const bonus = Math.max(0, baseShare * scoreFinal / 10);
      employeeRows.push({
        period_id: p.id,
        agency_id: p.agency_id,
        employee_id: e.id,
        eligibility_weight: w,
        base_share: baseShare,
        score_final: scoreFinal,
        bonus_amount: bonus,
        calculation_details: {
          pool,
          total_weight: totalWeight,
          score_source: scoreMap.has(e.id) ? 'scorecard' : 'missing',
          name: e.name,
        },
        calculated_at: new Date().toISOString(),
      });
    }

    if (employeeRows.length > 0) {
      const { error: empUpErr } = await supabase
        .from('ppr_employee_results')
        .upsert(employeeRows, { onConflict: 'period_id,employee_id' });
      if (empUpErr) throw new Error(`upsert employees: ${empUpErr.message}`);
    }

    // Build period snapshot
    const periodSnapshot = {
      computed_at: new Date().toISOString(),
      profit_actual: totalProfit,
      bonus_pool: pool,
      months: monthRows.map((m) => ({
        month_start: m.month_start,
        revenue: m.revenue,
        expenses: m.expenses,
        salaries: m.salaries,
        adjustments: m.adjustments,
        net_profit: m.net_profit,
        bonus_pool: m.bonus_pool,
      })),
      employees: employeeRows.map((e) => ({
        employee_id: e.employee_id,
        weight: e.eligibility_weight,
        base_share: e.base_share,
        score_final: e.score_final,
        bonus_amount: e.bonus_amount,
      })),
    };

    // Close action handling
    const isClose = action === 'close';
    const updatePayload: any = {
      profit_actual: totalProfit,
      bonus_pool_amount: pool,
      calculated_at: new Date().toISOString(),
      calculation_status: 'calculated',
      calculation_error: null,
      calculation_snapshot: periodSnapshot,
      updated_at: new Date().toISOString(),
    };
    if (isClose) {
      updatePayload.status = 'closed';
      updatePayload.closed_at = new Date().toISOString();
      updatePayload.closed_by = actorUserId;
    }

    const { error: upPeriodErr } = await supabase
      .from('bonus_periods')
      .update(updatePayload)
      .eq('id', p.id);
    if (upPeriodErr) throw new Error(`update period: ${upPeriodErr.message}`);

    if (isClose) {
      await supabase
        .from('employee_scorecards')
        .update({ status: 'locked', locked_at: new Date().toISOString() })
        .eq('period_id', p.id);
    }

    // Log
    await supabase.from('ppr_calculation_logs').insert({
      period_id: p.id,
      agency_id: p.agency_id,
      action: isClose ? 'period_closed' : 'period_recalculated',
      details: {
        profit_actual: totalProfit,
        bonus_pool: pool,
        months_count: monthRows.length,
        employees_count: employeeRows.length,
      },
      actor_user_id: actorUserId,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        period_id: p.id,
        profit_actual: totalProfit,
        bonus_pool: pool,
        months: monthRows.length,
        employees: employeeRows.length,
        snapshot: periodSnapshot,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err?.message || 'Internal error';

    // Persist error state if we have a period
    if (periodId) {
      try {
        await supabase
          .from('bonus_periods')
          .update({
            calculation_status: 'error',
            calculation_error: message.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('id', periodId);
        if (periodAgencyId) {
          await supabase.from('ppr_calculation_logs').insert({
            period_id: periodId,
            agency_id: periodAgencyId,
            action: 'calculation_failed',
            details: { error: message },
            actor_user_id: actorUserId,
          });
        }
      } catch (_) { /* swallow */ }
    }

    console.error('[calculate-ppr-period] error', message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
