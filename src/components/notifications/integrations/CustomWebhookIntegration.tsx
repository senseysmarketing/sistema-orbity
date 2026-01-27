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
          message: "🎉 Teste de webhook personalizado!",
          agencyId: currentAgency!.id
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
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Webhook className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Webhook Personalizado</span>
          <span className="sm:hidden">Webhook</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Configure um webhook customizado para enviar notificações para qualquer serviço</span>
          <span className="sm:hidden">Envie para qualquer serviço</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <h4 className="text-sm font-medium">Ativar Webhook</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">Habilitar envio de notificações via webhook customizado</span>
              <span className="sm:hidden">Enviar via webhook customizado</span>
            </p>
          </div>
          <Switch
            checked={config.custom_webhook_enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, custom_webhook_enabled: checked }))}
            className="flex-shrink-0"
          />
        </div>

        {config.custom_webhook_enabled && (
          <>
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_url" className="text-xs sm:text-sm">URL do Webhook</Label>
                <Input
                  id="webhook_url"
                  type="url"
                  placeholder="https://seu-servico.com/webhook"
                  value={config.custom_webhook_url}
                  onChange={(e) => setConfig(prev => ({ ...prev, custom_webhook_url: e.target.value }))}
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_method" className="text-xs sm:text-sm">Método HTTP</Label>
                <Select
                  value={config.custom_webhook_method}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, custom_webhook_method: value }))}
                >
                  <SelectTrigger className="text-xs sm:text-sm">
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
                <Label className="text-xs sm:text-sm">Headers Customizados</Label>
                <div className="space-y-2">
                  {Object.entries(config.custom_webhook_headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <code className="text-[10px] sm:text-xs flex-1 truncate">{key}: {value}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeHeader(key)}
                        className="h-7 w-7 p-0 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Header (ex: X-API-Key)"
                      value={newHeaderKey}
                      onChange={(e) => setNewHeaderKey(e.target.value)}
                      className="text-xs sm:text-sm flex-1"
                    />
                    <Input
                      placeholder="Valor"
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                      className="text-xs sm:text-sm flex-1"
                    />
                    <Button onClick={addHeader} size="sm" className="flex-shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth_type" className="text-xs sm:text-sm">Autenticação</Label>
                <Select
                  value={config.custom_webhook_auth_type}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, custom_webhook_auth_type: value }))}
                >
                  <SelectTrigger className="text-xs sm:text-sm">
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
                  <Label htmlFor="auth_value" className="text-xs sm:text-sm">Token/Chave</Label>
                  <Input
                    id="auth_value"
                    type="password"
                    placeholder="Seu token de autenticação"
                    value={config.custom_webhook_auth_value}
                    onChange={(e) => setConfig(prev => ({ ...prev, custom_webhook_auth_value: e.target.value }))}
                    className="text-xs sm:text-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="template" className="text-xs sm:text-sm">Template do Payload (JSON)</Label>
                <Textarea
                  id="template"
                  className="font-mono text-[10px] sm:text-xs"
                  rows={6}
                  value={JSON.stringify(config.custom_webhook_template, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setConfig(prev => ({ ...prev, custom_webhook_template: parsed }));
                    } catch {}
                  }}
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Use variáveis como {`{{notification.title}}`}, {`{{notification.message}}`}
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">Casos de Uso</h4>
                  <ul className="text-[10px] sm:text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-0.5">
                    <li>Zapier / Make / N8N</li>
                    <li>Power Automate</li>
                    <li>Sistemas internos</li>
                    <li className="hidden sm:list-item">Ferramentas de monitoramento</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                <span className="hidden sm:inline">Salvar Configuração</span>
                <span className="sm:hidden">Salvar</span>
              </Button>
              <Button 
                onClick={testWebhook} 
                disabled={testing || !config.custom_webhook_url}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Webhook className="mr-2 h-4 w-4" />}
                <span className="hidden sm:inline">Testar Webhook</span>
                <span className="sm:hidden">Testar</span>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
