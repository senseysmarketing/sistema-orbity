import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";
import { usePPRMutations } from "@/hooks/usePPRMutations";

interface Props {
  period: BonusPeriod;
  isAdmin: boolean;
}

export function PPRActionsBar({ period, isAdmin }: Props) {
  const { recalculate, reopen } = usePPRMutations();
  const [reason, setReason] = useState("");
  const isClosed = period.status === "closed";

  const onRecalc = () => recalculate.mutate({ period_id: period.id, action: "recalculate" });
  const onClose = () => recalculate.mutate({ period_id: period.id, action: "close" });
  const onReopen = () => {
    if (!reason.trim()) return;
    reopen.mutate({ period_id: period.id, reason: reason.trim() });
    setReason("");
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      {!isClosed && (
        <>
          <Button
            variant={period.calculation_status === "stale" ? "default" : "outline"}
            size="sm"
            onClick={onRecalc}
            disabled={recalculate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? "animate-spin" : ""}`} />
            Recalcular
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Lock className="h-4 w-4 mr-2" />
                Fechar ciclo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Fechar período?</AlertDialogTitle>
                <AlertDialogDescription>
                  Após fechar, scorecards e ajustes ficam travados e o snapshot é congelado. Reabrir exige justificativa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onClose}>Fechar agora</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {isClosed && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Unlock className="h-4 w-4 mr-2" />
              Reabrir período
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reabrir período?</AlertDialogTitle>
              <AlertDialogDescription>
                Informe a justificativa. A ação ficará registrada na auditoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-3">
              <Label>Justificativa</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo da reabertura..." />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onReopen} disabled={!reason.trim() || reopen.isPending}>
                Reabrir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
