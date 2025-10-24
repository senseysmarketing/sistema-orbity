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
  access_token?: string;
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
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [defaultStatus, setDefaultStatus] = useState("new");
  const [defaultPriority, setDefaultPriority] = useState("medium");

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

  const fetchForms = async (pageId: string) => {
    if (!currentAgency) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'list_forms',
          agencyId: currentAgency.id,
          pageId
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
      const { data, error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'get_integrations',
          agencyId: currentAgency.id
        }
      });

      if (error) throw error;

      setIntegrations(data.integrations || []);
    } catch (error: any) {
      console.error('Error fetching integrations:', error);
    }
  };

  const handlePageSelect = async (pageId: string) => {
    setSelectedPage(pageId);
    setSelectedForm("");
    setForms([]);
    await fetchForms(pageId);
  };

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
          formId: selectedForm,
          formName: form.name,
          defaultStatus,
          defaultPriority
        }
      });

      if (error) throw error;

      toast({
        title: "Integração salva!",
        description: "A integração com Facebook Leads foi configurada com sucesso"
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
      const { error } = await supabase.functions.invoke('facebook-leads', {
        body: {
          action: 'delete_integration',
          integrationId: integrationToDelete
        }
      });

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
            onClick={() => navigate('/traffic')}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Página do Facebook</Label>
              <div className="flex gap-2">
                <Select value={selectedPage} onValueChange={handlePageSelect}>
                  <SelectTrigger>
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
                    <div className="font-medium">{integration.form_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {integration.page_name}
                    </div>
                    {integration.last_sync_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Última sincronização: {new Date(integration.last_sync_at).toLocaleString('pt-BR')}
                      </div>
                    )}
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
