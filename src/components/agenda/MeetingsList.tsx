import { Meeting } from "@/hooks/useMeetings";
import { MeetingCard } from "./MeetingCard";
import { format, isToday, isTomorrow, isThisWeek, isThisMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

interface MeetingsListProps {
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
}

const TIMEZONE = "America/Sao_Paulo";

export const MeetingsList = ({ meetings, onMeetingClick }: MeetingsListProps) => {
  const groupMeetings = () => {
    const today: Meeting[] = [];
    const tomorrow: Meeting[] = [];
    const thisWeek: Meeting[] = [];
    const thisMonth: Meeting[] = [];
    const later: Meeting[] = [];

    meetings.forEach((meeting) => {
      const meetingDate = toZonedTime(new Date(meeting.start_time), TIMEZONE);
      
      if (isToday(meetingDate)) {
        today.push(meeting);
      } else if (isTomorrow(meetingDate)) {
        tomorrow.push(meeting);
      } else if (isThisWeek(meetingDate)) {
        thisWeek.push(meeting);
      } else if (isThisMonth(meetingDate)) {
        thisMonth.push(meeting);
      } else {
        later.push(meeting);
      }
    });

    return { today, tomorrow, thisWeek, thisMonth, later };
  };

  const grouped = groupMeetings();

  const renderGroup = (title: string, meetings: Meeting[]) => {
    if (meetings.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="space-y-2">
          {meetings
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={() => onMeetingClick(meeting)}
              />
            ))}
        </div>
      </div>
    );
  };

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma reunião agendada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {renderGroup("Hoje", grouped.today)}
      {renderGroup("Amanhã", grouped.tomorrow)}
      {renderGroup("Esta Semana", grouped.thisWeek)}
      {renderGroup("Este Mês", grouped.thisMonth)}
      {renderGroup("Mais Tarde", grouped.later)}
    </div>
  );
};
