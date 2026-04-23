import { useState, useMemo, useEffect } from "react";
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

const DEFAULT_STATUSES = [
  { slug: "todo", name: "A Fazer", color: "bg-gray-500", order_position: 0 },
  { slug: "in_progress", name: "Em Andamento", color: "bg-blue-500", order_position: 1 },
  { slug: "em_revisao", name: "Em Revisão", color: "bg-purple-500", order_position: 2 },
  { slug: "approved", name: "Aprovado", color: "bg-emerald-500", order_position: 3 },
  { slug: "done", name: "Concluída", color: "bg-green-500", order_position: 4 },
];

interface StatusItem {
  id: string;
  slug: string;
  name: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  order_position: number;
}

function SortableStatusItem({
  status,
  onToggle,
  onDelete,
}: {
  status: StatusItem;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
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
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={`h-3 w-3 rounded-full ${status.color}`} />
        <span className="font-medium">{status.name}</span>
        {status.is_default && (
          <span className="text-xs text-muted-foreground">(Padrão)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!status.is_default && (
          <>
            <Switch
              checked={status.is_active}
              onCheckedChange={(checked) => onToggle(status.id, checked)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(status.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function TaskStatusManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState({
    name: "",
    color: "bg-blue-500",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Buscar todos os status (incluindo padrão) do banco
  const { data: dbStatuses = [], isLoading } = useQuery({
    queryKey: ["task-statuses-all", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_statuses")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .order("order_position");
      if (error) throw error;
      return data as StatusItem[];
    },
    enabled: !!currentAgency?.id,
  });

  // Inicializar status padrão no banco se não existirem (e migrar 'approved')
  const initializeDefaultsMutation = useMutation({
    mutationFn: async () => {
      const existingDefaults = dbStatuses.filter((s) => s.is_default);
      const existingSlugs = existingDefaults.map((s) => s.slug);
      const missingDefaults = DEFAULT_STATUSES.filter(
        (d) => !existingSlugs.includes(d.slug)
      );

      // Caso especial: se 'approved' está faltando mas 'done' existe,
      // re-numerar para inserir 'approved' entre 'em_revisao' e 'done'.
      const needsApprovedSeed =
        !existingSlugs.includes("approved") && existingSlugs.includes("done");

      if (needsApprovedSeed) {
        const doneRow = existingDefaults.find((s) => s.slug === "done");
        if (doneRow) {
          await supabase
            .from("task_statuses")
            .update({ order_position: 4 })
            .eq("id", doneRow.id);
        }
      }

      if (missingDefaults.length === 0) return;

      const { error } = await supabase.from("task_statuses").insert(
        missingDefaults.map((d) => ({
          agency_id: currentAgency?.id,
          slug: d.slug,
          name: d.name,
          color: d.color,
          is_default: true,
          is_active: true,
          order_position: d.order_position,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-statuses-all"] });
      queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
    },
  });

  // Inicializar defaults quando carregar
  useEffect(() => {
    if (currentAgency?.id && !isLoading && dbStatuses.length === 0) {
      initializeDefaultsMutation.mutate();
    } else if (
      currentAgency?.id &&
      !isLoading &&
      dbStatuses.filter((s) => s.is_default).length < DEFAULT_STATUSES.length
    ) {
      initializeDefaultsMutation.mutate();
    }
  }, [currentAgency?.id, isLoading, dbStatuses.length]);

  const allStatuses = useMemo(() => {
    return [...dbStatuses].sort((a, b) => a.order_position - b.order_position);
  }, [dbStatuses]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(...allStatuses.map((s) => s.order_position), -1);
      const { error } = await supabase.from("task_statuses").insert({
        agency_id: currentAgency?.id,
        name: newStatus.name,
        slug: newStatus.name.toLowerCase().replace(/\s+/g, "_"),
        color: newStatus.color,
        is_default: false,
        is_active: true,
        order_position: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-statuses-all"] });
      queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
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
        .from("task_statuses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-statuses-all"] });
      queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
      toast.success("Status excluído");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("task_statuses")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-statuses-all"] });
      queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; order_position: number }[]) => {
      const promises = updates.map(({ id, order_position }) =>
        supabase
          .from("task_statuses")
          .update({ order_position })
          .eq("id", id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-statuses-all"] });
      queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
      toast.success("Ordem atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar ordem");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = allStatuses.findIndex((s) => s.id === active.id);
      const newIndex = allStatuses.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(allStatuses, oldIndex, newIndex);
      const updates = reordered.map((status, index) => ({
        id: status.id,
        order_position: index,
      }));

      reorderMutation.mutate(updates);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status do Kanban</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do Kanban</CardTitle>
        <CardDescription>
          Arraste para reordenar as colunas. Status padrão não podem ser excluídos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Nome da Coluna</Label>
            <Input
              value={newStatus.name}
              onChange={(e) =>
                setNewStatus({ ...newStatus, name: e.target.value })
              }
              placeholder="Ex: Em Aprovação"
            />
          </div>
          <div>
            <Label>Cor</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3"
              value={newStatus.color}
              onChange={(e) =>
                setNewStatus({ ...newStatus, color: e.target.value })
              }
            >
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newStatus.name}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allStatuses.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {allStatuses.map((status) => (
                <SortableStatusItem
                  key={status.id}
                  status={status}
                  onToggle={(id, isActive) =>
                    toggleMutation.mutate({ id, isActive })
                  }
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}
