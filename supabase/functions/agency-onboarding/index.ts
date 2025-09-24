import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AGENCY-ONBOARDING] ${step}${detailsStr}`);
};

interface OnboardingRequest {
  companyData: {
    name: string;
    description?: string;
    contactEmail: string;
    contactPhone?: string;
  };
  planSlug: string;
  adminUser: {
    name: string;
    email: string;
    password: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting agency onboarding");

    const { companyData, planSlug, adminUser }: OnboardingRequest = await req.json();
    
    logStep("Received onboarding data", { 
      companyName: companyData.name, 
      planSlug, 
      adminEmail: adminUser.email 
    });

    // Step 1: Create admin user
    logStep("Creating admin user");
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        name: adminUser.name,
        role: 'administrador'
      }
    });

    if (authError) throw new Error(`Failed to create user: ${authError.message}`);
    if (!authData.user) throw new Error("User creation failed");

    const userId = authData.user.id;
    logStep("Admin user created", { userId });

    // Step 2: Create user profile
    logStep("Creating user profile");
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        user_id: userId,
        name: adminUser.name,
        email: adminUser.email,
        role: 'administrador'
      });

    if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

    // Step 3: Create agency
    logStep("Creating agency");
    const agencySlug = companyData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);

    const { data: agencyData, error: agencyError } = await supabaseClient
      .from('agencies')
      .insert({
        name: companyData.name,
        slug: agencySlug,
        description: companyData.description,
        contact_email: companyData.contactEmail,
        contact_phone: companyData.contactPhone,
        is_active: true
      })
      .select()
      .single();

    if (agencyError) throw new Error(`Failed to create agency: ${agencyError.message}`);
    const agencyId = agencyData.id;
    logStep("Agency created", { agencyId, agencySlug });

    // Step 4: Add user to agency as owner
    logStep("Adding user to agency");
    const { error: agencyUserError } = await supabaseClient
      .from('agency_users')
      .insert({
        user_id: userId,
        agency_id: agencyId,
        role: 'owner'
      });

    if (agencyUserError) throw new Error(`Failed to add user to agency: ${agencyUserError.message}`);

    // Step 5: Start trial subscription
    logStep("Starting trial subscription");
    const { error: trialError } = await supabaseClient.rpc('start_agency_trial', {
      p_agency_id: agencyId,
      p_plan_slug: planSlug
    });

    if (trialError) throw new Error(`Failed to start trial: ${trialError.message}`);

    // Step 6: Create onboarding record
    logStep("Creating onboarding record");
    const { error: onboardingError } = await supabaseClient
      .from('agency_onboarding')
      .insert({
        agency_id: agencyId,
        user_id: userId,
        status: 'completed',
        step_current: 4,
        step_total: 4,
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        setup_data: {
          companyData,
          planSlug,
          adminUser: { name: adminUser.name, email: adminUser.email }
        },
        completed_at: new Date().toISOString()
      });

    if (onboardingError) throw new Error(`Failed to create onboarding record: ${onboardingError.message}`);

    logStep("Onboarding completed successfully");

    return new Response(JSON.stringify({
      success: true,
      data: {
        userId,
        agencyId,
        agencySlug,
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in agency onboarding", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});