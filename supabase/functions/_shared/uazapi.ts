// Shared Uazapi client helpers.
// Pure functions: no Supabase coupling. Endpoints documented at https://docs.uazapi.com/

export type UazapiResponse = {
  ok: boolean;
  status: number;
  data: any;
  endpoint: string;
};

export type ConnectionStatus = 'disconnected' | 'provisioning' | 'qr_pending' | 'connected' | 'error';

export function getUazapiConfig() {
  const apiUrl = (Deno.env.get('UAZAPI_SERVER_URL') || '').replace(/\/$/, '');
  const adminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN') || '';
  if (!apiUrl || !adminToken) {
    throw new Error('Uazapi não configurada (UAZAPI_SERVER_URL / UAZAPI_ADMIN_TOKEN ausentes).');
  }
  return { apiUrl, adminToken };
}

export async function uazapiRequest(
  endpoint: string,
  options: {
    method?: string;
    token?: string | null;
    adminToken?: string | null;
    body?: Record<string, unknown> | null;
    timeoutMs?: number;
    apiUrl?: string;
  } = {},
): Promise<UazapiResponse> {
  const { apiUrl: baseFromArg, method = 'GET', token, adminToken, body, timeoutMs = 15_000 } = options;
  const apiUrl = baseFromArg ?? getUazapiConfig().apiUrl;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers['token'] = token;
  if (adminToken) headers['admintoken'] = adminToken;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data: any = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }
    return { ok: res.ok, status: res.status, data, endpoint };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: err instanceof Error ? err.message : String(err) },
      endpoint,
    };
  } finally {
    clearTimeout(tid);
  }
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.instances)) return value.instances;
  if (Array.isArray(value?.instance)) return value.instance;
  return [];
}

export function extractToken(data: any): string | null {
  const candidates = [
    data?.token, data?.apiKey, data?.api_key,
    data?.instance?.token, data?.instance?.apiKey, data?.instance?.api_key,
    data?.data?.token, data?.data?.apiKey, data?.data?.api_key,
    data?.data?.instance?.token,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export function parseQrCode(data: any): string | null {
  const candidates = [
    data?.qrcode, data?.qrCode, data?.qr_code, data?.base64,
    data?.instance?.qrcode, data?.instance?.qrCode, data?.instance?.qr_code, data?.instance?.base64,
    data?.status?.qrcode, data?.status?.base64,
    data?.data?.qrcode, data?.data?.qrCode, data?.data?.qr_code, data?.data?.base64,
    data?.data?.instance?.qrcode, data?.data?.instance?.base64,
  ];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const qr = raw.trim();
    if (!qr) continue;
    if (qr.startsWith('data:image/')) return qr;
    if (/^https?:\/\//i.test(qr)) return qr;
    const compact = qr.replace(/\s/g, '');
    if (compact.length > 100 && /^[A-Za-z0-9+/=:_;,-]+$/.test(compact)) {
      return `data:image/png;base64,${compact}`;
    }
  }
  return null;
}

function readRawStatus(data: any): string | null {
  const candidates = [
    data?.instance?.status, data?.instance?.state,
    data?.status?.status, data?.status?.state,
    data?.status, data?.state, data?.connection,
    data?.data?.instance?.status, data?.data?.status,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export function parseStatus(data: any, hasQr: boolean): { domain: ConnectionStatus; raw: string | null } {
  const raw = readRawStatus(data);
  const rawLower = (raw || '').toLowerCase();

  const connectedFlag =
    data?.connected === true ||
    data?.instance?.connected === true ||
    data?.status?.connected === true ||
    data?.data?.connected === true;
  const connectedStatuses = new Set(['connected', 'open', 'online', 'logged', 'authenticated']);
  const qrStatuses = new Set(['qr', 'qrcode', 'pairing', 'qrcode_required', 'scan_qr']);
  const connectingStatuses = new Set(['connecting', 'opening', 'loading', 'initializing']);

  if (connectedFlag || connectedStatuses.has(rawLower)) return { domain: 'connected', raw };
  if (hasQr || qrStatuses.has(rawLower)) return { domain: 'qr_pending', raw };
  if (connectingStatuses.has(rawLower)) return { domain: 'provisioning', raw };
  return { domain: 'disconnected', raw };
}

export function parsePhoneNumber(data: any): string | null {
  const candidates = [
    data?.phone, data?.phone_number, data?.owner,
    data?.instance?.owner, data?.instance?.phone, data?.instance?.phone_number,
    data?.instance?.profile?.id, data?.instance?.profile?.jid, data?.instance?.me?.id,
    data?.status?.owner,
    data?.data?.phone, data?.data?.owner, data?.data?.instance?.owner, data?.data?.instance?.phone,
  ];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const digits = c.replace(/\D/g, '');
    if (digits.length >= 10) return digits;
  }
  return null;
}

/**
 * Cria a instância na Uazapi (se já existir, busca o token em /instance/all).
 * Retorna { token, raw, created }.
 */
export async function createOrGetInstance(
  instanceName: string,
  meta: { agencyId: string; purpose: string },
): Promise<{ token: string | null; created: boolean; lastResponse: UazapiResponse }> {
  const { adminToken } = getUazapiConfig();

  const initRes = await uazapiRequest('/instance/init', {
    method: 'POST',
    adminToken,
    body: {
      name: instanceName,
      systemName: 'Orbity',
      adminField01: meta.agencyId,
      adminField02: meta.purpose,
    },
  });

  let token = extractToken(initRes.data);
  if (token) return { token, created: initRes.ok, lastResponse: initRes };

  // Fallback: listar instâncias e localizar a existente
  const listRes = await uazapiRequest('/instance/all', { adminToken });
  if (listRes.ok) {
    const instances = asArray(listRes.data);
    const match = instances.find((inst) => {
      const names = [inst?.name, inst?.instanceName, inst?.id, inst?.instance?.name];
      const sameName = names.some((n) => typeof n === 'string' && n === instanceName);
      const sameMeta = inst?.adminField01 === meta.agencyId && inst?.adminField02 === meta.purpose;
      return sameName || sameMeta;
    });
    if (match) token = extractToken(match);
  }
  return { token, created: false, lastResponse: initRes };
}

export async function connectInstance(token: string): Promise<UazapiResponse> {
  return await uazapiRequest('/instance/connect', { method: 'POST', token, body: {} });
}

export async function getInstanceStatus(token: string): Promise<UazapiResponse> {
  return await uazapiRequest('/instance/status', { method: 'GET', token });
}

export async function disconnectInstance(token: string): Promise<UazapiResponse> {
  return await uazapiRequest('/instance/disconnect', { method: 'POST', token, body: {} });
}

export async function deleteInstance(token: string): Promise<UazapiResponse> {
  return await uazapiRequest('/instance/delete', { method: 'POST', token, body: {} });
}

export async function configureWebhook(
  token: string,
  url: string,
  events: string[] = ['connection', 'messages', 'messages_update'],
): Promise<UazapiResponse> {
  return await uazapiRequest('/webhook', {
    method: 'POST',
    token,
    body: {
      enabled: true,
      url,
      events,
      excludeMessages: ['wasSentByApi', 'fromMeYes', 'isGroupYes'],
      addUrlEvents: false,
      addUrlTypesMessages: false,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Messaging
// ─────────────────────────────────────────────────────────────────────────────

export interface SendTextResult {
  ok: boolean;
  status: number;
  messageId: string | null;
  remoteJid: string | null;
  providerStatus: string | null;
  raw: any;
  error?: string;
}

/**
 * Sends a plain-text message via Uazapi v2 (`POST /send/text`).
 * Uses the instance token (account.api_key). Falls back to UAZAPI_SERVER_URL.
 */
export async function sendText(
  account: { api_url?: string | null; api_key: string },
  payload: { number: string; text: string },
): Promise<SendTextResult> {
  const apiUrl = (account.api_url || Deno.env.get('UAZAPI_SERVER_URL') || '').replace(/\/$/, '');
  if (!apiUrl) {
    return { ok: false, status: 0, messageId: null, remoteJid: null, providerStatus: null, raw: null, error: 'UAZAPI_SERVER_URL not configured' };
  }
  const res = await uazapiRequest('/send/text', {
    apiUrl,
    method: 'POST',
    token: account.api_key,
    body: { number: payload.number, text: payload.text },
    timeoutMs: 20_000,
  });
  const parsed = parseSendResponse(res.data);
  return {
    ok: res.ok && !parsed.error,
    status: res.status,
    messageId: parsed.messageId,
    remoteJid: parsed.remoteJid,
    providerStatus: parsed.status,
    raw: res.data,
    error: !res.ok ? (parsed.error || `HTTP ${res.status}`) : parsed.error,
  };
}

/** Calls `POST /message/find` to fetch history for a chat. */
export async function findMessages(
  account: { api_url?: string | null; api_key: string },
  body: Record<string, unknown>,
): Promise<UazapiResponse> {
  const apiUrl = (account.api_url || Deno.env.get('UAZAPI_SERVER_URL') || '').replace(/\/$/, '');
  return await uazapiRequest('/message/find', {
    apiUrl,
    method: 'POST',
    token: account.api_key,
    body,
    timeoutMs: 20_000,
  });
}

export function parseSendResponse(data: any): {
  messageId: string | null;
  remoteJid: string | null;
  status: string | null;
  error: string | undefined;
} {
  if (!data) return { messageId: null, remoteJid: null, status: null, error: undefined };

  const errCandidates = [data?.error, data?.message?.error, data?.data?.error];
  const errStr = errCandidates.find((e) => typeof e === 'string' && e.trim());

  const idCandidates = [
    data?.messageid, data?.messageId, data?.message_id, data?.id,
    data?.key?.id, data?.message?.id, data?.message?.key?.id,
    data?.data?.id, data?.data?.messageId, data?.data?.key?.id,
  ];
  const messageId = idCandidates.find((v) => typeof v === 'string' && v.trim()) || null;

  const jidCandidates = [
    data?.remoteJid, data?.remote_jid, data?.chatid, data?.chatId, data?.to,
    data?.key?.remoteJid, data?.message?.key?.remoteJid,
    data?.data?.remoteJid, data?.data?.key?.remoteJid,
  ];
  const remoteJid = jidCandidates.find((v) => typeof v === 'string' && v.trim()) || null;

  const statusCandidates = [data?.status, data?.message?.status, data?.data?.status];
  const status = statusCandidates.find((v) => typeof v === 'string' && v.trim()) || null;

  return { messageId, remoteJid, status, error: errStr || undefined };
}

/** Normalizes a provider ack/status into our domain. */
export function parseMessageStatus(input: any): 'sent' | 'delivered' | 'read' | 'failed' | 'pending' | null {
  const raw = (typeof input === 'string' ? input : input?.status || input?.state || input?.ack);
  if (raw === undefined || raw === null) return null;
  const s = String(raw).toLowerCase();
  if (['read', 'seen', '4', '5'].includes(s)) return 'read';
  if (['delivered', 'delivery_ack', '3'].includes(s)) return 'delivered';
  if (['sent', 'server_ack', '2', '1'].includes(s)) return 'sent';
  if (['failed', 'error', 'reject', 'rejected'].includes(s)) return 'failed';
  if (['pending', '0'].includes(s)) return 'pending';
  return null;
}
