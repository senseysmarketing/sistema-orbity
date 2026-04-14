

# Travas de Concorrência — usePaymentMiddleware + useSubscription

## Resumo
Adicionar `isCheckingRef` em ambos os hooks para impedir chamadas concorrentes (inclusive em Strict Mode double-mount), e aumentar o TTL do cache do PaymentMiddleware para `Infinity`. Remover revalidação stale desnecessária.

## Alterações

### 1. `src/hooks/usePaymentMiddleware.tsx`
- Mudar TTL do `useCache` de `3 * 60 * 1000` para `Infinity`
- Adicionar `isCheckingRef = useRef(false)` como guard no início de `checkPaymentStatus`
- Se `isCheckingRef.current === true`, retornar imediatamente (sem setar loading)
- Setar `isCheckingRef.current = true` antes do RPC, `false` no `finally`
- Remover o bloco de revalidação stale (linhas 144-148: `if (cached.isStale) { setTimeout(...) }`) — com TTL Infinity nunca fica stale

### 2. `src/hooks/useSubscription.tsx`
- Adicionar `isCheckingRef = useRef(false)` como guard no início de `checkSubscription`
- Se `isCheckingRef.current === true`, retornar imediatamente
- Setar `isCheckingRef.current = true` antes do invoke, `false` no `finally`
- Isso impede que o double-mount do Strict Mode ou o useEffect de agency dispare 2 chamadas simultâneas

## Arquivos alterados
1. `src/hooks/usePaymentMiddleware.tsx`
2. `src/hooks/useSubscription.tsx`

