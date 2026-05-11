import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: number | null;
  bookName: string;
}

export function ContactViewDialog({ open, onOpenChange, bookId, bookName }: ContactViewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    if (open && bookId) {
      fetchContacts();
    } else {
      setContacts([]);
    }
  }, [open, bookId]);

  async function fetchContacts() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'get_contacts', book_id: bookId }
      });
      if (error) throw error;
      setContacts(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar contatos");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return "Ativo";
      case 1: return "Cancelado";
      case 2: return "Inativo";
      default: return "Desconhecido";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Contatos: {bookName}
          </DialogTitle>
          <DialogDescription>
            Visualizando membros da lista na SendPulse.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando contatos...</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Inscrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length > 0 ? (
                    contacts.map((contact, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{contact.email}</TableCell>
                        <TableCell>{getStatusLabel(contact.status)}</TableCell>
                        <TableCell>{contact.add_time || contact.registration_date ? new Date(contact.add_time || contact.registration_date).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhum contato encontrado nesta lista.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
