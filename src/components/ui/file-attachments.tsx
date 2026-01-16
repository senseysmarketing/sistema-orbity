import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  File,
  Loader2,
  Download,
  Paperclip
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploaded_at: string;
  uploaded_by?: string;
}

interface FileAttachmentsProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  bucket: "task-attachments" | "post-attachments";
  entityId?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

const ALLOWED_TYPES = [
  // Imagens
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documentos
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx"];

export function FileAttachments({
  attachments,
  onChange,
  bucket,
  entityId,
  maxFiles = 5,
  maxSizeMB = 5,
  disabled = false,
  className,
}: FileAttachmentsProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (type.includes("pdf")) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (type.includes("word") || type.includes("document")) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    }
    if (type.includes("excel") || type.includes("spreadsheet")) {
      return <FileText className="h-4 w-4 text-green-500" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    // Verificar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
        return `Tipo de arquivo não permitido. Use: ${ALLOWED_EXTENSIONS.join(", ")}`;
      }
    }

    // Verificar tamanho
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `Arquivo muito grande. Máximo: ${maxSizeMB}MB`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer upload.",
        variant: "destructive",
      });
      return null;
    }

    // Gerar nome único
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = file.name.split(".").pop();
    const fileName = `${entityId || "temp"}/${timestamp}-${randomId}.${extension}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      id: `${timestamp}-${randomId}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: urlData.publicUrl,
      uploaded_at: new Date().toISOString(),
      uploaded_by: user.id,
    };
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Verificar limite de arquivos
    if (attachments.length + fileArray.length > maxFiles) {
      toast({
        title: "Limite excedido",
        description: `Máximo de ${maxFiles} arquivos permitidos.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Erro no arquivo",
          description: `${file.name}: ${error}`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const attachment = await uploadFile(file);
        if (attachment) {
          newAttachments.push(attachment);
        }
      } catch (err: any) {
        toast({
          title: "Erro no upload",
          description: `Falha ao enviar ${file.name}: ${err.message}`,
          variant: "destructive",
        });
      }
    }

    if (newAttachments.length > 0) {
      onChange([...attachments, ...newAttachments]);
      toast({
        title: "Upload concluído",
        description: `${newAttachments.length} arquivo(s) enviado(s) com sucesso.`,
      });
    }

    setUploading(false);
  }, [attachments, maxFiles, bucket, entityId, onChange, toast]);

  const handleRemove = async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);
    if (!attachment) return;

    // Remover do storage
    try {
      const path = attachment.url.split(`${bucket}/`)[1];
      if (path) {
        await supabase.storage.from(bucket).remove([path]);
      }
    } catch (err) {
      console.error("Error removing file from storage:", err);
    }

    // Atualizar lista
    onChange(attachments.filter(a => a.id !== attachmentId));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, uploading, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragOver(true);
    }
  }, [disabled, uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50",
        )}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled || uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Enviando arquivos...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">Arraste arquivos ou clique para selecionar</span>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo {maxFiles} arquivos, {maxSizeMB}MB cada. 
                Formatos: imagens, PDF, Word, Excel
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de anexos */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            <span>Anexos ({attachments.length}/{maxFiles})</span>
          </div>
          
          {/* Grid de imagens */}
          {attachments.filter(a => isImage(a.type)).length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {attachments
                .filter(a => isImage(a.type))
                .map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white/20 rounded-full hover:bg-white/30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-4 w-4 text-white" />
                      </a>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(attachment.id);
                          }}
                          className="p-1.5 bg-white/20 rounded-full hover:bg-red-500/80"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Lista de documentos */}
          {attachments.filter(a => !isImage(a.type)).length > 0 && (
            <div className="space-y-1">
              {attachments
                .filter(a => !isImage(a.type))
                .map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group"
                  >
                    {getFileIcon(attachment.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => handleRemove(attachment.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente para exibição somente leitura dos anexos
interface AttachmentsDisplayProps {
  attachments: Attachment[];
  className?: string;
}

export function AttachmentsDisplay({ attachments, className }: AttachmentsDisplayProps) {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (type.includes("pdf")) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (type.includes("word") || type.includes("document")) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    }
    if (type.includes("excel") || type.includes("spreadsheet")) {
      return <FileText className="h-4 w-4 text-green-500" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string) => type.startsWith("image/");
  const images = attachments.filter(a => isImage(a.type));
  const documents = attachments.filter(a => !isImage(a.type));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span>Anexos ({attachments.length})</span>
      </div>

      {/* Grid de imagens */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
            >
              <img
                src={attachment.url}
                alt={attachment.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Download className="h-6 w-6 text-white" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Lista de documentos */}
      {documents.length > 0 && (
        <div className="space-y-1">
          {documents.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              {getFileIcon(attachment.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
