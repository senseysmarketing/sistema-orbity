

# Atualizar Número de WhatsApp da Orbity

## Contexto
O número atual `(16) 3184-1908` (551631841908) precisa ser substituído por `(16) 99448-1535` (5516994481535) em todos os pontos de contato.

## Alterações

### Arquivos com o número antigo da Orbity (landing page)

1. **`src/components/landing/WhatsAppFloatingButton.tsx`** (linha 4)
   - Trocar `"551631841908"` por `"5516994481535"` e atualizar comentário

2. **`src/components/landing/FAQSection.tsx`** (linha 51)
   - Trocar `"551631841908"` por `"5516994481535"`

### Arquivo com número placeholder genérico

3. **`src/components/payment/BlockedAccessScreen.tsx`** (linhas 74 e 255)
   - Trocar `5511999999999` por `5516994481535` nos dois botões de suporte WhatsApp

Todas as demais ocorrências de `wa.me` são dinâmicas (CRM leads, pipeline) e não precisam de alteração.

