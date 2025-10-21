import { useState, useMemo } from "react";
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

  // Tipos de conteúdo padrão do sistema
  const defaultContentTypes = [
    { slug: 'feed', name: 'Feed', icon: '📱', is_default: true },
    { slug: 'stories', name: 'Stories', icon: '📖', is_default: true },
    { slug: 'reels', name: 'Reels', icon: '🎬', is_default: true },
    { slug: 'carrossel', name: 'Carrossel', icon: '🎠', is_default: true },
    { slug: 'video', name: 'Vídeo', icon: '🎥', is_default: true },
  ];

  const { data: customTypes = [] } = useQuery({
    queryKey: ["content-types", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_content_types")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .eq("is_default", false)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  // Buscar configurações de tipos padrão
  const { data: defaultTypeSettings = [] } = useQuery({
    queryKey: ["default-content-type-settings", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_content_types")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .eq("is_default", true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  // Combinar tipos padrão com configurações
  const allContentTypes = useMemo(() => {
    const typesWithSettings = defaultContentTypes.map(defaultType => {
      const setting = defaultTypeSettings.find((s: any) => s.slug === defaultType.slug);
      return {
        ...defaultType,
        id: setting?.id,
        is_active: setting?.is_active ?? true,
        agency_id: currentAgency?.id,
      };
    });
    return [...typesWithSettings, ...customTypes];
  }, [defaultTypeSettings, customTypes, currentAgency?.id]);

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
    mutationFn: async ({ id, slug, isActive, isDefault }: { id?: string; slug: string; isActive: boolean; isDefault: boolean }) => {
      if (id) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from("social_media_content_types")
          .update({ is_active: isActive })
          .eq("id", id);
        
        if (error) throw error;
      } else {
        // Criar nova configuração para tipo padrão
        const defaultType = defaultContentTypes.find(p => p.slug === slug);
        if (!defaultType || !currentAgency?.id) return;
        
        const { error } = await supabase
          .from("social_media_content_types")
          .insert({
            agency_id: currentAgency.id,
            slug: defaultType.slug,
            name: defaultType.name,
            icon: defaultType.icon,
            is_default: true,
            is_active: isActive,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-types"] });
      queryClient.invalidateQueries({ queryKey: ["default-content-type-settings"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Conteúdo</CardTitle>
        <CardDescription>
          Ative/desative tipos de conteúdo padrão ou adicione novos formatos personalizados
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
          {allContentTypes.map((type: any) => (
            <div
              key={type.slug}
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
                    toggleMutation.mutate({ 
                      id: type.id, 
                      slug: type.slug,
                      isActive: checked,
                      isDefault: type.is_default 
                    })
                  }
                />
                {!type.is_default && type.id && (
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