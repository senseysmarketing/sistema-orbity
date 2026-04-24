import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "task-attachments";
const BUCKET_MARKER = `/${BUCKET}/`;
const FINAL_STATUSES = ["done", "approved", "concluido"];

interface Attachment {
  id?: string;
  name?: string;
  type?: string;
  size?: number;
  url?: string;
  uploaded_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let tasksProcessed = 0;
    let filesDeleted = 0;
    let filesPreserved = 0;
    let offset = 0;
    const PAGE = 1000;

    while (true) {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, attachments")
        .in("status", FINAL_STATUSES)
        .lt("updated_at", new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
        .not("attachments", "is", null)
        .range(offset, offset + PAGE - 1);

      if (error) throw error;
      if (!tasks || tasks.length === 0) break;

      for (const task of tasks) {
        const original: Attachment[] = Array.isArray(task.attachments) ? task.attachments : [];
        if (original.length === 0) continue;

        // Identificar candidatos do bucket
        const bucketCandidates: { att: Attachment; path: string }[] = [];
        for (const att of original) {
          if (!att?.url || att.url === "expired" || att.type === "system") continue;
          if (!att.url.includes(BUCKET_MARKER)) continue;
          const path = att.url.split(BUCKET_MARKER)[1];
          if (path) bucketCandidates.push({ att, path });
        }

        if (bucketCandidates.length === 0) {
          // Só links externos / lápides / docs preservados — no-op nesta task
          continue;
        }

        // Tentar remover em batch
        const paths = bucketCandidates.map(c => c.path);
        const { data: removed, error: removeErr } = await supabase.storage
          .from(BUCKET)
          .remove(paths);

        if (removeErr) {
          console.error(`Failed to remove batch for task ${task.id}:`, removeErr);
          continue; // mantém array intacto, tenta no próximo run
        }

        const removedPaths = new Set((removed ?? []).map((r: any) => r.name));
        const nowIso = new Date().toISOString();

        // Safe Array Mapping — preserva tudo que não foi efetivamente apagado
        const newArray: Attachment[] = original.map((att) => {
          if (!att?.url || att.url === "expired" || att.type === "system") {
            filesPreserved += 1;
            return att;
          }
          if (!att.url.includes(BUCKET_MARKER)) {
            // Link externo (Drive, etc.) — preservar
            filesPreserved += 1;
            return att;
          }
          const path = att.url.split(BUCKET_MARKER)[1];
          if (path && removedPaths.has(path)) {
            filesDeleted += 1;
            return {
              id: att.id ?? `expired-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: "Arquivo removido para otimização",
              url: "expired",
              type: "system",
              size: 0,
              uploaded_at: nowIso,
            };
          }
          // Falhou ao apagar — manter intacto
          filesPreserved += 1;
          return att;
        });

        const { error: updateErr } = await supabase
          .from("tasks")
          .update({ attachments: newArray as any })
          .eq("id", task.id);

        if (updateErr) {
          console.error(`Failed to update task ${task.id}:`, updateErr);
          continue;
        }

        tasksProcessed += 1;
      }

      if (tasks.length < PAGE) break;
      offset += PAGE;
    }

    // ============================================================
    // Limpeza física de links de aprovação expirados há > 15 dias
    // (FK ON DELETE CASCADE blindada → task_approval_items vão junto)
    // ============================================================
    let approvalLinksDeleted = 0;
    try {
      const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const { error: approvalsErr, count } = await supabase
        .from("task_approvals")
        .delete({ count: "exact" })
        .lt("expires_at", cutoff);

      if (approvalsErr) {
        console.error("approval links cleanup error:", approvalsErr);
      } else {
        approvalLinksDeleted = count ?? 0;
      }
    } catch (e) {
      console.error("approval links cleanup exception:", e);
    }

    // ============================================================
    // TTL de Notificações:
    //   - Lidas: deleta após 15 dias
    //   - Não lidas: deleta após 30 dias (lixo esquecido)
    // ============================================================
    let notificationsReadDeleted = 0;
    let notificationsUnreadDeleted = 0;
    try {
      const cutoff15 = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: readErr, count: readCount } = await supabase
        .from("notifications")
        .delete({ count: "exact" })
        .eq("is_read", true)
        .lt("created_at", cutoff15);

      if (readErr) {
        console.error("notifications (read) cleanup error:", readErr);
      } else {
        notificationsReadDeleted = readCount ?? 0;
      }

      const { error: unreadErr, count: unreadCount } = await supabase
        .from("notifications")
        .delete({ count: "exact" })
        .eq("is_read", false)
        .lt("created_at", cutoff30);

      if (unreadErr) {
        console.error("notifications (unread) cleanup error:", unreadErr);
      } else {
        notificationsUnreadDeleted = unreadCount ?? 0;
      }
    } catch (e) {
      console.error("notifications cleanup exception:", e);
    }

    const result = {
      tasks_processed: tasksProcessed,
      files_deleted: filesDeleted,
      files_preserved: filesPreserved,
      approval_links_deleted: approvalLinksDeleted,
      notifications_read_deleted: notificationsReadDeleted,
      notifications_unread_deleted: notificationsUnreadDeleted,
    };
    console.log("storage-garbage-collector finished:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("storage-garbage-collector error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
