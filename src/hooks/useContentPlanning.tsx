import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "./useAgency";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface ContentPlanItem {
  id: string;
  plan_id: string;
  day_number: number | null;
  order_position: number | null;
  post_date: string | null;
  due_date: string | null;
  title: string;
  description: string | null;
  caption: string | null;
  content_type: string | null;
  format: string | null;
  platform: string | null;
  creative_instructions: string | null;
  reference_notes: string | null;
  objective: string | null;
  hashtags: string | null;
  status: string;
  task_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ContentPlan {
  id: string;
  agency_id: string;
  client_id: string;
  title: string;
  month_year: string;
  status: string;
  creation_mode: "ai" | "manual" | "imported";
  strategy_context: Json;
  ai_response: Json | null;
  depth_level: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  clients?: { name: string } | null;
  content_plan_items?: ContentPlanItem[];
}

export interface WizardData {
  clientId: string;
  clientName: string;
  niche: string;
  objectives: string[];
  strategicFocus: string;
  postsPerWeek: number;
  storiesPerWeek: number;
  includeInteractive: boolean;
  includeHolidays: boolean;
  period: "this_month" | "next_month" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  preferredDays: string[];
  dayDistribution: string;
  preferredTimes: string;
  frequencyNotes: string;
  contentTypes: string[];
  formats: string[];
  voiceTone: string;
  priorityProduct: string;
  activeOffer: string;
  hasLaunch: boolean;
  hasAds: boolean;
  targetAudience: string;
  audiencePains: string;
  depthLevel: "summary" | "detailed";
  assignedUserIds?: string[];
}

export interface AIPlanResult {
  plan_title: string;
  strategy_summary: string;
  items: {
    day_number: number;
    post_date: string;
    title: string;
    description: string;
    content_type: string;
    format: string;
    platform: string;
    creative_instructions: string;
    objective: string;
    hashtags: string;
  }[];
}

export interface ManualPlanInput {
  clientId: string;
  title: string;
  monthYear: string;
  status: "draft" | "active";
  strategyNotes?: string;
}

type EditablePlanItemFields = Pick<
  ContentPlanItem,
  | "title"
  | "description"
  | "caption"
  | "format"
  | "platform"
  | "post_date"
  | "due_date"
  | "content_type"
  | "creative_instructions"
  | "reference_notes"
  | "objective"
  | "hashtags"
  | "order_position"
>;

function sortPlanItems(items: ContentPlanItem[] = []) {
  return [...items].sort((a, b) => {
    const positionA = a.order_position ?? 9999;
    const positionB = b.order_position ?? 9999;
    if (positionA !== positionB) return positionA - positionB;
    if (!a.post_date && !b.post_date) return 0;
    if (!a.post_date) return 1;
    if (!b.post_date) return -1;
    return a.post_date.localeCompare(b.post_date);
  });
}

export function useContentPlanning() {
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["content-plans", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from("content_plans")
        .select("*, clients(name), content_plan_items(*)")
        .eq("agency_id", currentAgency.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return ((data || []) as ContentPlan[]).map((plan) => ({
        ...plan,
        creation_mode: plan.creation_mode || (plan.ai_response ? "ai" : "manual"),
        content_plan_items: sortPlanItems(plan.content_plan_items || []),
      }));
    },
    enabled: !!currentAgency?.id,
  });

  const generatePlan = async (wizardData: WizardData): Promise<AIPlanResult | null> => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: {
          type: "content_planning",
          content: JSON.stringify(wizardData),
          agency_id: currentAgency?.id,
        },
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("429")) {
          toast({ title: "Limite de requisicoes", description: "Tente novamente em alguns segundos.", variant: "destructive" });
        } else if (msg.includes("402")) {
          toast({ title: "Creditos esgotados", description: "Adicione creditos de IA ao workspace.", variant: "destructive" });
        } else {
          toast({ title: "Erro na IA", description: "Nao foi possivel gerar o planejamento.", variant: "destructive" });
        }
        return null;
      }

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return null;
      }

      return data?.result as AIPlanResult;
    } catch (e) {
      console.error("Content planning error:", e);
      toast({ title: "Erro", description: "Falha ao conectar com a IA.", variant: "destructive" });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const savePlan = async (wizardData: WizardData, aiResult: AIPlanResult): Promise<string | null> => {
    if (!currentAgency?.id || !user?.id) return null;

    try {
      let monthYear: string;
      if (wizardData.period === "next_month") {
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        monthYear = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
      } else if (wizardData.period === "custom" && wizardData.customStartDate) {
        monthYear = wizardData.customStartDate.substring(0, 7);
      } else {
        const now = new Date();
        monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      }

      const { data: plan, error: planError } = await supabase
        .from("content_plans")
        .insert({
          agency_id: currentAgency.id,
          client_id: wizardData.clientId,
          title: aiResult.plan_title,
          month_year: monthYear,
          status: "active",
          creation_mode: "ai",
          strategy_context: wizardData as unknown as Json,
          ai_response: aiResult as unknown as Json,
          depth_level: wizardData.depthLevel,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (planError) throw planError;

      if (aiResult.items?.length > 0) {
        const items = aiResult.items.map((item, index) => ({
          plan_id: plan.id,
          day_number: item.day_number,
          order_position: index,
          post_date: item.post_date,
          title: item.title,
          description: item.description,
          content_type: item.content_type,
          format: item.format,
          platform: item.platform,
          creative_instructions: item.creative_instructions,
          objective: item.objective,
          hashtags: item.hashtags,
          status: "planned",
        }));

        const { error: itemsError } = await supabase.from("content_plan_items").insert(items);
        if (itemsError) throw itemsError;
      }

      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({ title: "Planejamento salvo!", description: `${aiResult.items?.length || 0} conteudos planejados.` });
      return plan.id;
    } catch (e) {
      console.error("Save plan error:", e);
      toast({ title: "Erro", description: "Falha ao salvar o planejamento.", variant: "destructive" });
      return null;
    }
  };

  const createManualPlan = async (input: ManualPlanInput): Promise<string | null> => {
    if (!currentAgency?.id || !user?.id) return null;

    try {
      const { data: plan, error } = await supabase
        .from("content_plans")
        .insert({
          agency_id: currentAgency.id,
          client_id: input.clientId,
          title: input.title.trim(),
          month_year: input.monthYear,
          status: input.status,
          creation_mode: "manual",
          strategy_context: {
            mode: "manual",
            notes: input.strategyNotes?.trim() || null,
          } as Json,
          ai_response: null,
          depth_level: "summary",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({ title: "Planejamento manual criado", description: "Adicione os conteudos antes de criar tarefas." });
      return plan.id;
    } catch (e) {
      console.error("Create manual plan error:", e);
      toast({ title: "Erro", description: "Falha ao criar planejamento manual.", variant: "destructive" });
      return null;
    }
  };

  const createTasksFromItems = async (planId: string, selectedItemIds: string[], assignedUserIds?: string[]): Promise<boolean> => {
    if (!currentAgency?.id || !user?.id) return false;

    try {
      const { data: items, error: fetchError } = await supabase
        .from("content_plan_items")
        .select("*")
        .eq("plan_id", planId)
        .in("id", selectedItemIds)
        .is("task_id", null)
        .neq("status", "discarded");

      if (fetchError) throw fetchError;
      if (!items?.length) {
        toast({ title: "Nenhuma tarefa criada", description: "Os conteudos selecionados ja viraram tarefa ou foram descartados." });
        return false;
      }

      const { data: plan } = await supabase
        .from("content_plans")
        .select("client_id")
        .eq("id", planId)
        .single();

      if (!plan) return false;

      let createdCount = 0;
      let errorCount = 0;

      for (const item of items) {
        const description = [
          item.description,
          item.caption ? `Legenda sugerida:\n${item.caption}` : null,
          item.reference_notes ? `Referencias:\n${item.reference_notes}` : null,
        ].filter(Boolean).join("\n\n");

        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .insert({
            agency_id: currentAgency.id,
            title: item.title,
            description,
            status: "todo",
            priority: "medium",
            task_type: "redes_sociais",
            client_id: plan.client_id,
            platform: item.platform,
            post_type: item.format,
            post_date: item.post_date,
            due_date: item.due_date ?? item.post_date,
            hashtags: item.hashtags ? item.hashtags.split(",").map((h: string) => h.trim()).filter(Boolean) : null,
            creative_instructions: item.creative_instructions,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (taskError) {
          console.error("Error creating task:", taskError);
          errorCount += 1;
          continue;
        }

        if (plan.client_id) {
          const { error: tcError } = await supabase
            .from("task_clients")
            .insert({ task_id: task.id, client_id: plan.client_id });
          if (tcError) console.error("Error inserting task_client:", tcError);
        }

        if (assignedUserIds && assignedUserIds.length > 0) {
          const assignments = assignedUserIds.map((userId) => ({
            task_id: task.id,
            user_id: userId,
            assigned_by: user.id,
          }));
          const { error: assignError } = await supabase.from("task_assignments").insert(assignments);
          if (assignError) console.error("Error assigning users:", assignError);
        }

        const { error: updateError } = await supabase
          .from("content_plan_items")
          .update({ status: "task_created", task_id: task.id })
          .eq("id", item.id);

        if (updateError) {
          console.error("Error linking task to content plan item:", updateError);
          errorCount += 1;
          continue;
        }

        createdCount += 1;
      }

      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({
        title: createdCount > 0 ? "Tarefas criadas!" : "Nenhuma tarefa criada",
        description: errorCount > 0
          ? `${createdCount} tarefas criadas. ${errorCount} itens tiveram erro.`
          : `${createdCount} tarefas foram criadas a partir do planejamento.`,
      });
      return createdCount > 0;
    } catch (e) {
      console.error("Create tasks error:", e);
      toast({ title: "Erro", description: "Falha ao criar tarefas.", variant: "destructive" });
      return false;
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { error } = await supabase.from("content_plans").delete().eq("id", planId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({ title: "Planejamento excluido" });
    } catch {
      toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    }
  };

  const updatePlanItem = async (itemId: string, updates: Partial<EditablePlanItemFields>) => {
    try {
      const { error } = await supabase.from("content_plan_items").update(updates).eq("id", itemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({ title: "Item atualizado" });
      return true;
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar item.", variant: "destructive" });
      return false;
    }
  };

  const deletePlanItem = async (itemId: string) => {
    try {
      const { data: item, error: fetchError } = await supabase
        .from("content_plan_items")
        .select("task_id")
        .eq("id", itemId)
        .single();
      if (fetchError) throw fetchError;

      if (item?.task_id) {
        const { error } = await supabase
          .from("content_plan_items")
          .update({ status: "discarded" })
          .eq("id", itemId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["content-plans"] });
        toast({ title: "Item descartado", description: "A tarefa vinculada foi mantida." });
        return true;
      }

      const { error } = await supabase.from("content_plan_items").delete().eq("id", itemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({ title: "Item excluido" });
      return true;
    } catch {
      toast({ title: "Erro", description: "Falha ao excluir item.", variant: "destructive" });
      return false;
    }
  };

  const addPlanItem = async (planId: string, itemData: Partial<ContentPlanItem>) => {
    try {
      const { data: existingItems } = await supabase
        .from("content_plan_items")
        .select("order_position")
        .eq("plan_id", planId)
        .order("order_position", { ascending: false })
        .limit(1);

      const nextPosition = (existingItems?.[0]?.order_position ?? -1) + 1;

      const { error } = await supabase.from("content_plan_items").insert({
        plan_id: planId,
        title: itemData.title || "Novo conteudo",
        description: itemData.description || null,
        caption: itemData.caption || null,
        format: itemData.format || null,
        platform: itemData.platform || null,
        post_date: itemData.post_date || null,
        due_date: itemData.due_date || null,
        content_type: itemData.content_type || null,
        creative_instructions: itemData.creative_instructions || null,
        reference_notes: itemData.reference_notes || null,
        objective: itemData.objective || null,
        hashtags: itemData.hashtags || null,
        day_number: itemData.day_number || null,
        order_position: itemData.order_position ?? nextPosition,
        status: "planned",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({ title: "Item adicionado" });
      return true;
    } catch {
      toast({ title: "Erro", description: "Falha ao adicionar item.", variant: "destructive" });
      return false;
    }
  };

  const duplicatePlanItem = async (item: ContentPlanItem) => {
    return addPlanItem(item.plan_id, {
      day_number: item.day_number,
      post_date: item.post_date,
      title: `${item.title} (copia)`,
      description: item.description,
      caption: item.caption,
      content_type: item.content_type,
      format: item.format,
      platform: item.platform,
      creative_instructions: item.creative_instructions,
      reference_notes: item.reference_notes,
      objective: item.objective,
      hashtags: item.hashtags,
      status: "planned",
      task_id: null,
    });
  };

  return {
    plans,
    isLoading,
    generating,
    generatePlan,
    savePlan,
    createManualPlan,
    createTasksFromItems,
    deletePlan,
    updatePlanItem,
    deletePlanItem,
    addPlanItem,
    duplicatePlanItem,
  };
}
