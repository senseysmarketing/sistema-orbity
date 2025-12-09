import { Meeting } from "@/hooks/useMeetings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Plus, Edit, CheckCircle, XCircle, FileText } from "lucide-react";

interface MeetingActivityTimelineProps {
  meeting: Meeting;
}

interface Activity {
  id: string;
  icon: React.ReactNode;
  text: string;
  date: string;
  color: string;
}

export const MeetingActivityTimeline = ({ meeting }: MeetingActivityTimelineProps) => {
  const activities: Activity[] = [];

  // Created
  activities.push({
    id: "created",
    icon: <Plus className="h-3 w-3" />,
    text: `Reunião criada${meeting.organizer?.name ? ` por ${meeting.organizer.name}` : ""}`,
    date: meeting.created_at,
    color: "bg-blue-500",
  });

  // Updated (if different from created)
  if (meeting.updated_at && meeting.updated_at !== meeting.created_at) {
    const updatedDate = new Date(meeting.updated_at);
    const createdDate = new Date(meeting.created_at);
    if (updatedDate.getTime() - createdDate.getTime() > 60000) {
      activities.push({
        id: "updated",
        icon: <Edit className="h-3 w-3" />,
        text: "Reunião atualizada",
        date: meeting.updated_at,
        color: "bg-gray-500",
      });
    }
  }

  // Status changes
  if (meeting.status === "completed") {
    activities.push({
      id: "completed",
      icon: <CheckCircle className="h-3 w-3" />,
      text: "Reunião concluída",
      date: meeting.updated_at,
      color: "bg-green-500",
    });
  }

  if (meeting.status === "cancelled") {
    activities.push({
      id: "cancelled",
      icon: <XCircle className="h-3 w-3" />,
      text: `Reunião cancelada${meeting.cancelled_reason ? `: ${meeting.cancelled_reason}` : ""}`,
      date: meeting.updated_at,
      color: "bg-red-500",
    });
  }

  if (meeting.status === "no_show") {
    activities.push({
      id: "no_show",
      icon: <XCircle className="h-3 w-3" />,
      text: "Participante não compareceu",
      date: meeting.updated_at,
      color: "bg-orange-500",
    });
  }

  // Notes added
  if (meeting.meeting_notes) {
    activities.push({
      id: "notes",
      icon: <FileText className="h-3 w-3" />,
      text: "Ata da reunião adicionada",
      date: meeting.updated_at,
      color: "bg-purple-500",
    });
  }

  // Sort by date
  activities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Histórico de Atividades</span>
      </div>
      <div className="space-y-2 pl-2">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="relative">
              <div
                className={`flex items-center justify-center h-6 w-6 rounded-full text-white ${activity.color}`}
              >
                {activity.icon}
              </div>
              {index < activities.length - 1 && (
                <div className="absolute left-1/2 top-6 h-full w-px -translate-x-1/2 bg-border" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm">{activity.text}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(activity.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
