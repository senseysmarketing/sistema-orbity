import { useState, useEffect } from "react";
import { differenceInMinutes, differenceInHours, differenceInDays, isPast } from "date-fns";
import { Clock, Play, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Meeting } from "@/hooks/useMeetings";

interface MeetingCountdownProps {
  meeting: Meeting;
}

export const MeetingCountdown = ({ meeting }: MeetingCountdownProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);

  // Already completed or cancelled
  if (meeting.status === "completed") {
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
        <CheckCircle className="h-3 w-3" />
        Concluída
      </Badge>
    );
  }

  if (meeting.status === "cancelled") {
    return (
      <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-600 border-red-500/20">
        <XCircle className="h-3 w-3" />
        Cancelada
      </Badge>
    );
  }

  if (meeting.status === "no_show") {
    return (
      <Badge variant="secondary" className="gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
        <XCircle className="h-3 w-3" />
        Não Compareceu
      </Badge>
    );
  }

  // Check if meeting is happening now
  if (now >= startTime && now <= endTime) {
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20 animate-pulse">
        <Play className="h-3 w-3" />
        Em andamento
      </Badge>
    );
  }

  // Check if meeting is in the past
  if (isPast(endTime)) {
    return (
      <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
        <Clock className="h-3 w-3" />
        Passou
      </Badge>
    );
  }

  // Calculate countdown
  const days = differenceInDays(startTime, now);
  const totalHours = differenceInHours(startTime, now);
  const hours = totalHours % 24;
  const totalMinutes = differenceInMinutes(startTime, now);
  const minutes = totalMinutes % 60;

  let countdownText = "";
  let urgencyClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";

  if (days > 0) {
    countdownText = `Em ${days}d ${hours}h`;
  } else if (totalHours > 0) {
    countdownText = `Em ${hours}h ${minutes}min`;
    if (totalHours <= 2) {
      urgencyClass = "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  } else {
    countdownText = `Em ${minutes}min`;
    urgencyClass = "bg-orange-500/10 text-orange-600 border-orange-500/20 animate-pulse";
  }

  return (
    <Badge variant="secondary" className={`gap-1 ${urgencyClass}`}>
      <Clock className="h-3 w-3" />
      {countdownText}
    </Badge>
  );
};
