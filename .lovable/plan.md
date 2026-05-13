## Diagnóstico

Analisando `src/pages/EmailMarketing.tsx` (aba "Gerenciar Campanhas") e a edge function `sendpulse-api` (action `get_campaigns`), identifiquei 4 problemas distintos no card de relatório:

### 1. Status "Erro" incorreto
A SendPulse retorna `status` numérico junto com `status_explain` (string). O nosso mapeamento atual está invertido em relação aos códigos reais da API:

- Código atual assume: `0=Agendada, 1=Enviando, 2=Concluída, 3=Erro`
- SendPulse usa (entre outros): `1=Draft, 2=Em moderação, 3=Enviada/Concluída, 4=Pausada, 11=Em fila, 12=Enviando…`

Como a campanha foi enviada (status real = 3 = "Sent"), o badge mostra "Erro" porque na nossa tabela 3 = Erro. Por isso também o `CampaignStatsDialog` mostra tudo zerado: ele entra no branch `isScheduled = (status === 0)` apenas, e na verdade está chamando `get_campaign_stats` mas como a SendPulse acabou de processar, ainda retorna métricas vazias (esperado nas primeiras horas) — mas o problema visual principal é o badge errado.

**Fix**: ler `status_explain` retornado pela própria SendPulse e renderizá-lo como badge, com cor inferida (Sent/Send→verde, Error/Failed→vermelho, Draft/Queue→âmbar, Sending→azul). Isso elimina dependência de adivinhar códigos.

### 2. Coluna "Lista de Destino" vazia
O código faz: `addressBooks.find((b) => b.id === camp.list_id)`.

A API `GET /campaigns` da SendPulse retorna o campo como `address_book_id` (não `list_id`). Como `camp.list_id` é `undefined`, o fallback `|| camp.list_id` também imprime nada.

**Fix**: usar `camp.address_book_id ?? camp.list_id` na lookup, e como fallback final mostrar "—" em vez de string vazia.

### 3. Coluna "Data" exibindo data atual estranha
Linha 499: `new Date(camp.send_date || camp.all_email_count).toLocaleDateString()`.

`all_email_count` é um número de contatos, não uma data — quando `send_date` está ausente isso vira `new Date(123)` (epoch ms) ou data inválida. A SendPulse retorna o timestamp real em `send_date` (formato `"YYYY-MM-DD HH:mm:ss"`).

**Fix**: usar `camp.send_date` formatado com `date-fns` (`dd/MM/yyyy HH:mm`) e fallback "—" quando ausente.

### 4. Volume Mensal não atualizou após envio
Após `handleSendCampaign` o código já chama `invalidate.invalidateAccountInfo()`. O contador zerado se deve a:

a) A SendPulse atualiza `email_qty` (consumo do mês) com latência de minutos após o disparo — não é instantâneo na API `/userinfo`.
b) O `staleTime` do hook `useSendPulseAccountInfo` (5 min) não interfere aqui pois invalidate força refetch — mas o dado em si na SendPulse ainda não mudou.

**Fix**: nada a corrigir no código além do que já está; vou adicionar uma nota visual sutil ("Atualizado há X min · pode levar alguns minutos para refletir após disparos") abaixo do card "Volume Mensal" usando `accountInfoQuery.dataUpdatedAt`. Assim o usuário entende que o número virá.

### 5. (Bônus) Diálogo de estatísticas
Hoje só mostra layout "Agendada" se `status === 0`. Como vamos passar a usar `status_explain`, também ajusto o `CampaignStatsDialog`:
- Receber `status_explain` e renderizar o mesmo badge bonito que a tabela
- Quando métricas vierem zeradas mas a campanha está "Sent", exibir aviso: "📊 As métricas de abertura/clique podem levar alguns minutos para serem processadas pela SendPulse após o disparo."

## Arquivos a alterar

1. **`src/pages/EmailMarketing.tsx`** (aba "Gerenciar Campanhas", linhas ~482-499)
   - Criar helper `renderStatusBadge(camp)` baseado em `status_explain`
   - Trocar lookup da lista para `address_book_id`
   - Formatar `send_date` corretamente
   - Adicionar nota "atualizado há X" no card Volume Mensal (linhas 254-263)

2. **`src/components/email-marketing/CampaignStatsDialog.tsx`**
   - Usar `status_explain` no badge do header
   - Adicionar aviso de processamento quando `sent > 0` mas `opened/clicked === 0` e a campanha foi enviada há pouco

## Fora de escopo
- Não mexer em `useSendPulse.tsx` / cache / edge function `sendpulse-api`
- Não alterar fluxo de envio (`handleSendCampaign`) nem `CampaignBuilder`
- Não tocar nas outras abas (Listas, Nova Campanha)
