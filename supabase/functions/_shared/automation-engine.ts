type Db = any;
type Json = Record<string, unknown>;

const ACTIVE = ['running', 'waiting'];
const FINAL = new Set(['won', 'vendas', 'ganho', 'fechado', 'cliente', 'closed', 'lost', 'perdido', 'loss']);

const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? v as Json : {});
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const now = () => new Date().toISOString();
const key = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '_');
const delayDate = (amount: number, unit: string) => new Date(Date.now() + Math.max(0, amount) * ({ minutes: 60_000, hours: 3_600_000, days: 86_400_000 }[unit] ?? 60_000));
const previewOf = (text: string, max = 120) => {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
};
const normalizePhone = (raw: string | null | undefined) => {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
};
const formatTemplateVariables = (template: string, vars: Record<string, unknown>) => {
  const read = (name: string) => {
    const wanted = name.trim().toLowerCase();
    for (const [k, v] of Object.entries(vars)) {
      if (k.toLowerCase() === wanted && v !== null && v !== undefined) return String(v);
    }
    return '';
  };
  return (template || '')
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, name) => read(name))
    .replace(/(?<!\{)\{\s*([\w.-]+)\s*\}(?!\})/g, (_m, name) => read(name));
};

export async function logExecutionEvent(db: Db, row: {
  execution_id?: string | null; flow_id?: string | null; agency_id: string; lead_id?: string | null;
  step_id?: string | null; event_type: string; message?: string | null; metadata?: Json;
}) {
  try {
    await db.from('automation_execution_logs').insert({
      execution_id: row.execution_id ?? null,
      flow_id: row.flow_id ?? null,
      agency_id: row.agency_id,
      lead_id: row.lead_id ?? null,
      step_id: row.step_id ?? null,
      event_type: row.event_type,
      message: row.message ?? null,
      metadata: row.metadata ?? {},
    });
  } catch (e) {
    console.warn('[automation] log failed', e);
  }
}

export async function incrementFlowMetric(db: Db, flowId: string, metric: string, amount = 1, extra: Json = {}) {
  const { data } = await db.from('automation_flows').select('metrics').eq('id', flowId).maybeSingle();
  const metrics = obj(data?.metrics);
  await db.from('automation_flows').update({
    metrics: { ...metrics, [metric]: Number(metrics[metric] ?? 0) + amount, ...extra },
  }).eq('id', flowId);
}

async function lead(db: Db, agencyId: string, leadId: string) {
  const { data, error } = await db.from('leads')
    .select('id, agency_id, name, email, phone, company, source, status, value, assigned_to, tags, custom_fields, created_by, created_at')
    .eq('agency_id', agencyId).eq('id', leadId).maybeSingle();
  if (error) throw error;
  return data;
}

async function steps(db: Db, flowId: string) {
  const { data, error } = await db.from('automation_steps').select('*').eq('flow_id', flowId).eq('is_deleted', false).order('position');
  if (error) throw error;
  return data || [];
}

async function assigneeName(db: Db, userId?: string | null) {
  if (!userId) return '';
  const { data } = await db.from('profiles').select('name, email').eq('user_id', userId).maybeSingle();
  return data?.name || data?.email || '';
}

async function render(db: Db, template: string, l: any, payload: Json) {
  const c = obj(l?.custom_fields);
  const service = c.servico_interesse || c.service_interest || c.service || c.servico || c.product || c.produto || '';
  const vars = {
    nome: l?.name || '', name: l?.name || '',
    telefone: normalizePhone(l?.phone), phone: normalizePhone(l?.phone),
    email: l?.email || '', empresa: l?.company || '', company: l?.company || '',
    responsavel: await assigneeName(db, l?.assigned_to) || 'equipe',
    origem: l?.source || '', source: l?.source || '',
    etapa: l?.status || '', status: l?.status || '',
    servico_interesse: String(service || ''),
    tag: Array.isArray(l?.tags) ? l.tags.join(', ') : '',
    tags: Array.isArray(l?.tags) ? l.tags.join(', ') : '',
    data_reuniao: String(payload.data_reuniao || payload.meeting_date || c.data_reuniao || ''),
    campanha: String(payload.campaign || c.campaign || c.campanha || ''),
    valor: l?.value ?? '',
  };
  return formatTemplateVariables(template, vars).trim();
}

async function conditionValue(db: Db, cond: Json, l: any, ctx: Json) {
  const f = key(cond.field || cond.type);
  const c = obj(l?.custom_fields);
  if (['source', 'origem'].includes(f)) return l?.source;
  if (['status', 'etapa', 'stage', 'pipeline_stage'].includes(f)) return l?.status;
  if (['assigned_to', 'responsavel', 'owner'].includes(f)) return l?.assigned_to;
  if (['tag', 'tags'].includes(f)) return l?.tags || [];
  if (['service_interest', 'servico_interesse'].includes(f)) return c.servico_interesse || c.service_interest || c.service || c.servico;
  if (['budget', 'orcamento', 'valor'].includes(f)) return c.orcamento || c.budget || l?.value;
  if (['company', 'empresa'].includes(f)) return l?.company;
  if (f === 'campaign' || f === 'campanha') return c.campaign || c.campanha || ctx.campaign;
  if (f === 'custom_field' || f === 'campo_personalizado') return c[String(cond.custom_field || cond.key || '')];
  if (f === 'lead_replied' || f === 'lead_respondeu') {
    const { count } = await db.from('whatsapp_messages').select('id', { count: 'exact', head: true })
      .eq('lead_id', l.id).eq('is_from_me', false).gte('created_at', String(ctx.started_at || l.created_at || '1970-01-01'));
    return (count || 0) > 0;
  }
  return c[String(cond.field || '')];
}

function cmp(actual: unknown, opRaw: unknown, expected: unknown) {
  const op = key(opRaw || 'equals');
  const a = String(actual ?? '').toLowerCase();
  const e = String(expected ?? '').toLowerCase();
  if (op === 'exists') return Array.isArray(actual) ? actual.length > 0 : !!a.trim();
  if (op === 'not_exists') return Array.isArray(actual) ? actual.length === 0 : !a.trim();
  if (Array.isArray(actual)) {
    const values = actual.map((x) => String(x).toLowerCase());
    if (op === 'contains' || op === 'includes') return values.includes(e);
    if (op === 'not_contains') return !values.includes(e);
  }
  if (op === 'contains') return a.includes(e);
  if (op === 'not_contains') return !a.includes(e);
  if (op === 'not_equals') return a !== e;
  if (op === 'greater_than') return Number(actual || 0) > Number(expected || 0);
  if (op === 'less_than') return Number(actual || 0) < Number(expected || 0);
  if (op === 'is_true') return actual === true || a === 'true' || a === 'sim';
  if (op === 'is_false') return actual === false || a === 'false' || a === 'nao';
  return a === e;
}

export async function evaluateConditions(db: Db, conditions: unknown, l: any, ctx: Json = {}) {
  const list = arr(conditions);
  if (!list.length) return { passed: true, results: [] as any[] };
  const results = [];
  for (const raw of list) {
    const cond = obj(raw);
    const actual = await conditionValue(db, cond, l, ctx);
    results.push({ condition: cond, actual, passed: cmp(actual, cond.operator, cond.value) });
  }
  const passed = key(ctx.condition_mode) === 'any' ? results.some((r) => r.passed) : results.every((r) => r.passed);
  return { passed, results };
}

async function enqueue(db: Db, execution: any, step: any, runAt = new Date(), payload: Json = {}) {
  await db.from('automation_executions').update({
    current_step_id: step.id,
    status: runAt.getTime() > Date.now() + 1000 ? 'waiting' : 'running',
    last_activity_at: now(),
  }).eq('id', execution.id);
  const { error } = await db.from('automation_pending_actions').insert({
    execution_id: execution.id, flow_id: execution.flow_id, agency_id: execution.agency_id,
    lead_id: execution.lead_id, step_id: step.id, action_type: step.step_type,
    payload, run_at: runAt.toISOString(), idempotency_key: `${execution.id}:${step.id}`,
  });
  if (error && error.code !== '23505') throw error;
}

async function next(db: Db, execution: any, allSteps: any[], current: any, runAt = new Date(), payload: Json = {}) {
  const n = allSteps.find((s) => s.position > current.position);
  if (n) return enqueue(db, execution, n, runAt, payload);
  await db.from('automation_executions').update({ status: 'completed', completed_at: now(), last_activity_at: now() }).eq('id', execution.id);
  await incrementFlowMetric(db, execution.flow_id, 'completed');
  await logExecutionEvent(db, { execution_id: execution.id, flow_id: execution.flow_id, agency_id: execution.agency_id, lead_id: execution.lead_id, event_type: 'automation_completed', message: 'Automacao concluida.' });
}

async function stop(db: Db, execution: any, reason: string, countMetric = true) {
  await db.from('automation_executions').update({ status: 'stopped', stop_reason: reason, completed_at: now(), last_activity_at: now() }).eq('id', execution.id);
  await db.from('automation_pending_actions').update({ status: 'cancelled', last_error: reason }).eq('execution_id', execution.id).in('status', ['pending', 'processing']);
  if (countMetric) await incrementFlowMetric(db, execution.flow_id, 'stopped');
  await logExecutionEvent(db, { execution_id: execution.id, flow_id: execution.flow_id, agency_id: execution.agency_id, lead_id: execution.lead_id, event_type: 'automation_stopped', message: reason });
}

async function stopReason(db: Db, flow: any, execution: any, l: any) {
  const rules = obj(flow.stop_rules);
  if (rules.stop_on_final_status !== false && FINAL.has(key(l.status))) return 'lead_final_status';
  const tag = String(rules.stop_on_tag_added || '').toLowerCase().trim();
  if (tag && Array.isArray(l.tags) && l.tags.some((t: string) => String(t).toLowerCase() === tag)) return 'stop_tag_added';
  if (rules.stop_on_reply !== false) {
    const { count } = await db.from('whatsapp_messages').select('id', { count: 'exact', head: true })
      .eq('lead_id', execution.lead_id).eq('is_from_me', false).gte('created_at', execution.started_at);
    if ((count || 0) > 0) return 'lead_replied';
  }
  return null;
}

async function send(db: Db, l: any, agencyId: string, message: string, metadata: Json) {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ agency_id: agencyId, lead_id: l.id, phone_number: l.phone, message, source: 'automation', metadata }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.error || `Falha no envio WhatsApp (${res.status})`);
  return data;
}

async function action(db: Db, step: any, l: any, execution: any) {
  const c = obj(step.config);
  const a = String(c.action || c.action_type || '');
  if (a === 'create_task') {
    await db.from('tasks').insert({
      agency_id: execution.agency_id, title: String(c.title || `Follow-up: ${l.name || 'lead'}`),
      description: String(c.description || `Criada pela automacao ${execution.flow_id}.`),
      assigned_to: c.assigned_to || l.assigned_to || null, status: 'todo', priority: String(c.priority || 'medium'),
      due_date: delayDate(Number(c.due_amount || 1), String(c.due_unit || 'days')).toISOString(), created_by: l.created_by,
    });
    return 'Tarefa criada.';
  }
  if (a === 'move_lead' || a === 'update_status') {
    await db.from('leads').update({ status: String(c.status || c.target_status) }).eq('agency_id', execution.agency_id).eq('id', l.id);
    return 'Status atualizado.';
  }
  if (a === 'add_tag' || a === 'remove_tag') {
    const tag = String(c.tag || '').trim();
    const tags = Array.isArray(l.tags) ? l.tags : [];
    const nextTags = a === 'add_tag' ? Array.from(new Set([...tags, tag])) : tags.filter((t: string) => String(t).toLowerCase() !== tag.toLowerCase());
    await db.from('leads').update({ tags: nextTags }).eq('agency_id', execution.agency_id).eq('id', l.id);
    return a === 'add_tag' ? 'Tag adicionada.' : 'Tag removida.';
  }
  if (a === 'assign_owner') {
    await db.from('leads').update({ assigned_to: c.assigned_to }).eq('agency_id', execution.agency_id).eq('id', l.id);
    return 'Responsavel alterado.';
  }
  if (a === 'notify_team') {
    const { data: users } = await db.from('agency_users').select('user_id').eq('agency_id', execution.agency_id).in('role', ['owner', 'admin']);
    const rows = (users || []).map((u: any) => ({ user_id: u.user_id, agency_id: execution.agency_id, type: 'lead', priority: 'medium', title: String(c.title || 'Automacao WhatsApp'), message: String(c.message || `Acao necessaria para ${l.name || 'lead'}.`), metadata: { lead_id: l.id, execution_id: execution.id, flow_id: execution.flow_id } }));
    if (rows.length) await db.from('notifications').insert(rows);
    return 'Equipe notificada.';
  }
  if (a === 'pause_automation') await db.from('automation_executions').update({ status: 'paused', last_activity_at: now() }).eq('id', execution.id);
  if (a === 'end_automation') await db.from('automation_executions').update({ status: 'completed', completed_at: now(), last_activity_at: now() }).eq('id', execution.id);
  return 'Acao registrada.';
}

export async function processPendingAction(db: Db, pending: any) {
  const [{ data: execution }, { data: flow }, { data: step }] = await Promise.all([
    db.from('automation_executions').select('*').eq('id', pending.execution_id).maybeSingle(),
    db.from('automation_flows').select('*').eq('id', pending.flow_id).maybeSingle(),
    db.from('automation_steps').select('*').eq('id', pending.step_id).maybeSingle(),
  ]);
  if (!execution || !flow || !step || !ACTIVE.includes(execution.status)) {
    await db.from('automation_pending_actions').update({ status: 'cancelled', last_error: 'Execucao indisponivel.' }).eq('id', pending.id);
    return { cancelled: true };
  }
  const l = await lead(db, execution.agency_id, execution.lead_id);
  if (!l) return stop(db, execution, 'lead_not_found');
  const reason = await stopReason(db, flow, execution, l);
  if (reason) {
    await stop(db, execution, reason);
    await db.from('automation_pending_actions').update({ status: 'cancelled', last_error: reason }).eq('id', pending.id);
    return { stopped: true };
  }

  const all = await steps(db, flow.id);
  const c = obj(step.config);
  const p = obj(pending.payload);

  if (step.step_type === 'condition') {
    const r = await evaluateConditions(db, c.conditions || [], l, { ...p, condition_mode: c.mode || 'all', started_at: execution.started_at });
    await logExecutionEvent(db, { execution_id: execution.id, flow_id: flow.id, agency_id: execution.agency_id, lead_id: l.id, step_id: step.id, event_type: 'condition_evaluated', message: r.passed ? 'Condicao aprovada.' : 'Condicao reprovada.', metadata: r });
    if (!r.passed && String(c.on_false || 'stop') === 'stop') await stop(db, execution, 'condition_not_met');
    else await next(db, execution, all, step, new Date(), p);
  } else if (step.step_type === 'send_whatsapp' || step.step_type === 'send_whatsapp_media') {
    const text = await render(db, String(c.message || c.text || ''), l, p);
    const media = String(c.media_url || c.url || '').trim();
    const message = step.step_type === 'send_whatsapp_media' && media ? `${text}\n${media}`.trim() : text;
    if (!message) throw new Error('Mensagem vazia apos aplicar variaveis.');
    const result = await send(db, l, execution.agency_id, message, { flow_id: flow.id, execution_id: execution.id, step_id: step.id, media_url: media || null });
    await logExecutionEvent(db, { execution_id: execution.id, flow_id: flow.id, agency_id: execution.agency_id, lead_id: l.id, step_id: step.id, event_type: 'message_sent', message: previewOf(message), metadata: { send_result: result } });
    await incrementFlowMetric(db, flow.id, 'messages_sent');
    await next(db, execution, all, step, new Date(), p);
  } else if (step.step_type === 'delay') {
    const runAt = delayDate(Number(c.amount || 10), String(c.unit || 'minutes'));
    await logExecutionEvent(db, { execution_id: execution.id, flow_id: flow.id, agency_id: execution.agency_id, lead_id: l.id, step_id: step.id, event_type: 'delay_created', message: `Aguardando ${c.amount || 10} ${c.unit || 'minutes'}.`, metadata: { run_at: runAt.toISOString() } });
    await next(db, execution, all, step, runAt, p);
  } else if (step.step_type === 'action') {
    const msg = await action(db, step, l, execution);
    await logExecutionEvent(db, { execution_id: execution.id, flow_id: flow.id, agency_id: execution.agency_id, lead_id: l.id, step_id: step.id, event_type: 'action_executed', message: msg, metadata: { action: c.action || null } });
    if (!['pause_automation', 'end_automation'].includes(String(c.action))) await next(db, execution, all, step, new Date(), p);
  } else if (step.step_type === 'branch') {
    const r = await evaluateConditions(db, c.conditions || [], l, { ...p, condition_mode: c.mode || 'all', started_at: execution.started_at });
    const target = all.find((s) => s.position === Number(r.passed ? c.true_position : c.false_position));
    await logExecutionEvent(db, { execution_id: execution.id, flow_id: flow.id, agency_id: execution.agency_id, lead_id: l.id, step_id: step.id, event_type: 'branch_evaluated', message: r.passed ? 'Ramificacao positiva.' : 'Ramificacao negativa.', metadata: r });
    if (target) await enqueue(db, execution, target, new Date(), p); else await next(db, execution, all, step, new Date(), p);
  } else {
    await db.from('automation_executions').update({ status: 'completed', completed_at: now(), last_activity_at: now() }).eq('id', execution.id);
    await incrementFlowMetric(db, flow.id, 'completed');
    await logExecutionEvent(db, { execution_id: execution.id, flow_id: flow.id, agency_id: execution.agency_id, lead_id: l.id, step_id: step.id, event_type: 'automation_completed', message: 'Bloco de encerramento executado.' });
  }
  await db.from('automation_pending_actions').update({ status: 'done', last_error: null }).eq('id', pending.id);
  return { success: true };
}

async function start(db: Db, flow: any, l: any, triggerType: string, payload: Json) {
  const all = await steps(db, flow.id);
  const first = all[0];
  const { data: execution, error } = await db.from('automation_executions').insert({
    flow_id: flow.id, agency_id: flow.agency_id, lead_id: l.id, status: first ? 'running' : 'completed',
    current_step_id: first?.id ?? null, trigger_type: triggerType, trigger_payload: payload, completed_at: first ? null : now(),
  }).select().single();
  if (error) return error.code === '23505' ? { skipped: true, reason: 'active_execution_exists' } : Promise.reject(error);
  await logExecutionEvent(db, { execution_id: execution.id, flow_id: flow.id, agency_id: flow.agency_id, lead_id: l.id, event_type: 'flow_entered', message: 'Lead entrou no fluxo.', metadata: { trigger_type: triggerType, payload } });
  await incrementFlowMetric(db, flow.id, 'entered', 1, { last_execution_at: now() });
  if (first) await enqueue(db, execution, first, new Date(), payload);
  return { started: true, execution_id: execution.id };
}

export async function triggerAutomationFlows(db: Db, args: { agencyId: string; leadId: string; triggerType: string; payload?: Json }) {
  const l = await lead(db, args.agencyId, args.leadId);
  if (!l) return { started: 0, skipped: 0, reason: 'lead_not_found' };
  const triggerTypes = args.triggerType === 'whatsapp_message_received' ? ['whatsapp_message_received', 'keyword_received'] : [args.triggerType];
  const { data: flows, error } = await db.from('automation_flows').select('*')
    .eq('agency_id', args.agencyId).eq('status', 'active').eq('is_deleted', false).in('trigger_type', triggerTypes);
  if (error) throw error;
  let started = 0, skipped = 0;
  const results = [];
  for (const flow of flows || []) {
    const payload = args.payload || {};
    const cfg = obj(flow.trigger_config);
    if (flow.trigger_type === 'keyword_received') {
      const word = String(cfg.keyword || '').toLowerCase().trim();
      if (!word || !String(payload.content || payload.message || '').toLowerCase().includes(word)) { skipped++; continue; }
    }
    if (obj(flow.stop_rules).avoid_conflicts !== false) {
      const { count } = await db.from('automation_executions').select('id', { count: 'exact', head: true }).eq('agency_id', args.agencyId).eq('lead_id', args.leadId).in('status', ACTIVE);
      if ((count || 0) > 0) { skipped++; results.push({ flow_id: flow.id, skipped: true, reason: 'conflicting_execution' }); continue; }
    }
    const ok = await evaluateConditions(db, cfg.conditions || [], l, { ...payload, condition_mode: cfg.condition_mode || 'all', started_at: now() });
    if (!ok.passed) { skipped++; results.push({ flow_id: flow.id, skipped: true, reason: 'trigger_condition_failed' }); continue; }
    const r = await start(db, flow, l, args.triggerType, payload);
    if ((r as any).started) started++; else skipped++;
    results.push({ flow_id: flow.id, ...r });
  }
  return { started, skipped, results };
}

export async function stopExecutionsForLeadReply(db: Db, args: { agencyId: string; leadId: string; conversationId?: string | null; payload?: Json }) {
  const { data, error } = await db.from('automation_executions').select('*, automation_flows(stop_rules)').eq('agency_id', args.agencyId).eq('lead_id', args.leadId).in('status', ACTIVE);
  if (error) throw error;
  let stopped = 0;
  for (const ex of data || []) {
    if (obj(ex.automation_flows?.stop_rules).stop_on_reply === false) continue;
    await stop(db, ex, 'lead_replied');
    await incrementFlowMetric(db, ex.flow_id, 'responses_received');
    await logExecutionEvent(db, { execution_id: ex.id, flow_id: ex.flow_id, agency_id: args.agencyId, lead_id: args.leadId, event_type: 'lead_replied', message: 'Lead respondeu no WhatsApp.', metadata: { conversation_id: args.conversationId ?? null, ...(args.payload || {}) } });
    stopped++;
  }
  return { stopped };
}
