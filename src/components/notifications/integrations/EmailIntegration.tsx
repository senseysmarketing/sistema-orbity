import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Mail, Check, Loader2 } from "lucide-react";

export function EmailIntegration() {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    email_enabled: false
  });

  useEffect(() => {
    fetchConfig();
  }, [currentAgency?.id]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_integrations')
        .select('email_enabled')
        .eq('agency_id', currentAgency!.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setConfig({ email_enabled: data.email_enabled || false });
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
          email_enabled: config.email_enabled,
          email_from_name: 'Orbity',
          email_from_address: 'contato@orbityapp.com.br',
          email_provider: 'resend',
          updated_at: new Date().toISOString()
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
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-0 flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">
                <span className="hidden sm:inline">Notificações por Email</span>
                <span className="sm:hidden">Email</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Envie notificações via email
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={config.email_enabled}
            onCheckedChange={(checked) => setConfig({ ...config, email_enabled: checked })}
            className="flex-shrink-0"
          />
        </div>
      </CardHeader>

      {config.email_enabled && (
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="rounded-md bg-muted p-3 sm:p-4 space-y-2">
            <p className="text-xs sm:text-sm font-medium">ℹ️ Informações do Remetente</p>
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                <span className="text-muted-foreground">Remetente:</span>
                <span className="font-medium">Orbity</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium truncate text-xs">contato@orbityapp.com.br</span>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
            <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">
              💡 Como funciona
            </p>
            <ul className="text-[10px] sm:text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-3 sm:ml-4 list-disc">
              <li>
                <span className="hidden sm:inline">Os emails serão enviados via Resend usando o domínio da Orbity</span>
                <span className="sm:hidden">Emails via Resend (Orbity)</span>
              </li>
              <li>
                <span className="hidden sm:inline">Cada usuário configura seu email pessoal nas preferências</span>
                <span className="sm:hidden">Configure seu email pessoal</span>
              </li>
              <li>
                <span className="hidden sm:inline">Usuários escolhem quais tipos de notificação querem receber</span>
                <span className="sm:hidden">Escolha os tipos de notificação</span>
              </li>
            </ul>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            <span className="hidden sm:inline">Salvar Configuração</span>
            <span className="sm:hidden">Salvar</span>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
