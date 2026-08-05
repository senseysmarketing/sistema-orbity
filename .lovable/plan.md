# Régua de cobrança 05/08: 3 de 4 mensagens falharam por número inválido

## O que realmente aconteceu (confirmado nos dados)

A régua **rodou** hoje às 09:00 BRT e tentou 4 cobranças. Só a do ANZ passou. Os logs de `billing_message_logs` mostram o motivo exato:

| Cliente | Telefone cadastrado | Número enviado ao WhatsApp | Resultado |
|---|---|---|---|
| ANZ Imóveis | (16) 9248-1113 | 5516… | ✅ enviado |
| Tominaga Imóveis | (35) 9999-2244 | 553599992244 | ❌ "not on WhatsApp" |
| Bento Soares Multimarcas | (16) 3701-7337 | 551637017337 | ❌ "not on WhatsApp" |
| EOS Imóveis | (15) 9969-5416 | 551599695416 | ❌ "not on WhatsApp" |

**Causa raiz:** esses telefones estão cadastrados com **8 dígitos** (formato antigo, sem o nono dígito). O normalizador (`normalizePhone`) só acrescenta o `55` e envia — não tenta a variante com o 9. O Uazapi então responde que o número não existe no WhatsApp. Já existe um utilitário `phoneVariants` que gera exatamente essas variantes, mas o envio não o usa.

Os outros clientes do dia **não foram erro**:
- **New 4 Car** — já está marcado como pago (correto pular).
- **Imobiliária Prime** e **Ótica Visão Perfeita** — são `billing_type = manual`, e a agência está com **`manual_billing_enabled = false`** e sem template manual preenchido. Ou seja: hoje a régua só cobre cobranças Conexa.

## Correções propostas

### 1. Envio resiliente ao nono dígito (correção principal)
No `whatsapp-send`, quando o provedor responder que o número não está no WhatsApp, tentar automaticamente as variantes do número (com/sem o 9) antes de dar erro. Ao acertar uma variante, gravar o número correto de volta no cadastro do cliente para os próximos envios saírem certos de primeira.

### 2. Corrigir os telefones no cadastro
Normalizar os contatos de clientes com celular de 8 dígitos para o formato com nono dígito, e sinalizar no formulário quando o número tiver tamanho inválido. Números que forem realmente fixo (ex.: 3701-7337 pode ser telefone fixo) não têm WhatsApp — esses precisam de um celular cadastrado; vou listar quais são para você conferir.

### 3. Reenviar as cobranças de hoje
Depois da correção, disparar o reenvio para Tominaga, Bento Soares e EOS, sem duplicar o ANZ (a deduplicação por `notification_tracking` já garante isso).

### 4. Cobranças manuais fora da régua
Prime e Ótica não recebem nada hoje porque a régua manual está desligada e sem template. Posso ativar e criar o template de lembrete manual — mas confirme se você quer que cobranças `manual` também entrem na régua.

### 5. Visibilidade dos erros
Painel no financeiro com os envios do dia: status, motivo da falha e botão de reenvio por cobrança — hoje esses erros só aparecem se alguém for olhar a tabela de logs.

## Detalhes técnicos

- `supabase/functions/whatsapp-send/index.ts`: usar `phoneVariants` de `_shared/phone.ts` como fallback quando a resposta do Uazapi vier com `provider_failed` / "is not on WhatsApp"; limitar a 2-3 tentativas por envio.
- `supabase/functions/_shared/whatsapp.ts` (`normalizePhone`): manter o comportamento atual; a escolha da variante fica no envio, para não afetar webhook/conversas.
- `supabase/functions/process-billing-reminders/index.ts`: registrar em `billing_message_logs` também os pulos (gateway desligado, template vazio, sem telefone), hoje apenas contados em `totalSkipped`.
- Reenvio: função de disparo manual por `payment_id`, respeitando `notification_tracking` (`billing_reminder:AAAA-MM-DD`).
