import { useState } from "react";
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
import InputMask from "react-input-mask";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: number | null;
  onSuccess: () => void;
}

export function AddContactDialog({ open, onOpenChange, bookId, onSuccess }: AddContactDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAdd = async () => {
    if (!bookId || !email) {
      toast.error("O e-mail é obrigatório");
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: {
          action: 'add_single_contact',
          book_id: bookId,
          email,
          variables: {
            Nome: name,
            Telefone: phone
          }
        }
      });

      if (error) throw error;

      toast.success("Contato adicionado com sucesso!");
      setEmail("");
      setName("");
      setPhone("");
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar contato");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Contato</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <InputMask
              mask="(99) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            >
              {(inputProps: any) => (
                <Input
                  {...inputProps}
                  id="phone"
                  placeholder="(00) 00000-0000"
                />
              )}
            </InputMask>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={isProcessing || !email}>
            {isProcessing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar Contato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
