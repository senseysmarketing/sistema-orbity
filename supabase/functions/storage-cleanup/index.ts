// Storage retention & orphan cleanup
// - Removes files from post-attachments / task-attachments whose parent task no longer exists,
//   or whose task is completed/archived for more than 90 days.
// - Removes files from client-files whose client no longer exists or has been inactive >180 days.
// Runs safely: batched, dry-run supported via ?dry=1.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RETENTION_DAYS_TASK = 90;
const RETENTION_DAYS_CLIENT = 180;
const BATCH = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry") === "1";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary: Record<string, { scanned: number; deleted: number; skipped: number }> = {};

  async function scanBucket(bucket: "post-attachments" | "task-attachments" | "client-files") {
    const stat = { scanned: 0, deleted: 0, skipped: 0 };
    const toDelete: string[] = [];

    // List first N folders (top-level = task_id or agency_id)
    const { data: folders, error: fErr } = await supabase.storage.from(bucket).list("", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (fErr) throw fErr;

    for (const folder of folders ?? []) {
      if (!folder.name) continue;
      // List files inside the folder
      const { data: files } = await supabase.storage.from(bucket).list(folder.name, { limit: 1000 });
      stat.scanned += files?.length ?? 0;

      if (bucket === "post-attachments" || bucket === "task-attachments") {
        // folder.name = task_id
        const { data: task } = await supabase
          .from("tasks")
          .select("id, status, updated_at")
          .eq("id", folder.name)
          .maybeSingle();

        let shouldDelete = false;
        if (!task) {
          shouldDelete = true; // orphan
        } else if (
          ["completed", "published", "archived", "cancelled"].includes(task.status ?? "") &&
          task.updated_at &&
          new Date(task.updated_at).getTime() < Date.now() - RETENTION_DAYS_TASK * 86400_000
        ) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          for (const f of files ?? []) toDelete.push(`${folder.name}/${f.name}`);
        } else {
          stat.skipped += files?.length ?? 0;
        }
      } else if (bucket === "client-files") {
        // folder.name = agency_id, subfolders = client_id
        const { data: subfolders } = await supabase.storage.from(bucket).list(folder.name, {
          limit: 1000,
        });
        for (const sub of subfolders ?? []) {
          if (!sub.name) continue;
          const { data: client } = await supabase
            .from("clients")
            .select("id, active, updated_at")
            .eq("id", sub.name)
            .maybeSingle();

          const { data: subFiles } = await supabase.storage
            .from(bucket)
            .list(`${folder.name}/${sub.name}`, { limit: 1000 });
          stat.scanned += subFiles?.length ?? 0;

          let shouldDelete = false;
          if (!client) shouldDelete = true;
          else if (
            client.active === false &&
            client.updated_at &&
            new Date(client.updated_at).getTime() < Date.now() - RETENTION_DAYS_CLIENT * 86400_000
          ) {
            shouldDelete = true;
          }
          if (shouldDelete) {
            for (const f of subFiles ?? []) toDelete.push(`${folder.name}/${sub.name}/${f.name}`);
          } else {
            stat.skipped += subFiles?.length ?? 0;
          }
        }
      }
    }

    // Batch delete
    if (toDelete.length && !dryRun) {
      for (let i = 0; i < toDelete.length; i += BATCH) {
        const chunk = toDelete.slice(i, i + BATCH);
        const { error } = await supabase.storage.from(bucket).remove(chunk);
        if (!error) stat.deleted += chunk.length;
      }
    } else {
      stat.deleted = toDelete.length;
    }

    summary[bucket] = stat;
  }

  try {
    await scanBucket("post-attachments");
    await scanBucket("task-attachments");
    await scanBucket("client-files");

    // Audit log
    await supabase.from("master_system_logs").insert({
      event_type: dryRun ? "storage_cleanup_dry_run" : "storage_cleanup",
      entity_type: "storage",
      description: "Storage retention cleanup executed",
      metadata: summary,
    });

    return new Response(JSON.stringify({ ok: true, dryRun, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
