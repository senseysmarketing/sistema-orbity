import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createOrGetInstance,
  connectInstance,
  getInstanceStatus,
  disconnectInstance,
  deleteInstance,
  parseQrCode,
  parseStatus,
  parsePhoneNumber,
  sendText,
  parseSendResponse,
  getUazapiConfig,
} from "../_shared/uazapi.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SETTING_KEY = 'master_whatsapp_instance';
const INSTANCE_NAME = 'orbity_master_official';
const MASTER_AGENCY_ID = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';

type Status = 'disconnected' | 'provisioning' | 'qr_pending' | 'connected' | 'error';

interface State {
  provider: 'uazapi';
  instance_name: string;
  token: string | null;
  status: Status;
  provider_status: string | null;
  phone_number: string | null;
  qr_code: string | null;
  last_error: string | null;
  last_checked_at: string | null;
  connected_at: string | null;
  updated_at: string;
}

const DEFAULT_STATE: State = {
  provider: 'uazapi',
  instance_name: INSTANCE_NAME,
  token: null,
  status: 'disconnected',
  provider_status: null,
  phone_number: null,
  qr_code: null,
  last_error: null,
  last_checked_at: null,
  connected_at: null,
  updated_at: new Date(0).toISOString(),
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function publicState(s: State) {
  return {
    status: s.status,
    qr_code: s.qr_code,
    phone_number: s.phone_number,
    error: s.last_error,
    provider_status: s.provider_status,
    last_checked_at: s.last_checked_at,
    connected_at: s.connected_at,
    instance_name: s.instance_name,
  };
}

function normalizeBrazilPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length <= 11 && !digits.startsWith('55')) digits = '55' + digits;
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits.slice(0, 4) + digits.slice(5);
  }
  return digits;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  async function loadState(): Promise<State> {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();
    let v: any = data?.value;
    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch { v = null; }
    }
    if (!v || typeof v !== 'object') return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...v };
  }

  async function saveState(patch: Partial<State>, current?: State): Promise<State> {
    const base = current ?? (await loadState());
    const next: State = {
      ...base,
      ...patch,
      updated_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
    };
    await supabase
      .from('system_config')
      .upsert({ key: SETTING_KEY, value: JSON.stringify(next), updated_at: next.updated_at }, { onConflict: 'key' });
    return next;
  }

  async function logEntry(entry: {
    action: string;
    phone_number?: string | null;
    status: 'success' | 'error';
    error_message?: string | null;
    provider_status?: string | null;
    provider_message_id?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await supabase.from('master_whatsapp_logs').insert({
        action: entry.action,
        phone_number: entry.phone_number ?? null,
        status: entry.status,
        error_message: entry.error_message ?? null,
        provider_status: entry.provider_status ?? null,
        provider_message_id: entry.provider_message_id ?? null,
        metadata: entry.metadata ?? {},
      });
    } catch (e) {
      console.error('[master-whatsapp] Failed to log entry:', (e as Error).message);
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? '';

    // ── Authorization ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '__none__';
    const isServiceRole = !!token && token === serviceKey;

    let userId: string | null = null;
    let isMaster = isServiceRole;

    if (!isServiceRole && token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        const { data: masterUser } = await supabase
          .from('master_users').select('id').eq('user_id', user.id).maybeSingle();
        if (masterUser) {
          isMaster = true;
        } else {
          const { data: au } = await supabase
            .from('agency_users').select('role')
            .eq('agency_id', MASTER_AGENCY_ID).eq('user_id', user.id).maybeSingle();
          if (au && (au.role === 'owner' || au.role === 'admin')) isMaster = true;
        }
      }
    }

    const masterActions = new Set(['debug_health', 'connect', 'status', 'refresh_qr', 'disconnect', 'hard_reset']);
    if (masterActions.has(action) && !isMaster) {
      return json({ success: false, error: 'Unauthorized: master access required' }, 403);
    }
    if (action === 'send_message' && !userId && !isServiceRole) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    console.log(`[master-whatsapp] Action: ${action}, isMaster: ${isMaster}, user: ${userId}`);

    // ── Helpers ──────────────────────────────────────────────────────
    async function performConnect(): Promise<State> {
      let state = await loadState();
      state = await saveState({ status: 'provisioning', last_error: null }, state);

      const { token: tk, lastResponse } = await createOrGetInstance(INSTANCE_NAME, {
        agencyId: 'orbity_master',
        purpose: 'master_official',
      });

      if (!tk) {
        const err = lastResponse?.data?.error || `Falha ao criar instância (HTTP ${lastResponse?.status})`;
        await logEntry({ action: 'connect', status: 'error', error_message: err });
        return await saveState({ status: 'error', last_error: err, token: null, qr_code: null }, state);
      }

      state = await saveState({ token: tk }, state);

      const connectRes = await connectInstance(tk);
      const qr = parseQrCode(connectRes.data);
      const parsed = parseStatus(connectRes.data, !!qr);
      const phone = parsePhoneNumber(connectRes.data);

      if (parsed.domain === 'connected') {
        const next = await saveState({
          status: 'connected',
          provider_status: parsed.raw,
          phone_number: phone,
          qr_code: null,
          last_error: null,
          connected_at: state.connected_at || new Date().toISOString(),
        }, state);
        await logEntry({ action: 'connect', status: 'success', provider_status: parsed.raw, metadata: { result: 'already_connected' } });
        return next;
      }

      if (qr) {
        const next = await saveState({
          status: 'qr_pending',
          provider_status: parsed.raw,
          qr_code: qr,
          last_error: null,
        }, state);
        await logEntry({ action: 'connect', status: 'success', provider_status: parsed.raw, metadata: { result: 'qr' } });
        return next;
      }

      const errMsg = 'Uazapi não retornou QR Code. Tente novamente ou use Hard Reset.';
      await logEntry({ action: 'connect', status: 'error', provider_status: parsed.raw, error_message: errMsg });
      return await saveState({
        status: 'error',
        provider_status: parsed.raw,
        qr_code: null,
        last_error: errMsg,
      }, state);
    }

    async function performStatus(): Promise<State> {
      let state = await loadState();
      if (!state.token) {
        return await saveState({
          status: 'disconnected', qr_code: null, phone_number: null, last_error: null, provider_status: null,
        }, state);
      }

      const res = await getInstanceStatus(state.token);
      if (!res.ok && (res.status === 401 || res.status === 404)) {
        const err = 'Instância inválida no provedor. Use Hard Reset para recriar.';
        return await saveState({ status: 'error', last_error: err, provider_status: null }, state);
      }

      const qr = parseQrCode(res.data);
      const parsed = parseStatus(res.data, !!qr);
      const phone = parsePhoneNumber(res.data);

      if (parsed.domain === 'connected') {
        return await saveState({
          status: 'connected',
          provider_status: parsed.raw,
          phone_number: phone || state.phone_number,
          qr_code: null,
          last_error: null,
          connected_at: state.connected_at || new Date().toISOString(),
        }, state);
      }

      if (parsed.domain === 'qr_pending' && qr) {
        return await saveState({
          status: 'qr_pending', provider_status: parsed.raw, qr_code: qr, last_error: null,
        }, state);
      }

      if (parsed.domain === 'provisioning') {
        return await saveState({
          status: 'provisioning', provider_status: parsed.raw, qr_code: null, last_error: null,
        }, state);
      }

      return await saveState({
        status: 'disconnected',
        provider_status: parsed.raw,
        qr_code: null,
        phone_number: null,
        last_error: null,
        connected_at: null,
      }, state);
    }

    // ── Dispatch ─────────────────────────────────────────────────────
    switch (action) {
      case 'debug_health': {
        let cfg: any = null;
        try { cfg = getUazapiConfig(); } catch (e) { cfg = { error: (e as Error).message }; }
        const state = await loadState();
        let providerPing: any = null;
        if (state.token) {
          const r = await getInstanceStatus(state.token);
          providerPing = { ok: r.ok, status: r.status, data: r.data };
        }
        return json({
          success: true,
          config_ok: !!cfg?.apiUrl && !!cfg?.adminToken,
          api_url: cfg?.apiUrl ?? null,
          state: { ...state, token: state.token ? '***' : null },
          provider_ping: providerPing,
        });
      }

      case 'connect':
      case 'refresh_qr': {
        const state = await performConnect();
        return json({ success: true, ...publicState(state) });
      }

      case 'status': {
        const state = await performStatus();
        return json({ success: true, ...publicState(state) });
      }

      case 'disconnect': {
        let state = await loadState();
        if (state.token) {
          await disconnectInstance(state.token);
        }
        state = await saveState({
          status: 'disconnected',
          qr_code: null,
          phone_number: null,
          last_error: null,
          connected_at: null,
          provider_status: null,
        }, state);
        await logEntry({ action: 'disconnect', status: 'success' });
        return json({ success: true, ...publicState(state) });
      }

      case 'hard_reset': {
        let state = await loadState();
        if (state.token) {
          try { await deleteInstance(state.token); } catch { /* ignore */ }
        }
        state = await saveState({
          token: null,
          status: 'disconnected',
          qr_code: null,
          phone_number: null,
          provider_status: null,
          last_error: null,
          connected_at: null,
        }, state);
        await logEntry({ action: 'hard_reset', status: 'success' });
        return json({ success: true, ...publicState(state) });
      }

      case 'send_message': {
        const phone: string = body?.phone || body?.phone_number || '';
        const message: string = body?.message || '';
        const context: string = body?.context || 'generic';
        if (!phone || !message) {
          return json({ success: false, error: 'Missing phone or message' }, 400);
        }

        let state = await loadState();

        // Stale (>60s) → refresh
        const stale = !state.last_checked_at || (Date.now() - new Date(state.last_checked_at).getTime() > 60_000);
        if (stale) {
          state = await performStatus();
        }

        if (!state.token || state.status !== 'connected') {
          const err = 'WhatsApp oficial Orbity desconectado. Reconecte no Painel Master.';
          await logEntry({
            action: 'send_message',
            phone_number: phone,
            status: 'error',
            error_message: err,
            provider_status: state.status,
            metadata: { context },
          });
          return json({ success: false, error: err, status: state.status }, 409);
        }

        const number = normalizeBrazilPhone(phone);
        const sendRes = await sendText({ api_key: state.token }, { number, text: message });
        const parsed = parseSendResponse(sendRes.raw);

        if (!sendRes.ok) {
          const err = sendRes.error || `Falha no envio (HTTP ${sendRes.status})`;
          await logEntry({
            action: 'send_message',
            phone_number: number,
            status: 'error',
            error_message: err,
            provider_status: parsed.status,
            metadata: { context, http_status: sendRes.status },
          });
          return json({ success: false, error: err }, 502);
        }

        await logEntry({
          action: 'send_message',
          phone_number: number,
          status: 'success',
          provider_status: parsed.status,
          provider_message_id: sendRes.messageId,
          metadata: { context },
        });

        return json({
          success: true,
          provider_message_id: sendRes.messageId,
          status: parsed.status,
        });
      }

      default:
        return json({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('[master-whatsapp] Error:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
