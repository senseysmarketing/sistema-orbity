import { useState, useEffect } from "react";
import { Meeting, useMeetings } from "@/hooks/useMeetings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "@/hooks/use-toast";

interface MeetingNotesTabProps {
  meeting: Meeting;
}

export const MeetingNotesTab = ({ meeting }: MeetingNotesTabProps) => {
  const { updateMeeting } = useMeetings();
  const { currentAgency } = useAgency();
  
  const [notes, setNotes] = useState(meeting.meeting_notes || "");
  const [outcome, setOutcome] = useState(meeting.outcome || "");
  const [nextSteps, setNextSteps] = useState(meeting.next_steps || "");
  const [followUpDate, setFollowUpDate] = useState(meeting.follow_up_date || "");
  const [actionItems, setActionItems] = useState<Array<{ text: string; responsible?: string; completed: boolean }>>(
    meeting.action_items || []
  );

  const handleSave = async () => {
    await updateMeeting.mutateAsync({
      id: meeting.id,
      meeting_notes: notes,
      outcome: outcome && outcome !== "" ? (outcome as Meeting["outcome"]) : null,
      next_steps: nextSteps,
      follow_up_date: followUpDate || null,
      action_items: actionItems,
      status: "completed",
    });
  };

  const addActionItem = () => {
    setActionItems([...actionItems, { text: "", responsible: "", completed: false }]);
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const updateActionItem = (index: number, field: keyof typeof actionItems[0], value: any) => {
    const updated = [...actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setActionItems(updated);
  };

  const convertToTasks = async () => {
    if (!currentAgency?.id) return;

    try {
      const tasksToCreate = actionItems
        .filter((item) => item.text.trim() !== "")
        .map((item) => ({
          title: item.text,
          agency_id: currentAgency.id,
          client_id: meeting.client_id || null,
          status: "in_progress" as const,
          priority: "medium" as const,
          created_by: meeting.organizer_id,
        }));

      const { error } = await supabase.from("tasks").insert(tasksToCreate);

      if (error) throw error;

      toast({
        title: "Tarefas criadas",
        description: `${tasksToCreate.length} tarefa(s) criada(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar tarefas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <Label htmlFor="notes">Anotações da Reunião</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder="Principais pontos discutidos, decisões tomadas..."
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Action Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addActionItem}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {actionItems.map((item, index) => (
          <div key={index} className="flex gap-2 items-start">
            <Checkbox
              checked={item.completed}
              onCheckedChange={(checked) => updateActionItem(index, "completed", checked)}
            />
            <Input
              placeholder="Descrição da ação"
              value={item.text}
              onChange={(e) => updateActionItem(index, "text", e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeActionItem(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {actionItems.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={convertToTasks}
            className="w-full mt-2"
          >
            Converter em Tarefas
          </Button>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="outcome">Resultado</Label>
          <Select value={outcome || "none"} onValueChange={(value) => setOutcome(value === "none" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              <SelectItem value="win">Ganho</SelectItem>
              <SelectItem value="loss">Perda</SelectItem>
              <SelectItem value="follow_up_needed">Precisa Follow-up</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="follow_up_date">Data de Follow-up</Label>
          <Input
            id="follow_up_date"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="next_steps">Próximos Passos</Label>
        <Textarea
          id="next_steps"
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          rows={3}
          placeholder="O que precisa ser feito após esta reunião..."
        />
      </div>

      <Button onClick={handleSave} className="w-full" variant="action">
        <Save className="h-4 w-4 mr-2" />
        Salvar Ata da Reunião
      </Button>
    </div>
  );
};
