import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { MessageCircle, Check, Loader2, AlertCircle } from "lucide-react";

export function DiscordIntegration() {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    discord_enabled: false,
    discord_webhook_url: "",
  });

  useEffect(() => {
    fetchConfig();
  }, [currentAgency?.id]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_integrations')
        .select('discord_enabled, discord_webhook_url')
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
        description: "Integração com Discord configurada com sucesso.",
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

      const { error } = await supabase.functions.invoke('send-discord', {
        body: { 
          test: true,
          message: "🎉 Teste de integração Discord bem-sucedido!",
          agencyId: currentAgency!.id
        }
      });

      if (error) throw error;

      toast({
        title: "Teste enviado",
        description: "Verifique o canal Discord configurado.",
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
          <MessageCircle className="h-5 w-5" />
          Discord Webhook
        </CardTitle>
        <CardDescription>
          Configure um webhook do Discord para receber notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <h4 className="font-medium">Ativar Discord</h4>
            <p className="text-sm text-muted-foreground">
              Habilitar envio de notificações via Discord
            </p>
          </div>
          <Switch
            checked={config.discord_enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, discord_enabled: checked }))}
          />
        </div>

        {config.discord_enabled && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discord_webhook_url">URL do Webhook</Label>
                <Input
                  id="discord_webhook_url"
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={config.discord_webhook_url}
                  onChange={(e) => setConfig(prev => ({ ...prev, discord_webhook_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Cole a URL do webhook criado nas configurações do canal Discord
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Como criar um webhook no Discord</h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                    <li>Acesse as configurações do canal</li>
                    <li>Vá em "Integrações" → "Webhooks"</li>
                    <li>Clique em "Novo Webhook"</li>
                    <li>Copie a URL do webhook</li>
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
                disabled={testing || !config.discord_webhook_url}
                variant="outline"
              >
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                Testar Webhook
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
