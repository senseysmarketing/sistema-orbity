import { useState } from "react";
import { Upload, FileSpreadsheet, X, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";

interface ImportSendpulseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addressBooks: any[];
  onSuccess: () => void;
}

export function ImportSendpulseDialog({
  open,
  onOpenChange,
  addressBooks,
  onSuccess,
}: ImportSendpulseDialogProps) {
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDownloadTemplate = () => {
    const data = [
      ["name", "email"],
      ["João Silva", "joao@exemplo.com"],
      ["Maria Souza", "maria@exemplo.com"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "template_sendpulse.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedBook) {
      toast.error("Selecione uma lista e um arquivo");
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json<any>(worksheet);

      if (data.length === 0) {
        toast.error("O arquivo está vazio");
        return;
      }

      // Format for SendPulse: { email: string, variables: { name: string } }
      const emails = data.map((row: any) => ({
        email: row.email || row.Email || row.EMAIL,
        variables: {
          name: row.name || row.Name || row.NAME || row.nome || row.Nome || row.NOME || ""
        }
      })).filter(item => item.email);

      if (emails.length === 0) {
        toast.error("Nenhum e-mail válido encontrado no arquivo");
        return;
      }

      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: {
          action: 'add_emails',
          book_id: parseInt(selectedBook),
          emails: emails
        }
      });

      if (error) throw error;

      toast.success(`${emails.length} contatos importados com sucesso!`);
      onSuccess();
      onOpenChange(false);
      setFile(null);
      setSelectedBook("");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar contatos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar Contatos</DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel (.xlsx) para adicionar contatos à sua lista da SendPulse.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Lista de Destino</label>
            <Select onValueChange={setSelectedBook} value={selectedBook}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma lista..." />
              </SelectTrigger>
              <SelectContent>
                {addressBooks.map((book) => (
                  <SelectItem key={book.id} value={book.id.toString()}>
                    {book.name} ({book.all_email_count} contatos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Arquivo (.xlsx)</label>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 gap-1 text-xs"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-3 w-3" />
                Baixar Template
              </Button>
            </div>
            
            {!file ? (
              <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-3 bg-secondary/20">
                <div className="p-3 rounded-full bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Arraste seu arquivo</p>
                  <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
                </div>
                <Input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileChange}
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Selecionar Arquivo
                  </label>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {file.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !file || !selectedBook}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Iniciar Importação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

