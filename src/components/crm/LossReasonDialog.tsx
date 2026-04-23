import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

export const LOSS_REASONS: { category: string; reasons: { value: string; label: string }[] }[] = [
  {
    category: "Problemas de Qualificação",
    reasons: [
      { value: "dados_invalidos", label: "Dados inválidos / Fake" },
      { value: "nao_decisor", label: "Não é o decisor" },
      { value: "fora_icp", label: "Fora do Perfil (ICP)" },
    ],
  },
  {
    category: "Problemas de Engajamento",
    reasons: [
      { value: "ghosting", label: "Ghosting no WhatsApp" },
      { value: "no_show", label: "No-Show (Faltou na Reunião)" },
    ],
  },
  {
    category: "Problemas de Comunicação",
    reasons: [
      { value: "ghosting_whatsapp", label: "Ghosting no WhatsApp" },
    ],
  },
  {
    category: "Problemas Comerciais",
    reasons: [
      { value: "sem_orcamento", label: "Sem orçamento (Budget)" },
      { value: "concorrencia", label: "Optou pela concorrência" },
      { value: "sem_valor_percebido", label: "Não percebeu valor" },
    ],
  },
];

export const ALL_LOSS_REASONS: { value: string; label: string }[] = [
  ...LOSS_REASONS.flatMap((c) => c.reasons),
  { value: "outro", label: "Outro" },
];

export function getLossReasonLabel(value: string | null): string {
  if (!value) return "Não informado";
  const found = ALL_LOSS_REASONS.find((r) => r.value === value);
  return found?.label || value;
}

interface LossReasonDialogProps {
  open: boolean;
  leadName: string;
  onConfirm: (reason: string, notes?: string) => void;
  onCancel: () => void;
}

export function LossReasonDialog({ open, leadName, onConfirm, onCancel }: LossReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherNotes, setOtherNotes] = useState("");

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm(selectedReason, selectedReason === "outro" ? otherNotes : undefined);
    setSelectedReason("");
    setOtherNotes("");
  };

  const handleCancel = () => {
    setSelectedReason("");
    setOtherNotes("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Motivo da desqualificação
          </DialogTitle>
          <DialogDescription>
            Por que o lead <span className="font-semibold">{leadName}</span> está sendo desqualificado?
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-4">
          {LOSS_REASONS.map((category) => (
            <div key={category.category} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {category.category}
              </p>
              {category.reasons.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2 pl-1">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="cursor-pointer text-sm">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </div>
          ))}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outro</p>
            <div className="flex items-center space-x-2 pl-1">
              <RadioGroupItem value="outro" id="outro" />
              <Label htmlFor="outro" className="cursor-pointer text-sm">
                Outro motivo
              </Label>
            </div>
          </div>
        </RadioGroup>

        {selectedReason === "outro" && (
          <Textarea
            placeholder="Descreva o motivo..."
            value={otherNotes}
            onChange={(e) => setOtherNotes(e.target.value)}
            className="mt-2"
          />
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === "outro" && !otherNotes.trim())}
          >
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
