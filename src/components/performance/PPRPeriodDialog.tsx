import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerDemo } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { parseISO } from "date-fns";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  programId: string;
  period?: BonusPeriod | null;
  onSave: (input: any) => Promise<void> | void;
}

export function PPRPeriodDialog({ open, onOpenChange, mode, programId, period, onSave }: Props) {
  const { currentAgency } = useAgency();
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [profitTarget, setProfitTarget] = useState(50000);
  const [pprPercent, setPprPercent] = useState(10);
  const [poolMode, setPoolMode] = useState<"percent_of_profit" | "manual">("percent_of_profit");
  const [manualAmount, setManualAmount] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(period?.label || "");
    setStartDate(period?.start_date ? parseISO(period.start_date) : undefined);
    setEndDate(period?.end_date ? parseISO(period.end_date) : undefined);
    setProfitTarget(period?.profit_target ?? 50000);
    setPprPercent(period?.ppr_percent ?? 10);
    setPoolMode((period?.bonus_pool_mode as any) ?? "percent_of_profit");
    setManualAmount(period?.bonus_pool_manual_amount ?? 0);
  }, [open, period]);

  const isValid = label.trim() && startDate && endDate && startDate < endDate;

  const handleSave = async () => {
    if (!isValid || !currentAgency?.id) return;
    setChecking(true);
    try {
      // Overlap check via RPC if available; otherwise simple client query
      const start = startDate!.toISOString().split("T")[0];
      const end = endDate!.toISOString().split("T")[0];

      const { data: overlaps } = await supabase
        .from("bonus_periods")
        .select("id, label, start_date, end_date, status")
        .eq("agency_id", currentAgency.id)
        .neq("status", "closed")
        .lte("start_date", end)
        .gte("end_date", start);

      const conflicts = (overlaps || []).filter((p: any) => p.id !== period?.id);
      if (conflicts.length > 0) {
        toast.error(`Conflito: o período se sobrepõe a "${(conflicts[0] as any).label}".`);
        setChecking(false);
        return;
      }

      await onSave({
        program_id: programId,
        label: label.trim(),
        start_date: start,
        end_date: end,
        profit_target: profitTarget,
        ppr_percent: pprPercent,
        bonus_pool_mode: poolMode,
        bonus_pool_manual_amount: poolMode === "manual" ? manualAmount : null,
      });
      onOpenChange(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Período PPR" : "Editar Período"}</DialogTitle>
          <DialogDescription>
            A meta de lucro é referência de performance. O bônus é calculado sobre o lucro líquido e não é bloqueado caso a meta não seja atingida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do ciclo</Label>
            <Input placeholder="Ex: Q1 2026" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <DatePickerDemo date={startDate} onDateChange={setStartDate} placeholder="Início" />
            </div>
            <div>
              <Label>Fim</Label>
              <DatePickerDemo date={endDate} onDateChange={setEndDate} placeholder="Fim" />
            </div>
          </div>

          <div>
            <Label>Meta de lucro (referência) — R$</Label>
            <Input
              type="number"
              value={profitTarget}
              onChange={(e) => setProfitTarget(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Referência de performance. Não bloqueia o pagamento do bônus.
            </p>
          </div>

          <div>
            <Label>Modelo do pote</Label>
            <RadioGroup value={poolMode} onValueChange={(v) => setPoolMode(v as any)} className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="percent_of_profit" id="m1" />
                <Label htmlFor="m1" className="font-normal cursor-pointer">% do lucro líquido</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual" id="m2" />
                <Label htmlFor="m2" className="font-normal cursor-pointer">Valor fixo manual</Label>
              </div>
            </RadioGroup>
          </div>

          {poolMode === "percent_of_profit" && (
            <div>
              <Label>% PPR sobre o lucro: {pprPercent}%</Label>
              <Slider
                value={[pprPercent]}
                onValueChange={(v) => setPprPercent(v[0])}
                min={0}
                max={50}
                step={0.5}
                className="mt-2"
              />
            </div>
          )}

          {poolMode === "manual" && (
            <div>
              <Label>Valor do pote (R$)</Label>
              <Input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isValid || checking}>
            {mode === "create" ? "Criar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
