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

    const { accountIds, agencyId } = await req.json()
    
    console.log('Fetching account summaries for:', accountIds, 'agencyId:', agencyId)

    if (!accountIds || accountIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No account IDs provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!agencyId) {
      return new Response(
        JSON.stringify({ error: 'Agency ID is required' }),
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

    // Validar que o usuário pertence à agência informada
    const { data: agencyUser, error: agencyError } = await supabaseClient
      .from('agency_users')
      .select('agency_id, role')
      .eq('user_id', authUser.user.id)
      .eq('agency_id', agencyId)
      .maybeSingle()

    if (agencyError) {
      console.error('Agency error:', agencyError)
      return new Response(
        JSON.stringify({ error: 'Error validating agency access' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!agencyUser) {
      console.error('User not authorized for agency:', agencyId)
      return new Response(
        JSON.stringify({ error: 'User not authorized for this agency' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    const validatedAgencyId = agencyUser.agency_id

    // Buscar conexão Facebook ativa da agência
    const { data: connection, error: connectionError } = await supabaseClient
      .from('facebook_connections')
      .select('access_token')
      .eq('agency_id', validatedAgencyId)
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

    // Função para processar uma única conta
    const processAccount = async (accountId: string) => {
      try {
        console.log(`Fetching summary for account: ${accountId}`)
        
        // 1. Buscar informações da conta (incluindo saldo e funding_source)
        const accountUrl = `https://graph.facebook.com/v18.0/${accountId}?fields=id,name,account_status,balance,amount_spent,spend_cap,currency,funding_source_details,funding_source&access_token=${connection.access_token}`
        const accountResponse = await fetch(accountUrl)
        const accountData = await accountResponse.json()

        if (accountData.error) {
          console.error(`Error fetching account ${accountId}:`, accountData.error)
          return null
        }

        // 2. Buscar campanhas ativas com updated_time e daily_budget
        const campaignsUrl = `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,updated_time,daily_budget,lifetime_budget,effective_status&limit=100&access_token=${connection.access_token}`
        const campaignsResponse = await fetch(campaignsUrl)
        const campaignsData = await campaignsResponse.json()

        let activeCampaignsCount = 0
        let campaignDailyBudget = 0
        let lastCampaignUpdate: string | null = null

        if (campaignsData.data) {
          for (const campaign of campaignsData.data) {
            if (campaign.status === 'ACTIVE' || campaign.effective_status === 'ACTIVE') {
              activeCampaignsCount++
              
              // Somar orçamento diário (converter de centavos para reais)
              if (campaign.daily_budget) {
                campaignDailyBudget += parseFloat(campaign.daily_budget) / 100
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

        // 2.1 Buscar ad sets para orçamento e última atualização
        const adsetsUrl = `https://graph.facebook.com/v18.0/${accountId}/adsets?fields=id,status,effective_status,daily_budget,updated_time&limit=500&access_token=${connection.access_token}`
        const adsetsResponse = await fetch(adsetsUrl)
        const adsetsData = await adsetsResponse.json()

        let adsetDailyBudget = 0
        let lastAdsetUpdate: string | null = null

        if (adsetsData.data) {
          for (const adset of adsetsData.data) {
            // Somar orçamento diário dos ad sets ativos
            if (adset.status === 'ACTIVE' || adset.effective_status === 'ACTIVE') {
              if (adset.daily_budget) {
                adsetDailyBudget += parseFloat(adset.daily_budget) / 100
              }
            }
            
            // Encontrar data mais recente de atualização
            if (adset.updated_time) {
              if (!lastAdsetUpdate || new Date(adset.updated_time) > new Date(lastAdsetUpdate)) {
                lastAdsetUpdate = adset.updated_time
              }
            }
          }
        }

        // 2.2 Buscar ads para pegar updated_time mais recente
        const adsUrl = `https://graph.facebook.com/v18.0/${accountId}/ads?fields=id,updated_time&limit=500&access_token=${connection.access_token}`
        const adsResponse = await fetch(adsUrl)
        const adsData = await adsResponse.json()

        let lastAdUpdate: string | null = null

        if (adsData.data) {
          for (const ad of adsData.data) {
            if (ad.updated_time) {
              if (!lastAdUpdate || new Date(ad.updated_time) > new Date(lastAdUpdate)) {
                lastAdUpdate = ad.updated_time
              }
            }
          }
        }

        // Determinar orçamento diário final (usar ad sets se campanha = 0)
        let totalDailyBudget = campaignDailyBudget
        if (totalDailyBudget === 0 && adsetDailyBudget > 0) {
          totalDailyBudget = adsetDailyBudget
          console.log(`Account ${accountId}: Using adset-level budget: ${totalDailyBudget}`)
        }

        // Determinar última atualização mais recente entre campanhas, ad sets e ads
        let lastUpdate: string | null = null
        const updates = [lastCampaignUpdate, lastAdsetUpdate, lastAdUpdate].filter(Boolean) as string[]
        for (const update of updates) {
          if (!lastUpdate || new Date(update) > new Date(lastUpdate)) {
            lastUpdate = update
          }
        }

        console.log(`Account ${accountId}: Budget - Campaign: ${campaignDailyBudget}, AdSet: ${adsetDailyBudget}, Using: ${totalDailyBudget}`)
        console.log(`Account ${accountId}: Last update - Campaign: ${lastCampaignUpdate}, AdSet: ${lastAdsetUpdate}, Ad: ${lastAdUpdate} -> Using: ${lastUpdate}`)

        // 3. Buscar gasto dos últimos 7 dias
        const insightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=spend&time_range={'since':'${sevenDaysAgo.toISOString().split('T')[0]}','until':'${now.toISOString().split('T')[0]}'}&access_token=${connection.access_token}`
        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()

        let last7dSpend = 0
        if (insightsData.data && insightsData.data[0]) {
          last7dSpend = parseFloat(insightsData.data[0].spend || '0')
        }

        // 4. Buscar gasto do mês atual (para contas pós-pagas)
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthStart = firstDayOfMonth.toISOString().split('T')[0]
        const today = now.toISOString().split('T')[0]
        
        const monthlyInsightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=spend&time_range={'since':'${currentMonthStart}','until':'${today}'}&access_token=${connection.access_token}`
        const monthlyInsightsResponse = await fetch(monthlyInsightsUrl)
        const monthlyInsightsData = await monthlyInsightsResponse.json()

        let currentMonthSpend = 0
        if (monthlyInsightsData.data && monthlyInsightsData.data[0]) {
          currentMonthSpend = parseFloat(monthlyInsightsData.data[0].spend || '0')
        }
        
        console.log(`Account ${accountId}: Current month spend (${currentMonthStart} to ${today}): ${currentMonthSpend}`)

        // Garantir que são strings antes de usar métodos de string
        const fundingType = String(accountData.funding_source_details?.type || '')
        const fundingDisplay = String(accountData.funding_source_details?.display_string || '')
        
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

        // Regex para pegar valores como: R$0,07 ou R$ 1.234,56
        const balanceMatch = fundingDisplay.match(/R\$\s*([\d.,]+)/i)
        let extractedBalance: number | null = null

        if (balanceMatch && balanceMatch[1]) {
          const balanceStr = balanceMatch[1]
            .replace(/\./g, '')
            .replace(',', '.')
          extractedBalance = parseFloat(balanceStr)
          
          console.log(`Account ${accountId}: Extracted balance from display_string: ${extractedBalance}`)
        }

        // Extrair valores do Facebook (todos vêm em centavos)
        const spendCap = accountData.spend_cap ? parseFloat(accountData.spend_cap) / 100 : 0
        const amountSpent = accountData.amount_spent ? parseFloat(accountData.amount_spent) / 100 : 0
        const billBalance = accountData.balance ? parseFloat(accountData.balance) / 100 : 0

        // Calcular saldo disponível
        let balance = 0

        if (isPrepaid) {
          if (extractedBalance !== null && !isNaN(extractedBalance)) {
            balance = extractedBalance
            console.log(`Account ${accountId}: Using extracted balance from display_string: ${balance}`)
          } 
          else if (spendCap > 0) {
            balance = (spendCap - amountSpent) + billBalance
            console.log(`Account ${accountId}: Using formula (spend_cap - amount_spent + bill_balance): ${balance}`)
          } 
          else {
            balance = billBalance
            console.log(`Account ${accountId}: Using bill_balance directly: ${balance}`)
          }
        } else {
          balance = spendCap - amountSpent
        }

        console.log(`Account ${accountId}: FINAL - is_prepaid=${isPrepaid}, extracted=${extractedBalance}, formula=${(spendCap - amountSpent) + billBalance}, bill_balance=${billBalance}, USING=${balance}`)

        const summary = {
          ad_account_id: accountId,
          ad_account_name: accountData.name || accountId,
          currency: accountData.currency || 'BRL',
          balance: balance,
          is_prepaid: isPrepaid,
          spend_cap: spendCap,
          amount_spent: amountSpent,
          current_month_spend: currentMonthSpend,
          active_campaigns_count: activeCampaignsCount,
          total_daily_budget: totalDailyBudget,
          last_7d_spend: last7dSpend,
          last_campaign_update: lastUpdate,
          account_status: accountData.account_status,
          cached_at: now.toISOString()
        }

        // 5. Atualizar cache no banco de dados
        console.log(`Account ${accountId}: Updating cache in DB with current_month_spend=${currentMonthSpend}`)
        
        const { error: updateError } = await supabaseClient
          .from('selected_ad_accounts')
          .update({
            last_campaign_update: lastUpdate,
            active_campaigns_count: activeCampaignsCount,
            total_daily_budget: totalDailyBudget,
            last_7d_spend: last7dSpend,
            balance: balance,
            is_prepaid: isPrepaid,
            spend_cap: spendCap,
            amount_spent: amountSpent,
            current_month_spend: currentMonthSpend,
            cached_at: now.toISOString(),
            last_sync: now.toISOString()
          })
          .eq('ad_account_id', accountId)

        if (updateError) {
          console.error(`Error updating cache for ${accountId}:`, updateError)
        }

        return summary

      } catch (error) {
        console.error(`Error processing account ${accountId}:`, error)
        return null
      }
    }

    // Processar contas em lotes paralelos de 5 para melhor performance
    const BATCH_SIZE = 5
    console.log(`Processing ${accountIds.length} accounts in batches of ${BATCH_SIZE}`)
    
    for (let i = 0; i < accountIds.length; i += BATCH_SIZE) {
      const batch = accountIds.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: accounts ${i + 1} to ${Math.min(i + BATCH_SIZE, accountIds.length)}`)
      
      const batchResults = await Promise.all(
        batch.map(accountId => processAccount(accountId))
      )
      
      // Filtrar resultados nulos e adicionar ao array
      accountSummaries.push(...batchResults.filter(Boolean))
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