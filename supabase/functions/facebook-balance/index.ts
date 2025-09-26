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

    console.log('Checking balance for accounts:', accountIds)

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

    const balances = []
    let totalBalance = 0
    let currency = 'BRL'

    for (const accountId of accountIds) {
      try {
        console.log(`Checking balance for account: ${accountId}`)
        
        const balanceUrl = `https://graph.facebook.com/v18.0/${accountId}?fields=account_status,balance,currency,is_prepay_account,spend_cap,amount_spent&access_token=${connection.access_token}`
        
        const balanceResponse = await fetch(balanceUrl)
        const balanceData = await balanceResponse.json()

        if (balanceData.error) {
          console.error(`Error fetching balance for ${accountId}:`, balanceData.error)
          continue
        }

        const isPrepaidAccount = balanceData.is_prepay_account || false
        const accountCurrency = balanceData.currency || 'BRL'
        
        let availableBalance = 0
        
        if (isPrepaidAccount) {
          // Para contas pré-pagas: saldo disponível = spend_cap - amount_spent
          const spendCap = balanceData.spend_cap ? parseFloat(balanceData.spend_cap) / 100 : 0
          const amountSpent = balanceData.amount_spent ? parseFloat(balanceData.amount_spent) / 100 : 0
          availableBalance = Math.max(0, spendCap - amountSpent)
        } else {
          // Para contas mensais: usar balance tradicional
          availableBalance = balanceData.balance ? parseFloat(balanceData.balance) / 100 : 0
        }
        
        balances.push({
          accountId: accountId,
          balance: availableBalance,
          currency: accountCurrency,
          status: balanceData.account_status,
          isPrepaidAccount: isPrepaidAccount,
          spendCap: balanceData.spend_cap ? parseFloat(balanceData.spend_cap) / 100 : null,
          amountSpent: balanceData.amount_spent ? parseFloat(balanceData.amount_spent) / 100 : null
        })

        totalBalance += availableBalance
        currency = accountCurrency

      } catch (error) {
        console.error(`Error processing account ${accountId}:`, error)
      }
    }

    console.log(`Total balance: ${totalBalance} ${currency}`)

    return new Response(
      JSON.stringify({ 
        balances,
        totalBalance: totalBalance.toFixed(2),
        currency,
        message: `Saldo total: ${totalBalance.toFixed(2)} ${currency}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in facebook-balance function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})