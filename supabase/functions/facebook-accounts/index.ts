import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    switch (action) {
      case 'list_ad_accounts':
        // Mock Facebook ad accounts for development
        const mockAccounts = [
          {
            id: 'act_123456789',
            name: 'Conta Principal - Empresa X',
            currency: 'BRL',
            timezone: 'America/Sao_Paulo',
            account_status: 'ACTIVE'
          },
          {
            id: 'act_987654321', 
            name: 'Conta Secundária - Campanha Y',
            currency: 'BRL',
            timezone: 'America/Sao_Paulo',
            account_status: 'ACTIVE'
          }
        ];
        
        return new Response(JSON.stringify({ accounts: mockAccounts }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in facebook-accounts function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});