import { ClientWeekPlan } from "./types";
import { DayCell } from "./DayCell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { Instagram, Facebook, Linkedin, Image, Film, Zap, LayoutGrid, Users, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClientWeekRowProps {
  plan: ClientWeekPlan;
  weekDays: Date[];
  onClientClick: () => void;
  onDayClick: (date: Date) => void;
}

const PLATFORM_ICONS: Record<string, { icon: typeof Instagram; color: string; label: string }> = {
  instagram: { icon: Instagram, color: "text-pink-500", label: "Instagram" },
  facebook: { icon: Facebook, color: "text-blue-600", label: "Facebook" },
  linkedin: { icon: Linkedin, color: "text-blue-800", label: "LinkedIn" },
};

const CONTENT_TYPE_ICONS: Record<string, { icon: typeof Image; label: string }> = {
  feed: { icon: Image, label: "Feed" },
  reels: { icon: Film, label: "Reels" },
  stories: { icon: Zap, label: "Stories" },
  carrossel: { icon: LayoutGrid, label: "Carrossel" },
  carousel: { icon: LayoutGrid, label: "Carrossel" },
};

export function ClientWeekRow({ plan, weekDays, onClientClick, onDayClick }: ClientWeekRowProps) {
  const getReadinessBadge = () => {
    if (plan.weekTotal === 0) {
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Sem posts</Badge>;
    }
    if (plan.readinessPercentage >= 100) {
      return <Badge className="bg-green-600 text-[10px] px-1.5 py-0">{plan.readinessPercentage}%</Badge>;
    }
    if (plan.readinessPercentage >= 50) {
      return <Badge className="bg-amber-500 text-[10px] px-1.5 py-0">{plan.readinessPercentage}%</Badge>;
    }
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{plan.readinessPercentage}%</Badge>;
  };

  const today = startOfDay(new Date());

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "grid gap-2 py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0",
          plan.hasOverdue && "bg-red-50 dark:bg-red-950/20"
        )}
        style={{ gridTemplateColumns: "minmax(180px, 1fr) repeat(7, 40px) 50px" }}
      >
        {/* Client info column */}
        <div 
          className="flex flex-col gap-1 cursor-pointer group min-w-0"
          onClick={onClientClick}
        >
          {/* Row 1: Name + urgency */}
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors flex-1">
              {plan.clientName}
            </p>
            {plan.hasUrgentDeadline && (
              <Tooltip>
                <TooltipTrigger>
                  <Clock className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Prazo próximo</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Row 2: Badge + Platforms + Content types */}
          <div className="flex items-center gap-2 flex-wrap">
            {getReadinessBadge()}
            
            {/* Platforms */}
            {plan.platforms.length > 0 && (
              <div className="flex items-center gap-0.5">
                {plan.platforms.slice(0, 3).map(platform => {
                  const config = PLATFORM_ICONS[platform.toLowerCase()];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <Tooltip key={platform}>
                      <TooltipTrigger>
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      </TooltipTrigger>
                      <TooltipContent>{config.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}

            {/* Content types */}
            {plan.contentTypes.length > 0 && (
              <div className="flex items-center gap-0.5 text-muted-foreground">
                {plan.contentTypes.slice(0, 4).map(type => {
                  const config = CONTENT_TYPE_ICONS[type.toLowerCase()];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <Tooltip key={type}>
                      <TooltipTrigger>
                        <Icon className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>{config.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 3: Assigned users */}
          {plan.assignedUsers.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {plan.assignedUsers.slice(0, 2).map(u => u.name.split(' ')[0]).join(', ')}
                {plan.assignedUsers.length > 2 && ` +${plan.assignedUsers.length - 2}`}
              </span>
            </div>
          )}
        </div>

        {/* Day cells */}
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayData = plan.days[dateKey];
          const isPast = isBefore(day, today);
          
          return (
            <DayCell
              key={dateKey}
              data={dayData}
              isToday={isToday(day)}
              isPast={isPast}
              onClick={() => onDayClick(day)}
            />
          );
        })}

        {/* Total */}
        <div className="flex items-center justify-center">
          <span className="font-bold text-sm">{plan.weekTotal}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
