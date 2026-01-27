import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from "@/components/ui/badge";
import { SortableTaskCard } from './sortable-task-card';
import { DropZoneIndicator } from './drop-zone-indicator';

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
  getAssignedUsers: (taskId: string) => any[];
  getTypeName?: (slug: string | null) => string;
  getTypeShortName?: (slug: string | null) => string;
  getTypeIcon?: (slug: string | null) => string;
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
  getAssignedUsers,
  getTypeName,
  getTypeShortName,
  getTypeIcon,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="space-y-3 md:space-y-4 min-w-[280px] md:min-w-[330px] w-[280px] md:w-[330px] flex-shrink-0">
      <div className="flex items-center gap-2 px-2 md:px-3 py-2 bg-muted rounded-lg">
        <div className={`w-2.5 md:w-3 h-2.5 md:h-3 ${color} rounded-full`}></div>
        <h3 className="font-semibold text-sm md:text-base">{title}</h3>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 md:space-y-3 min-h-[300px] md:min-h-[400px] max-h-[60vh] md:max-h-[70vh] overflow-y-auto p-3 md:p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
          isOver 
            ? 'bg-primary/10 border-primary/50 shadow-lg scale-[1.02]' 
            : 'bg-muted/20 border-transparent hover:border-muted-foreground/20 hover:bg-muted/30'
        }`}
      >
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <DropZoneIndicator isActive={isOver} isEmpty={true} title={title} />
          ) : (
            tasks.map((task) => (
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
                assignedUsers={getAssignedUsers(task.id)}
                getTypeName={getTypeName}
                getTypeShortName={getTypeShortName}
                getTypeIcon={getTypeIcon}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}