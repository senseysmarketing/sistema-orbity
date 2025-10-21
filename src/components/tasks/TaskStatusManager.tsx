import { useState, useMemo } from "react";
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

export function TaskStatusManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState({ name: "", color: "bg-blue-500" });

  // Status padrão do sistema
  const defaultStatuses = [
    { id: 'default-1', slug: "todo", name: "A Fazer", color: "bg-gray-500", is_default: true, order_position: 0 },
    { id: 'default-2', slug: "in_progress", name: "Em Andamento", color: "bg-blue-500", is_default: true, order_position: 1 },
    { id: 'default-3', slug: "em_revisao", name: "Em Revisão", color: "bg-purple-500", is_default: true, order_position: 2 },
    { id: 'default-4', slug: "done", name: "Concluída", color: "bg-green-500", is_default: true, order_position: 3 },
  ];

  const { data: customStatuses = [] } = useQuery({
    queryKey: ["task-statuses", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_statuses")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .eq("is_default", false)
        .order("order_position");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  // Combinar status padrão com customizados
  const allStatuses = useMemo(() => {
    return [...defaultStatuses, ...customStatuses];
  }, [customStatuses]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("task_statuses")
        .insert({
          agency_id: currentAgency?.id,
          name: newStatus.name,
          slug: newStatus.name.toLowerCase().replace(/\s+/g, "_"),
          color: newStatus.color,
          order_position: allStatuses.length,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Colunas do Kanban</CardTitle>
        <CardDescription>
          Visualize as colunas padrão e adicione colunas personalizadas ao fluxo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Nome da Coluna</Label>
            <Input
              value={newStatus.name}
              onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
              placeholder="Ex: Em Aprovação"
            />
          </div>
          <div>
            <Label>Cor</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3"
              value={newStatus.color}
              onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
            >
              {colorOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
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

        <div className="space-y-2">
          {allStatuses.map((status: any) => (
            <div
              key={status.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {!status.is_default && (
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                )}
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
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: status.id, isActive: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(status.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}