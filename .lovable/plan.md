# Corrigir espelhamento do WhatsApp no modal do lead

## Causa raiz confirmada

O modal do lead mostra spinner infinito e cai em "Nenhuma mensagem ainda" porque o `useLeadConversation` chama a edge `resolve-whatsapp-conversation`, mas a edge **não está deployada** — a rede mostra `404 NOT_FOUND` / `Failed to fetch` em todas as chamadas, e os logs estão vazios (nunca executou).

Motivo: as novas funções criadas nas fases anteriores **não foram registradas em `supabase/config.toml`**. Sem entrada `[functions.<nome>]`, o Supabase não faz o deploy automático.

Funções afetadas:
- `resolve-whatsapp-conversation` (bloqueia o modal inteiro)
- `process-whatsapp-ghosting` (bloqueia o cron de 24h)

Entradas existentes hoje: `whatsapp-connect`, `whatsapp-send`, `whatsapp-webhook`, `process-whatsapp-queue`, `whatsapp-sync-messages`.

## O que vou fazer

### 1. Registrar as duas funções em `supabase/config.toml`

Adicionar dois blocos seguindo o padrão das demais:

```toml
[functions.resolve-whatsapp-conversation]
verify_jwt = true

[functions.process-whatsapp-ghosting]
verify_jwt = false
```

- `resolve-whatsapp-conversation`: mantém `verify_jwt = true` (ele usa `assertAgencyAccess` com o token do usuário).
- `process-whatsapp-ghosting`: `verify_jwt = false` porque será chamada por `pg_cron`, como já fazemos com os outros jobs (padrão da memória `Auth Closure`).

### 2. Validar o deploy

- Após a aprovação da migration/edit, chamar `resolve-whatsapp-conversation` via `supabase--curl_edge_functions` com `account_id` + `lead_id` reais para confirmar 200.
- Conferir `whatsapp_conversation_resolution_logs` para ver o evento de resolução do lead Doraci.
- Conferir `whatsapp_conversations` para a Doraci: deve haver **uma única linha** com `context='lead'` (a migration de merge já rodou; só faltava a edge responder).

### 3. Reabrir o modal e validar fluxo end-to-end

- `useLeadConversation` retorna `conversation_id` único da Doraci.
- `useConversationMessages` carrega mensagens da conversa principal (incluindo as já enviadas).
- Envio manual e automação continuam usando o mesmo `conversation_id` (já refatorado).

## Por que isso resolve

Toda a lógica de merge, eleição de primária, unique index e refactor do frontend já está no lugar (migrations aprovadas, `useWhatsApp` chamando o resolver). O único elo quebrado é o registro das funções no `config.toml`, que impede o deploy. Com o registro feito, o resolver passa a responder, o spinner desaparece e o histórico da Doraci aparece.

## Detalhes técnicos

- `supabase/config.toml` é a única fonte que controla quais funções entram em deploy automático no projeto.
- Não há mudança de código TS necessária — `resolve-whatsapp-conversation/index.ts` e `process-whatsapp-ghosting/index.ts` já estão prontos.
- Sem mudança de schema. Sem nova migration.
