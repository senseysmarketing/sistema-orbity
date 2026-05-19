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
    if (!INITIAL_STATUSES.has(currentStatus)) return;

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
  // Simplified variants logic for brevity, matches old implementation
  if (digits.startsWith('55')) {
     const ddd = digits.slice(2, 4);
     variants.add(digits.slice(2));
     variants.add(ddd + digits.slice(4));
  }
  return [...variants];
}

async function findActiveAutomations(supabase: any, agencyId: string, conversationId: string, leadId: string | null, phoneNumber?: string): Promise<{ id: string }[]> {
  const { data: byConv } = await supabase
    .from('whatsapp_automation_control').select('id')
    .eq('conversation_id', conversationId)
    .in('status', ['active', 'processing']).limit(10);
  if (byConv && byConv.length > 0) return byConv;
  return [];
}

function isValidWhatsAppJid(remoteJid: string): boolean {
  if (!remoteJid) return false;
  if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast' || remoteJid.includes('@newsletter')) return false;
  return remoteJid.includes('@s.whatsapp.net') || remoteJid.includes('@lid');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const bodyText = await req.text();
    if (!bodyText) return new Response('ok');
    const body = JSON.parse(bodyText);

    const { event, instanceName, data } = body || {};
    const instance = instanceName || body?.instance;

    // Filter 0: Anti-Loop / fromMe
    if (data?.key?.fromMe === true) return new Response("Ignored", { status: 200 });

    if (!event || !instance) return new Response('ok');

    const { data: account } = await supabase.from('whatsapp_accounts').select('id, agency_id').eq('instance_name', instance).maybeSingle();
    if (!account) return new Response('ok');

    if (event === 'connection') {
      const state = data?.status || data?.state;
      if (state === 'connected' || state === 'open') {
        const rawPhone = data?.wuid || data?.phone || data?.instance?.wuid;
        const updateData: any = { status: 'connected', qr_code: null };
        if (rawPhone) updateData.phone_number = String(rawPhone).split('@')[0].replace(/\D/g, '');
        await supabase.from('whatsapp_accounts').update(updateData).eq('id', account.id);
      } else if (state === 'disconnected' || state === 'close') {
        await supabase.from('whatsapp_accounts').update({ status: 'disconnected' }).eq('id', account.id);
      }
    }

    if (event === 'messages') {
      const key = data?.key;
      const remoteJid = key?.remoteJid || '';
      if (!isValidWhatsAppJid(remoteJid)) return new Response('ok');

      const phoneNumber = normalizePhone(remoteJid.replace('@s.whatsapp.net', '').replace('@lid', ''));
      const msgContent = data?.message?.message ? data.message.message : data?.message;
      const content = msgContent?.conversation || msgContent?.extendedTextMessage?.text || '';

      // Find/Create conversation
      let { data: conversation } = await supabase.from('whatsapp_conversations').select('id, lead_id').eq('account_id', account.id).eq('phone_number', phoneNumber).maybeSingle();

      if (!conversation) {
        const { data: leadRows } = await supabase.rpc('find_lead_by_normalized_phone', { p_agency_id: account.agency_id, p_phone_digits: phoneNumber });
        const lead = leadRows?.[0] || null;
        const { data: newConv } = await supabase.from('whatsapp_conversations').upsert({ account_id: account.id, phone_number: phoneNumber, lead_id: lead?.id || null }, { onConflict: 'account_id,phone_number' }).select().single();
        conversation = newConv;
      }

      if (conversation) {
        await supabase.from('whatsapp_messages').insert({
          account_id: account.id,
          message_id: key?.id || crypto.randomUUID(),
          conversation_id: conversation.id,
          phone_number: phoneNumber,
          content,
          is_from_me: false,
          status: 'received'
        });

        // Update automation
        const automations = await findActiveAutomations(supabase, account.agency_id, conversation.id, conversation.lead_id, phoneNumber);
        for (const auth of automations) {
          await supabase.from('whatsapp_automation_control').update({ status: 'responded', conversation_state: 'customer_replied' }).eq('id', auth.id);
        }

        // Promote Lead
        if (conversation.lead_id) {
          await promoteLeadOnReply(supabase, account.agency_id, conversation.lead_id);
        }

        await supabase.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString(), last_message_is_from_me: false }).eq('id', conversation.id);
      }
    }

    return new Response('ok');
  } catch (error) {
    console.error('[whatsapp-webhook] Error:', error);
    return new Response('ok');
  }
});
