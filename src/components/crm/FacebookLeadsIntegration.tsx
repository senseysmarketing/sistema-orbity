import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Facebook, RefreshCw, Trash2, AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
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
  page_name: string;
  form_name: string;
  default_status: string;
  default_priority: string;
  is_active: boolean;
  webhook_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export function FacebookLeadsIntegration() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [hasConnection, setHasConnection] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  const [selectedPage, setSelectedPage] = useState<string>("");
  const [selectedPageToken, setSelectedPageToken] = useState<string>("");
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [defaultStatus, setDefaultStatus] = useState("new");
  const [defaultTemperature, setDefaultTemperature] = useState("cold");
  
  const [pageSearch, setPageSearch] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, [currentAgency]);

  useEffect(() => {
    if (hasConnection) {
      fetchIntegrations();
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

  const fetchPages = async () => {
    if (!currentAgency) return;

    setLoading(true);
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
      setLoading(false);
    }
  };

  const fetchForms = async (pageId: string, pageToken: string) => {
    if (!currentAgency) return;

    setLoading(true);
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
      setLoading(false);
    }
  };

  const fetchIntegrations = async () => {
    if (!currentAgency) return;

    try {
      const { data, error } = await supabase
        .from('facebook_lead_integrations')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map database fields to component format
      const mappedIntegrations = (data || []).map(integration => ({
        id: integration.id,
        page_name: integration.page_name,
        form_name: integration.form_name,
        default_status: integration.default_status,
        default_priority: integration.default_priority,
        is_active: integration.is_active,
        webhook_active: integration.sync_method === 'webhook',
        last_sync_at: integration.last_sync_at,
        created_at: integration.created_at
      }));

      setIntegrations(mappedIntegrations);
    } catch (error: any) {
      console.error('Error fetching integrations:', error);
      toast({
        title: "Erro ao buscar integrações",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePageSelect = async (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    setSelectedPage(pageId);
    setSelectedPageToken(page.access_token);
    setSelectedForm("");
    setForms([]);
    await fetchForms(pageId, page.access_token);
  };

  const filteredPages = pages.filter(page =>
    page.name.toLowerCase().includes(pageSearch.toLowerCase())
  );

  const handleSaveIntegration = async () => {
    if (!currentAgency || !connectionId || !selectedPage || !selectedForm) {
      toast({
        title: "Dados incompletos",
        description: "Selecione uma página e um formulário",
        variant: "destructive"
      });
      return;
    }

    const page = pages.find(p => p.id === selectedPage);
    const form = forms.find(f => f.id === selectedForm);

    if (!page || !form) return;

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'save_integration',
          agencyId: currentAgency.id,
          connectionId,
          pageId: selectedPage,
          pageName: page.name,
          pageAccessToken: selectedPageToken,
          formId: selectedForm,
          formName: form.name,
          defaultStatus,
          defaultPriority: defaultTemperature
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Integração salva!",
        description: "Webhook configurado! Os leads serão capturados automaticamente."
      });

      // Reset form
      setSelectedPage("");
      setSelectedForm("");
      setForms([]);

      // Refresh integrations
      await fetchIntegrations();
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

  const handleSyncLeads = async (integrationId: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'sync_leads',
          integrationId
        }
      });

      if (error) throw error;

      toast({
        title: "Sincronização concluída",
        description: `${data.synced} leads novos importados, ${data.skipped} já existentes`
      });

      await fetchIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteIntegration = async () => {
    if (!integrationToDelete) return;

    try {
      const { error } = await supabase
        .from('facebook_lead_integrations')
        .delete()
        .eq('id', integrationToDelete);

      if (error) throw error;

      toast({
        title: "Integração removida",
        description: "A integração foi removida com sucesso"
      });

      await fetchIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro ao remover integração",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setIntegrationToDelete(null);
    }
  };

  if (loading && !hasConnection) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!hasConnection) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Para integrar leads do Facebook, você precisa conectar sua conta primeiro
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Nueva integración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Nova Integração de Leads
          </CardTitle>
          <CardDescription>
            Configure a captura automática de leads do Facebook Lead Ads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p>Os leads serão capturados <strong>automaticamente e instantaneamente</strong> quando preencherem o formulário!</p>
                <p className="text-xs">Clique em <RefreshCw className="h-3 w-3 inline" /> para carregar suas páginas</p>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Página do Facebook</Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Buscar página..."
                    value={pageSearch}
                    onChange={(e) => setPageSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                  />
                  <Select value={selectedPage} onValueChange={handlePageSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma página" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPages.length === 0 && pages.length > 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhuma página encontrada
                        </div>
                      )}
                      {filteredPages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchPages}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Formulário de Lead</Label>
              <Select 
                value={selectedForm} 
                onValueChange={setSelectedForm}
                disabled={!selectedPage || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um formulário" />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status Padrão</Label>
              <Select value={defaultStatus} onValueChange={setDefaultStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="contacted">Contatado</SelectItem>
                  <SelectItem value="qualified">Qualificado</SelectItem>
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

          <Button
            onClick={handleSaveIntegration}
            disabled={!selectedPage || !selectedForm || saving}
            className="w-full"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Integração
          </Button>
        </CardContent>
      </Card>

      {/* Integrações ativas */}
      {integrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Integrações Ativas</CardTitle>
            <CardDescription>
              Gerencie suas integrações de leads do Facebook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{integration.form_name}</div>
                      {integration.webhook_active && (
                        <Badge variant="default" className="bg-green-600">
                          🔄 Automático
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {integration.page_name}
                    </div>
                    {integration.webhook_active ? (
                      <div className="text-xs text-green-600 mt-1 font-medium">
                        ✅ Captura automática ativa - leads chegam instantaneamente
                      </div>
                    ) : integration.last_sync_at ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        Última sincronização: {new Date(integration.last_sync_at).toLocaleString('pt-BR')}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={integration.is_active ? "default" : "secondary"}>
                      {integration.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncLeads(integration.id)}
                      disabled={syncing}
                      title="Sincronização manual (backup)"
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIntegrationToDelete(integration.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover integração?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A integração será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIntegration}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
