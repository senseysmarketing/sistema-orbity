import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface EmailIntegrationProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function EmailIntegration({ enabled, onChange }: EmailIntegrationProps) {
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);

  const handleSendTest = async () => {
    if (!user || !currentAgency) return;
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("send-email-notification", {
        body: {
          test: true,
          bypass_snooze: true,
          userId: user.id,
          agencyId: currentAgency.id,
          notification: {
            title: "🎉 Teste de E-mail Orbity",
            message: "Olá! Este é um teste de conexão do Orbity.",
            type: "system_alert",
          },
        },
      });
      if (error) throw error;
      toast.success("E-mail enviado", {
        description: "Confira sua caixa de entrada (e a pasta de spam).",
      });
    } catch (err: any) {
      toast.error("Falha no envio", {
        description: err?.message || "Verifique a configuração de e-mail.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="rounded-md bg-primary/10 p-2 shrink-0">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <Label htmlFor="email-enabled" className="text-sm font-medium cursor-pointer">
              Notificações por E-mail
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receba resumos e alertas importantes diretamente na sua caixa de entrada.
            </p>
          </div>
        </div>
        <Switch
          id="email-enabled"
          checked={enabled}
          onCheckedChange={onChange}
          className="shrink-0"
        />
      </div>

      {enabled && (
        <div className="pl-11">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testing || !user || !currentAgency}
            onClick={handleSendTest}
          >
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar E-mail de Teste
          </Button>
        </div>
      )}
    </div>
  );
}
