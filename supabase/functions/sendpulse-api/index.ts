import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendPulseAction {
  action: 'get_addressbooks' | 'add_emails' | 'create_campaign';
  book_id?: number;
  emails?: { email: string; variables?: Record<string, string> }[];
  sender_name?: string;
  sender_email?: string;
  subject?: string;
  body?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Invalid token');

    // Get agency_id for this user
    const { data: agencyUser, error: agencyError } = await supabase
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (agencyError || !agencyUser) throw new Error('User not associated with any agency');
    const agencyId = agencyUser.agency_id;

    // Get SendPulse credentials
    const { data: integration, error: intError } = await supabase
      .from('agency_integrations')
      .select('sendpulse_client_id, sendpulse_secret')
      .eq('agency_id', agencyId)
      .single();

    if (intError || !integration || !integration.sendpulse_client_id || !integration.sendpulse_secret) {
      throw new Error('SendPulse not configured for this agency');
    }

    const { sendpulse_client_id: clientId, sendpulse_secret: clientSecret } = integration;

    // Auth with SendPulse to get access token
    const tokenRes = await fetch('https://api.sendpulse.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`SendPulse Auth Error: ${JSON.stringify(tokenData)}`);
    const accessToken = tokenData.access_token;

    const { action, ...params }: SendPulseAction = await req.json();

    let result;
    if (action === 'get_addressbooks') {
      const res = await fetch('https://api.sendpulse.com/addressbooks', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'add_emails') {
      if (!params.book_id || !params.emails) throw new Error('book_id and emails are required');
      const res = await fetch(`https://api.sendpulse.com/addressbooks/${params.book_id}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails: JSON.stringify(params.emails) }),
      });
      result = await res.json();
    } else if (action === 'create_campaign') {
      const { sender_name, sender_email, subject, body, book_id } = params;
      if (!sender_name || !sender_email || !subject || !body || !book_id) {
        throw new Error('Missing campaign parameters');
      }
      const res = await fetch('https://api.sendpulse.com/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_name,
          sender_email,
          subject,
          body: btoa(unescape(encodeURIComponent(body))), // Base64 encoded HTML
          list_id: book_id,
        }),
      });
      result = await res.json();
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
