import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Meeting, useMeetings } from "@/hooks/useMeetings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting;
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

export const MeetingFormDialog = ({ open, onOpenChange, meeting }: MeetingFormDialogProps) => {
  const { createMeeting, updateMeeting } = useMeetings();
  const { currentAgency } = useAgency();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    meeting_type: "client" as Meeting["meeting_type"],
    start_time: "",
    end_time: "",
    location: "",
    google_meet_link: "",
    client_id: "",
    lead_id: "",
  });

  const [externalParticipants, setExternalParticipants] = useState<Array<{ name: string; email: string }>>([]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("agency_id", currentAgency.id)
        .eq("active", true);
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, name")
        .eq("agency_id", currentAgency.id);
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title,
        description: meeting.description || "",
        meeting_type: meeting.meeting_type,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        location: meeting.location || "",
        google_meet_link: meeting.google_meet_link || "",
        client_id: meeting.client_id || "",
        lead_id: meeting.lead_id || "",
      });
      setExternalParticipants(meeting.external_participants || []);
    }
  }, [meeting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = meetingSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Validate external participants
    for (const participant of externalParticipants) {
      if (participant.name || participant.email) {
        const participantValidation = externalParticipantSchema.safeParse(participant);
        if (!participantValidation.success) {
          toast.error(`Participante externo: ${participantValidation.error.errors[0].message}`);
          return;
        }
      }
    }

    const meetingData = {
      ...formData,
      external_participants: externalParticipants.filter(p => p.name && p.email),
      client_id: formData.client_id || null,
      lead_id: formData.lead_id || null,
    };

    if (meeting) {
      await updateMeeting.mutateAsync({ id: meeting.id, ...meetingData });
    } else {
      await createMeeting.mutateAsync(meetingData);
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
      client_id: "",
      lead_id: "",
    });
    setExternalParticipants([]);
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
        <DialogHeader>
          <DialogTitle>{meeting ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={200}
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Data/Hora Início *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
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

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value, lead_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_id">Lead</Label>
              <Select
                value={formData.lead_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, lead_id: value === "none" ? "" : value, client_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              <Input
                id="google_meet_link"
                value={formData.google_meet_link}
                onChange={(e) => setFormData({ ...formData, google_meet_link: e.target.value })}
                placeholder="https://meet.google.com/..."
                maxLength={500}
              />
            </div>
          </div>

          <div className="space-y-2">
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
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