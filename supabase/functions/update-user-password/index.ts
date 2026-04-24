import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-PASSWORD] ${step}${detailsStr}`);
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

    // Verify the requesting user is authenticated
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
    const { target_user_id, new_password, agency_id } = await req.json();
    
    if (!target_user_id || !new_password || !agency_id) {
      throw new Error('Missing required fields: target_user_id, new_password, agency_id');
    }

    logStep("Request data received", { target_user_id, agency_id });

    // Verify the user is an admin of the agency or updating their own password
    const isOwnPassword = user.id === target_user_id;
    
    if (!isOwnPassword) {
      const { data: adminCheck, error: adminError } = await supabaseClient
        .from('agency_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('agency_id', agency_id)
        .single();

      if (adminError || !adminCheck || !['owner', 'admin'].includes(adminCheck.role)) {
        throw new Error('Unauthorized: Only agency admins can update other users passwords');
      }
    }

    logStep("Authorization verification passed");

    // Verify target user belongs to the agency
    const { data: targetUserCheck, error: targetError } = await supabaseClient
      .from('agency_users')
      .select('user_id')
      .eq('user_id', target_user_id)
      .eq('agency_id', agency_id)
      .single();

    if (targetError || !targetUserCheck) {
      throw new Error('Target user not found in agency');
    }

    // Update password using admin API
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { password: new_password }
    );

    if (updateError) {
      logStep("Error updating password", { error: updateError });
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    logStep("Password updated successfully", { userId: target_user_id });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Password updated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in update-user-password", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});