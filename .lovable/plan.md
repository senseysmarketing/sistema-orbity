## Diagnóstico

O modal está chamando `get_campaign_stats` em `GET /campaigns/{id}/stat`, mas a request real está voltando `404 Not Found` para a campanha atual. Como o componente só usa `stats.sent`, `stats.opened`, etc., qualquer resposta 404 ou formato inesperado vira visualmente tudo zerado.

Além disso, o próprio objeto da campanha já traz dados suficientes para pelo menos estimar “Enviados” com segurança: lista usada (`address_book_id`/`list_id`) e/ou contagens retornadas pela campanha/lista. Por isso, mesmo quando a SendPulse ainda não libera estatísticas detalhadas, o modal não deveria mostrar `Enviados = 0` para uma campanha concluída que foi disparada para 3 contatos.

## Plano de ajuste

1. **Normalizar métricas no modal**
   - Criar uma função local em `CampaignStatsDialog.tsx` para transformar respostas diferentes da SendPulse em um formato único:
     - `sent`
     - `opened`
     - `clicked`
     - `error`
     - `unsubscribed`
     - `open_rate`
     - `click_rate`
   - Tratar explicitamente respostas de erro como `{ message: "Not Found", error_code: 404 }` para não mascarar como “zero real”.

2. **Adicionar fallback inteligente para “Enviados”**
   - Fazer o modal buscar/usar as listas via `useSendPulseAddressBooks`, sem prop drilling.
   - Quando `get_campaign_stats` vier vazio/404, calcular `sent` usando, nesta ordem:
     - campos de contagem existentes no objeto `campaign`, se houver;
     - quantidade da lista vinculada (`address_book_id` ou `list_id`) encontrada em `addressBooks` (`all_email_count`/`all_email_qty`);
     - `0` apenas se não houver nenhum dado confiável.
   - Assim, para sua campanha enviada para 3 contatos, o modal passa a exibir `Enviados = 3` mesmo que estatísticas detalhadas ainda estejam indisponíveis.

3. **Melhorar a mensagem do modal**
   - Se a campanha está concluída e as métricas detalhadas da SendPulse ainda não estão disponíveis, exibir um aviso claro: os envios foram estimados pela lista de destino e aberturas/cliques podem aparecer depois.
   - Manter aberturas, cliques e erros zerados apenas quando a API realmente não retornou esses dados.

4. **Corrigir pequenos rótulos inconsistentes**
   - Em “Aberturas”, trocar o subtítulo atual “cliques únicos” para “aberturas únicas”.
   - Manter “Cliques (CTR)” como cliques totais.

5. **Opcional no backend, se necessário**
   - Ajustar a Edge Function `sendpulse-api` para retornar status HTTP 200 com um objeto normalizado quando a SendPulse responder 404 em estatísticas, em vez de repassar um payload que parece métrica válida.
   - Não alterar o fluxo de envio da campanha nem a lógica de cache já aprovada.

## Resultado esperado

Ao abrir o modal da campanha concluída, o primeiro card deve mostrar pelo menos `Enviados = 3`; as demais métricas continuam podendo ficar zeradas até a SendPulse processar aberturas, cliques, erros e unsubscribes.