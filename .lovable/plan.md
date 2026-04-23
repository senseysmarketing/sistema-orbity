

# Mover Toggles de Automação para "Cadência de Mensagens" + Agendar Cron

## Problema

Os toggles **Auto-Contato** e **Auto-Ghosting** foram adicionados no painel global de **Configurações → Integrações → WhatsApp** (`src/components/settings/WhatsAppIntegration.tsx`), mas o local correto — onde o usuário procurou — é o **Sheet de Configurações do CRM → Cadência de Mensagens** (`src/components/crm/WhatsAppTemplateManager.tsx`), logo abaixo dos badges *"Pausa automática em caso de resposta"* e *"Escudo Anti-Bot ativo"* (visíveis no print).

Além disso, o cron job ainda não foi agendado no Postgres.

## Mudanças

### 1. Mover bloco "Automações do CRM" → `WhatsAppTemplateManager.tsx`

Inserir a nova seção **logo após** a linha de badges *Pausa automática / Escudo Anti-Bot* e **antes** das `Tabs` (Saudação / Follow-up). Visual minimal, alinhado com o resto do sheet (sem card pesado — usar `border rounded-lg p-4 bg-muted/20`, mesmo padrão dos toggles atuais):

- **Auto-Contato** (`whatsapp_auto_contact`, default `true`)
  - Label: *"Mover lead para Contato ao receber resposta"*
  - Descrição curta: *"Quando o lead enviar a primeira mensagem, ele é movido automaticamente para a coluna Em Contato."*
- **Auto-Ghosting** (`whatsapp_auto_ghosting`, default `false`)
  - Label: *"Mover para Perdido 24h após o último Follow-up"*
  - Descrição: *"Se o lead não responder em até 24 horas após a última mensagem da sequência, será movido para Perdido com o motivo 'Ghosting no WhatsApp'."*

Reaproveitar a mesma lógica já implementada (`useQuery` lendo `agencies.whatsapp_auto_contact / whatsapp_auto_ghosting` + `useMutation` com `update().eq('id', currentAgency.id)` + toast). `useAgency` e `supabase` já estão importados no arquivo.

### 2. Remover o bloco duplicado de `WhatsAppIntegration.tsx`

Apagar a seção "Automações do CRM" (linhas ~164-210) e o `useQuery`/`useMutation` correlatos em `src/components/settings/WhatsAppIntegration.tsx`. As Configurações → Integrações voltam a focar apenas em conexão de instâncias (escopo original do arquivo).

### 3. Agendar o Cron Job (Guardrail #3 — sem versionamento da chave)

Executar **via tool de insert SQL no Supabase** (não via migration, conforme guideline em `<schedule-jobs-supabase-edge-functions>`), garantindo que `pg_cron` + `pg_net` estejam habilitados e usando a anon key real do projeto:

```sql
-- 1. Garantir extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Agendar varredura horária
select cron.schedule(
  'process-lead-ghosting-hourly',
  '0 * * * *', -- toda hora cheia
  $$
  select net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-lead-ghosting',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

A anon key é **pública por design** (já exposta no frontend via `VITE_SUPABASE_PUBLISHABLE_KEY`); o risco apontado pelo Guardrail #3 era apenas commitar em arquivo `.sql` versionado — usar a tool de insert direto no banco satisfaz a regra.

## Arquivos editados

- `src/components/crm/WhatsAppTemplateManager.tsx` — **novo bloco "Automações do CRM"** entre os badges e as Tabs (≈ 80 linhas: query + mutation + UI dos 2 switches).
- `src/components/settings/WhatsAppIntegration.tsx` — **remoção** do bloco duplicado (limpeza ≈ 80 linhas, incluindo imports não mais usados).
- **Insert SQL** (não migration): `cron.schedule(...)` para invocar a função a cada hora.

## Sem mudanças

- Edge Function `process-lead-ghosting` — já implementada e funcional, sem alterações.
- Edge Function `whatsapp-webhook` — Guardrail #1 já aplicado, mantido.
- Schema das colunas em `agencies` — preservado.
- Lógica de cadência, fases, templates, anti-bot, takeover — preservadas.

