import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

export type AutomationStepType =
  | "condition"
  | "send_whatsapp"
  | "send_whatsapp_media"
  | "delay"
  | "action"
  | "branch"
  | "end";

export interface AutomationStepDraft {
  id?: string;
  step_type: AutomationStepType;
  title: string;
  config: Record<string, unknown>;
}

export interface AutomationFlowDraft {
  id?: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  stop_rules: Record<string, unknown>;
  steps: AutomationStepDraft[];
}

export interface AutomationFlow extends AutomationFlowDraft {
  id: string;
  agency_id: string;
  metrics: Record<string, number | string | null>;
  created_at: string;
  updated_at: string;
  automation_steps?: Array<AutomationStepDraft & { position: number }>;
}

const db = supabase as any;

function normalizeSteps(steps: AutomationStepDraft[]) {
  return steps.map((step, index) => ({
    step_type: step.step_type,
    title: step.title || `Bloco ${index + 1}`,
    config: step.config || {},
    position: index + 1,
  }));
}

async function stopActiveExecutions(flowId: string, agencyId: string, reason: string) {
  const timestamp = new Date().toISOString();

  await db
    .from("automation_pending_actions")
    .update({ status: "cancelled", last_error: reason, updated_at: timestamp })
    .eq("flow_id", flowId)
    .eq("agency_id", agencyId)
    .in("status", ["pending", "processing"]);

  await db
    .from("automation_executions")
    .update({
      status: "stopped",
      stop_reason: reason,
      completed_at: timestamp,
      last_activity_at: timestamp,
      updated_at: timestamp,
    })
    .eq("flow_id", flowId)
    .eq("agency_id", agencyId)
    .in("status", ["running", "waiting", "paused"]);
}

export function useWhatsAppAutomationFlows() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const agencyId = currentAgency?.id;

  const queryKey = useMemo(() => ["whatsapp-automation-flows", agencyId], [agencyId]);

  const flowsQuery = useQuery({
    queryKey,
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await db
        .from("automation_flows")
        .select("*, automation_steps(*)")
        .eq("agency_id", agencyId)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .order("position", { referencedTable: "automation_steps", ascending: true });
      if (error) throw error;
      return (data || []) as AutomationFlow[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const saveFlow = useMutation({
    mutationFn: async (draft: AutomationFlowDraft) => {
      if (!agencyId) throw new Error("Agencia nao encontrada.");
      if (!draft.name.trim()) throw new Error("Informe o nome da automacao.");
      if (!draft.trigger_type) throw new Error("Selecione um gatilho.");
      if (draft.steps.length === 0) throw new Error("Adicione ao menos um bloco.");

      const flowPayload = {
        agency_id: agencyId,
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
        status: draft.status,
        trigger_type: draft.trigger_type,
        trigger_config: draft.trigger_config || {},
        stop_rules: draft.stop_rules || {},
      };

      let flowId = draft.id;
      if (flowId) {
        await stopActiveExecutions(flowId, agencyId, "flow_updated");

        const { error } = await db
          .from("automation_flows")
          .update(flowPayload)
          .eq("id", flowId)
          .eq("agency_id", agencyId);
        if (error) throw error;
        await db
          .from("automation_steps")
          .update({ is_deleted: true })
          .eq("flow_id", flowId)
          .eq("agency_id", agencyId);
      } else {
        const { data, error } = await db
          .from("automation_flows")
          .insert(flowPayload)
          .select("id")
          .single();
        if (error) throw error;
        flowId = data.id;
      }

      const steps = normalizeSteps(draft.steps).map((step) => ({
        ...step,
        flow_id: flowId,
        agency_id: agencyId,
      }));

      const { error: stepsError } = await db.from("automation_steps").insert(steps);
      if (stepsError) throw stepsError;
      return flowId;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Fluxo salvo");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar fluxo", { description: error.message });
    },
  });

  const toggleFlow = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      if (!agencyId) throw new Error("Agencia nao encontrada.");
      if (status === "inactive") {
        await stopActiveExecutions(id, agencyId, "flow_deactivated");
      }
      const { error } = await db
        .from("automation_flows")
        .update({ status })
        .eq("id", id)
        .eq("agency_id", agencyId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error("Erro ao alterar status", { description: error.message }),
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      if (!agencyId) throw new Error("Agencia nao encontrada.");
      await stopActiveExecutions(id, agencyId, "flow_deleted");
      const { error } = await db
        .from("automation_flows")
        .update({ is_deleted: true, status: "inactive", deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("agency_id", agencyId);
      if (error) throw error;
      await db
        .from("automation_steps")
        .update({ is_deleted: true })
        .eq("flow_id", id)
        .eq("agency_id", agencyId);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Fluxo excluido");
    },
    onError: (error: Error) => toast.error("Erro ao excluir fluxo", { description: error.message }),
  });

  const duplicateFlow = useMutation({
    mutationFn: async (flow: AutomationFlow) => {
      const draft: AutomationFlowDraft = {
        name: `${flow.name} - copia`,
        description: flow.description || "",
        status: "inactive",
        trigger_type: flow.trigger_type,
        trigger_config: flow.trigger_config || {},
        stop_rules: flow.stop_rules || {},
        steps: (flow.automation_steps || []).map((step) => ({
          step_type: step.step_type,
          title: step.title,
          config: step.config || {},
        })),
      };
      return await saveFlow.mutateAsync(draft);
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error("Erro ao duplicar fluxo", { description: error.message }),
  });

  return {
    agencyId,
    flows: flowsQuery.data || [],
    isLoading: flowsQuery.isLoading,
    isSaving: saveFlow.isPending,
    refetch: flowsQuery.refetch,
    saveFlow,
    toggleFlow,
    deleteFlow,
    duplicateFlow,
  };
}
