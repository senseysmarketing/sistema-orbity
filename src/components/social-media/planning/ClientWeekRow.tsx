import { ClientWeekPlan } from "./types";
import { DayCell } from "./DayCell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isToday, isBefore, startOfDay } from "date-fns";

interface ClientWeekRowProps {
  plan: ClientWeekPlan;
  weekDays: Date[];
  onClientClick: () => void;
  onDayClick: (date: Date) => void;
}

export function ClientWeekRow({ plan, weekDays, onClientClick, onDayClick }: ClientWeekRowProps) {
  const getReadinessBadge = () => {
    if (plan.weekTotal === 0) {
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Sem posts</Badge>;
    }
    if (plan.readinessPercentage >= 100) {
      return <Badge className="bg-green-600 text-[10px] px-1.5 py-0">100%</Badge>;
    }
    if (plan.readinessPercentage >= 50) {
      return <Badge className="bg-amber-500 text-[10px] px-1.5 py-0">{plan.readinessPercentage}%</Badge>;
    }
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{plan.readinessPercentage}%</Badge>;
  };

  const today = startOfDay(new Date());

  return (
    <div 
      className={cn(
        "grid gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0",
        plan.hasOverdue && "bg-red-50 dark:bg-red-950/20"
      )}
      style={{ gridTemplateColumns: "minmax(140px, 1fr) repeat(7, 40px) 50px" }}
    >
      {/* Client name */}
      <div 
        className="flex items-center gap-2 cursor-pointer group"
        onClick={onClientClick}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {plan.clientName}
          </p>
          {getReadinessBadge()}
        </div>
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
  );
}
