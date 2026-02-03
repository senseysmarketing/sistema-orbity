import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMeetings, Meeting } from "@/hooks/useMeetings";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { MeetingFormDialog } from "@/components/agenda/MeetingFormDialog";
import { MeetingDetailsDialog } from "@/components/agenda/MeetingDetailsDialog";
import { CalendarHeader } from "@/components/agenda/CalendarHeader";
import { MiniCalendar } from "@/components/agenda/MiniCalendar";
import { WeeklySummary } from "@/components/agenda/WeeklySummary";
import { CalendarFilters, MeetingTypeFilter, MeetingStatusFilter, AgencyUser } from "@/components/agenda/CalendarFilters";
import { WeekView } from "@/components/agenda/WeekView";
import { DayView } from "@/components/agenda/DayView";
import { MonthView } from "@/components/agenda/MonthView";
import { Loader2 } from "lucide-react";

type ViewMode = "month" | "week" | "day";

export default function Agenda() {
  const { meetings, isLoading } = useMeetings();
  const { currentAgency } = useAgency();

  // Query para buscar usuários da agência
  const { data: agencyUsers = [] } = useQuery({
    queryKey: ["agency-users-agenda", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("agency_users")
        .select(`
          user_id,
          profiles:profiles!agency_users_user_id_fkey(name)
        `)
        .eq("agency_id", currentAgency.id);
      return (data || []).map(item => ({
        id: item.user_id,
        name: (item.profiles as any)?.name || "Usuário",
      })) as AgencyUser[];
    },
    enabled: !!currentAgency?.id,
  });
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [duplicatingMeeting, setDuplicatingMeeting] = useState<Meeting | null>(null);
  const [prefilledDateTime, setPrefilledDateTime] = useState<{ date: Date; hour: number } | null>(null);
  
  // Filters
  const [userFilters, setUserFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<MeetingTypeFilter[]>([
    "commercial", "client", "internal", "quick_call", "workshop", "results"
  ]);
  const [statusFilters, setStatusFilters] = useState<MeetingStatusFilter[]>([
    "scheduled", "completed", "cancelled", "no_show"
  ]);

  // Inicializar filtro de usuários com todos selecionados
  useEffect(() => {
    if (agencyUsers.length > 0 && userFilters.length === 0) {
      setUserFilters(agencyUsers.map(u => u.id));
    }
  }, [agencyUsers, userFilters.length]);

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const typeMatch = typeFilters.includes(meeting.meeting_type as MeetingTypeFilter);
      const statusMatch = statusFilters.includes(meeting.status as MeetingStatusFilter);
      
      // Filtro por usuário: organizador OU participante
      const userMatch = userFilters.length === 0 || 
        userFilters.includes(meeting.organizer_id) ||
        (meeting.participants || []).some(p => userFilters.includes(p));
      
      return typeMatch && statusMatch && userMatch;
    });
  }, [meetings, typeFilters, statusFilters, userFilters]);

  // Handlers
  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setDetailsDialogOpen(true);
  };

  const handleDetailsClose = (open: boolean) => {
    setDetailsDialogOpen(open);
    if (!open) {
      setSelectedMeeting(null);
    }
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setPrefilledDateTime({ date, hour });
    setEditingMeeting(null);
    setDuplicatingMeeting(null);
    setFormDialogOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  const handleNewMeeting = () => {
    setPrefilledDateTime(null);
    setEditingMeeting(null);
    setDuplicatingMeeting(null);
    setFormDialogOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) {
      setPrefilledDateTime(null);
      setEditingMeeting(null);
      setDuplicatingMeeting(null);
    }
  };

  const handleMiniCalendarSelect = (date: Date) => {
    setCurrentDate(date);
  };

  const handleDuplicate = (meeting: Meeting) => {
    setDuplicatingMeeting(meeting);
    setEditingMeeting(null);
    setPrefilledDateTime(null);
    setFormDialogOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Agenda</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie reuniões comerciais e com clientes
        </p>
      </div>

      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onDateChange={setCurrentDate}
        onViewModeChange={setViewMode}
        onNewMeeting={handleNewMeeting}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
          {/* Sidebar - hidden on mobile */}
          <div className="hidden lg:block space-y-4">
            <MiniCalendar
              selectedDate={currentDate}
              onDateSelect={handleMiniCalendarSelect}
              meetings={filteredMeetings}
            />
            <WeeklySummary 
              meetings={filteredMeetings} 
              currentDate={currentDate} 
            />
            <CalendarFilters
              users={agencyUsers}
              userFilters={userFilters}
              onUserFilterChange={setUserFilters}
              typeFilters={typeFilters}
              statusFilters={statusFilters}
              onTypeFilterChange={setTypeFilters}
              onStatusFilterChange={setStatusFilters}
            />
          </div>

          {/* Main calendar area */}
          <div>
            {viewMode === "week" && (
              <WeekView
                currentDate={currentDate}
                meetings={filteredMeetings}
                onMeetingClick={handleMeetingClick}
                onSlotClick={handleSlotClick}
              />
            )}
            {viewMode === "day" && (
              <DayView
                currentDate={currentDate}
                meetings={filteredMeetings}
                onMeetingClick={handleMeetingClick}
                onSlotClick={handleSlotClick}
              />
            )}
            {viewMode === "month" && (
              <MonthView
                currentDate={currentDate}
                meetings={filteredMeetings}
                onMeetingClick={handleMeetingClick}
                onDayClick={handleDayClick}
              />
            )}
          </div>
        </div>
      )}

      <MeetingFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormClose}
        meeting={editingMeeting}
        prefilledDateTime={prefilledDateTime}
        duplicateFrom={duplicatingMeeting}
      />

      <MeetingDetailsDialog
        meeting={selectedMeeting}
        open={detailsDialogOpen}
        onOpenChange={handleDetailsClose}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
