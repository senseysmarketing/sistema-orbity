import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Image,
  Video,
  File,
  ExternalLink,
  Download,
  Folder,
  Upload,
  Trash2,
  Loader2,
  FileArchive,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ClientFilesProps {
  clientId: string;
}

const FILE_CATEGORIES = [
  { value: "contract", label: "Contrato" },
  { value: "document", label: "Documento" },
  { value: "briefing", label: "Briefing" },
  { value: "report", label: "Relatório" },
  { value: "other", label: "Outros" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image")) return Image;
  if (fileType.startsWith("video")) return Video;
  if (fileType.includes("pdf")) return FileText;
  if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType.includes("csv")) return FileSpreadsheet;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return Presentation;
  if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("7z")) return FileArchive;
  if (fileType.includes("document") || fileType.includes("word")) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ClientFiles({ clientId }: ClientFilesProps) {
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: files, isLoading } = useQuery({
    queryKey: ["client-files", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_files")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !currentAgency?.id || !user?.id) {
        throw new Error("Dados inválidos para upload");
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        throw new Error("O arquivo excede o limite de 10MB");
      }

      // Upload to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${currentAgency.id}/${clientId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("client-files")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("client-files")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from("client_files").insert({
        agency_id: currentAgency.id,
        client_id: clientId,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        file_url: urlData.publicUrl,
        category,
        description: description || null,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Arquivo enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client-files", clientId] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar arquivo");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const file = files?.find((f) => f.id === fileId);
      if (!file) throw new Error("Arquivo não encontrado");

      // Extract file path from URL
      const urlParts = file.file_url.split("/client-files/");
      if (urlParts[1]) {
        await supabase.storage.from("client-files").remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from("client_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client-files", clientId] });
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir arquivo");
    },
  });

  const resetForm = () => {
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setCategory("other");
    setDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("O arquivo excede o limite de 10MB");
        return;
      }
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    uploadMutation.mutate(undefined, {
      onSettled: () => setIsUploading(false),
    });
  };

  const handleDeleteClick = (fileId: string) => {
    setFileToDelete(fileId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete);
    }
  };

  const totalSize = files?.reduce((acc, f) => acc + (f.file_size || 0), 0) || 0;
  const imageCount = files?.filter((f) => f.file_type?.startsWith("image")).length || 0;
  const docCount = files?.filter((f) => !f.file_type?.startsWith("image")).length || 0;

  return (
    <div className="space-y-6">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Arquivos do Cliente</h3>
          <p className="text-sm text-muted-foreground">
            Contratos, briefings, documentos e outros arquivos importantes
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="*/*"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Enviar Arquivo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Folder className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{files?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total de arquivos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
              <Image className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{imageCount}</p>
              <p className="text-sm text-muted-foreground">Imagens</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{docCount}</p>
              <p className="text-sm text-muted-foreground">Documentos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
              <p className="text-sm text-muted-foreground">Tamanho total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Arquivos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />
              ))}
            </div>
          ) : !files?.length ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum arquivo enviado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Enviar Arquivo" para adicionar documentos (máx. 10MB)
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Enviar primeiro arquivo
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.file_type || "");
                const isImage = file.file_type?.startsWith("image");
                const categoryLabel =
                  FILE_CATEGORIES.find((c) => c.value === file.category)?.label || "Outros";

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    {isImage ? (
                      <img
                        src={file.file_url}
                        alt={file.file_name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <FileIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{file.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(file.created_at!), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {categoryLabel}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Abrir"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteClick(file.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Arquivo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <File className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma descrição para o arquivo..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}