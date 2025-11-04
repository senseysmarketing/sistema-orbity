import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function FinancialMetricsHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-4 w-4" />
          Como os valores são calculados?
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="bottom" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">💰 Regime de Caixa (Principal)</h4>
            <p className="text-xs text-muted-foreground">
              Considera apenas valores que efetivamente entraram (pagos) ou saíram (pagos) do caixa.
              É o valor real disponível.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">📊 Regime de Competência (Previsto)</h4>
            <p className="text-xs text-muted-foreground">
              Considera todos os pagamentos e despesas do mês, independente se foram pagos.
              Útil para projeções.
            </p>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Importante:</strong> Pagamentos em atraso NÃO são contabilizados no lucro líquido real,
              pois o dinheiro ainda não entrou no caixa.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
