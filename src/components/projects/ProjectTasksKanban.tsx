import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calendar } from "lucide-react";
import { ProjectTask, useProjects } from "@/hooks/useProjects";
import { format, parseISO, isPast } from "date-fns";

interface ProjectTasksKanbanProps {
  projectId: string;
  tasks: ProjectTask[];
}

const COLUMNS = [
  { id: "backlog", label: "Backlog", color: "bg-muted" },
  { id: "in_progress", label: "Em Andamento", color: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "review", label: "Em Revisão", color: "bg-yellow-50 dark:bg-yellow-900/20" },
  { id: "done", label: "Concluído", color: "bg-green-50 dark:bg-green-900/20" },
];

const PRIORITIES: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  medium: { label: "Média", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function ProjectTasksKanban({ projectId, tasks }: ProjectTasksKanbanProps) {
  const { createTask, updateTask, deleteTask } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("backlog");

  const openNewTask = (col: string) => {
    setEditTask(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setStatus(col);
    setDialogOpen(true);
  };

  const openEditTask = (task: ProjectTask) => {
    setEditTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setDueDate(task.due_date || "");
    setStatus(task.status);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      status,
      project_id: projectId,
    };
    if (editTask) {
      updateTask.mutate({ id: editTask.id, ...payload });
    } else {
      createTask.mutate(payload);
    }
    setDialogOpen(false);
  };


  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className={`rounded-lg p-3 ${col.color} min-h-[200px]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  {col.label} <span className="text-muted-foreground">({colTasks.length})</span>
                </h3>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openNewTask(col.id)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openEditTask(task)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={`text-[10px] ${PRIORITIES[task.priority]?.color}`}>
                          {PRIORITIES[task.priority]?.label}
                        </Badge>
                        {task.due_date && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${
                            isPast(parseISO(task.due_date)) && task.status !== "done"
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(task.due_date), "dd/MM")}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex justify-between pt-2">
              <div>
                {editTask && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteTask.mutate(editTask.id);
                      setDialogOpen(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!title.trim()}>Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
