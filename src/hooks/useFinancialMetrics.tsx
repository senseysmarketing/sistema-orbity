import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
export interface Client {
  id: string;
  name: string;
  monthly_value: number | null;
  active: boolean;
  start_date: string | null;
  contact: string | null;
  service: string | null;
  due_date: number;
  observations: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  has_loyalty: boolean;
  cancelled_at: string | null;
  document?: string | null;
  zip_code?: string | null;
  asaas_customer_id?: string | null;
  conexa_customer_id?: string | null;
  default_billing_type?: string | null;
}

export interface ClientPayment {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description?: string | null;
  gateway_fee?: number | null;
  amount_paid?: number | null;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  is_fixed: boolean;
  expense_type?: 'avulsa' | 'recorrente' | 'parcelada';
  category?: string;
  installment_total?: number;
  installment_current?: number;
  recurrence_day?: number;
  description?: string;
  is_active?: boolean;
  parent_expense_id?: string | null;
}

export interface Salary {
  id: string;
  employee_name: string;
  employee_id?: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description?: string | null;
}

export interface Employee {
  id: string;
  name: string;
  base_salary: number;
  role?: string;
  payment_day: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CashFlowItem {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  sourceType: 'client_payment' | 'expense' | 'salary';
  sourceId: string;
  billingType?: string;
}

export interface ClientProfitabilityItem {
  id: string;
  name: string;
  fee: number;
  estimatedCost: number;
  margin: number;
  isAtRisk: boolean;
}

export interface CategoryTotal {
  category: string;
  total: number;
  icon?: string;
  color?: string;
}

// Helper
const wasClientActiveInMonth = (client: Client, monthStr: string): boolean => {
  if (client.active) return true;
  if (client.cancelled_at) {
    const [year, month] = monthStr.split('-').map(Number);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const cancelledDate = new Date(client.cancelled_at);
    return cancelledDate > monthEnd;
  }
  return false;
};

export { wasClientActiveInMonth };

export function useFinancialMetrics(agencyId: string | undefined, selectedMonth: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [year, month] = selectedMonth.split('-').map(Number);
  const startDate = `${selectedMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

  // Previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const _prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  // Queries
  const clientsQuery = useQuery({
    queryKey: ['admin-clients', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, monthly_value, active, start_date, contact, service, due_date, observations, contract_start_date, contract_end_date, has_loyalty, cancelled_at, document, zip_code, asaas_customer_id, conexa_customer_id, default_billing_type')
        .eq('agency_id', agencyId)
        .order('name');
      if (error) throw error;
      return (data || []) as Client[];
    },
    enabled: !!agencyId,
  });

  const paymentsAllQuery = useQuery({
    queryKey: ['admin-payments-all', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('client_payments')
        .select('*')
        .eq('agency_id', agencyId)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return (data || []) as ClientPayment[];
    },
    enabled: !!agencyId,
  });

  const expensesMonthQuery = useQuery({
    queryKey: ['admin-expenses', agencyId, selectedMonth],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category')
        .eq('agency_id', agencyId)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Expense[];
    },
    enabled: !!agencyId,
  });

  const salariesMonthQuery = useQuery({
    queryKey: ['admin-salaries', agencyId, selectedMonth],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('agency_id', agencyId)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Salary[];
    },
    enabled: !!agencyId,
  });

  const employeesQuery = useQuery({
    queryKey: ['admin-employees', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('agency_id', agencyId)
        .order('name');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!agencyId,
  });

  const expenseCategoriesQuery = useQuery({
    queryKey: ['admin-expense-categories', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('agency_id', agencyId)
        .order('name');
      if (error) throw error;
      return (data || []) as ExpenseCategory[];
    },
    enabled: !!agencyId,
  });

  const clients = clientsQuery.data || [];
  const paymentsAll = paymentsAllQuery.data || [];
  const expenses = expensesMonthQuery.data || [];
  const salaries = salariesMonthQuery.data || [];
  const employees = employeesQuery.data || [];
  const expenseCategories = expenseCategoriesQuery.data || [];

  // Payments in selected month
  const paymentsInMonth = useMemo(() => {
    return paymentsAll.filter(p => p.due_date >= startDate && p.due_date <= endDate);
  }, [paymentsAll, startDate, endDate]);

  // MRR - sum of monthly_value for active clients
  const totalMRR = useMemo(() => {
    return clients
      .filter(c => wasClientActiveInMonth(c, selectedMonth))
      .reduce((sum, c) => sum + (c.monthly_value || 0), 0);
  }, [clients, selectedMonth]);

  // Expenses total (exclude cancelled)
  const totalExpenses = useMemo(() => {
    return expenses.filter(e => e.status !== 'cancelled').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Payroll total (exclude cancelled)
  const totalPayroll = useMemo(() => {
    return salaries.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + s.amount, 0);
  }, [salaries]);

  // Burn rate
  const burnRate = totalExpenses + totalPayroll;

  // Profitability (accrual / competência)
  const profitability = totalMRR - burnRate;
  const profitabilityMargin = totalMRR > 0 ? (profitability / totalMRR) * 100 : 0;

  // Paid revenue (cash / caixa)
  const paidRevenue = useMemo(() => {
    return paymentsInMonth
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);
  }, [paymentsInMonth]);

  // Paid costs (cash basis)
  const paidExpenses = useMemo(() => {
    return expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const paidPayroll = useMemo(() => {
    return salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0);
  }, [salaries]);

  const paidBurnRate = paidExpenses + paidPayroll;

  // Real profitability (cash basis)
  const realProfitability = paidRevenue - paidBurnRate;
  const realProfitabilityMargin = paidRevenue > 0 ? (realProfitability / paidRevenue) * 100 : 0;

  // Gateway fees and net revenue from paid payments in month
  const totalGatewayFees = useMemo(() => {
    return paymentsInMonth
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.gateway_fee || 0), 0);
  }, [paymentsInMonth]);

  const totalNetRevenue = useMemo(() => {
    const paidRevenue = paymentsInMonth
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount_paid || p.amount), 0);
    return paidRevenue - totalGatewayFees;
  }, [paymentsInMonth, totalGatewayFees]);

  // Delinquency
  const delinquencyRate = useMemo(() => {
    return paymentsInMonth
      .filter(p => {
        const client = clients.find(c => c.id === p.client_id);
        return p.status === 'overdue' && client && wasClientActiveInMonth(client, selectedMonth);
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [paymentsInMonth, clients, selectedMonth]);

  // Expenses by category (exclude cancelled)
  const expensesByCategory = useMemo((): CategoryTotal[] => {
    const map = new Map<string, { total: number; icon?: string; color?: string }>();

    // Add salary as category
    if (totalPayroll > 0) {
      map.set('Folha de Pagamento', { total: totalPayroll, icon: '👥', color: '#6366f1' });
    }

    expenses.filter(e => e.status !== 'cancelled').forEach(e => {
      const cat = e.category || 'Sem Categoria';
      const existing = map.get(cat) || { total: 0 };
      const categoryInfo = expenseCategories.find(ec => ec.name === cat);
      map.set(cat, {
        total: existing.total + e.amount,
        icon: categoryInfo?.icon || existing.icon,
        color: categoryInfo?.color || existing.color,
      });
    });

    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalPayroll, expenseCategories]);

  const mapStatus = (status: string): CashFlowItem['status'] => {
    if (status === 'paid') return 'PAID';
    if (status === 'overdue') return 'OVERDUE';
    if (status === 'cancelled') return 'CANCELLED';
    return 'PENDING';
  };

  // Unified cash flow
  const unifiedCashFlow = useMemo((): CashFlowItem[] => {
    const items: CashFlowItem[] = [];

    // Payments (income) — include cancelled for visibility
    paymentsInMonth.forEach(p => {
      const client = clients.find(c => c.id === p.client_id);
      if (!client || !wasClientActiveInMonth(client, selectedMonth)) return;
      items.push({
        id: p.id,
        title: client.name,
        amount: p.status === 'paid' ? (p.amount_paid || p.amount) : p.amount,
        dueDate: p.due_date,
        type: 'INCOME',
        status: mapStatus(p.status),
        sourceType: 'client_payment',
        sourceId: p.id,
        billingType: (p as any).billing_type || 'manual',
      });
    });

    // Expenses — include cancelled for visibility
    expenses.forEach(e => {
      items.push({
        id: e.id,
        title: e.name,
        amount: e.amount,
        dueDate: e.due_date,
        type: 'EXPENSE',
        status: mapStatus(e.status),
        sourceType: 'expense',
        sourceId: e.id,
      });
    });

    // Salaries — include cancelled for visibility
    salaries.forEach(s => {
      items.push({
        id: s.id,
        title: `Salário - ${s.employee_name}`,
        amount: s.amount,
        dueDate: s.due_date,
        type: 'EXPENSE',
        status: mapStatus(s.status),
        sourceType: 'salary',
        sourceId: s.id,
      });
    });

    return items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [paymentsInMonth, expenses, salaries, clients, selectedMonth]);

  // Client profitability
  const clientProfitability = useMemo((): ClientProfitabilityItem[] => {
    const activeClients = clients.filter(c => wasClientActiveInMonth(c, selectedMonth) && c.monthly_value);
    const nActiveClients = activeClients.length || 1;
    const costPerClient = burnRate / nActiveClients;

    return activeClients.map(c => {
      const fee = c.monthly_value || 0;
      const margin = fee > 0 ? ((fee - costPerClient) / fee) * 100 : 0;
      return {
        id: c.id,
        name: c.name,
        fee,
        estimatedCost: costPerClient,
        margin,
        isAtRisk: margin < 30,
      };
    }).sort((a, b) => a.margin - b.margin);
  }, [clients, selectedMonth, burnRate]);

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ id, sourceType, paidDate, paidAmount }: { id: string; sourceType: string; paidDate: string; paidAmount: number }) => {
      const table = sourceType === 'client_payment' ? 'client_payments' : sourceType === 'expense' ? 'expenses' : 'salaries';
      
      const updateData: Record<string, any> = {
        status: 'paid',
        paid_date: paidDate,
        amount: paidAmount,
      };

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Baixa registrada", description: "Pagamento registrado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-salaries'] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao dar baixa", description: error.message, variant: "destructive" });
    },
  });

  // Cancel item mutation
  const cancelItemMutation = useMutation({
    mutationFn: async ({ id, sourceType }: { id: string; sourceType: string }) => {
      const table = sourceType === 'client_payment' ? 'client_payments' : sourceType === 'expense' ? 'expenses' : 'salaries';

      const { error } = await supabase
        .from(table)
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Item cancelado", description: "O item foi cancelado e removido do fluxo de caixa." });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-salaries'] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = clientsQuery.isLoading || paymentsAllQuery.isLoading || expensesMonthQuery.isLoading || salariesMonthQuery.isLoading || employeesQuery.isLoading;

  const refetchAll = () => {
    clientsQuery.refetch();
    paymentsAllQuery.refetch();
    expensesMonthQuery.refetch();
    salariesMonthQuery.refetch();
    employeesQuery.refetch();
    expenseCategoriesQuery.refetch();
  };

  return {
    // Raw data
    clients,
    paymentsAll,
    paymentsInMonth,
    expenses,
    salaries,
    employees,
    expenseCategories,

    // Calculated metrics
    totalMRR,
    totalExpenses,
    totalPayroll,
    burnRate,
    profitability,
    profitabilityMargin,
    paidRevenue,
    realProfitability,
    realProfitabilityMargin,
    delinquencyRate,
    totalGatewayFees,
    totalNetRevenue,

    // Structured data
    unifiedCashFlow,
    clientProfitability,
    expensesByCategory,

    // Mutations
    markAsPaid: markAsPaidMutation.mutate,
    isMarkingAsPaid: markAsPaidMutation.isPending,
    cancelItem: cancelItemMutation.mutate,
    isCancellingItem: cancelItemMutation.isPending,

    // Loading
    isLoading,
    refetchAll,
  };
}
