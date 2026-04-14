

# Correção Webhook Conexa: Segurança via URL + Payload Plano

## Resumo
O Conexa não gera tokens automáticos nem envia headers de segurança. O usuário define uma senha própria, que é passada como query param `secret` na URL do webhook. O payload do Conexa é plano (sem `event`/`data` wrappers), então a detecção de quitação vs cancelamento deve ser baseada nos campos presentes.

## Alterações

### 1. `src/components/settings/ConexaIntegration.tsx`

**Campo de Token** (linhas 256-284):
- Renomear label para "Chave de Segurança do Webhook (Defina uma senha)"
- Alterar placeholder para "Digite uma senha segura (ex: minha_senha_123)"
- Alterar helper text para: "Defina qualquer senha aqui. Você usará essa mesma senha na URL do webhook ao configurar no painel do Conexa."

**URL dinâmica** (linha 48):
- Incluir `&secret=${webhookToken}` na URL para que o usuário copie a URL já com a chave:
```typescript
const webhookUrl = webhookToken
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?gateway=conexa&agency_id=${settings?.agency_id || ''}&secret=${encodeURIComponent(webhookToken)}`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?gateway=conexa&agency_id=${settings?.agency_id || ''}&secret=SUA_CHAVE_AQUI`;
```

**Guia do Accordion** (linhas 294-348):
Reescrever o passo a passo para refletir DUAS conexões:
1. Acesse Configurações > Integrações > Webhooks
2. **Conexão 1 (Pagamentos)**: Clique em "Nova Conexão" > "Personalizado". Cole a URL acima. Em "Eventos de Cobrança", marque **Quitação**. Salve.
3. **Conexão 2 (Cancelamentos)**: Crie outra conexão. Cole a mesma URL. Em "Eventos de Cobrança", marque **Alteração de status**. Salve.
4. Remover menção a "Token de Segurança gerado pelo Conexa" — explicar que a segurança é a senha definida acima, já embutida na URL.

### 2. `supabase/functions/payment-webhook/index.ts`

**Validação de Segurança Conexa** (linhas 70-78):
- Trocar leitura de headers por leitura do query param `secret`:
```typescript
} else {
  const expectedToken = settings.conexa_webhook_token;
  const receivedSecret = url.searchParams.get("secret");
  if (!expectedToken || receivedSecret !== expectedToken) {
    console.warn(`[payment-webhook] Invalid Conexa secret for agency ${agencyId}`);
    return new Response("Unauthorized", { status: 401 });
  }
}
```

**Parsing do payload Conexa** (linhas 95-101):
Substituir a lógica de parsing do Conexa por detecção baseada em campos:
```typescript
} else {
  // Conexa sends flat JSON payloads
  const chargeId = body.chargeId || body.id;
  paymentExternalId = chargeId ? String(chargeId) : "";
  lookupColumn = "conexa_charge_id";

  if (body.paidAmount && body.paymentDate) {
    // Quitação (settlement)
    eventName = "__conexa_settled";
    value = body.paidAmount ?? 0;
    netValue = value; // Conexa doesn't provide net value in webhook
  } else if (body.status === "cancelled" || body.status === "excluded") {
    // Cancelamento
    eventName = "__conexa_cancelled";
    value = body.amount ?? 0;
    netValue = value;
  } else {
    eventName = body.event || body.status || "";
    value = body.amount ?? 0;
    netValue = value;
  }
}
```

**Event Map Conexa** (linhas 16-20):
Atualizar para os novos event names internos:
```typescript
const CONEXA_EVENT_MAP: Record<string, string> = {
  "__conexa_settled": "paid",
  "__conexa_cancelled": "cancelled",
};
```

**Notificação** (linha 179):
Trocar `netValue` por `value` no `formattedAmount` para consistência com `amount_paid = value`.

### 3. Deploy
Deploy individual de `payment-webhook`.

## Resumo de arquivos
- 1 componente frontend (`ConexaIntegration.tsx`)
- 1 edge function (`payment-webhook/index.ts`)
- 0 migrations

