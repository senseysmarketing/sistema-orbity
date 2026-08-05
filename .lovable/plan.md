# Régua de cobrança: apenas 1 mensagem enviada no dia 05

## Situação

Vários clientes vencem hoje (05/08) e apenas o ANZ recebeu a mensagem. Não consigo confirmar a causa agora: as ferramentas de banco estão retornando **"Forbidden — reautentique com o Supabase"**, então não pude ler `billing_message_logs`, `notification_tracking` nem `client_payments`. Qualquer diagnóstico agora seria chute — então o plano começa por medir, não por mexer.

Para eu conseguir investigar, é preciso reconectar/reautenticar o Supabase no projeto.

## Etapa 1 — Diagnóstico (antes de qualquer alteração)

Com o Supabase reconectado, verificar:

1. `billing_message_logs` das últimas 48h: quantos registros com `status = 'success'` e `'error'`, e o `error_details` de cada falha.
2. Logs da edge function `process-billing-reminders` do run de hoje 09:00 BRT: o resumo final (`sent/skipped/errors`) e se a execução terminou ou foi cortada no meio.
3. `client_payments` com `due_date = '2026-08-05'`: status, `billing_type`, e nos clientes ligados — `contact` preenchido e `billing_automation_enabled = true`.
4. `notification_tracking` com `notification_type = 'billing_reminder:2026-08-05'`: quais pagamentos foram marcados como já notificados.
5. `agency_payment_settings`: quais gateways de cobrança estão habilitados (`manual/conexa/asaas`) e quais templates estão preenchidos.

Isso separa as três hipóteses possíveis: (a) clientes filtrados por regra/toggle/telefone, (b) envio falhando no Uazapi, (c) execução interrompida antes de percorrer a lista toda.

## Etapa 2 — Reenvio do dia

Depois de identificar quem ficou de fora, disparar o reenvio para os pagamentos de hoje que não têm registro de sucesso, sem duplicar quem já recebeu (respeitando o `notification_tracking`).

## Etapa 3 — Correção conforme o diagnóstico

Aplico somente o que os dados apontarem. Cenários prováveis e a correção correspondente:

- **Execução interrompida no meio da lista:** hoje o loop faz `sleep(1000)` entre cada envio e nada é retomado se a função encerrar. Correção: remover o bloqueio serial (enviar em lotes pequenos com concorrência controlada), gravar o progresso por pagamento e permitir que uma segunda execução continue de onde parou.
- **Falha de envio no Uazapi:** adicionar retentativa com espera crescente no envio e um segundo agendamento (ex.: 12:00 BRT) que reprocessa apenas pagamentos sem sucesso registrado no dia.
- **Cliente filtrado indevidamente** (telefone vazio, automação desligada, gateway/template desabilitado): registrar o motivo do skip em `billing_message_logs` em vez de apenas contar, para o problema ficar visível.

## Etapa 4 — Visibilidade na tela

Painel de acompanhamento da régua no admin financeiro: lista dos envios do dia com status e motivo do skip/erro, e botão de reenvio manual por cobrança.

## Detalhes técnicos

- Arquivos envolvidos: `supabase/functions/process-billing-reminders/index.ts` (loop, filtros, dedup) e a função de envio `whatsapp-send`.
- O dedup por `notification_tracking` (`billing_{tipo}:{data}`) continua sendo a garantia contra mensagem duplicada — reenvios e retentativas passam por ele.
- Nenhuma mudança em templates, valores ou datas de vencimento.
