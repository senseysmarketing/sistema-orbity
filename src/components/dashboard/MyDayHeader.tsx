import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Sun, Moon, Coffee } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface MyDayHeaderProps {
  userName: string;
  agencyName: string;
  avatarUrl?: string;
  todayTasksTotal: number;
  todayTasksDone: number;
  overdueCount: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Bom dia', icon: Coffee };
  if (hour < 18) return { text: 'Boa tarde', icon: Sun };
  return { text: 'Boa noite', icon: Moon };
}

export function MyDayHeader({
  userName,
  agencyName,
  avatarUrl,
  todayTasksTotal,
  todayTasksDone,
  overdueCount,
}: MyDayHeaderProps) {
  const firstName = userName?.split(' ')[0] || 'Usuário';
  const greeting = getGreeting();
  const GreetIcon = greeting.icon;
  const progressPercent = todayTasksTotal > 0 ? Math.round((todayTasksDone / todayTasksTotal) * 100) : 0;
  const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);
  const initials = userName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <div className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
      {/* Top row: avatar + greeting + date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback className="text-sm font-semibold bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <GreetIcon className="h-5 w-5 text-primary" />
              {greeting.text}, {firstName}!
            </h1>
            <p className="text-sm text-muted-foreground">{agencyName}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground shrink-0">{todayCapitalized}</p>
      </div>

      {/* Progress bar */}
      {todayTasksTotal > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {todayTasksDone} de {todayTasksTotal} tarefas de hoje concluídas
            </span>
            <span className="font-semibold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {todayTasksTotal === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma tarefa para hoje. Aproveite o dia! 🎉</p>
      )}

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive font-medium">
            Você tem {overdueCount} tarefa{overdueCount > 1 ? 's' : ''} atrasada{overdueCount > 1 ? 's' : ''}
          </span>
          <Badge variant="destructive" className="ml-auto text-xs">{overdueCount}</Badge>
        </div>
      )}
    </div>
  );
}
