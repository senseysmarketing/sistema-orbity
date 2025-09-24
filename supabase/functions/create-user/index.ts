import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing required environment variables');
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create regular client for user verification
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');

    // Verify the requesting user is authenticated and is an agency admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');
    logStep("User authenticated", { userId: user.id });

    // Get request body
    const { email, password, role, agency_id } = await req.json();
    
    if (!email || !password || !role || !agency_id) {
      throw new Error('Missing required fields: email, password, role, agency_id');
    }

    logStep("Request data received", { email, role, agency_id });

    // Verify the user is an admin of the agency using SECURITY DEFINER function
    const { data: isAdmin, error: isAdminError } = await supabaseClient.rpc('is_agency_admin', {
      agency_uuid: agency_id,
    });

    if (isAdminError) {
      logStep("Error checking admin status (rpc)", { error: isAdminError });
      throw new Error(`Failed to verify admin status: ${isAdminError.message}`);
    }

    if (!isAdmin) {
      logStep("Authorization failed", { userId: user.id, agencyId: agency_id });
      throw new Error('Unauthorized: Only agency admins can create users');
    }

    logStep("Admin verification passed");

    // Enforce plan user limit on backend as well
    const { count: currentCount, error: countError } = await supabaseAdmin
      .from('agency_users')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency_id);

    if (countError) {
      logStep("Error counting users", { error: countError });
      throw new Error(`Failed to verify current user count: ${countError.message}`);
    }

    const newCount = (currentCount ?? 0) + 1;
    const { data: withinLimit, error: limitError } = await supabaseAdmin.rpc('enforce_plan_limits', {
      agency_uuid: agency_id,
      limit_type: 'users',
      current_count: newCount
    });

    if (limitError) {
      logStep("Error enforcing plan limits", { error: limitError });
      throw new Error(`Failed to validate plan limits: ${limitError.message}`);
    }

    if (!withinLimit) {
      logStep("Plan limit reached", { currentCount, newCount });
      throw new Error('User limit reached for current plan');
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    
    if (emailExists) {
      logStep("Email already exists", { email });
      throw new Error('Email already exists in the system');
    }
    
    logStep("Email availability check passed");

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        role: role
      }
    });

    if (createError) {
      logStep("Error creating user", { error: createError });
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error('User creation failed - no user returned');
    }

    logStep("User created successfully", { userId: newUser.user.id, email: newUser.user.email });

    // Add user to agency
    const { error: agencyError } = await supabaseAdmin
      .from('agency_users')
      .insert({
        user_id: newUser.user.id,
        agency_id: agency_id,
        role: role,
        invited_by: user.id
      });

    if (agencyError) {
      logStep("Error adding user to agency", { error: agencyError });
      // If adding to agency fails, we should delete the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to add user to agency: ${agencyError.message}`);
    }

    logStep("User added to agency successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: newUser.user.id,
      email: newUser.user.email 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-user", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});