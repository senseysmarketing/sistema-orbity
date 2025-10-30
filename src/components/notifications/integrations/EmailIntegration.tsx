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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <div>
              <CardTitle>Notificações por Email</CardTitle>
              <CardDescription>
                Envie notificações via email
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={config.email_enabled}
            onCheckedChange={(checked) => setConfig({ ...config, email_enabled: checked })}
          />
        </div>
      </CardHeader>

      {config.email_enabled && (
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">ℹ️ Informações do Remetente (fixo)</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remetente:</span>
                <span className="font-medium">Orbity</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">contato@orbityapp.com.br</span>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              💡 Como funciona
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
              <li>Os emails serão enviados via Resend usando o domínio da Orbity</li>
              <li>Cada usuário configura seu email pessoal nas preferências</li>
              <li>Usuários escolhem quais tipos de notificação querem receber</li>
            </ul>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Salvar Configuração
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
