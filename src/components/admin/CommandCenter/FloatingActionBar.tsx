import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, DollarSign, Building, Users, Bell } from "lucide-react";

interface FloatingActionBarProps {
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  onNewClient: () => void;
  onNewExpense: () => void;
  onNewPayment: () => void;
  onOpenPortfolio?: () => void;
  onOpenBillingRuler?: () => void;
  onOpenExpenseCentral?: () => void;
}

export function FloatingActionBar({ selectedMonth, onChangeMonth, onNewClient, onNewExpense, onNewPayment, onOpenPortfolio, onOpenBillingRuler, onOpenExpenseCentral }: FloatingActionBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 mb-4 lg:-mx-6 lg:px-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Centro de Comando</h1>
          <p className="text-sm md:text-base text-muted-foreground">Visão 360° financeira e operacional</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={onChangeMonth}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 15 }, (_, i) => {
                // Offsets: +3, +2, +1, 0, -1, -2, ... -11 (futures first, then current, then past)
                const offset = 3 - i;
                const date = new Date();
                date.setDate(1);
                date.setMonth(date.getMonth() + offset);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const rawLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
                const isFuture = offset > 0;
                return (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-1.5">
                      <span>{label}</span>
                      {isFuture && <span className="italic text-muted-foreground text-xs">(Previsão)</span>}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Management tools group */}
          {(onOpenPortfolio || onOpenBillingRuler || onOpenExpenseCentral) && (
            <div className="flex items-center gap-1.5 border-r border-border pr-2 mr-1">
              {onOpenPortfolio && (
                <Button size="sm" variant="outline" onClick={onOpenPortfolio} className="h-9">
                  <Users className="h-3.5 w-3.5 md:mr-1" />
                  <span className="hidden md:inline">Gerenciar Carteira</span>
                </Button>
              )}
              {onOpenBillingRuler && (
                <Button size="sm" variant="outline" onClick={onOpenBillingRuler} className="h-9">
                  <Bell className="h-3.5 w-3.5 md:mr-1" />
                  <span className="hidden md:inline">Régua de Cobrança</span>
                </Button>
              )}
              {onOpenExpenseCentral && (
                <Button size="sm" variant="outline" onClick={onOpenExpenseCentral} className="h-9">
                  <Receipt className="h-3.5 w-3.5 md:mr-1" />
                  <span className="hidden md:inline">Central de Despesas</span>
                </Button>
              )}
            </div>
          )}

          {/* Creation buttons */}
          <Button size="sm" variant="outline" onClick={onNewClient} className="h-9">
            <Building className="h-3.5 w-3.5 mr-1" /> Novo Cliente
          </Button>
          <Button size="sm" variant="outline" onClick={onNewExpense} className="h-9">
            <Receipt className="h-3.5 w-3.5 mr-1" /> Lançar Despesa
          </Button>
          <Button size="sm" variant="outline" onClick={onNewPayment} className="h-9">
            <DollarSign className="h-3.5 w-3.5 mr-1" /> Adicionar Receita
          </Button>
        </div>
      </div>
    </div>
  );
}
