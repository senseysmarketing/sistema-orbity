

# Unificação de Leads (Aplicação + Agendamento)

## Diagnóstico

Hoje `ApplicationModal` e `DemoSchedulingModal` fazem `INSERT` independentes em `orbity_leads`, sem verificar se o e-mail já existe. Resultado: o **Renan** apareceu duplicado — uma linha como "Aplicação" (perfil/qualificação) e outra como "Agendamento" (data marcada). Confirmado no banco: `renan@turbotravelmarketing.com.br` tem 2 registros (`application` + `scheduling`).

## Solução: dedupe por e-mail (UPSERT) + merge de dados

**Princípio**: 1 lead = 1 e-mail. Quando o mesmo e-mail vier de novo, fazemos **merge** — preservando o que já existe e sobrescrevendo apenas o que veio novo. Assim:

| Cenário | Resultado |
|---|---|
| Só preenche aplicação | 1 lead com qualificação, sem agendamento |
| Só agenda demo | 1 lead com data/hora, sem qualificação |
| Faz aplicação **e depois** agenda | 1 lead único com qualificação **e** agendamento |
| Agenda **e depois** preenche aplicação | 1 lead único com agendamento **e** qualificação |

## 1. Migration — índice único + função de merge

```sql
-- Dedupe dos leads existentes (mantém o mais antigo, faz merge dos campos)
WITH ranked AS (
  SELECT id, email,
         ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at ASC) as rn
  FROM public.orbity_leads
),
keepers AS (SELECT email, MIN(created_at) AS keep_at FROM public.orbity_leads GROUP BY lower(email))
-- Merge: para cada e-mail duplicado, copia campos não-nulos das duplicatas para o registro mais antigo
UPDATE public.orbity_leads target
SET
  whatsapp       = COALESCE(target.whatsapp, src.whatsapp),
  phone          = COALESCE(target.phone, src.phone),
  instagram      = COALESCE(target.instagram, src.instagram),
  agency_name    = COALESCE(target.agency_name, src.agency_name),
  team_size      = COALESCE(target.team_size, src.team_size),
  active_clients = COALESCE(target.active_clients, src.active_clients),
  avg_ticket     = COALESCE(target.avg_ticket, src.avg_ticket),
  scheduled_at   = COALESCE(target.scheduled_at, src.scheduled_at),
  lead_source    = CASE
    WHEN target.scheduled_at IS NOT NULL OR src.scheduled_at IS NOT NULL THEN 'scheduling'
    ELSE COALESCE(target.lead_source, src.lead_source)
  END,
  status = CASE
    WHEN src.scheduled_at IS NOT NULL AND target.status = 'novo' THEN 'reuniao_agendada'
    ELSE target.status
  END
FROM (
  SELECT lower(email) AS email_key,
         MAX(whatsapp) whatsapp, MAX(phone) phone, MAX(instagram) instagram,
         MAX(agency_name) agency_name, MAX(team_size) team_size,
         MAX(active_clients) active_clients, MAX(avg_ticket) avg_ticket,
         MAX(scheduled_at) scheduled_at, MAX(lead_source) lead_source
  FROM public.orbity_leads
  GROUP BY lower(email)
  HAVING COUNT(*) > 1
) src
WHERE lower(target.email) = src.email_key
  AND (target.email, target.created_at) IN (SELECT email, keep_at FROM keepers);

-- Apaga as duplicatas (mantém o registro mais antigo de cada e-mail)
DELETE FROM public.orbity_leads
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at ASC) rn
    FROM public.orbity_leads
  ) t WHERE rn > 1
);

-- Índice único case-insensitive previne duplicatas futuras
CREATE UNIQUE INDEX idx_orbity_leads_email_unique ON public.orbity_leads (lower(email));

-- RPC de upsert/merge inteligente (chamada pelos dois modais)
CREATE OR REPLACE FUNCTION public.upsert_orbity_lead(
  p_name text, p_email text, p_whatsapp text DEFAULT NULL,
  p_phone text DEFAULT NULL, p_instagram text DEFAULT NULL,
  p_agency_name text DEFAULT NULL, p_team_size text DEFAULT NULL,
  p_active_clients text DEFAULT NULL, p_avg_ticket text DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL, p_lead_source text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.orbity_leads (
    name, email, whatsapp, phone, instagram, agency_name,
    team_size, active_clients, avg_ticket, scheduled_at, lead_source,
    status
  ) VALUES (
    p_name, lower(p_email), p_whatsapp, p_phone, p_instagram, p_agency_name,
    p_team_size, p_active_clients, p_avg_ticket, p_scheduled_at, p_lead_source,
    CASE WHEN p_scheduled_at IS NOT NULL THEN 'reuniao_agendada' ELSE 'novo' END
  )
  ON CONFLICT (lower(email)) DO UPDATE SET
    name           = COALESCE(NULLIF(EXCLUDED.name, ''),           orbity_leads.name),
    whatsapp       = COALESCE(EXCLUDED.whatsapp,       orbity_leads.whatsapp),
    phone          = COALESCE(EXCLUDED.phone,          orbity_leads.phone),
    instagram      = COALESCE(EXCLUDED.instagram,      orbity_leads.instagram),
    agency_name    = COALESCE(EXCLUDED.agency_name,    orbity_leads.agency_name),
    team_size      = COALESCE(EXCLUDED.team_size,      orbity_leads.team_size),
    active_clients = COALESCE(EXCLUDED.active_clients, orbity_leads.active_clients),
    avg_ticket     = COALESCE(EXCLUDED.avg_ticket,     orbity_leads.avg_ticket),
    scheduled_at   = COALESCE(EXCLUDED.scheduled_at,   orbity_leads.scheduled_at),
    lead_source    = CASE
      WHEN EXCLUDED.scheduled_at IS NOT NULL THEN 'scheduling'
      ELSE COALESCE(orbity_leads.lead_source, EXCLUDED.lead_source)
    END,
    status = CASE
      WHEN EXCLUDED.scheduled_at IS NOT NULL
       AND orbity_leads.status IN ('novo','em_contato') THEN 'reuniao_agendada'
      ELSE orbity_leads.status
    END,
    updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_orbity_lead(
  text,text,text,text,text,text,text,text,text,timestamptz,text
) TO anon, authenticated;
```

**Por que RPC e não `upsert()` direto pelo client**: o índice é em `lower(email)` (expressão), e o `.upsert()` do Supabase JS exige uma constraint nomeada em coluna física. A RPC `SECURITY DEFINER` resolve o merge atomicamente e mantém a RLS de INSERT anônima já existente intacta.

## 2. `ApplicationModal.tsx` — trocar `insert` por RPC

```ts
await supabase.rpc('upsert_orbity_lead', {
  p_name: name.trim(),
  p_email: email.trim(),
  p_whatsapp: rawPhone(whatsapp),
  p_instagram: instagram.trim(),
  p_team_size: teamSize,
  p_active_clients: activeClients,
  p_avg_ticket: avgTicket,
  p_lead_source: 'application',
});
```

Não passa `p_scheduled_at` → mantém agendamento existente (se houver) intocado.

## 3. `DemoSchedulingModal.tsx` — trocar `insert` por RPC

```ts
await supabase.rpc('upsert_orbity_lead', {
  p_name: name.trim(),
  p_email: email.trim(),
  p_whatsapp: rawPhone(phone),
  p_phone: rawPhone(phone),
  p_agency_name: agencyName.trim(),
  p_scheduled_at: scheduledAt.toISOString(),
  p_lead_source: 'scheduling',
});
```

Webhook n8n e tracking continuam intactos.

## 4. UI — `OrbityLeadsTable.tsx` (badge "Origem" enriquecido)

Quando o lead tem **ambas as origens** (qualificação preenchida + `scheduled_at`), o badge "Origem" passa a mostrar **dois chips empilhados**: `Aplicação` + `Agendamento`. Lógica:

```tsx
const hasApplication = !!(lead.team_size || lead.active_clients || lead.avg_ticket || lead.instagram);
const hasScheduling  = !!lead.scheduled_at;
// renderiza 1 ou 2 badges conforme combinação
```

Sem alteração de schema/colunas — usa o que já existe.

## Resultado prático

- **Renan duplicado**: a migration faz o merge — a linha "Aplicação" absorve o `scheduled_at` e `agency_name` da linha "Agendamento", e a duplicata é apagada. Sobra **1 lead único** com tudo.
- **Daqui pra frente**: índice único em `lower(email)` + RPC de merge garantem que nunca mais haverá duplicata, independente da ordem (aplicar→agendar ou agendar→aplicar).
- **Status inteligente**: se o lead estava como `novo` e agenda demo, vira `reuniao_agendada` automaticamente. Se já estava em `apresentado`/`fechado`/etc., status é preservado (não regride).

## Arquivos

**Migration nova** — dedupe + índice único + RPC `upsert_orbity_lead`

**Editados:**
- `src/components/landing/ApplicationModal.tsx` — `insert` → `rpc('upsert_orbity_lead')`
- `src/components/landing/DemoSchedulingModal.tsx` — idem
- `src/components/master/OrbityLeadsTable.tsx` — badge "Origem" suporta dupla origem

## Sem mudanças

- RLS, schema de colunas, webhook n8n, Pixel tracking
- Painel Master (tabs, métricas, fluxo de status)
- Demais módulos

