import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    sender_name: string;
    sender_email: string;
    subject: string;
    body: string;
  };
}

export function TestEmailDialog({ open, onOpenChange, campaign }: TestEmailDialogProps) {
  const [targetEmail, setTargetEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendTest = async () => {
    if (!targetEmail) {
      toast.error("Por favor, insira o e-mail de destino");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: {
          action: 'send_test_email',
          ...campaign,
          target_email: targetEmail
        }
      });

      if (error) throw error;

      toast.success("E-mail de teste enviado com sucesso!");
      onOpenChange(false);
      setTargetEmail("");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao enviar e-mail de teste");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Enviar E-mail de Teste
          </DialogTitle>
          <DialogDescription>
            Envie este rascunho para um e-mail específico para validar o layout e assunto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target_email">E-mail de Destino</Label>
            <Input
              id="target_email"
              placeholder="seu-email@exemplo.com"
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSendTest} disabled={sending || !targetEmail}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar Teste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
