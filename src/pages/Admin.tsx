import { useState, useEffect } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertCircle, Users, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  monthly_value: number | null;
  active: boolean;
  start_date: string | null;
  contact: string | null;
  service: string | null;
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
  }, [hasAccess]);

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
      .order('name');
    if (error) throw error;
    setClients(data || []);
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('client_payments')
      .select('*')
      .order('due_date', { ascending: false });
    if (error) throw error;
    setPayments(data || []);
  };

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('due_date', { ascending: false });
    if (error) throw error;
    setExpenses(data || []);
  };

  const fetchSalaries = async () => {
    const { data, error } = await supabase
      .from('salaries')
      .select('*')
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

  // Cálculos financeiros
  const totalReceivable = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalReceived = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.filter(e => e.status !== 'paid').reduce((sum, e) => sum + e.amount, 0);
  const totalSalaries = salaries.filter(s => s.status !== 'paid').reduce((sum, s) => sum + s.amount, 0);
  const monthlyRevenue = clients.filter(c => c.active).reduce((sum, c) => sum + (c.monthly_value || 0), 0);

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
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              contas a pagar
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalSalaries.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              folha de pagamento
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
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
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
                    <Badge className={client.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {client.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Valor Mensal:</span>
                      <p>{client.monthly_value 
                        ? `R$ ${client.monthly_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'Não definido'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Contato:</span>
                      <p>{client.contact || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Início:</span>
                      <p>{client.start_date 
                        ? new Date(client.start_date).toLocaleDateString('pt-BR')
                        : 'Não informado'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Pagamentos de Clientes</h3>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Pagamento
            </Button>
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
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusLabel(payment.status)}
                      </Badge>
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
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Despesa
            </Button>
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
            <Button className="flex items-center gap-2">
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
    </div>
  );
}