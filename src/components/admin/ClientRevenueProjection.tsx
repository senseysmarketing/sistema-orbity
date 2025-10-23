import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { format, addMonths, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientRevenueProjectionProps {
  hasLoyalty: boolean;
  contractEndDate: string | null;
  monthlyValue: number;
  renewalRate: number; // Para clientes sem fidelidade
  monthsAsClient: number; // Para clientes sem fidelidade
}

export function ClientRevenueProjection({
  hasLoyalty,
  contractEndDate,
  monthlyValue,
  renewalRate,
  monthsAsClient,
}: ClientRevenueProjectionProps) {
  if (hasLoyalty && contractEndDate) {
    // Cliente COM fidelidade
    const endDate = new Date(contractEndDate);
    const today = new Date();
    const monthsRemaining = differenceInMonths(endDate, today);
    
    if (monthsRemaining < 0) {
      return (
        <Card className="bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Fidelidade Vencida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O contrato de fidelidade deste cliente já venceu em{' '}
              {format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
            </p>
            <p className="text-sm font-medium text-destructive">
              Considere entrar em contato para renovar o contrato.
            </p>
          </CardContent>
        </Card>
      );
    }

    const totalProjected = monthlyValue * monthsRemaining;
    const projectionMonths = Array.from({ length: Math.min(monthsRemaining, 6) }, (_, i) => {
      const monthDate = addMonths(today, i + 1);
      return {
        month: format(monthDate, "MMM/yy", { locale: ptBR }),
        value: monthlyValue,
      };
    });

    return (
      <div className="space-y-4">
        <Card className="bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Previsão de Recebimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Fidelidade até:</span>
              </div>
              <span className="font-semibold">
                {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Meses restantes:</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {monthsRemaining} {monthsRemaining === 1 ? 'mês' : 'meses'}
              </Badge>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor mensal:</span>
                <span className="font-semibold">
                  R$ {monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
                  <DollarSign className="h-5 w-5" />
                  <span>Total Previsto:</span>
                </div>
                <span className="font-bold text-green-600 dark:text-green-400">
                  R$ {totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de barras dos próximos meses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Próximos Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectionMonths.map((month, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{month.month}</span>
                    <span className="font-medium">
                      R$ {month.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              ))}
              {monthsRemaining > 6 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  + {monthsRemaining - 6} meses adicionais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    // Cliente SEM fidelidade
    return (
      <Card className="bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            Cliente sem Fidelidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tempo como cliente:</span>
              <Badge variant="outline">
                {monthsAsClient} {monthsAsClient === 1 ? 'mês' : 'meses'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxa de renovação histórica:</span>
              <Badge 
                variant="outline"
                className={
                  renewalRate >= 75
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : renewalRate >= 50
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }
              >
                {renewalRate.toFixed(0)}%
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              💡 Considere propor um contrato de fidelidade
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Clientes com fidelidade proporcionam previsibilidade de receita e maior segurança financeira para sua agência.
            </p>
          </div>

          {renewalRate < 50 && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠️ Atenção: Taxa de renovação baixa
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                Este cliente tem baixa probabilidade de renovação. Considere ações de retenção.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}
