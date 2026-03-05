import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, MessageSquare, QrCode, RefreshCw, Unlink, Wifi, AlertCircle, AlertTriangle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWhatsApp } from "@/hooks/useWhatsApp";

export const WhatsAppIntegration = () => {
  const [instanceName, setInstanceName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [autoChecked, setAutoChecked] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const {
    account,
    isLoadingAccount,
    isConnected,
    connect,
    disconnect,
    checkStatus,
    refreshQR,
  } = useWhatsApp();

  // Auto-check status when account exists but not connected
  useEffect(() => {
    if (account && !autoChecked && account.status !== 'connected') {
      setAutoChecked(true);
      checkStatus.mutateAsync().then((result) => {
        if (result?.qr_code) {
          setQrCode(result.qr_code);
        }
      }).catch(() => { setConnectionError(true); });
    }
  }, [account, autoChecked]);

  // Poll status when connecting
  useEffect(() => {
    if (account?.status === 'connecting' || qrCode) {
      const interval = setInterval(async () => {
        try {
          const result = await checkStatus.mutateAsync();
          if (result?.status === 'connected') {
            setQrCode(null);
            setConnectionError(false);
          } else if (result?.qr_code) {
            setQrCode(result.qr_code);
          }
        } catch {
          setConnectionError(true);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [account?.status, qrCode]);

  // Populate fields from existing account
  useEffect(() => {
    if (account) {
      setInstanceName(account.instance_name);
      setApiUrl(account.api_url);
      setApiKey(account.api_key);
      if (account.qr_code) {
        setQrCode(account.qr_code);
      }
    }
  }, [account]);

  const handleConnect = async () => {
    if (!instanceName || !apiUrl || !apiKey) return;
    try {
      const result = await connect.mutateAsync({ instance_name: instanceName, api_url: apiUrl, api_key: apiKey });
      if (result?.qr_code) {
        setQrCode(result.qr_code);
      }
    } catch {}
  };

  const handleRefreshQR = async () => {
    try {
      const result = await refreshQR.mutateAsync();
      if (result?.qr_code) {
        setQrCode(result.qr_code);
      } else if (result?.status === 'connected') {
        setQrCode(null);
      }
    } catch {}
  };

  if (isLoadingAccount) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const showQrCode = qrCode && !isConnected;
  const showForm = !isConnected && !showQrCode;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">WhatsApp</CardTitle>
                {isConnected && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 flex-shrink-0">
                    <Check className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                )}
                {!isConnected && account && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 flex-shrink-0">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Desconectado
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Conecte via Evolution API para automação de mensagens no CRM</span>
                <span className="sm:hidden">Automação WhatsApp via Evolution API</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {isConnected ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  WhatsApp conectado
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Instância: {account?.instance_name}
                </p>
                {account?.phone_number && (
                  <p className="text-xs text-muted-foreground">{account.phone_number}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkStatus.mutate()}
                disabled={checkStatus.isPending}
                className="w-full sm:w-auto"
              >
                {checkStatus.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Verificar Status
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="w-full sm:w-auto"
              >
                <Unlink className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* QR Code Display */}
            {showQrCode && (
              <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-muted/30">
                {connectionError && (
                  <Alert variant="destructive" className="w-full">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      A instância pode ter sido removida ou está inacessível. Reconfigure a conexão.
                    </AlertDescription>
                  </Alert>
                )}
                {!connectionError && (
                  <>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      Escaneie o QR Code no WhatsApp
                    </p>
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48 sm:w-64 sm:h-64 rounded-lg"
                    />
                  </>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefreshQR} disabled={refreshQR.isPending}>
                    {refreshQR.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-4 w-4" />
                    )}
                    Atualizar QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQrCode(null);
                      setConnectionError(false);
                    }}
                  >
                    <Settings className="mr-1 h-4 w-4" />
                    Reconfigurar
                  </Button>
                </div>
                {!connectionError && (
                  <p className="text-xs text-muted-foreground text-center">
                    Abra o WhatsApp {'>'} Configurações {'>'} Dispositivos conectados {'>'} Conectar dispositivo
                  </p>
                )}
              </div>
            )}

            {/* Connection Form */}
            {showForm && (
              <>
                <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2">
                  <p className="text-sm font-medium">Recursos disponíveis:</p>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <li>• Mensagens automáticas de saudação</li>
                    <li>• Follow-ups programados</li>
                    <li>• Espelhamento de conversas no CRM</li>
                    <li className="hidden sm:list-item">• Detecção de resposta do cliente</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="wa-api-url" className="text-sm">URL da Evolution API</Label>
                    <Input
                      id="wa-api-url"
                      placeholder="https://sua-api.com"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wa-api-key" className="text-sm">API Key</Label>
                    <Input
                      id="wa-api-key"
                      type="password"
                      placeholder="Sua chave de API"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wa-instance" className="text-sm">Nome da Instância</Label>
                    <Input
                      id="wa-instance"
                      placeholder="orbity-whatsapp"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={connect.isPending || !instanceName || !apiUrl || !apiKey}
                  className="w-full"
                >
                  {connect.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  Conectar WhatsApp
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
