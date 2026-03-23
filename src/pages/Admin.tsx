import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useLimitEnforcement } from "@/hooks/useLimitEnforcement";
import { useFinancialMetrics } from "@/hooks/useFinancialMetrics";
import type { Client, ClientPayment, Expense, Salary, Employee } from "@/hooks/useFinancialMetrics";

// Forms (keep using Dialog internally - Diretriz 1: they work standalone)
import { ClientForm } from "@/components/admin/ClientForm";
import { PaymentSheet } from "@/components/admin/PaymentSheet";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { SalaryForm } from "@/components/admin/SalaryForm";
import { EmployeeForm } from "@/components/admin/EmployeeForm";

// Details dialogs
import { ClientDetailsDialog } from "@/components/admin/ClientDetailsDialog";
import { ExpenseDetailsDialog } from "@/components/admin/ExpenseDetailsDialog";
import { SalaryDetailsDialog } from "@/components/admin/SalaryDetailsDialog";
import { EmployeeDetailsDialog } from "@/components/admin/EmployeeDetailsDialog";

// Command Center components
import { FloatingActionBar } from "@/components/admin/CommandCenter/FloatingActionBar";
import { HeroMetrics } from "@/components/admin/CommandCenter/HeroMetrics";
import { CashFlowTable } from "@/components/admin/CommandCenter/CashFlowTable";
import { ClientProfitabilityCard } from "@/components/admin/CommandCenter/ClientProfitabilityCard";
import { TeamSection } from "@/components/admin/CommandCenter/TeamSection";

export default function Admin() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Form open states
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [salaryFormOpen, setSalaryFormOpen] = useState(false);
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);

  // Selected items for editing
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<ClientPayment | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [preselectedClientForPayment, setPreselectedClientForPayment] = useState<{ id: string; name: string; monthly_value?: number | null } | null>(null);

  // Details open states
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(false);
  const [salaryDetailsOpen, setSalaryDetailsOpen] = useState(false);
  const [employeeDetailsOpen, setEmployeeDetailsOpen] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [expenseDeleteDialogOpen, setExpenseDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [salaryDeleteDialogOpen, setSalaryDeleteDialogOpen] = useState(false);
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);
  const [employeeDeleteDialogOpen, setEmployeeDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [paymentDeleteDialogOpen, setPaymentDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<ClientPayment | null>(null);

  // Action states
  const [runningClosure, setRunningClosure] = useState(false);
  const [generatingSalaries, setGeneratingSalaries] = useState(false);
  const [hasEnsuredCurrentMonthPayments, setHasEnsuredCurrentMonthPayments] = useState(false);

  const hasAccess = profile?.role === 'agency_admin';

  // Financial metrics hook
  const metrics = useFinancialMetrics(currentAgency?.id, selectedMonth);

  // Auto-generate current month payments for active clients
  useEffect(() => {
    if (!currentAgency?.id || metrics.clients.length === 0 || metrics.paymentsAll.length === 0) return;
    if (hasEnsuredCurrentMonthPayments) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const activeClients = metrics.clients.filter(c => c.active && !!c.monthly_value && !!c.due_date);
    const missingClients = activeClients.filter(c => !metrics.paymentsAll.some(p => p.client_id === c.id && p.due_date.startsWith(monthPrefix)));

    if (missingClients.length === 0) {
      setHasEnsuredCurrentMonthPayments(true);
      return;
    }

    const rows = missingClients.map(c => ({
      client_id: c.id,
      agency_id: currentAgency.id,
      amount: Number(c.monthly_value),
      due_date: `${year}-${String(month).padStart(2, '0')}-${String(Math.min(c.due_date, 28)).padStart(2, '0')}`,
      status: 'pending' as const,
    }));

    const upsertMissing = async () => {
      const { error } = await supabase
        .from('client_payments')
        .upsert(rows, { onConflict: 'agency_id,client_id,extract_month_immutable(due_date)', ignoreDuplicates: true });
      if (error) console.error('Erro ao gerar pagamentos:', error);
      setHasEnsuredCurrentMonthPayments(true);
      metrics.refetchAll();
    };
    upsertMissing();
  }, [metrics.clients, metrics.paymentsAll, currentAgency?.id, hasEnsuredCurrentMonthPayments]);

  // ============ HANDLERS ============

  const handleEditClient = (client: Client) => { setSelectedClient(client); setClientFormOpen(true); };
  const handleViewClient = (client: Client) => { setSelectedClient(client); setClientDetailsOpen(true); };
  
  const handleDeactivateClient = async (client: Client) => {
    try {
      const { error } = await supabase.from('clients').update({ active: false, cancelled_at: new Date().toISOString() }).eq('id', client.id);
      if (error) throw error;
      toast({ title: "Cliente desativado", description: `${client.name} foi desativado` });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleReactivateClient = async (client: Client) => {
    try {
      const { error } = await supabase.from('clients').update({ active: true, cancelled_at: null }).eq('id', client.id);
      if (error) throw error;
      toast({ title: "Cliente reativado", description: `${client.name} foi reativado` });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteClient = (client: Client) => { setClientToDelete(client); setDeleteDialogOpen(true); };
  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    if (clientToDelete.active) {
      toast({ title: "Operação não permitida", description: "Desative o cliente antes de excluir.", variant: "destructive" });
      setDeleteDialogOpen(false); setClientToDelete(null); return;
    }
    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientToDelete.id);
      if (error) throw error;
      toast({ title: "Cliente excluído", description: "Cliente excluído permanentemente!" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false); setClientToDelete(null);
    }
  };

  // Payment handlers
  const handleEditPayment = (payment: ClientPayment) => { setSelectedPayment(payment); setPaymentFormOpen(true); };
  const handleDeletePayment = (payment: ClientPayment) => { setPaymentToDelete(payment); setPaymentDeleteDialogOpen(true); };
  const handleMarkPaymentAsPaid = async (paymentId: string) => {
    try {
      const { error } = await supabase.from('client_payments').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', paymentId);
      if (error) throw error;
      toast({ title: "Pago", description: "Pagamento marcado como pago" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };
  const handleDeletePaymentById = async (paymentId: string) => {
    try {
      const { error } = await supabase.from('client_payments').delete().eq('id', paymentId);
      if (error) throw error;
      toast({ title: "Excluído", description: "Pagamento excluído" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };
  const handleUpdatePaymentDueDate = async (paymentId: string, newDueDate: string) => {
    try {
      const { error } = await supabase.from('client_payments').update({ due_date: newDueDate }).eq('id', paymentId);
      if (error) throw error;
      toast({ title: "Atualizado", description: "Data de vencimento atualizada" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };
  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      const { error } = await supabase.from('client_payments').delete().eq('id', paymentToDelete.id);
      if (error) throw error;
      toast({ title: "Excluído", description: "Pagamento excluído" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setPaymentDeleteDialogOpen(false); setPaymentToDelete(null);
    }
  };

  // Expense handlers
  const handleEditExpense = (expense: Expense) => { setSelectedExpense(expense); setExpenseFormOpen(true); };
  const handleViewExpense = (expense: Expense) => { setSelectedExpense(expense); setExpenseDetailsOpen(true); };
  const handleViewMasterExpense = async (masterId: string) => {
    if (!currentAgency) return;
    const { data, error } = await supabase.from('expenses').select('*').eq('id', masterId).eq('agency_id', currentAgency.id).single();
    if (error || !data) { toast({ title: "Erro", description: "Despesa mestra não encontrada", variant: "destructive" }); return; }
    setSelectedExpense(data); setExpenseDetailsOpen(true);
  };
  const handleDeleteExpense = (expense: Expense) => { setExpenseToDelete(expense); setExpenseDeleteDialogOpen(true); };
  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseToDelete.id);
      if (error) throw error;
      toast({ title: "Excluído", description: "Despesa excluída" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setExpenseDeleteDialogOpen(false); setExpenseToDelete(null);
    }
  };

  // Smart expense deletion handlers (Instância vs Herança)
  const handleDeleteExpenseInstance = async (expense: Expense) => {
    try {
      const { error } = await supabase.from('expenses').update({ status: 'cancelled' }).eq('id', expense.id);
      if (error) throw error;
      toast({ title: "Despesa cancelada", description: `"${expense.name}" foi cancelada para este mês.` });
      metrics.refetchAll();
      setExpenseFormOpen(false);
      setExpenseDetailsOpen(false);
      setSelectedExpense(null);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleCancelExpenseSubscription = async (expense: Expense) => {
    try {
      // 1. Cancel this instance
      const { error: instanceError } = await supabase.from('expenses').update({ status: 'cancelled' }).eq('id', expense.id);
      if (instanceError) throw instanceError;

      // 2. Deactivate the master (parent or self if it's the master)
      const parentId = expense.parent_expense_id || expense.id;
      const { error: masterError } = await supabase.from('expenses').update({ is_active: false }).eq('id', parentId);
      if (masterError) throw masterError;

      toast({ title: "Assinatura cancelada", description: `"${expense.name}" foi cancelada e não será mais gerada automaticamente.` });
      metrics.refetchAll();
      setExpenseFormOpen(false);
      setExpenseDetailsOpen(false);
      setSelectedExpense(null);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // Salary handlers
  const handleViewSalary = (salary: Salary) => { setSelectedSalary(salary); setSalaryDetailsOpen(true); };
  const handleEditSalary = (salary: Salary) => { setSelectedSalary(salary); setSalaryFormOpen(true); };
  const handleDeleteSalary = (salary: Salary) => { setSalaryToDelete(salary); setSalaryDeleteDialogOpen(true); };
  const confirmDeleteSalary = async () => {
    if (!salaryToDelete) return;
    try {
      const { error } = await supabase.from('salaries').delete().eq('id', salaryToDelete.id);
      if (error) throw error;
      toast({ title: "Excluído", description: "Salário excluído" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSalaryDeleteDialogOpen(false); setSalaryToDelete(null);
    }
  };

  // Employee handlers
  const handleViewEmployee = (employee: Employee) => { setSelectedEmployee(employee); setEmployeeDetailsOpen(true); };
  const handleEditEmployee = (employee: Employee) => { setSelectedEmployee(employee); setEmployeeFormOpen(true); };
  const handleDeleteEmployee = (employee: Employee) => { setEmployeeToDelete(employee); setEmployeeDeleteDialogOpen(true); };
  const handleToggleEmployeeActive = async (employee: Employee) => {
    try {
      const newStatus = !employee.is_active;
      const { error } = await supabase.from('employees').update({ is_active: newStatus, end_date: newStatus ? null : new Date().toISOString().split('T')[0] }).eq('id', employee.id);
      if (error) throw error;
      toast({ title: newStatus ? "Ativado" : "Desativado", description: `${employee.name} foi ${newStatus ? 'ativado' : 'desativado'}` });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };
  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      const { error } = await supabase.from('employees').delete().eq('id', employeeToDelete.id);
      if (error) throw error;
      toast({ title: "Excluído", description: "Funcionário excluído" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setEmployeeDeleteDialogOpen(false); setEmployeeToDelete(null);
    }
  };

  // Monthly actions
  const handleRunMonthlyClosure = async () => {
    if (!currentAgency) return;
    setRunningClosure(true);
    try {
      const { error } = await supabase.functions.invoke('monthly-closure');
      if (error) throw error;
      toast({ title: "Fechamento executado", description: "Fechamento mensal executado!" });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setRunningClosure(false);
    }
  };

  const handleGenerateSalaries = async () => {
    if (!currentAgency) return;
    setGeneratingSalaries(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const { data: activeEmployees, error: empError } = await supabase.from('employees').select('*').eq('agency_id', currentAgency.id).eq('is_active', true);
      if (empError) throw empError;
      if (!activeEmployees?.length) {
        toast({ title: "Nenhum funcionário ativo", variant: "destructive" }); return;
      }
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      const { data: existing } = await supabase.from('salaries').select('employee_id').eq('agency_id', currentAgency.id).gte('due_date', startDate).lte('due_date', endDate);
      const existingIds = new Set(existing?.map(s => s.employee_id) || []);
      const toGenerate = activeEmployees.filter(e => !existingIds.has(e.id));
      if (!toGenerate.length) {
        toast({ title: "Salários já gerados" }); return;
      }
      const rows = toGenerate.map(emp => ({
        agency_id: currentAgency.id,
        employee_id: emp.id,
        employee_name: emp.name,
        amount: emp.base_salary,
        due_date: `${selectedMonth}-${String(Math.min(emp.payment_day || 5, lastDay)).padStart(2, '0')}`,
        status: 'pending' as const,
      }));
      const { error } = await supabase.from('salaries').insert(rows);
      if (error) throw error;
      toast({ title: "Salários gerados", description: `${rows.length} salário(s) gerado(s)` });
      metrics.refetchAll();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingSalaries(false);
    }
  };

  // ============ RENDER ============

  if (metrics.isLoading && !metrics.clients.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
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
            <CardDescription className="text-lg">Você não tem permissão para acessar esta área</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Permissão Necessária</AlertTitle>
              <AlertDescription>
                Esta tela é exclusiva para administradores da agência.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center pt-4">
              <Button onClick={() => navigate('/')} variant="default">Voltar ao Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedMonth={selectedMonth}
        onChangeMonth={setSelectedMonth}
        onNewClient={() => { setSelectedClient(null); setClientFormOpen(true); }}
        onNewExpense={() => { setSelectedExpense(null); setExpenseFormOpen(true); }}
        onNewPayment={() => { setSelectedPayment(null); setPreselectedClientForPayment(null); setPaymentFormOpen(true); }}
      />

      {/* Hero Metrics */}
      <HeroMetrics
        totalMRR={metrics.totalMRR}
        burnRate={metrics.burnRate}
        profitability={metrics.profitability}
        profitabilityMargin={metrics.profitabilityMargin}
        delinquencyRate={metrics.delinquencyRate}
        isLoading={metrics.isLoading}
      />

      {/* Main Grid: Cash Flow + Client Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CashFlowTable
          className="lg:col-span-2"
          cashFlow={metrics.unifiedCashFlow}
          expensesByCategory={metrics.expensesByCategory}
          onMarkAsPaid={metrics.markAsPaid}
          isMarkingAsPaid={metrics.isMarkingAsPaid}
          onEditItem={(item) => {
            if (item.sourceType === 'client_payment') {
              const payment = metrics.paymentsInMonth.find(p => p.id === item.sourceId);
              if (payment) { setSelectedPayment(payment); setPaymentFormOpen(true); }
            } else if (item.sourceType === 'expense') {
              const expense = metrics.expenses.find(e => e.id === item.sourceId);
              if (expense) { setSelectedExpense(expense); setExpenseFormOpen(true); }
            } else if (item.sourceType === 'salary') {
              const salary = metrics.salaries.find(s => s.id === item.sourceId);
              if (salary) { setSelectedSalary(salary); setSalaryFormOpen(true); }
            }
          }}
          onCancelItem={metrics.cancelItem}
          isCancellingItem={metrics.isCancellingItem}
        />
        <ClientProfitabilityCard clients={metrics.clientProfitability} />
      </div>

      {/* Team Section */}
      <TeamSection
        employees={metrics.employees}
        onEditEmployee={handleEditEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        onToggleEmployeeActive={handleToggleEmployeeActive}
        onAddEmployee={() => { setSelectedEmployee(null); setEmployeeFormOpen(true); }}
        onGenerateSalaries={handleGenerateSalaries}
        onRunClosure={handleRunMonthlyClosure}
        generatingSalaries={generatingSalaries}
        runningClosure={runningClosure}
      />

      {/* ============ FORMS (Dialog-based, standalone) ============ */}
      <ClientForm
        open={clientFormOpen}
        onOpenChange={open => { setClientFormOpen(open); if (!open) setSelectedClient(null); }}
        client={selectedClient}
        onSuccess={metrics.refetchAll}
      />

      <PaymentSheet
        open={paymentFormOpen}
        onOpenChange={open => { setPaymentFormOpen(open); if (!open) { setSelectedPayment(null); setPreselectedClientForPayment(null); } }}
        payment={selectedPayment}
        preselectedClient={preselectedClientForPayment || undefined}
        clients={metrics.clients}
        onSuccess={metrics.refetchAll}
      />

      <ExpenseForm
        open={expenseFormOpen}
        onOpenChange={open => { setExpenseFormOpen(open); if (!open) setSelectedExpense(null); }}
        expense={selectedExpense}
        onSuccess={metrics.refetchAll}
        onDelete={handleDeleteExpense}
        onDeleteInstance={handleDeleteExpenseInstance}
        onCancelSubscription={handleCancelExpenseSubscription}
      />

      <SalaryForm
        open={salaryFormOpen}
        onOpenChange={open => { setSalaryFormOpen(open); if (!open) setSelectedSalary(null); }}
        salary={selectedSalary}
        onSuccess={metrics.refetchAll}
      />

      <EmployeeForm
        open={employeeFormOpen}
        onOpenChange={open => { setEmployeeFormOpen(open); if (!open) setSelectedEmployee(null); }}
        employee={selectedEmployee}
        onSuccess={metrics.refetchAll}
      />

      {/* ============ DETAILS DIALOGS ============ */}
      <ClientDetailsDialog
        client={selectedClient}
        open={clientDetailsOpen}
        onOpenChange={setClientDetailsOpen}
        payments={metrics.paymentsAll.filter(p => p.client_id === selectedClient?.id)}
        onEdit={handleEditClient}
        onGenerateContract={(client) => navigate(`/contracts?clientId=${client.id}`)}
        onDeactivate={handleDeactivateClient}
        onReactivate={handleReactivateClient}
        onDelete={handleDeleteClient}
        onMarkPaymentAsPaid={handleMarkPaymentAsPaid}
        onDeletePayment={handleDeletePaymentById}
        onUpdatePaymentDueDate={handleUpdatePaymentDueDate}
      />

      <ExpenseDetailsDialog
        expense={selectedExpense}
        open={expenseDetailsOpen}
        onOpenChange={setExpenseDetailsOpen}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
        onDeleteInstance={handleDeleteExpenseInstance}
        onCancelSubscription={handleCancelExpenseSubscription}
        onRefresh={metrics.refetchAll}
        onViewMaster={handleViewMasterExpense}
      />

      <SalaryDetailsDialog
        salary={selectedSalary}
        open={salaryDetailsOpen}
        onOpenChange={setSalaryDetailsOpen}
        onEdit={() => { setSalaryDetailsOpen(false); if (selectedSalary) handleEditSalary(selectedSalary); }}
        onDelete={() => { setSalaryDetailsOpen(false); if (selectedSalary) handleDeleteSalary(selectedSalary); }}
      />

      <EmployeeDetailsDialog
        employee={selectedEmployee}
        open={employeeDetailsOpen}
        onOpenChange={setEmployeeDetailsOpen}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
        onToggleActive={handleToggleEmployeeActive}
      />

      {/* ============ DELETE CONFIRMATIONS (AlertDialog) ============ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente Permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{clientToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={paymentDeleteDialogOpen} onOpenChange={setPaymentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este pagamento?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={expenseDeleteDialogOpen} onOpenChange={setExpenseDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{expenseToDelete?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={salaryDeleteDialogOpen} onOpenChange={setSalaryDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o salário de "{salaryToDelete?.employee_name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSalary} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={employeeDeleteDialogOpen} onOpenChange={setEmployeeDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o funcionário "{employeeToDelete?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
