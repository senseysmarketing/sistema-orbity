import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { usePaymentGateway } from "@/hooks/usePaymentGateway";
import { useToast } from "@/hooks/use-toast";

export function AsaasIntegration() {
  const { settings, isAsaasActive, isLoading, updateSettings, isSaving } = usePaymentGateway();
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState("");
  const [sandbox, setSandbox] = useState(true);
  const [gatewayActive, setGatewayActive] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setApiKey(settings.asaas_api_key || "");
      setSandbox(settings.asaas_sandbox ?? true);
      setGatewayActive(settings.asaas_enabled ?? false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings({
        asaas_api_key: apiKey || null,
        asaas_sandbox: sandbox,
        asaas_enabled: gatewayActive,
      });
      toast({ title: "Configurações salvas!", description: gatewayActive ? "Asaas habilitado como gateway." : "Asaas desabilitado." });
    } catch {
      // error handled by hook
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

        {/* Sandbox Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="asaas-sandbox" className="text-sm cursor-pointer">Ambiente</Label>
            <p className="text-xs text-muted-foreground">
              {sandbox ? "Sandbox (testes)" : "Produção (cobranças reais)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{sandbox ? "Sandbox" : "Produção"}</span>
            <Switch
              id="asaas-sandbox"
              checked={!sandbox}
              onCheckedChange={(v) => setSandbox(!v)}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar e Conectar
        </Button>
      </CardContent>
    </Card>
  );
}
