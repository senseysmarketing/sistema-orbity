

# Sistema de Qualificação por Pontuação Automática de Leads

## Visão Geral

Implementar scoring automático de leads baseado nas respostas dos formulários Meta Ads, com classificação automática de temperatura (cold/warm/hot), disparo de eventos para o pixel Meta do usuário, e uma aba de configuração no CRM Settings.

## Banco de Dados — 3 novas tabelas + 2 colunas

### 1. `lead_scoring_rules` — Regras de pontuação por agência/formulário
- `id`, `agency_id`, `form_id` (ref facebook_lead_integrations), `form_name`, `question`, `answer`, `score` (-2 a +2), `is_blocker` (boolean), `created_at`
- RLS: agency members can CRUD their own rules

### 2. `lead_scoring_results` — Resultado de qualificação por lead
- `id`, `lead_id` (ref leads), `agency_id`, `score_total`, `qualification` (cold/warm/hot), `answers_detail` (jsonb — array of {question, answer, score}), `scored_at`
- RLS: agency members read/write

### 3. `meta_conversion_events` — Log de eventos enviados ao pixel (idempotência)
- `id`, `lead_id`, `agency_id`, `event_name`, `pixel_id`, `status` (sent/failed), `response_data` (jsonb), `sent_at`
- UNIQUE(lead_id, event_name) — previne duplicatas

### 4. Colunas novas em `leads`
- `qualification_score` (integer, nullable) — score calculado
- `qualification_source` (text, nullable) — 'auto' ou 'manual'

### 5. Coluna em `facebook_lead_integrations` (já existe `pixel_id`)
- Já existe! Vamos usá-la para armazenar o pixel_id do usuário por integração.

## Frontend — Nova aba "Qualificação" no CRM Settings

### Componente: `LeadScoringConfig.tsx`
Estrutura:
1. **Pixel ID** — Campo de input para inserir o ID do pixel Meta (salvo por agência na tabela `facebook_lead_integrations`)
2. **Seletor de formulário** — Dropdown listando formulários detectados da `facebook_lead_integrations`
3. **Configuração de regras** — Para cada formulário selecionado:
   - Lista as perguntas detectadas (extraídas dos `custom_fields` dos leads existentes daquele form)
   - Para cada pergunta, permite adicionar respostas com pontuação (-2 a +2) e marcar como bloqueador
   - CRUD completo de regras
4. **Tabela de classificação** — Exibe os thresholds: ≥5 = Hot, 2-4 = Warm, ≤1 = Cold

### Integração no CRM Settings
- Adicionar aba "Qualificação" com ícone `Target` no `CRMSettings.tsx`

## Backend — Edge Function `process-lead-qualification`

Nova edge function que:
1. Recebe `lead_id` e `agency_id`
2. Busca respostas do lead em `custom_fields`
3. Busca regras de scoring da agência para o formulário correspondente
4. Calcula score total (com lógica de blocker)
5. Classifica: ≥5 HOT, 2-4 WARM, ≤1 COLD
6. Salva em `lead_scoring_results`
7. Atualiza `leads.temperature` e `leads.qualification_score`
8. Se HOT → dispara evento `QualifiedLead` para o pixel Meta via Conversions API

## Backend — Disparo de Eventos Meta (na mesma function)

Quando lead é classificado como HOT:
- POST para `https://graph.facebook.com/v18.0/{PIXEL_ID}/events`
- Payload com `event_name: "Lead"` (evento padrão) + custom data
- Hash SHA256 de phone/email para `user_data`
- Log em `meta_conversion_events` com idempotência

### Eventos por mudança de status do funil
Integrar no `facebook-leads` webhook — após criar lead, chamar `process-lead-qualification`. Além disso, adicionar lógica de eventos no track de mudança de status:
- `leads` → Lead
- `qualified`/HOT → QualifiedLead  
- `scheduled` → Schedule
- `proposal` → SubmitApplication
- `won` → Purchase

## Integração no fluxo existente

No `facebook-leads/index.ts` (handleWebhook), após criar o lead:
1. Chamar `process-lead-qualification` via fetch interno
2. A function calcula score, atualiza temperatura, e dispara evento se necessário

## Arquivos Afetados

1. **Nova migration SQL** — 3 tabelas + 2 colunas + RLS
2. **`src/components/crm/LeadScoringConfig.tsx`** — Nova aba de configuração (componente principal)
3. **`src/components/crm/CRMSettings.tsx`** — Adicionar aba "Qualificação"
4. **`supabase/functions/process-lead-qualification/index.ts`** — Nova edge function
5. **`supabase/functions/facebook-leads/index.ts`** — Chamar qualificação após criação do lead
6. **`supabase/config.toml`** — Registrar nova function com `verify_jwt = false`

