import { useState, useMemo } from "react";
import { useMeetings, Meeting } from "@/hooks/useMeetings";
import { MeetingFormDialog } from "@/components/agenda/MeetingFormDialog";
import { MeetingDetailsDialog } from "@/components/agenda/MeetingDetailsDialog";
import { CalendarHeader } from "@/components/agenda/CalendarHeader";
import { MiniCalendar } from "@/components/agenda/MiniCalendar";
import { WeeklySummary } from "@/components/agenda/WeeklySummary";
import { CalendarFilters, MeetingTypeFilter, MeetingStatusFilter } from "@/components/agenda/CalendarFilters";
import { WeekView } from "@/components/agenda/WeekView";
import { DayView } from "@/components/agenda/DayView";
import { MonthView } from "@/components/agenda/MonthView";
import { format } from "date-fns";

type ViewMode = "month" | "week" | "day";

export default function Agenda() {
  const { meetings, isLoading } = useMeetings();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [prefilledDateTime, setPrefilledDateTime] = useState<{ date: Date; hour: number } | null>(null);
  
  // Filters
  const [typeFilters, setTypeFilters] = useState<MeetingTypeFilter[]>([
    "commercial", "client", "internal", "quick_call", "workshop", "results"
  ]);
  const [statusFilters, setStatusFilters] = useState<MeetingStatusFilter[]>([
    "scheduled", "completed", "cancelled", "no_show"
  ]);

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const typeMatch = typeFilters.includes(meeting.meeting_type as MeetingTypeFilter);
      const statusMatch = statusFilters.includes(meeting.status as MeetingStatusFilter);
      return typeMatch && statusMatch;
    });
  }, [meetings, typeFilters, statusFilters]);

  // Handlers
  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setDetailsDialogOpen(true);
  };

  const handleDetailsClose = () => {
    setDetailsDialogOpen(false);
    setSelectedMeeting(null);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setPrefilledDateTime({ date, hour });
    setEditingMeeting(null);
    setFormDialogOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  const handleNewMeeting = () => {
    setPrefilledDateTime(null);
    setEditingMeeting(null);
    setFormDialogOpen(true);
  };

  const handleFormClose = () => {
    setFormDialogOpen(false);
    setPrefilledDateTime(null);
    setEditingMeeting(null);
  };

  const handleMiniCalendarSelect = (date: Date) => {
    setCurrentDate(date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agenda</h1>
        <p className="text-muted-foreground">
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
        <div className="text-center py-12 text-muted-foreground">
          Carregando reuniões...
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
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
      />

      <MeetingDetailsDialog
        meeting={selectedMeeting}
        open={detailsDialogOpen}
        onOpenChange={handleDetailsClose}
      />
    </div>
  );
}
