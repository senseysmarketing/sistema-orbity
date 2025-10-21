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

export function PlatformManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [newPlatform, setNewPlatform] = useState({ name: "", icon: "📱" });

  const { data: platforms = [] } = useQuery({
    queryKey: ["social-platforms", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_platforms")
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
        .from("social_media_platforms")
        .insert({
          agency_id: currentAgency?.id,
          name: newPlatform.name,
          slug: newPlatform.name.toLowerCase().replace(/\s+/g, "_"),
          icon: newPlatform.icon,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-platforms"] });
      setNewPlatform({ name: "", icon: "📱" });
      toast.success("Plataforma adicionada");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_media_platforms")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-platforms"] });
      toast.success("Plataforma removida");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("social_media_platforms")
        .update({ is_active: isActive })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-platforms"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plataformas de Mídia Social</CardTitle>
        <CardDescription>
          Ative/desative redes sociais disponíveis para postagem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Nome da Plataforma</Label>
            <Input
              value={newPlatform.name}
              onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
              placeholder="Ex: TikTok"
            />
          </div>
          <div>
            <Label>Ícone (Emoji)</Label>
            <Input
              value={newPlatform.icon}
              onChange={(e) => setNewPlatform({ ...newPlatform, icon: e.target.value })}
              placeholder="🎵"
              maxLength={2}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newPlatform.name}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {platforms.map((platform: any) => (
            <div
              key={platform.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{platform.icon}</span>
                <span className="font-medium">{platform.name}</span>
                {platform.is_default && (
                  <span className="text-xs text-muted-foreground">(Padrão)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={platform.is_active}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: platform.id, isActive: checked })
                  }
                />
                {!platform.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(platform.id)}
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