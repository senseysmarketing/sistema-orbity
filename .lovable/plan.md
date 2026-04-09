

# Painel Master: Central de Gestao Consultiva + Leads

## Resumo
Transformar o Painel Master em central completa com: gestao financeira de agencias, cadastro manual, bloqueio por inadimplencia, detalhes em Sheet lateral, e gestao de leads do funil de qualificacao (ApplicationModal).

---

## 1. Banco de Dados (Migration)

### Tabela `orbity_leads`
```sql
CREATE TABLE public.orbity_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  instagram TEXT,
  team_size TEXT,
  active_clients TEXT,
  avg_ticket TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orbity_leads ENABLE ROW LEVEL SECURITY;

-- Apenas admins master podem ler/atualizar
CREATE POLICY "Master admins can manage orbity_leads"
  ON public.orbity_leads FOR ALL
  TO authenticated
  USING (public.is_master_agency_admin())
  WITH CHECK (public.is_master_agency_admin());

-- Inserts anonimos permitidos (landing page)
CREATE POLICY "Anyone can insert orbity_leads"
  ON public.orbity_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

### Coluna `monthly_value` na tabela `agencies`
```sql
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS monthly_value NUMERIC DEFAULT 0;
```

---

## 2. Arquivos a criar

### `src/components/master/OrbityLeadsTable.tsx`
Tabela com colunas: Data, Nome & Contato (com link WhatsApp), Instagram, Perfil (equipe + clientes), Ticket Medio (Badge verde para >5k), Status (Select inline: Novo/Em Contato/Reuniao Agendada/Fechado/Desqualificado). Paginacao (10/pagina), busca por nome/email. Mutacao de status via update direto no Supabase.

### `src/components/master/CreateAgencyDialog.tsx`
Dialog com formulario: Nome da Agencia, Nome do Responsavel, E-mail, WhatsApp, Valor Mensal. Ao salvar:
1. Chama `agency-onboarding` edge function para criar agencia + usuario admin
2. Atualiza `monthly_value` na agencia criada
3. Comentario no codigo para futura integracao Stripe

### `src/components/master/AgencyDetailsSheet.tsx`
Sheet lateral com: info da agencia, historico de pagamentos (mockado), Switch para suspender/reativar manualmente (`is_active` toggle).

---

## 3. Arquivos a modificar

### `src/components/landing/ApplicationModal.tsx`
- No `handleSubmit`, substituir `setTimeout` por um insert real no Supabase:
```ts
await supabase.from('orbity_leads').insert({
  name, email, whatsapp: rawPhone(whatsapp),
  instagram, team_size: teamSize,
  active_clients: activeClients, avg_ticket: avgTicket
});
```

### `src/pages/Master.tsx`
- Expandir Tabs de 4 para 5: adicionar aba "Aplicacoes / Leads" com icone `UserPlus`
- Na aba "Agencias": adicionar botao "Cadastrar Nova Agencia" abrindo `CreateAgencyDialog`
- Importar `OrbityLeadsTable`

### `src/components/master/AgenciesTable.tsx`
- Adicionar coluna "Status Financeiro" com logica de cores:
  - `active` → Badge verde "Em dia"
  - `past_due` com <=5 dias → Badge amarela "Atrasado"
  - `past_due` com >5 dias → Badge vermelha "Inadimplente"
- Adicionar coluna "Valor Mensal" (do `price_monthly` ou campo `monthly_value`)
- Ao clicar "Visualizar Detalhes" no dropdown, abrir `AgencyDetailsSheet`

### `src/components/payment/PaymentMiddlewareWrapper.tsx`
- Adicionar logica: se `subscription_status === 'past_due'` e atraso >5 dias OU `is_active === false`, bloquear acesso
- A `BlockedAccessScreen` ja tem a mensagem adequada; ajustar texto para mencionar "pendencia financeira superior a 5 dias"

### `src/components/payment/BlockedAccessScreen.tsx`
- Atualizar mensagem para: "Acesso suspenso. Detectamos uma pendencia financeira superior a 5 dias. Por favor, regularize o pagamento para restabelecer o acesso."
- Atualizar link do WhatsApp com numero real da Senseys

### `src/hooks/useMaster.tsx`
- Adicionar `monthly_value` ao tipo `MasterAgencyOverview`

---

## 4. Detalhes tecnicos

- A view `master_agency_overview` ja tem `subscription_status`, `current_period_end`, `price_monthly` — usar esses campos
- O calculo de dias de atraso usa `differenceInDays(new Date(), current_period_end)` quando `subscription_status === 'past_due'`
- Paginacao dos leads: estado local `page` com `.range(from, to)` no select
- Status do lead atualizado via `supabase.from('orbity_leads').update({ status }).eq('id', leadId)`

