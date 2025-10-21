import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Target, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface TaskCardProps {
  task: Task;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  getUrgencyLevel: (task: Task) => { level: string; label: string; color: string };
  getClientName: (clientId: string | null) => string;
  formatDateBR: (date: string | null) => string;
  assignedUsers?: any[];
  onClick?: (e?: React.MouseEvent) => void;
}

// Gera uma cor consistente baseada no client_id
const getClientColor = (clientId?: string | null): string => {
  if (!clientId) return "hsl(var(--muted))";
  
  const colors = [
    "hsl(220, 70%, 50%)", // Azul
    "hsl(340, 75%, 50%)", // Rosa
    "hsl(160, 60%, 45%)", // Verde
    "hsl(280, 65%, 55%)", // Roxo
    "hsl(30, 80%, 55%)",  // Laranja
    "hsl(190, 70%, 50%)", // Ciano
    "hsl(45, 90%, 55%)",  // Amarelo
    "hsl(300, 65%, 50%)", // Magenta
    "hsl(120, 60%, 45%)", // Verde claro
    "hsl(10, 75%, 55%)",  // Vermelho
  ];
  
  // Gera um índice consistente baseado no clientId
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const priorityIcons = {
  low: Target,
  medium: Clock,
  high: AlertCircle,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "A Fazer", color: "bg-gray-500" },
  in_progress: { label: "Em Andamento", color: "bg-blue-500" },
  em_revisao: { label: "Em Revisão", color: "bg-purple-500" },
  done: { label: "Concluída", color: "bg-green-500" },
};

export function TaskCard({
  task,
  getPriorityColor,
  getPriorityLabel,
  getUrgencyLevel,
  getClientName,
  formatDateBR,
  assignedUsers = [],
  onClick,
}: TaskCardProps) {
  const clientColor = getClientColor(task.client_id);
  const urgency = getUrgencyLevel(task);
  const PriorityIcon = priorityIcons[task.priority as keyof typeof priorityIcons] || Target;
  const UrgencyIcon = urgency.level === 'completed' ? CheckCircle : 
                      urgency.level === 'overdue' ? AlertCircle : Clock;

  return (
    <div 
      className="p-4 rounded-lg border cursor-pointer hover:shadow-md hover:brightness-95 transition-all"
      onClick={(e) => onClick?.(e)}
      style={{ backgroundColor: clientColor.replace(')', ' / 0.1)').replace('hsl(', 'hsl(') }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-2 flex-1 min-w-0 overflow-hidden">
          <h3 className="font-semibold line-clamp-2">{task.title}</h3>
        </div>
        <div className="flex gap-1 flex-wrap flex-shrink-0 ml-2">
          <Badge variant="outline" className={`${statusConfig[task.status]?.color || "bg-gray-500"} text-white text-xs`}>
            {statusConfig[task.status]?.label || task.status}
          </Badge>
          {urgency.level !== 'normal' && task.status !== 'done' && (
            <Badge variant="outline" className={`${urgency.color} text-xs flex items-center gap-1`}>
              <UrgencyIcon className="h-3 w-3" />
              {urgency.label}
            </Badge>
          )}
        </div>
      </div>
      
      {task.description && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        {task.due_date && (
          <span>
            {formatDateBR(task.due_date)}
          </span>
        )}
        <span 
          className="font-medium px-2 py-0.5 rounded ml-auto"
          style={{ backgroundColor: clientColor, color: 'white' }}
        >
          {getClientName(task.client_id)}
        </span>
      </div>

      {assignedUsers.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <div className="flex flex-wrap gap-1">
            {assignedUsers.slice(0, 2).map((assignment, i) => (
              <span key={i} className="font-medium">
                {assignment.profiles?.name || 'Usuário'}
              </span>
            ))}
            {assignedUsers.length > 2 && (
              <span>+{assignedUsers.length - 2}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
