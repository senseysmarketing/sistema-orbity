import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "./useAgency";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface ContentPlanItem {
  id: string;
  plan_id: string;
  day_number: number | null;
  post_date: string | null;
  title: string;
  description: string | null;
  content_type: string | null;
  format: string | null;
  platform: string | null;
  creative_instructions: string | null;
  objective: string | null;
  hashtags: string | null;
  status: string;
  task_id: string | null;
  created_at: string;
}

export interface ContentPlan {
  id: string;
  agency_id: string;
  client_id: string;
  title: string;
  month_year: string;
  status: string;
  strategy_context: any;
  ai_response: any;
  depth_level: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  clients?: { name: string } | null;
  content_plan_items?: ContentPlanItem[];
}

export interface WizardData {
  // Step 1 - Context
  clientId: string;
  clientName: string;
  niche: string;
  objectives: string[];
  strategicFocus: string;
  // Step 2 - Frequency
  postsPerWeek: number;
  storiesPerWeek: number;
  includeReels: boolean;
  includeInteractive: boolean;
  includeHolidays: boolean;
  period: "this_month" | "next_month" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  // Step 3 - Style
  contentTypes: string[];
  formats: string[];
  voiceTone: string;
  // Step 4 - Strategy
  priorityProduct: string;
  activeOffer: string;
  hasLaunch: boolean;
  hasAds: boolean;
  targetAudience: string;
  audiencePains: string;
  // Step 5 - Depth
  depthLevel: "summary" | "detailed";
  // Assigned users
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
      return (data || []) as ContentPlan[];
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
          toast({ title: "Limite de requisições", description: "Tente novamente em alguns segundos.", variant: "destructive" });
        } else if (msg.includes("402")) {
          toast({ title: "Créditos esgotados", description: "Adicione créditos de IA ao workspace.", variant: "destructive" });
        } else {
          toast({ title: "Erro na IA", description: "Não foi possível gerar o planejamento.", variant: "destructive" });
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
      // Determine month_year
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
          strategy_context: wizardData as any,
          ai_response: aiResult as any,
          depth_level: wizardData.depthLevel,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (planError) throw planError;

      // Insert items
      if (aiResult.items?.length > 0) {
        const items = aiResult.items.map((item) => ({
          plan_id: plan.id,
          day_number: item.day_number,
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

        const { error: itemsError } = await supabase
          .from("content_plan_items")
          .insert(items);

        if (itemsError) throw itemsError;
      }

      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({ title: "Planejamento salvo!", description: `${aiResult.items?.length || 0} conteúdos planejados.` });
      return plan.id;
    } catch (e) {
      console.error("Save plan error:", e);
      toast({ title: "Erro", description: "Falha ao salvar o planejamento.", variant: "destructive" });
      return null;
    }
  };

  const createTasksFromItems = async (planId: string, selectedItemIds: string[], assignedUserIds?: string[]): Promise<boolean> => {
    if (!currentAgency?.id || !user?.id) return false;

    try {
      // Fetch selected items
      const { data: items, error: fetchError } = await supabase
        .from("content_plan_items")
        .select("*")
        .eq("plan_id", planId)
        .in("id", selectedItemIds);

      if (fetchError) throw fetchError;
      if (!items?.length) return false;

      // Get plan for client_id
      const { data: plan } = await supabase
        .from("content_plans")
        .select("client_id")
        .eq("id", planId)
        .single();

      if (!plan) return false;

      // Create tasks for each item
      for (const item of items) {
        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .insert({
            agency_id: currentAgency.id,
            title: item.title,
            description: item.description || "",
            status: "todo",
            priority: "medium",
            task_type: "redes_sociais",
            client_id: plan.client_id,
            platform: item.platform,
            post_type: item.format,
            post_date: item.post_date,
            hashtags: item.hashtags ? item.hashtags.split(",").map((h: string) => h.trim()) : null,
            creative_instructions: item.creative_instructions,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (taskError) {
          console.error("Error creating task:", taskError);
          continue;
        }

        // Insert into task_clients join table
        if (plan.client_id) {
          const { error: tcError } = await supabase
            .from("task_clients")
            .insert({ task_id: task.id, client_id: plan.client_id });
          if (tcError) console.error("Error inserting task_client:", tcError);
        }

        // Assign users to the task
        if (assignedUserIds && assignedUserIds.length > 0) {
          const assignments = assignedUserIds.map((userId) => ({
            task_id: task.id,
            user_id: userId,
            assigned_by: user.id,
          }));
          const { error: assignError } = await supabase
            .from("task_assignments")
            .insert(assignments);
          if (assignError) {
            console.error("Error assigning users:", assignError);
          }
        }

        // Update item with task reference
        await supabase
          .from("content_plan_items")
          .update({ status: "task_created", task_id: task.id })
          .eq("id", item.id);
      }

      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast({ title: "Tarefas criadas!", description: `${items.length} tarefas foram criadas a partir do planejamento.` });
      return true;
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
      toast({ title: "Planejamento excluído" });
    } catch {
      toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    }
  };

  return {
    plans,
    isLoading,
    generating,
    generatePlan,
    savePlan,
    createTasksFromItems,
    deletePlan,
  };
}
