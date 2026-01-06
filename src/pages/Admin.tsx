import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertCircle, Building, Filter, Banknote, Eye, Edit, Trash2, MoreHorizontal, Calendar, ArrowUpDown, Search, BarChart3, Target, Activity, Timer, Users, CreditCard, Receipt, Wallet, PieChart, FileText, AlertTriangle, CheckCircle, TrendingUp as TrendingUpIcon, Settings, Calculator, UserX, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useLimitEnforcement } from "@/hooks/useLimitEnforcement";
import { ClientForm } from "@/components/admin/ClientForm";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { SalaryForm } from "@/components/admin/SalaryForm";
import { ClientCard } from "@/components/admin/ClientCard";
import { ClientDetailsDialog } from "@/components/admin/ClientDetailsDialog";
import { ChurnAnalysis } from "@/components/admin/ChurnAnalysis";
import { FinancialMetricsHelp } from "@/components/admin/FinancialMetricsHelp";
import { ExpenseCard } from "@/components/admin/ExpenseCard";
import { ExpenseMetricsCards } from "@/components/admin/ExpenseMetricsCards";
import { ExpenseDetailsDialog } from "@/components/admin/ExpenseDetailsDialog";
import { SalaryDetailsDialog } from "@/components/admin/SalaryDetailsDialog";
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
  cancelled_at: string | null;
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
  expense_type?: 'avulsa' | 'recorrente' | 'parcelada';
  category?: string;
  installment_total?: number;
  installment_current?: number;
  recurrence_day?: number;
  description?: string;
  is_active?: boolean;
  parent_expense_id?: string | null;
}
interface Salary {
  id: string;
  employee_name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}
// Helper function para verificar se cliente estava ativo em determinado mês
const wasClientActiveInMonth = (client: Client, monthStr: string): boolean => {
  // Se cliente está ativo agora, estava ativo naquele mês
  if (client.active) return true;
  
  // Se foi cancelado, verificar se foi DEPOIS do mês analisado
  if (client.cancelled_at) {
    const [year, month] = monthStr.split('-').map(Number);
    const monthEnd = new Date(year, month, 0, 23, 59, 59); // Último dia do mês às 23:59:59
    const cancelledDate = new Date(client.cancelled_at);
    
    // Cliente estava ativo no mês se foi cancelado DEPOIS do final do mês
    return cancelledDate > monthEnd;
  }
  
  // Se não está ativo e não tem cancelled_at, consideramos inativo
  return false;
};

export default function Admin() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [previousMonthExpenses, setPreviousMonthExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Controla execução única do gerador automático de pagamentos do mês atual
  const [hasEnsuredCurrentMonthPayments, setHasEnsuredCurrentMonthPayments] = useState(false);

  // Form states
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [salaryFormOpen, setSalaryFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [preselectedClientForPayment, setPreselectedClientForPayment] = useState<{ id: string; name: string; monthly_value?: number | null } | null>(null);
  
  // Filtros para a aba de Clientes & Pagamentos
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<string>("all");
  const [clientLoyaltyFilter, setClientLoyaltyFilter] = useState<string>("all");
  const [clientPaymentStatusFilter, setClientPaymentStatusFilter] = useState<string>("all");
  const [showInactiveClients, setShowInactiveClients] = useState(false);

  // Verificação de permissão (sem retorno antecipado)
  const hasAccess = profile?.role === 'agency_admin' || profile?.role === 'super_admin';

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

  // Salary states
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const [salaryDetailsOpen, setSalaryDetailsOpen] = useState(false);
  const [salaryDeleteDialogOpen, setSalaryDeleteDialogOpen] = useState(false);
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);

  // Filtros e busca - Despesas
  const [expenseSearchTerm, setExpenseSearchTerm] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<string>("all");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("all");
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
  const { checkLimitWithWarning } = useLimitEnforcement();

  useEffect(() => {
    if (currentAgency) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentAgency?.id, selectedMonth, clientSort, paymentSort, expenseSort]);
  const fetchData = async () => {
    try {
      await Promise.all([
        fetchClients(), 
        fetchPayments(), 
        fetchExpenses(), 
        fetchSalaries(), 
        fetchExpenseCategories(),
        fetchPreviousMonthExpenses()
      ]);
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

  const fetchExpenseCategories = async () => {
    if (!currentAgency) return;
    
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('agency_id', currentAgency.id)
      .order('name');
    
    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return;
    }
    setExpenseCategories(data || []);
  };
  const fetchClients = async () => {
    if (!currentAgency) return;
    
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, monthly_value, active, start_date, contact, service, due_date, observations, contract_start_date, contract_end_date, has_loyalty, cancelled_at')
      .eq('agency_id', currentAgency.id)
      .order(clientSort);
    
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
    if (!currentAgency) return;

    await updatePaymentStatuses();
    
    // Busca TODOS os pagamentos da agência (sem filtro de data)
    // O filtro de data será aplicado apenas na visualização da aba de pagamentos
    const { data, error } = await supabase
      .from('client_payments')
      .select('*')
      .eq('agency_id', currentAgency.id)
      .order('due_date', { ascending: false });
    
    if (error) throw error;
    setPayments(data || []);
  };
  const fetchExpenses = async () => {
    if (!currentAgency) return;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('expenses')
      .select('*, category')
      .eq('agency_id', currentAgency.id)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order(expenseSort, { ascending: expenseSort === 'status' ? true : false });
    
    if (error) throw error;
    setExpenses(data || []);
  };
  const fetchSalaries = async () => {
    if (!currentAgency) return;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('salaries')
      .select('*')
      .eq('agency_id', currentAgency.id)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date', { ascending: false });
    
    if (error) throw error;
    setSalaries(data || []);
  };

  const fetchPreviousMonthExpenses = async () => {
    if (!currentAgency) return;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    
    const startDate = `${prevMonthStr}-01`;
    const endDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('agency_id', currentAgency.id)
      .gte('due_date', startDate)
      .lte('due_date', endDate);
    
    if (error) {
      console.error('Error fetching previous month expenses:', error);
      return;
    }
    setPreviousMonthExpenses(data || []);
  };

  // Removido: limpeza de duplicatas agora é feita por UNIQUE INDEX no banco

  // Garante que cada cliente ativo tenha o pagamento do mês ATUAL criado automaticamente
  // usando upsert para evitar duplicatas
  useEffect(() => {
    if (!currentAgency?.id || clients.length === 0 || payments.length === 0) return;
    if (hasEnsuredCurrentMonthPayments) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    // Clientes que devem ter cobrança mensal (apenas ativos)
    const activeClients = clients.filter(
      (c) => c.active && !!c.monthly_value && !!c.due_date
    );

    // Identificar clientes sem pagamento neste mês
    const missingClients = activeClients.filter(
      (c) => !payments.some((p) => p.client_id === c.id && p.due_date.startsWith(monthPrefix))
    );

    if (missingClients.length === 0) {
      setHasEnsuredCurrentMonthPayments(true);
      return;
    }

    const rows = missingClients.map((c) => ({
      client_id: c.id,
      agency_id: currentAgency.id,
      amount: Number(c.monthly_value),
      due_date: `${year}-${String(month).padStart(2, '0')}-${String(Math.min(c.due_date, 28)).padStart(2, '0')}`,
      status: 'pending' as const,
    }));

    const upsertMissing = async () => {
      // Upsert: insert ignora conflito se já existir pagamento neste mês
      const { error } = await supabase
        .from('client_payments')
        .upsert(rows, { onConflict: 'agency_id,client_id,extract_month_immutable(due_date)', ignoreDuplicates: true });

      if (error) {
        console.error('Erro ao gerar pagamentos do mês atual:', error);
      }
      setHasEnsuredCurrentMonthPayments(true);
      fetchPayments();
    };

    upsertMissing();
  }, [clients, payments, currentAgency?.id, hasEnsuredCurrentMonthPayments]);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente desconhecido';
  };

  // Verifica se cliente foi desativado DEPOIS do mês sendo visualizado
  const getClientDeactivationInfo = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || client.active || !client.cancelled_at) return null;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const cancelledDate = new Date(client.cancelled_at);
    
    // Retorna info se foi desativado DEPOIS do mês atual
    if (cancelledDate > monthEnd) {
      return {
        wasActiveInMonth: true,
        cancelledAt: client.cancelled_at,
        cancelledDate: cancelledDate.toLocaleDateString('pt-BR')
      };
    }
    
    return null;
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
  const handleDeactivateClient = async (client: Client) => {
    try {
      const {
        error
      } = await supabase.from('clients').update({ 
        active: false, 
        cancelled_at: new Date().toISOString() 
      }).eq('id', client.id);
      if (error) throw error;
      toast({
        title: "Cliente desativado",
        description: `Cliente ${client.name} foi desativado com sucesso!`
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleReactivateClient = async (client: Client) => {
    try {
      const {
        error
      } = await supabase.from('clients').update({ 
        active: true, 
        cancelled_at: null 
      }).eq('id', client.id);
      if (error) throw error;
      toast({
        title: "Cliente reativado",
        description: `Cliente ${client.name} foi reativado com sucesso!`
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
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
  
  const handleDeletePaymentById = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('client_payments')
        .delete()
        .eq('id', paymentId);
      if (error) throw error;
      toast({
        title: "Pagamento excluído",
        description: "Pagamento excluído com sucesso!"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir pagamento",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdatePaymentDueDate = async (paymentId: string, newDueDate: string) => {
    try {
      const { error } = await supabase
        .from('client_payments')
        .update({ due_date: newDueDate })
        .eq('id', paymentId);
      if (error) throw error;
      toast({
        title: "Data atualizada",
        description: "Data de vencimento atualizada com sucesso!"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar data",
        description: error.message,
        variant: "destructive"
      });
    }
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
  
  // Função para visualizar despesa mestra a partir de uma instância
  const handleViewMasterExpense = async (masterId: string) => {
    if (!currentAgency) return;
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', masterId)
      .eq('agency_id', currentAgency.id)
      .single();
    
    if (error || !data) {
      toast({
        title: "Erro",
        description: "Não foi possível encontrar a despesa mestra.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedExpense(data);
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

  // Salary handlers
  const handleViewSalary = (salary: Salary) => {
    setSelectedSalary(salary);
    setSalaryDetailsOpen(true);
  };
  
  const handleEditSalary = (salary: Salary) => {
    setSelectedSalary(salary);
    setSalaryFormOpen(true);
  };
  
  const handleDeleteSalary = (salary: Salary) => {
    setSalaryToDelete(salary);
    setSalaryDeleteDialogOpen(true);
  };
  
  const confirmDeleteSalary = async () => {
    if (!salaryToDelete) return;
    try {
      const { error } = await supabase
        .from('salaries')
        .delete()
        .eq('id', salaryToDelete.id);
      if (error) throw error;
      toast({
        title: "Salário excluído",
        description: "Salário excluído com sucesso!"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSalaryDeleteDialogOpen(false);
      setSalaryToDelete(null);
    }
  };

  const handleUpdateSalaryStatus = async (salaryId: string, newStatus: 'pending' | 'paid' | 'overdue') => {
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
        .from('salaries')
        .update(updateData)
        .eq('id', salaryId);
      if (error) throw error;
      toast({
        title: "Status atualizado",
        description: "Status do salário foi atualizado com sucesso"
      });
      fetchSalaries();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Dados filtrados
  // Pagamentos do mês selecionado (apenas com vencimento no mês)
  const paymentsInSelectedMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startStr = `${selectedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    
    return payments.filter(payment => {
      return payment.due_date >= startStr && payment.due_date <= endStr;
    });
  }, [payments, selectedMonth]);

  const filteredPayments = useMemo(() => {
    return paymentsInSelectedMonth.filter(payment => {
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
  }, [paymentsInSelectedMonth, searchTerm, statusFilter, clientFilter, valueRangeFilter]);
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
      const matchesSearch = itemName.toLowerCase().includes(expenseSearchTerm.toLowerCase());
      const matchesStatus = expenseStatusFilter === 'all' || item.status === expenseStatusFilter;
      
      // Filtro de tipo de despesa
      let matchesType = true;
      if (expenseTypeFilter !== 'all') {
        if (expenseTypeFilter === 'salary') {
          matchesType = item.type === 'salary';
        } else if (expenseTypeFilter === 'recorrente_mestra') {
          // Filtro especial para despesas mestras recorrentes (sem parent_expense_id)
          matchesType = item.type === 'expense' && 
            'expense_type' in item && 
            item.expense_type === 'recorrente' && 
            !('parent_expense_id' in item && item.parent_expense_id);
        } else if (item.type === 'expense' && 'expense_type' in item) {
          matchesType = item.expense_type === expenseTypeFilter;
        } else {
          matchesType = false;
        }
      }
      
      // Filtro de categoria
      const matchesCategory = expenseCategoryFilter === 'all' || 
        (item.type === 'expense' && 'category' in item && item.category === expenseCategoryFilter);
      
      return matchesSearch && matchesStatus && matchesType && matchesCategory;
    }).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [expenses, salaries, expenseSearchTerm, expenseStatusFilter, expenseTypeFilter, expenseCategoryFilter]);

  // Análises e métricas avançadas
  const analytics = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Análise de pagamentos (clientes que estavam ativos no mês selecionado)
    const paidPayments = filteredPayments.filter(p => {
      const client = clients.find(c => c.id === p.client_id);
      return p.status === 'paid' && client && wasClientActiveInMonth(client, selectedMonth);
    });
    const pendingPayments = filteredPayments.filter(p => {
      const client = clients.find(c => c.id === p.client_id);
      return p.status === 'pending' && client && wasClientActiveInMonth(client, selectedMonth);
    });
    const overduePayments = filteredPayments.filter(p => {
      const client = clients.find(c => c.id === p.client_id);
      return p.status === 'overdue' && client && wasClientActiveInMonth(client, selectedMonth);
    });
    const totalReceived = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    // Análise de despesas
    const paidExpenses = filteredExpenses.filter(e => e.status === 'paid');
    const pendingExpenses = filteredExpenses.filter(e => e.status === 'pending');
    const avulsaExpenses = filteredExpenses.filter(e => e.expense_type === 'avulsa');
    const recorrenteExpenses = filteredExpenses.filter(e => e.expense_type === 'recorrente');
    const parceladaExpenses = filteredExpenses.filter(e => e.expense_type === 'parcelada');
    const totalExpensesPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalAvulsa = avulsaExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalRecorrente = recorrenteExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalParcelada = parceladaExpenses.reduce((sum, e) => sum + e.amount, 0);

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
        avulsa: avulsaExpenses.length,
        recorrente: recorrenteExpenses.length,
        parcelada: parceladaExpenses.length
      },
      expenseValues: {
        avulsa: totalAvulsa,
        recorrente: totalRecorrente,
        parcelada: totalParcelada
      }
    };
  }, [filteredPayments, filteredExpenses, clients, expenses]);

  // ============ REGIME DE CAIXA (REAL) ============
  // Pagamentos efetivamente recebidos no mês (clientes que estavam ativos no mês)
  const paidPaymentsThisMonth = paymentsInSelectedMonth
    .filter(p => {
      const client = clients.find(c => c.id === p.client_id);
      return p.status === 'paid' && client && wasClientActiveInMonth(client, selectedMonth);
    });
  const monthlyRevenueReal = paidPaymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);

  // Despesas efetivamente pagas no mês
  const paidExpensesThisMonth = expenses.filter(e => e.status === 'paid');
  const totalExpensesPaidReal = paidExpensesThisMonth.reduce((sum, e) => sum + e.amount, 0);

  // Salários efetivamente pagos no mês
  const paidSalariesThisMonth = salaries.filter(s => s.status === 'paid');
  const totalSalariesPaidReal = paidSalariesThisMonth.reduce((sum, s) => sum + s.amount, 0);

  // Lucro Líquido Real (Caixa)
  const totalCostsReal = totalExpensesPaidReal + totalSalariesPaidReal;
  const netProfitReal = monthlyRevenueReal - totalCostsReal;

  // ============ REGIME DE COMPETÊNCIA (PREVISTO) ============
  // Receita prevista (pagamentos de clientes que estavam ativos no mês)
  const monthlyRevenueExpected = paymentsInSelectedMonth
    .filter(p => {
      const client = clients.find(c => c.id === p.client_id);
      return client && wasClientActiveInMonth(client, selectedMonth);
    })
    .reduce((sum, p) => sum + p.amount, 0);

  // Despesas previstas (todas as despesas e salários do mês)
  const totalExpensesExpected = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSalariesExpected = salaries.reduce((sum, s) => sum + s.amount, 0);
  const totalCostsExpected = totalExpensesExpected + totalSalariesExpected;

  // Resultado previsto
  const netProfitExpected = monthlyRevenueExpected - totalCostsExpected;

  // ============ VALORES GLOBAIS (TODOS OS MESES) ============
  // Pagamentos de todos os clientes (histórico completo - inclui clientes desativados)
  const totalReceived = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalReceivable = payments
    .filter(p => {
      const client = clients.find(c => c.id === p.client_id);
      // Para valores a receber, considerar apenas clientes ativos atualmente
      return p.status !== 'paid' && client?.active;
    })
    .reduce((sum, p) => sum + p.amount, 0);
  
  // Manter variáveis legadas para compatibilidade
  const totalExpenses = totalExpensesExpected;
  const totalSalaries = totalSalariesExpected;
  const totalCosts = totalCostsExpected;
  const monthlyRevenue = monthlyRevenueExpected;
  const netProfit = netProfitExpected;
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setClientFilter("all");
    setPaymentTypeFilter("all");
    setValueRangeFilter("all");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-3xl">Acesso Restrito</CardTitle>
            <CardDescription className="text-lg">
              Você não tem permissão para acessar esta área
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="text-lg font-semibold">Permissão Necessária</AlertTitle>
              <AlertDescription className="text-base mt-2">
                Esta tela é exclusiva para administradores da agência. Somente usuários com permissão de administrador podem acessar o painel administrativo, incluindo gestão de clientes, pagamentos, despesas e relatórios financeiros.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center pt-4">
              <Button onClick={() => navigate('/')} variant="default">
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
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
        </div>
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="clients-payments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Clientes & Pagamentos</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span>Despesas</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span>Análises</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Indicador de Regime de Caixa */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div className="text-sm flex-1">
              <span className="font-medium text-blue-900 dark:text-blue-100">Regime de Caixa:</span>
              <span className="text-blue-700 dark:text-blue-300 ml-1">
                Os valores exibidos consideram apenas pagamentos e despesas efetivamente realizados.
              </span>
            </div>
            <FinancialMetricsHelp />
          </div>

          {/* Alerta de Pagamentos em Atraso */}
          {analytics.totalOverdue > 0 && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção: Pagamentos em Atraso</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Você tem <strong>R$ {analytics.totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em
                  pagamentos atrasados ({analytics.paymentStats.overdue} pagamentos).
                </p>
                <p className="text-sm">
                  Esses valores <strong>não estão incluídos</strong> no lucro líquido real,
                  pois ainda não foram recebidos. O lucro previsto considera esses valores.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Estatísticas Principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal Real</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {monthlyRevenueReal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valores efetivamente recebidos
                </p>
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">Previsto total</div>
                  <div className="text-sm font-medium">
                    R$ {monthlyRevenueExpected.toLocaleString('pt-BR', {
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
                <CardTitle className="text-sm font-medium">Lucro Líquido Real</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfitReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {netProfitReal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valores recebidos vs pagos
                </p>
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">Margem Real</div>
                  <div className="text-sm font-medium">
                    {monthlyRevenueReal > 0 ? (netProfitReal / monthlyRevenueReal * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resultado Previsto</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfitExpected >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  R$ {netProfitExpected.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Considerando pendentes
                </p>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Diferença</div>
                  <div className={`text-sm font-medium ${(netProfitExpected - netProfitReal) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    R$ {Math.abs(netProfitExpected - netProfitReal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
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
                  Análise de Despesas por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      Avulsas
                    </span>
                    <div className="text-right">
                      <div className="font-medium">{analytics.expenseStats.avulsa}</div>
                      <div className="text-xs text-muted-foreground">
                        R$ {analytics.expenseValues.avulsa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <Progress value={analytics.expenseStats.avulsa / Math.max(1, expenses.length) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      Recorrentes
                    </span>
                    <div className="text-right">
                      <div className="font-medium">{analytics.expenseStats.recorrente}</div>
                      <div className="text-xs text-muted-foreground">
                        R$ {analytics.expenseValues.recorrente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <Progress value={analytics.expenseStats.recorrente / Math.max(1, expenses.length) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      Parceladas
                    </span>
                    <div className="text-right">
                      <div className="font-medium">{analytics.expenseStats.parcelada}</div>
                      <div className="text-xs text-muted-foreground">
                        R$ {analytics.expenseValues.parcelada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <Progress value={analytics.expenseStats.parcelada / Math.max(1, expenses.length) * 100} className="h-2" />
                </div>
                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      Pagas
                    </span>
                    <span>{analytics.expenseStats.paid}</span>
                  </div>
                  <Progress value={analytics.expenseStats.paid / Math.max(1, expenses.length) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      Pendentes
                    </span>
                    <span>{analytics.expenseStats.pending}</span>
                  </div>
                  <Progress value={analytics.expenseStats.pending / Math.max(1, expenses.length) * 100} className="h-2" />
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

        {/* Nova Aba Unificada: Clientes & Pagamentos */}
        <TabsContent value="clients-payments" className="space-y-6">
          {/* Métricas de Clientes */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Clientes Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.activeClients}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.inactiveClients} inativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  MRR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Receita Recorrente Mensal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  Taxa de Renovação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics.paymentConversionRate.toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.paymentStats.paid} de {filteredPayments.length} pagamentos
                </p>
              </CardContent>
            </Card>

            <Card className={analytics.loyaltyAlerts.ending30Days.length + analytics.loyaltyAlerts.expired.length > 0 ? 'border-orange-400' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Em Risco
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {analytics.loyaltyAlerts.ending30Days.length + analytics.loyaltyAlerts.expired.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clientes precisam atenção
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alertas Proativos */}
          {(analytics.totalOverdue > 0 || analytics.loyaltyAlerts.ending30Days.length > 0) && (
            <div className="grid gap-4 md:grid-cols-3">
              {analytics.totalOverdue > 0 && (
                <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                          R$ {analytics.totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em pagamentos atrasados
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300">
                          {analytics.paymentStats.overdue} pagamento(s) precisam de atenção
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {analytics.loyaltyAlerts.ending30Days.length > 0 && (
                <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                          {analytics.loyaltyAlerts.ending30Days.length} contrato(s) vencem em 30 dias
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-300">
                          Entre em contato para renovar
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {analytics.paymentConversionRate >= 85 && (
                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Taxa de renovação: {analytics.paymentConversionRate.toFixed(0)}%
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-300">
                          🎯 Acima da média! Parabéns!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Header com Filtros e Botões */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <h2 className="text-2xl font-bold">
              Clientes ({showInactiveClients ? clients.filter(c => !c.active).length : clients.filter(c => c.active).length})
            </h2>
            
            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                
                <div className="relative w-[180px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar cliente..." 
                    value={clientSearchTerm} 
                    onChange={(e) => setClientSearchTerm(e.target.value)} 
                    className="pl-8" 
                  />
                </div>

                <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clientLoyaltyFilter} onValueChange={setClientLoyaltyFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Fidelidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with">Com Fidelidade</SelectItem>
                    <SelectItem value="without">Sem Fidelidade</SelectItem>
                    <SelectItem value="expiring">Vencendo</SelectItem>
                    <SelectItem value="expired">Vencida</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clientPaymentStatusFilter} onValueChange={setClientPaymentStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Em Dia</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant={showInactiveClients ? "default" : "outline"}
                onClick={() => setShowInactiveClients(!showInactiveClients)}
                className="flex items-center gap-2"
              >
                <UserX className="h-4 w-4" />
                {showInactiveClients ? "Ocultar Inativos" : "Ver Inativos"} ({clients.filter(c => !c.active).length})
              </Button>
              
              <Button
                onClick={() => {
                  const canAdd = checkLimitWithWarning('clients', clients.length + 1);
                  if (canAdd) {
                    setSelectedClient(null);
                    setClientFormOpen(true);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          </div>

          {/* Grid de Cards de Clientes */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clients
              .filter(client => {
                // Filtro de clientes ativos/inativos
                if (!showInactiveClients && !client.active) return false;
                if (showInactiveClients && client.active) return false;

                const matchesSearch = client.name.toLowerCase().includes(clientSearchTerm.toLowerCase());
                const matchesStatus = clientStatusFilter === 'all' || 
                  (clientStatusFilter === 'active' && client.active) ||
                  (clientStatusFilter === 'inactive' && !client.active);
                const matchesLoyalty = clientLoyaltyFilter === 'all' ||
                  (clientLoyaltyFilter === 'with' && client.has_loyalty) ||
                  (clientLoyaltyFilter === 'without' && !client.has_loyalty) ||
                  (clientLoyaltyFilter === 'expiring' && client.has_loyalty && client.contract_end_date && 
                    Math.ceil((new Date(client.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30 &&
                    Math.ceil((new Date(client.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) >= 0) ||
                  (clientLoyaltyFilter === 'expired' && client.has_loyalty && client.contract_end_date &&
                    Math.ceil((new Date(client.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) < 0);
                
                // Filtro de status de pagamento
                if (clientPaymentStatusFilter !== 'all') {
                  const clientPayments = payments.filter(p => p.client_id === client.id);
                  const hasStatus = clientPayments.some(p => p.status === clientPaymentStatusFilter);
                  if (!hasStatus) return false;
                }
                
                return matchesSearch && matchesStatus && matchesLoyalty;
              })
              .map(client => {
                const clientPayments = payments.filter(p => p.client_id === client.id);
                const currentYear = new Date().getFullYear();
                const paymentsThisYear = clientPayments.filter(p => 
                  p.status === 'paid' && new Date(p.due_date).getFullYear() === currentYear
                ).length;
                const totalPaymentsYear = 12;
                
                const nextPayment = clientPayments
                  .filter(p => new Date(p.due_date) >= new Date())
                  .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

                // Verifica o status de pagamento - prioriza pagamentos em atraso
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth() + 1;
                const currentYear2 = currentDate.getFullYear();
                const isSameMonthYear = (dateStr: string) => {
                  const d = new Date(dateStr);
                  return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear2;
                };
                
                // Primeiro, verifica se há pagamentos em atraso (de qualquer mês)
                const hasOverduePayments = clientPayments.some(p => p.status === 'overdue');
                
                // Busca o pagamento que vence no mês atual
                const dueThisMonth = clientPayments.find(p => isSameMonthYear(p.due_date));
                
                // Se há pagamentos em atraso, prioriza mostrar 'overdue'
                // Caso contrário, mostra o status do pagamento que vence no mês atual
                const computedCurrentMonthStatus: 'paid' | 'pending' | 'overdue' | null = hasOverduePayments
                  ? 'overdue'
                  : (dueThisMonth?.status ?? null);

                return (
                  <ClientCard
                    key={client.id}
                    client={client}
                    paymentsThisYear={paymentsThisYear}
                    totalPaymentsYear={totalPaymentsYear}
                    nextPaymentDate={nextPayment?.due_date || null}
                    nextPaymentStatus={nextPayment?.status || null}
                    currentMonthPaymentStatus={computedCurrentMonthStatus}
                    onView={handleViewClient}
                    onEdit={handleEditClient}
                    onDelete={handleDeleteClient}
                    onGenerateContract={(client) => navigate('/contracts')}
                    onCreateReminder={(client) => navigate('/reminders')}
                    onGeneratePayment={(client) => {
                      setPreselectedClientForPayment({ id: client.id, name: client.name, monthly_value: client.monthly_value });
                      setPaymentFormOpen(true);
                    }}
                  />
                );
              })}
          </div>

          {/* Dialog de Detalhes do Cliente */}
          <ClientDetailsDialog
            client={selectedClient}
            open={clientDetailsOpen}
            onOpenChange={setClientDetailsOpen}
            payments={payments}
            onEdit={handleEditClient}
            onGenerateContract={(client) => navigate('/contracts')}
            onDeactivate={handleDeactivateClient}
            onReactivate={handleReactivateClient}
            onDelete={handleDeleteClient}
            onMarkPaymentAsPaid={(paymentId) => handleUpdatePaymentStatus(paymentId, 'paid')}
            onDeletePayment={handleDeletePaymentById}
            onUpdatePaymentDueDate={handleUpdatePaymentDueDate}
          />
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
                          <DropdownMenuItem onClick={() => navigate(`/contracts?clientId=${client.id}`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Gerar Contrato
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
              {filteredPayments.map(payment => {
                const deactivationInfo = getClientDeactivationInfo(payment.client_id);
                return (
                <Card key={payment.id} className={`hover:shadow-lg transition-all duration-200 ${getPaymentCardBackgroundColor(payment.status)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg leading-none">{getClientName(payment.client_id)}</CardTitle>
                          <Badge className={getStatusColor(payment.status)}>
                            {getStatusLabel(payment.status)}
                          </Badge>
                          {deactivationInfo && (
                            <Badge variant="outline" className="text-orange-600 border-orange-400 bg-orange-50 dark:bg-orange-950/30">
                              <UserX className="h-3 w-3 mr-1" />
                              Inativado em {deactivationInfo.cancelledDate}
                            </Badge>
                          )}
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
              )})}
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
                      {filteredPayments.map((payment, index) => {
                        const deactivationInfo = getClientDeactivationInfo(payment.client_id);
                        return (
                        <tr key={payment.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{getClientName(payment.client_id)}</span>
                              {deactivationInfo && (
                                <Badge variant="outline" className="text-orange-600 border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-xs w-fit">
                                  <UserX className="h-3 w-3 mr-1" />
                                  Inativado em {deactivationInfo.cancelledDate}
                                </Badge>
                              )}
                            </div>
                          </td>
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
                      )})}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          {/* Header com Título, Filtros e Botões */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <h2 className="text-2xl font-bold">
              Despesas e Salários ({combinedExpensesAndSalaries.length})
            </h2>
            
            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
              {/* Filtros */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                
                <div className="relative w-[180px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar..." 
                    value={expenseSearchTerm} 
                    onChange={(e) => setExpenseSearchTerm(e.target.value)} 
                    className="pl-8" 
                  />
                </div>

                <Select value={expenseStatusFilter} onValueChange={setExpenseStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="paid">Pagas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="overdue">Atrasadas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={expenseTypeFilter} onValueChange={setExpenseTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="salary">Salários</SelectItem>
                    <SelectItem value="avulsa">Avulsas</SelectItem>
                    <SelectItem value="recorrente">Recorrentes</SelectItem>
                    <SelectItem value="recorrente_mestra">🔄 Rec. Mestras</SelectItem>
                    <SelectItem value="parcelada">Parceladas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Categorias</SelectItem>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botões de Ação */}
              <Button
                variant="outline"
                onClick={() => setSalaryFormOpen(true)}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Salário
              </Button>
              
              <Button
                onClick={() => setExpenseFormOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Despesa
              </Button>
            </div>
          </div>

          {/* Grid de Cards de Despesas */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {combinedExpensesAndSalaries.map(item => (
              <ExpenseCard
                key={`${item.type}-${item.id}`}
                item={item}
                onView={item.type === 'expense' ? handleViewExpense : handleViewSalary}
                onEdit={item.type === 'expense' ? handleEditExpense : handleEditSalary}
                onDelete={item.type === 'expense' ? handleDeleteExpense : handleDeleteSalary}
                onUpdateStatus={item.type === 'expense' ? handleUpdateExpenseStatus : handleUpdateSalaryStatus}
                onRefresh={fetchExpenses}
                onViewMaster={handleViewMasterExpense}
              />
            ))}
          </div>
          
          {/* Modal de Detalhes da Despesa */}
          <ExpenseDetailsDialog
            expense={selectedExpense}
            open={expenseDetailsOpen}
            onOpenChange={setExpenseDetailsOpen}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            onRefresh={fetchExpenses}
            onViewMaster={handleViewMasterExpense}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 bg-[7dafd8] bg-white">
          {/* Análise de Churn */}
          <ChurnAnalysis clients={clients} selectedMonth={selectedMonth} />
          
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
                  <span>Despesas Avulsas</span>
                  <span className="font-bold">{analytics.expenseStats.avulsa}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Despesas Recorrentes</span>
                  <span className="font-bold">{analytics.expenseStats.recorrente}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Despesas Parceladas</span>
                  <span className="font-bold">{analytics.expenseStats.parcelada}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span>Total Despesas</span>
                  <span className="font-bold text-orange-600">
                    R$ {(analytics.totalExpensesPaid + analytics.totalExpensesPending).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                  </span>
                </div>
                <Progress value={analytics.expenseStats.paid / Math.max(1, expenses.length) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {(analytics.expenseStats.paid / Math.max(1, expenses.length) * 100).toFixed(1)}% despesas pagas
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
                  <h4 className="font-semibold text-green-600 flex items-center gap-2">
                    Receitas
                    <Badge variant="outline" className="text-xs">Regime de Caixa</Badge>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">💰 Pagamentos Recebidos</span>
                      <span className="font-semibold text-green-600">R$ {analytics.totalReceived.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">⏳ Pagamentos Pendentes</span>
                      <span className="text-blue-600">R$ {analytics.totalPending.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">⚠️ Pagamentos Atrasados</span>
                      <span className="text-red-600">R$ {analytics.totalOverdue.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Realizado</span>
                      <span className="font-semibold">R$ {analytics.totalReceived.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Previsto</span>
                      <span>R$ {(analytics.totalReceived + analytics.totalPending + analytics.totalOverdue).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-red-600 flex items-center gap-2">
                    Despesas
                    <Badge variant="outline" className="text-xs">Regime de Caixa</Badge>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">💸 Despesas Pagas</span>
                      <span className="font-semibold text-red-600">R$ {totalExpensesPaidReal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">👥 Salários Pagos</span>
                      <span className="font-semibold text-red-600">R$ {totalSalariesPaidReal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">⏳ Despesas Pendentes</span>
                      <span className="text-orange-600">R$ {analytics.totalExpensesPending.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">⏳ Salários Pendentes</span>
                      <span className="text-orange-600">R$ {(totalSalariesExpected - totalSalariesPaidReal).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Custos Reais</span>
                      <span className="font-semibold">R$ {totalCostsReal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Custos Previstos</span>
                      <span>R$ {totalCostsExpected.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {/* Resultado Real (Caixa) */}
                <div className="p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">💰 Resultado Real (Caixa)</span>
                      <p className="text-xs text-muted-foreground">Apenas valores recebidos vs pagos</p>
                    </div>
                    <span className={`text-2xl font-bold ${netProfitReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {netProfitReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Resultado Previsto (Competência) */}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">📊 Resultado Previsto (Competência)</span>
                      <p className="text-xs text-muted-foreground">Considerando pendentes e atrasados</p>
                    </div>
                    <span className={`text-2xl font-bold ${netProfitExpected >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      R$ {netProfitExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Alerta de Diferença */}
                {Math.abs(netProfitExpected - netProfitReal) > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <div className="text-sm">
                        <span className="font-medium">Diferença de R$ {Math.abs(netProfitExpected - netProfitReal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-muted-foreground ml-1">
                          {netProfitExpected > netProfitReal 
                            ? '(valores a receber/pagar ainda não efetivados)' 
                            : '(pagamentos atrasados impactando o resultado)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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

      <PaymentForm 
        open={paymentFormOpen} 
        onOpenChange={open => {
          setPaymentFormOpen(open);
          if (!open) {
            setSelectedPayment(null);
            setPreselectedClientForPayment(null);
          }
        }} 
        payment={selectedPayment} 
        preselectedClient={preselectedClientForPayment || undefined}
        onSuccess={fetchData} 
      />

      <ExpenseForm open={expenseFormOpen} onOpenChange={open => {
      setExpenseFormOpen(open);
      if (!open) setSelectedExpense(null);
    }} expense={selectedExpense} onSuccess={fetchData} />

      <SalaryForm open={salaryFormOpen} onOpenChange={open => {
        setSalaryFormOpen(open);
        if (!open) setSelectedSalary(null);
      }} salary={selectedSalary} onSuccess={fetchData} />

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

        {/* Modal de Detalhes do Salário */}
        <SalaryDetailsDialog
          salary={selectedSalary}
          open={salaryDetailsOpen}
          onOpenChange={setSalaryDetailsOpen}
          onEdit={() => {
            setSalaryDetailsOpen(false);
            handleEditSalary(selectedSalary!);
          }}
          onDelete={() => {
            setSalaryDetailsOpen(false);
            handleDeleteSalary(selectedSalary!);
          }}
        />

        {/* Dialog de confirmação de exclusão de salário */}
        <AlertDialog open={salaryDeleteDialogOpen} onOpenChange={setSalaryDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o salário de "{salaryToDelete?.employee_name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSalary} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>;
}