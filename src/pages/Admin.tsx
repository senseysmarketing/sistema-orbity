import { useState, useEffect } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertCircle, Building, Filter, Banknote, Eye, Edit, Trash2, MoreHorizontal, Calendar, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  
  // Sort states
  const [clientSort, setClientSort] = useState<'name' | 'monthly_value' | 'start_date'>('name');
  const [paymentSort, setPaymentSort] = useState<'client' | 'amount' | 'due_date' | 'status'>('due_date');
  const [expenseSort, setExpenseSort] = useState<'name' | 'amount' | 'due_date' | 'status'>('due_date');
  
  const { profile } = useAuth();
  const { toast } = useToast();

  // Verifica se o usuário tem permissão para acessar a página
  const hasAccess = profile?.role === 'administrador';

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasAccess, selectedMonth, clientSort, paymentSort, expenseSort]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchClients(),
        fetchPayments(),
        fetchExpenses(),
        fetchSalaries()
      ]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order(clientSort);
    if (error) throw error;
    setClients(data || []);
  };

  // Função para atualizar status dos pagamentos automaticamente
  const updatePaymentStatuses = async () => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    try {
      const { error } = await supabase
        .from('client_payments')
        .update({ status: 'overdue' })
        .lt('due_date', currentDate)
        .eq('status', 'pending');
      
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
    
    const { data, error } = await supabase
      .from('client_payments')
      .select('*')
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order(paymentSort, { ascending: paymentSort === 'status' ? true : false });
    if (error) throw error;
    setPayments(data || []);
  };

  const fetchExpenses = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // último dia do mês
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order(expenseSort, { ascending: expenseSort === 'status' ? true : false });
    if (error) throw error;
    setExpenses(data || []);
  };

  const fetchSalaries = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // último dia do mês
    
    const { data, error } = await supabase
      .from('salaries')
      .select('*')
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date', { ascending: false });
    if (error) throw error;
    setSalaries(data || []);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente desconhecido';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      default: return status;
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
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: "Cliente excluído com sucesso!",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: 'pending' | 'paid' | 'overdue') => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.paid_date = null;
      }

      const { error } = await supabase
        .from('client_payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "Status do pagamento foi atualizado com sucesso",
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
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
        const { data: existingPayment } = await supabase
          .from('client_payments')
          .select('id')
          .eq('client_id', client.id)
          .gte('due_date', `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`)
          .lt('due_date', `${nextYear}-${String(nextMonth + 2).padStart(2, '0')}-01`)
          .single();
        
        if (!existingPayment) {
          const { error } = await supabase
            .from('client_payments')
            .insert([{
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
        description: "Pagamentos do próximo mês foram gerados automaticamente.",
      });
      
      // Recarregar dados
      fetchPayments();
      
    } catch (error: any) {
      toast({
        title: "Erro ao fechar mês",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Cálculos financeiros
  const totalReceivable = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalReceived = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSalaries = salaries.reduce((sum, s) => sum + s.amount, 0);
  const totalCosts = totalExpenses + totalSalaries;
  const monthlyRevenue = clients.filter(c => c.active).reduce((sum, c) => sum + (c.monthly_value || 0), 0);
  const netProfit = monthlyRevenue - totalCosts;

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground text-center">
              Esta página é restrita apenas para administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administrativo</h1>
          <p className="text-muted-foreground">
            Gestão financeira e administrativa da empresa
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
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  return (
                    <SelectItem key={value} value={value}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={closeMonth}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Fechar Mês
          </Button>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              contratos ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              pagamentos pendentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              despesas + salários
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              receita - custos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes seções */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="salaries">Salários</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Clientes</h3>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setClientSort('name')}>
                    Por Nome
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClientSort('monthly_value')}>
                    Por Valor Mensal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClientSort('start_date')}>
                    Por Data de Início
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setClientFormOpen(true)} variant="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {clients.map((client) => (
              <Card key={client.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription>
                        {client.service || 'Serviço não especificado'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={client.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {client.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewClient(client)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClient(client)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <span>
                      <strong>Valor:</strong> {client.monthly_value 
                        ? `R$ ${client.monthly_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'Não definido'}
                    </span>
                    <span>
                      <strong>Contato:</strong> {client.contact || 'Não informado'}
                    </span>
                    <span>
                      <strong>Início:</strong> {client.start_date 
                        ? new Date(client.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
                        : 'Não informado'}
                    </span>
                    <span>
                      <strong>Vencimento:</strong> {client.due_date ? `Dia ${client.due_date}` : 'Não informado'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Pagamentos de Clientes</h3>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPaymentSort('due_date')}>
                    Por Data de Vencimento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPaymentSort('amount')}>
                    Por Valor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPaymentSort('status')}>
                    Por Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setPaymentFormOpen(true)} variant="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Pagamento
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-medium">{getClientName(payment.client_id)}</h4>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                      </p>
                      {payment.paid_date && (
                        <p className="text-sm text-muted-foreground">
                          Pago em: {new Date(payment.paid_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-lg font-semibold">
                        R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(payment.status)}>
                          {getStatusLabel(payment.status)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'pending')}>
                              Pendente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'paid')}>
                              Pago
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, 'overdue')}>
                              Atrasado
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Despesas</h3>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setExpenseSort('name')}>
                    Por Nome
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExpenseSort('amount')}>
                    Por Valor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExpenseSort('due_date')}>
                    Por Data de Vencimento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExpenseSort('status')}>
                    Por Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setExpenseFormOpen(true)} variant="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Despesa
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-medium">{expense.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {new Date(expense.due_date).toLocaleDateString('pt-BR')}
                      </p>
                      {expense.paid_date && (
                        <p className="text-sm text-muted-foreground">
                          Pago em: {new Date(expense.paid_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {expense.is_fixed && (
                        <Badge variant="outline">Despesa Fixa</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <Badge className={getStatusColor(expense.status)}>
                        {getStatusLabel(expense.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="salaries" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Salários</h3>
            <Button onClick={() => setSalaryFormOpen(true)} variant="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Salário
            </Button>
          </div>
          <div className="grid gap-4">
            {salaries.map((salary) => (
              <Card key={salary.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-medium">{salary.employee_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {new Date(salary.due_date).toLocaleDateString('pt-BR')}
                      </p>
                      {salary.paid_date && (
                        <p className="text-sm text-muted-foreground">
                          Pago em: {new Date(salary.paid_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        R$ {salary.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <Badge className={getStatusColor(salary.status)}>
                        {getStatusLabel(salary.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <ClientForm 
        open={clientFormOpen} 
        onOpenChange={(open) => {
          setClientFormOpen(open);
          if (!open) setSelectedClient(null);
        }}
        onSuccess={fetchData}
        client={selectedClient}
      />
      <PaymentForm 
        open={paymentFormOpen} 
        onOpenChange={setPaymentFormOpen} 
        onSuccess={fetchData} 
      />
      <ExpenseForm 
        open={expenseFormOpen} 
        onOpenChange={setExpenseFormOpen} 
        onSuccess={fetchData} 
      />
      <SalaryForm 
        open={salaryFormOpen} 
        onOpenChange={setSalaryFormOpen} 
        onSuccess={fetchData} 
      />

      {/* Client Details Dialog */}
      {selectedClient && (
        <AlertDialog open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Detalhes do Cliente</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-foreground">Nome</h4>
                      <p className="text-sm">{selectedClient.name}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Status</h4>
                      <Badge className={selectedClient.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {selectedClient.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-foreground">Serviço</h4>
                      <p className="text-sm">{selectedClient.service || 'Não especificado'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Valor Mensal</h4>
                      <p className="text-sm">
                        {selectedClient.monthly_value 
                          ? `R$ ${selectedClient.monthly_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'Não definido'}
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-foreground">Contato</h4>
                      <p className="text-sm">{selectedClient.contact || 'Não informado'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Data de Início</h4>
                      <p className="text-sm">
                        {selectedClient.start_date 
                          ? new Date(selectedClient.start_date + 'T12:00:00').toLocaleDateString('pt-BR')
                          : 'Não informado'}
                      </p>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setClientDetailsOpen(false);
                handleEditClient(selectedClient);
              }}>
                Editar Cliente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteClient}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}