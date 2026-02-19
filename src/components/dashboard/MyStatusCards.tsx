import { CheckSquare, AlertCircle, Calendar, Image } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MyStatusCardsProps {
  todayTasksCount: number;
  overdueTasksCount: number;
  nextMeetingTime: string | null;
  postsToReviewCount: number;
  onCardClick?: (section: 'tasks' | 'overdue' | 'meeting' | 'posts') => void;
}

interface StatusCard {
  label: string;
  value: string | number;
  sublabel: string;
  icon: React.ReactNode;
  variant: 'default' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

export function MyStatusCards({
  todayTasksCount,
  overdueTasksCount,
  nextMeetingTime,
  postsToReviewCount,
  onCardClick,
}: MyStatusCardsProps) {
  const cards: StatusCard[] = [
    {
      label: 'Hoje',
      value: todayTasksCount,
      sublabel: 'tarefas para hoje',
      icon: <CheckSquare className="h-5 w-5" />,
      variant: todayTasksCount > 0 ? 'info' : 'default',
      onClick: () => onCardClick?.('tasks'),
    },
    {
      label: 'Atrasadas',
      value: overdueTasksCount,
      sublabel: 'tarefas atrasadas',
      icon: <AlertCircle className="h-5 w-5" />,
      variant: overdueTasksCount > 0 ? 'danger' : 'default',
      onClick: () => onCardClick?.('overdue'),
    },
    {
      label: 'Próxima Reunião',
      value: nextMeetingTime || '—',
      sublabel: nextMeetingTime ? 'horário' : 'sem reunião hoje',
      icon: <Calendar className="h-5 w-5" />,
      variant: nextMeetingTime ? 'info' : 'default',
      onClick: () => onCardClick?.('meeting'),
    },
    {
      label: 'Posts',
      value: postsToReviewCount,
      sublabel: 'aguardando revisão',
      icon: <Image className="h-5 w-5" />,
      variant: postsToReviewCount > 0 ? 'warning' : 'default',
      onClick: () => onCardClick?.('posts'),
    },
  ];

  const variantStyles: Record<StatusCard['variant'], string> = {
    default: 'text-muted-foreground',
    info: 'text-primary',
    warning: 'text-amber-500',
    danger: 'text-destructive',
  };

  const bgStyles: Record<StatusCard['variant'], string> = {
    default: '',
    info: 'border-primary/20',
    warning: 'border-amber-500/20',
    danger: 'border-destructive/20',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, idx) => (
        <Card
          key={idx}
          className={cn(
            'cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]',
            bgStyles[card.variant],
          )}
          onClick={card.onClick}
        >
          <CardContent className="p-4">
            <div className={cn('flex items-center justify-between mb-2', variantStyles[card.variant])}>
              {card.icon}
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            </div>
            <div className={cn('text-2xl font-bold', variantStyles[card.variant])}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{card.sublabel}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
