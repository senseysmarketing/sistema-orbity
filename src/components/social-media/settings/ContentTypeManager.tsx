import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export function ContentTypeManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [newType, setNewType] = useState({ name: "", icon: "📄" });

  const { data: types = [] } = useQuery({
    queryKey: ["content-types", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_content_types")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("social_media_content_types")
        .insert({
          agency_id: currentAgency?.id,
          name: newType.name,
          slug: newType.name.toLowerCase().replace(/\s+/g, "_"),
          icon: newType.icon,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-types"] });
      setNewType({ name: "", icon: "📄" });
      toast.success("Tipo de conteúdo criado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_media_content_types")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-types"] });
      toast.success("Tipo excluído");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("social_media_content_types")
        .update({ is_active: isActive })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-types"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Conteúdo</CardTitle>
        <CardDescription>
          Adicione novos formatos além dos padrão (Feed, Stories, Reels, Carrossel)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Nome do Tipo</Label>
            <Input
              value={newType.name}
              onChange={(e) => setNewType({ ...newType, name: e.target.value })}
              placeholder="Ex: Vídeo Longo"
            />
          </div>
          <div>
            <Label>Ícone (Emoji)</Label>
            <Input
              value={newType.icon}
              onChange={(e) => setNewType({ ...newType, icon: e.target.value })}
              placeholder="📹"
              maxLength={2}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newType.name}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {types.map((type: any) => (
            <div
              key={type.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{type.icon}</span>
                <span className="font-medium">{type.name}</span>
                {type.is_default && (
                  <span className="text-xs text-muted-foreground">(Padrão)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={type.is_active}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: type.id, isActive: checked })
                  }
                />
                {!type.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(type.id)}
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