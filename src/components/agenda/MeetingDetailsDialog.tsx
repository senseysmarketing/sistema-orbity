import { Meeting, useMeetings } from "@/hooks/useMeetings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  MapPin,
  Video,
  User,
  Users,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MeetingNotesTab } from "./MeetingNotesTab";
import { useState } from "react";
import { MeetingFormDialog } from "./MeetingFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MeetingDetailsDialogProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const meetingTypeLabels = {
  commercial: "Comercial",
  client: "Cliente",
  internal: "Interna",
  quick_call: "Call Rápida",
  workshop: "Workshop",
  results: "Resultados",
};

const statusLabels = {
  scheduled: "Agendada",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Não Compareceu",
};

export const MeetingDetailsDialog = ({
  meeting,
  open,
  onOpenChange,
}: MeetingDetailsDialogProps) => {
  const { deleteMeeting } = useMeetings();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!meeting) return null;

  const handleDelete = async () => {
    await deleteMeeting.mutateAsync(meeting.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl">{meeting.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {meetingTypeLabels[meeting.meeting_type]}
                  </Badge>
                  <Badge variant="outline">{statusLabels[meeting.status]}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="notes">Ata da Reunião</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div className="space-y-4">
                {meeting.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Descrição</h4>
                    <p className="text-sm text-muted-foreground">{meeting.description}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="text-sm font-medium">
                        {format(new Date(meeting.start_time), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="text-sm font-medium">
                        {format(new Date(meeting.start_time), "HH:mm", { locale: ptBR })} -{" "}
                        {format(new Date(meeting.end_time), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                {(meeting.location || meeting.google_meet_link) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {meeting.google_meet_link && (
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={meeting.google_meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Entrar no Google Meet
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {meeting.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">{meeting.location}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {(meeting.client?.name || meeting.lead?.name) && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {meeting.client?.name ? "Cliente" : "Lead"}
                        </p>
                        <p className="text-sm font-medium">
                          {meeting.client?.name || meeting.lead?.name}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {meeting.organizer && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Organizador</p>
                        <p className="text-sm font-medium">{meeting.organizer.name}</p>
                      </div>
                    </div>
                  </>
                )}

                {meeting.external_participants && meeting.external_participants.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Participantes Externos</p>
                      </div>
                      <div className="space-y-1">
                        {meeting.external_participants.map((participant, index) => (
                          <div key={index} className="text-sm pl-6">
                            <p className="font-medium">{participant.name}</p>
                            <p className="text-xs text-muted-foreground">{participant.email}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <MeetingNotesTab meeting={meeting} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <MeetingFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        meeting={meeting}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A reunião será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
