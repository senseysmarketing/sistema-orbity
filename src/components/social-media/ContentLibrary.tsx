import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function ContentLibrary() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Biblioteca de Conteúdo</h2>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload de Arquivos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A biblioteca de conteúdo permitirá upload, organização e reutilização de artes e materiais.
            Esta funcionalidade será implementada em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
