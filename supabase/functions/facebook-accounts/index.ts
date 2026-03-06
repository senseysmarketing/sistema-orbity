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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, agencyId, adAccountId } = await req.json();

    if (!agencyId) {
      return new Response(JSON.stringify({ error: 'Agency ID is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate user belongs to agency
    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (!agencyUser) {
      return new Response(JSON.stringify({ error: 'User not authorized for this agency' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get agency's Facebook connection
    const { data: connection } = await supabase
      .from('facebook_connections')
      .select('access_token')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!connection) {
      throw new Error('No active Facebook connection found for this agency');
    }

    const accessToken = connection.access_token;

    switch (action) {
      case 'list_ad_accounts': {
        console.log('[FACEBOOK-ACCOUNTS] Fetching ad accounts for agency:', agencyId);

        const fields = 'id,name,currency,timezone_name,account_status';
        const limit = 100;
        let url: string | null = `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${accessToken}&fields=${fields}&limit=${limit}`;
        const allAccounts: any[] = [];

        while (url) {
          const fbResponse = await fetch(url);
          if (!fbResponse.ok) {
            const errorText = await fbResponse.text();
            console.error('[FACEBOOK-ACCOUNTS] Facebook API error:', errorText);
            throw new Error(`Facebook API error: ${fbResponse.status}`);
          }
          const fbData = await fbResponse.json();
          if (fbData.error) throw new Error(`Facebook API error: ${fbData.error.message}`);
          if (Array.isArray(fbData.data)) allAccounts.push(...fbData.data);
          url = fbData?.paging?.next ?? null;
        }

        const accounts = allAccounts.map((account: any) => ({
          id: account.id,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone_name,
          account_status: account.account_status === 1 ? 'ACTIVE'
            : (account.account_status === 2 || account.account_status === 3 ? 'DISABLED' : 'INACTIVE')
        }));

        return new Response(JSON.stringify({ accounts }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list_pixels': {
        if (!adAccountId) {
          return new Response(JSON.stringify({ error: 'adAccountId is required for list_pixels' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[FACEBOOK-ACCOUNTS] Fetching pixels for ad account:', adAccountId);

        const pixelUrl = `https://graph.facebook.com/v19.0/${adAccountId}/adspixels?access_token=${accessToken}&fields=id,name`;
        const fbResponse = await fetch(pixelUrl);

        if (!fbResponse.ok) {
          const errorText = await fbResponse.text();
          console.error('[FACEBOOK-ACCOUNTS] Pixel API error:', errorText);
          throw new Error(`Facebook API error: ${fbResponse.status}`);
        }

        const fbData = await fbResponse.json();
        if (fbData.error) throw new Error(`Facebook API error: ${fbData.error.message}`);

        const pixels = (fbData.data || []).map((p: any) => ({
          pixel_id: p.id,
          pixel_name: p.name,
        }));

        console.log('[FACEBOOK-ACCOUNTS] Found pixels:', pixels.length);

        // Upsert into facebook_pixels table
        if (pixels.length > 0) {
          for (const pixel of pixels) {
            await supabase
              .from('facebook_pixels')
              .upsert({
                agency_id: agencyId,
                ad_account_id: adAccountId,
                pixel_id: pixel.pixel_id,
                pixel_name: pixel.pixel_name,
                is_active: true,
              }, { onConflict: 'agency_id,pixel_id' });
          }
        }

        return new Response(JSON.stringify({ pixels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[FACEBOOK-ACCOUNTS] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
