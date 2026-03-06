import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Facebook, Settings, Trash2, Check, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

interface AdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  current_month_spend: number;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

interface LeadForm {
  id: string;
  name: string;
}

interface Integration {
  id: string;
  page_id: string;
  page_name: string;
  form_id: string;
  form_name: string;
  default_status: string;
  default_priority: string;
  is_active: boolean;
  pixel_id: string | null;
  last_sync_at: string | null;
}

interface DiscoveredPixel {
  pixel_id: string;
  pixel_name: string;
}

export function MetaIntegrationConfig() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [hasConnection, setHasConnection] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [currentIntegration, setCurrentIntegration] = useState<Integration | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form State
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [selectedPageToken, setSelectedPageToken] = useState<string>("");
  const [selectedForm, setSelectedForm] = useState<string>("all");
  const [isActive, setIsActive] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState("leads");
  const [defaultTemperature, setDefaultTemperature] = useState("cold");

  // Pixel state
  const [discoveredPixels, setDiscoveredPixels] = useState<DiscoveredPixel[]>([]);
  const [selectedPixelId, setSelectedPixelId] = useState<string>("");
  const [testEventCode, setTestEventCode] = useState<string>("");
  const [loadingPixels, setLoadingPixels] = useState(false);

  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, [currentAgency]);

  useEffect(() => {
    if (hasConnection) {
      fetchAdAccounts();
      fetchIntegration();
    }
  }, [hasConnection, currentAgency]);

  const checkConnection = async () => {
    if (!currentAgency) return;

    try {
      const { data, error } = await supabase
        .from('facebook_connections')
        .select('id')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      setHasConnection(!!data);
      setConnectionId(data?.id || null);
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdAccounts = async () => {
    if (!currentAgency?.id) return;

    try {
      const { data, error } = await supabase
        .from('selected_ad_accounts')
        .select('*')
        .eq('agency_id', currentAgency.id);

      if (error) throw error;
      setAdAccounts(data || []);

      const { data: agency } = await supabase
        .from('agencies')
        .select('crm_ad_account_id')
        .eq('id', currentAgency.id)
        .single();

      if (agency?.crm_ad_account_id) {
        setSelectedAdAccount(agency.crm_ad_account_id);
        
        const selectedAcc = (data || []).find((a: AdAccount) => a.id === agency.crm_ad_account_id);
        if (selectedAcc && (selectedAcc as any).last_sync) {
          setLastSync((selectedAcc as any).last_sync);
        }
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    }
  };

  const handleManualSync = async () => {
    if (!selectedAdAccount || syncing) return;

    const account = adAccounts.find(a => a.id === selectedAdAccount);
    if (!account) return;

    setSyncing(true);
    try {
      const success = await syncAccountData(account.ad_account_id);
      if (success) {
        toast({
          title: "✅ Sincronização concluída",
          description: "Dados atualizados com sucesso."
        });
        await fetchAdAccounts();
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const fetchIntegration = async () => {
    if (!currentAgency?.id) return;

    try {
      // Only fetch the catch-all integration row (form_id='all') — qualification rows have specific form_ids
      const { data, error } = await supabase
        .from('facebook_lead_integrations')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('form_id', 'all')
        .maybeSingle();

      if (data) {
        setCurrentIntegration({
          id: data.id,
          page_id: data.page_id,
          page_name: data.page_name,
          form_id: data.form_id,
          form_name: data.form_name,
          default_status: data.default_status,
          default_priority: data.default_priority,
          is_active: data.is_active,
          pixel_id: data.pixel_id,
          last_sync_at: data.last_sync_at
        });
      }
    } catch (error) {
      console.error('Error fetching integration:', error);
    }
  };

  const fetchPages = async (): Promise<FacebookPage[]> => {
    if (!currentAgency) return [];

    setLoadingPages(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'list_pages',
          agencyId: currentAgency.id
        }
      });

      if (error) throw error;
      const loadedPages = data.pages || [];
      setPages(loadedPages);
      return loadedPages;
    } catch (error: any) {
      toast({
        title: "Erro ao buscar páginas",
        description: error.message,
        variant: "destructive"
      });
      return [];
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchForms = async (pageId: string, pageToken: string) => {
    if (!currentAgency) return;

    setLoadingForms(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'list_forms',
          agencyId: currentAgency.id,
          pageId,
          pageAccessToken: pageToken
        }
      });

      if (error) throw error;
      setForms(data.forms || []);
    } catch (error: any) {
      toast({
        title: "Erro ao buscar formulários",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingForms(false);
    }
  };

  const fetchPixels = async () => {
    if (!currentAgency || !selectedAdAccount) return;

    const account = adAccounts.find(a => a.id === selectedAdAccount);
    if (!account) return;

    setLoadingPixels(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('facebook-accounts', {
        body: {
          action: 'list_pixels',
          agencyId: currentAgency.id,
          adAccountId: account.ad_account_id,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      setDiscoveredPixels(data.pixels || []);
      
      if ((data.pixels || []).length === 0) {
        toast({
          title: "Nenhum pixel encontrado",
          description: "Esta conta de anúncios não possui pixels configurados.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao buscar pixels",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingPixels(false);
    }
  };

  const loadExistingPixels = async () => {
    if (!currentAgency) return;
    const { data } = await supabase
      .from('facebook_pixels')
      .select('pixel_id, pixel_name, is_selected, test_event_code')
      .eq('agency_id', currentAgency.id)
      .eq('is_active', true);

    if (data && data.length > 0) {
      setDiscoveredPixels(data.map((p: any) => ({ pixel_id: p.pixel_id, pixel_name: p.pixel_name })));
      const selected = data.find((p: any) => p.is_selected);
      if (selected) {
        setSelectedPixelId(selected.pixel_id);
        setTestEventCode(selected.test_event_code || "");
      }
    }
  };

  const handlePageSelect = async (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    setSelectedPage(pageId);
    setSelectedPageToken(page.access_token);
    setSelectedForm("all");
    setForms([]);
    await fetchForms(pageId, page.access_token);
  };

  const handleOpenDialog = async () => {
    setDialogOpen(true);
    
    // Load existing pixels from DB
    await loadExistingPixels();
    
    // Fetch pages and wait for them to load
    const loadedPages = await fetchPages();

    // Pre-fill form if editing
    if (currentIntegration) {
      setSelectedPage(currentIntegration.page_id);
      setSelectedForm(currentIntegration.form_id || "all");
      setIsActive(currentIntegration.is_active);
      // Defensive fallback: if stored status doesn't match known values, use "leads"
      const knownStatuses = ["leads", "new", "em_contato", "qualified", "scheduled", "meeting", "proposal", "won"];
      const storedStatus = currentIntegration.default_status;
      setDefaultStatus(knownStatuses.includes(storedStatus) ? storedStatus : "leads");
      setDefaultTemperature(currentIntegration.default_priority);

      // Find page in loaded list and fetch forms
      const page = loadedPages.find(p => p.id === currentIntegration.page_id);
      if (page) {
        setSelectedPageToken(page.access_token);
        await fetchForms(page.id, page.access_token);
        // Re-set form after forms are loaded
        setSelectedForm(currentIntegration.form_id || "all");
      }
    }
  };

  const syncAccountData = async (adAccountId: string) => {
    if (!currentAgency) return false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.functions.invoke('facebook-account-summary', {
        body: { accountIds: [adAccountId], agencyId: currentAgency.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      return true;
    } catch (error) {
      console.error('Error syncing:', error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!currentAgency || !connectionId) return;

    if (!selectedPage || selectedForm === "") {
      toast({
        title: "Dados incompletos",
        description: "Selecione uma página e um formulário",
        variant: "destructive"
      });
      return;
    }

    const page = pages.find(p => p.id === selectedPage);
    const form = forms.find(f => f.id === selectedForm);

    setSaving(true);
    try {
      // Save ad account selection
      if (selectedAdAccount) {
        await supabase
          .from('agencies')
          .update({ crm_ad_account_id: selectedAdAccount })
          .eq('id', currentAgency.id);

        const account = adAccounts.find(a => a.id === selectedAdAccount);
        if (account) {
          await syncAccountData(account.ad_account_id);
        }
      }

      // Delete only the catch-all integration row (form_id='all') to avoid touching qualification rows
      await supabase
        .from('facebook_lead_integrations')
        .delete()
        .eq('agency_id', currentAgency.id)
        .eq('form_id', 'all');

      // Save new integration
      const { error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'save_integration',
          agencyId: currentAgency.id,
          connectionId,
          pageId: selectedPage,
          pageName: page?.name || '',
          pageAccessToken: selectedPageToken,
          formId: selectedForm === 'all' ? 'all' : selectedForm,
          formName: selectedForm === 'all' ? 'Todos os formulários' : (form?.name || ''),
          defaultStatus,
          defaultPriority: defaultTemperature,
          pixelId: selectedPixelId || null
        }
      });

      if (error) throw error;

      // Save pixel selection in facebook_pixels table
      if (selectedPixelId && currentAgency) {
        // Deselect all pixels for this agency first
        await supabase
          .from('facebook_pixels')
          .update({ is_selected: false, test_event_code: null })
          .eq('agency_id', currentAgency.id);

        // Select the chosen pixel
        await supabase
          .from('facebook_pixels')
          .update({ is_selected: true, test_event_code: testEventCode || null })
          .eq('agency_id', currentAgency.id)
          .eq('pixel_id', selectedPixelId);
      }

      // Update pixel_id on integration
      if (selectedPixelId) {
        await supabase
          .from('facebook_lead_integrations')
          .update({ pixel_id: selectedPixelId, is_active: isActive })
          .eq('agency_id', currentAgency.id)
          .eq('page_id', selectedPage);
      }

      toast({
        title: "✅ Integração salva!",
        description: "Sua integração com Meta foi configurada com sucesso."
      });

      setDialogOpen(false);
      await fetchIntegration();
      await fetchAdAccounts();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar integração",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentIntegration || !currentAgency) return;

    try {
      await supabase
        .from('facebook_lead_integrations')
        .delete()
        .eq('id', currentIntegration.id);

      await supabase
        .from('agencies')
        .update({ crm_ad_account_id: null })
        .eq('id', currentAgency.id);

      toast({
        title: "Integração removida",
        description: "A integração foi desativada com sucesso."
      });

      setCurrentIntegration(null);
      setSelectedAdAccount("");
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao remover integração",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const selectedAccountData = adAccounts.find(a => a.id === selectedAdAccount);
  

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!hasConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Integração Meta
          </CardTitle>
          <CardDescription>
            Conecte sua conta do Facebook para integrar leads e investimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Você precisa conectar sua conta do Facebook primeiro no módulo de Tráfego.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/traffic')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ir para Tráfego
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                Integração Meta
              </CardTitle>
              <CardDescription>
                Gerencie sua conta de anúncios e captura de leads
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentIntegration || selectedAdAccount ? (
            <div className="space-y-4">
              {/* Status Card */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default" className="bg-emerald-600">
                    <Check className="h-3 w-3 mr-1" />
                    Conectada
                  </Badge>
                </div>

                {selectedAccountData && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Conta de Anúncios</span>
                      <span className="font-medium">{selectedAccountData.ad_account_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Investimento do Mês</span>
                      <span className="font-bold text-lg">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: selectedAccountData.currency || 'BRL',
                        }).format(selectedAccountData.current_month_spend || 0)}
                      </span>
                    </div>
                  </>
                )}

                {currentIntegration && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Página</span>
                      <span className="font-medium">{currentIntegration.page_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Formulário</span>
                      <span className="font-medium">{currentIntegration.form_name}</span>
                    </div>
                    {currentIntegration.pixel_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pixel ID</span>
                        <span className="font-mono text-sm">{currentIntegration.pixel_id}</span>
                      </div>
                    )}
                  </>
                )}

                {lastSync && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Última sincronização</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lastSync).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleManualSync} 
                  disabled={syncing || !selectedAdAccount}
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleOpenDialog} className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Editar Configuração
                </Button>
                <Button 
                  variant="destructive" 
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Facebook className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma integração configurada</h3>
              <p className="text-muted-foreground mb-4">
                Configure sua conta de anúncios e captura de leads do Facebook
              </p>
              <Button onClick={handleOpenDialog}>
                <Settings className="h-4 w-4 mr-2" />
                Configurar Meta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-600" />
              Configurar Meta
            </DialogTitle>
            <DialogDescription>
              Configure sua conta de anúncios e captura de leads
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Ad Account */}
            <div className="space-y-2">
              <Label>Conta de Anúncios *</Label>
              <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {adAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span>{account.ad_account_name}</span>
                        <span className="text-xs text-muted-foreground">{account.currency}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Usada para calcular métricas de investimento
              </p>
            </div>

            {/* Facebook Page */}
            <div className="space-y-2">
              <Label>Página do Facebook</Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedPage} 
                  onValueChange={handlePageSelect}
                  disabled={loadingPages}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={loadingPages ? "Carregando páginas..." : "Selecione uma página"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchPages()}
                  disabled={loadingPages}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingPages ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione para receber leads desta página
              </p>
            </div>

            {/* Lead Form */}
            <div className="space-y-2">
              <Label>Formulário de Leads</Label>
              <Select 
                value={selectedForm} 
                onValueChange={setSelectedForm}
                disabled={!selectedPage || loadingForms}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingForms ? "Carregando formulários..." : "Selecione um formulário"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os formulários</SelectItem>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Default Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status Padrão</Label>
                <Select value={defaultStatus} onValueChange={setDefaultStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="em_contato">Em contato</SelectItem>
                    <SelectItem value="qualified">Qualificados</SelectItem>
                    <SelectItem value="scheduled">Agendamentos</SelectItem>
                    <SelectItem value="meeting">Reuniões</SelectItem>
                    <SelectItem value="proposal">Propostas</SelectItem>
                    <SelectItem value="won">Vendas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperatura Padrão</Label>
                <Select value={defaultTemperature} onValueChange={setDefaultTemperature}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">❄️ Frio</SelectItem>
                    <SelectItem value="warm">🌡️ Morno</SelectItem>
                    <SelectItem value="hot">🔥 Quente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pixel de Conversão */}
            <div className="space-y-2">
              <Label>Pixel de Conversão (CAPI)</Label>
              <Select
                value={selectedPixelId}
                onValueChange={setSelectedPixelId}
                onOpenChange={(open) => {
                  if (open && selectedAdAccount && discoveredPixels.length === 0 && !loadingPixels) {
                    fetchPixels();
                  }
                }}
              >
                <SelectTrigger>
                  {loadingPixels ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">Buscando pixels...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Selecione um pixel" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {discoveredPixels.map((pixel) => (
                    <SelectItem key={pixel.pixel_id} value={pixel.pixel_id}>
                      <div className="flex flex-col">
                        <span>{pixel.pixel_name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{pixel.pixel_id}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {discoveredPixels.length === 0 && !loadingPixels && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      Nenhum pixel encontrado
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Os pixels serão carregados automaticamente ao abrir a lista
              </p>
            </div>

            {/* Test Event Code */}
            {selectedPixelId && (
              <div className="space-y-2">
                <Label>Test Event Code (opcional)</Label>
                <Input
                  placeholder="Ex: TEST12345"
                  value={testEventCode}
                  onChange={(e) => setTestEventCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Código para testar eventos no Meta Events Manager (remover em produção)
                </p>
              </div>
            )}

            {/* Active Switch */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Integração Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Desative para pausar recebimento de leads
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !selectedAdAccount}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover integração?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá desativar a captura automática de leads e remover a conta de anúncios vinculada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
