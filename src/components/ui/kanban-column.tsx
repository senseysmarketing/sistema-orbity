import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from "@/components/ui/badge";
import { SortableTaskCard } from './sortable-task-card';

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

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  count: number;
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  getUrgencyLevel: (task: Task) => { level: string; label: string; color: string };
  getAssignedUserName: (userId: string | null) => string;
  getClientName: (clientId: string | null) => string;
  formatDateBR: (date: string | null) => string;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  color,
  count,
  onViewDetails,
  onEdit,
  onDelete,
  getPriorityColor,
  getPriorityLabel,
  getUrgencyLevel,
  getAssignedUserName,
  getClientName,
  formatDateBR,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <div className={`w-3 h-3 ${color} rounded-full`}></div>
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-32 max-h-[70vh] overflow-y-auto p-2 rounded-lg transition-colors ${
          isOver ? 'bg-muted/50' : ''
        }`}
      >
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onDelete={onDelete}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              getUrgencyLevel={getUrgencyLevel}
              getAssignedUserName={getAssignedUserName}
              getClientName={getClientName}
              formatDateBR={formatDateBR}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}