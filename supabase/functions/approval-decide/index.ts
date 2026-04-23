import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Decision = "approved" | "revision";

interface Body {
  token?: string;
  task_id?: string;
  decision?: Decision;
  feedback?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const token = (body.token ?? "").trim();
    const taskId = (body.task_id ?? "").trim();
    const decision = body.decision;
    const feedbackRaw = (body.feedback ?? "").toString();

    // Validation (no extra deps; Zod-equivalent inline)
    if (!token || token.length < 8) {
      return json({ error: "invalid_token", message: "Token inválido." }, 400);
    }
    if (!taskId) {
      return json({ error: "invalid_task", message: "Tarefa inválida." }, 400);
    }
    if (decision !== "approved" && decision !== "revision") {
      return json({ error: "invalid_decision", message: "Decisão inválida." }, 400);
    }
    let feedback: string | null = null;
    if (decision === "revision") {
      const trimmed = feedbackRaw.trim();
      if (trimmed.length === 0) {
        return json(
          { error: "feedback_required", message: "O feedback é obrigatório ao solicitar ajustes." },
          400
        );
      }
      if (trimmed.length > 500) {
        return json(
          { error: "feedback_too_long", message: "O feedback deve ter no máximo 500 caracteres." },
          400
        );
      }
      feedback = trimmed;
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Re-check approval validity & expiration
    const { data: approval, error: approvalErr } = await admin
      .from("task_approvals")
      .select("id, agency_id, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (approvalErr) {
      console.error("approval-decide fetch error", approvalErr);
      return json({ error: "internal", message: "Erro ao validar aprovação." }, 500);
    }
    if (!approval) {
      return json({ error: "not_found", message: "Link não encontrado." }, 404);
    }
    if (new Date() > new Date(approval.expires_at)) {
      if (approval.status !== "expired") {
        await admin.from("task_approvals").update({ status: "expired" }).eq("id", approval.id);
      }
      return json(
        {
          error: "expired",
          message:
            "Este link de aprovação expirou por motivos de segurança. Por favor, solicite um novo link à agência.",
        },
        410
      );
    }
    if (approval.status === "completed") {
      return json({ error: "completed", message: "Aprovação já finalizada." }, 410);
    }

    // Validate the item belongs to this approval and is still pending
    const { data: item, error: itemErr } = await admin
      .from("task_approval_items")
      .select("id, decision")
      .eq("approval_id", approval.id)
      .eq("task_id", taskId)
      .maybeSingle();

    if (itemErr) {
      console.error("approval-decide item fetch error", itemErr);
      return json({ error: "internal", message: "Erro ao validar item." }, 500);
    }
    if (!item) {
      return json({ error: "item_not_found", message: "Tarefa não pertence a este link." }, 404);
    }
    if (item.decision) {
      return json(
        { error: "already_decided", message: "Esta tarefa já foi respondida." },
        409
      );
    }

    // GUARDRAIL 3 — Atomic JSONB history append
    const { data: task, error: taskErr } = await admin
      .from("tasks")
      .select("history, updated_at, agency_id")
      .eq("id", taskId)
      .maybeSingle();

    if (taskErr || !task) {
      return json({ error: "task_not_found", message: "Tarefa não encontrada." }, 404);
    }
    if (task.agency_id !== approval.agency_id) {
      return json({ error: "agency_mismatch", message: "Inconsistência de agência." }, 403);
    }

    const historyArr = Array.isArray((task as any).history) ? (task as any).history : [];
    const newEntry = {
      type: "external_approval",
      decision,
      feedback,
      timestamp: new Date().toISOString(),
      user: "Cliente",
    };
    const newHistory = [...historyArr, newEntry];

    const taskUpdates: Record<string, any> =
      decision === "approved"
        ? {
            status: "approved",
            is_rejected: false,
            client_feedback: null,
            history: newHistory,
          }
        : {
            status: "em_revisao",
            is_rejected: true,
            client_feedback: feedback,
            history: newHistory,
          };

    // Optimistic concurrency on updated_at
    const { error: updateErr, data: updatedRows } = await admin
      .from("tasks")
      .update(taskUpdates)
      .eq("id", taskId)
      .eq("updated_at", task.updated_at)
      .select("id");

    if (updateErr) {
      console.error("approval-decide task update error", updateErr);
      return json({ error: "internal", message: "Erro ao atualizar tarefa." }, 500);
    }
    if (!updatedRows || updatedRows.length === 0) {
      // Concurrent modification — retry once without the updated_at guard
      const { error: retryErr } = await admin
        .from("tasks")
        .update(taskUpdates)
        .eq("id", taskId);
      if (retryErr) {
        console.error("approval-decide task retry error", retryErr);
        return json({ error: "internal", message: "Erro ao atualizar tarefa." }, 500);
      }
    }

    const decidedAt = new Date().toISOString();
    await admin
      .from("task_approval_items")
      .update({ decision, client_feedback: feedback, decided_at: decidedAt })
      .eq("id", item.id);

    // Recompute approval status
    const { data: allItems } = await admin
      .from("task_approval_items")
      .select("decision")
      .eq("approval_id", approval.id);

    const total = allItems?.length ?? 0;
    const decided = (allItems ?? []).filter((i: any) => !!i.decision).length;

    let newApprovalStatus: string = approval.status;
    let completedAt: string | null = null;
    if (total > 0 && decided >= total) {
      newApprovalStatus = "completed";
      completedAt = decidedAt;
    } else if (decided > 0) {
      newApprovalStatus = "partial";
    }

    if (newApprovalStatus !== approval.status) {
      await admin
        .from("task_approvals")
        .update({ status: newApprovalStatus, completed_at: completedAt })
        .eq("id", approval.id);
    }

    return json({
      ok: true,
      decision,
      approval_status: newApprovalStatus,
      remaining: total - decided,
    });
  } catch (err: any) {
    console.error("approval-decide unexpected error", err);
    return json({ error: "internal", message: err.message ?? "Erro inesperado." }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
