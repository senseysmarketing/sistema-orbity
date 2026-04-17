import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './task-card';

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
  task_type?: string | null;
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
  getClientName: (clientId: string | null, task?: any) => string;
  formatDateBR: (date: string | null) => string;
  assignedUsers?: any[];
  getTypeName?: (slug: string | null) => string;
  getTypeShortName?: (slug: string | null) => string;
  getTypeIcon?: (slug: string | null) => string;
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
  getTypeName,
  getTypeShortName,
  getTypeIcon,
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

  const handleClick = () => {
    if (!isDragging) {
      onViewDetails(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing"
    >
      <TaskCard
        task={task}
        getPriorityColor={getPriorityColor}
        getPriorityLabel={getPriorityLabel}
        getUrgencyLevel={getUrgencyLevel}
        getClientName={getClientName}
        formatDateBR={formatDateBR}
        assignedUsers={assignedUsers}
        onClick={handleClick}
        getTypeName={getTypeName}
        getTypeShortName={getTypeShortName}
        getTypeIcon={getTypeIcon}
      />
    </div>
  );
}
