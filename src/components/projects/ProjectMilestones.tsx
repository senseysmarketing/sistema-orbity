import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { ProjectMilestone, useProjects } from "@/hooks/useProjects";
import { format, parseISO } from "date-fns";

interface ProjectMilestonesProps {
  projectId: string;
  milestones: ProjectMilestone[];
}

export function ProjectMilestones({ projectId, milestones }: ProjectMilestonesProps) {
  const { createMilestone, updateMilestone, deleteMilestone } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!title.trim()) return;
    createMilestone.mutate({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      sort_order: milestones.length,
    });
    setDialogOpen(false);
    setTitle("");
    setDueDate("");
    setDescription("");
  };

  const toggleComplete = (m: ProjectMilestone) => {
    updateMilestone.mutate({
      id: m.id,
      completed_at: m.completed_at ? null : new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">
          Marcos ({milestones.filter((m) => m.completed_at).length}/{milestones.length})
        </h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum marco cadastrado</p>
      ) : (
        <div className="relative pl-6 space-y-6">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

          {milestones.map((m, i) => (
            <div key={m.id} className="relative flex gap-4 items-start">
              <button
                onClick={() => toggleComplete(m)}
                className="absolute -left-6 mt-0.5 z-10 bg-background"
              >
                {m.completed_at ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 ml-2">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${m.completed_at ? "line-through text-muted-foreground" : ""}`}>
                    {m.title}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => deleteMilestone.mutate(m.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                {m.due_date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Prazo: {format(parseISO(m.due_date), "dd/MM/yyyy")}
                  </p>
                )}
                {m.completed_at && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Concluído em {format(parseISO(m.completed_at), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Marco</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!title.trim()}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
