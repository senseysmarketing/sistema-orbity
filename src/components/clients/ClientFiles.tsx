import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image, Video, File, ExternalLink, Download, Folder, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientFilesProps {
  clientId: string;
}

const FILE_TYPE_ICONS: Record<string, any> = {
  image: Image,
  video: Video,
  document: FileText,
  default: File,
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image")) return FILE_TYPE_ICONS.image;
  if (fileType.startsWith("video")) return FILE_TYPE_ICONS.video;
  if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("word")) {
    return FILE_TYPE_ICONS.document;
  }
  return FILE_TYPE_ICONS.default;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ClientFiles({ clientId }: ClientFilesProps) {
  const { data: files, isLoading } = useQuery({
    queryKey: ["client-files", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_library")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const favoriteFiles = files?.filter((f) => f.is_favorite) || [];
  const regularFiles = files?.filter((f) => !f.is_favorite) || [];

  const totalSize = files?.reduce((acc, f) => acc + (f.file_size || 0), 0) || 0;
  const imageCount = files?.filter((f) => f.file_type.startsWith("image")).length || 0;
  const videoCount = files?.filter((f) => f.file_type.startsWith("video")).length || 0;
  const docCount = files?.filter((f) => !f.file_type.startsWith("image") && !f.file_type.startsWith("video")).length || 0;

  return (
    <div className="space-y-6">
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
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{videoCount}</p>
              <p className="text-sm text-muted-foreground">Vídeos</p>
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
      </div>

      {/* Favorite Files */}
      {favoriteFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              Favoritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {favoriteFiles.map((file) => {
                const FileIcon = getFileIcon(file.file_type);
                const isImage = file.file_type.startsWith("image");

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
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
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </p>
                    </div>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Biblioteca de Conteúdo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />
              ))}
            </div>
          ) : !files?.length ? (
            <div className="text-center py-8">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum arquivo na biblioteca</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os arquivos adicionados na área de Social Media aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {regularFiles.map((file) => {
                const FileIcon = getFileIcon(file.file_type);
                const isImage = file.file_type.startsWith("image");

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
                        <span>{format(new Date(file.created_at!), "dd/MM/yy", { locale: ptBR })}</span>
                      </div>
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {file.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
