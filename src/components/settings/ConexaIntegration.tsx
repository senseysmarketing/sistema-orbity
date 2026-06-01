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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Save, Loader2, Copy, Check, Webhook, RefreshCw, Info, FileText } from "lucide-react";
import conexaLogo from "@/assets/conexa-logo.png";
import { usePaymentGateway } from "@/hooks/usePaymentGateway";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function generateRandomKey(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join("");
}

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

  // Boleto / Meio de Faturamento
  const [invoicingMethodId, setInvoicingMethodId] = useState<string>("");
  const [invoicingMethodName, setInvoicingMethodName] = useState<string>("");
  const [invoicingMethodType, setInvoicingMethodType] = useState<string>("");
  const [autoGenerateBillet, setAutoGenerateBillet] = useState(false);
  const [invoicingMethods, setInvoicingMethods] = useState<
    Array<{ id: number; name: string; type: string; isActive: boolean }>
  >([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const lastLoadedId = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    // Só hidrata quando temos uma linha real (id não-vazio) e ainda não carregamos essa linha.
    // Evita que o `stableSettings` (defaults vazios) sobrescreva o formulário antes da query terminar.
    if (!settings?.id) return;
    if (lastLoadedId.current === settings.id) return;

    setApiKey(settings.conexa_api_key || "");
    setSubdomain(settings.conexa_subdomain || "");
    setProductId(settings.conexa_default_product_id ? String(settings.conexa_default_product_id) : "");
    setCompanyId(settings.conexa_company_id ? String(settings.conexa_company_id) : "");
    setUnitId((settings as any).conexa_unit_id ? String((settings as any).conexa_unit_id) : "");
    setAccountId((settings as any).conexa_account_id ? String((settings as any).conexa_account_id) : "");
    setReceivingMethodId((settings as any).conexa_receiving_method_id ? String((settings as any).conexa_receiving_method_id) : "");
    const existingToken = settings.conexa_webhook_token || "";
    setWebhookToken(existingToken || generateRandomKey());
    setGatewayActive(settings.conexa_enabled ?? false);
    setInvoicingMethodId(
      (settings as any).conexa_invoicing_method_id
        ? String((settings as any).conexa_invoicing_method_id)
        : "",
    );
    setInvoicingMethodName((settings as any).conexa_invoicing_method_name || "");
    setInvoicingMethodType((settings as any).conexa_invoicing_method_type || "");
    setAutoGenerateBillet((settings as any).conexa_auto_generate_billet === true);
    lastLoadedId.current = settings.id;
  }, [settings, isLoading]);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?gateway=conexa&agency_id=${settings?.agency_id || ""}&secret=${encodeURIComponent(webhookToken)}`;

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

  const handleRegenerateKey = () => {
    setWebhookToken(generateRandomKey());
    toast({ title: "Nova chave gerada!", description: "Lembre-se de atualizar a URL no painel do Conexa." });
  };

  const handleFetchInvoicingMethods = async () => {
    if (!settings?.agency_id) {
      toast({ title: "Agência não encontrada", variant: "destructive" });
      return;
    }
    if (!apiKey || !subdomain) {
      toast({
        title: "Configure subdomínio e token primeiro",
        description: "Salve o subdomínio e o token de acesso do Conexa antes de buscar os meios.",
        variant: "destructive",
      });
      return;
    }
    setLoadingMethods(true);
    try {
      const { data, error } = await supabase.functions.invoke("conexa-list-invoicing-methods", {
        body: { agency_id: settings.agency_id, type: "billet" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const methods = (data?.methods ?? []) as Array<{
        id: number;
        name: string;
        type: string;
        isActive: boolean;
      }>;
      setInvoicingMethods(methods);
      if (methods.length === 0) {
        toast({
          title: "Nenhum meio de faturamento do tipo Boleto encontrado",
          description: "Cadastre um Meio de Faturamento (ex.: Boleto Gerencianet/Efí) no painel Conexa.",
          variant: "destructive",
        });
      } else {
        toast({ title: `${methods.length} meio(s) encontrado(s)` });
      }
    } catch (err) {
      toast({
        title: "Erro ao buscar meios de faturamento",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleSelectInvoicingMethod = (id: string) => {
    setInvoicingMethodId(id);
    const found = invoicingMethods.find((m) => String(m.id) === id);
    if (found) {
      setInvoicingMethodName(found.name);
      setInvoicingMethodType(found.type);
    }
  };

  const handleSave = async () => {
    // Validação: auto boleto requer meio do tipo billet
    if (autoGenerateBillet) {
      if (!invoicingMethodId) {
        toast({
          title: "Selecione um Meio de Faturamento",
          description: "Auto-geração de boleto está ativa. Clique em 'Buscar meios de faturamento' e escolha um.",
          variant: "destructive",
        });
        return;
      }
      if (invoicingMethodType && invoicingMethodType !== "billet") {
        toast({
          title: "Tipo inválido para boleto",
          description: `O meio selecionado é "${invoicingMethodType}". Selecione um do tipo "billet".`,
          variant: "destructive",
        });
        return;
      }
    }

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
        conexa_invoicing_method_id: invoicingMethodId ? parseInt(invoicingMethodId, 10) : null,
        conexa_invoicing_method_name: invoicingMethodName || null,
        conexa_invoicing_method_type: invoicingMethodType || null,
        conexa_auto_generate_billet: autoGenerateBillet,
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-amber-100">
              <img src={conexaLogo} alt="Conexa" className="h-10 w-10 object-contain rounded-lg" />
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

        {/* Grid 2 colunas: Subdomínio + Token de Acesso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="conexa-subdomain">Subdomínio do Conexa</Label>
            <p className="text-xs text-muted-foreground">
              Se acessa <strong>minhaagencia.conexa.app</strong>, digite <strong>minhaagencia</strong>
            </p>
            <Input
              id="conexa-subdomain"
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.trim().toLowerCase())}
              placeholder="minhaagencia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conexa-token">Token de Acesso (Conexa)</Label>
            <p className="text-xs text-muted-foreground">
              Gere em Config &gt; Integrações &gt; API/Token no painel
            </p>
            <div className="relative">
              <Input
                id="conexa-token"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole seu Application Token"
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
        </div>

        {/* Grid 2 colunas: Unit ID + Product ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="conexa-unit-id">ID da Unidade</Label>
            <p className="text-xs text-muted-foreground">
              Config &gt; Unidades &gt; Ações &gt; Exibir no painel Conexa
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

          <div className="space-y-2">
            <Label htmlFor="conexa-product-id">ID do Produto Padrão</Label>
            <p className="text-xs text-muted-foreground">
              ID numérico do produto genérico cadastrado no Conexa
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
        </div>

        {/* Company ID sozinho */}
        <div className="space-y-2">
          <Label htmlFor="conexa-company-id">ID da Empresa (Company ID)</Label>
          <p className="text-xs text-muted-foreground">
            Encontre em Configurações &gt; Empresa no painel Conexa
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

        <Separator />

        {/* Boleto / Meio de Faturamento */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Boleto / Meio de Faturamento</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Selecione um meio de faturamento do tipo <strong>Boleto</strong> (ex.: Boleto
            Gerencianet/Efí) cadastrado na sua conta Conexa. Sem isso, o boleto não nasce automaticamente.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFetchInvoicingMethods}
              disabled={loadingMethods}
            >
              {loadingMethods ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Buscar meios de faturamento
            </Button>
            {invoicingMethodName && (
              <Badge variant="secondary" className="self-center">
                Atual: {invoicingMethodName} ({invoicingMethodType || "?"})
              </Badge>
            )}
          </div>

          {invoicingMethods.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="conexa-invoicing-method">Selecione o meio</Label>
              <Select value={invoicingMethodId} onValueChange={handleSelectInvoicingMethod}>
                <SelectTrigger id="conexa-invoicing-method">
                  <SelectValue placeholder="Escolha um meio de faturamento" />
                </SelectTrigger>
                <SelectContent>
                  {invoicingMethods.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} — {m.type} {m.isActive ? "" : "(inativo)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5 pr-3">
              <Label htmlFor="conexa-auto-billet" className="text-sm font-medium cursor-pointer">
                Gerar boleto automaticamente ao faturar
              </Label>
              <p className="text-xs text-muted-foreground">
                Envia <code>invoicingMethodId</code> no POST /charge. Exige meio do tipo <strong>billet</strong> ativo.
              </p>
            </div>
            <Switch
              id="conexa-auto-billet"
              checked={autoGenerateBillet}
              onCheckedChange={setAutoGenerateBillet}
            />
          </div>

          {autoGenerateBillet && !invoicingMethodId && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                Selecione um meio de faturamento antes de salvar com a auto-geração ativa.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />



        {/* Chave de Segurança do Webhook - Auto-gerada */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="conexa-webhook-token">Chave de Segurança do Webhook</Label>
          </div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Input
                id="conexa-webhook-token"
                type={showWebhookToken ? "text" : "password"}
                value={webhookToken}
                readOnly
                className="pr-10 bg-muted font-mono text-sm"
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="shrink-0" title="Gerar nova chave">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regerar chave de segurança?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ao regerar a chave, a URL do webhook será alterada. Você precisará atualizar a URL nas <strong>duas conexões</strong> configuradas no painel do Conexa para não perder a sincronização de pagamentos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegenerateKey}>Regerar Chave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-xs text-muted-foreground">
            Chave gerada automaticamente. Já está embutida na URL do webhook abaixo.
          </p>
        </div>

        {/* Webhook Setup Guide - Always visible (Asaas style) */}
        <Alert className="mt-2 bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs space-y-3 ml-2">
            <p className="font-semibold text-sm text-blue-800 dark:text-blue-300">Como configurar o Webhook no Conexa</p>

            <p className="text-muted-foreground">
              O Conexa exige a criação de <strong className="text-foreground">duas conexões</strong> separadas para receber notificações automáticas de pagamentos e cancelamentos. A segurança é garantida pela chave gerada automaticamente, já embutida na URL.
            </p>

            <ol className="space-y-2 list-decimal list-outside pl-5 text-muted-foreground">
              <li className="leading-relaxed">
                Acesse seu painel do Conexa e vá em <strong className="text-foreground">Configurações → Integrações → Webhooks</strong>.
              </li>
              <li className="leading-relaxed">
                <strong className="text-foreground">Conexão 1 — Pagamentos:</strong> Clique em <strong className="text-foreground">Nova Conexão</strong> → <strong className="text-foreground">Personalizado</strong>. Cole a URL abaixo. Em <strong className="text-foreground">Eventos de Cobrança</strong>, marque <strong className="text-foreground">Quitação</strong>. Salve.
              </li>
              <li className="leading-relaxed">
                <strong className="text-foreground">Conexão 2 — Cancelamentos:</strong> Crie outra conexão. Cole a <strong className="text-foreground">mesma URL</strong>. Em <strong className="text-foreground">Eventos de Cobrança</strong>, marque <strong className="text-foreground">Alteração de status</strong>. Salve.
              </li>
              <li className="leading-relaxed">
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
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Configurações de Baixa Manual - Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="manual-settlement" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                ⚙️ Configurações de Baixa Manual (Opcional)
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Configure estes IDs apenas se desejar que as baixas manuais feitas no Orbity sejam sincronizadas com o Conexa.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conexa-account-id">ID da Conta Bancária Padrão</Label>
                    <p className="text-xs text-muted-foreground">
                      Financeiro &gt; Contas no painel Conexa
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
                    <Label htmlFor="conexa-receiving-method-id">ID do Meio de Recebimento</Label>
                    <p className="text-xs text-muted-foreground">
                      Financeiro &gt; Meios de Recebimento no painel Conexa
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
                </div>
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
