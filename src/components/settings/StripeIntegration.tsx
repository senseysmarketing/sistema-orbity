import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Save, Loader2, Copy, Info, CheckCircle2, Zap } from "lucide-react";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AgencyStripeRow {
  id: string;
  stripe_secret_key: string | null;
  stripe_webhook_secret: string | null;
  active_payment_gateway: string | null;
}

const maskKey = (k: string) => (k.length <= 8 ? "••••" : `${k.slice(0, 7)}••••${k.slice(-4)}`);

export function StripeIntegration() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const agencyId = currentAgency?.id;

  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [activeGateway, setActiveGateway] = useState<"asaas" | "stripe">("asaas");
  const [showKey, setShowKey] = useState(false);
  const [showWh, setShowWh] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hadKey, setHadKey] = useState(false);

  const { data: row, isLoading } = useQuery({
    queryKey: ["agency-stripe", agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from("agencies")
        .select("id, stripe_secret_key, stripe_webhook_secret, active_payment_gateway")
        .eq("id", agencyId)
        .maybeSingle();
      if (error) throw error;
      return data as AgencyStripeRow | null;
    },
    enabled: !!agencyId,
  });

  useEffect(() => {
    if (row) {
      const k = row.stripe_secret_key ?? "";
      const w = row.stripe_webhook_secret ?? "";
      setSecretKey(k ? maskKey(k) : "");
      setWebhookSecret(w ? maskKey(w) : "");
      setActiveGateway((row.active_payment_gateway as "asaas" | "stripe") ?? "asaas");
      setHadKey(!!k);
    }
  }, [row]);

  const webhookUrl = agencyId
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-agency-webhook?agency_id=${agencyId}`
    : "";

  const isConfigured = hadKey;
  const stripeActive = isConfigured && activeGateway === "stripe";

  const handleSave = async () => {
    if (!agencyId) return;
    setSaving(true);
    try {
      const update: Partial<AgencyStripeRow> = { active_payment_gateway: activeGateway };
      // Só atualiza chaves se o usuário digitou algo novo (não mascarado)
      if (secretKey && !secretKey.includes("••••")) update.stripe_secret_key = secretKey.trim();
      if (webhookSecret && !webhookSecret.includes("••••")) update.stripe_webhook_secret = webhookSecret.trim();

      const { error } = await supabase.from("agencies").update(update).eq("id", agencyId);
      if (error) throw error;

      toast({ title: "Configurações salvas", description: "Integração Stripe atualizada." });
      queryClient.invalidateQueries({ queryKey: ["agency-stripe", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["payment-gateway", agencyId] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!secretKey || secretKey.includes("••••")) {
      toast({
        title: "Cole uma nova chave para testar",
        description: "Para testar, digite uma chave (a chave salva está mascarada).",
        variant: "destructive",
      });
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-agency-stripe", {
        body: { secret_key: secretKey.trim() },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Falha desconhecida");
      toast({
        title: "Conexão OK",
        description: `Modo: ${data.livemode ? "LIVE" : "TEST"}`,
      });
    } catch (err: any) {
      toast({ title: "Falha no teste", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copiado!` });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Stripe</CardTitle>
              <CardDescription className="text-xs">
                Cobre clientes em qualquer moeda (BRL, USD, EUR…)
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={stripeActive ? "default" : "secondary"}
            className={stripeActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100" : ""}
          >
            {stripeActive ? "Ativo" : isConfigured ? "Configurado" : "Não configurado"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Seletor de gateway principal */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Gateway principal de cobrança</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["asaas", "stripe"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setActiveGateway(g)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  activeGateway === g
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="text-sm font-semibold capitalize">{g}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {g === "asaas" ? "PIX/Boleto (Brasil)" : "Multi-moeda global"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Secret Key */}
        <div className="space-y-2">
          <Label htmlFor="stripe-key">Restricted Secret Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="stripe-key"
                type={showKey ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="rk_live_… ou sk_test_…"
                className="pr-10 font-mono text-xs"
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
            <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar"}
            </Button>
          </div>
          {hadKey && (
            <p className="text-[11px] text-muted-foreground">
              Chave salva. Para alterar, cole uma nova; caso contrário deixe como está.
            </p>
          )}
        </div>

        {/* Webhook Secret */}
        <div className="space-y-2">
          <Label htmlFor="stripe-wh">Webhook Signing Secret</Label>
          <div className="relative">
            <Input
              id="stripe-wh"
              type={showWh ? "text" : "password"}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_…"
              className="pr-10 font-mono text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowWh(!showWh)}
            >
              {showWh ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Webhook URL */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">URL do Webhook (cole no painel Stripe)</Label>
          {agencyId ? (
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="text-xs font-mono bg-muted/50" />
              <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => copy(webhookUrl, "URL")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="h-10 rounded-md bg-muted animate-pulse" />
          )}
        </div>

        <Alert className="bg-violet-50/50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800">
          <Info className="h-4 w-4 text-violet-500" />
          <AlertDescription className="text-xs space-y-2 ml-2">
            <p className="font-semibold text-sm">Como configurar na Stripe</p>
            <ol className="space-y-1.5 list-decimal list-outside pl-5 text-muted-foreground">
              <li>Crie uma <strong className="text-foreground">Restricted Key</strong> em Developers → API keys (permissões: Checkout Sessions write, Payment Intents read).</li>
              <li>Em Developers → Webhooks → "Add endpoint", cole a URL acima e habilite os eventos:
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["checkout.session.completed", "payment_intent.succeeded", "payment_intent.payment_failed"].map((e) => (
                    <span key={e} className="flex items-center gap-1 font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {e}
                    </span>
                  ))}
                </div>
              </li>
              <li>Copie o <strong className="text-foreground">Signing secret</strong> do endpoint e cole aqui.</li>
              <li>Selecione <strong className="text-foreground">Stripe</strong> como gateway principal e salve.</li>
            </ol>
          </AlertDescription>
        </Alert>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar configurações
        </Button>
      </CardContent>
    </Card>
  );
}
