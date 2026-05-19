import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type UazapiResponse = {
  ok: boolean;
  status: number;
  data: any;
};

type InstanceState = {
  status: 'connected' | 'connecting' | 'disconnected';
  qr_code: string | null;
  phone_number: string | null;
  raw_status: string | null;
  raw: any;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getUazapiConfig() {
  const apiUrl = (Deno.env.get('UAZAPI_SERVER_URL') || '').replace(/\/$/, '');
  const adminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN') || '';
  if (!apiUrl || !adminToken) throw new Error('Uazapi API not configured (missing UAZAPI_SERVER_URL or UAZAPI_ADMIN_TOKEN)');
  return { apiUrl, adminToken };
}

function generateInstanceName(agencyId: string, purpose: string): string {
  return `orbity_agency_${agencyId.substring(0, 8)}_${purpose}`;
}

function makeWebhookUrl(agencyId: string) {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook?agency_id=${agencyId}`;
}

async function uazapiRequest(
  apiUrl: string,
  path: string,
  options: {
    method?: string;
    token?: string | null;
    adminToken?: string | null;
    body?: Record<string, unknown> | null;
    timeoutMs?: number;
  } = {},
): Promise<UazapiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (options.adminToken) headers['admintoken'] = options.adminToken;
  if (options.token) headers['token'] = options.token;

  try {
    const res = await fetch(`${apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.instances)) return value.instances;
  if (Array.isArray(value?.instance)) return value.instance;
  if (value?.data && Array.isArray(value.data.instances)) return value.data.instances;
  return [];
}

function normalizeQrCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const qr = value.trim();
  if (!qr) return null;
  if (qr.startsWith('data:image/')) return qr;
  if (/^https?:\/\//i.test(qr)) return qr;

  const compact = qr.replace(/\s/g, '');
  // Aceita apenas strings com cara de imagem/base64. Evita tentar renderizar payload textual do QR como PNG.
  if (compact.length > 100 && /^[A-Za-z0-9+/=:_;,-]+$/.test(compact)) return compact;
  return null;
}

function extractQrCode(data: any): string | null {
  const candidates = [
    data?.qrcode,
    data?.qrCode,
    data?.qr_code,
    data?.base64,
    data?.instance?.qrcode,
    data?.instance?.qrCode,
    data?.instance?.qr_code,
    data?.instance?.base64,
    data?.status?.qrcode,
    data?.status?.qrCode,
    data?.status?.qr_code,
    data?.status?.base64,
    data?.data?.qrcode,
    data?.data?.qrCode,
    data?.data?.qr_code,
    data?.data?.base64,
    data?.data?.instance?.qrcode,
    data?.data?.instance?.qrCode,
    data?.data?.instance?.qr_code,
    data?.data?.instance?.base64,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeQrCode(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function extractToken(data: any): string | null {
  const candidates = [
    data?.token,
    data?.apiKey,
    data?.api_key,
    data?.instance?.token,
    data?.instance?.apiKey,
    data?.instance?.api_key,
    data?.data?.token,
    data?.data?.apiKey,
    data?.data?.api_key,
    data?.data?.instance?.token,
    data?.data?.instance?.apiKey,
    data?.data?.instance?.api_key,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function readRawStatus(data: any): string | null {
  const candidates = [
    data?.instance?.status,
    data?.instance?.state,
    data?.status?.status,
    data?.status?.state,
    data?.status,
    data?.state,
    data?.connection,
    data?.data?.instance?.status,
    data?.data?.status,
    data?.data?.state,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function normalizeStatus(data: any, hasQrCode: boolean): 'connected' | 'connecting' | 'disconnected' {
  const connectedFlag =
    data?.connected === true ||
    data?.status?.connected === true ||
    data?.instance?.connected === true ||
    data?.data?.connected === true ||
    data?.data?.instance?.connected === true;

  if (connectedFlag) return 'connected';

  const raw = (readRawStatus(data) || '').toLowerCase();
  const connectedStatuses = new Set(['connected', 'open', 'online', 'logged', 'authenticated']);
  const connectingStatuses = new Set(['connecting', 'qr', 'qrcode', 'pairing', 'opening', 'loading']);

  if (connectedStatuses.has(raw)) return 'connected';
  if (connectingStatuses.has(raw) || hasQrCode) return 'connecting';
  return 'disconnected';
}

function extractPhoneNumber(data: any): string | null {
  const candidates = [
    data?.phone,
    data?.phone_number,
    data?.owner,
    data?.instance?.owner,
    data?.instance?.phone,
    data?.instance?.phone_number,
    data?.instance?.profile?.id,
    data?.instance?.profile?.jid,
    data?.status?.owner,
    data?.data?.phone,
    data?.data?.owner,
    data?.data?.instance?.owner,
    data?.data?.instance?.phone,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const digits = candidate.replace(/\D/g, '');
    if (digits.length >= 10) return digits;
  }
  return null;
}

function parseInstanceState(raw: any): InstanceState {
  const qr_code = extractQrCode(raw);
  const status = normalizeStatus(raw, !!qr_code);
  return {
    status,
    qr_code,
    phone_number: extractPhoneNumber(raw),
    raw_status: readRawStatus(raw),
    raw,
  };
}

async function getIntegrationCredentials(supabase: any, agencyId: string) {
  const { data } = await supabase
    .from('agency_integrations')
    .select('id, credentials')
    .eq('agency_id', agencyId)
    .limit(1)
    .maybeSingle();

  return {
    id: data?.id ?? null,
    credentials: (data?.credentials as Record<string, unknown>) || {},
  };
}

async function saveIntegrationToken(supabase: any, agencyId: string, token: string | null) {
  try {
    const integration = await getIntegrationCredentials(supabase, agencyId);
    const credentials: Record<string, unknown> = { ...integration.credentials };

    if (token) {
      credentials.instance_token = token;
      credentials.uazapi_instance_token = token;
    } else {
      delete credentials.instance_token;
      delete credentials.uazapi_instance_token;
      delete credentials.evolution_api_key;
      delete credentials.evolution_url;
    }

    if (integration.id) {
      await supabase
        .from('agency_integrations')
        .update({ credentials, updated_at: new Date().toISOString() })
        .eq('id', integration.id);
    } else if (token) {
      await supabase
        .from('agency_integrations')
        .insert({ agency_id: agencyId, credentials, updated_at: new Date().toISOString() });
    }
  } catch (error) {
    console.warn('[whatsapp-connect] Could not persist legacy integration token:', errorMessage(error));
  }
}

async function getStoredAccount(supabase: any, agencyId: string, purpose: string) {
  const { data } = await supabase
    .from('whatsapp_accounts')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('purpose', purpose)
    .maybeSingle();

  return data;
}

async function getStoredToken(supabase: any, agencyId: string, purpose: string) {
  const account = await getStoredAccount(supabase, agencyId, purpose);
  if (account?.api_key) return account.api_key as string;

  const integration = await getIntegrationCredentials(supabase, agencyId);
  const token = integration.credentials.instance_token || integration.credentials.uazapi_instance_token;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

async function validateInstanceToken(apiUrl: string, token: string | null) {
  if (!token) return false;
  try {
    const res = await uazapiRequest(apiUrl, '/instance/status', { token });
    return res.ok;
  } catch {
    return false;
  }
}

async function findExistingInstanceToken(apiUrl: string, adminToken: string, instanceName: string, agencyId: string, purpose: string) {
  const listRes = await uazapiRequest(apiUrl, '/instance/all', { adminToken });
  if (!listRes.ok) return null;

  const instances = asArray(listRes.data);
  const existing = instances.find((inst) => {
    const names = [inst?.name, inst?.instanceName, inst?.id, inst?.instance?.name, inst?.instance?.instanceName];
    const sameName = names.some((name) => typeof name === 'string' && name === instanceName);
    const sameFields = inst?.adminField01 === agencyId && inst?.adminField02 === purpose;
    return sameName || sameFields;
  });

  return existing ? extractToken(existing) : null;
}

async function ensureInstanceToken(
  supabase: any,
  apiUrl: string,
  adminToken: string,
  agencyId: string,
  purpose: string,
  instanceName: string,
) {
  let token = await getStoredToken(supabase, agencyId, purpose);

  if (await validateInstanceToken(apiUrl, token)) return token as string;
  token = null;

  console.log(`[whatsapp-connect] Creating Uazapi instance: ${instanceName}`);
  const createRes = await uazapiRequest(apiUrl, '/instance/init', {
    method: 'POST',
    adminToken,
    body: {
      name: instanceName,
      systemName: 'Orbity',
      adminField01: agencyId,
      adminField02: purpose,
    },
  });

  if (!createRes.ok && createRes.status !== 409) {
    throw new Error(`Uazapi init error (${createRes.status}): ${JSON.stringify(createRes.data)}`);
  }

  token = extractToken(createRes.data);
  if (!token) {
    token = await findExistingInstanceToken(apiUrl, adminToken, instanceName, agencyId, purpose);
  }

  if (!token) {
    throw new Error('Uazapi did not return an instance token after /instance/init. Check UAZAPI_ADMIN_TOKEN permissions and instance name conflicts.');
  }

  await saveIntegrationToken(supabase, agencyId, token);
  return token;
}

async function configureWebhook(apiUrl: string, instanceToken: string, agencyId: string) {
  const webhookUrl = makeWebhookUrl(agencyId);
  const payload = {
    enabled: true,
    url: webhookUrl,
    events: ['connection', 'messages', 'messages_update'],
    excludeMessages: ['wasSentByApi', 'fromMeYes', 'isGroupYes'],
    addUrlEvents: false,
    addUrlTypesMessages: false,
    AddUrlTypesMessages: false,
  };

  const res = await uazapiRequest(apiUrl, '/webhook', {
    method: 'POST',
    token: instanceToken,
    body: payload,
  });

  if (!res.ok) {
    console.warn('[whatsapp-connect] Webhook config failed:', res.status, res.data);
  }

  return res;
}

async function inspectWebhook(apiUrl: string, instanceToken: string, agencyId: string) {
  const desiredUrl = makeWebhookUrl(agencyId);
  const current = await uazapiRequest(apiUrl, '/webhook', { token: instanceToken });
  const webhooks = current.ok ? asArray(current.data) : [];
  const alreadyConfigured = webhooks.some((webhook) => webhook?.url === desiredUrl && webhook?.enabled !== false);

  if (!alreadyConfigured) {
    const configured = await configureWebhook(apiUrl, instanceToken, agencyId);
    return {
      action: 'reconfigured',
      success: configured.ok,
      status: configured.status,
      webhook_url: desiredUrl,
      raw: configured.data,
    };
  }

  return {
    action: 'ok',
    success: true,
    webhook_url: desiredUrl,
    raw: current.data,
  };
}

async function fetchInstanceStatus(apiUrl: string, instanceToken: string): Promise<InstanceState> {
  const statusRes = await uazapiRequest(apiUrl, '/instance/status', { token: instanceToken });
  if (!statusRes.ok) {
    return {
      status: 'disconnected',
      qr_code: null,
      phone_number: null,
      raw_status: null,
      raw: statusRes.data,
    };
  }
  return parseInstanceState(statusRes.data);
}

async function connectInstance(apiUrl: string, instanceToken: string): Promise<InstanceState> {
  const connectRes = await uazapiRequest(apiUrl, '/instance/connect', {
    method: 'POST',
    token: instanceToken,
    body: {},
  });

  if (!connectRes.ok) {
    return {
      status: 'disconnected',
      qr_code: null,
      phone_number: null,
      raw_status: null,
      raw: connectRes.data,
    };
  }

  return parseInstanceState(connectRes.data);
}

async function getQrOrConnectedState(apiUrl: string, instanceToken: string) {
  let state = await connectInstance(apiUrl, instanceToken);

  if (state.status === 'connected' || state.qr_code) return state;

  // A Uazapi costuma atualizar o QR pelo endpoint de status; tentamos por alguns segundos
  // para evitar que o frontend fique preso em skeleton sem imagem.
  for (let attempt = 0; attempt < 3; attempt++) {
    await delay(1_000);
    state = await fetchInstanceStatus(apiUrl, instanceToken);
    if (state.status === 'connected' || state.qr_code) break;
  }

  return state;
}

async function upsertAccount(
  supabase: any,
  params: {
    agencyId: string;
    purpose: string;
    instanceName: string;
    apiUrl: string;
    token: string;
    state: InstanceState;
  },
) {
  const { error } = await supabase.from('whatsapp_accounts').upsert({
    agency_id: params.agencyId,
    instance_name: params.instanceName,
    api_url: params.apiUrl,
    api_key: params.token,
    status: params.state.status,
    qr_code: params.state.status === 'connected' ? null : params.state.qr_code,
    phone_number: params.state.phone_number,
    purpose: params.purpose,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'agency_id,purpose' });

  if (error) throw error;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { action, agency_id, purpose: rawPurpose } = await req.json();
    if (!agency_id) throw new Error('agency_id is required');

    const purpose = rawPurpose || 'general';

    const { data: membership } = await supabase
      .from('agency_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('agency_id', agency_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) throw new Error('Unauthorized');

    const { apiUrl, adminToken } = getUazapiConfig();
    const instanceName = generateInstanceName(agency_id, purpose);

    if (action === 'hard_reset') {
      console.log(`[whatsapp-connect] Performing hard reset for agency ${agency_id} / ${purpose}`);
      const token = await getStoredToken(supabase, agency_id, purpose);

      if (token) {
        await uazapiRequest(apiUrl, '/instance/disconnect', { method: 'POST', token }).catch(() => null);
        await uazapiRequest(apiUrl, '/instance', { method: 'DELETE', token }).catch(() => null);
      }

      await saveIntegrationToken(supabase, agency_id, null);
      await supabase.from('whatsapp_accounts').delete().eq('agency_id', agency_id).eq('purpose', purpose);

      return jsonResponse({ success: true, message: 'Hard reset complete', status: 'disconnected' });
    }

    if (action === 'connect' || action === 'refresh_qr') {
      const token = await ensureInstanceToken(supabase, apiUrl, adminToken, agency_id, purpose, instanceName);
      await configureWebhook(apiUrl, token, agency_id);

      const state = await getQrOrConnectedState(apiUrl, token);
      const safeState: InstanceState = state.status === 'connected' || state.qr_code
        ? state
        : { ...state, status: 'disconnected', qr_code: null };

      await upsertAccount(supabase, {
        agencyId: agency_id,
        purpose,
        instanceName,
        apiUrl,
        token,
        state: safeState,
      });

      return jsonResponse({
        success: true,
        status: safeState.status,
        qr_code: safeState.qr_code,
        phone_number: safeState.phone_number,
        error: safeState.status === 'disconnected'
          ? 'A Uazapi não retornou um QR Code válido. Tente atualizar o QR Code ou faça reset da conexão.'
          : null,
      });
    }

    if (action === 'status') {
      const acc = await getStoredAccount(supabase, agency_id, purpose);
      const token = acc?.api_key;

      if (!token) {
        return jsonResponse({ success: true, status: 'disconnected', qr_code: null, phone_number: null });
      }

      let state = await fetchInstanceStatus(apiUrl, token);

      // Se a instância ainda não entregou QR pelo status, tentamos iniciar conexão uma única vez.
      if (state.status !== 'connected' && !state.qr_code) {
        const connectState = await connectInstance(apiUrl, token);
        if (connectState.status === 'connected' || connectState.qr_code) state = connectState;
      }

      const safeState: InstanceState = state.status === 'connected' || state.qr_code
        ? state
        : { ...state, status: 'disconnected', qr_code: null };

      await upsertAccount(supabase, {
        agencyId: agency_id,
        purpose,
        instanceName: acc?.instance_name || instanceName,
        apiUrl: acc?.api_url || apiUrl,
        token,
        state: safeState,
      });

      return jsonResponse({
        success: true,
        status: safeState.status,
        qr_code: safeState.qr_code,
        phone_number: safeState.phone_number,
        error: safeState.status === 'disconnected' ? 'Instância desconectada ou QR Code ainda indisponível.' : null,
      });
    }

    if (action === 'check_webhook') {
      const token = await ensureInstanceToken(supabase, apiUrl, adminToken, agency_id, purpose, instanceName);
      const result = await inspectWebhook(apiUrl, token, agency_id);
      return jsonResponse(result);
    }

    if (action === 'disconnect') {
      const acc = await getStoredAccount(supabase, agency_id, purpose);
      if (acc?.api_key) {
        await uazapiRequest(apiUrl, '/instance/disconnect', { method: 'POST', token: acc.api_key }).catch(() => null);
      }

      await supabase
        .from('whatsapp_accounts')
        .update({ status: 'disconnected', qr_code: null, updated_at: new Date().toISOString() })
        .eq('agency_id', agency_id)
        .eq('purpose', purpose);

      return jsonResponse({ success: true, status: 'disconnected' });
    }

    throw new Error(`Unsupported action: ${action}`);
  } catch (error) {
    console.error('[whatsapp-connect] Error:', errorMessage(error));
    return jsonResponse({ success: false, error: errorMessage(error) }, 400);
  }
});
