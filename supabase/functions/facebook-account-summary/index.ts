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

    const { accountIds } = await req.json()
    
    console.log('Fetching account summaries for:', accountIds)

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

    // Buscar agency_id do usuário
    const { data: agencyUser, error: agencyError } = await supabaseClient
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', authUser.user.id)
      .single()

    if (agencyError || !agencyUser) {
      console.error('Agency error:', agencyError)
      return new Response(
        JSON.stringify({ error: 'User not associated with any agency' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Buscar conexão Facebook ativa da agência
    const { data: connection, error: connectionError } = await supabaseClient
      .from('facebook_connections')
      .select('access_token')
      .eq('agency_id', agencyUser.agency_id)
      .eq('is_active', true)
      .single()

    if (connectionError) {
      console.error('Connection error:', connectionError)
      return new Response(
        JSON.stringify({ error: 'No active Facebook connection found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const accountSummaries = []
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    for (const accountId of accountIds) {
      try {
        console.log(`Fetching summary for account: ${accountId}`)
        
        // 1. Buscar informações da conta (incluindo saldo e funding_source)
        const accountUrl = `https://graph.facebook.com/v18.0/${accountId}?fields=id,name,account_status,balance,amount_spent,spend_cap,currency,funding_source_details,funding_source&access_token=${connection.access_token}`
        const accountResponse = await fetch(accountUrl)
        const accountData = await accountResponse.json()

        if (accountData.error) {
          console.error(`Error fetching account ${accountId}:`, accountData.error)
          continue
        }

        // 2. Buscar campanhas ativas com updated_time e daily_budget
        const campaignsUrl = `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,updated_time,daily_budget,lifetime_budget,effective_status&limit=100&access_token=${connection.access_token}`
        const campaignsResponse = await fetch(campaignsUrl)
        const campaignsData = await campaignsResponse.json()

        let activeCampaignsCount = 0
        let totalDailyBudget = 0
        let lastCampaignUpdate: string | null = null

        if (campaignsData.data) {
          for (const campaign of campaignsData.data) {
            if (campaign.status === 'ACTIVE' || campaign.effective_status === 'ACTIVE') {
              activeCampaignsCount++
              
              // Somar orçamento diário (converter de centavos para reais)
              if (campaign.daily_budget) {
                totalDailyBudget += parseFloat(campaign.daily_budget) / 100
              }
            }
            
            // Encontrar a data mais recente de atualização
            if (campaign.updated_time) {
              if (!lastCampaignUpdate || new Date(campaign.updated_time) > new Date(lastCampaignUpdate)) {
                lastCampaignUpdate = campaign.updated_time
              }
            }
          }
        }

        // 3. Buscar gasto dos últimos 7 dias
        const insightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=spend&time_range={'since':'${sevenDaysAgo.toISOString().split('T')[0]}','until':'${now.toISOString().split('T')[0]}'}&access_token=${connection.access_token}`
        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()

        let last7dSpend = 0
        if (insightsData.data && insightsData.data[0]) {
          last7dSpend = parseFloat(insightsData.data[0].spend || '0')
        }

        // =============================================
        // NOVA LÓGICA: Detectar tipo de conta (pré/pós-paga)
        // =============================================
        // Uma conta é PÓS-PAGA se tiver cartão de crédito associado
        // Caso contrário, é PRÉ-PAGA (Boleto, Pix, fundos depositados)
        
        const fundingType = accountData.funding_source_details?.type || ''
        const fundingDisplay = accountData.funding_source_details?.display_string || ''
        
        // Verificar se é pós-paga (tem cartão/crédito)
        const isPostpaid = 
          fundingType.toUpperCase().includes('CREDIT') ||
          fundingType.toUpperCase().includes('CARD') ||
          fundingDisplay.toLowerCase().includes('credit') ||
          fundingDisplay.toLowerCase().includes('cartão') ||
          fundingDisplay.toLowerCase().includes('card') ||
          fundingDisplay.toLowerCase().includes('visa') ||
          fundingDisplay.toLowerCase().includes('master')
        
        const isPrepaid = !isPostpaid
        
        console.log(`Account ${accountId}: funding_type="${fundingType}", funding_display="${fundingDisplay}", is_prepaid=${isPrepaid}`)

        // Extrair valores do Facebook (todos vêm em centavos)
        const spendCap = accountData.spend_cap ? parseFloat(accountData.spend_cap) / 100 : 0
        const amountSpent = accountData.amount_spent ? parseFloat(accountData.amount_spent) / 100 : 0
        const billBalance = accountData.balance ? parseFloat(accountData.balance) / 100 : 0

        // =============================================
        // NOVA LÓGICA: Calcular saldo disponível
        // =============================================
        let balance = 0

        if (isPrepaid) {
          // Fórmula da comunidade Meta para contas pré-pagas:
          // saldo_disponivel = (spend_cap - amount_spent) + balance
          // onde balance é o saldo de conta (pode ser negativo em alguns casos)
          if (spendCap > 0) {
            balance = (spendCap - amountSpent) + billBalance
          } else {
            // Se não tem spend_cap, usar o balance direto
            balance = billBalance
          }
        } else {
          // Para contas pós-pagas: limite - gasto
          balance = spendCap - amountSpent
        }

        console.log(`Account ${accountId}: spend_cap=${spendCap}, amount_spent=${amountSpent}, bill_balance=${billBalance}, calculated_balance=${balance}`)

        const summary = {
          ad_account_id: accountId,
          ad_account_name: accountData.name || accountId,
          currency: accountData.currency || 'BRL',
          balance: balance,
          is_prepaid: isPrepaid,
          spend_cap: spendCap,
          amount_spent: amountSpent,
          active_campaigns_count: activeCampaignsCount,
          total_daily_budget: totalDailyBudget,
          last_7d_spend: last7dSpend,
          last_campaign_update: lastCampaignUpdate,
          account_status: accountData.account_status,
          cached_at: now.toISOString()
        }

        accountSummaries.push(summary)

        // 4. Atualizar cache no banco de dados
        const { error: updateError } = await supabaseClient
          .from('selected_ad_accounts')
          .update({
            last_campaign_update: lastCampaignUpdate,
            active_campaigns_count: activeCampaignsCount,
            total_daily_budget: totalDailyBudget,
            last_7d_spend: last7dSpend,
            balance: balance,
            is_prepaid: isPrepaid,
            spend_cap: spendCap,
            amount_spent: amountSpent,
            cached_at: now.toISOString(),
            last_sync: now.toISOString()
          })
          .eq('ad_account_id', accountId)
          .eq('agency_id', agencyUser.agency_id)

        if (updateError) {
          console.error(`Error updating cache for ${accountId}:`, updateError)
        }

      } catch (error) {
        console.error(`Error processing account ${accountId}:`, error)
      }
    }

    console.log(`Processed ${accountSummaries.length} account summaries`)

    return new Response(
      JSON.stringify({ 
        summaries: accountSummaries,
        updated_at: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in facebook-account-summary function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})