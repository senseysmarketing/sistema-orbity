import { Meeting } from "@/hooks/useMeetings";
import { MeetingBlock } from "./MeetingBlock";
import { 
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MapPin, Video } from "lucide-react";

const TIMEZONE = "America/Sao_Paulo";
const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 60;

interface DayViewProps {
  currentDate: Date;
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export const DayView = ({ currentDate, meetings, onMeetingClick, onSlotClick }: DayViewProps) => {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const dayMeetings = meetings
    .filter((meeting) => {
      const meetingDate = toZonedTime(new Date(meeting.start_time), TIMEZONE);
      return isSameDay(meetingDate, currentDate);
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const getMeetingPosition = (meeting: Meeting) => {
    const startTime = toZonedTime(new Date(meeting.start_time), TIMEZONE);
    const endTime = toZonedTime(new Date(meeting.end_time), TIMEZONE);
    
    const startHour = getHours(startTime) + getMinutes(startTime) / 60;
    const duration = differenceInMinutes(endTime, startTime) / 60;
    
    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const height = Math.max(duration * HOUR_HEIGHT, 20);
    
    return { top, height };
  };

  const handleSlotClick = (hour: number) => {
    const clickedDate = new Date(currentDate);
    clickedDate.setHours(hour, 0, 0, 0);
    onSlotClick(clickedDate, hour);
  };

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-6">
      {/* Main timeline */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className={cn(
          "p-4 border-b text-center",
          isToday(currentDate) && "bg-primary/5"
        )}>
          <p className="text-sm text-muted-foreground uppercase">
            {format(currentDate, "EEEE", { locale: ptBR })}
          </p>
          <p className={cn(
            "text-3xl font-bold",
            isToday(currentDate) && "text-primary"
          )}>
            {format(currentDate, "d")}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-[60px_1fr]">
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

            {/* Day column */}
            <div className="relative">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className={cn(
                    "h-[60px] border-b cursor-pointer hover:bg-muted/50 transition-colors",
                    isToday(currentDate) && "bg-primary/5"
                  )}
                  onClick={() => handleSlotClick(hour)}
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
                    variant="day"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  />
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Side panel with day details */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Reuniões do Dia ({dayMeetings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dayMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma reunião agendada
              </p>
            ) : (
              dayMeetings.map((meeting) => {
                const startTime = toZonedTime(new Date(meeting.start_time), TIMEZONE);
                const endTime = toZonedTime(new Date(meeting.end_time), TIMEZONE);
                
                return (
                  <div 
                    key={meeting.id}
                    className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onMeetingClick(meeting)}
                  >
                    <p className="font-semibold text-sm">{meeting.title}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(startTime, "HH:mm", { locale: ptBR })} - {format(endTime, "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {(meeting.client?.name || meeting.lead?.name) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{meeting.client?.name || meeting.lead?.name}</span>
                      </div>
                    )}
                    {(meeting.location || meeting.google_meet_link) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        {meeting.google_meet_link ? (
                          <>
                            <Video className="h-3 w-3" />
                            <span>Google Meet</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{meeting.location}</span>
                          </>
                        )}
                      </div>
                    )}
                    <Badge variant="outline" className="mt-2 text-xs">
                      {meeting.status === "scheduled" && "Agendada"}
                      {meeting.status === "completed" && "Concluída"}
                      {meeting.status === "cancelled" && "Cancelada"}
                      {meeting.status === "no_show" && "Não Compareceu"}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
