import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, DollarSign, Building } from "lucide-react";

interface FloatingActionBarProps {
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  onNewClient: () => void;
  onNewExpense: () => void;
  onNewPayment: () => void;
}

export function FloatingActionBar({ selectedMonth, onChangeMonth, onNewClient, onNewExpense, onNewPayment }: FloatingActionBarProps) {
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
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return <SelectItem key={value} value={value}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
              })}
            </SelectContent>
          </Select>
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
