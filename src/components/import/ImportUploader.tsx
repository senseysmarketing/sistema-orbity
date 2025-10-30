import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ImportUploaderProps {
  onFileSelect: (file: File) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function ImportUploader({ onFileSelect, onCancel, isProcessing }: ImportUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
      }
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border-2 border-dashed transition-all",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30",
          isProcessing && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          {!selectedFile ? (
            <>
              <div className="mb-4 p-4 rounded-full bg-primary/10">
                <Upload className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Arraste seu arquivo aqui
              </h3>
              <p className="text-muted-foreground mb-6">
                ou clique no botão abaixo para selecionar
              </p>
              <div className="flex gap-3">
                <Button asChild variant="default">
                  <label className="cursor-pointer">
                    Selecionar Arquivo
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handleFileInput}
                      disabled={isProcessing}
                    />
                  </label>
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Formatos aceitos: .xlsx, .xls
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 p-4 rounded-full bg-green-500/10">
                <FileSpreadsheet className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Arquivo selecionado
              </h3>
              <div className="flex items-center gap-2 mb-6 p-3 bg-muted rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-2"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleUpload} disabled={isProcessing}>
                  {isProcessing ? "Processando..." : "Continuar"}
                </Button>
                <Button variant="outline" onClick={handleRemove} disabled={isProcessing}>
                  Trocar Arquivo
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isProcessing && (
        <div className="space-y-2">
          <Progress value={undefined} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            Processando arquivo...
          </p>
        </div>
      )}
    </div>
  );
}
