import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Target, Users, Circle, Loader, Eye, CheckCircle2, RotateCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mapa de cores por slug do tipo de tarefa
export const getTypeColor = (slug: string | null): string => {
  if (!slug) return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  const map: Record<string, string> = {
    redes_sociais: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    criativos: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    reuniao: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    trafego: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    desenvolvimento: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    suporte: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    administrativo: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  };
  return map[slug] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
};

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
  is_recurring?: boolean;
}

interface TaskCardProps {
  task: Task;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  getUrgencyLevel: (task: Task) => { level: string; label: string; color: string };
  getClientName: (clientId: string | null, task?: any) => string;
  formatDateBR: (date: string | null) => string;
  assignedUsers?: any[];
  onClick?: (e?: React.MouseEvent) => void;
  getTypeName?: (slug: string | null) => string;
  getTypeShortName?: (slug: string | null) => string;
  getTypeIcon?: (slug: string | null) => string;
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

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  todo: { label: "A Fazer", color: "bg-gray-500", icon: Circle },
  in_progress: { label: "Em Andamento", color: "bg-blue-500", icon: Loader },
  em_revisao: { label: "Em Revisão", color: "bg-purple-500", icon: Eye },
  done: { label: "Concluída", color: "bg-green-500", icon: CheckCircle2 },
};

// Abreviação para label de urgência
const getShortUrgencyLabel = (label: string): string => {
  if (label === "Esta Semana") return "Sem.";
  return label;
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
  getTypeName,
  getTypeShortName,
  getTypeIcon,
}: TaskCardProps) {
  const clientColor = getClientColor(task.client_id);
  const urgency = getUrgencyLevel(task);
  const PriorityIcon = priorityIcons[task.priority as keyof typeof priorityIcons] || Target;
  const StatusIcon = statusConfig[task.status]?.icon || Circle;
  const UrgencyIcon = urgency.level === 'completed' ? CheckCircle : 
                      urgency.level === 'overdue' ? AlertCircle : Clock;

  return (
    <div 
      className="p-3 md:p-4 rounded-lg border border-[#5a35a0] cursor-pointer hover:shadow-lg hover:shadow-purple-900/30 hover:brightness-110 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 ease-out"
      onClick={(e) => onClick?.(e)}
      style={{ backgroundColor: '#4c2882' }}
    >
      {/* Linha 1: Ícone Status + Badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <StatusIcon className="h-5 w-5 flex-shrink-0 text-white" />
        <div className="flex gap-1 flex-nowrap overflow-x-auto scrollbar-hide">
          {task.task_type && (getTypeShortName || getTypeName) && (
            <Badge className={`${getTypeColor(task.task_type)} text-xs whitespace-nowrap flex-shrink-0 border-0`}>
              {getTypeIcon?.(task.task_type)} {(getTypeShortName || getTypeName)?.(task.task_type)}
            </Badge>
          )}
          <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-white text-xs whitespace-nowrap flex-shrink-0`}>
            {getPriorityLabel(task.priority)}
          </Badge>
          {urgency.level !== 'normal' && task.status !== 'done' && (
            <Badge variant="outline" className={`${urgency.color} text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0`}>
              <UrgencyIcon className="h-3 w-3" />
              {getShortUrgencyLabel(urgency.label)}
            </Badge>
          )}
        </div>
      </div>

      {/* Linha 2: Título */}
      <h3 className="font-semibold text-sm md:text-base line-clamp-2 break-words mb-2 md:mb-3 text-white">
        {task.title}
        {task.is_recurring && (
          <RotateCw
            className="inline-block ml-1.5 h-3.5 w-3.5 text-white/70 align-[-2px]"
            aria-label="Tarefa recorrente"
          />
        )}
      </h3>
      
      {task.description && (
        <p className="text-sm text-white/70 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}
      
      {/* Linha 3: Data + Badge Cliente */}
      <div className="flex items-center justify-between gap-3 text-xs text-white/60 mb-2">
        {task.due_date && (
          <span className="flex-shrink-0">
            {formatDateBR(task.due_date)}
          </span>
        )}
        <span 
          className="font-medium px-2 py-0.5 rounded ml-auto max-w-[120px] truncate text-xs"
          style={{ 
            backgroundColor: (task as any).is_internal ? 'hsl(260, 60%, 50%)' : clientColor, 
            color: 'white' 
          }}
          title={getClientName(task.client_id, task)}
        >
          {getClientName(task.client_id, task)}
        </span>
      </div>

      {assignedUsers.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <Users className="h-3 w-3" />
          <div className="flex flex-wrap gap-1">
            {assignedUsers.slice(0, 2).map((assignment, i) => (
              <span key={i} className="font-medium">
                {assignment.name || assignment.profiles?.name || 'Usuário'}
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
