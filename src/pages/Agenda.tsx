import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, List, Clock } from "lucide-react";
import { useMeetings, Meeting } from "@/hooks/useMeetings";
import { MeetingFormDialog } from "@/components/agenda/MeetingFormDialog";
import { MeetingDetailsDialog } from "@/components/agenda/MeetingDetailsDialog";
import { MeetingMetrics } from "@/components/agenda/MeetingMetrics";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { MeetingsList } from "@/components/agenda/MeetingsList";

export default function Agenda() {
  const { meetings, isLoading } = useMeetings();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setDetailsDialogOpen(true);
  };

  const handleDetailsClose = () => {
    setDetailsDialogOpen(false);
    setSelectedMeeting(null);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-muted-foreground">
              Gerencie reuniões comerciais e com clientes
            </p>
          </div>
          <Button variant="action" onClick={() => setFormDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reunião
          </Button>
        </div>

        <MeetingMetrics meetings={meetings} />

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calendar">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando reuniões...
              </div>
            ) : (
              <AgendaCalendar
                meetings={meetings}
                onMeetingClick={handleMeetingClick}
              />
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando reuniões...
              </div>
            ) : (
              <MeetingsList
                meetings={meetings}
                onMeetingClick={handleMeetingClick}
              />
            )}
          </TabsContent>
        </Tabs>

        <MeetingFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
        />

        <MeetingDetailsDialog
          meeting={selectedMeeting}
          open={detailsDialogOpen}
          onOpenChange={handleDetailsClose}
        />
      </div>
  );
}
