import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { MessageSquare, Check, AlertCircle, Loader2 } from "lucide-react";

export function WhatsAppIntegration() {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    whatsapp_enabled: false,
    evolution_api_url: "",
    evolution_api_key: "",
    evolution_instance_name: "",
  });

  useEffect(() => {
    fetchConfig();
  }, [currentAgency?.id]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_integrations')
        .select('whatsapp_enabled, evolution_api_url, evolution_api_key, evolution_instance_name')
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
        description: "Integração com WhatsApp configurada com sucesso.",
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

  const testConnection = async () => {
    try {
      setTesting(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { 
          test: true,
          phone: "5511999999999",
          message: "🎉 Teste de conexão Evolution API bem-sucedido!"
        }
      });

      if (error) throw error;

      toast({
        title: "Teste enviado",
        description: "Verifique se a mensagem de teste foi recebida.",
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
          <MessageSquare className="h-5 w-5" />
          WhatsApp via Evolution API
        </CardTitle>
        <CardDescription>
          Configure a Evolution API para enviar notificações via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <h4 className="font-medium">Ativar WhatsApp</h4>
            <p className="text-sm text-muted-foreground">
              Habilitar envio de notificações via WhatsApp
            </p>
          </div>
          <Switch
            checked={config.whatsapp_enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, whatsapp_enabled: checked }))}
          />
        </div>

        {config.whatsapp_enabled && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="evolution_api_url">URL da Evolution API</Label>
                <Input
                  id="evolution_api_url"
                  type="url"
                  placeholder="https://sua-evolution-api.com"
                  value={config.evolution_api_url}
                  onChange={(e) => setConfig(prev => ({ ...prev, evolution_api_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  URL base da sua instância Evolution API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evolution_api_key">API Key</Label>
                <Input
                  id="evolution_api_key"
                  type="password"
                  placeholder="Sua chave de API"
                  value={config.evolution_api_key}
                  onChange={(e) => setConfig(prev => ({ ...prev, evolution_api_key: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Chave de autenticação da Evolution API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evolution_instance_name">Nome da Instância</Label>
                <Input
                  id="evolution_instance_name"
                  placeholder="minha-instancia"
                  value={config.evolution_instance_name}
                  onChange={(e) => setConfig(prev => ({ ...prev, evolution_instance_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Nome da instância configurada na Evolution API
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Sobre a Evolution API</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    A Evolution API é uma solução open-source para integração com WhatsApp. 
                    Você precisa ter uma instância rodando (própria ou hospedada) e conectar 
                    seu número via QR Code antes de usar.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Salvar Configuração
              </Button>
              <Button 
                onClick={testConnection} 
                disabled={testing || !config.evolution_api_url || !config.evolution_api_key}
                variant="outline"
              >
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Testar Conexão
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
