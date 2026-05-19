import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================
// CRM Vivo: auto-promote lead from initial column on first reply
// ============================================================
const INITIAL_STATUSES = new Set(['leads', 'new', 'novo']);

function normalizeToCanonical(rawStatus: string | null | undefined): string {
  if (!rawStatus) return 'leads';
  const trimmed = String(rawStatus).trim();
  if (!trimmed) return 'leads';
  const key = trimmed
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_').replace(/-+/g, '_');
  const map: Record<string, string> = {
    leads: 'leads', lead: 'leads', new: 'leads', novo: 'leads',
    em_contato: 'em_contato', emcontato: 'em_contato',
    qualified: 'qualified', qualificados: 'qualified', qualificado: 'qualified',
    scheduled: 'scheduled', agendamentos: 'scheduled', agendamento: 'scheduled',
    meeting: 'meeting', reunioes: 'meeting', reuniao: 'meeting',
    proposal: 'proposal', propostas: 'proposal', proposta: 'proposal',
    won: 'won', vendas: 'won', venda: 'won', ganho: 'won', gained: 'won',
    lost: 'lost', perdido: 'lost', perdida: 'lost', loss: 'lost',
  };
  return map[key] || trimmed;
}

async function promoteLeadOnReply(supabase: any, agencyId: string, leadId: string) {
  try {
    const { data: lead } = await supabase
      .from('leads').select('status').eq('id', leadId).maybeSingle();
    if (!lead) return;

    const currentStatus = (lead.status || '').toString().trim().toLowerCase();
    if (!INITIAL_STATUSES.has(currentStatus)) return; // não retrocede

    const { data: statuses } = await supabase
      .from('lead_statuses')
      .select('name, order_position')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('order_position', { ascending: true });

    let target = 'em_contato';
    if (statuses && statuses.length >= 2) {
      target = normalizeToCanonical(statuses[1].name);
    }

    await Promise.all([
      supabase.from('leads').update({ status: target }).eq('id', leadId),
      supabase.from('lead_history').insert({
        lead_id: leadId,
        agency_id: agencyId,
        action_type: 'whatsapp_interaction',
        description: 'Lead interagiu no WhatsApp. O cartão foi movido automaticamente para a próxima etapa.',
      }),
    ]);

    console.log('[whatsapp-webhook] Lead promoted on reply', { leadId, from: currentStatus, to: target });
  } catch (e) {
    console.error('[whatsapp-webhook] promoteLeadOnReply error:', e);
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function phoneVariants(phone: string): string[] {
  const digits = normalizePhone(phone);
  const variants = new Set<string>([digits, '+' + digits]);

  if (digits.startsWith('55') && digits.length === 13) {
    const ddd = digits.slice(2, 4);
    const localWithNine = digits.slice(4);
    const localWithout = digits.slice(5);
    variants.add(ddd + localWithNine);
    variants.add('+55' + ddd + localWithNine);
    variants.add('55' + ddd + localWithout);
    variants.add('+55' + ddd + localWithout);
    variants.add(ddd + localWithout);
  } else if (digits.startsWith('55') && digits.length === 12) {
    const ddd = digits.slice(2, 4);
    const localWithout = digits.slice(4);
    variants.add(ddd + localWithout);
    variants.add('+55' + ddd + localWithout);
    variants.add('55' + ddd + '9' + localWithout);
    variants.add('+55' + ddd + '9' + localWithout);
    variants.add(ddd + '9' + localWithout);
  }

  if (!digits.startsWith('55') && (digits.length === 11 || digits.length === 10)) {
    variants.add('55' + digits);
    variants.add('+55' + digits);
    if (digits.length === 11) {
      const ddd = digits.slice(0, 2);
      const localWithout = digits.slice(3);
      variants.add('55' + ddd + localWithout);
      variants.add(ddd + localWithout);
    } else if (digits.length === 10) {
      const ddd = digits.slice(0, 2);
      const local = digits.slice(2);
      variants.add('55' + ddd + '9' + local);
      variants.add(ddd + '9' + local);
    }
  }

  return [...variants];
}

async function findActiveAutomations(
  supabase: any, agencyId: string, conversationId: string, leadId: string | null,
  phoneNumber?: string,
): Promise<{ id: string }[]> {
  const { data: byConv } = await supabase
    .from('whatsapp_automation_control').select('id')
    .eq('conversation_id', conversationId)
    .in('status', ['active', 'processing']).limit(10);

  if (byConv && byConv.length > 0) return byConv;

  const { data: agencyAccounts } = await supabase
    .from('whatsapp_accounts').select('id')
    .eq('agency_id', agencyId);

  if (!agencyAccounts || agencyAccounts.length === 0) return [];
  const accountIds = agencyAccounts.map((a: any) => a.id);

  if (leadId) {
    const { data: byLead } = await supabase
      .from('whatsapp_automation_control').select('id')
      .in('account_id', accountIds)
      .eq('lead_id', leadId)
      .in('status', ['active', 'processing']).limit(10);

    if (byLead && byLead.length > 0) return byLead;
  }

  if (phoneNumber) {
    const variants = phoneVariants(phoneNumber);
    const { data: phoneConvs } = await supabase
      .from('whatsapp_conversations').select('id')
      .in('account_id', accountIds)
      .in('phone_number', variants);

    const convIds = (phoneConvs || []).map((c: any) => c.id).filter((id: string) => id !== conversationId);
    if (convIds.length > 0) {
      const { data: byPhone } = await supabase
        .from('whatsapp_automation_control').select('id')
        .in('conversation_id', convIds)
        .in('status', ['active', 'processing']).limit(10);
      if (byPhone && byPhone.length > 0) return byPhone;
    }
  }

  return [];
}

function isValidWhatsAppJid(remoteJid: string): boolean {
  if (!remoteJid) return false;
  if (remoteJid.includes('@g.us')) return false;
  if (remoteJid === 'status@broadcast') return false;
  if (remoteJid.includes('@broadcast')) return false;
  if (remoteJid.includes('@newsletter')) return false;
  return remoteJid.includes('@s.whatsapp.net') || remoteJid.includes('@lid');
}

function isLidJid(remoteJid: string): boolean {
  return !!remoteJid && remoteJid.includes('@lid');
}

function extractPhoneFromLidPayload(data: any): string | null {
  const candidates: (string | undefined)[] = [
    data?.key?.senderPn,
    data?.key?.participantPn,
    data?.senderPn,
    data?.participantPn,
    data?.message?.key?.senderPn,
    data?.message?.key?.participantPn,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const raw = String(c).split('@')[0];
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10) return digits;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bodyText = await req.text();
    if (!bodyText || bodyText.trim() === '') return new Response('ok', { status: 200 });

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return new Response('ok', { status: 200 });
    }

    // Uazapi structure: { event: "...", instanceName: "...", data: { ... } }
    const { event, instanceName, data } = body || {};
    const instance = instanceName || body?.instance;

    // Filter 0: Ignore our own messages to prevent loops
    if (data?.key?.fromMe === true) return new Response("Ignored", { status: 200 });

    // Filter 1: Only allow text messages for now (conversation or extendedTextMessage)
    if (event === 'messages') {
      const msgContent = data?.message?.message ? data.message.message : data?.message;
      const isText = msgContent?.conversation || msgContent?.extendedTextMessage;
      if (!isText && !msgContent?.imageMessage && !msgContent?.videoMessage && !msgContent?.audioMessage && !msgContent?.documentMessage) {
         return new Response("Ignored: Not a handled message type", { status: 200 });
      }
    }

    if (!event || !instance) {

    const { data: account } = await supabase
      .from('whatsapp_accounts').select('id, agency_id')
      .eq('instance_name', instance).maybeSingle();

    if (!account) {
      console.log('[whatsapp-webhook] Unknown instance:', instance);
      return new Response('ok', { status: 200 });
    }

    // 1. Connection events
    if (event === 'connection') {
      const state = data?.status || data?.state;
      let newStatus: string | null = null;
      if (state === 'connected' || state === 'open') {
        newStatus = 'connected';
      } else if (state === 'disconnected' || state === 'close') {
        newStatus = 'disconnected';
      }

      if (newStatus) {
        const updateData: Record<string, any> = { status: newStatus };
        if (newStatus === 'connected') {
          updateData.qr_code = null;
          const rawPhone = data?.wuid || data?.phone || data?.instance?.wuid;
          if (rawPhone) {
            updateData.phone_number = String(rawPhone).split('@')[0].replace(/\D/g, '');
          }
        }
        await supabase.from('whatsapp_accounts').update(updateData).eq('id', account.id);
      }
      return new Response('ok', { status: 200 });
    }

    // 2. Status Updates (Read Receipts)
    if (event === 'messages_update') {
      const updates = Array.isArray(data) ? data : [data];
      for (const update of updates) {
        const messageId = update?.key?.id;
        const statusCode = update?.status; // 3 = READ in Uazapi/Baileys
        if (!messageId) continue;

        let newStatus = 'delivered';
        if (statusCode === 3 || statusCode === 4 || statusCode === 'READ') {
          newStatus = 'read';
        } else if (statusCode === 2 || statusCode === 'DELIVERED') {
          newStatus = 'delivered';
        } else if (statusCode === 1 || statusCode === 'SENT') {
          newStatus = 'sent';
        }

        await supabase.from('whatsapp_messages')
          .update({ status: newStatus })
          .eq('account_id', account.id)
          .eq('message_id', messageId);
      }
      return new Response('ok', { status: 200 });
    }

    // 3. New Messages
    if (event === 'messages') {
      if (!data) return new Response('ok', { status: 200 });

      const key = data?.key;
      const messageId = key?.id || crypto.randomUUID();
      const isFromMe = key?.fromMe || false;
      const remoteJid = key?.remoteJid || '';

      // Filtro 1: Anti-Loop
      if (isFromMe) return new Response('ok', { status: 200 });

      // Filtro 2: Groups
      if (!isValidWhatsAppJid(remoteJid)) return new Response('ok', { status: 200 });

      const isLid = isLidJid(remoteJid);
      let phoneNumber: string;
      if (isLid) {
        const resolved = extractPhoneFromLidPayload(data);
        phoneNumber = resolved ? normalizePhone(resolved) : '';
      } else {
        phoneNumber = normalizePhone(remoteJid.replace('@s.whatsapp.net', ''));
      }

      const msgContent = data?.message?.message ? data.message.message : data?.message;
      const content = msgContent?.conversation ||
        msgContent?.extendedTextMessage?.text ||
        msgContent?.imageMessage?.caption ||
        msgContent?.videoMessage?.caption ||
        '';

      const messageType = msgContent?.imageMessage ? 'image' :
        msgContent?.videoMessage ? 'video' :
        msgContent?.audioMessage ? 'audio' :
        msgContent?.documentMessage ? 'document' :
        'text';

      let conversation: { id: string; lead_id: string | null } | null = null;

      if (isLid) {
        const { data: byJid } = await supabase
          .from('whatsapp_conversations').select('id, lead_id')
          .eq('account_id', account.id).eq('remote_jid', remoteJid).maybeSingle();
        if (byJid) conversation = byJid;
      }

      if (!conversation && phoneNumber && phoneNumber.length >= 8) {
        const variants = phoneVariants(phoneNumber);
        const { data: matchingConvs } = await supabase
          .from('whatsapp_conversations').select('id, lead_id')
          .eq('account_id', account.id).in('phone_number', variants);
        conversation = matchingConvs?.find((c: any) => c.lead_id) ?? matchingConvs?.[0] ?? null;

        if (conversation && isLid) {
          await supabase.from('whatsapp_conversations')
            .update({ remote_jid: remoteJid }).eq('id', conversation.id);
        }
      }

      if (!conversation && isLid && (!phoneNumber || phoneNumber.length < 8)) return new Response('ok', { status: 200 });
      if (!conversation && !isLid && phoneNumber.length < 8) return new Response('ok', { status: 200 });

      if (!conversation) {
        const { data: leadRows } = await supabase.rpc('find_lead_by_normalized_phone', {
          p_agency_id: account.agency_id,
          p_phone_digits: phoneNumber,
        });
        const lead = leadRows?.[0] || null;

        if (lead?.id) {
          const { data: leadConv } = await supabase
            .from('whatsapp_conversations').select('id, lead_id')
            .eq('account_id', account.id).eq('lead_id', lead.id).maybeSingle();
          if (leadConv) {
            const upd: Record<string, any> = { phone_number: phoneNumber };
            if (isLid) upd.remote_jid = remoteJid;
            await supabase.from('whatsapp_conversations').update(upd).eq('id', leadConv.id);
            conversation = leadConv;
          }
        }

        if (!conversation) {
          const insertPayload: Record<string, any> = {
            account_id: account.id,
            phone_number: phoneNumber,
            lead_id: lead?.id || null,
          };
          if (isLid) insertPayload.remote_jid = remoteJid;
          const { data: newConv, error: convError } = await supabase
            .from('whatsapp_conversations')
            .upsert(insertPayload, { onConflict: 'account_id,phone_number' })
            .select().single();

          if (convError) {
             const variants2 = phoneVariants(phoneNumber);
             const { data: raceConvs } = await supabase
               .from('whatsapp_conversations').select('id, lead_id')
               .eq('account_id', account.id).in('phone_number', variants2);
             conversation = raceConvs?.find((c: any) => c.lead_id) ?? raceConvs?.[0] ?? null;
          } else {
            conversation = newConv;
          }
        }
      } else if (!conversation.lead_id && phoneNumber && phoneNumber.length >= 8) {
        const { data: leadRows2 } = await supabase.rpc('find_lead_by_normalized_phone', {
          p_agency_id: account.agency_id,
          p_phone_digits: phoneNumber,
        });
        const lead = leadRows2?.[0] || null;
        if (lead?.id) {
          await supabase.from('whatsapp_conversations').update({ lead_id: lead.id }).eq('id', conversation.id);
          conversation = { ...conversation, lead_id: lead.id };
        }
      }

      if (!conversation) return new Response('ok', { status: 200 });

      const timestamp = new Date().toISOString();
      await supabase.from('whatsapp_messages').upsert({
        account_id: account.id,
        message_id: messageId,
        conversation_id: conversation.id,
        phone_number: phoneNumber,
        message_type: messageType,
        content,
        is_from_me: false,
        status: 'received',
      }, { onConflict: 'account_id,message_id' });

      const updateData: Record<string, any> = {
        last_message_at: timestamp,
        last_message_is_from_me: false,
        last_customer_message_at: timestamp,
      };

      // Automations logic
      const automations = await findActiveAutomations(supabase, account.agency_id, conversation.id, conversation.lead_id, phoneNumber);
      for (const automation of automations) {
        await supabase.from('whatsapp_automation_control').update({
          status: 'responded',
          conversation_state: 'customer_replied',
          conversation_id: conversation.id,
        }).eq('id', automation.id);
      }

      // Lead promotion logic
      if (conversation.lead_id) {
        const { data: agencyCfg } = await supabase.from('agencies').select('whatsapp_auto_contact').eq('id', account.agency_id).maybeSingle();
        if (agencyCfg?.whatsapp_auto_contact !== false) {
          await promoteLeadOnReply(supabase, account.agency_id, conversation.lead_id);
        }
      }

      await supabase.from('whatsapp_conversations').update(updateData).eq('id', conversation.id);
      console.log('[whatsapp-webhook] Message processed', { message_id: messageId, phone: phoneNumber });
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('[whatsapp-webhook] Error:', error);
    return new Response('ok', { status: 200 });
  }
});