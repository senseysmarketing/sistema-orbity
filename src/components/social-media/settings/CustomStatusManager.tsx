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

export function CustomStatusManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState({ name: "", slug: "", color: "bg-blue-500" });

  const { data: statuses = [] } = useQuery({
    queryKey: ["custom-statuses", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_custom_statuses")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .order("order_position");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("social_media_custom_statuses")
        .insert({
          agency_id: currentAgency?.id,
          name: newStatus.name,
          slug: newStatus.slug || newStatus.name.toLowerCase().replace(/\s+/g, "_"),
          color: newStatus.color,
          order_position: statuses.length,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-statuses"] });
      setNewStatus({ name: "", slug: "", color: "bg-blue-500" });
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
      queryClient.invalidateQueries({ queryKey: ["custom-statuses"] });
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
      queryClient.invalidateQueries({ queryKey: ["custom-statuses"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Customizados do Kanban</CardTitle>
        <CardDescription>
          Crie colunas personalizadas para seu fluxo de trabalho
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          {statuses.map((status: any) => (
            <div
              key={status.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <div className={`h-3 w-3 rounded-full ${status.color}`} />
                <span className="font-medium">{status.name}</span>
                {status.is_default && (
                  <span className="text-xs text-muted-foreground">(Padrão)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={status.is_active}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: status.id, isActive: checked })
                  }
                />
                {!status.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(status.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}