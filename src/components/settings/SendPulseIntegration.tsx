import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Save, Loader2, Mail, Unlink, CheckCircle2, Info, ExternalLink } from "lucide-react";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useMarketingIntegrations } from "@/hooks/useMarketingIntegrations";

export function SendPulseIntegration() {
  const { isAgencyAdmin } = useAgency();
  const { toast } = useToast();
  const isAdmin = isAgencyAdmin();

  const { integrations, isLoading, updateIntegrations, isSaving } = useMarketingIntegrations();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (integrations) {
      setClientId(integrations.sendpulse_client_id || "");
      setClientSecret(integrations.sendpulse_client_secret || "");
    }
  }, [integrations]);

  const handleSave = async () => {
    try {
      await updateIntegrations({
        sendpulse_client_id: clientId,
        sendpulse_client_secret: clientSecret,
        sendpulse_connected: true,
      });
      toast({
        title: "Conectado com sucesso!",
        description: "Suas credenciais da SendPulse foram salvas.",
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDisconnect = async () => {
    try {
      await updateIntegrations({
        sendpulse_connected: false,
        sendpulse_client_id: null,
        sendpulse_client_secret: null,
      });
      setClientId("");
      setClientSecret("");
      toast({
        title: "Desconectado",
        description: "A integração com SendPulse foi removida.",
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTestConnection = () => {
    toast({
      title: "Teste de conexão",
      description: "A funcionalidade de teste estará disponível em breve na Fase 2.",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = !!integrations?.sendpulse_connected;
  const obscuredClientId = clientId ? `***${clientId.slice(-4)}` : "";

  return (
    <Card className="overflow-hidden border-muted/60 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">SendPulse (E-mail Marketing)</CardTitle>
              <CardDescription className="text-xs">
                Campanhas em massa e gerenciamento de listas de contatos
              </CardDescription>
            </div>
          </div>
          {isConnected && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Conectado
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {!isConnected ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="space-y-2">
              <Label htmlFor="client-id" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                API Client ID
              </Label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Ex: 5b2..."
                className="bg-muted/30 focus-visible:ring-blue-500"
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-secret" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                API Client Secret
              </Label>
              <div className="relative">
                <Input
                  id="client-secret"
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Seu secret key da SendPulse"
                  className="bg-muted/30 pr-10 focus-visible:ring-blue-500"
                  disabled={!isAdmin}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                  onClick={() => setShowSecret(!showSecret)}
                  disabled={!isAdmin}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {isAdmin && (
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !clientId || !clientSecret} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Conectar SendPulse
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client ID Conectado</span>
                <span className="text-sm font-mono font-medium">{obscuredClientId}</span>
              </div>
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={handleTestConnection} className="flex-1 text-xs">
                    Testar Conexão
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDisconnect} className="flex-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Unlink className="h-3 w-3 mr-2" />
                    Desconectar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-2">
          <a 
            href="https://login.sendpulse.com/settings/#api" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-blue-500 transition-colors"
          >
            <Info className="h-3 w-3" />
            <span>Como obter minhas credenciais API da SendPulse?</span>
            <ExternalLink className="h-2 w-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
