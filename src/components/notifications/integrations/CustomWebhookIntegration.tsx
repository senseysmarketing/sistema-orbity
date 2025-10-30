import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Webhook, Check, Loader2, AlertCircle, Plus, X } from "lucide-react";

export function CustomWebhookIntegration() {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    custom_webhook_enabled: false,
    custom_webhook_url: "",
    custom_webhook_method: "POST",
    custom_webhook_headers: {} as Record<string, string>,
    custom_webhook_template: {
      title: "{{notification.title}}",
      message: "{{notification.message}}",
      priority: "{{notification.priority}}",
      timestamp: "{{timestamp}}"
    },
    custom_webhook_auth_type: "none",
    custom_webhook_auth_value: "",
  });

  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  useEffect(() => {
    fetchConfig();
  }, [currentAgency?.id]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_integrations')
        .select('custom_webhook_enabled, custom_webhook_url, custom_webhook_method, custom_webhook_headers, custom_webhook_template, custom_webhook_auth_type, custom_webhook_auth_value')
        .eq('agency_id', currentAgency!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setConfig({
          ...data,
          custom_webhook_headers: (data.custom_webhook_headers as Record<string, string>) || {},
          custom_webhook_template: (data.custom_webhook_template as any) || config.custom_webhook_template,
        });
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('notification_integrations')
        .upsert({
          agency_id: currentAgency!.id,
          ...config,
        }, {
          onConflict: 'agency_id'
        });

      if (error) throw error;

      toast({
        title: "Configuração salva",
        description: "Webhook personalizado configurado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      setConfig(prev => ({
        ...prev,
        custom_webhook_headers: {
          ...prev.custom_webhook_headers,
          [newHeaderKey]: newHeaderValue
        }
      }));
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    const headers = { ...config.custom_webhook_headers };
    delete headers[key];
    setConfig(prev => ({ ...prev, custom_webhook_headers: headers }));
  };

  const testWebhook = async () => {
    try {
      setTesting(true);

      const { error } = await supabase.functions.invoke('send-custom-webhook', {
        body: { 
          test: true,
          message: "🎉 Teste de webhook personalizado!"
        }
      });

      if (error) throw error;

      toast({
        title: "Teste enviado",
        description: "Verifique se a requisição foi recebida no seu endpoint.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Personalizado
        </CardTitle>
        <CardDescription>
          Configure um webhook customizado para enviar notificações para qualquer serviço
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <h4 className="font-medium">Ativar Webhook</h4>
            <p className="text-sm text-muted-foreground">
              Habilitar envio de notificações via webhook customizado
            </p>
          </div>
          <Switch
            checked={config.custom_webhook_enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, custom_webhook_enabled: checked }))}
          />
        </div>

        {config.custom_webhook_enabled && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_url">URL do Webhook</Label>
                <Input
                  id="webhook_url"
                  type="url"
                  placeholder="https://seu-servico.com/webhook"
                  value={config.custom_webhook_url}
                  onChange={(e) => setConfig(prev => ({ ...prev, custom_webhook_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_method">Método HTTP</Label>
                <Select
                  value={config.custom_webhook_method}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, custom_webhook_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Headers Customizados</Label>
                <div className="space-y-2">
                  {Object.entries(config.custom_webhook_headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <code className="text-xs flex-1">{key}: {value}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeHeader(key)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Header (ex: X-API-Key)"
                      value={newHeaderKey}
                      onChange={(e) => setNewHeaderKey(e.target.value)}
                    />
                    <Input
                      placeholder="Valor"
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                    />
                    <Button onClick={addHeader} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth_type">Autenticação</Label>
                <Select
                  value={config.custom_webhook_auth_type}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, custom_webhook_auth_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key (Header)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.custom_webhook_auth_type !== 'none' && (
                <div className="space-y-2">
                  <Label htmlFor="auth_value">Token/Chave</Label>
                  <Input
                    id="auth_value"
                    type="password"
                    placeholder="Seu token de autenticação"
                    value={config.custom_webhook_auth_value}
                    onChange={(e) => setConfig(prev => ({ ...prev, custom_webhook_auth_value: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="template">Template do Payload (JSON)</Label>
                <Textarea
                  id="template"
                  className="font-mono text-xs"
                  rows={8}
                  value={JSON.stringify(config.custom_webhook_template, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setConfig(prev => ({ ...prev, custom_webhook_template: parsed }));
                    } catch {}
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Use variáveis como {`{{notification.title}}`}, {`{{notification.message}}`}, {`{{timestamp}}`}
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Casos de Uso</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
                    <li>Zapier / Make / N8N</li>
                    <li>Power Automate</li>
                    <li>Sistemas internos</li>
                    <li>Ferramentas de monitoramento</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Salvar Configuração
              </Button>
              <Button 
                onClick={testWebhook} 
                disabled={testing || !config.custom_webhook_url}
                variant="outline"
              >
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Webhook className="mr-2 h-4 w-4" />}
                Testar Webhook
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
