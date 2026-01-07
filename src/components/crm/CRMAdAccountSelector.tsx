import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, AlertCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

interface AdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  current_month_spend: number;
  last_7d_spend: number;
  updated_at: string;
}

interface CRMAdAccountSelectorProps {
  onInvestmentChange?: (investment: number) => void;
}

export function CRMAdAccountSelector({ onInvestmentChange }: CRMAdAccountSelectorProps) {
  const { currentAgency } = useAgency();
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (currentAgency?.id) {
      fetchAdAccounts();
      fetchSelectedAccount();
    }
  }, [currentAgency?.id]);

  const fetchAdAccounts = async () => {
    if (!currentAgency?.id) return;

    try {
      const { data, error } = await supabase
        .from('selected_ad_accounts')
        .select('*')
        .eq('agency_id', currentAgency.id);

      if (error) throw error;
      setAdAccounts(data || []);
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedAccount = async () => {
    if (!currentAgency?.id) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('crm_ad_account_id')
        .eq('id', currentAgency.id)
        .single();

      if (error) throw error;
      
      if (data?.crm_ad_account_id) {
        setSelectedAccountId(data.crm_ad_account_id);
        
        // Find the account and notify parent of investment
        const account = adAccounts.find(a => a.id === data.crm_ad_account_id);
        if (account && onInvestmentChange) {
          onInvestmentChange(account.current_month_spend || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching selected account:', error);
    }
  };

  const syncAccountData = async (adAccountId: string) => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('facebook-account-summary', {
        body: { accountIds: [adAccountId] },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      await fetchAdAccounts();
      
      if (onInvestmentChange && response.data?.summaries?.[0]) {
        onInvestmentChange(response.data.summaries[0].current_month_spend || 0);
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing:', error);
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const handleAccountSelect = async (accountId: string) => {
    if (!currentAgency?.id) return;

    try {
      const { error } = await supabase
        .from('agencies')
        .update({ crm_ad_account_id: accountId === 'none' ? null : accountId })
        .eq('id', currentAgency.id);

      if (error) throw error;
      
      setSelectedAccountId(accountId === 'none' ? null : accountId);
      
      // Sincronizar automaticamente ao selecionar
      if (accountId !== 'none') {
        const account = adAccounts.find(a => a.id === accountId);
        if (account) {
          toast.info('Sincronizando dados da conta...');
          const success = await syncAccountData(account.ad_account_id);
          if (success) {
            toast.success('Conta selecionada e dados sincronizados!');
          } else {
            toast.warning('Conta selecionada, mas houve erro ao sincronizar dados');
          }
        }
      } else if (onInvestmentChange) {
        onInvestmentChange(0);
        toast.success('Conta de anúncios removida');
      }
    } catch (error) {
      console.error('Error updating ad account:', error);
      toast.error('Erro ao atualizar conta de anúncios');
    }
  };

  const handleSync = async () => {
    if (!selectedAccountId) return;

    const account = adAccounts.find(a => a.id === selectedAccountId);
    if (!account) return;

    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('facebook-account-summary', {
        body: { accountIds: [account.ad_account_id] },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      await fetchAdAccounts();
      
      // Update investment with new data
      if (onInvestmentChange && response.data?.summaries?.[0]) {
        onInvestmentChange(response.data.summaries[0].current_month_spend || 0);
      }

      toast.success('Dados sincronizados com sucesso');
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erro ao sincronizar dados');
    } finally {
      setSyncing(false);
    }
  };

  const selectedAccount = adAccounts.find(a => a.id === selectedAccountId);

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Update parent when accounts are loaded
  useEffect(() => {
    if (selectedAccountId && adAccounts.length > 0 && onInvestmentChange) {
      const account = adAccounts.find(a => a.id === selectedAccountId);
      if (account) {
        onInvestmentChange(account.current_month_spend || 0);
      }
    }
  }, [adAccounts, selectedAccountId, onInvestmentChange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Conta de Anúncios da Agência
            </CardTitle>
            <CardDescription>
              Selecione a conta para puxar o investimento em tempo real
            </CardDescription>
          </div>
          {selectedAccountId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedAccountId || 'none'}
          onValueChange={handleAccountSelect}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma conta de anúncios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma conta selecionada</SelectItem>
            {adAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.ad_account_name || account.ad_account_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {adAccounts.length === 0 && !loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span>Nenhuma conta de anúncios conectada. Conecte pelo módulo de Tráfego.</span>
          </div>
        )}

        {selectedAccount && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="default" className="bg-emerald-600">
                <Check className="h-3 w-3 mr-1" />
                Conectada
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Investimento do Mês</span>
              <span className="font-bold text-lg">
                {formatCurrency(selectedAccount.current_month_spend || 0, selectedAccount.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Últimos 7 dias</span>
              <span className="font-medium">
                {formatCurrency(selectedAccount.last_7d_spend || 0, selectedAccount.currency)}
              </span>
            </div>
            {selectedAccount.updated_at && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Última atualização</span>
                <span>
                  {new Date(selectedAccount.updated_at).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
