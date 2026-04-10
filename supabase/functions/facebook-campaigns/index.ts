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

    const { action, accountIds, accounts, dateRange, date_range, agencyId, agency_id } = await req.json()

    // Aceitar tanto 'list_campaigns' quanto a falta do parâmetro action para compatibilidade
    if (action === 'list_campaigns' || !action) {
      const finalAccountIds = accountIds || accounts || []
      const finalDateRange = dateRange || date_range
      
      console.log('Fetching campaigns for accounts:', finalAccountIds, 'Date range:', finalDateRange)

      if (!finalAccountIds || finalAccountIds.length === 0) {
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

      // Resolver agência alvo (multi-agency safe)
      const requestedAgencyId = agencyId || agency_id
      let targetAgencyId: string | null = null

      if (requestedAgencyId) {
        const { data: agencyUser, error: agencyUserError } = await supabaseClient
          .from('agency_users')
          .select('agency_id')
          .eq('user_id', authUser.user.id)
          .eq('agency_id', requestedAgencyId)
          .maybeSingle()

        if (agencyUserError) {
          console.error('Agency membership error:', agencyUserError)
          return new Response(
            JSON.stringify({ error: 'Failed to validate agency access' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        if (!agencyUser) {
          return new Response(
            JSON.stringify({ error: 'Forbidden' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          )
        }

        targetAgencyId = requestedAgencyId
      } else {
        const { data: memberships, error: membershipsError } = await supabaseClient
          .from('agency_users')
          .select('agency_id')
          .eq('user_id', authUser.user.id)

        if (membershipsError) {
          console.error('Agency memberships error:', membershipsError)
          return new Response(
            JSON.stringify({ error: 'Failed to resolve user agency' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        if (!memberships || memberships.length === 0) {
          return new Response(
            JSON.stringify({ error: 'User not associated with any agency' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        if (memberships.length > 1) {
          return new Response(
            JSON.stringify({ error: 'agencyId is required for multi-agency users' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        targetAgencyId = memberships[0].agency_id
      }

      // Buscar conexão Facebook ativa da agência
      const { data: connection, error: connectionError } = await supabaseClient
        .from('facebook_connections')
        .select('access_token')
        .eq('agency_id', targetAgencyId)
        .eq('is_active', true)
        .single()

      if (connectionError) {
        console.error('Connection error:', connectionError)
        return new Response(
          JSON.stringify({ error: 'No active Facebook connection found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const campaigns = []

      for (const accountId of finalAccountIds) {
        try {
          console.log(`Fetching campaigns for account: ${accountId}`)
          
          // Construir URL com campos expandidos incluindo updated_time, daily_budget, lifetime_budget
          let campaignsUrl = `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,objective,updated_time,daily_budget,lifetime_budget,effective_status`
          
          if (finalDateRange) {
            campaignsUrl += `,insights.time_range({'since':'${finalDateRange.from}','until':'${finalDateRange.to}'}){spend,impressions,clicks,actions,cost_per_action_type,cpm,cpc,ctr}`
          } else {
            campaignsUrl += `,insights{spend,impressions,clicks,actions,cost_per_action_type,cpm,cpc,ctr}`
          }
          
          campaignsUrl += `&access_token=${connection.access_token}`
          
          const campaignsResponse = await fetch(campaignsUrl)
          const campaignsData = await campaignsResponse.json()

          if (campaignsData.error) {
            console.error(`Error fetching campaigns for ${accountId}:`, campaignsData.error)
            continue
          }

          if (campaignsData.data) {
            for (const campaign of campaignsData.data) {
              const insights = campaign.insights?.data?.[0] || {}
              
              // Calcular conversões das ações
              let conversions = 0
              if (insights.actions) {
                for (const action of insights.actions) {
                  if (action.action_type === 'purchase' || 
                      action.action_type === 'lead' || 
                      action.action_type === 'complete_registration') {
                    conversions += parseInt(action.value) || 0
                  }
                }
              }

              // Converter daily_budget de centavos para reais (API retorna em centavos)
              const dailyBudget = campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null
              const lifetimeBudget = campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null

              campaigns.push({
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                effective_status: campaign.effective_status,
                objective: campaign.objective,
                updated_time: campaign.updated_time,
                daily_budget: dailyBudget,
                lifetime_budget: lifetimeBudget,
                spend: parseFloat(insights.spend || '0'),
                impressions: parseInt(insights.impressions || '0'),
                clicks: parseInt(insights.clicks || '0'),
                conversions: conversions,
                actions: insights.actions || [],
                cpm: parseFloat(insights.cpm || '0'),
                cpc: parseFloat(insights.cpc || '0'),
                ctr: parseFloat(insights.ctr || '0'),
                account_id: accountId
              })
            }
          }
        } catch (error) {
          console.error(`Error processing account ${accountId}:`, error)
        }
      }

      console.log(`Found ${campaigns.length} campaigns`)

      return new Response(
        JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Error in facebook-campaigns function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})