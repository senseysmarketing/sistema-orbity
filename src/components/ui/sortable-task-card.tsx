import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './task-card';
import { GripVertical } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
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
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Só chama onViewDetails se não estiver arrastando
    if (!isDragging) {
      onViewDetails(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative"
    >
      <button
        type="button"
        aria-label="Arrastar"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <TaskCard
        task={task}
        getPriorityColor={getPriorityColor}
        getPriorityLabel={getPriorityLabel}
        getUrgencyLevel={getUrgencyLevel}
        getClientName={getClientName}
        formatDateBR={formatDateBR}
        assignedUsers={assignedUsers}
        onClick={handleClick}
      />
    </div>
  );
}