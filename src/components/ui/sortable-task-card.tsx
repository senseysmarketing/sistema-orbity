import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { TaskAssignedUsers } from "@/components/tasks/TaskAssignedUsers";

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'em_revisao' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  client_id: string | null;
  due_date: string | null;
  created_at: string;
  created_by: string;
}

interface SortableTaskCardProps {
  task: Task;
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  getUrgencyLevel: (task: Task) => { level: string; label: string; color: string };
  getAssignedUserName: (userId: string | null) => string;
  getClientName: (clientId: string | null) => string;
  formatDateBR: (date: string | null) => string;
  assignedUsers?: any[];
}

export function SortableTaskCard({
  task,
  onViewDetails,
  onEdit,
  onDelete,
  getPriorityColor,
  getPriorityLabel,
  getUrgencyLevel,
  getAssignedUserName,
  getClientName,
  formatDateBR,
  assignedUsers = [],
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? '1.05' : '1',
    zIndex: isDragging ? 999 : 1,
  };

  const urgency = getUrgencyLevel(task);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        isDragging 
          ? 'shadow-2xl border-primary/50 bg-background/95 rotate-3' 
          : 'hover:shadow-lg hover:scale-[1.02] hover:border-border/50'
      }`}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onViewDetails(task)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive" 
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex gap-1 flex-wrap">
            <Badge className={getPriorityColor(task.priority)} variant="secondary">
              {getPriorityLabel(task.priority)}
            </Badge>
            <Badge className={urgency.color} variant="secondary">
              {urgency.label}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <TaskAssignedUsers users={assignedUsers} maxDisplay={2} size="sm" />
            <div>🏢 {getClientName(task.client_id)}</div>
            {task.due_date && <div>📅 {formatDateBR(task.due_date)}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}