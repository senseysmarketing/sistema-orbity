import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { TaskTemplateForm } from "./TaskTemplateForm";
import { useTaskTemplates, TaskTemplate, TaskTemplateFormData } from "@/hooks/useTaskTemplates";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  FileText, 
  CheckSquare,
  BarChart3
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function TaskTemplateManager() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useTaskTemplates();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TaskTemplate | null>(null);

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: TaskTemplateFormData) => {
    const result = await createTemplate(data);
    if (result) {
      setShowForm(false);
    }
    return result;
  };

  const handleUpdate = async (data: TaskTemplateFormData) => {
    if (!editingTemplate) return false;
    const result = await updateTemplate(editingTemplate.id, data);
    if (result) {
      setEditingTemplate(null);
    }
    return result;
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    await deleteTemplate(deletingTemplate.id);
    setDeletingTemplate(null);
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      low: { label: "Baixa", variant: "secondary" },
      medium: { label: "Média", variant: "default" },
      high: { label: "Alta", variant: "destructive" },
    };
    const { label, variant } = config[priority] || config.medium;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? "Tente ajustar sua busca"
              : "Crie seu primeiro template de tarefa para agilizar a criação de tarefas repetitivas"}
          </p>
          {!search && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Template
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.category && (
                        <Badge variant="outline" className="mt-1">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                )}

                {template.default_title && (
                  <div className="text-sm">
                    <span className="font-medium">Título: </span>
                    <span className="text-muted-foreground">{template.default_title}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {getPriorityBadge(template.default_priority)}

                  {template.subtasks && template.subtasks.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <CheckSquare className="h-3 w-3" />
                      {template.subtasks.length} subtarefas
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                  <BarChart3 className="h-3 w-3" />
                  Usado {template.usage_count} {template.usage_count === 1 ? "vez" : "vezes"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Template de Tarefa</DialogTitle>
          </DialogHeader>
          <TaskTemplateForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
          </DialogHeader>
          <TaskTemplateForm
            template={editingTemplate}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTemplate(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o template "{deletingTemplate?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
