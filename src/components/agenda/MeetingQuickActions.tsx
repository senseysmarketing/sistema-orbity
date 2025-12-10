import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
  Flag,
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
  const isScheduled = meeting.status === "scheduled";

  return (
    <div className="flex items-center gap-2">
      {/* Main Action: Join Meeting */}
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

      {/* Status Actions Dropdown */}
      {isScheduled && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Flag className="h-4 w-4" />
              Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleMarkCompleted} className="gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Marcar como Concluída
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMarkNoShow} className="gap-2">
              <UserX className="h-4 w-4 text-orange-600" />
              Não Compareceu
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCancel} className="gap-2 text-orange-600">
              <XCircle className="h-4 w-4" />
              Cancelar Reunião
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Edit Button */}
      <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
        <Edit className="h-4 w-4" />
        Editar
      </Button>

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDuplicate} className="gap-2">
            <Copy className="h-4 w-4" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
