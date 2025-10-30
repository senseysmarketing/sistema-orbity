import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Mail, Check, Loader2, AlertCircle } from "lucide-react";

export function EmailIntegration() {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    email_enabled: false,
    email_from_name: "",
    email_from_address: "",
  });

  useEffect(() => {
    fetchConfig();
  }, [currentAgency?.id]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_integrations')
        .select('email_enabled, email_from_name, email_from_address')
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
          email_provider: 'resend',
          ...config,
        }, {
          onConflict: 'agency_id'
        });

      if (error) throw error;

      toast({
        title: "Configuração salva",
        description: "Integração de email configurada com sucesso.",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email via Resend
        </CardTitle>
        <CardDescription>
          Configure o Resend para enviar notificações por email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <h4 className="font-medium">Ativar Email</h4>
            <p className="text-sm text-muted-foreground">
              Habilitar envio de notificações por email
            </p>
          </div>
          <Switch
            checked={config.email_enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, email_enabled: checked }))}
          />
        </div>

        {config.email_enabled && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email_from_name">Nome do Remetente</Label>
                <Input
                  id="email_from_name"
                  placeholder="Orbity Notificações"
                  value={config.email_from_name}
                  onChange={(e) => setConfig(prev => ({ ...prev, email_from_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Nome que aparecerá como remetente dos emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_from_address">Email do Remetente</Label>
                <Input
                  id="email_from_address"
                  type="email"
                  placeholder="notificacoes@orbity.com.br"
                  value={config.email_from_address}
                  onChange={(e) => setConfig(prev => ({ ...prev, email_from_address: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Email verificado no Resend (ex: notificacoes@seu-dominio.com.br)
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Configuração do Resend</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Certifique-se de que o domínio está verificado no Resend. 
                    Adicione os registros DNS (SPF, DKIM, DMARC) para garantir alta entregabilidade.
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    O RESEND_API_KEY já está configurado nas secrets do projeto.
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Salvar Configuração
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
