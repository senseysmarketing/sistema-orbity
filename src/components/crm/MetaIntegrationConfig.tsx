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
  const [pixelId, setPixelId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState("leads");
  const [defaultPriority, setDefaultPriority] = useState("medium");

  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);

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

      // Get current selection from agency
      const { data: agency } = await supabase
        .from('agencies')
        .select('crm_ad_account_id')
        .eq('id', currentAgency.id)
        .single();

      if (agency?.crm_ad_account_id) {
        setSelectedAdAccount(agency.crm_ad_account_id);
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    }
  };

  const fetchIntegration = async () => {
    if (!currentAgency?.id) return;

    try {
      const { data, error } = await supabase
        .from('facebook_lead_integrations')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

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

  const fetchPages = async () => {
    if (!currentAgency) return;

    setLoadingPages(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'list_pages',
          agencyId: currentAgency.id
        }
      });

      if (error) throw error;
      setPages(data.pages || []);
    } catch (error: any) {
      toast({
        title: "Erro ao buscar páginas",
        description: error.message,
        variant: "destructive"
      });
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
    await fetchPages();

    // Pre-fill form if editing
    if (currentIntegration) {
      setSelectedPage(currentIntegration.page_id);
      setSelectedForm(currentIntegration.form_id || "all");
      setPixelId(currentIntegration.pixel_id || "");
      setIsActive(currentIntegration.is_active);
      setDefaultStatus(currentIntegration.default_status);
      setDefaultPriority(currentIntegration.default_priority);
    }
  };

  const syncAccountData = async (adAccountId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.functions.invoke('facebook-account-summary', {
        body: { accountIds: [adAccountId] },
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

        // Sync account data
        const account = adAccounts.find(a => a.id === selectedAdAccount);
        if (account) {
          await syncAccountData(account.ad_account_id);
        }
      }

      // Delete existing integration if exists
      if (currentIntegration) {
        await supabase
          .from('facebook_lead_integrations')
          .delete()
          .eq('id', currentIntegration.id);
      }

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
          defaultPriority,
          pixelId: pixelId || null
        }
      });

      if (error) throw error;

      // Update pixel_id directly since edge function might not handle it
      if (pixelId) {
        await supabase
          .from('facebook_lead_integrations')
          .update({ pixel_id: pixelId, is_active: isActive })
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
        <DialogContent className="sm:max-w-[500px]">
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
                    <SelectValue placeholder="Selecione uma página" />
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
                  onClick={fetchPages}
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
                  <SelectValue placeholder="Selecione um formulário" />
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="qualified">Qualificados</SelectItem>
                    <SelectItem value="scheduled">Agendamentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade Padrão</Label>
                <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pixel ID */}
            <div className="space-y-2">
              <Label>Pixel ID (para CAPI)</Label>
              <Input
                placeholder="Ex: 141984582644620"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ID do Pixel para envio de eventos de conversão (opcional)
              </p>
            </div>

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
