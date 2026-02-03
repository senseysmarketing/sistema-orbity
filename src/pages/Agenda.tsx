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

  // Extrair IDs de participantes únicos das reuniões
  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const meeting of meetings) {
      for (const pId of (meeting.participants || [])) {
        ids.add(pId);
      }
    }
    return Array.from(ids);
  }, [meetings]);

  // Buscar nomes apenas dos participantes (organizadores já vêm no join)
  const { data: participantProfiles = [] } = useQuery({
    queryKey: ["participant-profiles", participantIds],
    queryFn: async () => {
      if (participantIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", participantIds);
      return data || [];
    },
    enabled: participantIds.length > 0,
  });

  // Montar lista de usuários que têm reuniões (organizador ou participante)
  const agencyUsers = useMemo(() => {
    const userMap = new Map<string, AgencyUser>();
    
    // Adicionar organizadores (já têm nome via join no hook)
    for (const meeting of meetings) {
      if (meeting.organizer_id && meeting.organizer?.name) {
        userMap.set(meeting.organizer_id, {
          id: meeting.organizer_id,
          name: meeting.organizer.name
        });
      }
    }
    
    // Adicionar participantes com nomes da query
    for (const profile of participantProfiles) {
      if (!userMap.has(profile.user_id)) {
        userMap.set(profile.user_id, {
          id: profile.user_id,
          name: profile.name || "Usuário"
        });
      }
    }
    
    // Ordenar por nome
    return Array.from(userMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [meetings, participantProfiles]);
  
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
