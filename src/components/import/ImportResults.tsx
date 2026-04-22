import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Home, Link2, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ImportResultsProps {
  successCount: number;
  errorCount: number;
  importType: string;
  onNewImport: () => void;
  gatewaySyncedCount?: number;
  gatewaySkippedCount?: number;
  showGatewaySection?: boolean;
}

export function ImportResults({
  successCount,
  errorCount,
  importType,
  onNewImport,
  gatewaySyncedCount = 0,
  gatewaySkippedCount = 0,
  showGatewaySection = false,
}: ImportResultsProps) {
  const navigate = useNavigate();
  const totalRecords = successCount + errorCount;
  const isSuccess = errorCount === 0;

  const getNavigationPath = () => {
    if (importType === 'clients_and_payments') return '/dashboard/admin';
    if (importType === 'expenses') return '/dashboard/admin';
    if (importType === 'salaries') return '/dashboard/admin';
    if (importType === 'leads') return '/dashboard/crm';
    return '/dashboard';
  };

  const getImportTypeName = () => {
    if (importType === 'clients_and_payments') return 'Clientes e Pagamentos';
    if (importType === 'expenses') return 'Despesas';
    if (importType === 'salaries') return 'Salários';
    if (importType === 'leads') return 'Leads';
    return 'Dados';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className={isSuccess ? "border-emerald-500/50" : "border-amber-500/50"}>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {isSuccess ? (
              <div className="p-4 bg-emerald-500/10 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-emerald-600" />
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 rounded-full">
                <AlertCircle className="h-16 w-16 text-amber-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {isSuccess ? 'Importação Concluída!' : 'Importação Parcialmente Concluída'}
          </CardTitle>
          <CardDescription>
            {isSuccess
              ? 'Todos os dados foram importados com sucesso'
              : 'Alguns registros não puderam ser importados'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-3xl font-bold">{totalRecords}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{successCount}</p>
              <p className="text-sm text-muted-foreground">Importados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{errorCount}</p>
              <p className="text-sm text-muted-foreground">Erros</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Detalhes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span>Tipo de Importação</span>
                <span className="font-medium">{getImportTypeName()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded">
                <span className="text-emerald-700">✓ Registros Importados</span>
                <span className="font-medium text-emerald-700">{successCount}</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-destructive/5 rounded">
                  <span className="text-destructive">✗ Registros com Erro</span>
                  <span className="font-medium text-destructive">{errorCount}</span>
                </div>
              )}
            </div>
          </div>

          {showGatewaySection && (
            <div className="space-y-3">
              <h3 className="font-semibold">Sincronização com Gateway</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded">
                  <span className="text-primary flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> Sincronizados (criados no gateway)
                  </span>
                  <span className="font-medium text-primary">{gatewaySyncedCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCcw className="h-4 w-4" /> Já existiam no gateway
                  </span>
                  <span className="font-medium">{gatewaySkippedCount}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={() => navigate(getNavigationPath())} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Ver Dados Importados
            </Button>
            <Button variant="outline" onClick={onNewImport} className="w-full">
              Nova Importação
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
