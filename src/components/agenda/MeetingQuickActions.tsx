import { Button } from "@/components/ui/button";
import { Meeting, useMeetings } from "@/hooks/useMeetings";
import {
  Video,
  Edit,
  XCircle,
  Copy,
  Trash2,
  CheckCircle,
  UserX,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface MeetingQuickActionsProps {
  meeting: Meeting;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}

export const MeetingQuickActions = ({
  meeting,
  onEdit,
  onDelete,
  onDuplicate,
  onCancel,
}: MeetingQuickActionsProps) => {
  const { updateMeeting } = useMeetings();

  const handleMarkCompleted = async () => {
    await updateMeeting.mutateAsync({
      id: meeting.id,
      status: "completed",
    });
    toast.success("Reunião marcada como concluída");
  };

  const handleMarkNoShow = async () => {
    await updateMeeting.mutateAsync({
      id: meeting.id,
      status: "no_show",
    });
    toast.success("Reunião marcada como não compareceu");
  };

  const hasGoogleMeet = !!meeting.google_meet_link;

  return (
    <div className="flex flex-wrap gap-2">
      {hasGoogleMeet && (
        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-green-600 hover:bg-green-700"
          asChild
        >
          <a
            href={meeting.google_meet_link!}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Video className="h-4 w-4" />
            Entrar
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}

      {meeting.status === "scheduled" && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleMarkCompleted}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
            Concluída
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleMarkNoShow}
          >
            <UserX className="h-4 w-4 text-orange-600" />
            Não Compareceu
          </Button>
        </>
      )}

      <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
        <Edit className="h-4 w-4" />
        Editar
      </Button>

      <Button variant="outline" size="sm" className="gap-2" onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
        Duplicar
      </Button>

      {meeting.status === "scheduled" && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-orange-600 hover:text-orange-700"
          onClick={onCancel}
        >
          <XCircle className="h-4 w-4" />
          Cancelar
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    </div>
  );
};
