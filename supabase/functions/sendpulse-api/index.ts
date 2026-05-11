import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendPulseAction {
  action: 'get_addressbooks' | 'add_emails' | 'create_campaign' | 'get_balance' | 'get_addressbook_details' | 'create_addressbook' | 'get_account_info' | 'get_campaigns' | 'get_campaign_stats' | 'cancel_campaign' | 'update_addressbook' | 'delete_addressbook' | 'get_contacts' | 'get_senders' | 'add_sender' | 'send_test_email';
  book_id?: number;
  campaign_id?: number;
  emails?: { email: string; variables?: Record<string, string> }[];
  sender_name?: string;
  sender_email?: string;
  subject?: string;
  body?: string;
  send_date?: string;
  name?: string;
  target_email?: string;
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
      .select('sendpulse_client_id, sendpulse_client_secret')
      .eq('agency_id', agencyId)
      .single();

    if (intError || !integration || !integration.sendpulse_client_id || !integration.sendpulse_client_secret) {
      throw new Error('SendPulse not configured for this agency');
    }

    const { sendpulse_client_id: clientId, sendpulse_client_secret: clientSecret } = integration;

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
    if (action === 'get_balance') {
      const res = await fetch('https://api.sendpulse.com/user/balance/detail', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'get_account_info') {
      const res = await fetch('https://api.sendpulse.com/user/info', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      console.log("SendPulse Info Response:", JSON.stringify(data));
      
      const isFree = data.pricing_plan === 'Free';
      
      // Map relevant info with fallbacks for Free plan
      result = {
        pricing_plan: data.pricing_plan || 'Free',
        email_qty: data.email_qty || data.emails_qty || 0,
        email_limit: (data.email_limit === 0 || !data.email_limit) && isFree ? 15000 : (data.email_limit || 0),
        emails_total: data.emails_total || 0,
        addressbook_limit: (data.addressbook_limit === 0 || data.addressbooks_limit === 0 || !data.addressbook_limit) && isFree ? 500 : (data.addressbook_limit || data.addressbooks_limit || 0),
        balance: data.balance || [],
        renewal_date: data.renewal_date || data.expiry_date || null
      };
    } else if (action === 'create_addressbook') {
      if (!params.name) throw new Error('name is required');
      const res = await fetch('https://api.sendpulse.com/addressbooks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookName: params.name }),
      });
      result = await res.json();
    } else if (action === 'get_addressbook_details') {
      if (!params.book_id) throw new Error('book_id is required');
      const res = await fetch(`https://api.sendpulse.com/addressbooks/${params.book_id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'get_addressbooks') {
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
      const { sender_name, sender_email, subject, body, book_id, send_date } = params;
      if (!sender_name || !sender_email || !subject || !body || !book_id) {
        throw new Error('Missing campaign parameters');
      }

      // Pre-flight check: Get balance and address book size
      const [balanceRes, bookRes] = await Promise.all([
        fetch('https://api.sendpulse.com/user/balance/detail', { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`https://api.sendpulse.com/addressbooks/${book_id}`, { headers: { 'Authorization': `Bearer ${accessToken}` } })
      ]);

      const balanceData = await balanceRes.json();
      const bookData = await bookRes.json();

      // SendPulse returns balance in an array usually, or direct object. 
      // Based on docs for /user/balance/detail, it is { "email": { "emails_left": 1000, ... } }
      const emailBalance = balanceData?.email?.emails_left ?? balanceData?.email?.balance ?? balanceData?.[0]?.balance ?? 0;
      const contactsCount = bookData?.all_email_count || 0;

      if (contactsCount > emailBalance) {
        return new Response(JSON.stringify({ 
          error: "QUOTA_EXCEEDED", 
          message: `O seu saldo na SendPulse é insuficiente para esta campanha. Saldo: ${emailBalance}. Necessário: ${contactsCount}.` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
          send_date: send_date || undefined,
        }),
      });

      if (res.status === 429) throw new Error('RATE_LIMIT: Muitas requisições. Tente novamente em instantes.');
      if (res.status === 402 || res.status === 403) throw new Error('PLAN_RESTRICTION: Restrição de plano ou pagamento na SendPulse.');
      
      result = await res.json();
    } else if (action === 'get_campaigns') {
      const res = await fetch('https://api.sendpulse.com/campaigns?limit=100&offset=0', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'get_campaign_stats') {
      if (!params.campaign_id) throw new Error('campaign_id is required');
      const res = await fetch(`https://api.sendpulse.com/campaigns/${params.campaign_id}/stat`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'cancel_campaign') {
      if (!params.campaign_id) throw new Error('campaign_id is required');
      const res = await fetch(`https://api.sendpulse.com/campaigns/${params.campaign_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'update_addressbook') {
      if (!params.book_id || !params.name) throw new Error('book_id and name are required');
      const res = await fetch(`https://api.sendpulse.com/addressbooks/${params.book_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookName: params.name }),
      });
      result = await res.json();
    } else if (action === 'delete_addressbook') {
      if (!params.book_id) throw new Error('book_id is required');
      const res = await fetch(`https://api.sendpulse.com/addressbooks/${params.book_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'get_contacts') {
      if (!params.book_id) throw new Error('book_id is required');
      const res = await fetch(`https://api.sendpulse.com/addressbooks/${params.book_id}/emails`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'get_senders') {
      const res = await fetch('https://api.sendpulse.com/senders', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      result = await res.json();
    } else if (action === 'add_sender') {
      if (!params.name || !params.sender_email) throw new Error('name and sender_email are required');
      const res = await fetch('https://api.sendpulse.com/senders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.sender_email,
          name: params.name
        }),
      });
      result = await res.json();
    } else if (action === 'send_test_email') {
      const { sender_name, sender_email, subject, body, target_email } = params;
      if (!sender_name || !sender_email || !subject || !body || !target_email) {
        throw new Error('Missing test email parameters');
      }

      const res = await fetch('https://api.sendpulse.com/smtp/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: {
            html: btoa(unescape(encodeURIComponent(body))), // Some APIs expect base64, but SendPulse SMTP docs usually say string. Let's check.
            // Actually, the user instruction says: "html": "string do body"
            // Wait, the create_campaign uses btoa. Let's stick to what the user said for SMTP.
            html: body,
            text: body.replace(/<[^>]*>?/gm, ''), // Simple strip tags
            subject,
            from: {
              name: sender_name,
              email: sender_email
            },
            to: [
              {
                email: target_email
              }
            ]
          }
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
