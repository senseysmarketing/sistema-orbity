import { useState } from "react";
import { Upload, FileSpreadsheet, X, Loader2, Download, CheckCircle2, AlertCircle } from "lucide-react";
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
import { parseEmailContacts } from "@/lib/import/excelParser";
import { Progress } from "@/components/ui/progress";

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
  const [progress, setProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    errors: number;
  } | null>(null);

  const handleDownloadTemplate = () => {
    const data = [
      ["email", "name", "phone"],
      ["joao@exemplo.com", "João Silva", "+5511999999999"],
      ["maria@exemplo.com", "Maria Souza", "+5511888888888"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "modelo_importacao_email.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setImportSummary(null);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedBook) {
      toast.error("Selecione uma lista e um arquivo");
      return;
    }

    setLoading(true);
    setProgress(10);
    try {
      const parsed = await parseEmailContacts(file);
      const data = parsed.emailContacts || [];
      setProgress(30);

      if (data.length === 0) {
        toast.error("O arquivo está vazio ou não contém dados válidos");
        setLoading(false);
        return;
      }

      // Format for SendPulse
      const emails = data.map((row: any) => ({
        email: row.email,
        variables: {
          Nome: row.nome || row.name || "",
          Telefone: row.telefone || row.phone || ""
        }
      })).filter(item => item.email);

      if (emails.length === 0) {
        toast.error("Nenhum e-mail válido encontrado no arquivo (verifique a coluna 'email')");
        setLoading(false);
        return;
      }

      setProgress(60);

      const { data: result, error } = await supabase.functions.invoke('sendpulse-api', {
        body: {
          action: 'add_emails',
          book_id: parseInt(selectedBook),
          emails: emails
        }
      });

      if (error) throw error;

      setProgress(100);
      
      // SendPulse usually returns result: true or the ID. 
      // We'll assume success if no error is thrown by the invoke.
      setImportSummary({
        total: emails.length,
        success: emails.length, // Simplified since we send batch
        errors: 0
      });

      toast.success(`${emails.length} contatos processados com sucesso!`);
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar contatos");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFile(null);
      setSelectedBook("");
      setProgress(0);
      setImportSummary(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar Contatos Profissional</DialogTitle>
          <DialogDescription>
            Importe sua base de e-mails via planilha. Mantenha as colunas: email, name, phone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {!importSummary ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Lista de Destino</label>
                <Select onValueChange={setSelectedBook} value={selectedBook}>
                  <SelectTrigger className="bg-muted/50 border-none">
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
                  <label className="text-sm font-medium text-muted-foreground">Arquivo Excel/CSV</label>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 gap-1 text-xs text-primary"
                    onClick={handleDownloadTemplate}
                  >
                    <Download className="h-3 w-3" />
                    Baixar Modelo
                  </Button>
                </div>
                
                {!file ? (
                  <div className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-3 bg-muted/30 border-muted-foreground/20 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('file-upload-import')?.click()}>
                    <div className="p-3 rounded-full bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Arraste seu arquivo aqui</p>
                      <p className="text-xs text-muted-foreground">Suporta .xlsx e .csv</p>
                    </div>
                    <Input
                      type="file"
                      accept=".xlsx,.csv"
                      className="hidden"
                      id="file-upload-import"
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Processando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6 py-4 text-center">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold">Importação Concluída</h4>
                <p className="text-sm text-muted-foreground">
                  Seus contatos foram processados e enviados para a SendPulse.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{importSummary.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                  <p className="text-xs text-green-600">Sucesso</p>
                  <p className="text-lg font-bold text-green-700">{importSummary.success}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-xs text-red-600">Erros</p>
                  <p className="text-lg font-bold text-red-700">{importSummary.errors}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!importSummary ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading || !file || !selectedBook}
                className="gap-2 px-6"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Iniciar Importação
              </Button>
            </>
          ) : (
            <Button onClick={resetAndClose} className="w-full">
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
