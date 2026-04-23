import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MASTER_AGENCY_ID = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth client (uses caller's JWT)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // Verify caller is master agency admin
    const { data: isMaster, error: masterErr } = await userClient.rpc('is_master_agency_admin');
    if (masterErr || !isMaster) {
      return json({ error: 'Forbidden — master access required' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const agencyId: string | undefined = body?.agency_id;
    if (!agencyId || typeof agencyId !== 'string') {
      return json({ error: 'agency_id is required' }, 400);
    }
    if (agencyId === MASTER_AGENCY_ID) {
      return json({ error: 'Cannot delete master agency' }, 403);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Validate target agency status — must NOT be active
    const { data: agency, error: agencyErr } = await admin
      .from('agencies')
      .select('id, name, is_active')
      .eq('id', agencyId)
      .maybeSingle();

    if (agencyErr || !agency) {
      return json({ error: 'Agency not found' }, 404);
    }

    if (agency.is_active) {
      // Cross-check subscription status: only allow if also canceled or trial expired
      const { data: sub } = await admin
        .from('agency_subscriptions')
        .select('status, trial_end')
        .eq('agency_id', agencyId)
        .maybeSingle();

      const trialExpired = sub?.status === 'trial' && sub?.trial_end && new Date(sub.trial_end) < new Date();
      const canceledOrSuspended = sub?.status === 'canceled';

      if (!trialExpired && !canceledOrSuspended) {
        return json({ error: 'Apenas agências suspensas, canceladas ou com trial expirado podem ser excluídas.' }, 403);
      }
    }

    // Storage cleanup (best-effort)
    const buckets = ['client-files', 'task-attachments', 'post-attachments'];
    for (const bucket of buckets) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(agencyId, { limit: 1000 });
        if (files && files.length > 0) {
          const paths = files.map((f) => `${agencyId}/${f.name}`);
          await admin.storage.from(bucket).remove(paths);
        }
      } catch (err) {
        console.warn(`[master-delete-agency] storage cleanup failed for ${bucket}:`, err);
      }
    }

    // Cascade delete via RPC
    const { error: deleteErr } = await admin.rpc('delete_agency_cascade', { p_agency_id: agencyId });
    if (deleteErr) {
      console.error('[master-delete-agency] cascade delete failed:', deleteErr);
      return json({ error: deleteErr.message || 'Failed to delete agency' }, 500);
    }

    console.info(`[master-delete-agency] agency ${agencyId} (${agency.name}) deleted by user ${claims.claims.sub}`);
    return json({ success: true, agency_id: agencyId, agency_name: agency.name });
  } catch (err) {
    console.error('[master-delete-agency] unexpected error:', err);
    return json({ error: (err as Error).message || 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
