import { useState, useEffect } from "react";
import { DollarSign, RefreshCw, AlertTriangle, CheckCircle, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
}

interface AccountBalance {
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  balance: number;
  minThreshold: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
}

interface BalanceCheckerTabProps {
  selectedAdAccounts: SelectedAdAccount[];
}

export function BalanceCheckerTab({ selectedAdAccounts }: BalanceCheckerTabProps) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [globalMinThreshold, setGlobalMinThreshold] = useState(100);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (selectedAdAccounts.length > 0) {
      checkAllBalances();
    }
  }, [selectedAdAccounts]);

  const checkAllBalances = async () => {
    setLoading(true);
    
    try {
      // Chamar edge function para verificar saldos
      const { data, error } = await supabase.functions.invoke('facebook-balance', {
        body: { 
          accountIds: selectedAdAccounts.map(acc => acc.ad_account_id)
        }
      });

      if (error) throw error;
      
      // Processar dados dos saldos reais
      const balanceData = selectedAdAccounts.map(account => {
        const accountBalance = data?.balances?.find((b: any) => b.accountId === account.ad_account_id);
        const balance = accountBalance?.balance || 0;
        const threshold = globalMinThreshold;
        
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (balance <= threshold * 0.5) {
          status = 'critical';
        } else if (balance <= threshold) {
          status = 'warning';
        }

        return {
          ad_account_id: account.ad_account_id,
          ad_account_name: account.ad_account_name,
          currency: accountBalance?.currency || account.currency,
          balance: balance,
          minThreshold: threshold,
          status,
          lastUpdated: new Date().toISOString()
        };
      });

      setBalances(balanceData);
      setLastCheck(new Date());
      
      // Verificar se há contas com saldo baixo
      const criticalAccounts = balanceData.filter(acc => acc.status === 'critical').length;
      const warningAccounts = balanceData.filter(acc => acc.status === 'warning').length;
      
      if (criticalAccounts > 0) {
        toast({
          title: "⚠️ Saldo Crítico!",
          description: `${criticalAccounts} conta(s) com saldo muito baixo precisam de atenção imediata.`,
          variant: "destructive",
        });
      } else if (warningAccounts > 0) {
        toast({
          title: "🔶 Atenção",
          description: `${warningAccounts} conta(s) estão próximas do limite mínimo.`,
        });
      } else {
        toast({
          title: "✅ Saldos OK",
          description: "Todas as contas estão com saldo adequado.",
        });
      }

    } catch (error: any) {
      console.error('Erro ao verificar saldos:', error);
      toast({
        title: "Erro ao verificar saldos",
        description: "Não foi possível verificar os saldos das contas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSingleBalance = async (accountId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('facebook-balance', {
        body: { 
          action: 'check_single_balance',
          accountId
        }
      });

      if (error) throw error;
      
      // Atualizar apenas essa conta
      setBalances(prev => prev.map(balance => 
        balance.ad_account_id === accountId
          ? { ...balance, balance: data.balance, lastUpdated: new Date().toISOString() }
          : balance
      ));
      
      toast({
        title: "Saldo atualizado",
        description: `Saldo da conta ${balances.find(b => b.ad_account_id === accountId)?.ad_account_name} foi atualizado.`,
      });
    } catch (error: any) {
      console.error('Erro ao verificar saldo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o saldo desta conta.",
        variant: "destructive",
      });
    }
  };

  const updateThreshold = (accountId: string, newThreshold: number) => {
    setBalances(prev => prev.map(balance => {
      if (balance.ad_account_id === accountId) {
        const updatedBalance = { ...balance, minThreshold: newThreshold };
        
        // Recalcular status
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (updatedBalance.balance <= newThreshold * 0.5) {
          status = 'critical';
        } else if (updatedBalance.balance <= newThreshold) {
          status = 'warning';
        }
        
        return { ...updatedBalance, status };
      }
      return balance;
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Saudável</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Atenção</Badge>;
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getUsagePercentage = (balance: number, threshold: number) => {
    return Math.max(0, Math.min(100, (balance / threshold) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Verificador de Saldo</h3>
          <p className="text-sm text-muted-foreground">
            Monitore os saldos de todas as suas contas de anúncios
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configurar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações de Saldo</DialogTitle>
                <DialogDescription>
                  Configure o limite mínimo padrão para todas as contas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="threshold">Limite Mínimo Padrão (R$)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={globalMinThreshold}
                    onChange={(e) => setGlobalMinThreshold(Number(e.target.value))}
                    placeholder="100"
                  />
                </div>
                <Button 
                  onClick={() => {
                    setIsSettingsOpen(false);
                    toast({
                      title: "Configurações salvas",
                      description: "Limite mínimo padrão atualizado.",
                    });
                  }}
                  className="w-full"
                >
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={checkAllBalances}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Verificando...' : 'Verificar Todos'}
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balances.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldos Saudáveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {balances.filter(b => b.status === 'healthy').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Precisam Atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {balances.filter(b => b.status === 'warning').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldos Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {balances.filter(b => b.status === 'critical').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {lastCheck && (
        <Alert>
          <AlertDescription>
            Última verificação: {lastCheck.toLocaleString('pt-BR')}
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de Contas */}
      <div className="space-y-4">
        {balances.map((balance) => (
          <Card key={balance.ad_account_id} className={`border-l-4 ${
            balance.status === 'critical' ? 'border-l-red-500' :
            balance.status === 'warning' ? 'border-l-yellow-500' :
            'border-l-green-500'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(balance.status)}
                  <div>
                    <h4 className="font-medium">{balance.ad_account_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      ID: {balance.ad_account_id}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: balance.currency === 'USD' ? 'USD' : 'BRL'
                      }).format(balance.balance)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Limite: {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: balance.currency === 'USD' ? 'USD' : 'BRL'
                      }).format(balance.minThreshold)}
                    </div>
                  </div>
                  
                  {getStatusBadge(balance.status)}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkSingleBalance(balance.ad_account_id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uso do orçamento</span>
                  <span>{getUsagePercentage(balance.balance, balance.minThreshold).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={getUsagePercentage(balance.balance, balance.minThreshold)} 
                  className={`h-2 ${
                    balance.status === 'critical' ? 'bg-red-100' :
                    balance.status === 'warning' ? 'bg-yellow-100' :
                    'bg-green-100'
                  }`}
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Label htmlFor={`threshold-${balance.ad_account_id}`} className="text-sm">
                  Limite mínimo:
                </Label>
                <Input
                  id={`threshold-${balance.ad_account_id}`}
                  type="number"
                  value={balance.minThreshold}
                  onChange={(e) => updateThreshold(balance.ad_account_id, Number(e.target.value))}
                  className="w-24 h-8"
                />
                <span className="text-sm text-muted-foreground">{balance.currency}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {balances.length === 0 && !loading && (
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhuma conta de anúncios selecionada para verificação de saldo.
          </p>
        </div>
      )}
    </div>
  );
}