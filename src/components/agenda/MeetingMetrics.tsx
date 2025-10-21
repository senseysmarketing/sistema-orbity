import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { Meeting } from "@/hooks/useMeetings";
import { startOfMonth, endOfMonth, isToday, isBefore, startOfDay } from "date-fns";

interface MeetingMetricsProps {
  meetings: Meeting[];
}

export const MeetingMetrics = ({ meetings }: MeetingMetricsProps) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonthMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.start_time);
    return meetingDate >= monthStart && meetingDate <= monthEnd;
  });

  const todayMeetings = meetings.filter((m) => isToday(new Date(m.start_time)));

  const commercialMeetings = thisMonthMeetings.filter(
    (m) => m.meeting_type === "commercial" && m.status === "completed"
  );
  const wonMeetings = commercialMeetings.filter((m) => m.outcome === "win");
  const conversionRate = commercialMeetings.length > 0 
    ? Math.round((wonMeetings.length / commercialMeetings.length) * 100) 
    : 0;

  const pendingFollowup = meetings.filter((m) => {
    if (!m.follow_up_date) return false;
    const followupDate = new Date(m.follow_up_date);
    return isBefore(startOfDay(followupDate), startOfDay(now)) || isToday(followupDate);
  });

  const metrics = [
    {
      title: "Reuniões este Mês",
      value: thisMonthMeetings.length.toString(),
      icon: Calendar,
      description: "Total de reuniões agendadas",
    },
    {
      title: "Reuniões Hoje",
      value: todayMeetings.length.toString(),
      icon: Clock,
      description: "Reuniões programadas para hoje",
    },
    {
      title: "Taxa de Conversão",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      description: "Comerciais que viraram ganho",
    },
    {
      title: "Pendente Follow-up",
      value: pendingFollowup.length.toString(),
      icon: CheckCircle2,
      description: "Reuniões aguardando retorno",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
