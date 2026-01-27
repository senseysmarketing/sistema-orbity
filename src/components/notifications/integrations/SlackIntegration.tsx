import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Hash, Check, Loader2, AlertCircle } from "lucide-react";

export function SlackIntegration() {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    slack_enabled: false,
    slack_webhook_url: "",
    slack_channel: "",
  });

  useEffect(() => {
    fetchConfig();
  }, [currentAgency?.id]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_integrations')
        .select('slack_enabled, slack_webhook_url, slack_channel')
        .eq('agency_id', currentAgency!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setConfig(data);
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
        description: "Integração com Slack configurada com sucesso.",
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

  const testWebhook = async () => {
    try {
      setTesting(true);

      const { error } = await supabase.functions.invoke('send-slack', {
        body: { 
          test: true,
          message: "🎉 Teste de integração Slack bem-sucedido!",
          agencyId: currentAgency!.id
        }
      });

      if (error) throw error;

      toast({
        title: "Teste enviado",
        description: "Verifique o canal Slack configurado.",
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
          <Hash className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Slack Webhook</span>
          <span className="sm:hidden">Slack</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Configure um webhook do Slack para receber notificações</span>
          <span className="sm:hidden">Receba notificações via Slack</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <h4 className="text-sm font-medium">Ativar Slack</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">Habilitar envio de notificações via Slack</span>
              <span className="sm:hidden">Enviar notificações via Slack</span>
            </p>
          </div>
          <Switch
            checked={config.slack_enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, slack_enabled: checked }))}
            className="flex-shrink-0"
          />
        </div>

        {config.slack_enabled && (
          <>
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slack_webhook_url" className="text-xs sm:text-sm">URL do Webhook</Label>
                <Input
                  id="slack_webhook_url"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={config.slack_webhook_url}
                  onChange={(e) => setConfig(prev => ({ ...prev, slack_webhook_url: e.target.value }))}
                  className="text-xs sm:text-sm"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Cole a URL do Incoming Webhook criado no Slack
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slack_channel" className="text-xs sm:text-sm">Canal (Opcional)</Label>
                <Input
                  id="slack_channel"
                  placeholder="#notificacoes"
                  value={config.slack_channel}
                  onChange={(e) => setConfig(prev => ({ ...prev, slack_channel: e.target.value }))}
                  className="text-xs sm:text-sm"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Canal padrão para as notificações (ex: #notificacoes)</span>
                  <span className="sm:hidden">Ex: #notificacoes</span>
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">Como criar um webhook</h4>
                  <ol className="text-[10px] sm:text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-0.5 sm:space-y-1">
                    <li>Acesse api.slack.com/apps</li>
                    <li>Crie ou selecione um app</li>
                    <li>Ative "Incoming Webhooks"</li>
                    <li className="hidden sm:list-item">Adicione um novo Webhook para o canal desejado</li>
                    <li>Copie a URL do Webhook</li>
                  </ol>
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
                disabled={testing || !config.slack_webhook_url}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hash className="mr-2 h-4 w-4" />}
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
