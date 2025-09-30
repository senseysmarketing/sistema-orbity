import { useState, useEffect, useMemo } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertCircle, Building, Filter, Banknote, Eye, Edit, Trash2, MoreHorizontal, Calendar, ArrowUpDown, Search, BarChart3, Target, Activity, Timer, Users, CreditCard, Receipt, Wallet, PieChart, FileText, AlertTriangle, CheckCircle, TrendingUp as TrendingUpIcon, Settings, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLimitEnforcement } from "@/hooks/useLimitEnforcement";
import { ClientForm } from "@/components/admin/ClientForm";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { SalaryForm } from "@/components/admin/SalaryForm";
interface Client {
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
}
interface ClientPayment {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}
interface Expense {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  is_fixed: boolean;
}
interface Salary {
  id: string;
  employee_name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}
export default function Admin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Form states
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [salaryFormOpen, setSalaryFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Payment states
  const [selectedPayment, setSelectedPayment] = useState<ClientPayment | null>(null);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [paymentDeleteDialogOpen, setPaymentDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<ClientPayment | null>(null);

  // Expense states
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(false);
  const [expenseDeleteDialogOpen, setExpenseDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [valueRangeFilter, setValueRangeFilter] = useState<string>("all");

  // Sort states
  const [clientSort, setClientSort] = useState<'name' | 'monthly_value' | 'start_date'>('name');
  const [paymentSort, setPaymentSort] = useState<'client' | 'amount' | 'due_date' | 'status'>('due_date');
  const [expenseSort, setExpenseSort] = useState<'name' | 'amount' | 'due_date' | 'status'>('due_date');
  
  // View mode for clients, payments and expenses
  const [clientViewMode, setClientViewMode] = useState<"cards" | "table">("cards");
  const [paymentViewMode, setPaymentViewMode] = useState<"cards" | "table">("cards");
  const [expenseViewMode, setExpenseViewMode] = useState<"cards" | "table">("cards");
  const {
    profile
  } = useAuth();
  const {
    toast
  } = useToast();
  const { checkLimitWithWarning } = useLimitEnforcement();

  // Verifica se o usuário tem permissão para acessar a página
  const hasAccess = profile?.role === 'agency_admin';
  useEffect(() => {
    if (hasAccess) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasAccess, selectedMonth, clientSort, paymentSort, expenseSort]);
  const fetchData = async () => {
    try {
      await Promise.all([fetchClients(), fetchPayments(), fetchExpenses(), fetchSalaries()]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchClients = async () => {
    const {
      data,
      error
    } = await supabase.from('clients').select('id, name, monthly_value, active, start_date, contact, service, due_date, observations, contract_start_date, contract_end_date, has_loyalty').order(clientSort);
    if (error) throw error;
    setClients(data || []);
  };

  // Função para atualizar status dos pagamentos automaticamente
  const updatePaymentStatuses = async () => {
    const currentDate = new Date().toISOString().split('T')[0];
    try {
      const {
        error
      } = await supabase.from('client_payments').update({
        status: 'overdue'
      }).lt('due_date', currentDate).eq('status', 'pending');
      if (error) {
        console.error('Erro ao atualizar status dos pagamentos:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status dos pagamentos:', error);
    }
  };
  const fetchPayments = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // último dia do mês

    // Primeiro atualizar os status automáticamente
    await updatePaymentStatuses();
    const {
      data,
      error
    } = await supabase.from('client_payments').select('*').gte('due_date', startDate).lte('due_date', endDate).order(paymentSort, {
      ascending: paymentSort === 'status' ? true : false
    });
    if (error) throw error;
    setPayments(data || []);
  };
  const fetchExpenses = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // último dia do mês

    const {
      data,
      error
    } = await supabase.from('expenses').select('*').gte('due_date', startDate).lte('due_date', endDate).order(expenseSort, {
      ascending: expenseSort === 'status' ? true : false
    });
    if (error) throw error;
    setExpenses(data || []);
  };
  const fetchSalaries = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // último dia do mês

    const {
      data,
      error
    } = await supabase.from('salaries').select('*').gte('due_date', startDate).lte('due_date', endDate).order('due_date', {
      ascending: false
    });
    if (error) throw error;
    setSalaries(data || []);
  };
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente desconhecido';
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Atrasado';
      default:
        return status;
    }
  };
  
  // Função para cor de fundo do card baseada no status do pagamento
  const getPaymentCardBackgroundColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50/50 dark:bg-green-950/20';
      case 'pending':
        return 'bg-yellow-50/50 dark:bg-yellow-950/20';
      case 'overdue':
        return 'bg-red-50/50 dark:bg-red-950/20';
      default:
        return 'bg-gray-50/50 dark:bg-gray-950/20';
    }
  };
  
  // Função para cor de fundo do card baseada no status da despesa
  const getExpenseCardBackgroundColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50/50 dark:bg-green-950/20';
      case 'pending':
        return 'bg-yellow-50/50 dark:bg-yellow-950/20';
      case 'overdue':
        return 'bg-red-50/50 dark:bg-red-950/20';
      default:
        return 'bg-gray-50/50 dark:bg-gray-950/20';
    }
  };
  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setClientFormOpen(true);
  };
  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setClientDetailsOpen(true);
  };
  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };
  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      const {
        error
      } = await supabase.from('clients').delete().eq('id', clientToDelete.id);
      if (error) throw error;
      toast({
        title: "Cliente excluído",
        description: "Cliente excluído com sucesso!"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };
  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: 'pending' | 'paid' | 'overdue') => {
    try {
      const updateData: any = {
        status: newStatus
      };
      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.paid_date = null;
      }
      const {
        error
      } = await supabase.from('client_payments').update(updateData).eq('id', paymentId);
      if (error) throw error;
      toast({
        title: "Status atualizado",
        description: "Status do pagamento foi atualizado com sucesso"
      });
      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Payment handlers
  const handleViewPayment = (payment: ClientPayment) => {
    setSelectedPayment(payment);
    setPaymentDetailsOpen(true);
  };
  
  const handleEditPayment = (payment: ClientPayment) => {
    setSelectedPayment(payment);
    setPaymentFormOpen(true);
  };
  
  const handleDeletePayment = (payment: ClientPayment) => {
    setPaymentToDelete(payment);
    setPaymentDeleteDialogOpen(true);
  };
  
  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      const { error } = await supabase
        .from('client_payments')
        .delete()
        .eq('id', paymentToDelete.id);
      if (error) throw error;
      toast({
        title: "Pagamento excluído",
        description: "Pagamento excluído com sucesso!"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPaymentDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  // Expense handlers
  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseFormOpen(true);
  };
  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseDetailsOpen(true);
  };
  const handleDeleteExpense = (expense: Expense) => {
    setExpenseToDelete(expense);
    setExpenseDeleteDialogOpen(true);
  };
  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      const {
        error
      } = await supabase.from('expenses').delete().eq('id', expenseToDelete.id);
      if (error) throw error;
      toast({
        title: "Despesa excluída",
        description: "Despesa excluída com sucesso!"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setExpenseDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  // Função para fechar o mês
  const closeMonth = async () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    try {
      // Gerar pagamentos para o próximo mês para todos os clientes ativos
      const activeClients = clients.filter(client => client.active && client.monthly_value);
      for (const client of activeClients) {
        // Calcular próximo mês
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

        // Calcular data de vencimento para o próximo mês
        const dueDate = new Date(nextYear, nextMonth, client.due_date || 1);

        // Verificar se já existe pagamento para este mês
        const {
          data: existingPayment
        } = await supabase.from('client_payments').select('id').eq('client_id', client.id).gte('due_date', `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`).lt('due_date', `${nextYear}-${String(nextMonth + 2).padStart(2, '0')}-01`).single();
        if (!existingPayment) {
          const {
            error
          } = await supabase.from('client_payments').insert([{
            client_id: client.id,
            amount: client.monthly_value,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending'
          }]);
          if (error) {
            console.error(`Erro ao criar pagamento para cliente ${client.name}:`, error);
          }
        }
      }
      toast({
        title: "Mês fechado com sucesso",
        description: "Pagamentos do próximo mês foram gerados automaticamente."
      });

      // Recarregar dados
      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Erro ao fechar mês",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  // Função para atualizar status das despesas
  const handleUpdateExpenseStatus = async (expenseId: string, newStatus: 'pending' | 'paid' | 'overdue') => {
    try {
      const updateData: any = {
        status: newStatus
      };
      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.paid_date = null;
      }
      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId);
      if (error) throw error;
      toast({
        title: "Status atualizado",
        description: "Status da despesa foi atualizado com sucesso"
      });
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Dados filtrados
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const clientName = getClientName(payment.client_id).toLowerCase();
      const matchesSearch = clientName.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      const matchesClient = clientFilter === 'all' || payment.client_id === clientFilter;
      let matchesValueRange = true;
      if (valueRangeFilter !== 'all') {
        switch (valueRangeFilter) {
          case 'low':
            matchesValueRange = payment.amount < 1000;
            break;
          case 'medium':
            matchesValueRange = payment.amount >= 1000 && payment.amount < 2000;
            break;
          case 'high':
            matchesValueRange = payment.amount >= 2000;
            break;
        }
      }
      return matchesSearch && matchesStatus && matchesClient && matchesValueRange;
    });
  }, [payments, searchTerm, statusFilter, clientFilter, valueRangeFilter]);
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const matchesType = paymentTypeFilter === 'all' || paymentTypeFilter === 'fixed' && expense.is_fixed || paymentTypeFilter === 'variable' && !expense.is_fixed;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [expenses, searchTerm, statusFilter, paymentTypeFilter]);
  const filteredSalaries = useMemo(() => {
    return salaries.filter(salary => {
      const matchesSearch = salary.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || salary.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [salaries, searchTerm, statusFilter]);

  // Lista combinada de despesas e salários para exibição na aba de despesas
  const combinedExpensesAndSalaries = useMemo(() => {
    const mappedExpenses = expenses.map(expense => ({
      ...expense,
      type: 'expense' as const,
      employee_name: undefined
    }));
    
    const mappedSalaries = salaries.map(salary => ({
      ...salary,
      type: 'salary' as const,
      name: `Salário - ${salary.employee_name}`,
      is_fixed: true
    }));
    
    const combined = [...mappedExpenses, ...mappedSalaries];
    
    return combined.filter(item => {
      const itemName = item.type === 'salary' ? item.employee_name || '' : item.name;
      const matchesSearch = itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = paymentTypeFilter === 'all' || 
        (paymentTypeFilter === 'fixed' && item.is_fixed) || 
        (paymentTypeFilter === 'variable' && !item.is_fixed) ||
        (paymentTypeFilter === 'salary' && item.type === 'salary');
      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [expenses, salaries, searchTerm, statusFilter, paymentTypeFilter]);

  // Análises e métricas avançadas
  const analytics = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Análise de pagamentos
    const paidPayments = filteredPayments.filter(p => p.status === 'paid');
    const pendingPayments = filteredPayments.filter(p => p.status === 'pending');
    const overduePayments = filteredPayments.filter(p => p.status === 'overdue');
    const totalReceived = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    // Análise de despesas
    const paidExpenses = filteredExpenses.filter(e => e.status === 'paid');
    const pendingExpenses = filteredExpenses.filter(e => e.status === 'pending');
    const fixedExpenses = filteredExpenses.filter(e => e.is_fixed);
    const variableExpenses = filteredExpenses.filter(e => !e.is_fixed);
    const totalExpensesPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Análise de clientes
    const activeClients = clients.filter(c => c.active);
    const inactiveClients = clients.filter(c => !c.active);
    const avgClientValue = activeClients.length > 0 ? activeClients.reduce((sum, c) => sum + (c.monthly_value || 0), 0) / activeClients.length : 0;

    
    // Análise de fidelidade
    const loyaltyClients = clients.filter(c => c.has_loyalty && c.contract_end_date);
    const nonLoyaltyClients = clients.filter(c => !c.has_loyalty);
    
    // Alertas de fidelidade próxima do fim
    const loyaltyAlerts = {
      ending7Days: [],
      ending30Days: [],
      expired: []
    };

    loyaltyClients.forEach(client => {
      if (client.contract_end_date) {
        const endDate = new Date(client.contract_end_date);
        const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilEnd < 0) {
          loyaltyAlerts.expired.push(client);
        } else if (daysUntilEnd <= 7) {
          loyaltyAlerts.ending7Days.push(client);
        } else if (daysUntilEnd <= 30) {
          loyaltyAlerts.ending30Days.push(client);
        }
      }
    });

    // Taxa de conversão de pagamentos
    const paymentConversionRate = filteredPayments.length > 0 ? paidPayments.length / filteredPayments.length * 100 : 0;

    // Insight automático
    let insights = [];
    if (overduePayments.length > 0) {
      insights.push(`${overduePayments.length} pagamento(s) em atraso precisam de atenção`);
    }
    if (paymentConversionRate < 80) {
      insights.push(`Taxa de conversão de pagamentos em ${paymentConversionRate.toFixed(1)}% - abaixo do ideal`);
    }
    if (totalExpensesPending > totalPending) {
      insights.push('Despesas pendentes excedem receitas pendentes');
    }
    
    // Insights de fidelidade
    if (loyaltyAlerts.expired.length > 0) {
      insights.push(`${loyaltyAlerts.expired.length} contrato(s) de fidelidade vencido(s)`);
    }
    if (loyaltyAlerts.ending7Days.length > 0) {
      insights.push(`${loyaltyAlerts.ending7Days.length} contrato(s) vencendo em 7 dias`);
    }
    if (loyaltyAlerts.ending30Days.length > 0) {
      insights.push(`${loyaltyAlerts.ending30Days.length} contrato(s) vencendo em 30 dias`);
    }
    return {
      totalReceived,
      totalPending,
      totalOverdue,
      totalExpensesPaid,
      totalExpensesPending,
      activeClients: activeClients.length,
      inactiveClients: inactiveClients.length,
      avgClientValue,
      paymentConversionRate,
      fixedExpensesCount: fixedExpenses.length,
      variableExpensesCount: variableExpenses.length,
      loyaltyClients: loyaltyClients.length,
      nonLoyaltyClients: nonLoyaltyClients.length,
      loyaltyAlerts,
      insights,
      paymentStats: {
        paid: paidPayments.length,
        pending: pendingPayments.length,
        overdue: overduePayments.length
      },
      expenseStats: {
        paid: paidExpenses.length,
        pending: pendingExpenses.length,
        fixed: fixedExpenses.length,
        variable: variableExpenses.length
      }
    };
  }, [filteredPayments, filteredExpenses, clients]);

  // Cálculos financeiros
  const totalReceivable = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalReceived = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSalaries = salaries.reduce((sum, s) => sum + s.amount, 0);
  const totalCosts = totalExpenses + totalSalaries;
  const monthlyRevenue = clients.filter(c => c.active).reduce((sum, c) => sum + (c.monthly_value || 0), 0);
  const netProfit = monthlyRevenue - totalCosts;
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setClientFilter("all");
    setPaymentTypeFilter("all");
    setValueRangeFilter("all");
  };
  if (!hasAccess) {
    return <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground text-center">
              Esta página é restrita apenas para administradores.
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Dashboard completo para gestão financeira e administrativa
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({
                length: 12
              }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric'
                });
                return <SelectItem key={value} value={value}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>;
              })}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={closeMonth} variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Fechar Mês
          </Button>
        </div>
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Estatísticas Principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {monthlyRevenue.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.activeClients} contratos ativos
                </p>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Ticket médio</div>
                  <div className="text-sm font-medium">
                    R$ {analytics.avgClientValue.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recebido</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {analytics.totalReceived.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.paymentStats.paid} pagamentos confirmados
                </p>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Taxa de conversão</div>
                  <div className="text-sm font-medium">
                    {analytics.paymentConversionRate.toFixed(1)}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {analytics.totalPending.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.paymentStats.pending} pagamentos pendentes
                </p>
                {analytics.totalOverdue > 0 && <div className="mt-2">
                    <div className="text-xs text-red-600">Em atraso</div>
                    <div className="text-sm font-medium text-red-600">
                      R$ {analytics.totalOverdue.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                    </div>
                  </div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {netProfit.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                </div>
                <p className="text-xs text-muted-foreground">
                  receita - custos
                </p>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Margem</div>
                  <div className="text-sm font-medium">
                    {monthlyRevenue > 0 ? (netProfit / monthlyRevenue * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fidelidade</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.loyaltyClients}
                </div>
                <p className="text-xs text-muted-foreground">
                  clientes com fidelidade
                </p>
                <div className="mt-2 space-y-1">
                  {analytics.loyaltyAlerts.ending7Days.length > 0 && (
                    <div className="text-xs text-red-600">
                      {analytics.loyaltyAlerts.ending7Days.length} vencendo em 7 dias
                    </div>
                  )}
                  {analytics.loyaltyAlerts.ending30Days.length > 0 && (
                    <div className="text-xs text-orange-600">
                      {analytics.loyaltyAlerts.ending30Days.length} vencendo em 30 dias
                    </div>
                  )}
                  {analytics.loyaltyAlerts.expired.length > 0 && (
                    <div className="text-xs text-red-700 font-medium">
                      {analytics.loyaltyAlerts.expired.length} vencido(s)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Performance */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição de Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      Pagos
                    </span>
                    <span>{analytics.paymentStats.paid}</span>
                  </div>
                  <Progress value={analytics.paymentStats.paid / Math.max(1, analytics.paymentStats.paid + analytics.paymentStats.pending + analytics.paymentStats.overdue) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      Pendentes
                    </span>
                    <span>{analytics.paymentStats.pending}</span>
                  </div>
                  <Progress value={analytics.paymentStats.pending / Math.max(1, analytics.paymentStats.paid + analytics.paymentStats.pending + analytics.paymentStats.overdue) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      Atrasados
                    </span>
                    <span>{analytics.paymentStats.overdue}</span>
                  </div>
                  <Progress value={analytics.paymentStats.overdue / Math.max(1, analytics.paymentStats.paid + analytics.paymentStats.pending + analytics.paymentStats.overdue) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Análise de Despesas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      Fixas
                    </span>
                    <span>{analytics.fixedExpensesCount}</span>
                  </div>
                  <Progress value={analytics.fixedExpensesCount / Math.max(1, analytics.fixedExpensesCount + analytics.variableExpensesCount) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      Variáveis
                    </span>
                    <span>{analytics.variableExpensesCount}</span>
                  </div>
                  <Progress value={analytics.variableExpensesCount / Math.max(1, analytics.fixedExpensesCount + analytics.variableExpensesCount) * 100} className="h-2" />
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium mb-1">Total de Despesas</div>
                  <div className="text-lg font-bold">
                    R$ {(analytics.totalExpensesPaid + analytics.totalExpensesPending).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights Automáticos */}
          {analytics.insights.length > 0 && <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Insights & Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.insights.map((insight, index) => <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">{insight}</span>
                    </div>)}
                </div>
              </CardContent>
            </Card>}

          {/* Alertas de Fidelidade */}
          {(analytics.loyaltyAlerts.ending7Days.length > 0 || 
            analytics.loyaltyAlerts.ending30Days.length > 0 || 
            analytics.loyaltyAlerts.expired.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Alertas de Fidelidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.loyaltyAlerts.expired.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Contratos Vencidos ({analytics.loyaltyAlerts.expired.length})
                      </h4>
                      <div className="space-y-1">
                        {analytics.loyaltyAlerts.expired.map((client) => (
                          <div key={client.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                            <span className="text-sm font-medium">{client.name}</span>
                            <span className="text-xs text-red-600">
                              Venceu em {client.contract_end_date ? new Date(client.contract_end_date).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.loyaltyAlerts.ending7Days.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-orange-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Vencendo em 7 dias ({analytics.loyaltyAlerts.ending7Days.length})
                      </h4>
                      <div className="space-y-1">
                        {analytics.loyaltyAlerts.ending7Days.map((client) => (
                          <div key={client.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                            <span className="text-sm font-medium">{client.name}</span>
                            <span className="text-xs text-orange-600">
                              Vence em {client.contract_end_date ? new Date(client.contract_end_date).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.loyaltyAlerts.ending30Days.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-700 flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Vencendo em 30 dias ({analytics.loyaltyAlerts.ending30Days.length})
                      </h4>
                      <div className="space-y-1">
                        {analytics.loyaltyAlerts.ending30Days.map((client) => (
                          <div key={client.id} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                            <span className="text-sm font-medium">{client.name}</span>
                            <span className="text-xs text-yellow-600">
                              Vence em {client.contract_end_date ? new Date(client.contract_end_date).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          {/* Filtros para Clientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros e Busca - Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar clientes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Clientes */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Clientes ({clients.length})</h3>
            <div className="flex gap-2">
              <div className="flex gap-1">
                <Button
                  variant={clientViewMode === 'cards' ? 'action' : 'outline'}
                  size="sm"
                  onClick={() => setClientViewMode('cards')}
                >
                  Cards
                </Button>
                <Button
                  variant={clientViewMode === 'table' ? 'action' : 'outline'}
                  size="sm"
                  onClick={() => setClientViewMode('table')}
                >
                  Tabela
                </Button>
              </div>
              <Button 
                variant="action"
                onClick={() => {
                  const canAdd = checkLimitWithWarning('clients', clients.length + 1);
                  if (canAdd) {
                    setSelectedClient(null);
                    setClientFormOpen(true);
                  }
                }} 
                className="flex items-center gap-2"
                disabled={!checkLimitWithWarning('clients', clients.length + 1)}
              >
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          </div>

          {/* Visualização Cards vs Tabela */}
          {clientViewMode === "cards" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clients.map(client => (
                <Card key={client.id} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg leading-none">{client.name}</CardTitle>
                          <Badge variant={client.active ? "default" : "secondary"} 
                                 className={client.active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}>
                            {client.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">
                              R$ {(client.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewClient(client)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClient(client)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Serviço</span>
                        </div>
                        <p className="text-sm font-medium">{client.service || 'Não especificado'}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Vencimento</span>
                        </div>
                        <p className="text-sm font-medium">Dia {client.due_date}</p>
                      </div>
                    </div>
                    
                    {/* Informações de fidelidade */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={client.has_loyalty ? "default" : "outline"} className="text-xs">
                          {client.has_loyalty ? "Com Fidelidade" : "Sem Fidelidade"}
                        </Badge>
                      </div>
                      {client.has_loyalty && client.contract_end_date && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Fim da Fidelidade</span>
                          </div>
                          <p className="text-sm font-medium">
                            {new Date(client.contract_end_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>

                    {client.contact && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Contato</span>
                        </div>
                        <p className="text-sm text-muted-foreground bg-muted/30 rounded p-2">
                          {client.contact}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Visualização em Tabela */
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="p-4 text-left font-medium">Cliente</th>
                        <th className="p-4 text-left font-medium">Status</th>
                        <th className="p-4 text-left font-medium">Valor Mensal</th>
                        <th className="p-4 text-left font-medium">Serviço</th>
                        <th className="p-4 text-left font-medium">Vencimento</th>
                        <th className="p-4 text-left font-medium">Contato</th>
                        <th className="p-4 text-center font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client, index) => (
                        <tr key={client.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="p-4 font-medium">{client.name}</td>
                          <td className="p-4">
                            <Badge variant={client.active ? "default" : "secondary"}
                                   className={client.active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}>
                              {client.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            R$ {(client.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {client.service || 'Não especificado'}
                          </td>
                          <td className="p-4">Dia {client.due_date}</td>
                          <td className="p-4 text-muted-foreground max-w-32 truncate">
                            {client.contact || 'Não especificado'}
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewClient(client)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteClient(client)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Filtros para Pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros e Busca - Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="overdue">Atrasados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {clients.filter(c => c.active).map(client => <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={valueRangeFilter} onValueChange={setValueRangeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Faixa de Valor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Faixas</SelectItem>
                    <SelectItem value="low">Até R$ 1.000</SelectItem>
                    <SelectItem value="medium">R$ 1.000 - R$ 2.000</SelectItem>
                    <SelectItem value="high">Acima de R$ 2.000</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Pagamentos */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Pagamentos ({filteredPayments.length})</h3>
            <div className="flex gap-2">
              <div className="flex gap-1">
                <Button
                  variant={paymentViewMode === 'cards' ? 'action' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentViewMode('cards')}
                >
                  Cards
                </Button>
                <Button
                  variant={paymentViewMode === 'table' ? 'action' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentViewMode('table')}
                >
                  Tabela
                </Button>
              </div>
              <Button variant="action" onClick={() => setPaymentFormOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Pagamento
              </Button>
            </div>
          </div>

          {/* Visualização Cards vs Tabela */}
          {paymentViewMode === "cards" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPayments.map(payment => (
                <Card key={payment.id} className={`hover:shadow-lg transition-all duration-200 ${getPaymentCardBackgroundColor(payment.status)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg leading-none">{getClientName(payment.client_id)}</CardTitle>
                          <Badge className={getStatusColor(payment.status)}>
                            {getStatusLabel(payment.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">
                              R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewPayment(payment)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'paid')}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marcar como Pago
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'pending')}>
                            <Timer className="mr-2 h-4 w-4" />
                            Marcar como Pendente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'overdue')}>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Marcar como Atrasado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeletePayment(payment)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Vencimento</span>
                        </div>
                        <p className="text-sm font-medium">{new Date(payment.due_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Receipt className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Pagamento</span>
                        </div>
                        <p className="text-sm font-medium">
                          {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString('pt-BR') : 'Não pago'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Visualização em Tabela */
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="p-4 text-left font-medium">Cliente</th>
                        <th className="p-4 text-left font-medium">Status</th>
                        <th className="p-4 text-left font-medium">Valor</th>
                        <th className="p-4 text-left font-medium">Vencimento</th>
                        <th className="p-4 text-left font-medium">Data Pagamento</th>
                        <th className="p-4 text-center font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment, index) => (
                        <tr key={payment.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="p-4 font-medium">{getClientName(payment.client_id)}</td>
                          <td className="p-4">
                            <Badge className={getStatusColor(payment.status)}>
                              {getStatusLabel(payment.status)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4">{new Date(payment.due_date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-4 text-muted-foreground">
                            {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString('pt-BR') : 'Não pago'}
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewPayment(payment)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar Pagamento
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'paid')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Marcar como Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'pending')}>
                                  <Timer className="mr-2 h-4 w-4" />
                                  Marcar como Pendente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'overdue')}>
                                  <AlertTriangle className="mr-2 h-4 w-4" />
                                  Marcar como Atrasado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeletePayment(payment)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          {/* Filtros para Despesas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros e Busca - Despesas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar despesas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="paid">Pagas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="overdue">Atrasadas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="fixed">Fixas</SelectItem>
                    <SelectItem value="salary">Salários</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Despesas */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Despesas e Salários ({combinedExpensesAndSalaries.length})</h3>
            <div className="flex gap-2">
              <div className="flex gap-1">
                <Button
                  variant={expenseViewMode === 'cards' ? 'action' : 'outline'}
                  size="sm"
                  onClick={() => setExpenseViewMode('cards')}
                >
                  Cards
                </Button>
                <Button
                  variant={expenseViewMode === 'table' ? 'action' : 'outline'}
                  size="sm"
                  onClick={() => setExpenseViewMode('table')}
                >
                  Tabela
                </Button>
              </div>
              <Button variant="action" onClick={() => setExpenseFormOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Despesa
              </Button>
              <Button variant="action" onClick={() => setSalaryFormOpen(true)} className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Salário
              </Button>
            </div>
          </div>

          {/* Visualização Cards vs Tabela */}
          {expenseViewMode === "cards" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {combinedExpensesAndSalaries.map(item => (
                <Card key={`${item.type}-${item.id}`} className={`hover:shadow-lg transition-all duration-200 ${getExpenseCardBackgroundColor(item.status)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg leading-none">
                            {item.type === 'salary' ? `Salário - ${item.employee_name}` : item.name}
                          </CardTitle>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusLabel(item.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">
                              R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <Badge variant={item.type === 'salary' ? "default" : item.is_fixed ? "default" : "outline"} className="text-xs">
                            {item.type === 'salary' ? "Salário" : item.is_fixed ? "Fixa" : "Variável"}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {item.type === 'expense' ? (
                            <>
                              <DropdownMenuItem onClick={() => handleViewExpense(item as Expense)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditExpense(item as Expense)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateExpenseStatus(item.id, 'paid')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como Pago
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateExpenseStatus(item.id, 'pending')}>
                                <Timer className="mr-2 h-4 w-4" />
                                Marcar como Pendente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateExpenseStatus(item.id, 'overdue')}>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Marcar como Atrasado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteExpense(item as Expense)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem disabled>
                              <Users className="mr-2 h-4 w-4" />
                              Salário
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Vencimento</span>
                        </div>
                        <p className="text-sm font-medium">{new Date(item.due_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Receipt className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Pagamento</span>
                        </div>
                        <p className="text-sm font-medium">
                          {item.paid_date ? new Date(item.paid_date).toLocaleDateString('pt-BR') : 'Não pago'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Visualização em Tabela */
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="p-4 text-left font-medium">Nome</th>
                        <th className="p-4 text-left font-medium">Tipo</th>
                        <th className="p-4 text-left font-medium">Status</th>
                        <th className="p-4 text-left font-medium">Valor</th>
                        <th className="p-4 text-left font-medium">Vencimento</th>
                        <th className="p-4 text-left font-medium">Data Pagamento</th>
                        <th className="p-4 text-center font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedExpensesAndSalaries.map((item, index) => (
                        <tr key={`${item.type}-${item.id}`} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="p-4 font-medium">
                            {item.type === 'salary' ? `Salário - ${item.employee_name}` : item.name}
                          </td>
                          <td className="p-4">
                            <Badge variant={item.type === 'salary' ? "default" : item.is_fixed ? "default" : "outline"}>
                              {item.type === 'salary' ? "Salário" : item.is_fixed ? "Fixa" : "Variável"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusLabel(item.status)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4">{new Date(item.due_date).toLocaleDateString('pt-BR')}</td>
                          <td className="p-4 text-muted-foreground">
                            {item.paid_date ? new Date(item.paid_date).toLocaleDateString('pt-BR') : 'Não pago'}
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {item.type === 'expense' ? (
                                  <>
                                    <DropdownMenuItem onClick={() => handleViewExpense(item as Expense)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Ver Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditExpense(item as Expense)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateExpenseStatus(item.id, 'paid')}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Marcar como Pago
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateExpenseStatus(item.id, 'pending')}>
                                      <Timer className="mr-2 h-4 w-4" />
                                      Marcar como Pendente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateExpenseStatus(item.id, 'overdue')}>
                                      <AlertTriangle className="mr-2 h-4 w-4" />
                                      Marcar como Atrasado
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteExpense(item as Expense)} className="text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <Users className="mr-2 h-4 w-4" />
                                    Salário
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 bg-[7dafd8] bg-white">
          {/* Métricas Detalhadas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Análise de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Clientes Ativos</span>
                  <span className="font-bold text-green-600">{analytics.activeClients}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Clientes Inativos</span>
                  <span className="font-bold text-red-600">{analytics.inactiveClients}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Ticket Médio</span>
                  <span className="font-bold">
                    R$ {analytics.avgClientValue.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                  </span>
                </div>
                <Progress value={analytics.activeClients / (analytics.activeClients + analytics.inactiveClients) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {(analytics.activeClients / (analytics.activeClients + analytics.inactiveClients) * 100).toFixed(1)}% de retenção
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Financeira
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Taxa de Conversão</span>
                  <span className="font-bold text-blue-600">{analytics.paymentConversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Margem de Lucro</span>
                  <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {monthlyRevenue > 0 ? (netProfit / monthlyRevenue * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>ROI Mensal</span>
                  <span className="font-bold">
                    {totalCosts > 0 ? (netProfit / totalCosts * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <Progress value={analytics.paymentConversionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Eficiência de recebimento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Controle de Custos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Despesas Fixas</span>
                  <span className="font-bold">{analytics.fixedExpensesCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Despesas Variáveis</span>
                  <span className="font-bold">{analytics.variableExpensesCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Despesas</span>
                  <span className="font-bold text-orange-600">
                    R$ {(analytics.totalExpensesPaid + analytics.totalExpensesPending).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                  </span>
                </div>
                <Progress value={analytics.fixedExpensesCount / Math.max(1, analytics.fixedExpensesCount + analytics.variableExpensesCount) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {(analytics.fixedExpensesCount / Math.max(1, analytics.fixedExpensesCount + analytics.variableExpensesCount) * 100).toFixed(1)}% custos fixos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resumo Detalhado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório Mensal Detalhado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-600">Receitas</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Pagamentos Recebidos</span>
                      <span>R$ {analytics.totalReceived.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pagamentos Pendentes</span>
                      <span>R$ {analytics.totalPending.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pagamentos Atrasados</span>
                      <span className="text-red-600">R$ {analytics.totalOverdue.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-semibold">
                      <span>Total Esperado</span>
                      <span>R$ {(analytics.totalReceived + analytics.totalPending + analytics.totalOverdue).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-red-600">Despesas</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Despesas Pagas</span>
                      <span>R$ {analytics.totalExpensesPaid.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Despesas Pendentes</span>
                      <span>R$ {analytics.totalExpensesPending.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Salários</span>
                      <span>R$ {totalSalaries.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-semibold">
                      <span>Total Custos</span>
                      <span>R$ {(analytics.totalExpensesPaid + analytics.totalExpensesPending + totalSalaries).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Resultado Líquido</span>
                  <span className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {netProfit.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ClientForm open={clientFormOpen} onOpenChange={setClientFormOpen} client={selectedClient} onSuccess={() => {
      fetchData();
      setClientFormOpen(false);
      setSelectedClient(null);
    }} />

    {/* Dialog de detalhes do cliente */}
    <AlertDialog open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Detalhes do Cliente</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4">
          {selectedClient && (
            <>
              <div>
                <span className="font-medium">Nome:</span>
                <p>{selectedClient.name}</p>
              </div>
              <div>
                <span className="font-medium">Contato:</span>
                <p>{selectedClient.contact || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-medium">Serviço:</span>
                <p>{selectedClient.service || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-medium">Valor Mensal:</span>
                <p>
                  {selectedClient.monthly_value 
                    ? `R$ ${selectedClient.monthly_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Não informado'
                  }
                </p>
              </div>
              <div>
                <span className="font-medium">Data de Início:</span>
                <p>{selectedClient.start_date ? new Date(selectedClient.start_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
              </div>
              <div>
                <span className="font-medium">Dia de Vencimento:</span>
                <p>Dia {selectedClient.due_date}</p>
              </div>
              <div>
                <span className="font-medium">Fidelidade:</span>
                <p>{selectedClient.has_loyalty ? 'Sim' : 'Não'}</p>
              </div>
              {selectedClient.has_loyalty && (
                <>
                  <div>
                    <span className="font-medium">Início do Contrato:</span>
                    <p>{selectedClient.contract_start_date ? new Date(selectedClient.contract_start_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Fim do Contrato:</span>
                    <p>{selectedClient.contract_end_date ? new Date(selectedClient.contract_end_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                  </div>
                </>
              )}
              <div>
                <span className="font-medium">Status:</span>
                <p>{selectedClient.active ? 'Ativo' : 'Inativo'}</p>
              </div>
              {selectedClient.observations && (
                <div>
                  <span className="font-medium">Observações:</span>
                  <p>{selectedClient.observations}</p>
                </div>
              )}
            </>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

        {/* Dialog de detalhes do pagamento */}
        <AlertDialog open={paymentDetailsOpen} onOpenChange={setPaymentDetailsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Detalhes do Pagamento</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              {selectedPayment && (
                <>
                  <div>
                    <span className="font-medium">Cliente:</span>
                    <p>{getClientName(selectedPayment.client_id)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Valor:</span>
                    <p>R$ {selectedPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className="font-medium">Data de Vencimento:</span>
                    <p>{new Date(selectedPayment.due_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p>{getStatusLabel(selectedPayment.status)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Data de Pagamento:</span>
                    <p>{selectedPayment.paid_date ? new Date(selectedPayment.paid_date).toLocaleDateString('pt-BR') : 'Não pago'}</p>
                  </div>
                </>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de confirmação de exclusão de pagamento */}
        <AlertDialog open={paymentDeleteDialogOpen} onOpenChange={setPaymentDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePayment} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <PaymentForm open={paymentFormOpen} onOpenChange={open => {
        setPaymentFormOpen(open);
        if (!open) setSelectedPayment(null);
      }} payment={selectedPayment} onSuccess={fetchData} />

      <ExpenseForm open={expenseFormOpen} onOpenChange={open => {
      setExpenseFormOpen(open);
      if (!open) setSelectedExpense(null);
    }} expense={selectedExpense} onSuccess={fetchData} />

      <SalaryForm open={salaryFormOpen} onOpenChange={setSalaryFormOpen} onSuccess={() => {
      fetchData();
      setSalaryFormOpen(false);
    }} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClient}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de detalhes da despesa */}
        <AlertDialog open={expenseDetailsOpen} onOpenChange={setExpenseDetailsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Detalhes da Despesa</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              {selectedExpense && <>
                  <div>
                    <span className="font-medium">Nome:</span>
                    <p>{selectedExpense.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Valor:</span>
                    <p>R$ {selectedExpense.amount.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}</p>
                  </div>
                  <div>
                    <span className="font-medium">Data de Vencimento:</span>
                    <p>{new Date(selectedExpense.due_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p>{getStatusLabel(selectedExpense.status)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span>
                    <p>{selectedExpense.is_fixed ? 'Fixa' : 'Variável'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Data de Pagamento:</span>
                    <p>{selectedExpense.paid_date ? new Date(selectedExpense.paid_date).toLocaleDateString('pt-BR') : 'Não pago'}</p>
                  </div>
                </>}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de confirmação de exclusão de despesa */}
        <AlertDialog open={expenseDeleteDialogOpen} onOpenChange={setExpenseDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a despesa "{expenseToDelete?.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteExpense} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>;
}