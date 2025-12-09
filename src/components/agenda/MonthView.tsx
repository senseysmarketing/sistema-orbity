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
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Header with week days */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div key={day} className="p-2 text-center border-r last:border-r-0">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {day}
            </p>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIndex) => (
          week.map((day, dayIndex) => {
            const dayMeetings = getMeetingsForDay(day);
            const hasMore = dayMeetings.length > MAX_VISIBLE_MEETINGS;
            const visibleMeetings = dayMeetings.slice(0, MAX_VISIBLE_MEETINGS);
            const remainingCount = dayMeetings.length - MAX_VISIBLE_MEETINGS;
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[120px] p-1 border-r border-b last:border-r-0 cursor-pointer hover:bg-muted/30 transition-colors",
                  !isSameMonth(day, currentDate) && "bg-muted/20",
                  isToday(day) && "bg-primary/5"
                )}
                onClick={() => onDayClick(day)}
              >
                <div className={cn(
                  "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
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
                    <div className="text-xs text-muted-foreground px-1.5 py-0.5">
                      +{remainingCount} mais
                    </div>
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
