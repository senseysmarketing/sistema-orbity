

# Fix: Sistema travado no loading (PaymentMiddleware)

## Problema raiz

O `PaymentMiddlewareWrapper` envolve todo o conteudo do dashboard. Ele mostra um spinner enquanto `loading === true`. O hook `usePaymentMiddleware` chama `supabase.rpc('is_agency_subscription_valid')` que esta travando ou falhando:

- Se o RPC **trava** (timeout do Supabase): `loading` fica `true` para sempre → spinner infinito
- Se o RPC **falha** (erro): o catch define `isValid: false, isBlocked: true` → tela bloqueada

Ambos os cenarios impedem o usuario de acessar o sistema. A politica atual e **fail-closed** (bloquear em caso de erro), que causa falsos positivos.

## Alteracoes

### 1. `src/hooks/usePaymentMiddleware.tsx` — Fail-open + timeout

**Erro deve liberar acesso** (fail-open): No `catch` block (linhas 95-103), mudar para `isValid: true, isBlocked: false` em vez de bloquear. Erros de rede nao devem impedir usuarios legítimos.

**Timeout de seguranca**: Adicionar um `setTimeout` de 10 segundos que força `setLoading(false)` com status valido, caso o RPC nao responda. Cancelar o timeout quando a resposta chegar.

**Guard contra chamadas sem agencia**: Se `currentAgency` for null no momento do check, definir `paymentStatus` como valido por padrao e `loading: false` imediatamente (nao travar esperando).

### 2. `src/components/payment/PaymentMiddlewareWrapper.tsx` — Timeout de fallback

Adicionar um `useEffect` com timeout de 15 segundos: se `loading` continuar true, forcar renderizacao dos children com um `console.warn`. Isso e uma rede de seguranca caso o hook falhe silenciosamente.

### 3. `src/hooks/usePaymentMiddleware.tsx` — Logging melhorado

Adicionar `console.log` nos pontos criticos:
- Inicio do check (`[PaymentMiddleware] Checking...`)
- Resultado do RPC
- Erro capturado
- Timeout atingido

Isso permite diagnosticar problemas futuros nos logs.

## Detalhes tecnicos

```text
checkPaymentStatus():
  if (!user || !currentAgency) → setLoading(false), return (VALIDO por padrao)
  
  timeoutId = setTimeout(15s) → force loading=false, isValid=true
  
  try:
    rpc('is_agency_subscription_valid')
    clearTimeout(timeoutId)
    process result normally
  catch:
    clearTimeout(timeoutId)
    isValid = TRUE  ← FAIL-OPEN (antes era false)
    log error para diagnostico
  finally:
    setLoading(false)
```

PaymentMiddlewareWrapper:
```text
useEffect:
  if loading:
    timeout = 15s → setForceAllow(true), console.warn
  cleanup: clearTimeout

render:
  if loading && !forceAllow → spinner
  if forceAllow → children (bypass)
```

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/usePaymentMiddleware.tsx` | Fail-open no catch, timeout de seguranca, logging |
| `src/components/payment/PaymentMiddlewareWrapper.tsx` | Timeout fallback de 15s |

