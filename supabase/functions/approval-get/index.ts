import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token || token.length < 8) {
      return new Response(
        JSON.stringify({ error: "invalid_token", message: "Token inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: approval, error: approvalErr } = await admin
      .from("task_approvals")
      .select(
         `id, agency_id, token, status, created_at, expires_at, completed_at,
         agencies:agency_id (name, logo_url, contact_phone),
         items:task_approval_items (
           id, task_id, decision, client_feedback, decided_at,
           tasks:task_id ( id, title, description, attachments, status )
         )`
      )
      .eq("token", token)
      .maybeSingle();

    if (approvalErr) {
      console.error("approval-get fetch error", approvalErr);
      return new Response(
        JSON.stringify({ error: "internal", message: "Erro ao carregar aprovação." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!approval) {
      return new Response(
        JSON.stringify({ error: "not_found", message: "Link não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GUARDRAIL 1 — Expiração
    const now = new Date();
    if (now > new Date(approval.expires_at)) {
      if (approval.status !== "expired") {
        await admin
          .from("task_approvals")
          .update({ status: "expired" })
          .eq("id", approval.id);
      }
      return new Response(
        JSON.stringify({
          error: "expired",
          message:
            "Este link de aprovação expirou por motivos de segurança. Por favor, solicite um novo link à agência.",
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (approval.status === "completed") {
      return new Response(
        JSON.stringify({
          error: "completed",
          message: "Esta aprovação já foi finalizada. Obrigado!",
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize payload — expose only what the client needs
    const payload = {
      agency: {
        name: (approval as any).agencies?.name ?? "",
        logo_url: (approval as any).agencies?.logo_url ?? null,
      },
      token: approval.token,
      expires_at: approval.expires_at,
      status: approval.status,
      items: ((approval as any).items ?? []).map((item: any) => ({
        id: item.id,
        task_id: item.task_id,
        decision: item.decision,
        client_feedback: item.client_feedback,
        decided_at: item.decided_at,
        title: item.tasks?.title ?? "Tarefa",
        description: item.tasks?.description ?? "",
        attachments: item.tasks?.attachments ?? [],
      })),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("approval-get unexpected error", err);
    return new Response(
      JSON.stringify({ error: "internal", message: err.message ?? "Erro inesperado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
