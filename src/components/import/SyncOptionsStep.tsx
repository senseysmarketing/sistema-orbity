import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  agencyId: string;
  rows: any[];
  onBack: () => void;
  onStart: (opts: { syncGateway: boolean; addToMrr: boolean }) => void;
}

interface GatewayState {
  hasAny: boolean;
  asaas: boolean;
  conexa: boolean;
  loading: boolean;
}

export function SyncOptionsStep({ agencyId, rows, onBack, onStart }: Props) {
  const [syncGateway, setSyncGateway] = useState(false);
  const [addToMrr, setAddToMrr] = useState(true);
  const [gateway, setGateway] = useState<GatewayState>({
    hasAny: false,
    asaas: false,
    conexa: false,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("agency_payment_settings")
        .select("asaas_enabled, asaas_api_key, conexa_enabled, conexa_token")
        .eq("agency_id", agencyId)
        .maybeSingle();

      const asaas = !!(data?.asaas_enabled && data?.asaas_api_key);
      const conexa = !!(data?.conexa_enabled && data?.conexa_token);
      setGateway({ hasAny: asaas || conexa, asaas, conexa, loading: false });
    })();
  }, [agencyId]);

  const activeWithoutDoc = useMemo(
    () => rows.filter((r) => r.status === "ATIVO" && !r.document).length,
    [rows]
  );
  const activeCount = useMemo(() => rows.filter((r) => r.status === "ATIVO").length, [rows]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Opções de Sincronização</h2>
        <p className="text-sm text-muted-foreground">
          {rows.length} linhas válidas — {activeCount} marcadas como ATIVO
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Sincronizar com Gateway de Pagamento
          </CardTitle>
          <CardDescription>
            Cria/atualiza os clientes ATIVO no seu gateway (Asaas ou Conexa) com idempotência por CPF/CNPJ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {gateway.loading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando gateways…
                </span>
              ) : gateway.hasAny ? (
                <span className="text-muted-foreground">
                  Gateway ativo: {gateway.asaas ? "Asaas" : ""}{gateway.asaas && gateway.conexa ? " + " : ""}{gateway.conexa ? "Conexa" : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">Nenhum gateway configurado para esta agência.</span>
              )}
            </div>
            <Switch
              checked={syncGateway}
              onCheckedChange={setSyncGateway}
              disabled={!gateway.hasAny || gateway.loading}
            />
          </div>

          {syncGateway && activeWithoutDoc > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {activeWithoutDoc} cliente(s) ATIVO sem CPF/CNPJ serão ignorados na sincronização do gateway.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar ao MRR</CardTitle>
          <CardDescription>
            Marca clientes ATIVO como ativos no sistema, alimentando MRR e fluxo de cobrança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {activeCount} cliente(s) entrarão na carteira ativa
            </p>
            <Switch checked={addToMrr} onCheckedChange={setAddToMrr} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={() => onStart({ syncGateway, addToMrr })}>Iniciar Importação</Button>
      </div>
    </div>
  );
}
