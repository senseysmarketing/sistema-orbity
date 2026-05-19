import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle, AlertTriangle, Check, CreditCard, Loader2, MessageSquare,
  QrCode, RefreshCw, Trash2, Unlink, Wifi,
} from "lucide-react";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { formatPhoneDisplay } from "@/lib/formatPhoneDisplay";
import whatsappLogo from "@/assets/whatsapp-logo.png";

interface WhatsAppInstanceCardProps {
  purpose: 'general' | 'billing';
  title: string;
  description: string;
}

export const WhatsAppInstanceCard = ({ purpose, title, description }: WhatsAppInstanceCardProps) => {
  const { state, isLoading, connect, refreshQr, disconnect, hardReset } = useWhatsAppConnection(purpose);

  const IconComponent = purpose === 'billing' ? CreditCard : MessageSquare;
  const iconBgClass = purpose === 'billing'
    ? 'bg-amber-100 dark:bg-amber-900/30'
    : 'bg-green-100 dark:bg-green-900/30';
  const iconTextClass = purpose === 'billing'
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-green-600 dark:text-green-400';

  const handleHardReset = () => {
    if (confirm('Apagar token e instância na Uazapi? Será necessário escanear um novo QR Code.')) {
      hardReset.mutate();
    }
  };

  const StatusBadge = () => {
    switch (state.status) {
      case 'connected':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <Check className="mr-1 h-3 w-3" /> Conectado
          </Badge>
        );
      case 'provisioning':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Preparando instância
          </Badge>
        );
      case 'qr_pending':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <QrCode className="mr-1 h-3 w-3" /> Aguardando leitura
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <AlertTriangle className="mr-1 h-3 w-3" /> Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
            <AlertCircle className="mr-1 h-3 w-3" /> Desconectado
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden ${iconBgClass} flex-shrink-0`}>
            {purpose === 'general'
              ? <img src={whatsappLogo} alt="WhatsApp" className="h-6 w-6 object-contain" />
              : <IconComponent className={`h-5 w-5 ${iconTextClass}`} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
              <StatusBadge />
            </div>
            <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && state.status === 'disconnected' && (
          <div className="space-y-3">
            <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Recursos disponíveis:</p>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <li>• Mensagens automáticas e follow-ups</li>
                <li>• Régua de cobrança automática</li>
                <li>• Espelhamento de conversas no CRM</li>
              </ul>
            </div>
            <Button onClick={() => connect.mutate()} disabled={connect.isPending} className="w-full">
              {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IconComponent className="mr-2 h-4 w-4" />}
              Conectar WhatsApp
            </Button>
          </div>
        )}

        {!isLoading && state.status === 'provisioning' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 border rounded-lg bg-muted/30">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparando instância na Uazapi...</p>
          </div>
        )}

        {!isLoading && state.status === 'qr_pending' && (
          <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-muted/30">
            {state.qr_code ? (
              <>
                <p className="text-sm font-medium flex items-center gap-2 text-foreground/80">
                  <QrCode className="h-4 w-4" /> Escaneie o QR Code no WhatsApp
                </p>
                <img
                  src={state.qr_code}
                  alt="WhatsApp QR Code"
                  className="w-[250px] h-[250px] rounded-lg shadow-md border bg-white p-2"
                />
                <p className="text-[11px] text-muted-foreground text-center max-w-[260px] leading-relaxed">
                  Abra o WhatsApp {'>'} Configurações {'>'} Dispositivos conectados {'>'} Conectar dispositivo
                </p>
              </>
            ) : (
              <Alert variant="destructive" className="w-full max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>QR Code não disponível. Clique em Atualizar QR.</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => refreshQr.mutate()} disabled={refreshQr.isPending}>
                {refreshQr.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                Atualizar QR
              </Button>
              <Button variant="ghost" size="sm" onClick={handleHardReset} disabled={hardReset.isPending} className="text-muted-foreground hover:text-destructive">
                {hardReset.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
                Resetar Conexão
              </Button>
            </div>
          </div>
        )}

        {!isLoading && state.status === 'connected' && (
          <>
            <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" /> WhatsApp conectado
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {state.phone_number ? `Número: ${formatPhoneDisplay(state.phone_number)}` : 'Sincronizando número...'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                {disconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                Desconectar
              </Button>
              <Button variant="ghost" size="sm" onClick={handleHardReset} disabled={hardReset.isPending} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Resetar Conexão
              </Button>
            </div>
          </>
        )}

        {!isLoading && state.status === 'error' && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.error || 'Erro desconhecido ao conectar.'}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
                {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Tentar novamente
              </Button>
              <Button variant="ghost" onClick={handleHardReset} disabled={hardReset.isPending} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Resetar Conexão
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
