import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Save, Loader2, Mail, Unlink, CheckCircle2, Info, ExternalLink, Shield } from "lucide-react";
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
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = !!integrations?.sendpulse_connected;
  const obscuredClientId = clientId ? `***${clientId.slice(-4)}` : "";

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">SendPulse (E-mail Marketing)</CardTitle>
                {isConnected && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 flex-shrink-0">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Campanhas em massa e gerenciamento de listas de contatos
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Recursos disponíveis:</p>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <li>• Envio de campanhas de e-mail em massa</li>
                <li>• Gerenciamento dinâmico de listas de contatos</li>
                <li>• Relatórios de abertura e cliques</li>
                <li className="hidden sm:list-item">• Automação de réguas de nutrição</li>
              </ul>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-id" className="text-sm font-medium">
                  API Client ID
                </Label>
                <Input
                  id="client-id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Seu Client ID da SendPulse"
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-secret" className="text-sm font-medium">
                  API Client Secret
                </Label>
                <div className="relative">
                  <Input
                    id="client-secret"
                    type={showSecret ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Sua Secret Key"
                    className="pr-10"
                    disabled={!isAdmin}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowSecret(!showSecret)}
                    disabled={!isAdmin}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            </div>

            {isAdmin && (
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !clientId || !clientSecret} 
                className="w-full"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Conectar SendPulse
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  Conta conectada
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                  Client ID: {obscuredClientId}
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={handleTestConnection} className="w-full sm:w-auto">
                  Testar Conexão
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnect} className="w-full sm:w-auto">
                  <Unlink className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <a 
            href="https://login.sendpulse.com/settings/#api" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            <span>Como obter minhas credenciais API da SendPulse?</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
