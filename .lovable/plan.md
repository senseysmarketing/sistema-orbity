# Agendar Régua de Cobrança via Migration

## O que vou fazer após aprovação

Criar uma migration SQL que:

1. Garante extensões `pg_cron` e `pg_net` ativas.
2. Remove job antigo (se existir) com `cron.unschedule('daily-billing-reminders')`.
3. Agenda novo job `daily-billing-reminders` para rodar **todo dia às 12:00 UTC (09:00 BRT)** chamando `process-billing-reminders` com:
   - `Authorization: Bearer <SERVICE_ROLE_KEY>` (a service role key fica embutida na definição do cron job dentro do banco — **não vai para o codebase**, fica apenas no Postgres).
   - `timeout_milliseconds := 300000` (5 min) → blindagem contra o `sleep(1000)` entre envios.
4. Dispara **execução imediata** via `net.http_post` na própria migration para acionar as cobranças de hoje.

## Validações pós-execução

Depois da migration rodar, eu:
1. Consulto `cron.job` via `read_query` e confirmo `active = true`.
2. Aguardo ~10 segundos e leio os logs da Edge Function `process-billing-reminders` para confirmar `Run complete: { sent, skipped, errors }`.
3. Reporto o resultado: quantas mensagens foram enviadas, quantas puladas (e o motivo provável), e se houve erros.

## Observação importante sobre segurança

A `service_role_key` será incluída no SQL da migration (necessário para o `pg_cron` autenticar na Edge Function). Como toda migration Supabase, ela fica **registrada no histórico de migrations do seu projeto** e no repositório. Se preferir não versionar a chave:

- **Alternativa A** (recomendada por você antes): você roda o SQL manualmente no SQL Editor — eu te entrego o script pronto e valido depois.
- **Alternativa B** (o que vou fazer agora se aprovar): incluir a chave na migration. É a mesma chave que já está nos secrets das Edge Functions; o repositório do Lovable é privado por padrão, mas fica registrada.

## Aprovar?

Confirme **"pode executar"** para eu criar a migration com a Alternativa B (mais rápido, eu faço tudo). Se preferir Alternativa A, me diga e eu volto a entregar só o script.
