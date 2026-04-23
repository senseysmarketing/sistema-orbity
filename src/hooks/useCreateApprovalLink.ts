import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CandidateBatchTask {
  id: string;
  title: string;
}

export interface CreateApprovalLinkResult {
  url: string;
  token: string;
  expiresAt: string;
  taskIds: string[];
}

interface UseCreateApprovalLinkReturn {
  /** Looks up other revision/rejected tasks for the same client. */
  findBatchCandidates: (currentTaskId: string, clientId: string | null) => Promise<CandidateBatchTask[]>;
  /** Creates the approval link for the given task ids. Copies URL to clipboard. */
  createLink: (taskIds: string[]) => Promise<CreateApprovalLinkResult | null>;
  isCreating: boolean;
}

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

export function useCreateApprovalLink(): UseCreateApprovalLinkReturn {
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const findBatchCandidates = useCallback(
    async (currentTaskId: string, clientId: string | null): Promise<CandidateBatchTask[]> => {
      if (!currentAgency?.id || !clientId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, is_rejected, attachments")
        .eq("agency_id", currentAgency.id)
        .eq("client_id", clientId)
        .neq("id", currentTaskId)
        .or("status.eq.em_revisao,is_rejected.eq.true");

      if (error) {
        console.error("findBatchCandidates error", error);
        return [];
      }

      // Only batch tasks that have at least one attachment (otherwise the
      // client has nothing to approve).
      return (data ?? [])
        .filter((t: any) => Array.isArray(t.attachments) && t.attachments.length > 0)
        .map((t: any) => ({ id: t.id, title: t.title }));
    },
    [currentAgency?.id]
  );

  const createLink = useCallback(
    async (taskIds: string[]): Promise<CreateApprovalLinkResult | null> => {
      if (!currentAgency?.id) {
        toast.error("Agência não identificada.");
        return null;
      }
      if (taskIds.length === 0) {
        toast.error("Selecione ao menos uma tarefa.");
        return null;
      }

      setIsCreating(true);
      try {
        const token = (crypto as any).randomUUID
          ? (crypto as any).randomUUID().replace(/-/g, "")
          : Array.from(crypto.getRandomValues(new Uint8Array(24)))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");

        const expiresAt = new Date(Date.now() + FIFTEEN_DAYS_MS).toISOString();

        // 1) Create the approval row
        const { data: approval, error: insertErr } = await supabase
          .from("task_approvals")
          .insert({
            agency_id: currentAgency.id,
            token,
            status: "pending",
            created_by: user?.id ?? null,
            expires_at: expiresAt,
          })
          .select("id, token, expires_at")
          .single();

        if (insertErr || !approval) {
          throw insertErr ?? new Error("Falha ao criar aprovação.");
        }

        // 2) Insert items in batch
        const items = taskIds.map((taskId) => ({
          approval_id: approval.id,
          task_id: taskId,
        }));
        const { error: itemsErr } = await supabase
          .from("task_approval_items")
          .insert(items);
        if (itemsErr) throw itemsErr;

        // 3) Reset rejection flags on the included tasks
        const { error: resetErr } = await supabase
          .from("tasks")
          .update({ is_rejected: false, client_feedback: null })
          .in("id", taskIds);
        if (resetErr) {
          console.error("approval reset error", resetErr);
        }

        // 4) Optimistic invalidation
        queryClient.invalidateQueries({ queryKey: ["tasks"] });

        const url = `${window.location.origin}/approve/${approval.token}`;

        // 5) Copy to clipboard
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copiado — válido por 15 dias.", {
            description: url,
          });
        } catch {
          toast.success("Link gerado. Copie manualmente abaixo.", {
            description: url,
          });
        }

        return {
          url,
          token: approval.token,
          expiresAt: approval.expires_at,
          taskIds,
        };
      } catch (err: any) {
        console.error("createLink error", err);
        toast.error("Erro ao gerar link de aprovação.", {
          description: err?.message ?? "Tente novamente.",
        });
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [currentAgency?.id, user?.id, queryClient]
  );

  return { findBatchCandidates, createLink, isCreating };
}
