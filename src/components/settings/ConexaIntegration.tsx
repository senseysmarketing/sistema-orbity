import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Eye, EyeOff, Save, Loader2, Copy, Check, Webhook } from "lucide-react";
import { usePaymentGateway } from "@/hooks/usePaymentGateway";
import { useToast } from "@/hooks/use-toast";

export function ConexaIntegration() {
  const { settings, isLoading, updateSettings, isSaving } = usePaymentGateway();
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [productId, setProductId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [receivingMethodId, setReceivingMethodId] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [gatewayActive, setGatewayActive] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showWebhookToken, setShowWebhookToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (settings && !initialized.current) {
      setApiKey(settings.conexa_api_key || "");
      setSubdomain(settings.conexa_subdomain || "");
      setProductId(settings.conexa_default_product_id ? String(settings.conexa_default_product_id) : "");
      setCompanyId(settings.conexa_company_id ? String(settings.conexa_company_id) : "");
      setUnitId((settings as any).conexa_unit_id ? String((settings as any).conexa_unit_id) : "");
      setAccountId((settings as any).conexa_account_id ? String((settings as any).conexa_account_id) : "");
      setReceivingMethodId((settings as any).conexa_receiving_method_id ? String((settings as any).conexa_receiving_method_id) : "");
      setWebhookToken(settings.conexa_webhook_token || "");
      setGatewayActive(settings.conexa_enabled ?? false);
      initialized.current = true;
    }
  }, [settings]);

  const webhookUrl = webhookToken
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?gateway=conexa&agency_id=${settings?.agency_id || ''}&secret=${encodeURIComponent(webhookToken)}`
    : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?gateway=conexa&agency_id=${settings?.agency_id || ''}&secret=SUA_CHAVE_AQUI`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({ title: "URL copiada!", description: "Cole no campo URL do Webhook no painel do Conexa." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        conexa_api_key: apiKey || null,
        conexa_subdomain: subdomain || null,
        conexa_default_product_id: productId ? parseInt(productId, 10) : null,
        conexa_company_id: companyId ? parseInt(companyId, 10) : null,
        conexa_unit_id: unitId ? parseInt(unitId, 10) : null,
        conexa_account_id: accountId ? parseInt(accountId, 10) : null,
        conexa_receiving_method_id: receivingMethodId ? parseInt(receivingMethodId, 10) : null,
        conexa_webhook_token: webhookToken || null,
        conexa_enabled: gatewayActive,
      } as any);
      toast({ title: "Configurações salvas!", description: gatewayActive ? "Conexa habilitado como gateway." : "Conexa desabilitado." });
    } catch {
      // error handled by hook
    }
  };

  const hasCredentials = !!apiKey.trim() && !!subdomain.trim() && !!productId.trim();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">Conexa</CardTitle>
              <CardDescription className="text-xs">Sistema de gestão financeira (PIX/Boleto/Cartão)</CardDescription>
            </div>
          </div>
          <Badge variant={hasCredentials && gatewayActive ? "default" : "secondary"} className={hasCredentials && gatewayActive ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-100" : ""}>
            {hasCredentials && gatewayActive ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Master Switch */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="conexa-active" className="text-sm font-medium cursor-pointer">
              Habilitar Conexa
            </Label>
            <p className="text-xs text-muted-foreground">
              Disponibiliza Conexa como opção de faturamento para clientes
            </p>
          </div>
          <Switch
            id="conexa-active"
            checked={gatewayActive}
            onCheckedChange={setGatewayActive}
          />
        </div>

        <Separator />

        {/* Subdomínio */}
        <div className="space-y-2">
          <Label htmlFor="conexa-subdomain">Subdomínio do Conexa</Label>
          <p className="text-xs text-muted-foreground">
            Se você acessa <strong>minhaagencia.conexa.app</strong>, digite apenas <strong>minhaagencia</strong>
          </p>
          <Input
            id="conexa-subdomain"
            type="text"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.trim().toLowerCase())}
            placeholder="minhaagencia"
          />
        </div>

        {/* Token de Acesso */}
        <div className="space-y-2">
          <Label htmlFor="conexa-token">Token de Acesso (Conexa)</Label>
          <p className="text-xs text-muted-foreground">
            Gere em Config &gt; Integrações &gt; API/Token no painel do Conexa
          </p>
          <div className="relative">
            <Input
              id="conexa-token"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole seu Application Token aqui"
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

        {/* ID do Produto Padrão */}
        <div className="space-y-2">
          <Label htmlFor="conexa-product-id">ID do Produto Padrão</Label>
          <p className="text-xs text-muted-foreground">
            ID numérico do produto genérico cadastrado no Conexa (ex: "Serviços de Agência"). Encontre em Produtos no painel.
          </p>
          <Input
            id="conexa-product-id"
            type="number"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Ex: 123"
            min="1"
          />
        </div>

        {/* ID da Empresa (Company ID) */}
        <div className="space-y-2">
          <Label htmlFor="conexa-company-id">ID da Empresa (Company ID)</Label>
          <p className="text-xs text-muted-foreground">
            ID numérico da empresa no Conexa. Encontre em Configurações &gt; Empresa no painel.
          </p>
          <Input
            id="conexa-company-id"
            type="number"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Ex: 1"
            min="1"
          />
        </div>

        {/* ID da Unidade (Conexa) */}
        <div className="space-y-2">
          <Label htmlFor="conexa-unit-id">ID da Unidade (Conexa)</Label>
          <p className="text-xs text-muted-foreground">
            Encontrado em Config &gt; Unidades &gt; Ações &gt; Exibir no seu painel Conexa. Obrigatório para criação de clientes e vendas.
          </p>
          <Input
            id="conexa-unit-id"
            type="number"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            placeholder="Ex: 1"
            min="1"
          />
        </div>

        <Separator />

        {/* Configurações de Baixa Manual */}
        <div className="space-y-2">
          <Label htmlFor="conexa-account-id">ID da Conta Bancária Padrão</Label>
          <p className="text-xs text-muted-foreground">
            ID numérico da conta bancária para baixa manual. Encontre em Financeiro &gt; Contas no painel Conexa.
          </p>
          <Input
            id="conexa-account-id"
            type="number"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Ex: 1"
            min="1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="conexa-receiving-method-id">ID do Meio de Recebimento Padrão</Label>
          <p className="text-xs text-muted-foreground">
            ID numérico do meio de recebimento para baixa manual. Encontre em Financeiro &gt; Meios de Recebimento no painel Conexa.
          </p>
          <Input
            id="conexa-receiving-method-id"
            type="number"
            value={receivingMethodId}
            onChange={(e) => setReceivingMethodId(e.target.value)}
            placeholder="Ex: 1"
            min="1"
          />
        </div>

        <Separator />

        {/* Webhook Security Key */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="conexa-webhook-token">Chave de Segurança do Webhook (Defina uma senha)</Label>
          </div>
          <div className="relative">
            <Input
              id="conexa-webhook-token"
              type={showWebhookToken ? "text" : "password"}
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
              placeholder="Digite uma senha segura (ex: minha_senha_123)"
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
          <p className="text-xs text-muted-foreground">
            Defina qualquer senha aqui. Você usará essa mesma senha na URL do webhook ao configurar no painel do Conexa. Ela garante que as notificações de pagamento sejam autênticas.
          </p>
        </div>

        {/* Webhook Instructions Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="webhook-instructions" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                🔌 Como configurar os Webhooks automáticos
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
                    O Conexa exige a criação de <strong>duas conexões</strong> separadas para receber notificações automáticas de pagamentos e cancelamentos. A segurança é garantida pela chave que você definiu acima, já embutida na URL.
                  </AlertDescription>
                </Alert>

                <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                  <li>
                    Acesse seu painel do Conexa e vá em{" "}
                    <strong className="text-foreground">Configurações &gt; Integrações &gt; Webhooks</strong>.
                  </li>
                  <li>
                    <strong className="text-foreground">Conexão 1 — Pagamentos:</strong> Clique em{" "}
                    <strong className="text-foreground">Nova Conexão</strong> &gt;{" "}
                    <strong className="text-foreground">Personalizado</strong>. Cole a URL abaixo no campo URL. Em{" "}
                    <strong className="text-foreground">Eventos de Cobrança</strong>, marque{" "}
                    <strong className="text-foreground">Quitação</strong>. Salve.
                  </li>
                  <li>
                    <strong className="text-foreground">Conexão 2 — Cancelamentos:</strong> Crie outra conexão personalizada. Cole a <strong className="text-foreground">mesma URL</strong>. Em{" "}
                    <strong className="text-foreground">Eventos de Cobrança</strong>, marque{" "}
                    <strong className="text-foreground">Alteração de status</strong>. Salve.
                  </li>
                  <li>
                    <span>Copie a URL abaixo e cole no campo <strong className="text-foreground">"URL"</strong> de cada conexão:</span>
                    <div className="mt-2 flex gap-2">
                      <Input
                        readOnly
                        value={webhookUrl}
                        className="text-xs font-mono bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={handleCopyUrl}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Defina a chave de segurança acima antes de copiar a URL. Ela já está embutida na URL como parâmetro <code className="bg-muted px-1 py-0.5 rounded">secret</code>.
                    </p>
                  </li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar e Conectar
        </Button>
      </CardContent>
    </Card>
  );
}
