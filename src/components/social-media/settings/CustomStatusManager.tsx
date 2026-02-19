import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const colorOptions = [
  { value: "bg-gray-500", label: "Cinza" },
  { value: "bg-blue-500", label: "Azul" },
  { value: "bg-green-500", label: "Verde" },
  { value: "bg-yellow-500", label: "Amarelo" },
  { value: "bg-orange-500", label: "Laranja" },
  { value: "bg-red-500", label: "Vermelho" },
  { value: "bg-purple-500", label: "Roxo" },
  { value: "bg-pink-500", label: "Rosa" },
];

// Status padrão fixos (não existem no banco)
const defaultStatuses = [
  { id: "default-1", slug: "draft", name: "Briefing", color: "bg-gray-500", is_default: true, order_position: 0 },
  { id: "default-2", slug: "in_creation", name: "Em Criação", color: "bg-blue-500", is_default: true, order_position: 1 },
  { id: "default-3", slug: "pending_approval", name: "Aguardando Aprovação", color: "bg-yellow-500", is_default: true, order_position: 2 },
  { id: "default-4", slug: "approved", name: "Aprovado", color: "bg-green-500", is_default: true, order_position: 3 },
  { id: "default-5", slug: "published", name: "Publicado", color: "bg-purple-500", is_default: true, order_position: 4 },
];

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  order_position: number;
}

interface SortableStatusItemProps {
  status: CustomStatus;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

function SortableStatusItem({ status, onToggle, onDelete }: SortableStatusItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 border rounded-lg bg-card"
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={`h-3 w-3 rounded-full ${status.color}`} />
        <span className="font-medium">{status.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={status.is_active ?? true}
          onCheckedChange={(checked) => onToggle(status.id, checked)}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(status.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function CustomStatusManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState({ name: "", color: "bg-blue-500" });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: customStatuses = [] } = useQuery({
    queryKey: ["custom-statuses", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_custom_statuses")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .eq("is_default", false)
        .order("order_position");
      if (error) throw error;
      return (data || []) as CustomStatus[];
    },
    enabled: !!currentAgency?.id,
  });

  const invalidateStatuses = () => {
    queryClient.invalidateQueries({ queryKey: ["custom-statuses"] });
    queryClient.invalidateQueries({ queryKey: ["custom-statuses", currentAgency?.id] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("social_media_custom_statuses")
        .insert({
          agency_id: currentAgency?.id,
          name: newStatus.name,
          slug: newStatus.name.toLowerCase().replace(/\s+/g, "_"),
          color: newStatus.color,
          is_active: true,
          is_default: false,
          order_position: customStatuses.length,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateStatuses();
      setNewStatus({ name: "", color: "bg-blue-500" });
      toast.success("Status criado com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar status: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_media_custom_statuses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateStatuses();
      toast.success("Status excluído");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("social_media_custom_statuses")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateStatuses();
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; order_position: number }[]) => {
      const promises = updates.map(({ id, order_position }) =>
        supabase.from("social_media_custom_statuses").update({ order_position }).eq("id", id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      invalidateStatuses();
      toast.success("Ordem atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar ordem");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = customStatuses.findIndex((s) => s.id === active.id);
      const newIndex = customStatuses.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(customStatuses, oldIndex, newIndex);
      const updates = reordered.map((s, i) => ({ id: s.id, order_position: i }));
      reorderMutation.mutate(updates);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do Kanban</CardTitle>
        <CardDescription>
          Arraste para reordenar os status personalizados. Status padrão não podem ser excluídos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de adição */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Nome do Status</Label>
            <Input
              value={newStatus.name}
              onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
              placeholder="Ex: Em Revisão"
            />
          </div>
          <div>
            <Label>Cor</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3"
              value={newStatus.color}
              onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
            >
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newStatus.name || createMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Status padrão — fixos, sem DnD */}
        <div className="space-y-2">
          {defaultStatuses.map((status) => (
            <div
              key={status.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 flex items-center justify-center">
                  <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                </div>
                <div className={`h-3 w-3 rounded-full ${status.color}`} />
                <span className="font-medium">{status.name}</span>
                <span className="text-xs text-muted-foreground">(Padrão)</span>
              </div>
            </div>
          ))}
        </div>

        {/* Status customizados — arrastáveis */}
        {customStatuses.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={customStatuses.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {customStatuses.map((status) => (
                  <SortableStatusItem
                    key={status.id}
                    status={status}
                    onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
