import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, MessageSquare, QrCode, RefreshCw, Unlink, Wifi, AlertCircle, AlertTriangle, Link2, CreditCard, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";
import whatsappLogo from "@/assets/whatsapp-logo.png";

interface WhatsAppInstanceCardProps {
  purpose: 'general' | 'billing';
  title: string;
  description: string;
}

const getQrImageSrc = (qrCode: string) => {
  if (qrCode.startsWith('data:') || /^https?:\/\//i.test(qrCode)) return qrCode;
  return `data:image/png;base64,${qrCode}`;
};

export const WhatsAppInstanceCard = ({ purpose, title, description }: WhatsAppInstanceCardProps) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [autoChecked, setAutoChecked] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollingStartedAtRef = useRef<number | null>(null);

  const {
    account,
    isLoadingAccount,
    isConnected,
    connect,
    disconnect,
    checkStatus,
    checkWebhook,
    refreshQR,
    hardReset,
  } = useWhatsApp(purpose);

  // Auto-check status when account exists but not connected
  useEffect(() => {
    if (account && !autoChecked && account.status !== 'connected') {
      setAutoChecked(true);
      checkStatus.mutateAsync().then((result) => {
        if (result?.qr_code) {
          setQrCode(result.qr_code);
          setConnectionError(null);
        } else if (result?.error && result?.status === 'disconnected') {
          setConnectionError(result.error);
        }
      }).catch((error: Error) => { 
        setConnectionError(error.message || 'Erro ao verificar status da conexão.'); 
      });
    }
  }, [account, autoChecked]);

  // Polling de Status (2s) - finaliza se conectar ou se a API não entregar QR em até 45s.
  useEffect(() => {
    if (!isConnected && (account?.status === 'connecting' || qrCode)) {
      if (!pollingStartedAtRef.current) pollingStartedAtRef.current = Date.now();

      const interval = setInterval(async () => {
        try {
          const result = await checkStatus.mutateAsync();
          if (result?.status === 'connected') {
            setQrCode(null);
            setConnectionError(null);
            pollingStartedAtRef.current = null;
          } else if (result?.qr_code) {
            setQrCode(result.qr_code);
            setConnectionError(null);
          } else if (result?.status === 'disconnected' && result?.error) {
            setQrCode(null);
            setConnectionError(result.error);
            pollingStartedAtRef.current = null;
          }

          if (pollingStartedAtRef.current && Date.now() - pollingStartedAtRef.current > 45_000 && !qrCode) {
            setConnectionError('A Uazapi não retornou o QR Code dentro do tempo esperado. Clique em Atualizar QR Code ou Resetar Conexão.');
            pollingStartedAtRef.current = null;
          }
        } catch (err) {
          console.error("Polling status check failed:", err);
        }
      }, 2000);
      return () => clearInterval(interval);
    }

    pollingStartedAtRef.current = null;
  }, [account?.status, qrCode, isConnected]);

  // Load QR from account
  useEffect(() => {
    if (account?.qr_code && !isConnected) {
      setQrCode(account.qr_code);
      setConnectionError(null);
    }
  }, [account, isConnected]);

  const handleConnect = async () => {
    try {
      setIsGenerating(true);
      setConnectionError(null);
      setQrCode(null);
      pollingStartedAtRef.current = Date.now();
      const result = await connect.mutateAsync();
      if (result?.qr_code) {
        setQrCode(result.qr_code);
        setConnectionError(null);
      } else if (result?.status === 'connected') {
        setQrCode(null);
        setConnectionError(null);
      } else if (result?.error) {
        setConnectionError(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao iniciar conexão.';
      setConnectionError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefreshQR = async () => {
    try {
      setConnectionError(null);
      const result = await refreshQR.mutateAsync();
      if (result?.qr_code) {
        setQrCode(result.qr_code);
        setConnectionError(null);
      } else if (result?.status === 'connected') {
        setQrCode(null);
        setConnectionError(null);
      } else if (result?.error) {
        setQrCode(null);
        setConnectionError(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar QR Code.';
      setConnectionError(message);
    }
  };

  const handleHardReset = async () => {
    if (confirm("Deseja realmente apagar todos os tokens e resetar a conexão? Isso forçará a geração de um novo QR Code.")) {
      try {
        setQrCode(null);
        setConnectionError(null);
        pollingStartedAtRef.current = null;
        await hardReset.mutateAsync();
        setAutoChecked(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao resetar conexão.';
        setConnectionError(message);
      }
    }
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

  const isConnecting = account?.status === 'connecting' || isGenerating || connect.isPending;
  const showQrCode = !!qrCode && !isConnected;
  const showConnectButton = !isConnected && !showQrCode && !isConnecting;

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
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden ${iconBgClass} flex-shrink-0`}>
              {purpose === 'general' ? (
                <img src={whatsappLogo} alt="WhatsApp" className="h-6 w-6 object-contain" />
              ) : (
                <IconComponent className={`h-5 w-5 ${iconTextClass}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
                {isConnected && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 flex-shrink-0 transition-all duration-300">
                    <Check className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                )}
                {!isConnected && account && account.status !== 'connecting' && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 flex-shrink-0">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Desconectado
                  </Badge>
                )}
                {!isConnected && account?.status === 'connecting' && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 flex-shrink-0">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Conectando...
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
                  {account?.phone_number
                    ? `Número: ${formatPhoneDisplay(account.phone_number)}`
                    : isConnected
                      ? "Sincronizando número..."
                      : "Aguardando número conectado..."}
                </p>
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
            {(showQrCode || isConnecting) ? (
              <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-muted/30 min-h-[350px] justify-center transition-all duration-300">
                {(!qrCode && isConnecting) && (
                  <div className="flex flex-col items-center justify-center py-8 gap-4 animate-in fade-in duration-500">
                    <Skeleton className="w-[250px] h-[250px] rounded-lg bg-muted-foreground/10" />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Estabelecendo conexão segura...
                    </div>
                  </div>
                )}
                
                {showQrCode && (
                  <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                    <>
                      <p className="text-sm font-medium flex items-center gap-2 text-foreground/80">
                        <QrCode className="h-4 w-4" />
                        Escaneie o QR Code no WhatsApp
                      </p>
                      <div className="relative group">
                        {refreshQR.isPending && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] z-10 rounded-lg transition-all">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        )}
                        <img
                          src={getQrImageSrc(qrCode)}
                          alt="WhatsApp QR Code"
                          className="w-[250px] h-[250px] rounded-lg shadow-md border bg-white p-2"
                        />
                      </div>
                    </>
                  </div>
                )}

                {connectionError && (
                  <Alert variant="destructive" className="w-full max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{connectionError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {(showQrCode || account?.status === 'connecting' || connectionError) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefreshQR} 
                      disabled={refreshQR.isPending}
                      className="transition-all hover:bg-muted"
                    >
                      {refreshQR.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-4 w-4" />
                      )}
                      Atualizar QR Code
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleHardReset} 
                    disabled={hardReset.isPending}
                    className="text-muted-foreground hover:text-destructive transition-all"
                  >
                    {hardReset.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-4 w-4" />
                    )}
                    Resetar Conexão
                  </Button>
                </div>
                
                {showQrCode && !connectionError && (
                  <p className="text-[11px] text-muted-foreground text-center max-w-[250px] leading-relaxed">
                    Abra o WhatsApp {'>'} Configurações {'>'} Dispositivos conectados {'>'} Conectar dispositivo
                  </p>
                )}
              </div>
            ) : null}

            {showConnectButton && !connect.isPending && (
              <>
                <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2">
                  <p className="text-sm font-medium">Recursos disponíveis:</p>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <li>• Mensagens automáticas e follow-ups</li>
                    <li>• Régua de cobrança automática</li>
                    <li>• Espelhamento de conversas no CRM</li>
                  </ul>
                </div>

                {connectionError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{connectionError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
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
                  
                  {account && (
                    <Button
                      variant="ghost"
                      onClick={handleHardReset}
                      disabled={hardReset.isPending}
                      className="w-full text-xs text-muted-foreground hover:text-destructive"
                    >
                      Problemas com a conexão? Clique aqui para resetar.
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
