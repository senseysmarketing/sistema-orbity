import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('[CRON] ⏰ Starting scheduled Facebook data sync...');

  try {
    // Find all agencies with crm_ad_account_id configured
    const { data: agencies, error: agencyError } = await supabase
      .from('agencies')
      .select(`
        id,
        name,
        crm_ad_account_id,
        selected_ad_accounts!agencies_crm_ad_account_id_fkey(
          ad_account_id,
          ad_account_name
        )
      `)
      .not('crm_ad_account_id', 'is', null);

    if (agencyError) {
      console.error('[CRON] ❌ Error fetching agencies:', agencyError);
      throw agencyError;
    }

    if (!agencies || agencies.length === 0) {
      console.log('[CRON] ℹ️ No agencies with crm_ad_account_id found');
      return new Response(
        JSON.stringify({ success: true, message: 'No agencies to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CRON] 📊 Found ${agencies.length} agencies to sync`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const agency of agencies) {
      const adAccount = agency.selected_ad_accounts;
      
      if (!adAccount?.ad_account_id) {
        console.log(`[CRON] ⚠️ Agency ${agency.name}: No ad account found, skipping`);
        continue;
      }

      console.log(`[CRON] 🔄 Syncing agency: ${agency.name}, account: ${adAccount.ad_account_name}`);

      try {
        // Get active Facebook connection for this agency
        const { data: connection, error: connError } = await supabase
          .from('facebook_connections')
          .select('access_token')
          .eq('agency_id', agency.id)
          .eq('is_active', true)
          .single();

        if (connError || !connection) {
          console.log(`[CRON] ⚠️ Agency ${agency.name}: No active Facebook connection, skipping`);
          continue;
        }

        const accountId = adAccount.ad_account_id;
        const now = new Date();

        // Fetch current month spend
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthStart = firstDayOfMonth.toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

        const monthlyInsightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=spend&time_range={'since':'${currentMonthStart}','until':'${today}'}&access_token=${connection.access_token}`;
        const monthlyInsightsResponse = await fetch(monthlyInsightsUrl);
        const monthlyInsightsData = await monthlyInsightsResponse.json();

        if (monthlyInsightsData.error) {
          console.error(`[CRON] ❌ Facebook API error for ${agency.name}:`, monthlyInsightsData.error);
          errorCount++;
          continue;
        }

        let currentMonthSpend = 0;
        if (monthlyInsightsData.data && monthlyInsightsData.data[0]) {
          currentMonthSpend = parseFloat(monthlyInsightsData.data[0].spend || '0');
        }

        // Fetch last 7 days spend
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const insightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=spend&time_range={'since':'${sevenDaysAgo.toISOString().split('T')[0]}','until':'${today}'}&access_token=${connection.access_token}`;
        const insightsResponse = await fetch(insightsUrl);
        const insightsData = await insightsResponse.json();

        let last7dSpend = 0;
        if (insightsData.data && insightsData.data[0]) {
          last7dSpend = parseFloat(insightsData.data[0].spend || '0');
        }

        // Fetch account balance and info
        const accountUrl = `https://graph.facebook.com/v18.0/${accountId}?fields=id,name,balance,amount_spent,spend_cap,currency,funding_source_details&access_token=${connection.access_token}`;
        const accountResponse = await fetch(accountUrl);
        const accountData = await accountResponse.json();

        if (accountData.error) {
          console.error(`[CRON] ❌ Account data error for ${agency.name}:`, accountData.error);
          errorCount++;
          continue;
        }

        // Calculate balance
        const fundingType = String(accountData.funding_source_details?.type || '');
        const fundingDisplay = String(accountData.funding_source_details?.display_string || '');
        
        const isPostpaid = 
          fundingType.toUpperCase().includes('CREDIT') ||
          fundingType.toUpperCase().includes('CARD') ||
          fundingDisplay.toLowerCase().includes('credit') ||
          fundingDisplay.toLowerCase().includes('cartão');
        
        const isPrepaid = !isPostpaid;
        
        const spendCap = accountData.spend_cap ? parseFloat(accountData.spend_cap) / 100 : 0;
        const amountSpent = accountData.amount_spent ? parseFloat(accountData.amount_spent) / 100 : 0;
        const billBalance = accountData.balance ? parseFloat(accountData.balance) / 100 : 0;

        // Extract balance from display_string for prepaid accounts
        let balance = 0;
        if (isPrepaid) {
          const balanceMatch = fundingDisplay.match(/R\$\s*([\d.,]+)/i);
          if (balanceMatch && balanceMatch[1]) {
            const balanceStr = balanceMatch[1].replace(/\./g, '').replace(',', '.');
            balance = parseFloat(balanceStr);
          } else if (spendCap > 0) {
            balance = (spendCap - amountSpent) + billBalance;
          } else {
            balance = billBalance;
          }
        } else {
          balance = spendCap - amountSpent;
        }

        // Fetch active campaigns count
        const campaignsUrl = `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,status,effective_status&limit=100&access_token=${connection.access_token}`;
        const campaignsResponse = await fetch(campaignsUrl);
        const campaignsData = await campaignsResponse.json();

        let activeCampaignsCount = 0;
        if (campaignsData.data) {
          activeCampaignsCount = campaignsData.data.filter(
            (c: any) => c.status === 'ACTIVE' || c.effective_status === 'ACTIVE'
          ).length;
        }

        // Update cache in database
        const { error: updateError } = await supabase
          .from('selected_ad_accounts')
          .update({
            current_month_spend: currentMonthSpend,
            last_7d_spend: last7dSpend,
            balance: balance,
            is_prepaid: isPrepaid,
            spend_cap: spendCap,
            amount_spent: amountSpent,
            active_campaigns_count: activeCampaignsCount,
            cached_at: now.toISOString(),
            last_sync: now.toISOString()
          })
          .eq('ad_account_id', accountId);

        if (updateError) {
          console.error(`[CRON] ❌ Error updating cache for ${agency.name}:`, updateError);
          errorCount++;
          continue;
        }

        console.log(`[CRON] ✅ Agency ${agency.name} synced: spend=${currentMonthSpend}, balance=${balance}`);
        syncedCount++;

      } catch (err) {
        console.error(`[CRON] ❌ Error processing agency ${agency.name}:`, err);
        errorCount++;
      }
    }

    console.log(`[CRON] 🏁 Sync complete: ${syncedCount} synced, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount, 
        errors: errorCount,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CRON] ❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
