import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertCircle, AlertTriangle, Check, ChevronDown, CreditCard, ExternalLink,
  Loader2, MessageSquare, Plug, QrCode, RefreshCw, Trash2, Unlink, Wifi,
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
  const {
    state, isLoading, connect, refreshQr, disconnect, hardReset,
    validateExternal, manualAttach, manualDetach,
  } = useWhatsAppConnection(purpose);

  const [externalOpen, setExternalOpen] = useState(false);
  const [extUrl, setExtUrl] = useState("");
  const [extToken, setExtToken] = useState("");
  const [extName, setExtName] = useState("");
  const [extWebhook, setExtWebhook] = useState(false);
  const [validateResult, setValidateResult] = useState<{ status: string; phone_number: string | null } | null>(null);

  const isExternal = state.connection_mode === 'external';

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

  const handleDetach = () => {
    if (confirm('Remover o vínculo da Orbity com a instância externa? A instância continua ativa na Uazapi e em outros sistemas — apenas a Orbity deixa de usá-la.')) {
      manualDetach.mutate();
    }
  };

  const handleValidate = async () => {
    setValidateResult(null);
    const result = await validateExternal.mutateAsync({
      api_url: extUrl.trim(),
      api_key: extToken.trim(),
    });
    setValidateResult({ status: result.status, phone_number: result.phone_number });
  };

  const handleAttach = async () => {
    await manualAttach.mutateAsync({
      api_url: extUrl.trim(),
      api_key: extToken.trim(),
      instance_name: extName.trim() || undefined,
      configure_webhook: extWebhook,
    });
    // limpa formulário
    setExternalOpen(false);
    setExtUrl("");
    setExtToken("");
    setExtName("");
    setExtWebhook(false);
    setValidateResult(null);
  };

  const externalValid = extUrl.trim().length > 0 && extToken.trim().length > 0;

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

  const ExternalAttachForm = (
    <Collapsible open={externalOpen} onOpenChange={setExternalOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Já tenho uma instância Uazapi (avançado)
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${externalOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        <div className="p-3 sm:p-4 border rounded-lg space-y-3 bg-muted/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use esta opção se você já tem uma instância Uazapi conectada em outro sistema. A Orbity apenas
            enviará mensagens por essa instância — <strong>não deletará nem desconectará</strong> a instância existente.
          </p>

          <div className="space-y-2">
            <Label htmlFor={`ext-url-${purpose}`}>URL da Uazapi</Label>
            <Input
              id={`ext-url-${purpose}`}
              placeholder="https://sua-uazapi.exemplo.com"
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`ext-token-${purpose}`}>Token da instância</Label>
            <Input
              id={`ext-token-${purpose}`}
              type="password"
              placeholder="Token de autenticação da instância"
              value={extToken}
              onChange={(e) => setExtToken(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`ext-name-${purpose}`}>Nome da instância (opcional)</Label>
            <Input
              id={`ext-name-${purpose}`}
              placeholder="ex: cobranca_principal"
              value={extName}
              onChange={(e) => setExtName(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id={`ext-webhook-${purpose}`}
              checked={extWebhook}
              onCheckedChange={(v) => setExtWebhook(v === true)}
            />
            <div className="space-y-1">
              <Label htmlFor={`ext-webhook-${purpose}`} className="text-sm font-normal cursor-pointer">
                Configurar webhook da Orbity nesta instância
              </Label>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Pode sobrescrever o webhook de outro sistema que esteja usando esta instância. Deixe desmarcado se a Orbity for usada apenas para envio de cobrança.</span>
              </p>
            </div>
          </div>

          {validateResult && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Instância válida — status <strong>{validateResult.status}</strong>
                {validateResult.phone_number ? ` · ${formatPhoneDisplay(validateResult.phone_number)}` : ''}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={!externalValid || validateExternal.isPending}
            >
              {validateExternal.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Testar conexão
            </Button>
            <Button
              size="sm"
              onClick={handleAttach}
              disabled={!externalValid || manualAttach.isPending}
            >
              {manualAttach.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              Usar esta instância
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

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
              {isExternal && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                  <ExternalLink className="mr-1 h-3 w-3" /> Instância externa
                </Badge>
              )}
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
            {ExternalAttachForm}
          </div>
        )}

        {!isLoading && state.status === 'provisioning' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 border rounded-lg bg-muted/30">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparando instância na Uazapi...</p>
          </div>
        )}

        {!isLoading && state.status === 'qr_pending' && !isExternal && (
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
                {isExternal && (
                  <div className="text-[11px] text-muted-foreground pt-1 space-y-0.5">
                    {state.instance_name && <p>Instância: <span className="font-mono">{state.instance_name}</span></p>}
                    {state.api_key_masked && <p>Token: <span className="font-mono">{state.api_key_masked}</span></p>}
                    <p>
                      Webhook Orbity:{' '}
                      {state.webhook_managed_by_orbity
                        ? <span className="text-green-600 dark:text-green-400">configurado</span>
                        : <span>não configurado (envio apenas)</span>}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isExternal ? (
                <Button variant="destructive" size="sm" onClick={handleDetach} disabled={manualDetach.isPending}>
                  {manualDetach.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                  Remover vínculo
                </Button>
              ) : (
                <>
                  <Button variant="destructive" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                    {disconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                    Desconectar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleHardReset} disabled={hardReset.isPending} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Resetar Conexão
                  </Button>
                </>
              )}
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
              {isExternal ? (
                <Button variant="destructive" size="sm" onClick={handleDetach} disabled={manualDetach.isPending}>
                  <Unlink className="mr-2 h-4 w-4" /> Remover vínculo
                </Button>
              ) : (
                <>
                  <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
                    {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Tentar novamente
                  </Button>
                  <Button variant="ghost" onClick={handleHardReset} disabled={hardReset.isPending} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Resetar Conexão
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
