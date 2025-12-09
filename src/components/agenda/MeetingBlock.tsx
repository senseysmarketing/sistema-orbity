import { Meeting } from "@/hooks/useMeetings";
import { format, differenceInMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  Briefcase, 
  Users, 
  Building, 
  PhoneCall, 
  GraduationCap, 
  PresentationIcon,
  Video,
  MapPin
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TIMEZONE = "America/Sao_Paulo";

interface MeetingBlockProps {
  meeting: Meeting;
  onClick: () => void;
  variant?: "week" | "day" | "month";
  style?: React.CSSProperties;
}

const meetingTypeConfig = {
  commercial: { label: "Comercial", color: "bg-green-500", textColor: "text-green-50", icon: Briefcase },
  client: { label: "Cliente", color: "bg-blue-500", textColor: "text-blue-50", icon: Users },
  internal: { label: "Interna", color: "bg-purple-500", textColor: "text-purple-50", icon: Building },
  quick_call: { label: "Call Rápida", color: "bg-orange-500", textColor: "text-orange-50", icon: PhoneCall },
  workshop: { label: "Workshop", color: "bg-pink-500", textColor: "text-pink-50", icon: GraduationCap },
  results: { label: "Resultados", color: "bg-cyan-500", textColor: "text-cyan-50", icon: PresentationIcon },
};

export const MeetingBlock = ({ meeting, onClick, variant = "week", style }: MeetingBlockProps) => {
  const config = meetingTypeConfig[meeting.meeting_type];
  const Icon = config.icon;
  const startTime = toZonedTime(new Date(meeting.start_time), TIMEZONE);
  const endTime = toZonedTime(new Date(meeting.end_time), TIMEZONE);
  const duration = differenceInMinutes(endTime, startTime);

  const isCancelled = meeting.status === "cancelled";
  const isCompleted = meeting.status === "completed";

  if (variant === "month") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={onClick}
              className={cn(
                "text-xs px-1.5 py-0.5 rounded cursor-pointer truncate",
                config.color,
                config.textColor,
                isCancelled && "opacity-50 line-through"
              )}
            >
              <span className="font-medium">
                {format(startTime, "HH:mm", { locale: ptBR })}
              </span>
              {" "}
              <span className="truncate">{meeting.title}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{meeting.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(startTime, "HH:mm", { locale: ptBR })} - {format(endTime, "HH:mm", { locale: ptBR })}
              </p>
              {meeting.client?.name && (
                <p className="text-xs">Cliente: {meeting.client.name}</p>
              )}
              {meeting.lead?.name && (
                <p className="text-xs">Lead: {meeting.lead.name}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            style={style}
            className={cn(
              "absolute left-0 right-1 rounded-md px-2 py-1 cursor-pointer overflow-hidden transition-all",
              "hover:ring-2 hover:ring-primary/50 hover:z-10",
              config.color,
              config.textColor,
              isCancelled && "opacity-50",
              isCompleted && "opacity-80"
            )}
          >
            <div className="flex items-start gap-1">
              <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-semibold truncate",
                  isCancelled && "line-through"
                )}>
                  {meeting.title}
                </p>
                {duration >= 30 && (
                  <p className="text-xs opacity-90">
                    {format(startTime, "HH:mm", { locale: ptBR })} - {format(endTime, "HH:mm", { locale: ptBR })}
                  </p>
                )}
                {duration >= 60 && (meeting.client?.name || meeting.lead?.name) && (
                  <p className="text-xs opacity-80 truncate">
                    {meeting.client?.name || meeting.lead?.name}
                  </p>
                )}
                {duration >= 90 && (meeting.location || meeting.google_meet_link) && (
                  <div className="flex items-center gap-1 text-xs opacity-80">
                    {meeting.google_meet_link ? (
                      <>
                        <Video className="h-2.5 w-2.5" />
                        <span>Google Meet</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-2.5 w-2.5" />
                        <span className="truncate">{meeting.location}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{meeting.title}</p>
            <p className="text-xs text-muted-foreground">
              {format(startTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(startTime, "HH:mm", { locale: ptBR })} - {format(endTime, "HH:mm", { locale: ptBR })} ({duration} min)
            </p>
            {meeting.description && (
              <p className="text-xs">{meeting.description}</p>
            )}
            {meeting.client?.name && (
              <p className="text-xs">Cliente: {meeting.client.name}</p>
            )}
            {meeting.lead?.name && (
              <p className="text-xs">Lead: {meeting.lead.name}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
