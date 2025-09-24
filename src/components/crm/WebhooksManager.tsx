import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MoreHorizontal, Edit, Trash2, Webhook, CheckCircle, XCircle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string[];
  headers: any;
  secret_token: string | null;
  is_active: boolean;
  last_triggered: string | null;
  success_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export function WebhooksManager() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    headers: '{}',
    secret_token: '',
    is_active: true,
  });

  const availableEvents = [
    { value: 'lead.created', label: 'Lead Criado' },
    { value: 'lead.updated', label: 'Lead Atualizado' },
    { value: 'lead.status_changed', label: 'Status do Lead Alterado' },
    { value: 'lead.deleted', label: 'Lead Excluído' },
    { value: 'activity.created', label: 'Atividade Criada' },
    { value: 'activity.completed', label: 'Atividade Concluída' },
  ];

  const fetchWebhooks = async () => {
    if (!currentAgency?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agency_webhooks')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [currentAgency?.id]);

  useEffect(() => {
    if (selectedWebhook) {
      setFormData({
        name: selectedWebhook.name,
        url: selectedWebhook.url,
        events: selectedWebhook.events,
        headers: JSON.stringify(selectedWebhook.headers, null, 2),
        secret_token: selectedWebhook.secret_token || '',
        is_active: selectedWebhook.is_active,
      });
    } else {
      setFormData({
        name: '',
        url: '',
        events: [],
        headers: '{}',
        secret_token: '',
        is_active: true,
      });
    }
  }, [selectedWebhook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentAgency?.id || !profile?.user_id) {
      toast.error('Agência ou usuário não encontrado');
      return;
    }

    try {
      let headers;
      try {
        headers = JSON.parse(formData.headers);
      } catch {
        toast.error('Headers deve ser um JSON válido');
        return;
      }

      const webhookData = {
        agency_id: currentAgency.id,
        name: formData.name,
        url: formData.url,
        events: formData.events,
        headers,
        secret_token: formData.secret_token || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (selectedWebhook) {
        const { error } = await supabase
          .from('agency_webhooks')
          .update(webhookData)
          .eq('id', selectedWebhook.id);

        if (error) throw error;
        toast.success('Webhook atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('agency_webhooks')
          .insert({
            ...webhookData,
            created_by: profile.user_id,
          });

        if (error) throw error;
        toast.success('Webhook criado com sucesso');
      }

      setShowForm(false);
      setSelectedWebhook(null);
      fetchWebhooks();
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast.error('Erro ao salvar webhook');
    }
  };

  const handleDelete = async (webhookId: string) => {
    try {
      const { error } = await supabase
        .from('agency_webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;
      
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
      toast.success('Webhook excluído com sucesso');
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Erro ao excluir webhook');
    }
  };

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('agency_webhooks')
        .update({ 
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhookId);

      if (error) throw error;
      
      fetchWebhooks();
      toast.success(`Webhook ${!isActive ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error('Erro ao alterar status do webhook');
    }
  };

  const testWebhook = async (webhook: WebhookData) => {
    try {
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Este é um teste do webhook',
          webhook_id: webhook.id,
        },
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers,
          ...(webhook.secret_token && { 'X-Webhook-Secret': webhook.secret_token }),
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast.success('Webhook testado com sucesso');
        // Update success count
        await supabase
          .from('agency_webhooks')
          .update({ 
            success_count: webhook.success_count + 1,
            last_triggered: new Date().toISOString()
          })
          .eq('id', webhook.id);
      } else {
        toast.error(`Erro no teste: ${response.status} ${response.statusText}`);
        // Update error count
        await supabase
          .from('agency_webhooks')
          .update({ error_count: webhook.error_count + 1 })
          .eq('id', webhook.id);
      }
      
      fetchWebhooks();
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Erro ao testar webhook');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Webhooks Personalizados</h3>
          <p className="text-sm text-muted-foreground">
            Configure webhooks para integrar com outras ferramentas e receber notificações em tempo real
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedWebhook ? 'Editar Webhook' : 'Novo Webhook'}
              </DialogTitle>
              <DialogDescription>
                Configure um webhook para receber notificações sobre eventos do CRM
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableEvents.map((event) => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={event.value}
                        checked={formData.events.includes(event.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              events: [...formData.events, event.value]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              events: formData.events.filter(ev => ev !== event.value)
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={event.value} className="text-sm">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headers">Headers (JSON)</Label>
                <textarea
                  id="headers"
                  value={formData.headers}
                  onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  rows={3}
                  className="w-full p-2 border rounded-md font-mono text-sm"
                  placeholder='{"Authorization": "Bearer your-token"}'
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret_token">Token Secreto (opcional)</Label>
                <Input
                  id="secret_token"
                  value={formData.secret_token}
                  onChange={(e) => setFormData({ ...formData, secret_token: e.target.value })}
                  placeholder="Para validação de segurança"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Ativo</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setSelectedWebhook(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {selectedWebhook ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum webhook configurado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Configure webhooks para integrar com outras ferramentas e automatizar processos
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estatísticas</TableHead>
                  <TableHead>Último Trigger</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{webhook.url}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {availableEvents.find(e => e.value === event)?.label || event}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{webhook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {webhook.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {webhook.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="text-green-600">✓ {webhook.success_count}</div>
                        <div className="text-red-600">✗ {webhook.error_count}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {webhook.last_triggered ? (
                        <div className="text-sm">
                          {new Date(webhook.last_triggered).toLocaleString('pt-BR')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => testWebhook(webhook)}>
                            <Activity className="mr-2 h-4 w-4" />
                            Testar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                          >
                            {webhook.is_active ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedWebhook(webhook);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(webhook.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}