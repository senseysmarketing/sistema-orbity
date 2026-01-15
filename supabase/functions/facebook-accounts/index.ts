import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get JWT from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[FACEBOOK-ACCOUNTS] No authorization header provided');
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        details: 'No authorization header provided'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[FACEBOOK-ACCOUNTS] Validating token...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('[FACEBOOK-ACCOUNTS] Auth error:', authError.message);
      return new Response(JSON.stringify({ 
        error: 'Session expired',
        details: 'Please refresh the page and try again',
        authError: authError.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!user) {
      console.error('[FACEBOOK-ACCOUNTS] No user found for token');
      return new Response(JSON.stringify({ 
        error: 'Invalid session',
        details: 'User not found'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[FACEBOOK-ACCOUNTS] User authenticated:', { userId: user.id, email: user.email });

    const { action, agencyId } = await req.json();

    // Validar agencyId
    if (!agencyId) {
      console.error('[FACEBOOK-ACCOUNTS] No agency ID provided');
      return new Response(JSON.stringify({ 
        error: 'Agency ID is required',
        details: 'Please provide an agency ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar que o usuário pertence à agência informada
    const { data: agencyUser, error: agencyUserError } = await supabase
      .from('agency_users')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (agencyUserError) {
      console.error('[FACEBOOK-ACCOUNTS] Error validating agency access:', agencyUserError);
      return new Response(JSON.stringify({ 
        error: 'Error validating agency access',
        details: agencyUserError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!agencyUser) {
      console.error('[FACEBOOK-ACCOUNTS] User not authorized for agency:', agencyId);
      return new Response(JSON.stringify({ 
        error: 'User not authorized for this agency',
        details: 'You do not have access to this agency'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[FACEBOOK-ACCOUNTS] User authorized for agency:', agencyId);

    switch (action) {
      case 'list_ad_accounts':
        console.log('[FACEBOOK-ACCOUNTS] Fetching ad accounts for agency:', agencyId);
        
        // Get agency's Facebook connection (busca por agency_id, não user_id)
        const { data: connections, error: connectionError } = await supabase
          .from('facebook_connections')
          .select('access_token, user_id')
          .eq('agency_id', agencyId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (connectionError) {
          console.error('[FACEBOOK-ACCOUNTS] Error fetching Facebook connection:', connectionError);
          throw new Error('Error fetching Facebook connection');
        }

        if (!connections) {
          console.error('[FACEBOOK-ACCOUNTS] No Facebook connection found for agency:', agencyId);
          throw new Error('No active Facebook connection found for this agency');
        }

        const accessToken = (connections as any).access_token;
        console.log('[FACEBOOK-ACCOUNTS] Facebook connection found, fetching ad accounts...');

        // Fetch ALL ad accounts from Facebook API with pagination
        const fields = 'id,name,currency,timezone_name,account_status';
        const limit = 100;
        let url: string | null = `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${accessToken}&fields=${fields}&limit=${limit}`;
        const allAccounts: any[] = [];

        while (url) {
          const fbResponse: Response = await fetch(url);
          if (!fbResponse.ok) {
            const errorText = await fbResponse.text();
            console.error('[FACEBOOK-ACCOUNTS] Facebook API error:', errorText);
            throw new Error(`Facebook API error: ${fbResponse.status}`);
          }
          const fbData: any = await fbResponse.json();
          console.log('[FACEBOOK-ACCOUNTS] Facebook API response page size:', (fbData?.data || []).length);
          if (fbData.error) {
            console.error('[FACEBOOK-ACCOUNTS] Facebook API returned error:', fbData.error);
            throw new Error(`Facebook API error: ${fbData.error.message}`);
          }
          if (Array.isArray(fbData.data)) {
            allAccounts.push(...fbData.data);
          }
          url = fbData?.paging?.next ?? null;
        }

        // Transform Facebook data to our format (include all statuses)
        const accounts = allAccounts.map((account: any) => ({
          id: account.id,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone_name,
          account_status: account.account_status === 1
            ? 'ACTIVE'
            : (account.account_status === 2 || account.account_status === 3 ? 'DISABLED' : 'INACTIVE')
        }));

        console.log('[FACEBOOK-ACCOUNTS] Returning accounts:', accounts.length);
        
        return new Response(JSON.stringify({ accounts }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[FACEBOOK-ACCOUNTS] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});