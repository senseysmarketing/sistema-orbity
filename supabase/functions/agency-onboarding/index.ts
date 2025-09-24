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

    // Step 1: Create or get admin user
    logStep("Creating or getting admin user");
    let userId: string;
    let userExists = false;

    // First try to create the user
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        name: adminUser.name,
        role: 'administrador'
      }
    });

    if (authError) {
      // If user already exists, try to get the existing user
      if (authError.message.includes('already been registered')) {
        logStep("User already exists, checking existing user");
        const { data: existingUser, error: getUserError } = await supabaseClient.auth.admin.listUsers();
        
        if (getUserError) throw new Error(`Failed to check existing users: ${getUserError.message}`);
        
        const foundUser = existingUser.users.find(u => u.email === adminUser.email);
        if (!foundUser) throw new Error("User exists but couldn't be found");
        
        userId = foundUser.id;
        userExists = true;
        logStep("Found existing user", { userId });
      } else {
        throw new Error(`Failed to create user: ${authError.message}`);
      }
    } else {
      if (!authData.user) throw new Error("User creation failed");
      userId = authData.user.id;
      logStep("New user created", { userId });
    }

    // Step 2: Wait for profile creation trigger (only for new users)
    if (!userExists) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Check if user already has an agency
    if (userExists) {
      logStep("Checking if user already has an agency");
      const { data: existingUserAgency } = await supabaseClient
        .from('agency_users')
        .select('agency_id, agencies!inner(id, name, slug)')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .single();

      if (existingUserAgency) {
        logStep("User already has an agency", { 
          agencyId: existingUserAgency.agency_id,
          agencyName: existingUserAgency.agencies.name 
        });
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            userId,
            agencyId: existingUserAgency.agency_id,
            agencySlug: existingUserAgency.agencies.slug,
            message: "User already has an agency"
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Step 4: Create agency
    logStep("Creating agency");
    let agencySlug = companyData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);

    // Check for existing slug and make it unique if necessary
    const { data: existingAgency } = await supabaseClient
      .from('agencies')
      .select('id')
      .eq('slug', agencySlug)
      .single();

    if (existingAgency) {
      const timestamp = Date.now().toString().slice(-6);
      agencySlug = `${agencySlug}-${timestamp}`;
    }

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

    // Step 5: Add user to agency as owner (check if not already added)
    logStep("Adding user to agency");
    const { data: existingAgencyUser } = await supabaseClient
      .from('agency_users')
      .select('id')
      .eq('user_id', userId)
      .eq('agency_id', agencyId)
      .single();

    if (!existingAgencyUser) {
      const { error: agencyUserError } = await supabaseClient
        .from('agency_users')
        .insert({
          user_id: userId,
          agency_id: agencyId,
          role: 'owner'
        });

      if (agencyUserError) throw new Error(`Failed to add user to agency: ${agencyUserError.message}`);
    } else {
      logStep("User already added to agency");
    }

    // Step 6: Start trial subscription (check if not already exists)
    logStep("Starting trial subscription");
    const { data: existingSubscription } = await supabaseClient
      .from('agency_subscriptions')
      .select('id')
      .eq('agency_id', agencyId)
      .single();

    if (!existingSubscription) {
      const { error: trialError } = await supabaseClient.rpc('start_agency_trial', {
        p_agency_id: agencyId,
        p_plan_slug: planSlug
      });

      if (trialError) throw new Error(`Failed to start trial: ${trialError.message}`);
    } else {
      logStep("Subscription already exists for agency");
    }

    // Step 7: Create onboarding record
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