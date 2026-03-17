
Objetivo: corrigir a detecção de resposta do lead “Nilton Luiz Silva” e a exibição de mensagens no modal do WhatsApp.

O erro já está identificado.

1. Causa raiz
- A resposta “ok” foi recebida no banco, mas caiu em outra conversa:
  - conversa da automação: `5a287042...` com telefone `+5551998500033`
  - conversa da resposta: `5940598e...` com telefone `555198500033`
- Ou seja: o sistema não falhou por webhook desligado nem por versão da Evolution.
- O webhook está recebendo eventos (`messages.update` aparece nos logs).
- O problema é de normalização/vinculação de telefone no padrão brasileiro.

2. O que isso prova
- O lead está salvo com `+5551998500033`
- A resposta “ok” entrou como `555198500033`
- A RPC `find_lead_by_normalized_phone` só faz match exato por dígitos:
  - `5551998500033` encontra o lead
  - `555198500033` não encontra
- Portanto a conversa da resposta ficou sem `lead_id`, o modal do lead não mostra essa mensagem, e a automação continua ativa porque está olhando a conversa errada.

3. Ajuste necessário
Vou corrigir em três pontos para resolver de forma definitiva:

- `supabase/functions/whatsapp-webhook/index.ts`
  - criar normalização robusta para telefone BR
  - gerar variantes com e sem o 9º dígito após o DDD
  - ao receber mensagem:
    - tentar encontrar conversa por todas as variantes
    - tentar encontrar lead por todas as variantes
    - se achar conversa órfã e conversa do lead, consolidar na conversa do lead
    - atualizar `last_customer_message_at` na conversa correta
    - marcar automação como `responded` na conversa/lead corretos

- `supabase/functions/process-whatsapp-queue/index.ts`
  - ampliar o fallback atual para também considerar variantes BR com/sem nono dígito
  - assim, mesmo se existir histórico legado, o processador cancela follow-up corretamente

- banco / migração SQL
  - substituir a RPC `find_lead_by_normalized_phone` por uma versão que aceite match por variantes
  - opcionalmente criar função auxiliar SQL para normalização
  - fazer cleanup das conversas duplicadas do número do Nilton, reatribuindo mensagens para a conversa principal antes de remover a órfã

4. Resultado esperado
- O “ok” do Nilton passa a aparecer no modal do lead
- `last_customer_message_at` da conversa principal será preenchido
- a automação do lead sai de `active` e vai para `responded`
- novos casos iguais deixam de acontecer, inclusive quando a Evolution entregar número com variação de formatação

5. Observação importante
- A configuração do webhook parece correta
- A Evolution v2 também parece compatível com o que já está implementado
- O bug atual é de reconciliação de identidade do contato, não de recebimento do evento

Arquivos previstos
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/process-whatsapp-queue/index.ts`
- nova migração em `supabase/migrations/...` para RPC/correção de dados
