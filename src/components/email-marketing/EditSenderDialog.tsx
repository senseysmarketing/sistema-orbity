import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EditSenderDialogProps {
  sender: {
    email: string;
    name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditSenderDialog({ sender, open, onOpenChange, onSuccess }: EditSenderDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Update name when sender changes
  useState(() => {
    if (sender) setName(sender.name || "");
  });

  // Since we can't use useEffect easily with useState initialization like that in a clean way for this pattern:
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && sender) {
      setName(sender.name || "");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sender) return;
    if (!name.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sendpulse-api", {
        body: { 
          action: "update_sender", 
          sender_email: sender.email,
          name: name.trim()
        },
      });

      if (error) throw error;
      
      toast.success("Remetente atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating sender:", error);
      toast.error("Erro ao atualizar remetente", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Remetente</DialogTitle>
          <DialogDescription>
            Altere o nome exibido para este remetente. O e-mail não pode ser alterado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email">E-mail</Label>
            <Input
              id="edit-email"
              value={sender?.email || ""}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Remetente</Label>
            <Input
              id="edit-name"
              placeholder="Ex: Gabriel | Senseys"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
