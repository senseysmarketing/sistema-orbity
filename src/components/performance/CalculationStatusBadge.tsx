import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle } from "lucide-react";

interface Props {
  status: string; // not_calculated | calculated | stale | error
  calculatedAt: string | null;
  error: string | null;
}

export function CalculationStatusBadge({ status, calculatedAt, error }: Props) {
  const map: Record<string, { label: string; className: string }> = {
    not_calculated: { label: "Aguardando cálculo", className: "bg-muted text-muted-foreground" },
    calculated: { label: "Atualizado", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    stale: { label: "Desatualizado", className: "bg-amber-100 text-amber-700 border-amber-200" },
    error: { label: "Erro no cálculo", className: "bg-red-100 text-red-700 border-red-200" },
  };
  const m = map[status] || map.not_calculated;
  const dateText = calculatedAt ? format(parseISO(calculatedAt), "dd/MM HH:mm", { locale: ptBR }) : null;

  const badge = (
    <Badge variant="outline" className={`${m.className} gap-1`}>
      {status === "error" && <AlertCircle className="h-3 w-3" />}
      {m.label}
      {status === "calculated" && dateText && <span className="opacity-70">· {dateText}</span>}
    </Badge>
  );

  if (status === "error" && error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{error}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return badge;
}
