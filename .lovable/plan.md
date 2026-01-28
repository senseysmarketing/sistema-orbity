
# Diagnóstico Adicional: Refresh Persistente ao Trocar de Aba

## Problema Identificado

Apesar das correções anteriores (PWA com `registerType: "prompt"`, TanStack Query com `refetchOnWindowFocus: false`, e Service Worker sem `skipWaiting()`), o problema de refresh ainda persiste.

---

## Causas Raiz Encontradas

### 1. useSubscription com dependência de isVisible no useEffect (CRÍTICO)

No arquivo `src/hooks/useSubscription.tsx` (linha 314):

```typescript
useEffect(() => {
  if (user) {
    fetchPlans();
    checkSubscription();
    // ...
  }
}, [user, isVisible]);  // ← isVisible como dependência causa re-execução
```

**Problema**: Toda vez que `isVisible` muda (voltando para a aba), este `useEffect` é re-executado, forçando nova chamada de API e potencialmente causando re-renderizações em cascata de toda a árvore de componentes.

### 2. usePageVisibility disparando atualizações frequentes

O hook `usePageVisibility` está corretamente implementado, mas os hooks que o consomem (`useSubscription`, `usePaymentMiddleware`) estão usando `isVisible` diretamente como dependência de `useEffect`, o que causa re-execuções desnecessárias.

### 3. Realtime Subscriptions reconectando

Quando a aba perde foco, as conexões WebSocket do Supabase Realtime podem ser pausadas. Ao retornar, a reconexão pode disparar eventos que causam re-fetch de dados e potencialmente navegação.

---

## Solução Proposta

### 1. Refatorar useSubscription para não depender de isVisible

Remover `isVisible` da lista de dependências do `useEffect` principal e usar apenas para condicionais internas:

```typescript
// ANTES (problemático)
useEffect(() => {
  if (user) {
    fetchPlans();
    checkSubscription();
  }
}, [user, isVisible]);  // ← Causa re-render ao mudar aba

// DEPOIS (correto)
useEffect(() => {
  if (user) {
    fetchPlans();
    checkSubscription();
  }
}, [user]);  // ← Só executa quando user muda
```

### 2. Separar lógica de visibilidade em efeito dedicado

Criar um efeito separado que apenas observa mudanças de visibilidade, mas não força re-execução do fluxo principal:

```typescript
// Efeito para revalidar dados quando volta à aba (opcional, não força)
useEffect(() => {
  if (isVisible && user && lastCheckTime > 0) {
    const timeSinceLastCheck = Date.now() - lastCheckTime;
    // Só faz refresh se passou muito tempo (10+ minutos)
    if (timeSinceLastCheck > 10 * 60 * 1000) {
      checkSubscription(true);
    }
  }
}, [isVisible]); // Separado do efeito principal
```

### 3. Aplicar mesma correção em usePaymentMiddleware

O hook `usePaymentMiddleware` também usa `isVisible` de forma similar - aplicar a mesma refatoração.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useSubscription.tsx` | Remover `isVisible` das deps do useEffect principal |
| `src/hooks/usePaymentMiddleware.tsx` | Remover lógica de refresh baseada em visibilidade |
| `src/hooks/usePageVisibility.tsx` | Opcional: adicionar debounce para evitar disparos rápidos |

---

## Correções Específicas

### useSubscription.tsx

```typescript
// Linha 293-314: Separar os concerns

// 1. Efeito de inicialização (quando user muda)
useEffect(() => {
  if (user) {
    fetchPlans();
    checkSubscription();
    
    // Intervalo de verificação periódica
    const interval = setInterval(() => {
      checkSubscription();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  } else {
    setCurrentSubscription(null);
    setLoading(false);
  }
}, [user]); // ← SEM isVisible

// 2. Efeito de revalidação ao voltar (separado, menos agressivo)
// Já existe nas linhas 281-291, mas precisa ser ajustado para não causar problemas
```

### usePaymentMiddleware.tsx

```typescript
// Linha 237-263: Remover referência a isVisible no useEffect principal

useEffect(() => {
  if (user && currentAgency) {
    const cacheKey = `payment_${currentAgency.id}`;
    const cached = cache.get(cacheKey);
    
    if (!cached.exists) {
      checkPaymentStatus();
      refreshUsageCounts();
    } else {
      setPaymentStatus(cached.data || { isValid: false, isBlocked: true });
      setLoading(false);
      
      // Background refresh se dados estão stale
      if (cached.isStale) {
        checkPaymentStatus(true);
        refreshUsageCounts();
      }
    }
  } else {
    setLoading(false);
  }
}, [user, currentAgency]); // ← SEM dependências de visibilidade
```

---

## Fluxo Esperado Após Correções

```text
┌─────────────────────────────────────────────────────────────┐
│ Usuário abre a aplicação                                     │
├─────────────────────────────────────────────────────────────┤
│ useSubscription e usePaymentMiddleware carregam dados       │
│ TanStack Query cacheia por 5 minutos                        │
├─────────────────────────────────────────────────────────────┤
│ Usuário muda de aba (perde foco)                            │
│   └── isVisible = false (mas nenhum efeito é executado)     │
├─────────────────────────────────────────────────────────────┤
│ Usuário volta à aba (ganha foco)                            │
│   └── isVisible = true (mas NÃO força re-fetch)             │
│   └── Dados permanecem no cache, formulário intacto         │
├─────────────────────────────────────────────────────────────┤
│ Apenas se esteve fora por 10+ minutos:                      │
│   └── Mostra toast "Dados podem estar desatualizados"       │
│   └── Usuário pode clicar para atualizar manualmente        │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Sem refresh automático** - Voltar à aba não dispara re-renders
2. **Formulários preservados** - Estado local permanece intacto
3. **Menor uso de rede** - Menos chamadas de API desnecessárias
4. **UX mais suave** - Sem piscar de tela ou perda de foco
5. **Cache respeitado** - TanStack Query e caches manuais funcionam corretamente
