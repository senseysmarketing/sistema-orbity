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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl font-semibold capitalize">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "month" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("month")}
            className="px-3"
          >
            Mês
          </Button>
          <Button
            variant={viewMode === "week" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("week")}
            className="px-3"
          >
            Semana
          </Button>
          <Button
            variant={viewMode === "day" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("day")}
            className="px-3"
          >
            Dia
          </Button>
        </div>
        <Button variant="action" onClick={onNewMeeting}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Reunião
        </Button>
      </div>
    </div>
  );
};
