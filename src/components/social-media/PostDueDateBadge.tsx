import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format, isBefore, isToday, isTomorrow, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PostDueDateBadgeProps {
  dueDate: string | null | undefined;
  status: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function getDueDateStatus(dueDate: string | null | undefined, status: string) {
  if (!dueDate) return null;
  
  // Se já está aprovado ou publicado, não mostrar urgência
  const completedStatuses = ['approved', 'published'];
  if (completedStatuses.includes(status)) {
    return { type: 'completed' as const, label: 'Concluído', color: 'bg-green-500' };
  }

  const now = startOfDay(new Date());
  const dueDateObj = startOfDay(new Date(dueDate));

  if (isBefore(dueDateObj, now)) {
    return { type: 'overdue' as const, label: 'Atrasado', color: 'bg-red-500' };
  }

  if (isToday(dueDateObj)) {
    return { type: 'today' as const, label: 'Hoje', color: 'bg-orange-500' };
  }

  if (isTomorrow(dueDateObj)) {
    return { type: 'tomorrow' as const, label: 'Amanhã', color: 'bg-yellow-500' };
  }

  const weekFromNow = addDays(now, 7);
  if (isBefore(dueDateObj, weekFromNow)) {
    return { type: 'this_week' as const, label: 'Esta semana', color: 'bg-blue-500' };
  }

  return { type: 'on_time' as const, label: 'Em dia', color: 'bg-gray-400' };
}

export function PostDueDateBadge({ dueDate, status, showLabel = true, size = "md" }: PostDueDateBadgeProps) {
  const dueDateStatus = getDueDateStatus(dueDate, status);
  
  if (!dueDateStatus || dueDateStatus.type === 'on_time' || dueDateStatus.type === 'completed') {
    return null;
  }

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  const Icon = dueDateStatus.type === 'overdue' ? AlertTriangle : Clock;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        dueDateStatus.color, 
        "text-white border-0 flex items-center gap-1",
        textSize
      )}
    >
      <Icon className={iconSize} />
      {showLabel && dueDateStatus.label}
    </Badge>
  );
}

export function formatDueDate(dueDate: string | null | undefined): string {
  if (!dueDate) return "";
  return format(new Date(dueDate), "dd/MM", { locale: ptBR });
}

export function formatPostDate(postDate: string | null | undefined): string {
  if (!postDate) return "";
  return format(new Date(postDate), "dd/MM/yyyy", { locale: ptBR });
}
