import { useState, useEffect, useCallback, useRef } from "react";
import { Meeting, useMeetings } from "@/hooks/useMeetings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, CalendarPlus, ListTodo, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ActionItemRow } from "./ActionItemRow";
import { MeetingNotesTemplates } from "./MeetingNotesTemplates";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";

interface ActionItem {
  text: string;
  responsible?: string;
  deadline?: string;
  completed: boolean;
}

interface MeetingNotesTabProps {
  meeting: Meeting;
  onTabChange?: (tab: string) => void;
}

export const MeetingNotesTab = ({ meeting, onTabChange }: MeetingNotesTabProps) => {
  const { updateMeeting } = useMeetings();
  const { currentAgency } = useAgency();
  
  const [notes, setNotes] = useState(meeting.meeting_notes || "");
  const [outcome, setOutcome] = useState(meeting.outcome || "");
  const [nextSteps, setNextSteps] = useState(meeting.next_steps || "");
  const [followUpDate, setFollowUpDate] = useState(meeting.follow_up_date || "");
  const [actionItems, setActionItems] = useState<ActionItem[]>(
    (meeting.action_items as ActionItem[]) || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch agency members for responsible assignment
  const { data: agencyMembers = [] } = useQuery({
    queryKey: ["agency-members", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("agency_users")
        .select("user_id, profiles!agency_users_user_id_fkey(name)")
        .eq("agency_id", currentAgency.id);
      
      return (data || []).map((item: any) => ({
        user_id: item.user_id,
        name: item.profiles?.name || "Usuário",
      }));
    },
    enabled: !!currentAgency?.id,
  });

  // Mark changes when data changes
  useEffect(() => {
    const hasNoteChanges = notes !== (meeting.meeting_notes || "");
    const hasOutcomeChanges = outcome !== (meeting.outcome || "");
    const hasNextStepsChanges = nextSteps !== (meeting.next_steps || "");
    const hasFollowUpChanges = followUpDate !== (meeting.follow_up_date || "");
    const hasActionItemChanges = JSON.stringify(actionItems) !== JSON.stringify(meeting.action_items || []);
    
    setHasChanges(hasNoteChanges || hasOutcomeChanges || hasNextStepsChanges || hasFollowUpChanges || hasActionItemChanges);
  }, [notes, outcome, nextSteps, followUpDate, actionItems, meeting]);

  // Auto-save after 30 seconds of changes
  useEffect(() => {
    if (hasChanges) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      autoSaveTimer.current = setTimeout(() => {
        handleSave(true);
      }, 30000);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [hasChanges, notes, outcome, nextSteps, followUpDate, actionItems]);

  const handleSave = async (isAutoSave = false) => {
    setIsSaving(true);
    try {
      await updateMeeting.mutateAsync({
        id: meeting.id,
        meeting_notes: notes,
        outcome: outcome && outcome !== "" ? (outcome as Meeting["outcome"]) : null,
        next_steps: nextSteps,
        follow_up_date: followUpDate || null,
        action_items: actionItems,
        status: "completed",
      });
      setLastSaved(new Date());
      setHasChanges(false);
      if (!isAutoSave) {
        toast({
          title: "Ata salva",
          description: "A ata da reunião foi salva com sucesso.",
        });
      }
    } catch (error) {
      if (!isAutoSave) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar a ata.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const addActionItem = () => {
    setActionItems([...actionItems, { text: "", responsible: "", deadline: "", completed: false }]);
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const updateActionItem = (index: number, field: keyof ActionItem, value: any) => {
    const updated = [...actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setActionItems(updated);
  };

  const handleTemplateSelect = (content: string) => {
    setNotes(prev => prev ? `${prev}\n\n${content}` : content);
    toast({
      title: "Template aplicado",
      description: "O template foi adicionado às anotações.",
    });
  };

  const convertToTasks = async () => {
    if (!currentAgency?.id) return;

    const incompleteItems = actionItems.filter((item) => item.text.trim() !== "" && !item.completed);
    
    if (incompleteItems.length === 0) {
      toast({
        title: "Nenhuma tarefa para criar",
        description: "Adicione action items não concluídos para converter em tarefas.",
      });
      return;
    }

    try {
      const tasksToCreate = incompleteItems.map((item) => ({
        title: item.text,
        agency_id: currentAgency.id,
        client_id: meeting.client_id || null,
        status: "todo" as const,
        priority: "medium" as const,
        created_by: meeting.organizer_id,
        due_date: item.deadline || null,
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

  const createFollowUpMeeting = () => {
    // This would typically open the form with prefilled data
    // For now, we just show a message
    if (followUpDate) {
      onTabChange?.("info");
      toast({
        title: "Agendar Follow-up",
        description: `Use o botão "Duplicar" nas ações rápidas para criar uma nova reunião na data de follow-up (${format(new Date(followUpDate), "dd/MM/yyyy")}).`,
      });
    } else {
      toast({
        title: "Defina uma data",
        description: "Selecione uma data de follow-up primeiro.",
      });
    }
  };

  const suggestFollowUpDates = [
    { label: "Amanhã", date: addDays(new Date(), 1) },
    { label: "Em 3 dias", date: addDays(new Date(), 3) },
    { label: "Em 1 semana", date: addDays(new Date(), 7) },
    { label: "Em 2 semanas", date: addDays(new Date(), 14) },
  ];

  const completedCount = actionItems.filter(i => i.completed).length;

  return (
    <div className="space-y-6 py-4">
      {/* Save Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <>
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Salvando...</span>
            </>
          ) : hasChanges ? (
            <>
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Alterações não salvas</span>
            </>
          ) : lastSaved ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Salvo às {format(lastSaved, "HH:mm")}</span>
            </>
          ) : null}
        </div>
        <MeetingNotesTemplates onSelect={handleTemplateSelect} />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Anotações da Reunião</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          placeholder="Principais pontos discutidos, decisões tomadas..."
          className="font-mono text-sm"
        />
      </div>

      <Separator />

      {/* Action Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label>Action Items</Label>
            {actionItems.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{actionItems.length} concluídos
              </Badge>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addActionItem}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {actionItems.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-2 text-xs text-muted-foreground font-medium">
              <div className="col-span-1"></div>
              <div className="col-span-4">Ação</div>
              <div className="col-span-3">Responsável</div>
              <div className="col-span-3">Prazo</div>
              <div className="col-span-1"></div>
            </div>
            {actionItems.map((item, index) => (
              <ActionItemRow
                key={index}
                item={item}
                index={index}
                agencyMembers={agencyMembers}
                onUpdate={updateActionItem}
                onRemove={removeActionItem}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum action item adicionado
          </p>
        )}

        {actionItems.some(i => i.text && !i.completed) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={convertToTasks}
            className="w-full"
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Converter {actionItems.filter(i => i.text && !i.completed).length} item(ns) em Tarefas
          </Button>
        )}
      </div>

      <Separator />

      {/* Outcome and Follow-up */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="outcome">Resultado</Label>
          <Select value={outcome || "none"} onValueChange={(value) => setOutcome(value === "none" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              <SelectItem value="win">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Ganho
                </span>
              </SelectItem>
              <SelectItem value="loss">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Perda
                </span>
              </SelectItem>
              <SelectItem value="follow_up_needed">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  Precisa Follow-up
                </span>
              </SelectItem>
              <SelectItem value="pending">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                  Pendente
                </span>
              </SelectItem>
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
          <div className="flex flex-wrap gap-1">
            {suggestFollowUpDates.map((suggestion) => (
              <Button
                key={suggestion.label}
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setFollowUpDate(format(suggestion.date, "yyyy-MM-dd"))}
              >
                {suggestion.label}
              </Button>
            ))}
          </div>
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

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => handleSave(false)} className="flex-1" variant="action" disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Ata da Reunião"}
        </Button>
        {followUpDate && (
          <Button onClick={createFollowUpMeeting} variant="outline">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Agendar Follow-up
          </Button>
        )}
      </div>
    </div>
  );
};
