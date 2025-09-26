import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getRedirectUri(req: Request) {
  // Always return the public Functions domain callback URL
  // This avoids variants like http or missing "/functions/v1"
  const url = new URL(req.url);
  const forwardedHost = req.headers.get('x-forwarded-host') || url.host;
  let host = forwardedHost;
  if (!host.includes('functions.supabase.co')) {
    // Convert project base domain to functions domain
    const projectRef = host.split('.')[0];
    host = `${projectRef}.functions.supabase.co`;
  }
  return `https://${host}/facebook-auth`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('FACEBOOK_APP_ID') ?? '';
    const appSecret = Deno.env.get('FACEBOOK_APP_SECRET') ?? '';

    // Handle OAuth callback from Facebook (GET with ?code=...)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const errorReason = url.searchParams.get('error');

      if (errorReason) {
        const payload = { type: 'facebook_oauth', success: false, error: errorReason };
        const html = `<!doctype html><html><body><script>window.opener && window.opener.postMessage(${JSON.stringify(payload)}, '*'); window.close();</script>Falha na autenticação do Facebook.</body></html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html', ...corsHeaders } });
      }

      if (!code) {
        const payload = { type: 'facebook_oauth', success: false, error: 'missing_code' };
        const html = `<!doctype html><html><body><script>window.opener && window.opener.postMessage(${JSON.stringify(payload)}, '*'); window.close();</script>Parâmetro "code" ausente.</body></html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html', ...corsHeaders } });
      }

      const redirectUri = getRedirectUri(req);

      // Exchange authorization code for access token
      const tokenResp = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`
      );
      const tokenData = await tokenResp.json();

      if (!tokenResp.ok || !tokenData.access_token) {
        console.error('Facebook token exchange error:', tokenData);
        const payload = { type: 'facebook_oauth', success: false, error: tokenData.error?.message || 'token_exchange_failed' };
        const html = `<!doctype html><html><body><script>window.opener && window.opener.postMessage(${JSON.stringify(payload)}, '*'); window.close();</script>Falha ao obter o token.</body></html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html', ...corsHeaders } });
      }

      const payload = {
        type: 'facebook_oauth',
        success: true,
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in || 0,
        token_type: tokenData.token_type || 'bearer',
      };

      const html = `<!doctype html><html><body><script>
        console.log('Sending Facebook OAuth message:', ${JSON.stringify(payload)});
        if (window.opener) {
          window.opener.postMessage(${JSON.stringify(payload)}, '*');
          setTimeout(() => window.close(), 1000);
        } else {
          console.error('No window.opener found');
          window.close();
        }
      </script><div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>✅ Autenticação concluída!</h2>
        <p>Você pode fechar esta janela.</p>
      </div></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html', ...corsHeaders } });
    }

    // For POST actions below we may rely on user auth via Authorization header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
    );

    const { action, access_token, expires_in } = await req.json();

    switch (action) {
      case 'initiate_auth': {
        if (!appId) {
          return new Response(JSON.stringify({ error: 'FACEBOOK_APP_ID not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const redirectUri = getRedirectUri(req);
        const scope = 'ads_management,ads_read,business_management';
        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

        return new Response(JSON.stringify({ success: true, authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'save_token': {
        // Ensure user is authenticated
        const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
        if (userErr || !userData?.user) {
          return new Response(JSON.stringify({ error: 'Not authenticated' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!access_token) {
          return new Response(JSON.stringify({ error: 'Missing access_token' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get agency id for current user
        const { data: agencyId, error: agencyErr } = await supabaseClient.rpc('get_user_agency_id');
        if (agencyErr || !agencyId) {
          return new Response(JSON.stringify({ error: 'Unable to resolve agency' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch FB user id for record keeping
        let fbUserId = '';
        try {
          const meResp = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(access_token)}`);
          const me = await meResp.json();
          if (me?.id) fbUserId = String(me.id);
        } catch (e) {
          console.warn('Failed to fetch FB me:', e);
        }

        const tokenExpiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000).toISOString() : null;

        const { error: insertErr } = await supabaseClient
          .from('facebook_connections')
          .insert({
            user_id: userData.user.id,
            agency_id: agencyId,
            access_token,
            token_expires_at: tokenExpiresAt,
            facebook_user_id: fbUserId || 'unknown',
            is_active: true,
          });

        if (insertErr) {
          console.error('Error saving facebook connection:', insertErr);
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in facebook-auth function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
