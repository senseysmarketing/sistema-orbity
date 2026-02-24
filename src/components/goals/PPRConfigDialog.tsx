import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PPRConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: {
    revenue_target: number;
    bonus_pool_percent: number;
    nps_target: number;
  };
  onSave: (updates: Record<string, number>) => void;
}

export function PPRConfigDialog({ open, onOpenChange, period, onSave }: PPRConfigDialogProps) {
  const [revenueTarget, setRevenueTarget] = useState(period.revenue_target);
  const [poolPercent, setPoolPercent] = useState(period.bonus_pool_percent);
  const [npsTarget, setNpsTarget] = useState(period.nps_target);

  const handleSave = () => {
    onSave({
      revenue_target: revenueTarget,
      bonus_pool_percent: poolPercent,
      nps_target: npsTarget,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do Período</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Meta de Faturamento Recorrente (R$)</Label>
            <Input
              type="number"
              value={revenueTarget}
              onChange={(e) => setRevenueTarget(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>% do Lucro para o Pool</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={poolPercent}
              onChange={(e) => setPoolPercent(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Meta de NPS</Label>
            <Input
              type="number"
              min={-100}
              max={100}
              value={npsTarget}
              onChange={(e) => setNpsTarget(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
