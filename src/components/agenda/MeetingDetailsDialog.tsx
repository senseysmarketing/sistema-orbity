import { useState } from "react";
import { Meeting, useMeetings } from "@/hooks/useMeetings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  MapPin,
  User,
  Users,
  Clock,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MeetingNotesTab } from "./MeetingNotesTab";
import { MeetingContextTab } from "./MeetingContextTab";
import { MeetingFormDialog } from "./MeetingFormDialog";
import { MeetingQuickActions } from "./MeetingQuickActions";
import { MeetingCountdown } from "./MeetingCountdown";
import { MeetingActivityTimeline } from "./MeetingActivityTimeline";
import { CancelMeetingDialog } from "./CancelMeetingDialog";
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
import { cn } from "@/lib/utils";

interface MeetingDetailsDialogProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicate?: (meeting: Meeting) => void;
}

const meetingTypeLabels = {
  commercial: "Comercial",
  client: "Cliente",
  internal: "Interna",
  quick_call: "Call Rápida",
  workshop: "Workshop",
  results: "Resultados",
};

const meetingTypeColors: Record<string, string> = {
  commercial: "bg-blue-500",
  client: "bg-green-500",
  internal: "bg-purple-500",
  quick_call: "bg-yellow-500",
  workshop: "bg-orange-500",
  results: "bg-cyan-500",
};

const TIMEZONE = "America/Sao_Paulo";

export const MeetingDetailsDialog = ({
  meeting,
  open,
  onOpenChange,
  onDuplicate,
}: MeetingDetailsDialogProps) => {
  const { deleteMeeting } = useMeetings();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  if (!meeting) return null;

  const handleDelete = async () => {
    await deleteMeeting.mutateAsync(meeting.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const handleDuplicate = () => {
    onDuplicate?.(meeting);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* Colored Header */}
          <div className={cn("h-2 rounded-t-lg", meetingTypeColors[meeting.meeting_type])} />
          
          <div className="p-6">
            <DialogHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <DialogTitle className="text-xl">{meeting.title}</DialogTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {meetingTypeLabels[meeting.meeting_type]}
                    </Badge>
                    <MeetingCountdown meeting={meeting} />
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Quick Actions Bar */}
            <div className="pb-4 border-b mb-4">
              <MeetingQuickActions
                meeting={meeting}
                onEdit={() => setEditDialogOpen(true)}
                onDelete={() => setDeleteDialogOpen(true)}
                onDuplicate={handleDuplicate}
                onCancel={() => setCancelDialogOpen(true)}
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="notes">Ata da Reunião</TabsTrigger>
                <TabsTrigger value="context">Contexto</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="space-y-4 py-4">
                  {meeting.description && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Descrição</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{meeting.description}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="text-sm font-medium">
                          {format(toZonedTime(new Date(meeting.start_time), TIMEZONE), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Horário</p>
                        <p className="text-sm font-medium">
                          {format(toZonedTime(new Date(meeting.start_time), TIMEZONE), "HH:mm", { locale: ptBR })} -{" "}
                          {format(toZonedTime(new Date(meeting.end_time), TIMEZONE), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {meeting.location && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Local</p>
                          <p className="text-sm font-medium">{meeting.location}</p>
                        </div>
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

                  {meeting.cancelled_reason && (
                    <>
                      <Separator />
                      <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                        <p className="text-sm font-medium text-red-600">Motivo do cancelamento:</p>
                        <p className="text-sm text-muted-foreground">{meeting.cancelled_reason}</p>
                      </div>
                    </>
                  )}

                  <Separator />
                  <MeetingActivityTimeline meeting={meeting} />
                </div>
              </TabsContent>

              <TabsContent value="notes">
                <MeetingNotesTab meeting={meeting} onTabChange={setActiveTab} />
              </TabsContent>

              <TabsContent value="context">
                <MeetingContextTab meeting={meeting} />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <MeetingFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        meeting={meeting}
      />

      <CancelMeetingDialog
        meetingId={meeting.id}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onCancelled={() => onOpenChange(false)}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
