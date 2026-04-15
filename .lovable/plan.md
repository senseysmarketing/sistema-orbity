

# Correção do Layout do Card "Atendimento & Automações"

## Problema
Quando o modo de duas instâncias está ativo, os cards ficam em grid de 2 colunas (`lg:grid-cols-2`), reduzindo a largura de cada card. Os três botões (Verificar Status, Reconfigurar Webhook, Desconectar) usam `sm:flex-row` e transbordam da área do card porque o espaço horizontal é insuficiente.

## Solução

### `src/components/settings/WhatsAppInstanceCard.tsx`

Alterar o container dos botões de ação (linhas 163-202) para usar `flex-wrap` em vez de `sm:flex-row`, garantindo que os botões quebrem linha automaticamente quando o espaço é insuficiente:

- Trocar `flex-col sm:flex-row` por `flex-wrap` no div dos botões (linha 163)
- Usar tamanho compacto nos botões para melhor encaixe em cards estreitos

## Verificação de Conexão

A lógica de conexão, instância e roteamento está correta:
- **`useWhatsApp` hook**: já filtra por `purpose` na query de `whatsapp_accounts`
- **`whatsapp-connect` Edge Function**: gera instâncias com nome único por purpose (`orbity_{id}_general` / `orbity_{id}_billing`)
- **`process-whatsapp-queue`**: usa o account vinculado ao registro de automação (correto)
- **`capture-lead` / `facebook-leads`**: já filtram por `purpose = 'general'` (corrigido na sessão anterior)
- **`process-billing-reminders`**: já faz fallback de `billing` para `general` corretamente

Não há problemas funcionais — apenas o ajuste visual dos botões.

## Arquivo alterado
- `src/components/settings/WhatsAppInstanceCard.tsx` — botões com `flex-wrap` e `gap-2`

