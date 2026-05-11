import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Pencil, Trash2, RefreshCw } from "lucide-react";
import { EditContactDialog } from "./EditContactDialog";
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handleDeleteContact = async () => {
    if (!bookId || !selectedContact) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { 
          action: 'delete_contact', 
          book_id: bookId, 
          email: selectedContact.email 
        }
      });
      
      if (error) throw error;
      
      toast.success("Contato removido com sucesso!");
      // Feedback instantâneo local
      setContacts(prev => prev.filter(c => c.email !== selectedContact.email));
      setDeleteDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir contato");
    } finally {
      setIsUpdating(false);
    }
  };

  const openEdit = (contact: any) => {
    setSelectedContact(contact);
    setEditDialogOpen(true);
  };

  const openDelete = (contact: any) => {
    setSelectedContact(contact);
    setDeleteDialogOpen(true);
  };

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

      <EditContactDialog 
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        bookId={bookId}
        contact={selectedContact}
        onSuccess={fetchContacts}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover <strong>{selectedContact?.email}</strong> desta lista. Esta ação não pode ser desfeita na SendPulse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteContact();
              }}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Contato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
