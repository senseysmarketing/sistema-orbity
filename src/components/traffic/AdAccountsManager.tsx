import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Search, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone?: string;
  account_status: string;
}

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
}

interface AdAccountsManagerProps {
  onAccountsSelected: () => void;
}

export function AdAccountsManager({ onAccountsSelected }: AdAccountsManagerProps) {
  const [availableAccounts, setAvailableAccounts] = useState<AdAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<SelectedAdAccount[]>([]);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const { getMaxFacebookAdAccounts, loading: subLoading, currentSubscription } = useSubscription();

  // Sincronizar com o limite do plano atual
  const maxAccounts = getMaxFacebookAdAccounts();
  const senseysUnlimited = (currentSubscription?.plan_name || '').trim().toLowerCase().includes('senseys');
  const isUnlimited = senseysUnlimited || !Number.isFinite(maxAccounts) || maxAccounts >= 999999;

  useEffect(() => {
    fetchAvailableAccounts();
    fetchSelectedAccounts();
  }, []);

  const fetchAvailableAccounts = async () => {
    try {
      // Chamar edge function para buscar contas disponíveis
      const { data, error } = await supabase.functions.invoke('facebook-accounts', {
        body: { action: 'list_ad_accounts' }
      });

      if (error) throw error;
      
      setAvailableAccounts(data?.accounts || []);
    } catch (error: any) {
      console.error('Erro ao buscar contas:', error);
      toast({
        title: "Erro ao carregar contas",
        description: "Não foi possível carregar as contas de anúncios disponíveis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedAccounts = async () => {
    if (!currentAgency) return;
    
    try {
      const { data, error } = await supabase
        .from('selected_ad_accounts')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true);

      if (error) throw error;
      
      setSelectedAccounts(data || []);
      setTempSelectedIds((data || []).map(acc => acc.ad_account_id));
    } catch (error: any) {
      console.error('Erro ao buscar contas selecionadas:', error);
    }
  };

  const handleAccountToggle = (accountId: string, checked: boolean) => {
    if (checked) {
      if (!isUnlimited && !subLoading && Number.isFinite(maxAccounts) && tempSelectedIds.length >= maxAccounts) {
        toast({
          title: "Limite atingido",
          description: `Você pode selecionar no máximo ${maxAccounts} contas de anúncios.`,
          variant: "destructive",
        });
        return;
      }
      setTempSelectedIds([...tempSelectedIds, accountId]);
    } else {
      setTempSelectedIds(tempSelectedIds.filter(id => id !== accountId));
    }
  };

  const handleSaveSelection = async () => {
    setSaving(true);
    
    try {
      const selectedIds = [...tempSelectedIds];

      if (selectedIds.length > 0) {
        // 1) Upsert das contas selecionadas (evita duplicatas)
        const accountsToUpsert = selectedIds.map((accountId) => {
          const account = availableAccounts.find((acc) => acc.id === accountId);
          return {
            ad_account_id: accountId,
            ad_account_name: account?.name || '',
            currency: account?.currency || 'USD',
            timezone: account?.timezone || null,
            is_active: true,
            // Placeholders apenas para satisfazer TS; o trigger define os valores corretos
            agency_id: '00000000-0000-0000-0000-000000000000',
            connection_id: '00000000-0000-0000-0000-000000000000',
          };
        });

        const { error: upsertError } = await supabase
          .from('selected_ad_accounts')
          .upsert(accountsToUpsert, {
            onConflict: 'agency_id,ad_account_id',
            ignoreDuplicates: false,
          });
        if (upsertError) throw upsertError;

        // 2) Desativar as que não foram selecionadas (apenas desta agência)
        if (currentAgency) {
          const notIn = `(${selectedIds.map((id) => `"${id}"`).join(',')})`;
          const { error: deactivateOthersError } = await supabase
            .from('selected_ad_accounts')
            .update({ is_active: false })
            .eq('agency_id', currentAgency.id)
            .not('ad_account_id', 'in', notIn);
          if (deactivateOthersError) throw deactivateOthersError;
        }
      } else {
        // Nenhuma selecionada: desativar todas (apenas desta agência)
        if (currentAgency) {
          const { error: deactivateAllError } = await supabase
            .from('selected_ad_accounts')
            .update({ is_active: false })
            .eq('agency_id', currentAgency.id);
          if (deactivateAllError) throw deactivateAllError;
        }
      }

      toast({
        title: 'Contas atualizadas!',
        description: `${selectedIds.length} contas de anúncios selecionadas.`,
      });

      await fetchSelectedAccounts();
      onAccountsSelected();
    } catch (error: any) {
      console.error('Erro ao salvar seleção:', error?.message || error, error);
      toast({
        title: 'Erro ao salvar',
        description: error?.message || 'Não foi possível salvar a seleção de contas.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  const filteredAccounts = availableAccounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Carregando contas de anúncios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Selecionar Contas de Anúncios</h3>
          <p className="text-sm text-muted-foreground">
            {isUnlimited
              ? 'Escolha contas de anúncios para monitorar (ilimitado)'
              : `Escolha até ${maxAccounts} contas para monitorar`}
          </p>
        </div>
        <Badge variant="outline">
          {isUnlimited
            ? `${tempSelectedIds.length} selecionadas`
            : `${tempSelectedIds.length}/${maxAccounts} selecionadas`}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contas de anúncios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={fetchAvailableAccounts} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {!isUnlimited && !subLoading && Number.isFinite(maxAccounts) && tempSelectedIds.length >= maxAccounts && (
          <Alert>
            <AlertDescription>
              Você atingiu o limite de {maxAccounts} contas de anúncios para seu plano. 
              Para adicionar mais contas, considere fazer upgrade do seu plano.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {filteredAccounts.map((account) => (
            <Card key={account.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={account.id}
                    checked={tempSelectedIds.includes(account.id)}
                    onCheckedChange={(checked) => 
                      handleAccountToggle(account.id, checked as boolean)
                    }
                    disabled={
                      !isUnlimited &&
                      !subLoading &&
                      !tempSelectedIds.includes(account.id) && 
                      Number.isFinite(maxAccounts) &&
                      tempSelectedIds.length >= maxAccounts
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{account.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {account.currency}
                      </Badge>
                      {account.account_status === 'ACTIVE' && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          Ativa
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      ID: {account.id}
                    </p>
                    {account.timezone && (
                      <p className="text-xs text-muted-foreground">
                        Fuso: {account.timezone}
                      </p>
                    )}
                  </div>
                  {tempSelectedIds.includes(account.id) && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAccounts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma conta encontrada com esse termo.' : 'Nenhuma conta de anúncios disponível.'}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={handleSaveSelection}
          disabled={saving || tempSelectedIds.length === 0}
          className="flex-1"
        >
          {saving ? "Salvando..." : "Salvar Seleção"}
        </Button>
      </div>
    </div>
  );
}