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
import { Loader2 } from "lucide-react";

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
  const [duplicatingMeeting, setDuplicatingMeeting] = useState<Meeting | null>(null);
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
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
