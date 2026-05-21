import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";
import { usePPRPeriodData } from "@/hooks/usePPRPeriodData";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props { period: BonusPeriod; }

export function PPRBonusTab({ period }: Props) {
  const { employeeResults, employees } = usePPRPeriodData(period.id, period.agency_id);
  const empMap = new Map((employees.data || []).map((e) => [e.id, e]));
  const rows = employeeResults.data || [];
  const total = rows.reduce((s, r) => s + r.bonus_amount, 0);

  const exportCsv = () => {
    const header = ["Colaborador", "Peso", "Score", "Base", "Bonus"].join(",");
    const lines = rows.map((r) => {
      const e = empMap.get(r.employee_id);
      return [
        `"${e?.name || r.employee_id}"`,
        r.eligibility_weight,
        r.score_final.toFixed(2),
        r.base_share.toFixed(2),
        r.bonus_amount.toFixed(2),
      ].join(",");
    });
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bonus-${period.label}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Distribuição do bônus</h3>
            <p className="text-xs text-muted-foreground">
              Snapshot do último cálculo. Edição bloqueada — recalcule para atualizar.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum resultado. Recalcule o período.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Bônus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const e = empMap.get(r.employee_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{e?.name || "Colaborador"}</TableCell>
                      <TableCell className="text-right">{r.eligibility_weight}</TableCell>
                      <TableCell className="text-right">{r.score_final.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.base_share)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(r.bonus_amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={4} className="font-semibold text-right">Total</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
