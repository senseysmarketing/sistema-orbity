

# Implementação: Persistir + Exibir número WhatsApp (com Guardrails)

## Verificações prévias (read-only)
1. Confirmar nome real da tabela: `whatsapp_accounts` vs `whatsapp_instances` via `src/integrations/supabase/types.ts`
2. Confirmar estrutura do hook `useWhatsApp` para identificar onde aplicar invalidação/update otimista
3. Confirmar payload da Evolution v2 no webhook handler atual

## Implementação

### Guardrail 1 — Nome correto da tabela
Após leitura dos `types.ts`, usar o nome confirmado em **todos** os `supabase.from(...)` das Edge Functions. Se for `whatsapp_accounts` (como já usado em `whatsapp-connect`), manter. Se divergir, corrigir antes de deploy.

### Backend — `supabase/functions/whatsapp-connect/index.ts`

No `case 'status'`, quando `isConnected === true` e `phone_number` ausente:

```ts
let connectedPhone = account.phone_number;

if (!connectedPhone) {
  try {
    const instRes = await fetch(
      `${effectiveUrl}/instance/fetchInstances?instanceName=${instanceName}`,
      { headers: { 'apikey': effectiveKey } }
    );
    const instData = await instRes.json();
    const arr = Array.isArray(instData) ? instData : [instData];
    const rawJid = arr[0]?.ownerJid 
      || arr[0]?.instance?.owner 
      || arr[0]?.owner 
      || arr[0]?.instance?.wuid;
    
    if (rawJid) {
      // SANITIZAÇÃO ESTRITA (Guardrail 2)
      connectedPhone = String(rawJid).split('@')[0].replace(/\D/g, '');
    }
  } catch (e) {
    console.log('fetchInstances failed:', e.message);
  }
}

await supabase
  .from('<TABELA_CONFIRMADA>')
  .update({
    status: 'connected',
    qr_code: null,
    ...(connectedPhone ? { phone_number: connectedPhone } : {}),
  })
  .eq('id', account.id);
```

**Retornar `phone_number: connectedPhone` no JSON da resposta** — essencial para o Guardrail 3.

### Backend — `supabase/functions/whatsapp-webhook/index.ts`

No handler de `connection.update` quando `state === 'open'`:

```ts
const rawPhonePayload = data?.wuid || data?.owner || data?.sender;
if (rawPhonePayload) {
  // SANITIZAÇÃO ESTRITA (Guardrail 2)
  const cleanPhone = String(rawPhonePayload).split('@')[0].replace(/\D/g, '');
  if (cleanPhone) {
    await supabase
      .from('<TABELA_CONFIRMADA>')
      .update({ status: 'connected', phone_number: cleanPhone, qr_code: null })
      .eq('agency_id', agencyId)
      .eq('purpose', purpose); // se aplicável
  }
}
```

### Frontend — `useWhatsApp.tsx` (Guardrail 3 — Reatividade)

Localizar `checkStatus` e `connect` mutations. Após a resposta, fazer **update otimista** do cache do React Query:

```ts
checkStatus: useMutation({
  mutationFn: async () => { /* ... */ },
  onSuccess: (result) => {
    if (result?.status === 'connected' && result?.phone_number) {
      // Update otimista IMEDIATO no cache
      queryClient.setQueryData(['whatsapp-account', purpose], (old: any) => ({
        ...old,
        status: 'connected',
        phone_number: result.phone_number,
        qr_code: null,
      }));
    }
    // Invalidação como fallback
    queryClient.invalidateQueries({ queryKey: ['whatsapp-account', purpose] });
  },
})
```

### Frontend — `WhatsAppInstanceCard.tsx`

Melhorar fallback durante sincronização:

```tsx
{account?.phone_number 
  ? `Número: ${formatPhoneDisplay(account.phone_number)}`
  : isConnected 
    ? "Sincronizando número..." 
    : "Aguardando número conectado..."}
```

## Comportamento garantido

| Cenário | Antes | Depois |
|---------|-------|--------|
| Conexão nova via QR | Phone NULL eternamente | Phone capturado em ≤5s via polling + setQueryData |
| Reconexão via webhook | Sem update | Persistido com sanitização estrita |
| Tela durante sync | "Aguardando número..." (eterno) | "Sincronizando..." → número real (sem F5) |
| Régua/NPS | "WhatsApp da Agência" / instance_name | Número formatado |
| Erro de tabela | Risco de 500 | Nome confirmado antes do deploy |

## Ficheiros alterados
- `supabase/functions/whatsapp-connect/index.ts` (fetchInstances + retorno phone)
- `supabase/functions/whatsapp-webhook/index.ts` (captura + sanitização em connection.update)
- `src/hooks/useWhatsApp.tsx` (setQueryData otimista no onSuccess)
- `src/components/settings/WhatsAppInstanceCard.tsx` (fallback "Sincronizando...")

Sem migration. Sem alteração de schema.

