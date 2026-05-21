import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props {
  periods: BonusPeriod[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PPRPeriodSelector({ periods, selectedId, onSelect }: Props) {
  return (
    <Select value={selectedId ?? ""} onValueChange={onSelect}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Selecione um período" />
      </SelectTrigger>
      <SelectContent>
        {periods.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <div className="flex items-center gap-2">
              <span>{p.label}</span>
              <span className="text-xs text-muted-foreground">
                {format(parseISO(p.start_date), "dd/MM/yy", { locale: ptBR })}–
                {format(parseISO(p.end_date), "dd/MM/yy", { locale: ptBR })}
              </span>
              {p.status === "closed" && (
                <Badge variant="secondary" className="text-[10px] h-4">Fechado</Badge>
              )}
            </div>
          </SelectItem>
        ))}
        {periods.length === 0 && (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            Nenhum período cadastrado
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
