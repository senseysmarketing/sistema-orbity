import { Meeting } from "@/hooks/useMeetings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MeetingActivityTimelineProps {
  meeting: Meeting;
}

interface Activity {
  id: string;
  title: string;
  date: string;
  userName?: string;
}

export const MeetingActivityTimeline = ({ meeting }: MeetingActivityTimelineProps) => {
  const activities: Activity[] = [];

  // Created
  activities.push({
    id: "created",
    title: "Reunião criada",
    date: meeting.created_at,
    userName: meeting.organizer?.name,
  });

  // Updated (if different from created)
  if (meeting.updated_at && meeting.updated_at !== meeting.created_at) {
    const updatedDate = new Date(meeting.updated_at);
    const createdDate = new Date(meeting.created_at);
    if (updatedDate.getTime() - createdDate.getTime() > 60000) {
      activities.push({
        id: "updated",
        title: "Reunião atualizada",
        date: meeting.updated_at,
      });
    }
  }

  // Status changes
  if (meeting.status === "completed") {
    activities.push({
      id: "completed",
      title: "Reunião concluída",
      date: meeting.updated_at,
    });
  }

  if (meeting.status === "cancelled") {
    activities.push({
      id: "cancelled",
      title: meeting.cancelled_reason 
        ? `Reunião cancelada: ${meeting.cancelled_reason}` 
        : "Reunião cancelada",
      date: meeting.updated_at,
    });
  }

  if (meeting.status === "no_show") {
    activities.push({
      id: "no_show",
      title: "Participante não compareceu",
      date: meeting.updated_at,
    });
  }

  // Notes added
  if (meeting.meeting_notes) {
    activities.push({
      id: "notes",
      title: "Ata da reunião adicionada",
      date: meeting.updated_at,
    });
  }

  // Sort by date descending (most recent first)
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Histórico de Atividades</p>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="p-2 rounded-md bg-muted/50">
            <p className="text-sm">{activity.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{format(new Date(activity.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              {activity.userName && (
                <>
                  <span>•</span>
                  <span>por {activity.userName}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};