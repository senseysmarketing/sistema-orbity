import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditLog {
  agency_id: string;
  ad_account_id: string;
  endpoint: string;
  method: string;
  status: 'success' | 'error';
  response_data?: any;
  error_message?: string;
  response_time_ms?: number;
}

async function logApiCall(supabase: any, log: AuditLog) {
  const { error } = await supabase
    .from('facebook_api_audit')
    .insert(log);
  
  if (error) {
    console.error('Error logging API call:', error);
  }
}

async function makeApiCall(
  endpoint: string,
  accessToken: string,
  agencyId: string,
  adAccountId: string,
  supabase: any
): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    const url = `https://graph.facebook.com/v18.0${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      await logApiCall(supabase, {
        agency_id: agencyId,
        ad_account_id: adAccountId,
        endpoint,
        method: 'GET',
        status: 'error',
        error_message: JSON.stringify(errorData),
        response_time_ms: responseTime,
      });
      console.error(`API call failed for ${endpoint}:`, errorData);
      return false;
    }

    const data = await response.json();
    
    await logApiCall(supabase, {
      agency_id: agencyId,
      ad_account_id: adAccountId,
      endpoint,
      method: 'GET',
      status: 'success',
      response_data: data,
      response_time_ms: responseTime,
    });
    
    console.log(`✅ Successful call to ${endpoint} (${responseTime}ms)`);
    return true;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logApiCall(supabase, {
      agency_id: agencyId,
      ad_account_id: adAccountId,
      endpoint,
      method: 'GET',
      status: 'error',
      error_message: error.message,
      response_time_ms: responseTime,
    });
    console.error(`Exception calling ${endpoint}:`, error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[HEARTBEAT] Starting Facebook Marketing API heartbeat');

    // Buscar todas as agências com conexões Facebook ativas
    const { data: connections, error: connectionsError } = await supabase
      .from('facebook_connections')
      .select(`
        id,
        agency_id,
        access_token,
        is_active,
        business_name
      `)
      .eq('is_active', true);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      console.log('No active Facebook connections found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active connections to ping',
          total_calls: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${connections.length} active connection(s)`);

    let totalCalls = 0;
    let successfulCalls = 0;
    let failedCalls = 0;

    // Para cada conexão, buscar ad accounts selecionadas
    for (const connection of connections) {
      console.log(`\n[AGENCY ${connection.agency_id}] Processing ${connection.business_name}`);

      // Buscar ad accounts selecionadas para esta agência
      const { data: selectedAccounts, error: accountsError } = await supabase
        .from('selected_ad_accounts')
        .select('ad_account_id, ad_account_name')
        .eq('agency_id', connection.agency_id)
        .eq('is_active', true);

      if (accountsError) {
        console.error('Error fetching selected accounts:', accountsError);
        continue;
      }

      if (!selectedAccounts || selectedAccounts.length === 0) {
        console.log('No selected ad accounts for this agency');
        continue;
      }

      console.log(`Found ${selectedAccounts.length} selected ad account(s)`);

      // Para cada ad account, fazer chamadas aos principais endpoints
      for (const account of selectedAccounts) {
        const adAccountId = account.ad_account_id;
        console.log(`\n  [AD ACCOUNT] ${account.ad_account_name} (${adAccountId})`);

        // Endpoints expandidos para cobrir mais áreas da API (Facebook requer uso real diversificado)
        const endpoints = [
          // Account Info - informações básicas da conta
          `/${adAccountId}?fields=id,name,account_status,currency,balance,amount_spent,business,funding_source_details`,
          
          // Campaigns - campanhas (limitado para evitar rate limit)
          `/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time&limit=10`,
          
          // Ad Sets - conjuntos de anúncios
          `/${adAccountId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal&limit=10`,
          
          // Ads - anúncios individuais
          `/${adAccountId}/ads?fields=id,name,status,creative,created_time&limit=10`,
          
          // Insights últimos 7 dias
          `/${adAccountId}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,frequency&date_preset=last_7d`,
          
          // Insights últimos 30 dias (período maior para demonstrar uso real)
          `/${adAccountId}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,conversions&date_preset=last_30d`,
          
          // Custom Audiences - públicos personalizados
          `/${adAccountId}/customaudiences?fields=id,name,subtype,approximate_count&limit=10`,
        ];

        for (const endpoint of endpoints) {
          totalCalls++;
          const success = await makeApiCall(
            endpoint,
            connection.access_token,
            connection.agency_id,
            adAccountId,
            supabase
          );
          
          if (success) {
            successfulCalls++;
          } else {
            failedCalls++;
          }
          
          // Pequeno delay entre chamadas para respeitar rate limits (300ms)
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    const successRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : '0';

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      total_connections: connections.length,
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      success_rate: `${successRate}%`,
    };

    console.log('\n[HEARTBEAT] Summary:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[HEARTBEAT] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
