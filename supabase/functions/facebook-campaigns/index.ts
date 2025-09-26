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

    const { action, accountIds } = await req.json()

    if (action === 'list_campaigns') {
      console.log('Fetching campaigns for accounts:', accountIds)

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

      const campaigns = []

      for (const accountId of accountIds) {
        try {
          console.log(`Fetching campaigns for account: ${accountId}`)
          
          // Fetch campaigns from Facebook API
          const campaignsUrl = `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,objective,insights{spend,impressions,clicks,actions,cost_per_action_type,cpm,cpc,ctr}&access_token=${connection.access_token}`
          
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

              campaigns.push({
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                spend: parseFloat(insights.spend || '0'),
                impressions: parseInt(insights.impressions || '0'),
                clicks: parseInt(insights.clicks || '0'),
                conversions: conversions,
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