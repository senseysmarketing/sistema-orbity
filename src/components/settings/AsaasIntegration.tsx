import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Save, Loader2, Copy, Info, CheckCircle2 } from "lucide-react";
import asaasLogo from "@/assets/asaas-logo.png";
import { usePaymentGateway } from "@/hooks/usePaymentGateway";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

export function AsaasIntegration() {
  const { settings, isLoading, updateSettings, isSaving } = usePaymentGateway();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const agencyId = currentAgency?.id;

  const [apiKey, setApiKey] = useState("");
  const [gatewayActive, setGatewayActive] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [webhookToken, setWebhookToken] = useState("");
  const [showWebhookToken, setShowWebhookToken] = useState(false);

  const webhookUrl = agencyId
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?gateway=asaas&agency_id=${agencyId}`
    : "";

  useEffect(() => {
    if (settings) {
      setApiKey(settings.asaas_api_key || "");
      setGatewayActive(settings.asaas_enabled ?? false);
      setWebhookToken(settings.asaas_webhook_token || "");
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings({
        asaas_api_key: apiKey || null,
        asaas_webhook_token: webhookToken || null,
        asaas_sandbox: false,
        asaas_enabled: gatewayActive,
      });
      toast({ title: "Configurações salvas!", description: gatewayActive ? "Asaas habilitado como gateway." : "Asaas desabilitado." });
    } catch {
      // error handled by hook
    }
  };

  const handleCopyUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast({ title: "URL copiada!", description: "Cole no painel do Asaas." });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const hasKey = !!apiKey.trim();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const webhookEvents = [
    { code: "PAYMENT_CREATED", desc: "Geração de nova cobrança" },
    { code: "PAYMENT_UPDATED", desc: "Alteração de vencimento/valor" },
    { code: "PAYMENT_CONFIRMED", desc: "Cobrança confirmada (saldo a liberar)" },
    { code: "PAYMENT_RECEIVED", desc: "Cobrança recebida (saldo liberado)" },
    { code: "PAYMENT_OVERDUE", desc: "Cobrança vencida" },
    { code: "PAYMENT_DELETED", desc: "Cobrança removida" },
    { code: "PAYMENT_REFUNDED", desc: "Cobrança estornada" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Asaas</CardTitle>
              <CardDescription className="text-xs">Gateway de pagamentos (PIX/Boleto)</CardDescription>
            </div>
          </div>
          <Badge variant={hasKey && gatewayActive ? "default" : "secondary"} className={hasKey && gatewayActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100" : ""}>
            {hasKey && gatewayActive ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Master Switch */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="asaas-active" className="text-sm font-medium cursor-pointer">
              Habilitar Asaas
            </Label>
            <p className="text-xs text-muted-foreground">
              Disponibiliza Asaas como opção de faturamento para clientes
            </p>
          </div>
          <Switch
            id="asaas-active"
            checked={gatewayActive}
            onCheckedChange={setGatewayActive}
          />
        </div>

        <Separator />

        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="asaas-key">API Key</Label>
          <div className="relative">
            <Input
              id="asaas-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="$aact_..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Webhook Configuration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-medium">Configuração de Webhook (Retorno de Pagamento)</Label>
          </div>

          {/* Webhook URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
            {agencyId ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="text-xs font-mono bg-muted/50"
                />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            )}
          </div>

          {/* Webhook Token */}
          <div className="space-y-1.5">
            <Label htmlFor="asaas-webhook-token" className="text-xs text-muted-foreground">Token de Autenticação</Label>
            <div className="relative">
              <Input
                id="asaas-webhook-token"
                type={showWebhookToken ? "text" : "password"}
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
                placeholder="Cole o token gerado no Asaas"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowWebhookToken(!showWebhookToken)}
              >
                {showWebhookToken ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Setup Guide */}
        <Alert className="mt-2 bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs space-y-3 ml-2">
            <p className="font-semibold text-sm text-blue-800 dark:text-blue-300">Como configurar o Webhook no Asaas</p>

            <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
              <li className="leading-relaxed">
                <span>No Asaas, acesse <strong className="text-foreground">Menu do Usuário → Integrações → Webhooks</strong> e clique em <strong className="text-foreground">"Criar Webhook"</strong>.</span>
              </li>
              <li className="leading-relaxed">
                <span>Dê um nome (ex: <em>Integração Orbity</em>) e cole a <strong className="text-foreground">URL do Webhook</strong> gerada acima.</span>
              </li>
              <li className="leading-relaxed">
                <span>Clique em <strong className="text-foreground">"Gerar token"</strong> no Asaas, copie o valor e cole no campo <strong className="text-foreground">Token de Autenticação</strong> aqui no Orbity.</span>
              </li>
              <li className="leading-relaxed">
                <span>Mantenha a <strong className="text-foreground">Fila de sincronização</strong> e o <strong className="text-foreground">Webhook</strong> como <strong className="text-foreground">"Ativados"</strong>.</span>
              </li>
              <li className="leading-relaxed">
                <div className="flex items-start gap-1">
                  <span>⚠️ <strong className="text-foreground">IMPORTANTE — Eventos para Cobranças:</strong> Marque estritamente estas opções:</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {webhookEvents.map((evt) => (
                    <div key={evt.code} className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{evt.code}</span>
                      <span className="text-[11px] text-muted-foreground">— {evt.desc}</span>
                    </div>
                  ))}
                </div>
              </li>
              <li className="leading-relaxed">
                <span>Salve o webhook no Asaas e clique em <strong className="text-foreground">"Salvar e Conectar"</strong> aqui no Orbity.</span>
              </li>
            </ol>
          </AlertDescription>
        </Alert>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar e Conectar
        </Button>
      </CardContent>
    </Card>
  );
}
