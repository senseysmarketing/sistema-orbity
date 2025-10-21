import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

const platforms = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter" },
];

const postTypes = [
  { value: "feed", label: "Feed" },
  { value: "stories", label: "Stories" },
  { value: "reels", label: "Reels" },
  { value: "carrossel", label: "Carrossel" },
];

export function PostTemplateManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    platform: "instagram",
    post_type: "feed",
    content_template: "",
    hashtags: "",
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["post-templates", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_post_templates")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("social_media_post_templates")
        .insert({
          agency_id: currentAgency?.id,
          name: newTemplate.name,
          description: newTemplate.description,
          platform: newTemplate.platform,
          post_type: newTemplate.post_type,
          content_template: newTemplate.content_template,
          hashtags: newTemplate.hashtags.split(",").map(h => h.trim()).filter(Boolean),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-templates"] });
      setNewTemplate({
        name: "",
        description: "",
        platform: "instagram",
        post_type: "feed",
        content_template: "",
        hashtags: "",
      });
      setShowForm(false);
      toast.success("Template criado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_media_post_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-templates"] });
      toast.success("Template excluído");
    },
  });

  const copyTemplate = (template: any) => {
    navigator.clipboard.writeText(template.content_template);
    toast.success("Conteúdo copiado");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Templates de Postagem</CardTitle>
            <CardDescription>
              Crie modelos rápidos para suas postagens
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome do Template</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Ex: Post de Produto"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Breve descrição"
                />
              </div>
              <div>
                <Label>Plataforma</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={newTemplate.platform}
                  onChange={(e) => setNewTemplate({ ...newTemplate, platform: e.target.value })}
                >
                  {platforms.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Tipo de Post</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={newTemplate.post_type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, post_type: e.target.value })}
                >
                  {postTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Conteúdo do Template</Label>
              <Textarea
                value={newTemplate.content_template}
                onChange={(e) => setNewTemplate({ ...newTemplate, content_template: e.target.value })}
                placeholder="Digite o template com variáveis como {produto}, {beneficio}, etc."
                rows={4}
              />
            </div>
            <div>
              <Label>Hashtags (separadas por vírgula)</Label>
              <Input
                value={newTemplate.hashtags}
                onChange={(e) => setNewTemplate({ ...newTemplate, hashtags: e.target.value })}
                placeholder="marketing, digital, vendas"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={!newTemplate.name}>
                Salvar Template
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {templates.map((template: any) => (
            <div
              key={template.id}
              className="p-3 border rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {platforms.find(p => p.value === template.platform)?.label}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {postTypes.find(t => t.value === template.post_type)?.label}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-sm bg-muted p-2 rounded">
                {template.content_template}
              </p>
              {template.hashtags && template.hashtags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {template.hashtags.map((tag: string, i: number) => (
                    <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}