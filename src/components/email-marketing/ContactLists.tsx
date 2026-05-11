import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Users, 
  Plus, 
  RefreshCw 
} from "lucide-react";
import { ContactViewDialog } from "./ContactViewDialog";
import { SyncCRMDialog } from "./SyncCRMDialog";
import { ImportSendpulseDialog } from "@/components/email/ImportSendpulseDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactListsProps {
  addressBooks: any[];
  onRefresh: () => void;
}

export function ContactLists({ addressBooks, onRefresh }: ContactListsProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [newListName, setNewListName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenEdit = (book: any) => {
    setSelectedBook(book);
    setNewListName(book.name);
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (book: any) => {
    setSelectedBook(book);
    setDeleteDialogOpen(true);
  };

  const handleOpenView = (book: any) => {
    setSelectedBook(book);
    setViewDialogOpen(true);
  };

  const handleUpdateList = async () => {
    if (!selectedBook || !newListName) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { 
          action: 'update_addressbook', 
          book_id: selectedBook.id,
          name: newListName 
        }
      });
      if (error) throw error;
      toast.success("Lista renomeada com sucesso!");
      setEditDialogOpen(false);
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao renomear lista");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteList = async () => {
    if (!selectedBook) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { 
          action: 'delete_addressbook', 
          book_id: selectedBook.id 
        }
      });
      if (error) throw error;
      toast.success("Lista excluída com sucesso!");
      setDeleteDialogOpen(false);
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir lista");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'create_addressbook', name: newListName }
      });
      if (error) throw error;
      toast.success("Lista criada com sucesso!");
      setNewListName("");
      setCreateDialogOpen(false);
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar lista");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-medium">Suas Listas na SendPulse</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nova Lista
          </Button>
          
          <Button variant="outline" className="gap-2" onClick={() => setSyncDialogOpen(true)}>
            <RefreshCw className="h-4 w-4" /> Sincronizar do CRM
          </Button>

          <Button className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <Users className="h-4 w-4" /> Importar Planilha
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Lista</TableHead>
              <TableHead>Contatos</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addressBooks.length > 0 ? addressBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">{book.name}</TableCell>
                <TableCell>{book.all_email_count}</TableCell>
                <TableCell>{new Date(book.created).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleOpenView(book)}>
                        <Eye className="mr-2 h-4 w-4" /> Visualizar Contatos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(book)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar Nome
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a 
                          href={`https://login.sendpulse.com/addressbooks/emails/id/${book.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center w-full"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" /> Ver na SendPulse
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive" 
                        onClick={() => handleOpenDelete(book)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Apagar Lista
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma lista encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      <ContactViewDialog 
        open={viewDialogOpen} 
        onOpenChange={setViewDialogOpen}
        bookId={selectedBook?.id}
        bookName={selectedBook?.name || ""}
      />

      <SyncCRMDialog 
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        addressBooks={addressBooks}
        onSuccess={onRefresh}
      />

      <ImportSendpulseDialog 
        open={importDialogOpen} 
        onOpenChange={setImportDialogOpen} 
        addressBooks={addressBooks} 
        onSuccess={onRefresh} 
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome da Lista</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Novo Nome</Label>
            <Input 
              placeholder="Digite o novo nome..." 
              value={newListName} 
              onChange={(e) => setNewListName(e.target.value)} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateList} disabled={isProcessing || !newListName}>
              {isProcessing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Lista na SendPulse</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Nome da Lista</Label>
            <Input 
              placeholder="Ex: Leads VIP, Newsletter..." 
              value={newListName} 
              onChange={(e) => setNewListName(e.target.value)} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateList} disabled={isProcessing || !newListName}>
              {isProcessing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente a lista <strong>{selectedBook?.name}</strong> e todos os seus contatos da SendPulse. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteList();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Sim, apagar lista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
