import { Calendar } from "@/components/ui/calendar";
import { Meeting } from "@/hooks/useMeetings";
import { isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

const TIMEZONE = "America/Sao_Paulo";

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  meetings: Meeting[];
}

export const MiniCalendar = ({ selectedDate, onDateSelect, meetings }: MiniCalendarProps) => {
  const daysWithMeetings = meetings.map((meeting) => 
    toZonedTime(new Date(meeting.start_time), TIMEZONE)
  );

  // Count meetings per day for coloring
  const getMeetingCountForDay = (date: Date) => {
    return meetings.filter(meeting => 
      isSameDay(toZonedTime(new Date(meeting.start_time), TIMEZONE), date)
    ).length;
  };

  return (
    <div className="bg-card rounded-lg border p-3">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onDateSelect(date)}
        locale={ptBR}
        modifiers={{
          booked: daysWithMeetings,
        }}
        modifiersStyles={{
          booked: {
            fontWeight: "bold",
          },
        }}
        modifiersClassNames={{
          booked: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
        }}
        className="rounded-md"
      />
    </div>
  );
};
