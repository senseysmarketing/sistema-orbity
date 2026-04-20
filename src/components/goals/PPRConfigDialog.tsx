import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerDemo } from "@/components/ui/date-picker";
import { Trash2 } from "lucide-react";
import { parseISO } from "date-fns";

interface PPRConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  period?: {
    label: string;
    start_date: string;
    end_date: string;
    revenue_target: number;
    bonus_pool_percent: number;
    nps_target: number;
    min_nps_target?: number;
  };
  onSave: (updates: Record<string, unknown>) => void;
  onDelete?: () => void;
}

export function PPRConfigDialog({ open, onOpenChange, mode, period, onSave, onDelete }: PPRConfigDialogProps) {
  const [label, setLabel] = useState(period?.label || "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    period?.start_date ? parseISO(period.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    period?.end_date ? parseISO(period.end_date) : undefined
  );
  const [revenueTarget, setRevenueTarget] = useState(period?.revenue_target || 50000);
  const [poolPercent] = useState(period?.bonus_pool_percent || 10);
  const [minNpsTarget, setMinNpsTarget] = useState<number>(period?.min_nps_target ?? 8.0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    if (!label.trim() || !startDate || !endDate) return;
    onSave({
      label: label.trim(),
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      revenue_target: revenueTarget,
      bonus_pool_percent: poolPercent,
      nps_target: period?.nps_target ?? 60, // legado preservado
      min_nps_target: minNpsTarget,
    });
    onOpenChange(false);
  };

  const isValid = label.trim() && startDate && endDate && startDate < endDate;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Criar Novo Ciclo" : "Editar Ciclo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Ciclo</Label>
              <Input
                placeholder="Ex: Q1 2026, Sprint Inverno"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data Início</Label>
                <DatePickerDemo
                  date={startDate}
                  onDateChange={setStartDate}
                  placeholder="Início"
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <DatePickerDemo
                  date={endDate}
                  onDateChange={setEndDate}
                  placeholder="Fim"
                />
              </div>
            </div>
            <div>
              <Label>Meta de Faturamento (R$)</Label>
              <Input
                type="number"
                value={revenueTarget}
                onChange={(e) => setRevenueTarget(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Nota Mínima Média (0–10)</Label>
              <Input
                type="number"
                step={0.1}
                min={0}
                max={10}
                value={minNpsTarget}
                onChange={(e) => setMinNpsTarget(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Média mínima de satisfação esperada para liberação do bônus do ciclo.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {mode === "edit" && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="mr-auto"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              {mode === "create" ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ciclo?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as respostas NPS e scorecards associados a este ciclo serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDeleteConfirm(false);
                onOpenChange(false);
                onDelete?.();
              }}
            >
              Excluir Ciclo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
