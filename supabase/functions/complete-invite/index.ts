import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password, phone } = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Token e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 1. Fetch invite by token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("agency_invites")
      .select("*, agencies(name)")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Convite inválido ou já utilizado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este convite expirou. Solicite um novo ao administrador." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: invite.owner_name,
        role: "agency_admin",
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      if (authError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado. Faça login diretamente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw authError;
    }

    const userId = authData.user.id;

    // 4. Update phone if provided
    if (phone) {
      await supabaseAdmin
        .from("profiles")
        .update({ phone })
        .eq("user_id", userId);
    }

    // 5. Link user to agency
    await supabaseAdmin.from("agency_users").insert({
      user_id: userId,
      agency_id: invite.agency_id,
      role: "admin",
    });

    // 6. Mark invite as used
    await supabaseAdmin
      .from("agency_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ success: true, message: "Conta criada com sucesso!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in complete-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
