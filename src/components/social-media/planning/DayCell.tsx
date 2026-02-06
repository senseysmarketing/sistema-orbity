import { DayData } from "./types";
import { cn } from "@/lib/utils";

interface DayCellProps {
  data: DayData | undefined;
  isToday: boolean;
  isPast: boolean;
  onClick: () => void;
}

export function DayCell({ data, isToday, isPast, onClick }: DayCellProps) {
  const total = data ? data.ready + data.inProgress + data.draft : 0;
  
  if (total === 0) {
    return (
      <div 
        className={cn(
          "h-10 flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/50 rounded transition-colors",
          isToday && "ring-2 ring-primary ring-offset-1",
          isPast && "opacity-50"
        )}
        onClick={onClick}
      >
        <span className="text-xs">-</span>
      </div>
    );
  }

  // Determine dominant status for cell color
  const getStatusColor = () => {
    if (data!.ready === total) return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300";
    if (data!.ready > 0) return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
    if (data!.inProgress > 0) return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div
      className={cn(
        "h-10 flex items-center justify-center cursor-pointer rounded transition-all hover:scale-105",
        getStatusColor(),
        isToday && "ring-2 ring-primary ring-offset-1",
        isPast && data!.ready < total && "ring-1 ring-red-400"
      )}
      onClick={onClick}
      title={`${data!.ready} prontos, ${data!.inProgress} em andamento, ${data!.draft} rascunhos`}
    >
      <div className="flex items-center gap-0.5">
        <span className="font-semibold text-sm">{total}</span>
        {data!.ready > 0 && data!.ready < total && (
          <div className="flex gap-px ml-1">
            {data!.ready > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            {data!.inProgress > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
          </div>
        )}
      </div>
    </div>
  );
}
