import { Meeting } from "@/hooks/useMeetings";
import { AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

interface MeetingConflictAlertProps {
  conflicts: Meeting[];
}

const TIMEZONE = "America/Sao_Paulo";

export const MeetingConflictAlert = ({ conflicts }: MeetingConflictAlertProps) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Conflito de horário detectado</span>
      </div>
      <div className="space-y-1">
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
            <Clock className="h-3 w-3" />
            <span>
              {conflict.title} - {format(toZonedTime(new Date(conflict.start_time), TIMEZONE), "HH:mm", { locale: ptBR })} às {format(toZonedTime(new Date(conflict.end_time), TIMEZONE), "HH:mm", { locale: ptBR })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
