// whatsapp-connect: máquina de estados de conexão Uazapi.
// Escopo restrito: criar/recuperar instância, QR Code, status. Não envia mensagens.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ConnectionStatus,
  configureWebhook,
  connectInstance,
  createOrGetInstance,
  deleteInstance,
  disconnectInstance,
  getInstanceStatus,
  getUazapiConfig,
  parsePhoneNumber,
  parseQrCode,
  parseStatus,
  UazapiResponse,
} from "../_shared/uazapi.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type Action =
  | 'debug_health'
  | 'connect'
  | 'status'
  | 'refresh_qr'
  | 'disconnect'
  | 'hard_reset'
  | 'validate_external_instance'
  | 'manual_attach'
  | 'manual_detach';
type Purpose = 'general' | 'billing';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function instanceNameFor(agencyId: string, purpose: Purpose) {
  return `orbity_${agencyId.replace(/-/g, '').slice(0, 12)}_${purpose}`;
}

function webhookUrlFor(agencyId: string) {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook?agency_id=${agencyId}`;
}

function safePayloadKeys(data: any): string[] {
  if (!data || typeof data !== 'object') return [];
  try {
    return Object.keys(data).slice(0, 20);
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const executionId = crypto.randomUUID();

  try {
    // ----- Auth -----
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ success: false, error: 'Missing authorization' }, 401);

    const { data: userData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !userData?.user) return json({ success: false, error: 'Invalid session' }, 401);
    const userId = userData.user.id;

    // ----- Input -----
    const body = await req.json().catch(() => ({}));
    const action = body.action as Action;
    const agencyId = body.agency_id as string;
    const purpose = (body.purpose as Purpose) || 'general';

    if (!action) return json({ success: false, error: 'Missing action' }, 400);
    if (!agencyId) return json({ success: false, error: 'Missing agency_id' }, 400);
    if (!['general', 'billing'].includes(purpose)) {
      return json({ success: false, error: 'Invalid purpose' }, 400);
    }

    // ----- Authz: owner/admin da agência -----
    const { data: membership } = await admin
      .from('agency_users')
      .select('role')
      .eq('agency_id', agencyId)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();
    if (!membership) return json({ success: false, error: 'Forbidden: owner/admin required' }, 403);

    // ----- Helpers (closures) -----
    async function getOrCreateAccount() {
      const { data: existing } = await admin
        .from('whatsapp_accounts')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('purpose', purpose)
        .maybeSingle();
      if (existing) return existing;

      const { data: inserted, error } = await admin
        .from('whatsapp_accounts')
        .insert({
          agency_id: agencyId,
          purpose,
          provider: 'uazapi',
          instance_name: instanceNameFor(agencyId, purpose),
          api_url: getUazapiConfig().apiUrl,
          status: 'disconnected',
        })
        .select('*')
        .single();
      if (error) throw new Error(`Falha ao criar whatsapp_accounts: ${error.message}`);
      return inserted;
    }

    async function patchAccount(id: string, patch: Record<string, unknown>) {
      await admin
        .from('whatsapp_accounts')
        .update({ ...patch, last_checked_at: new Date().toISOString() })
        .eq('id', id);
    }

    async function logEvent(args: {
      accountId: string | null;
      action: string;
      endpoint?: string;
      response?: UazapiResponse | null;
      domain?: ConnectionStatus;
      hasQr?: boolean;
      hasToken?: boolean;
      error?: string | null;
    }) {
      await admin.from('whatsapp_connection_logs').insert({
        agency_id: agencyId,
        account_id: args.accountId,
        purpose,
        action: args.action,
        provider: 'uazapi',
        provider_endpoint: args.endpoint ?? args.response?.endpoint ?? null,
        http_status: args.response?.status ?? null,
        provider_status: args.domain ?? null,
        has_qr: args.hasQr ?? null,
        has_token: args.hasToken ?? null,
        error_message: args.error ?? null,
        execution_id: executionId,
        payload_keys: safePayloadKeys(args.response?.data),
      });
    }

    function applyResponseToPatch(resp: UazapiResponse): {
      patch: Record<string, unknown>;
      domain: ConnectionStatus;
      qr: string | null;
      phone: string | null;
      error: string | null;
    } {
      const qr = parseQrCode(resp.data);
      const phone = parsePhoneNumber(resp.data);
      const { domain, raw } = parseStatus(resp.data, !!qr);
      const patch: Record<string, unknown> = {
        provider_status: raw,
        last_provider_payload: { endpoint: resp.endpoint, status: resp.status, keys: safePayloadKeys(resp.data) },
      };
      let finalDomain: ConnectionStatus = domain;
      let errorMsg: string | null = null;

      if (!resp.ok) {
        finalDomain = 'error';
        errorMsg = `Uazapi ${resp.endpoint} respondeu ${resp.status}: ${
          typeof resp.data?.error === 'string' ? resp.data.error : 'erro desconhecido'
        }`;
      } else if (finalDomain === 'connected') {
        patch.qr_code = null;
        patch.connected_at = new Date().toISOString();
        if (phone) patch.phone_number = phone;
      } else if (finalDomain === 'qr_pending') {
        if (!qr) {
          // Invariante: nunca persistir qr_pending sem QR válido.
          finalDomain = 'error';
          errorMsg = 'Uazapi indicou QR mas não retornou o código.';
        } else {
          patch.qr_code = qr;
        }
      } else if (finalDomain === 'disconnected') {
        patch.qr_code = null;
      }

      patch.status = finalDomain;
      patch.last_error = errorMsg;
      return { patch, domain: finalDomain, qr, phone, error: errorMsg };
    }

    // ============ ACTIONS ============

    if (action === 'debug_health') {
      let cfgPresent = false;
      let apiUrl: string | null = null;
      try {
        const cfg = getUazapiConfig();
        cfgPresent = true;
        apiUrl = cfg.apiUrl;
      } catch { /* ignore */ }
      const ping = cfgPresent
        ? await getInstanceStatus('__ping__').catch(() => null)
        : null;
      const { data: account } = await admin
        .from('whatsapp_accounts').select('*')
        .eq('agency_id', agencyId).eq('purpose', purpose).maybeSingle();
      return json({
        success: true,
        config: { uazapi_configured: cfgPresent, api_url: apiUrl },
        ping_status: ping?.status ?? null,
        account: account ? {
          status: account.status,
          provider_status: account.provider_status,
          has_token: !!account.api_key,
          has_qr: !!account.qr_code,
          last_error: account.last_error,
          last_checked_at: account.last_checked_at,
        } : null,
      });
    }

    if (action === 'connect') {
      const existing = await admin
        .from('whatsapp_accounts')
        .select('connection_mode')
        .eq('agency_id', agencyId)
        .eq('purpose', purpose)
        .maybeSingle();
      if (existing.data?.connection_mode === 'external') {
        return json({
          success: false,
          status: 'error',
          error: 'Esta agência está usando uma instância Uazapi externa. Remova o vínculo antes de conectar uma nova via QR.',
        }, 200);
      }
      const account = await getOrCreateAccount();
      await patchAccount(account.id, { status: 'provisioning', last_error: null });
      await logEvent({ accountId: account.id, action: 'connect.start' });

      // 1. Instância
      const instName = account.instance_name || instanceNameFor(agencyId, purpose);
      const inst = await createOrGetInstance(instName, { agencyId, purpose });
      await logEvent({
        accountId: account.id, action: 'connect.init',
        response: inst.lastResponse, hasToken: !!inst.token,
      });

      if (!inst.token) {
        const message = `Uazapi não retornou token (${inst.lastResponse.status}).`;
        await patchAccount(account.id, { status: 'error', last_error: message });
        return json({ success: false, status: 'error', error: message }, 200);
      }

      await patchAccount(account.id, { api_key: inst.token, instance_name: instName });

      // 2. Webhook (best-effort)
      try {
        const whRes = await configureWebhook(inst.token, webhookUrlFor(agencyId));
        await logEvent({ accountId: account.id, action: 'connect.webhook', response: whRes });
      } catch (e) {
        await logEvent({ accountId: account.id, action: 'connect.webhook', error: errMsg(e) });
      }

      // 3. Connect → QR
      const connectRes = await connectInstance(inst.token);
      const { patch, domain, qr, phone, error } = applyResponseToPatch(connectRes);
      await patchAccount(account.id, patch);
      await logEvent({
        accountId: account.id, action: 'connect.qr',
        response: connectRes, domain, hasQr: !!qr, hasToken: true, error,
      });

      return json({
        success: domain !== 'error',
        status: domain,
        qr_code: qr,
        phone_number: phone,
        error,
      });
    }

    if (action === 'status') {
      const { data: account } = await admin
        .from('whatsapp_accounts').select('*')
        .eq('agency_id', agencyId).eq('purpose', purpose).maybeSingle();

      if (!account) {
        return json({ success: true, status: 'disconnected' });
      }
      if (!account.api_key) {
        if (account.status !== 'disconnected') {
          await patchAccount(account.id, { status: 'disconnected', qr_code: null });
        }
        return json({ success: true, status: 'disconnected' });
      }

      // Externo: usa api_url próprio da instância anexada.
      let statusRes;
      if (account.connection_mode === 'external' && account.api_url) {
        const { uazapiRequest } = await import('../_shared/uazapi.ts');
        statusRes = await uazapiRequest('/instance/status', {
          method: 'GET', token: account.api_key, apiUrl: account.api_url,
        });
      } else {
        statusRes = await getInstanceStatus(account.api_key);
      }
      let { patch, domain, qr, phone, error } = applyResponseToPatch(statusRes);

      // Externo: nunca persistir qr_code nem tentar fallback de connect.
      if (account.connection_mode === 'external') {
        delete (patch as any).qr_code;
        qr = null;
      } else if (domain === 'error' && /QR mas não retornou/.test(error || '')) {
        const connectRes = await connectInstance(account.api_key);
        ({ patch, domain, qr, phone, error } = applyResponseToPatch(connectRes));
        await logEvent({
          accountId: account.id, action: 'status.fallback_connect',
          response: connectRes, domain, hasQr: !!qr, error,
        });
      }

      await patchAccount(account.id, patch);
      await logEvent({
        accountId: account.id, action: 'status',
        response: statusRes, domain, hasQr: !!qr, hasToken: true, error,
      });

      return json({
        success: domain !== 'error',
        status: domain,
        qr_code: account.connection_mode === 'external' ? null : (qr || (domain === 'qr_pending' ? account.qr_code : null)),
        phone_number: phone || account.phone_number,
        connection_mode: account.connection_mode,
        webhook_managed_by_orbity: account.webhook_managed_by_orbity,
        instance_name: account.instance_name,
        api_url: account.connection_mode === 'external' ? account.api_url : null,
        api_key_masked: account.api_key ? `****${String(account.api_key).slice(-4)}` : null,
        error,
      });
    }

    if (action === 'refresh_qr') {
      const { data: account } = await admin
        .from('whatsapp_accounts').select('*')
        .eq('agency_id', agencyId).eq('purpose', purpose).maybeSingle();
      if (!account?.api_key) {
        return json({ success: false, status: 'disconnected', error: 'Sem token de instância. Clique em Conectar.' });
      }

      const res = await connectInstance(account.api_key);
      const { patch, domain, qr, phone, error } = applyResponseToPatch(res);
      await patchAccount(account.id, patch);
      await logEvent({
        accountId: account.id, action: 'refresh_qr',
        response: res, domain, hasQr: !!qr, hasToken: true, error,
      });

      return json({
        success: domain !== 'error',
        status: domain,
        qr_code: qr,
        phone_number: phone,
        error,
      });
    }

    if (action === 'disconnect') {
      const { data: account } = await admin
        .from('whatsapp_accounts').select('*')
        .eq('agency_id', agencyId).eq('purpose', purpose).maybeSingle();
      if (!account?.api_key) {
        return json({ success: true, status: 'disconnected' });
      }
      // Instância externa: NUNCA chamar disconnect na Uazapi.
      // Apenas remover vínculo local — usuário deve usar manual_detach.
      if (account.connection_mode === 'external') {
        await logEvent({ accountId: account.id, action: 'disconnect.blocked_external' });
        return json({
          success: false,
          status: account.status,
          error: 'Instância externa não pode ser desconectada pela Orbity. Use "Remover vínculo".',
        }, 200);
      }
      const res = await disconnectInstance(account.api_key);
      await patchAccount(account.id, {
        status: 'disconnected',
        qr_code: null,
        phone_number: null,
        connected_at: null,
        provider_status: null,
        last_error: null,
      });
      await logEvent({ accountId: account.id, action: 'disconnect', response: res, domain: 'disconnected' });
      return json({ success: true, status: 'disconnected' });
    }

    if (action === 'hard_reset') {
      const { data: account } = await admin
        .from('whatsapp_accounts').select('*')
        .eq('agency_id', agencyId).eq('purpose', purpose).maybeSingle();
      // Instância externa: bloquear hard_reset. Não deletar instância de terceiros.
      if (account?.connection_mode === 'external') {
        await logEvent({ accountId: account.id, action: 'hard_reset.blocked_external' });
        return json({
          success: false,
          status: account.status,
          error: 'Instância externa não pode ser resetada pela Orbity. Use "Remover vínculo".',
        }, 200);
      }
      if (account?.api_key) {
        const res = await deleteInstance(account.api_key);
        await logEvent({ accountId: account.id, action: 'hard_reset.delete', response: res });
      }
      if (account) {
        await patchAccount(account.id, {
          api_key: null,
          qr_code: null,
          phone_number: null,
          status: 'disconnected',
          connected_at: null,
          provider_status: null,
          last_error: null,
          last_provider_payload: null,
          instance_name: instanceNameFor(agencyId, purpose),
          connection_mode: 'managed',
          webhook_managed_by_orbity: false,
        });
      }
      return json({ success: true, status: 'disconnected' });
    }

    // ===== Modo externo: validar instância sem persistir =====
    if (action === 'validate_external_instance') {
      const apiUrl = String(body.api_url || '').trim().replace(/\/$/, '');
      const apiKey = String(body.api_key || '').trim();
      if (!apiUrl || !apiKey) {
        return json({ success: false, error: 'api_url e api_key são obrigatórios.' }, 400);
      }
      // Sobrescrever temporariamente apiUrl via injeção: getInstanceStatus usa config global.
      // Fazemos chamada direta via uazapiRequest se necessário; mas getInstanceStatus já usa env.
      // Para validação externa, fazemos request direto:
      const { uazapiRequest } = await import('../_shared/uazapi.ts');
      const res = await uazapiRequest('/instance/status', { method: 'GET', token: apiKey, apiUrl });
      const phone = parsePhoneNumber(res.data);
      const qr = parseQrCode(res.data);
      const { domain } = parseStatus(res.data, !!qr);
      await logEvent({
        accountId: null,
        action: 'validate_external_instance',
        response: res,
        domain,
        hasToken: true,
        error: res.ok ? null : `HTTP ${res.status}`,
      });
      if (!res.ok) {
        return json({
          success: false,
          status: 'error',
          error: `Não foi possível validar a instância (HTTP ${res.status}). Verifique URL e token.`,
        }, 200);
      }
      return json({
        success: true,
        status: domain,
        phone_number: phone,
      });
    }

    if (action === 'manual_attach') {
      const apiUrl = String(body.api_url || '').trim().replace(/\/$/, '');
      const apiKey = String(body.api_key || '').trim();
      const instanceName = String(body.instance_name || '').trim() || null;
      const configureWebhookNow = body.configure_webhook === true;
      if (!apiUrl || !apiKey) {
        return json({ success: false, error: 'api_url e api_key são obrigatórios.' }, 400);
      }

      const { uazapiRequest } = await import('../_shared/uazapi.ts');
      const statusRes = await uazapiRequest('/instance/status', { method: 'GET', token: apiKey, apiUrl });
      if (!statusRes.ok) {
        return json({
          success: false,
          status: 'error',
          error: `Instância inválida (HTTP ${statusRes.status}). Verifique URL e token.`,
        }, 200);
      }
      const phone = parsePhoneNumber(statusRes.data);
      const qr = parseQrCode(statusRes.data);
      const { domain, raw } = parseStatus(statusRes.data, !!qr);

      // Upsert na conta (managed → external).
      const { data: existing } = await admin
        .from('whatsapp_accounts')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('purpose', purpose)
        .maybeSingle();

      const payload: Record<string, unknown> = {
        agency_id: agencyId,
        purpose,
        provider: 'uazapi',
        api_url: apiUrl,
        api_key: apiKey,
        instance_name: instanceName || `external_${agencyId.replace(/-/g, '').slice(0, 8)}_${purpose}`,
        status: domain,
        provider_status: raw,
        phone_number: phone,
        qr_code: null,
        connected_at: domain === 'connected' ? new Date().toISOString() : null,
        connection_mode: 'external',
        webhook_managed_by_orbity: false,
        last_manual_validation_at: new Date().toISOString(),
        last_error: null,
      };

      let accountId: string | null = null;
      if (existing) {
        const { error } = await admin.from('whatsapp_accounts').update(payload).eq('id', existing.id);
        if (error) throw new Error(`Falha ao atualizar conta: ${error.message}`);
        accountId = existing.id;
      } else {
        const { data: inserted, error } = await admin
          .from('whatsapp_accounts')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw new Error(`Falha ao criar conta: ${error.message}`);
        accountId = inserted.id;
      }

      // Webhook opcional: só se solicitado explicitamente.
      let webhookConfigured = false;
      if (configureWebhookNow) {
        try {
          const whRes = await uazapiRequest('/webhook', {
            method: 'POST',
            token: apiKey,
            apiUrl,
            body: {
              url: webhookUrlFor(agencyId),
              events: ['connection', 'messages', 'messages_update'],
            },
          });
          webhookConfigured = whRes.ok;
          await logEvent({ accountId, action: 'manual_attach.webhook', response: whRes });
          if (webhookConfigured) {
            await admin
              .from('whatsapp_accounts')
              .update({ webhook_managed_by_orbity: true })
              .eq('id', accountId);
          }
        } catch (e) {
          await logEvent({ accountId, action: 'manual_attach.webhook', error: errMsg(e) });
        }
      }

      await logEvent({
        accountId,
        action: 'manual_attach',
        response: statusRes,
        domain,
        hasToken: true,
        hasQr: !!qr,
      });

      return json({
        success: true,
        status: domain,
        phone_number: phone,
        connection_mode: 'external',
        webhook_managed_by_orbity: webhookConfigured,
      });
    }

    if (action === 'manual_detach') {
      const { data: account } = await admin
        .from('whatsapp_accounts').select('*')
        .eq('agency_id', agencyId).eq('purpose', purpose).maybeSingle();
      if (!account) {
        return json({ success: true, status: 'disconnected' });
      }
      // NUNCA chama deleteInstance/disconnectInstance: a instância pode estar em uso por outro sistema.
      await patchAccount(account.id, {
        api_key: null,
        qr_code: null,
        phone_number: null,
        status: 'disconnected',
        connected_at: null,
        provider_status: null,
        last_error: null,
        last_provider_payload: null,
        connection_mode: 'managed',
        webhook_managed_by_orbity: false,
        instance_name: instanceNameFor(agencyId, purpose),
      });
      await logEvent({ accountId: account.id, action: 'manual_detach', domain: 'disconnected' });
      return json({ success: true, status: 'disconnected' });
    }

    return json({ success: false, error: `Unsupported action: ${action}` }, 400);
  } catch (error) {
    console.error('[whatsapp-connect] Unhandled:', error);
    return json({ success: false, error: errMsg(error), execution_id: executionId }, 500);
  }
});
