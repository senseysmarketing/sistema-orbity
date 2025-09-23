import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from "@/components/ui/badge";
import { SortablePersonalTaskCard } from './sortable-personal-task-card';

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

interface PersonalKanbanColumnProps {
  id: string;
  title: string;
  tasks: PersonalTask[];
  color: string;
  count: number;
  onViewDetails: (task: PersonalTask) => void;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  getUrgencyLevel: (task: PersonalTask) => { level: string; label: string; color: string };
  getClientName: (clientId: string | null) => string | null;
  formatDateBR: (date: string | null) => string;
}

export function PersonalKanbanColumn({
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
  getClientName,
  formatDateBR,
}: PersonalKanbanColumnProps) {
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
            <SortablePersonalTaskCard
              key={task.id}
              task={task}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onDelete={onDelete}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              getUrgencyLevel={getUrgencyLevel}
              getClientName={getClientName}
              formatDateBR={formatDateBR}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}