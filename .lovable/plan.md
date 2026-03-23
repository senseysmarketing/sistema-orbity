

# Corrigir leads sem automação de saudação

## Diagnóstico

Os 3 leads que estão ativos na fila de automação já foram processados (follow-up 2 enviado, aguardando step 3 amanhã). Não há mensagens pendentes de envio para hoje.

O problema real: **11 leads criados entre 20/03 e 23/03 nunca receberam a mensagem de saudação** porque a função `facebook-leads` (linha 586) só cria automações quando `whatsapp_accounts.status = 'connected'`. Como a conta estava `connecting`, esses leads foram silenciosamente ignorados — nenhum registro foi criado em `whatsapp_automation_control`.

Leads afetados (sem automação):
- Eduardo Jonhy, Nilton Carlos Parreira, Marcilio Teixeira, Jefferson Gama, Reinaldo Occhiutto, Eduardo, Fernanda Mariano, Mauro Calione, Denis Cardoso, Apartamentos/Imóveis, Tarcísio Pedrosa

## Correções

### 1. Criar automações retroativamente (migração SQL)
- Inserir registros em `whatsapp_automation_control` para os 11 leads que não têm automação
- Status `active`, fase `greeting`, step 1, `next_execution_at` = agora (para envio imediato)
- Criar conversas em `whatsapp_conversations` para leads que não têm

### 2. Corrigir `facebook-leads/index.ts` (linha 586)
- Mudar `.eq('status', 'connected')` para `.in('status', ['connected', 'connecting'])`
- Mesmo padrão de tolerância já aplicado no `process-whatsapp-queue`

### 3. Corrigir `capture-lead/index.ts` (linha 31)
- Mesma correção: aceitar `connecting` além de `connected`

### Arquivos
- `supabase/functions/facebook-leads/index.ts` — tolerância de status
- `supabase/functions/capture-lead/index.ts` — tolerância de status
- Migração SQL — criar automações para os 11 leads perdidos

