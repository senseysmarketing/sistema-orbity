import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function TaskStatusManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Colunas do Kanban</CardTitle>
        <CardDescription>
          Personalize os status das tarefas e ordem de exibição
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">
              Funcionalidade em desenvolvimento
            </p>
            <p className="text-sm text-muted-foreground">
              A personalização de colunas do Kanban estará disponível em breve. 
              Atualmente, você pode usar as 4 colunas padrão: A Fazer, Em Andamento, Em Revisão e Concluída.
            </p>
          </div>
        </div>

        {/* Visualização dos status atuais */}
        <div className="mt-6 space-y-3">
          <h3 className="font-medium text-sm">Status Atuais</h3>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <div className="flex-1">
                <p className="font-medium">A Fazer</p>
                <p className="text-xs text-muted-foreground">todo</p>
              </div>
              <span className="text-xs text-muted-foreground px-2">Padrão</span>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div className="flex-1">
                <p className="font-medium">Em Andamento</p>
                <p className="text-xs text-muted-foreground">in_progress</p>
              </div>
              <span className="text-xs text-muted-foreground px-2">Padrão</span>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <div className="flex-1">
                <p className="font-medium">Em Revisão</p>
                <p className="text-xs text-muted-foreground">em_revisao</p>
              </div>
              <span className="text-xs text-muted-foreground px-2">Padrão</span>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="flex-1">
                <p className="font-medium">Concluída</p>
                <p className="text-xs text-muted-foreground">done</p>
              </div>
              <span className="text-xs text-muted-foreground px-2">Padrão</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}