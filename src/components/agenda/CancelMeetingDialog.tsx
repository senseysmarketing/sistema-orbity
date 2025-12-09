import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMeetings } from "@/hooks/useMeetings";
import { toast } from "sonner";

interface CancelMeetingDialogProps {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

export const CancelMeetingDialog = ({
  meetingId,
  open,
  onOpenChange,
  onCancelled,
}: CancelMeetingDialogProps) => {
  const [reason, setReason] = useState("");
  const { updateMeeting } = useMeetings();

  const handleCancel = async () => {
    await updateMeeting.mutateAsync({
      id: meetingId,
      status: "cancelled",
      cancelled_reason: reason || undefined,
    });
    toast.success("Reunião cancelada");
    setReason("");
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar reunião?</AlertDialogTitle>
          <AlertDialogDescription>
            A reunião será marcada como cancelada. Você pode informar o motivo abaixo (opcional).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Motivo do cancelamento</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Cliente remarcou para próxima semana..."
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleCancel}>
            Cancelar Reunião
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
