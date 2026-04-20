

# Refatoração `SubscriptionDetails.tsx` — UI por estados + 3 Guardrails

## Mudanças (apenas `src/components/subscription/SubscriptionDetails.tsx`)

### 1. Loading local + handler do Stripe Portal
```ts
const [portalLoading, setPortalLoading] = useState(false);

const handleManageSubscription = async () => {
  setPortalLoading(true);
  try {
    await openCustomerPortal();
  } finally {
    setPortalLoading(false);
  }
};
```

### 2. Hierarquia visual por `subscription_status`

| Estado | Visual | Botão dominante |
|---|---|---|
| sem assinatura | Aviso neutro existente | **Assinar Plano Agora** (primary) → `setShowManageDialog(true)` |
| `trialing` | Badge azul + dias restantes | **Escolher Plano e Assinar** (primary) |
| `active` | Badge verde + "Próxima Cobrança" | **Gerenciar Assinatura** (outline) → `handleManageSubscription` |
| `past_due` | `<Alert>` shadcn (variant default + cor âmbar suave) | **Regularizar no Stripe** → `handleManageSubscription` |
| `canceled` (com `subscription_end` futuro) | Bloco âmbar + "Acesso até DD/MM" | **Reativar Assinatura** → `setShowManageDialog(true)` |

Remove o bloco `needsUpgrade` final redundante.

### 3. Guardrail #1 — Fallback para datas
Wrapper utilitário no componente:
```ts
const safeFormatDate = (d?: string | null) => {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime()) || parsed.getFullYear() < 2000) return null;
  return formatDate(d);
};
```
- Se `safeFormatDate(...)` retornar `null` → renderizar **"Em processamento"** ou **omitir a linha** inteira (não mostrar epoch/`N/A`).
- Aplica-se a `trial_end`, `subscription_end` e linha "Acesso até".

### 4. Guardrail #2 — Sinalizar reativação ao `ManageSubscriptionDialog`
- Adicionar prop opcional `mode?: 'new' | 'reactivate' | 'upgrade'` em `ManageSubscriptionDialog`.
- `SubscriptionDetails` passa:
  - `mode="reactivate"` quando estado é `canceled`.
  - `mode="upgrade"` quando estado é `trialing`.
  - `mode="new"` (default) quando sem plano.
- Dentro do dialog, propagar `mode` para `createCheckout(priceId, { mode })` (ajuste leve no hook `useSubscription` para incluir `mode` no body do invoke `create-checkout`).
- Edge function `create-checkout` já procura cliente Stripe por email — o `mode` apenas serve como hint para metadata e copy do botão ("Reativar" vs "Assinar"), garantindo que o cliente Stripe existente é reutilizado (não duplicado).

### 5. Guardrail #3 — Estética "Quiet Luxury" no `past_due`
Usa o componente `Alert` do shadcn com tonalidade suave (não `destructive`):
```tsx
<Alert className="border-amber-500/30 bg-amber-500/5 text-foreground">
  <AlertCircle className="h-4 w-4 text-amber-600" />
  <AlertTitle>Pagamento Pendente</AlertTitle>
  <AlertDescription>
    Identificamos uma cobrança em aberto. Regularize para manter o acesso contínuo ao Orbity.
  </AlertDescription>
  <Button
    onClick={handleManageSubscription}
    disabled={portalLoading}
    className="mt-3 w-full sm:w-auto"
  >
    {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
    Regularizar no Stripe
  </Button>
</Alert>
```
- Sem `variant="destructive"` — peso de urgência sem parecer erro catastrófico.

### 6. Limpeza
- Remover bloco `needsUpgrade` (`Sparkles` final).
- Remover `Separator` se ficar sem uso.
- Imports novos: `Loader2`, `CreditCard` (lucide), `Alert`, `AlertTitle`, `AlertDescription` (`@/components/ui/alert`).

## Ficheiros alterados
- `src/components/subscription/SubscriptionDetails.tsx` — refator completo da UI por estado + guardrails 1 e 3.
- `src/components/subscription/ManageSubscriptionDialog.tsx` — aceitar prop `mode`, adaptar título/copy do CTA.
- `src/hooks/useSubscription.tsx` — `createCheckout(priceId, opts?)` propaga `mode` para o invoke.
- `supabase/functions/create-checkout/index.ts` — receber `mode` opcional do body e gravar em `metadata.mode` da sessão Stripe (não altera lógica de lookup do customer por email; apenas auditoria).

Sem migrations. Sem novas secrets. Sem mudança no schema.

