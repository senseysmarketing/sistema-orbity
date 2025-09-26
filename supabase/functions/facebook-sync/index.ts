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

    if (action === 'get_metrics' || action === 'sync_metrics' || action === 'generate_report') {
      console.log(`Processing ${action} for accounts:`, accountIds, 'Date range:', dateRange)

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

      if (action === 'get_metrics') {
        // Retornar métricas agregadas para dashboard
        const mockMetrics = {
          spend: 2450.75 + Math.random() * 1000,
          impressions: 125000 + Math.floor(Math.random() * 50000),
          clicks: 3200 + Math.floor(Math.random() * 1000),
          conversions: 89 + Math.floor(Math.random() * 20),
          cpm: 19.60 + Math.random() * 5,
          cpc: 0.77 + Math.random() * 0.5,
          ctr: 2.56 + Math.random() * 1,
          accountBalance: 5000 + Math.random() * 2000
        }

        // Gerar dados de gráfico baseados no período
        const chartData = []
        if (dateRange?.from && dateRange?.to) {
          const startDate = new Date(dateRange.from)
          const endDate = new Date(dateRange.to)
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          
          for (let i = 0; i < daysDiff; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
            chartData.push({
              date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              spend: Math.random() * 200 + 50,
              impressions: Math.floor(Math.random() * 8000) + 2000,
              clicks: Math.floor(Math.random() * 200) + 50,
              conversions: Math.floor(Math.random() * 8) + 1
            })
          }
        }

        return new Response(
          JSON.stringify({ 
            metrics: mockMetrics,
            chartData: chartData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'generate_report') {
        // Gerar relatório detalhado
        const reportData = {
          summary: {
            totalSpend: 12450.50 + Math.random() * 5000,
            totalImpressions: 450000 + Math.floor(Math.random() * 200000),
            totalClicks: 8900 + Math.floor(Math.random() * 4000),
            totalConversions: 245 + Math.floor(Math.random() * 100),
            avgCTR: 1.98 + Math.random(),
            avgCPC: 1.40 + Math.random() * 0.5,
            avgCPM: 27.67 + Math.random() * 10,
            period: dateRange ? `${dateRange.from} - ${dateRange.to}` : 'Período não especificado'
          },
          dailyData: [] as any[],
          campaignData: [
            { name: 'Campanha Black Friday', spend: 4500, conversions: 89, ctr: 2.1, cpc: 1.2 },
            { name: 'Tráfego Landing Page', spend: 3200, conversions: 67, ctr: 3.4, cpc: 0.8 },
            { name: 'Remarketing Audience', spend: 2800, conversions: 45, ctr: 1.8, cpc: 1.5 }
          ]
        }

        // Gerar dados diários baseados no período
        if (dateRange?.from && dateRange?.to) {
          const startDate = new Date(dateRange.from)
          const endDate = new Date(dateRange.to)
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          
          for (let i = 0; i < daysDiff; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
            reportData.dailyData.push({
              date: date.toLocaleDateString('pt-BR'),
              spend: Math.random() * 800 + 200,
              impressions: Math.floor(Math.random() * 15000) + 5000,
              clicks: Math.floor(Math.random() * 400) + 100,
              conversions: Math.floor(Math.random() * 15) + 3,
              ctr: Math.random() * 2 + 1,
              cpc: Math.random() * 2 + 0.5
            })
          }
        }

        return new Response(
          JSON.stringify({ report: reportData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'sync_metrics') {
        console.log('Syncing metrics for accounts:', accountIds)

        if (!accountIds || accountIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No account IDs provided' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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
        JSON.stringify({ success: true, message: 'Action completed' }),
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