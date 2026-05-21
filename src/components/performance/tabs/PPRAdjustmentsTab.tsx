import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerDemo } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { usePPRAdjustments } from "@/hooks/usePPRAdjustments";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props { period: BonusPeriod; isAdmin: boolean; }

const TYPES = [
  { value: "revenue_adjustment", label: "Receita extra", color: "bg-emerald-100 text-emerald-700" },
  { value: "expense_adjustment", label: "Despesa extra", color: "bg-red-100 text-red-700" },
  { value: "salary_adjustment", label: "Ajuste de salário", color: "bg-amber-100 text-amber-700" },
  { value: "manual_correction", label: "Correção manual", color: "bg-blue-100 text-blue-700" },
];

export function PPRAdjustmentsTab({ period, isAdmin }: Props) {
  const { list, create, remove } = usePPRAdjustments(period.id);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("revenue_adjustment");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<Date | undefined>();
  const [desc, setDesc] = useState("");

  const isClosed = period.status === "closed";

  const reset = () => { setType("revenue_adjustment"); setAmount(0); setDate(undefined); setDesc(""); };

  const handleSave = async () => {
    if (!date || amount === 0) return;
    const dateStr = date.toISOString().split("T")[0];
    await create.mutateAsync({
      period_id: period.id,
      adjustment_type: type,
      amount,
      effective_date: dateStr,
      description: desc || null,
    });
    setOpen(false); reset();
  };

  const inRange = (d: string) => d >= period.start_date && d <= period.end_date;

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Ajustes financeiros do período</h3>
            <p className="text-xs text-muted-foreground">
              Lançamentos manuais que entram no cálculo pela data de competência.
            </p>
          </div>
          {isAdmin && !isClosed && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo ajuste
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {(list.data || []).map((a) => {
            const t = TYPES.find((x) => x.value === a.adjustment_type);
            const ok = inRange(a.effective_date);
            return (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={t?.color}>{t?.label || a.adjustment_type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(a.effective_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    {!ok && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 gap-1">
                        <AlertTriangle className="h-3 w-3" /> fora do período
                      </Badge>
                    )}
                  </div>
                  {a.description && <p className="text-sm">{a.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold">{formatCurrency(a.amount)}</p>
                  {isAdmin && !isClosed && (
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {(!list.data || list.data.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum ajuste cadastrado.</p>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo ajuste</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Data de competência</Label>
              <DatePickerDemo date={date} onDateChange={setDate} placeholder="Selecione" />
              <p className="text-xs text-muted-foreground mt-1">
                Define em qual mês do período o ajuste é alocado (não usa a data de criação).
              </p>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!date || amount === 0 || create.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
