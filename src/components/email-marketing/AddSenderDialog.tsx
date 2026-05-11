import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddSenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddSenderDialog({ open, onOpenChange, onSuccess }: AddSenderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { 
          action: 'add_sender', 
          name: formData.name, 
          sender_email: formData.email 
        }
      });

      if (error) throw error;

      toast.success("Remetente cadastrado!", {
        description: `A SendPulse enviou um link de confirmação para ${formData.email}. Acesse a caixa de entrada desse e-mail, clique no link para validar, e depois atualize esta página para o usar.`,
        duration: 10000,
      });

      onSuccess();
      onOpenChange(false);
      setFormData({ name: "", email: "" });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao cadastrar remetente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Novo Remetente</DialogTitle>
          <DialogDescription>
            Cadastre um novo e-mail para enviar suas campanhas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sender-name">Nome do Remetente</Label>
            <Input 
              id="sender-name"
              placeholder="Ex: João da Orbity" 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender-email">E-mail do Remetente</Label>
            <Input 
              id="sender-email"
              type="email"
              placeholder="Ex: joao@suaempresa.com" 
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar Remetente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
