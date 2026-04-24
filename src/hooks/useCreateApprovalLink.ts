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
  reused?: boolean;
}

interface UseCreateApprovalLinkReturn {
  /** Looks up other revision/rejected tasks for the same client. */
  findBatchCandidates: (currentTaskId: string, clientId: string | null) => Promise<CandidateBatchTask[]>;
  /** Creates the approval link for the given task ids. Copies URL to clipboard. */
  createLink: (taskIds: string[]) => Promise<CreateApprovalLinkResult | null>;
  isCreating: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const REUSE_BUFFER_MS = 48 * 60 * 60 * 1000; // GUARDRAIL #1 — buffer 48h

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
        // ============================================================
        // GUARDRAIL #1 — Reuso com Buffer Zone (48h de vida útil mín.)
        // ============================================================
        const minViableExpiry = new Date(Date.now() + REUSE_BUFFER_MS).toISOString();

        const { data: candidates, error: lookupErr } = await supabase
          .from("task_approvals")
          .select("id, token, expires_at, items:task_approval_items(task_id)")
          .eq("agency_id", currentAgency.id)
          .eq("status", "pending")
          .gt("expires_at", minViableExpiry);

        if (lookupErr) {
          console.warn("approval reuse lookup failed (continuing with new link)", lookupErr);
        }

        const sortedRequested = [...taskIds].sort().join(",");
        const reusable = (candidates ?? []).find((c: any) => {
          const ids: string[] = (c.items ?? [])
            .map((i: any) => i.task_id)
            .filter(Boolean);
          if (ids.length !== taskIds.length) return false;
          return [...ids].sort().join(",") === sortedRequested;
        });

        if (reusable) {
          const url = `${window.location.origin}/approve/${reusable.token}`;

          // Reset rejection flags (cliente vai rever as mesmas tarefas)
          await supabase
            .from("tasks")
            .update({ is_rejected: false, client_feedback: null })
            .in("id", taskIds);

          queryClient.invalidateQueries({ queryKey: ["tasks"] });

          try {
            await navigator.clipboard.writeText(url);
            toast.success("Link existente reaproveitado e copiado.", {
              description: `Válido até ${new Date(reusable.expires_at).toLocaleDateString("pt-BR")}`,
            });
          } catch {
            toast.success("Link existente reaproveitado.", { description: url });
          }

          return {
            url,
            token: reusable.token,
            expiresAt: reusable.expires_at,
            taskIds,
            reused: true,
          };
        }

        // ============================================================
        // Sem reuso viável → cria link novo (7 dias)
        // ============================================================
        const token = (crypto as any).randomUUID
          ? (crypto as any).randomUUID().replace(/-/g, "")
          : Array.from(crypto.getRandomValues(new Uint8Array(24)))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");

        const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

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

        const items = taskIds.map((taskId) => ({
          approval_id: approval.id,
          task_id: taskId,
        }));
        const { error: itemsErr } = await supabase
          .from("task_approval_items")
          .insert(items);
        if (itemsErr) throw itemsErr;

        const { error: resetErr } = await supabase
          .from("tasks")
          .update({ is_rejected: false, client_feedback: null })
          .in("id", taskIds);
        if (resetErr) {
          console.error("approval reset error", resetErr);
        }

        queryClient.invalidateQueries({ queryKey: ["tasks"] });

        const url = `${window.location.origin}/approve/${approval.token}`;

        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copiado — válido por 7 dias.", { description: url });
        } catch {
          toast.success("Link gerado. Copie manualmente abaixo.", { description: url });
        }

        return {
          url,
          token: approval.token,
          expiresAt: approval.expires_at,
          taskIds,
          reused: false,
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
