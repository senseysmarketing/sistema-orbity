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

    const balances = []
    let totalBalance = 0
    let currency = 'BRL'

    for (const accountId of accountIds) {
      try {
        console.log(`Checking balance for account: ${accountId}`)
        
        const balanceUrl = `https://graph.facebook.com/v18.0/${accountId}?fields=account_status,balance,account_currency&access_token=${connection.access_token}`
        
        const balanceResponse = await fetch(balanceUrl)
        const balanceData = await balanceResponse.json()

        if (balanceData.error) {
          console.error(`Error fetching balance for ${accountId}:`, balanceData.error)
          continue
        }

        const balance = balanceData.balance ? parseFloat(balanceData.balance) / 100 : 0 // Convert from cents
        const accountCurrency = balanceData.account_currency || 'BRL'
        
        balances.push({
          accountId: accountId,
          balance: balance,
          currency: accountCurrency,
          status: balanceData.account_status
        })

        totalBalance += balance
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