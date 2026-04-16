import { Meeting } from "@/hooks/useMeetings";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { 
  Briefcase, 
  Users, 
  Building, 
  PhoneCall, 
  GraduationCap, 
  PresentationIcon,
  MapPin,
  Video,
  User,
  MessageCircle
} from "lucide-react";

interface MeetingCardProps {
  meeting: Meeting;
  onClick: () => void;
}

const meetingTypeConfig = {
  commercial: { label: "Comercial", color: "bg-green-500", icon: Briefcase },
  client: { label: "Cliente", color: "bg-blue-500", icon: Users },
  internal: { label: "Interna", color: "bg-purple-500", icon: Building },
  quick_call: { label: "Call Rápida", color: "bg-orange-500", icon: PhoneCall },
  workshop: { label: "Workshop", color: "bg-pink-500", icon: GraduationCap },
  results: { label: "Resultados", color: "bg-cyan-500", icon: PresentationIcon },
};

const statusConfig = {
  scheduled: { label: "Agendada", color: "bg-blue-500" },
  completed: { label: "Concluída", color: "bg-green-500" },
  cancelled: { label: "Cancelada", color: "bg-red-500" },
  no_show: { label: "Não Compareceu", color: "bg-gray-500" },
};

export const MeetingCard = ({ meeting, onClick }: MeetingCardProps) => {
  const typeConfig = meetingTypeConfig[meeting.meeting_type];
  const statusBadge = statusConfig[meeting.status];
  const TypeIcon = typeConfig.icon;

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: `var(--${typeConfig.color})` }}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <TypeIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm truncate">{meeting.title}</h4>
              <p className="text-xs text-muted-foreground">
                {format(toZonedTime(new Date(meeting.start_time), "America/Sao_Paulo"), "HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {typeConfig.label}
          </Badge>
        </div>

        {(meeting.location || meeting.google_meet_link) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
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

        {(meeting.client?.name || meeting.lead?.name) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{meeting.client?.name || meeting.lead?.name}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${statusBadge.color} text-white border-0`}
          >
            {statusBadge.label}
          </Badge>
        </div>
      </div>
    </Card>
  );
};
