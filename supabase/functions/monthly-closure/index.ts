import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonthlyClosureStats {
  paymentsGenerated: number;
  recurringExpensesGenerated: number;
  installmentsGenerated: number;
  salariesGenerated: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Iniciando fechamento mensal automático...');

    // Obter todas as agências ativas
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('is_active', true);

    if (agenciesError) throw agenciesError;

    console.log(`📋 Processando ${agencies?.length || 0} agências`);

    const results = [];

    for (const agency of agencies || []) {
      try {
        const stats = await processAgencyClosure(supabase, agency.id);
        results.push({ agencyId: agency.id, agencyName: agency.name, success: true, stats });
        console.log(`✅ Agência ${agency.name} processada:`, stats);
      } catch (error: any) {
        console.error(`❌ Erro ao processar agência ${agency.name}:`, error.message);
        results.push({ agencyId: agency.id, agencyName: agency.name, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, processedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal no fechamento mensal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processAgencyClosure(supabase: any, agencyId: string): Promise<MonthlyClosureStats> {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const stats: MonthlyClosureStats = {
    paymentsGenerated: 0,
    recurringExpensesGenerated: 0,
    installmentsGenerated: 0,
    salariesGenerated: 0,
  };

  // Verificar se já houve fechamento este mês
  const { data: existingClosure } = await supabase
    .from('monthly_closures')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('closure_month', currentMonth.toISOString().split('T')[0])
    .single();

  if (existingClosure) {
    console.log(`⏭️ Fechamento já realizado para agência ${agencyId} neste mês`);
    return stats;
  }

  // 1. GERAR PAGAMENTOS DE CLIENTES ATIVOS
  const { data: activeClients } = await supabase
    .from('clients')
    .select('id, monthly_value, due_date')
    .eq('agency_id', agencyId)
    .eq('active', true);

  for (const client of activeClients || []) {
    if (!client.monthly_value || client.monthly_value <= 0) continue;

    const dueDay = client.due_date || 10;
    const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dueDay);

    // Verificar se já existe pagamento para este mês
    const { data: existingPayment } = await supabase
      .from('client_payments')
      .select('id')
      .eq('client_id', client.id)
      .eq('agency_id', agencyId)
      .gte('due_date', currentMonth.toISOString().split('T')[0])
      .lt('due_date', new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1).toISOString().split('T')[0])
      .single();

    if (!existingPayment) {
      await supabase.from('client_payments').insert({
        client_id: client.id,
        agency_id: agencyId,
        amount: client.monthly_value,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      });
      stats.paymentsGenerated++;
    }
  }

  // 2. GERAR DESPESAS RECORRENTES
  // Buscar APENAS despesas mestras ATIVAS (sem parent_expense_id e is_active = true)
  const { data: recurringExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('expense_type', 'recorrente')
    .eq('is_active', true)  // Apenas despesas ativas
    .is('parent_expense_id', null);  // Apenas mestras

  for (const expense of recurringExpenses || []) {
    const dueDay = expense.recurrence_day || new Date(expense.due_date).getDate();
    const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dueDay);

    // Verificar se já existe despesa gerada para este mês usando parent_expense_id
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id')
      .eq('parent_expense_id', expense.id)  // Vinculado à mestra pelo ID
      .eq('agency_id', agencyId)
      .gte('due_date', currentMonth.toISOString().split('T')[0])
      .lt('due_date', new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1).toISOString().split('T')[0])
      .single();

    if (!existingExpense) {
      await supabase.from('expenses').insert({
        agency_id: agencyId,
        name: expense.name,
        amount: expense.amount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
        expense_type: 'recorrente',
        category: expense.category,
        description: expense.description,
        recurrence_day: dueDay,
        parent_expense_id: expense.id,  // Vincular à despesa mestra
        is_active: false,  // Instâncias geradas não são mestras
      });
      stats.recurringExpensesGenerated++;
    }
  }

  // 3. GERAR PRÓXIMAS PARCELAS
  const { data: parcelledExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('expense_type', 'parcelada')
    .not('installment_current', 'is', null)
    .not('installment_total', 'is', null)
    .lt('installment_current', supabase.raw('installment_total'));

  for (const expense of parcelledExpenses || []) {
    const nextInstallment = expense.installment_current + 1;
    
    // Verificar se a próxima parcela já foi gerada
    const { data: existingInstallment } = await supabase
      .from('expenses')
      .select('id')
      .eq('parent_expense_id', expense.parent_expense_id || expense.id)
      .eq('installment_current', nextInstallment)
      .single();

    if (!existingInstallment && nextInstallment <= expense.installment_total) {
      const originalDueDate = new Date(expense.due_date);
      const nextDueDate = new Date(
        originalDueDate.getFullYear(),
        originalDueDate.getMonth() + 1,
        originalDueDate.getDate()
      );

      await supabase.from('expenses').insert({
        agency_id: agencyId,
        name: expense.name,
        amount: expense.amount,
        due_date: nextDueDate.toISOString().split('T')[0],
        status: 'pending',
        expense_type: 'parcelada',
        category: expense.category,
        description: expense.description,
        installment_current: nextInstallment,
        installment_total: expense.installment_total,
        parent_expense_id: expense.parent_expense_id || expense.id,
      });
      stats.installmentsGenerated++;
    }
  }

  // 4. GERAR SALÁRIOS (baseado nos salários do mês anterior)
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { data: lastMonthSalaries } = await supabase
    .from('salaries')
    .select('employee_name, amount')
    .eq('agency_id', agencyId)
    .gte('due_date', previousMonth.toISOString().split('T')[0])
    .lt('due_date', currentMonth.toISOString().split('T')[0]);

  for (const salary of lastMonthSalaries || []) {
    const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 5); // Dia 5 do mês

    // Verificar se já existe salário para este funcionário neste mês
    const { data: existingSalary } = await supabase
      .from('salaries')
      .select('id')
      .eq('employee_name', salary.employee_name)
      .eq('agency_id', agencyId)
      .gte('due_date', currentMonth.toISOString().split('T')[0])
      .lt('due_date', new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1).toISOString().split('T')[0])
      .single();

    if (!existingSalary) {
      await supabase.from('salaries').insert({
        agency_id: agencyId,
        employee_name: salary.employee_name,
        amount: salary.amount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      });
      stats.salariesGenerated++;
    }
  }

  // 5. CRIAR SNAPSHOT MENSAL
  await createMonthlySnapshot(supabase, agencyId, currentMonth);

  // 6. REGISTRAR FECHAMENTO
  await supabase.from('monthly_closures').insert({
    agency_id: agencyId,
    closure_month: currentMonth.toISOString().split('T')[0],
    payments_generated: stats.paymentsGenerated,
    recurring_expenses_generated: stats.recurringExpensesGenerated,
    installments_generated: stats.installmentsGenerated,
    salaries_generated: stats.salariesGenerated,
    execution_details: stats,
  });

  return stats;
}

async function createMonthlySnapshot(supabase: any, agencyId: string, month: Date) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  // Pagamentos
  const { data: payments } = await supabase
    .from('client_payments')
    .select('amount, status')
    .eq('agency_id', agencyId)
    .gte('due_date', monthStart.toISOString().split('T')[0])
    .lte('due_date', monthEnd.toISOString().split('T')[0]);

  // Despesas
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, status')
    .eq('agency_id', agencyId)
    .gte('due_date', monthStart.toISOString().split('T')[0])
    .lte('due_date', monthEnd.toISOString().split('T')[0]);

  // Salários
  const { data: salaries } = await supabase
    .from('salaries')
    .select('amount, status')
    .eq('agency_id', agencyId)
    .gte('due_date', monthStart.toISOString().split('T')[0])
    .lte('due_date', monthEnd.toISOString().split('T')[0]);

  // Clientes ativos
  const { count: activeClientsCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('active', true);

  // Calcular métricas
  const totalRevenue = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalExpenses = expenses?.filter(e => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const totalSalaries = salaries?.filter(s => s.status === 'paid').reduce((sum, s) => sum + Number(s.amount), 0) || 0;

  await supabase.from('monthly_snapshots').insert({
    agency_id: agencyId,
    snapshot_month: monthStart.toISOString().split('T')[0],
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    total_salaries: totalSalaries,
    net_profit: totalRevenue - totalExpenses - totalSalaries,
    active_clients_count: activeClientsCount || 0,
    paid_payments_count: payments?.filter(p => p.status === 'paid').length || 0,
    pending_payments_count: payments?.filter(p => p.status === 'pending').length || 0,
    overdue_payments_count: payments?.filter(p => p.status === 'overdue').length || 0,
    paid_expenses_count: expenses?.filter(e => e.status === 'paid').length || 0,
    pending_expenses_count: expenses?.filter(e => e.status === 'pending').length || 0,
    paid_salaries_count: salaries?.filter(s => s.status === 'paid').length || 0,
    pending_salaries_count: salaries?.filter(s => s.status === 'pending').length || 0,
  });
}
