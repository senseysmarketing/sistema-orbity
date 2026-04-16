import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Meeting, useMeetings } from "@/hooks/useMeetings";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Plus, X, Wand2, Calendar, Users, Check, ChevronsUpDown, MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod";
import { format, addMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { MeetingDurationSelector } from "./MeetingDurationSelector";
import { MeetingConflictAlert } from "./MeetingConflictAlert";
import { MeetingTemplateSelector } from "./MeetingTemplateSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { MultiClientSelector } from "@/components/clients/MultiClientSelector";
import { useClientRelations } from "@/hooks/useClientRelations";
import { getVirtualAgencyClient, separateVirtualClients } from "@/lib/virtualAgencyClient";

const TIMEZONE = "America/Sao_Paulo";

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | null;
  prefilledDateTime?: { date: Date; hour: number } | null;
  duplicateFrom?: Meeting | null;
  defaultClientIds?: string[];
}

// Validation schemas
const externalParticipantSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
});

const meetingSchema = z.object({
  title: z.string()
    .min(3, "Título deve ter pelo menos 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  description: z.string()
    .max(2000, "Descrição muito longa")
    .optional(),
  meeting_type: z.string(),
  start_time: z.string().min(1, "Data/hora de início obrigatória"),
  end_time: z.string().min(1, "Data/hora de término obrigatória"),
  location: z.string().max(500, "Localização muito longa").optional(),
  google_meet_link: z.string()
    .max(500, "Link muito longo")
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "Link deve começar com http:// ou https://",
    })
    .optional(),
  client_id: z.string().optional(),
  lead_id: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  return end > start;
}, {
  message: "Horário de término deve ser após o início",
  path: ["end_time"],
});

export const MeetingFormDialog = ({ 
  open, 
  onOpenChange, 
  meeting, 
  prefilledDateTime,
  duplicateFrom,
  defaultClientIds,
}: MeetingFormDialogProps) => {
  const { createMeeting, updateMeeting, meetings } = useMeetings();
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const { isConnected, isSyncEnabled, syncMeeting, calendars, selectedCalendarId } = useGoogleCalendar();
  const { fetchClientIds, updateClientRelations } = useClientRelations();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    meeting_type: "client" as Meeting["meeting_type"],
    start_time: "",
    end_time: "",
    location: "",
    google_meet_link: "",
    lead_id: "",
  });

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<Array<{ name: string; email: string }>>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(60);
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState(false);
  const [participantsPopoverOpen, setParticipantsPopoverOpen] = useState(false);
  const [leadsPopoverOpen, setLeadsPopoverOpen] = useState(false);

  // WhatsApp reminder state
  const [whatsappReminderEnabled, setWhatsappReminderEnabled] = useState(false);
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [reminderHoursBefore, setReminderHoursBefore] = useState<number>(2);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const lastAutoFilledClientIdRef = useRef<string | null>(null);

  // Phone mask helper (BR)
  const formatPhoneBR = (value: string): string => {
    const digits = (value || "").replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Initialize sync checkbox based on Google Calendar connection
  useEffect(() => {
    if (isConnected && isSyncEnabled && !meeting) {
      setSyncToGoogleCalendar(true);
    }
  }, [isConnected, isSyncEnabled, meeting]);

  // Fetch agency team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["agency-users", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("agency_users")
        .select(`
          user_id,
          role,
          profiles:profiles!agency_users_user_id_fkey(name, email)
        `)
        .eq("agency_id", currentAgency.id);
      return (data || []).map(item => ({
        id: item.user_id,
        name: (item.profiles as any)?.name || "Usuário",
        email: (item.profiles as any)?.email || "",
        role: item.role,
      }));
    },
    enabled: !!currentAgency?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-with-contact", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, name, contact")
        .eq("agency_id", currentAgency.id)
        .eq("active", true);
      const realClients = data || [];
      // Prepend virtual agency client
      const virtualAgency = getVirtualAgencyClient(currentAgency);
      return [virtualAgency, ...realClients];
    },
    enabled: !!currentAgency?.id,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, name, created_at")
        .eq("agency_id", currentAgency.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Detect conflicts
  const conflicts = useMemo(() => {
    if (!formData.start_time || !formData.end_time) return [];
    
    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);
    
    return meetings.filter((m) => {
      if (meeting && m.id === meeting.id) return false;
      if (m.status === "cancelled") return false;
      
      const mStart = new Date(m.start_time);
      const mEnd = new Date(m.end_time);
      
      return (start < mEnd && end > mStart);
    });
  }, [formData.start_time, formData.end_time, meetings, meeting]);

  useEffect(() => {
    const loadMeetingData = async () => {
      if (meeting) {
        const startZoned = toZonedTime(new Date(meeting.start_time), TIMEZONE);
        const endZoned = toZonedTime(new Date(meeting.end_time), TIMEZONE);
        
        const duration = Math.round((endZoned.getTime() - startZoned.getTime()) / 60000);
        setSelectedDuration([15, 30, 45, 60, 90, 120].includes(duration) ? duration : null);
        
        setFormData({
          title: meeting.title,
          description: meeting.description || "",
          meeting_type: meeting.meeting_type,
          start_time: format(startZoned, "yyyy-MM-dd'T'HH:mm"),
          end_time: format(endZoned, "yyyy-MM-dd'T'HH:mm"),
          location: meeting.location || "",
          google_meet_link: meeting.google_meet_link || "",
          lead_id: meeting.lead_id || "",
        });
        
        // Load client relations
        const clientIds = await fetchClientIds("meeting", meeting.id);
        setSelectedClientIds(clientIds.length > 0 ? clientIds : (meeting.client_id ? [meeting.client_id] : []));
        
        setExternalParticipants(meeting.external_participants || []);
        setSelectedParticipants(meeting.participants || []);
        setSyncToGoogleCalendar(meeting.sync_to_google_calendar ?? false);
        // Restore WhatsApp reminder fields (edit mode: full restore)
        setWhatsappReminderEnabled(meeting.whatsapp_reminder_enabled ?? false);
        setClientWhatsapp(meeting.client_whatsapp ?? "");
        setReminderHoursBefore(meeting.reminder_hours_before ?? 2);
        lastAutoFilledClientIdRef.current = null;
      } else if (duplicateFrom) {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);
        
        const startZoned = toZonedTime(new Date(duplicateFrom.start_time), TIMEZONE);
        const endZoned = toZonedTime(new Date(duplicateFrom.end_time), TIMEZONE);
        const duration = Math.round((endZoned.getTime() - startZoned.getTime()) / 60000);
        
        setFormData({
          title: duplicateFrom.title,
          description: duplicateFrom.description || "",
          meeting_type: duplicateFrom.meeting_type,
          start_time: format(now, "yyyy-MM-dd'T'HH:mm"),
          end_time: format(addMinutes(now, duration), "yyyy-MM-dd'T'HH:mm"),
          location: duplicateFrom.location || "",
          google_meet_link: "",
          lead_id: duplicateFrom.lead_id || "",
        });
        
        // Load client relations for duplicate
        const clientIds = await fetchClientIds("meeting", duplicateFrom.id);
        setSelectedClientIds(clientIds.length > 0 ? clientIds : (duplicateFrom.client_id ? [duplicateFrom.client_id] : []));
        
        setExternalParticipants(duplicateFrom.external_participants || []);
        setSelectedParticipants(duplicateFrom.participants || []);
        setSelectedDuration([15, 30, 45, 60, 90, 120].includes(duration) ? duration : null);
        setSyncToGoogleCalendar(isConnected && isSyncEnabled);
        // Guardrail 2: copy enabled + hours, but NEVER copy phone (auto-fill from current client)
        setWhatsappReminderEnabled(duplicateFrom.whatsapp_reminder_enabled ?? false);
        setClientWhatsapp("");
        setReminderHoursBefore(duplicateFrom.reminder_hours_before ?? 2);
        lastAutoFilledClientIdRef.current = null;
      } else if (prefilledDateTime) {
        const startDate = new Date(prefilledDateTime.date);
        startDate.setHours(prefilledDateTime.hour, 0, 0, 0);
        const endDate = addMinutes(startDate, selectedDuration || 60);
        
        setFormData(prev => ({
          ...prev,
          start_time: format(startDate, "yyyy-MM-dd'T'HH:mm"),
          end_time: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        }));
      } else if (open && defaultClientIds?.length) {
        resetForm();
        setSelectedClientIds(defaultClientIds);
      } else if (!open) {
        resetForm();
      }
    };
    
    loadMeetingData();
  }, [meeting, prefilledDateTime, duplicateFrom, open]);

  // Auto-fill client WhatsApp when selected client changes
  useEffect(() => {
    const realIds = separateVirtualClients(selectedClientIds).realClientIds;
    const firstClientId = realIds[0];
    if (!firstClientId) {
      lastAutoFilledClientIdRef.current = null;
      return;
    }
    if (lastAutoFilledClientIdRef.current === firstClientId) return;
    const client = clients.find((c: any) => c.id === firstClientId) as any;
    if (client && client.contact) {
      setClientWhatsapp(formatPhoneBR(client.contact));
      lastAutoFilledClientIdRef.current = firstClientId;
    } else if (client) {
      // Client selected but has no contact: clear and remember
      setClientWhatsapp("");
      lastAutoFilledClientIdRef.current = firstClientId;
    }
  }, [selectedClientIds, clients]);

  const handleDurationSelect = (minutes: number) => {
    setSelectedDuration(minutes);
    if (formData.start_time) {
      const start = new Date(formData.start_time);
      const end = addMinutes(start, minutes);
      setFormData(prev => ({
        ...prev,
        end_time: format(end, "yyyy-MM-dd'T'HH:mm"),
      }));
    }
  };

  const handleStartTimeChange = (value: string) => {
    setFormData(prev => ({ ...prev, start_time: value }));
    if (selectedDuration && value) {
      const start = new Date(value);
      const end = addMinutes(start, selectedDuration);
      setFormData(prev => ({
        ...prev,
        start_time: value,
        end_time: format(end, "yyyy-MM-dd'T'HH:mm"),
      }));
    }
  };

  const handleTemplateSelect = (template: { title: string; description: string; meeting_type: Meeting["meeting_type"]; duration: number }) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      meeting_type: template.meeting_type,
    }));
    handleDurationSelect(template.duration);
    toast.success("Template aplicado");
  };

  const generateGoogleMeetLink = () => {
    const randomCode = Math.random().toString(36).substring(2, 5) + "-" +
                       Math.random().toString(36).substring(2, 6) + "-" +
                       Math.random().toString(36).substring(2, 5);
    setFormData(prev => ({
      ...prev,
      google_meet_link: `https://meet.google.com/${randomCode}`,
    }));
    toast.success("Link Google Meet gerado");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = meetingSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    for (const participant of externalParticipants) {
      if (participant.name || participant.email) {
        const participantValidation = externalParticipantSchema.safeParse(participant);
        if (!participantValidation.success) {
          toast.error(`Participante externo: ${participantValidation.error.errors[0].message}`);
          return;
        }
      }
    }

    // Guardrail 1: WhatsApp reminder strict validation
    if (whatsappReminderEnabled && clientWhatsapp.replace(/\D/g, "").length < 10) {
      toast.error("Por favor, preencha o WhatsApp do cliente para enviar o lembrete.");
      phoneInputRef.current?.focus();
      return;
    }

    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);

    const meetingData = {
      ...formData,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      external_participants: externalParticipants.filter(p => p.name && p.email),
      participants: selectedParticipants,
      client_id: separateVirtualClients(selectedClientIds).realClientIds[0] || null,
      is_internal: separateVirtualClients(selectedClientIds).isInternal,
      lead_id: formData.lead_id || null,
      sync_to_google_calendar: syncToGoogleCalendar,
      whatsapp_reminder_enabled: whatsappReminderEnabled,
      client_whatsapp: whatsappReminderEnabled ? clientWhatsapp : null,
      reminder_hours_before: reminderHoursBefore,
    };

    try {
      if (meeting) {
        const updatedMeeting = await updateMeeting.mutateAsync({ id: meeting.id, ...meetingData });
        
        // Update client relations
        await updateClientRelations("meeting", meeting.id, separateVirtualClients(selectedClientIds).realClientIds);
        
        // Sync update to Google Calendar
        if (syncToGoogleCalendar && meeting.google_calendar_event_id) {
          const syncResult = await syncMeeting("update", {
            ...updatedMeeting,
            google_calendar_event_id: meeting.google_calendar_event_id,
          });
          if (syncResult?.synced) {
            toast.success("Reunião atualizada e sincronizada com Google Calendar");
          }
        }
      } else {
        const createdMeeting = await createMeeting.mutateAsync(meetingData);
        
        // Save client relations for new meeting
        if (createdMeeting?.id) {
          await updateClientRelations("meeting", createdMeeting.id, separateVirtualClients(selectedClientIds).realClientIds);
        }
        
        // Sync to Google Calendar after creation
        if (syncToGoogleCalendar && createdMeeting) {
          const syncResult = await syncMeeting("create", createdMeeting);
          if (syncResult?.synced) {
            toast.success("Reunião criada e sincronizada com Google Calendar");
          } else if (syncResult?.reason === "no_connection") {
            toast.info("Reunião criada. Configure a integração com Google Calendar para sincronizar.");
          }
        }
      }
    } catch (error) {
      // Error handling is done by the mutation onError
      return;
    }
    
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      meeting_type: "client",
      start_time: "",
      end_time: "",
      location: "",
      google_meet_link: "",
      lead_id: "",
    });
    setSelectedClientIds([]);
    setExternalParticipants([]);
    setSelectedParticipants([]);
    setSelectedDuration(60);
    setSyncToGoogleCalendar(isConnected && isSyncEnabled);
    setWhatsappReminderEnabled(false);
    setClientWhatsapp("");
    setReminderHoursBefore(2);
    lastAutoFilledClientIdRef.current = null;
  };

  const addExternalParticipant = () => {
    setExternalParticipants([...externalParticipants, { name: "", email: "" }]);
  };

  const removeExternalParticipant = (index: number) => {
    setExternalParticipants(externalParticipants.filter((_, i) => i !== index));
  };

  const updateExternalParticipant = (index: number, field: "name" | "email", value: string) => {
    const updated = [...externalParticipants];
    updated[index][field] = value;
    setExternalParticipants(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle>{meeting ? "Editar Reunião" : duplicateFrom ? "Duplicar Reunião" : "Nova Reunião"}</DialogTitle>
            {!meeting && !duplicateFrom && (
              <MeetingTemplateSelector onSelect={handleTemplateSelect} />
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={200}
              placeholder="Ex: Reunião de Alinhamento"
            />
          </div>

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="meeting_type">Tipo de Reunião *</Label>
            <Select
              value={formData.meeting_type}
              onValueChange={(value: Meeting["meeting_type"]) =>
                setFormData({ ...formData, meeting_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Comercial</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="internal">Interna</SelectItem>
                <SelectItem value="quick_call">Call Rápida</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="results">Resultados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={2000}
              placeholder="Pauta da reunião, objetivos..."
            />
          </div>

          {/* Client and Lead */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Clientes</Label>
              <MultiClientSelector
                clients={clients}
                selectedClientIds={selectedClientIds}
                onSelectionChange={(ids) => {
                  setSelectedClientIds(ids);
                  if (ids.length > 0) {
                    setFormData(prev => ({ ...prev, lead_id: "" }));
                  }
                }}
                placeholder="Selecionar clientes..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_id">Lead</Label>
              <Popover open={leadsPopoverOpen} onOpenChange={setLeadsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={leadsPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.lead_id
                      ? leads.find((l) => l.id === formData.lead_id)?.name
                      : "Selecione um lead..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar lead..." />
                    <CommandList>
                      <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setFormData({ ...formData, lead_id: "" });
                            setLeadsPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", !formData.lead_id ? "opacity-100" : "opacity-0")} />
                          Nenhum
                        </CommandItem>
                        {leads.map((lead) => (
                          <CommandItem
                            key={lead.id}
                            value={lead.name}
                            onSelect={() => {
                              setFormData({ ...formData, lead_id: lead.id });
                              setSelectedClientIds([]);
                              setLeadsPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.lead_id === lead.id ? "opacity-100" : "opacity-0")} />
                            {lead.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duração Rápida</Label>
            <MeetingDurationSelector
              selectedDuration={selectedDuration}
              onSelect={handleDurationSelect}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Data/Hora Início *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Data/Hora Fim *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {conflicts.length > 0 && <MeetingConflictAlert conflicts={conflicts} />}

          {/* Location and Meet Link */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Endereço ou sala"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google_meet_link">Link Google Meet</Label>
              <div className="flex gap-2">
                <Input
                  id="google_meet_link"
                  value={formData.google_meet_link}
                  onChange={(e) => setFormData({ ...formData, google_meet_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  maxLength={500}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateGoogleMeetLink}
                  title="Gerar link"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Google Calendar Sync Option */}
          {isConnected && (
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 border">
              <Checkbox
                id="sync_google_calendar"
                checked={syncToGoogleCalendar}
                onCheckedChange={(checked) => setSyncToGoogleCalendar(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="sync_google_calendar"
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  Sincronizar com Google Calendar
                </Label>
                <p className="text-xs text-muted-foreground">
                  Calendário: {calendars.find(c => c.id === selectedCalendarId)?.summary || "Principal"}
                </p>
              </div>
            </div>
          )}

          {/* Internal Participants (Team Members) */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participantes da Equipe
            </Label>
            
            <Popover open={participantsPopoverOpen} onOpenChange={setParticipantsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start text-left font-normal"
                >
                  {selectedParticipants.length > 0 
                    ? `${selectedParticipants.length} participante(s) selecionado(s)`
                    : "Selecionar participantes..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar membro da equipe..." />
                  <CommandList>
                    <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                    <CommandGroup>
                      {teamMembers
                        .filter(member => member.id !== user?.id) // Exclude current user (organizer)
                        .map((member) => (
                          <CommandItem
                            key={member.id}
                            value={member.name}
                            onSelect={() => {
                              setSelectedParticipants(prev =>
                                prev.includes(member.id)
                                  ? prev.filter(id => id !== member.id)
                                  : [...prev, member.id]
                              );
                            }}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                                selectedParticipants.includes(member.id) 
                                  ? 'bg-primary border-primary' 
                                  : 'border-muted-foreground'
                              }`}>
                                {selectedParticipants.includes(member.id) && (
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{member.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected participants badges */}
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.map(participantId => {
                  const member = teamMembers.find(m => m.id === participantId);
                  if (!member) return null;
                  return (
                    <Badge key={participantId} variant="secondary" className="gap-1 pr-1">
                      {member.name}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => setSelectedParticipants(prev => prev.filter(id => id !== participantId))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* External Participants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Participantes Externos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExternalParticipant}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {externalParticipants.map((participant, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Nome"
                  value={participant.name}
                  onChange={(e) => updateExternalParticipant(index, "name", e.target.value)}
                  maxLength={100}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={participant.email}
                  onChange={(e) => updateExternalParticipant(index, "email", e.target.value)}
                  maxLength={255}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExternalParticipant(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {externalParticipants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhum participante externo adicionado
              </p>
            )}
          </div>

          {/* WhatsApp Reminder Section */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="whatsapp-reminder" className="flex items-center gap-2 text-base font-medium">
                  <MessageCircle className="h-4 w-4 text-green-600/80" />
                  Lembrete Automático
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ative para enviar um lembrete via WhatsApp ao cliente antes da reunião.
                </p>
              </div>
              <Switch
                id="whatsapp-reminder"
                checked={whatsappReminderEnabled}
                onCheckedChange={setWhatsappReminderEnabled}
              />
            </div>

            {whatsappReminderEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="client-whatsapp">Telefone do Cliente</Label>
                  <Input
                    id="client-whatsapp"
                    ref={phoneInputRef}
                    placeholder="(11) 99999-9999"
                    value={clientWhatsapp}
                    onChange={(e) => setClientWhatsapp(formatPhoneBR(e.target.value))}
                    maxLength={15}
                    inputMode="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-hours">Avisar com antecedência</Label>
                  <Select
                    value={String(reminderHoursBefore)}
                    onValueChange={(v) => setReminderHoursBefore(Number(v))}
                  >
                    <SelectTrigger id="reminder-hours">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora antes</SelectItem>
                      <SelectItem value="2">2 horas antes</SelectItem>
                      <SelectItem value="12">12 horas antes</SelectItem>
                      <SelectItem value="24">24 horas antes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="action">
              {meeting ? "Atualizar" : "Criar"} Reunião
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
