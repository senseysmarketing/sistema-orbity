import { Meeting } from "@/hooks/useMeetings";
import { MeetingBlock } from "./MeetingBlock";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay,
  isToday,
  getHours,
  getMinutes,
  differenceInMinutes
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const TIMEZONE = "America/Sao_Paulo";
const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // pixels per hour

interface WeekViewProps {
  currentDate: Date;
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export const WeekView = ({ currentDate, meetings, onMeetingClick, onSlotClick }: WeekViewProps) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const getMeetingsForDay = (day: Date) => {
    return meetings.filter((meeting) => {
      const meetingDate = toZonedTime(new Date(meeting.start_time), TIMEZONE);
      return isSameDay(meetingDate, day);
    });
  };

  const getMeetingPosition = (meeting: Meeting) => {
    const startTime = toZonedTime(new Date(meeting.start_time), TIMEZONE);
    const endTime = toZonedTime(new Date(meeting.end_time), TIMEZONE);
    
    const startHour = getHours(startTime) + getMinutes(startTime) / 60;
    const duration = differenceInMinutes(endTime, startTime) / 60;
    
    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const height = Math.max(duration * HOUR_HEIGHT, 20); // Minimum height of 20px
    
    return { top, height };
  };

  const handleSlotClick = (day: Date, hour: number) => {
    const clickedDate = new Date(day);
    clickedDate.setHours(hour, 0, 0, 0);
    onSlotClick(clickedDate, hour);
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-card z-10">
        <div className="p-2 border-r" />
        {days.map((day) => (
          <div 
            key={day.toISOString()} 
            className={cn(
              "p-2 text-center border-r last:border-r-0",
              isToday(day) && "bg-primary/5"
            )}
          >
            <p className="text-xs text-muted-foreground uppercase">
              {format(day, "EEE", { locale: ptBR })}
            </p>
            <p className={cn(
              "text-lg font-semibold",
              isToday(day) && "text-primary"
            )}>
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Time column */}
          <div className="border-r">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="h-[60px] border-b text-xs text-muted-foreground pr-2 text-right pt-1"
              >
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayMeetings = getMeetingsForDay(day);
            
            return (
              <div key={day.toISOString()} className="relative border-r last:border-r-0">
                {/* Hour slots */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className={cn(
                      "h-[60px] border-b cursor-pointer hover:bg-muted/50 transition-colors",
                      isToday(day) && "bg-primary/5"
                    )}
                    onClick={() => handleSlotClick(day, hour)}
                  />
                ))}

                {/* Meeting blocks */}
                {dayMeetings.map((meeting) => {
                  const { top, height } = getMeetingPosition(meeting);
                  return (
                    <MeetingBlock
                      key={meeting.id}
                      meeting={meeting}
                      onClick={() => onMeetingClick(meeting)}
                      variant="week"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
