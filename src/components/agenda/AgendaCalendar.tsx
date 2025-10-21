import { Meeting } from "@/hooks/useMeetings";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { MeetingCard } from "./MeetingCard";
import { isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgendaCalendarProps {
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
}

export const AgendaCalendar = ({ meetings, onMeetingClick }: AgendaCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const meetingsOnSelectedDate = meetings.filter((meeting) =>
    isSameDay(new Date(meeting.start_time), selectedDate)
  );

  const daysWithMeetings = meetings.map((meeting) => new Date(meeting.start_time));

  return (
    <div className="grid md:grid-cols-[350px_1fr] gap-6">
      <div className="bg-card rounded-lg border p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          locale={ptBR}
          modifiers={{
            booked: daysWithMeetings,
          }}
          modifiersStyles={{
            booked: {
              fontWeight: "bold",
              textDecoration: "underline",
            },
          }}
          className="rounded-md"
        />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Reuniões em {selectedDate.toLocaleDateString("pt-BR", { 
              day: "2-digit", 
              month: "long", 
              year: "numeric" 
            })}
          </h3>
        </div>

        {meetingsOnSelectedDate.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhuma reunião agendada para este dia.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetingsOnSelectedDate
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => onMeetingClick(meeting)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
