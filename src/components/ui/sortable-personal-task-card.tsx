import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, User, Building, Calendar } from "lucide-react";

interface PersonalTask {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: 'pending' | 'today' | 'overdue' | 'done';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  is_routine: boolean;
  due_date: string | null;
  client_id: string | null;
  created_at: string;
  user_id: string;
}

interface SortablePersonalTaskCardProps {
  task: PersonalTask;
  onViewDetails: (task: PersonalTask) => void;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  getUrgencyLevel: (task: PersonalTask) => { level: string; label: string; color: string };
  getClientName: (clientId: string | null) => string | null;
  formatDateBR: (date: string | null) => string;
}

export function SortablePersonalTaskCard({
  task,
  onViewDetails,
  onEdit,
  onDelete,
  getPriorityColor,
  getPriorityLabel,
  getUrgencyLevel,
  getClientName,
  formatDateBR,
}: SortablePersonalTaskCardProps) {
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
    opacity: isDragging ? 0.5 : undefined,
  };

  const urgency = getUrgencyLevel(task);
  const clientName = getClientName(task.client_id);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm line-clamp-2 flex-1 pr-2">
              {task.title}
            </h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onViewDetails(task);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(task);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
            </Badge>
            
            <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </Badge>
            
            <Badge className={`text-xs ${urgency.color}`}>
              {urgency.label}
            </Badge>

            {task.is_routine && (
              <Badge variant="outline" className="text-xs">
                Rotina
              </Badge>
            )}
          </div>

          {/* Meta info */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Você
            </div>
            
            {clientName && (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {clientName}
              </div>
            )}
            
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateBR(task.due_date)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}