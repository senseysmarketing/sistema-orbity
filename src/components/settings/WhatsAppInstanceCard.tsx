import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, MessageSquare, QrCode, RefreshCw, Unlink, Wifi, AlertCircle, AlertTriangle, Link2, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import whatsappLogo from "@/assets/whatsapp-logo.png";

interface WhatsAppInstanceCardProps {
  purpose: 'general' | 'billing';
  title: string;
  description: string;
}

export const WhatsAppInstanceCard = ({ purpose, title, description }: WhatsAppInstanceCardProps) => {
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
    checkWebhook,
    refreshQR,
  } = useWhatsApp(purpose);

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

  // Load QR from account
  useEffect(() => {
    if (account?.qr_code && !isConnected) {
      setQrCode(account.qr_code);
    }
  }, [account]);

  const handleConnect = async () => {
    try {
      setConnectionError(false);
      const result = await connect.mutateAsync();
      if (result?.qr_code) {
        setQrCode(result.qr_code);
      }
    } catch {
      setConnectionError(true);
    }
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
  const showConnectButton = !isConnected && !showQrCode;

  const IconComponent = purpose === 'billing' ? CreditCard : MessageSquare;
  const iconBgClass = purpose === 'billing'
    ? 'bg-amber-100 dark:bg-amber-900/30'
    : 'bg-green-100 dark:bg-green-900/30';
  const iconTextClass = purpose === 'billing'
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-green-600 dark:text-green-400';

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgClass} flex-shrink-0`}>
              <IconComponent className={`h-5 w-5 ${iconTextClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
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
                {description}
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

            <div className="flex flex-wrap gap-2">
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
                variant="outline"
                size="sm"
                onClick={() => checkWebhook.mutate()}
                disabled={checkWebhook.isPending}
                className="w-full sm:w-auto"
              >
                {checkWebhook.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Reconfigurar Webhook
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
            {showQrCode && (
              <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-muted/30">
                {connectionError && (
                  <Alert variant="destructive" className="w-full">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Erro ao conectar. Tente novamente ou entre em contato com o suporte.
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
                <Button variant="outline" size="sm" onClick={handleRefreshQR} disabled={refreshQR.isPending}>
                  {refreshQR.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" />
                  )}
                  Atualizar QR
                </Button>
                {!connectionError && (
                  <p className="text-xs text-muted-foreground text-center">
                    Abra o WhatsApp {'>'} Configurações {'>'} Dispositivos conectados {'>'} Conectar dispositivo
                  </p>
                )}
              </div>
            )}

            {showConnectButton && (
              <>
                {purpose === 'general' && (
                  <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2">
                    <p className="text-sm font-medium">Recursos disponíveis:</p>
                    <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      <li>• Mensagens automáticas de saudação</li>
                      <li>• Follow-ups programados</li>
                      <li>• Espelhamento de conversas no CRM</li>
                      <li className="hidden sm:list-item">• Detecção de resposta do cliente</li>
                    </ul>
                  </div>
                )}
                {purpose === 'billing' && (
                  <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2">
                    <p className="text-sm font-medium">Recursos do número financeiro:</p>
                    <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      <li>• Lembretes automáticos de cobrança</li>
                      <li>• Avisos de vencimento e atraso</li>
                      <li>• Número isolado do atendimento comercial</li>
                    </ul>
                  </div>
                )}

                {connectionError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Erro ao conectar. Tente novamente.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleConnect}
                  disabled={connect.isPending}
                  className="w-full"
                >
                  {connect.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IconComponent className="mr-2 h-4 w-4" />
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
