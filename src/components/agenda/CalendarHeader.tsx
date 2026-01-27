import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "month" | "week" | "day";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onNewMeeting: () => void;
}

export const CalendarHeader = ({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onNewMeeting,
}: CalendarHeaderProps) => {
  const navigatePrevious = () => {
    if (viewMode === "month") {
      onDateChange(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      onDateChange(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const getTitle = () => {
    if (viewMode === "day") {
      return format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToToday} className="text-xs md:text-sm">
          Hoje
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={navigatePrevious} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={navigateNext} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-base md:text-xl font-semibold capitalize">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "month" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("month")}
            className="px-2 md:px-3 text-xs md:text-sm"
          >
            <span className="hidden sm:inline">Mês</span>
            <span className="sm:hidden">M</span>
          </Button>
          <Button
            variant={viewMode === "week" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("week")}
            className="px-2 md:px-3 text-xs md:text-sm"
          >
            <span className="hidden sm:inline">Semana</span>
            <span className="sm:hidden">S</span>
          </Button>
          <Button
            variant={viewMode === "day" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("day")}
            className="px-2 md:px-3 text-xs md:text-sm"
          >
            <span className="hidden sm:inline">Dia</span>
            <span className="sm:hidden">D</span>
          </Button>
        </div>
        <Button variant="action" onClick={onNewMeeting} size="sm" className="flex-shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Nova Reunião</span>
        </Button>
      </div>
    </div>
  );
};
