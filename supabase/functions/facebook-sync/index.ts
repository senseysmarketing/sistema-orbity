import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, accountIds, dateRange } = await req.json()

    if (action === 'sync_metrics') {
      console.log('Syncing metrics for accounts:', accountIds)

      if (!accountIds || accountIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No account IDs provided' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Buscar conexão Facebook ativa do usuário
      const { data: authUser, error: authError } = await supabaseClient.auth.getUser(
        req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
      )

      if (authError) {
        console.error('Auth error:', authError)
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const { data: connection, error: connectionError } = await supabaseClient
        .from('facebook_connections')
        .select('access_token')
        .eq('user_id', authUser.user.id)
        .eq('is_active', true)
        .single()

      if (connectionError) {
        console.error('Connection error:', connectionError)
        return new Response(
          JSON.stringify({ error: 'No active Facebook connection found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const toDate = dateRange?.to || new Date().toISOString().split('T')[0]

      let totalSynced = 0

      for (const accountId of accountIds) {
        try {
          console.log(`Syncing metrics for account: ${accountId}`)
          
          // Buscar insights do Facebook API
          const insightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=spend,impressions,clicks,actions,cost_per_action_type,cpm,cpc,ctr,account_currency&time_range={"since":"${fromDate}","until":"${toDate}"}&time_increment=1&access_token=${connection.access_token}`
          
          const insightsResponse = await fetch(insightsUrl)
          const insightsData = await insightsResponse.json()

          if (insightsData.error) {
            console.error(`Error fetching insights for ${accountId}:`, insightsData.error)
            continue
          }

          if (insightsData.data) {
            for (const insight of insightsData.data) {
              // Calcular conversões das ações
              let conversions = 0
              let conversionRate = 0
              if (insight.actions) {
                for (const action of insight.actions) {
                  if (action.action_type === 'purchase' || 
                      action.action_type === 'lead' || 
                      action.action_type === 'complete_registration') {
                    conversions += parseInt(action.value) || 0
                  }
                }
              }

              const clicks = parseInt(insight.clicks || '0')
              if (clicks > 0 && conversions > 0) {
                conversionRate = (conversions / clicks) * 100
              }

              // Buscar saldo da conta
              let accountBalance = 0
              try {
                const balanceUrl = `https://graph.facebook.com/v18.0/${accountId}?fields=account_status,balance&access_token=${connection.access_token}`
                const balanceResponse = await fetch(balanceUrl)
                const balanceData = await balanceResponse.json()
                
                if (balanceData.balance) {
                  accountBalance = parseFloat(balanceData.balance) / 100 // Convert from cents
                }
              } catch (balanceError) {
                console.error(`Error fetching balance for ${accountId}:`, balanceError)
              }

              // Preparar dados para inserção
              const metricsData = {
                ad_account_id: accountId,
                date_start: insight.date_start,
                date_end: insight.date_stop,
                spend: parseFloat(insight.spend || '0'),
                impressions: parseInt(insight.impressions || '0'),
                clicks: clicks,
                conversions: conversions,
                conversion_rate: conversionRate,
                cpm: parseFloat(insight.cpm || '0'),
                cpc: parseFloat(insight.cpc || '0'),
                ctr: parseFloat(insight.ctr || '0'),
                account_balance: accountBalance,
                raw_data: insight
              }

              // Verificar se já existe o registro para evitar duplicatas
              const { data: existing } = await supabaseClient
                .from('ad_account_metrics')
                .select('id')
                .eq('ad_account_id', accountId)
                .eq('date_start', insight.date_start)
                .eq('date_end', insight.date_stop)
                .single()

              if (existing) {
                // Atualizar registro existente
                const { error: updateError } = await supabaseClient
                  .from('ad_account_metrics')
                  .update(metricsData)
                  .eq('id', existing.id)

                if (updateError) {
                  console.error('Error updating metrics:', updateError)
                }
              } else {
                // Inserir novo registro
                const { error: insertError } = await supabaseClient
                  .from('ad_account_metrics')
                  .insert(metricsData)

                if (insertError) {
                  console.error('Error inserting metrics:', insertError)
                } else {
                  totalSynced++
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing account ${accountId}:`, error)
        }
      }

      console.log(`Synced ${totalSynced} metrics records`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          syncedRecords: totalSynced,
          message: `Successfully synced metrics for ${accountIds.length} accounts`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Error in facebook-sync function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})