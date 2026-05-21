import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePPRPeriodData, type PPRPeriodMonth } from "@/hooks/usePPRPeriodData";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props { period: BonusPeriod; }

type Cat = "client_payments" | "expenses" | "salaries" | "adjustments";
const CAT_LABEL: Record<Cat, string> = {
  client_payments: "Receita",
  expenses: "Despesas",
  salaries: "Salários",
  adjustments: "Ajustes",
};

export function PPRFinancialTab({ period }: Props) {
  const { months } = usePPRPeriodData(period.id, period.agency_id);
  const [drill, setDrill] = useState<{ month: PPRPeriodMonth; cat: Cat } | null>(null);

  if (!months.data || months.data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          {period.calculation_status === "not_calculated"
            ? "Período ainda não foi calculado. Use o botão Recalcular acima."
            : "Recalcule para ver os números atualizados."}
        </CardContent>
      </Card>
    );
  }

  const open = (m: PPRPeriodMonth, c: Cat) => setDrill({ month: m, cat: c });

  return (
    <>
      <Card>
        <CardContent className="pt-5 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Salários</TableHead>
                <TableHead className="text-right">Ajustes</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Pote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {format(parseISO(m.month_start), "MMM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right cursor-pointer hover:bg-muted/50" onClick={() => open(m, "client_payments")}>
                    {formatCurrency(m.revenue)}
                  </TableCell>
                  <TableCell className="text-right cursor-pointer hover:bg-muted/50" onClick={() => open(m, "expenses")}>
                    {formatCurrency(m.expenses)}
                  </TableCell>
                  <TableCell className="text-right cursor-pointer hover:bg-muted/50" onClick={() => open(m, "salaries")}>
                    {formatCurrency(m.salaries)}
                  </TableCell>
                  <TableCell className="text-right cursor-pointer hover:bg-muted/50" onClick={() => open(m, "adjustments")}>
                    {formatCurrency(m.adjustments)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${m.net_profit < 0 ? "text-red-600" : ""}`}>
                    {formatCurrency(m.net_profit)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-primary">{formatCurrency(m.bonus_pool)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {drill && (() => {
            const snap = (drill.month.source_snapshot || {}) as Record<string, any>;
            const cat = snap[drill.cat] || { count: 0, total: 0, items: [] };
            return (
              <>
                <SheetHeader>
                  <SheetTitle>
                    {CAT_LABEL[drill.cat]} — {format(parseISO(drill.month.month_start), "MMM/yyyy", { locale: ptBR })}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{cat.count} lançamento(s)</span>
                    <span className="font-bold">{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="border rounded-lg divide-y">
                    {(cat.items || []).map((it: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 text-sm">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground truncate max-w-[260px]">{it.id}</p>
                          <p className="text-xs">{it.date || "—"}{it.type ? ` · ${it.type}` : ""}</p>
                        </div>
                        <p className="font-medium">{formatCurrency(Number(it.amount || 0))}</p>
                      </div>
                    ))}
                    {(cat.items || []).length === 0 && (
                      <p className="text-sm text-muted-foreground p-4 text-center">Sem itens neste mês.</p>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </>
  );
}
