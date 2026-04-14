

# Webhook Setup UX + Validação de Segurança Conexa

## Alterações

### 1. `src/components/settings/ConexaIntegration.tsx`

**Novos imports**: `Accordion, AccordionContent, AccordionItem, AccordionTrigger` do shadcn, `Alert, AlertDescription` do shadcn, `Copy, Check, Webhook` do lucide-react, `useState` para `copied` e `webhookToken` states.

**Novos states**:
- `webhookToken` (string) -- inicializado de `settings.conexa_webhook_token`
- `showWebhookToken` (boolean) -- toggle show/hide
- `copied` (boolean) -- feedback visual do botão copiar

**URL dinâmica do webhook**:
```typescript
const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?gateway=conexa&agency_id=${settings?.agency_id || ''}`;
```
`settings.agency_id` ja existe no objeto retornado pelo hook.

**Novos elementos na UI** (após os campos de Baixa Manual, antes do botão Salvar):

1. **Campo "Token do Webhook (Conexa)"** -- input password/text com toggle, mapeado para `webhookToken`
   - Helper text: "Este token e gerado pelo Conexa apos voce salvar a configuracao do Webhook la no painel deles. Ele garante que as notificacoes de pagamento sejam autenticas."

2. **Accordion "Como configurar os Webhooks automaticos"** com passo a passo:
   - Passo 1: Acesse Configuracoes > Integracoes > Webhooks
   - Passo 2: Clique em Nova Conexao > Personalizado
   - Passo 3: Input ReadOnly com a URL + botao Copy com feedback (icone Check por 2s)
   - Passo 4: Marque eventos: Cobranca Paga/Liquidada, Cobranca Cancelada, Venda Cancelada
   - Passo 5: Copie o token gerado e cole no campo acima

**handleSave**: adicionar `conexa_webhook_token: webhookToken || null`

### 2. `supabase/functions/payment-webhook/index.ts` (linha 72)

Atualizar leitura do token Conexa para suportar ambos os headers:
```typescript
const receivedToken =
  req.headers.get("x-conexa-token") ||
  req.headers.get("authorization")?.replace("Bearer ", "");
```

### 3. Deploy
Deploy individual de `payment-webhook`.

## Resumo de arquivos
- 1 componente frontend (`ConexaIntegration.tsx`)
- 1 edge function (`payment-webhook` -- 1 linha)
- 0 migrations

