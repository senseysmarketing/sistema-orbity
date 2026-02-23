import { useState, useEffect } from "react";
import { Sparkles, RotateCcw, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TASK_PROMPT =
  "Você é um assistente de agência de marketing digital. Gere um título conciso e uma descrição profissional, estruturada e sem erros de gramática para a tarefa descrita.";

const DEFAULT_POST_PROMPT =
  "Você é um social media manager profissional. Gere uma legenda envolvente, profissional e adaptada para a plataforma sugerida. Inclua hashtags relevantes.";

interface PromptState {
  value: string;
  saved: string;
  loading: boolean;
  dirty: boolean;
}

export function AISettingsManager() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const [taskPrompt, setTaskPrompt] = useState<PromptState>({ value: "", saved: "", loading: true, dirty: false });
  const [postPrompt, setPostPrompt] = useState<PromptState>({ value: "", saved: "", loading: true, dirty: false });

  useEffect(() => {
    if (!currentAgency?.id) return;
    fetchPrompts();
  }, [currentAgency?.id]);

  const fetchPrompts = async () => {
    if (!currentAgency?.id) return;

    const { data, error } = await supabase
      .from("agency_ai_prompts" as any)
      .select("prompt_type, custom_prompt")
      .eq("agency_id", currentAgency.id);

    if (error) {
      console.error("Error fetching AI prompts:", error);
    }

    const prompts = (data as any[]) || [];
    const taskP = prompts.find((p) => p.prompt_type === "task")?.custom_prompt || "";
    const postP = prompts.find((p) => p.prompt_type === "post")?.custom_prompt || "";

    setTaskPrompt({ value: taskP, saved: taskP, loading: false, dirty: false });
    setPostPrompt({ value: postP, saved: postP, loading: false, dirty: false });
  };

  const savePrompt = async (type: "task" | "post", value: string) => {
    if (!currentAgency?.id) return;

    const setter = type === "task" ? setTaskPrompt : setPostPrompt;
    setter((prev) => ({ ...prev, loading: true }));

    try {
      if (!value.trim()) {
        // Delete if empty (revert to default)
        await supabase
          .from("agency_ai_prompts" as any)
          .delete()
          .eq("agency_id", currentAgency.id)
          .eq("prompt_type", type);

        setter({ value: "", saved: "", loading: false, dirty: false });
      } else {
        // Upsert
        const { error } = await supabase
          .from("agency_ai_prompts" as any)
          .upsert(
            {
              agency_id: currentAgency.id,
              prompt_type: type,
              custom_prompt: value.trim(),
            },
            { onConflict: "agency_id,prompt_type" }
          );

        if (error) throw error;
        setter({ value: value.trim(), saved: value.trim(), loading: false, dirty: false });
      }

      toast({
        title: "Prompt salvo!",
        description: `O prompt de ${type === "task" ? "tarefas" : "posts"} foi atualizado.`,
      });
    } catch (error: any) {
      console.error("Error saving prompt:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      setter((prev) => ({ ...prev, loading: false }));
    }
  };

  const restoreDefault = (type: "task" | "post") => {
    const setter = type === "task" ? setTaskPrompt : setPostPrompt;
    setter((prev) => ({ ...prev, value: "", dirty: prev.saved !== "" }));
  };

  const renderCard = (
    type: "task" | "post",
    title: string,
    description: string,
    placeholder: string,
    state: PromptState,
    setState: React.Dispatch<React.SetStateAction<PromptState>>
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Prompt personalizado</Label>
          <Textarea
            value={state.value}
            onChange={(e) => setState((prev) => ({ ...prev, value: e.target.value, dirty: e.target.value !== prev.saved }))}
            placeholder={placeholder}
            rows={6}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">
            {state.value
              ? "A IA usará este prompt personalizado + instruções técnicas obrigatórias."
              : "Usando o prompt padrão. Personalize para adaptar ao tom de voz e nicho da sua agência."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => savePrompt(type, state.value)}
            disabled={state.loading || !state.dirty}
            size="sm"
          >
            {state.loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
          <Button
            variant="outline"
            onClick={() => restoreDefault(type)}
            disabled={state.loading || (!state.value && !state.saved)}
            size="sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          Configurações de IA
        </h2>
        <p className="text-sm text-muted-foreground">
          Personalize os prompts usados pela IA ao pré-preencher tarefas e posts. As instruções técnicas (idioma, formato de resposta) são mantidas automaticamente.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {renderCard(
          "task",
          "Prompt para Tarefas",
          "Personaliza como a IA gera títulos, descrições e prioridades de tarefas.",
          DEFAULT_TASK_PROMPT,
          taskPrompt,
          setTaskPrompt
        )}
        {renderCard(
          "post",
          "Prompt para Posts",
          "Personaliza como a IA gera legendas, hashtags e tipo de conteúdo para redes sociais.",
          DEFAULT_POST_PROMPT,
          postPrompt,
          setPostPrompt
        )}
      </div>
    </div>
  );
}
