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
          message: "🎉 Teste de integração Slack bem-sucedido!"
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Slack Webhook
        </CardTitle>
        <CardDescription>
          Configure um webhook do Slack para receber notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <h4 className="font-medium">Ativar Slack</h4>
            <p className="text-sm text-muted-foreground">
              Habilitar envio de notificações via Slack
            </p>
          </div>
          <Switch
            checked={config.slack_enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, slack_enabled: checked }))}
          />
        </div>

        {config.slack_enabled && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slack_webhook_url">URL do Webhook</Label>
                <Input
                  id="slack_webhook_url"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={config.slack_webhook_url}
                  onChange={(e) => setConfig(prev => ({ ...prev, slack_webhook_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Cole a URL do Incoming Webhook criado no Slack
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slack_channel">Canal (Opcional)</Label>
                <Input
                  id="slack_channel"
                  placeholder="#notificacoes"
                  value={config.slack_channel}
                  onChange={(e) => setConfig(prev => ({ ...prev, slack_channel: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Canal padrão para as notificações (ex: #notificacoes)
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Como criar um webhook no Slack</h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                    <li>Acesse api.slack.com/apps</li>
                    <li>Crie ou selecione um app</li>
                    <li>Ative "Incoming Webhooks"</li>
                    <li>Adicione um novo Webhook para o canal desejado</li>
                    <li>Copie a URL do Webhook</li>
                  </ol>
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
                disabled={testing || !config.slack_webhook_url}
                variant="outline"
              >
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hash className="mr-2 h-4 w-4" />}
                Testar Webhook
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
