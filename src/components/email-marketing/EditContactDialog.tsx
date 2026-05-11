import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneBR } from "@/lib/phone-mask";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: number | null;
  contact: any;
  onSuccess: () => void;
}

export function EditContactDialog({ open, onOpenChange, bookId, contact, onSuccess }: EditContactDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (contact) {
      // SendPulse variables are usually in contact.variables or as top level keys depending on the endpoint
      // The get_contacts endpoint returns variables in a specific format
      const variables = contact.variables || [];
      const nameVar = variables.find((v: any) => v.name === 'Nome' || v.name === 'name')?.value || "";
      const phoneVar = variables.find((v: any) => v.name === 'Telefone' || v.name === 'phone' || v.name === 'Phone')?.value || "";
      
      setName(nameVar);
      setPhone(phoneVar);
    }
  }, [contact, open]);

  const handleUpdate = async () => {
    if (!bookId || !contact?.email) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: {
          action: 'update_contact',
          book_id: bookId,
          email: contact.email,
          variables: {
            Nome: name,
            Telefone: phone
          }
        }
      });

      if (error) throw error;

      toast.success("Contato atualizado com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar contato");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-email">E-mail (Apenas leitura)</Label>
            <Input
              id="edit-email"
              value={contact?.email || ""}
              readOnly
              className="bg-muted"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-phone">Telefone</Label>
            <Input
              id="edit-phone"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
              inputMode="tel"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={isProcessing}>
            {isProcessing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
