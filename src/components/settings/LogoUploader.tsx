import { useRef, useState } from "react";
import { Upload, Loader2, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogoUploaderProps {
  agencyId: string;
  currentLogoUrl?: string | null;
  onUploaded: (publicUrl: string | null) => void;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPT = "image/png,image/svg+xml,image/jpeg,image/webp";

export function LogoUploader({ agencyId, currentLogoUrl, onUploaded }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking same file later
    if (!file) return;

    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Formato inválido. Use PNG, SVG, JPG ou WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      // 1. Listar e apagar arquivos antigos (zero lixo no Storage)
      const { data: oldFiles } = await supabase.storage
        .from("agency-logos")
        .list(agencyId);

      if (oldFiles && oldFiles.length > 0) {
        await supabase.storage
          .from("agency-logos")
          .remove(oldFiles.map((f) => `${agencyId}/${f.name}`));
      }

      // 2. Upload com timestamp (cache-busting)
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${agencyId}/logo_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("agency-logos")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("agency-logos").getPublicUrl(path);
      onUploaded(data.publicUrl);
      toast.success("Logo atualizado!");
    } catch (err: any) {
      console.error("[LogoUploader]", err);
      toast.error(err?.message ?? "Falha ao enviar logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const { data: oldFiles } = await supabase.storage
        .from("agency-logos")
        .list(agencyId);

      if (oldFiles && oldFiles.length > 0) {
        await supabase.storage
          .from("agency-logos")
          .remove(oldFiles.map((f) => `${agencyId}/${f.name}`));
      }
      onUploaded(null);
      toast.success("Logo removido.");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao remover logo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
        {currentLogoUrl ? (
          <img
            src={currentLogoUrl}
            alt="Logo da agência"
            className="h-full w-full object-contain"
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFile}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePick}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {currentLogoUrl ? "Trocar logo" : "Enviar logo"}
          </Button>
          {currentLogoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, SVG, JPG ou WEBP · até 2MB
        </p>
      </div>
    </div>
  );
}
