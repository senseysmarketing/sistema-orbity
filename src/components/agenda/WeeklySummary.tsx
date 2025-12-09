import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meeting } from "@/hooks/useMeetings";
import { 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval, 
  differenceInMinutes, 
  isAfter, 
  isBefore,
  format
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, AlertCircle, TrendingUp } from "lucide-react";

const TIMEZONE = "America/Sao_Paulo";

interface WeeklySummaryProps {
  meetings: Meeting[];
  currentDate: Date;
}

export const WeeklySummary = ({ meetings, currentDate }: WeeklySummaryProps) => {
  const now = new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const weekMeetings = meetings.filter((meeting) => {
    const meetingDate = toZonedTime(new Date(meeting.start_time), TIMEZONE);
    return isWithinInterval(meetingDate, { start: weekStart, end: weekEnd });
  });

  const totalMinutes = weekMeetings.reduce((acc, meeting) => {
    const start = new Date(meeting.start_time);
    const end = new Date(meeting.end_time);
    return acc + differenceInMinutes(end, start);
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const upcomingMeetings = meetings
    .filter((m) => isAfter(new Date(m.start_time), now) && m.status === "scheduled")
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const nextMeeting = upcomingMeetings[0];

  const pendingFollowups = meetings.filter((m) => {
    if (!m.follow_up_date) return false;
    const followupDate = new Date(m.follow_up_date);
    return isBefore(followupDate, now) || 
      (m.status === "completed" && m.outcome === "follow_up_needed");
  });

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Resumo da Semana</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{weekMeetings.length}</p>
            <p className="text-xs text-muted-foreground">reuniões esta semana</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {hours}h {minutes > 0 ? `${minutes}min` : ""}
            </p>
            <p className="text-xs text-muted-foreground">tempo total em reuniões</p>
          </div>
        </div>

        {nextMeeting && (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{nextMeeting.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(toZonedTime(new Date(nextMeeting.start_time), TIMEZONE), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        )}

        {pendingFollowups.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-semibold">{pendingFollowups.length}</p>
              <p className="text-xs text-muted-foreground">follow-ups pendentes</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
