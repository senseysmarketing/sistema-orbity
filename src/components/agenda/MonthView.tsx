import { Meeting } from "@/hooks/useMeetings";
import { MeetingBlock } from "./MeetingBlock";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay,
  isSameMonth,
  isToday
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const TIMEZONE = "America/Sao_Paulo";
const MAX_VISIBLE_MEETINGS = 3;

interface MonthViewProps {
  currentDate: Date;
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
  onDayClick: (date: Date) => void;
}

export const MonthView = ({ currentDate, meetings, onMeetingClick, onDayClick }: MonthViewProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getMeetingsForDay = (day: Date) => {
    return meetings
      .filter((meeting) => {
        const meetingDate = toZonedTime(new Date(meeting.start_time), TIMEZONE);
        return isSameDay(meetingDate, day);
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const isMobile = useIsMobile();
  const weekDays = isMobile ? ["D", "S", "T", "Q", "Q", "S", "S"] : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const maxVisible = isMobile ? 2 : MAX_VISIBLE_MEETINGS;

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Header with week days */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day, index) => (
          <div key={`${day}-${index}`} className="p-1 md:p-2 text-center border-r last:border-r-0">
            <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase">
              {day}
            </p>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week) => (
          week.map((day) => {
            const dayMeetings = getMeetingsForDay(day);
            const hasMore = dayMeetings.length > maxVisible;
            const visibleMeetings = dayMeetings.slice(0, maxVisible);
            const remainingCount = dayMeetings.length - maxVisible;
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[80px] md:min-h-[120px] p-0.5 md:p-1 border-r border-b last:border-r-0 cursor-pointer hover:bg-muted/30 transition-colors",
                  !isSameMonth(day, currentDate) && "bg-muted/20",
                  isToday(day) && "bg-primary/5"
                )}
                onClick={() => onDayClick(day)}
              >
                <div className={cn(
                  "text-xs md:text-sm font-medium mb-0.5 md:mb-1 w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full",
                  !isSameMonth(day, currentDate) && "text-muted-foreground",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}>
                  {format(day, "d")}
                </div>
                
                <div className="space-y-0.5">
                  {visibleMeetings.map((meeting) => (
                    <MeetingBlock
                      key={meeting.id}
                      meeting={meeting}
                      onClick={() => {
                        // Stop propagation to prevent day click
                        onMeetingClick(meeting);
                      }}
                      variant="month"
                    />
                  ))}
                  {hasMore && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button 
                          className="text-xs text-primary hover:underline px-1.5 py-0.5 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          +{remainingCount} mais
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <div className="p-3 border-b">
                          <p className="text-sm font-medium">
                            {format(day, "d 'de' MMMM", { locale: ptBR })} ({dayMeetings.length} reuniões)
                          </p>
                        </div>
                        <ScrollArea className="max-h-60">
                          <div className="p-2 space-y-1">
                            {dayMeetings.map((meeting) => (
                              <MeetingBlock
                                key={meeting.id}
                                meeting={meeting}
                                onClick={() => onMeetingClick(meeting)}
                                variant="month"
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};
