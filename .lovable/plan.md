

# Diagnóstico e Solução: Refresh/Perda de Estado ao Trocar de Abas

## Diagnóstico Detalhado

Após análise profunda do código, identifiquei **múltiplas fontes de problemas** que causam o comportamento de refresh ao trocar de abas:

---

## Causas Identificadas

### 1. Supabase `onAuthStateChange` Disparando Re-renders

**Arquivo**: `src/hooks/useAuth.tsx`
**Problema**: O listener `onAuthStateChange` dispara eventos mesmo quando não houve mudança real de sessão. Quando o token é renovado automaticamente (background), isso causa re-render da árvore inteira.

```typescript
// Linha 110-138
supabase.auth.onAuthStateChange(async (event, session) => {
  setSession(session);      // ← Atualiza estado = re-render
  setUser(session?.user);   // ← Atualiza estado = re-render
  // ... busca perfil (mais re-renders)
});
```

**Impacto**: Cada vez que o Supabase renova o token (ex: ao voltar para aba), todos os providers re-renderizam.

---

### 2. `usePageVisibility` Causando Cascata de Efeitos

**Arquivo**: `src/hooks/usePageVisibility.tsx`
**Problema**: Este hook atualiza `isVisible` a cada mudança de visibilidade, e vários outros hooks dependem dele:

- `useSubscription` (linha 287-306)
- `usePaymentMiddleware` (linha 52)

Embora já tenham sido feitas melhorias com `useRef`, ainda há dependências que podem causar re-renders.

---

### 3. `useAgency` Fazendo Fetch em Cascata

**Arquivo**: `src/hooks/useAgency.tsx`
**Problema**: Na linha 62-105, `fetchUserAgencies` é chamado sempre que `user` muda:

```typescript
useEffect(() => {
  if (user) {
    fetchUserAgencies();  // ← Faz fetch do banco
  } else {
    setCurrentAgency(null);
    // ...
  }
}, [user]); // ← Depende de user
```

Quando `onAuthStateChange` atualiza `user` (mesmo com o mesmo valor), este efeito dispara.

---

### 4. `useCache` Perdendo Dados em Re-mount

**Arquivo**: `src/hooks/useCache.tsx`
**Problema**: O cache usa `useState` interno:

```typescript
const [cache, setCache] = useState<Map<string, CacheItem<T>>>(new Map());
```

Se o provider que usa este hook for desmontado, **todo o cache é perdido**.

---

### 5. Hierarquia de Providers Reinicializando

**Arquivo**: `src/App.tsx`
**Problema**: A ordem dos providers cria uma cascata de dependências:

```
AuthProvider
  └── AgencyProvider (depende de user)
      └── SubscriptionProvider (depende de agency)
          └── MasterProvider
              └── PaymentMiddlewareProvider (depende de tudo)
```

Qualquer re-render no `AuthProvider` propaga para toda a árvore.

---

## Solução Proposta

### Parte 1: Estabilizar `onAuthStateChange`

Modificar `useAuth.tsx` para **ignorar eventos de refresh de token** que não alteram o usuário:

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  // NOVO: Ignorar eventos que não mudam o usuário
  if (event === 'TOKEN_REFRESHED') {
    // Token foi renovado, mas usuário é o mesmo - não re-renderizar
    console.log('[Auth] Token refreshed silently');
    return;
  }
  
  // NOVO: Só atualizar estado se realmente mudou
  if (session?.user?.id !== user?.id) {
    setSession(session);
    setUser(session?.user ?? null);
    // ... resto do código
  }
});
```

---

### Parte 2: Usar `useRef` para Evitar Re-renders Desnecessários

Em hooks como `useAgency`, usar refs para comparar valores anteriores:

```typescript
const previousUserIdRef = useRef<string | null>(null);

useEffect(() => {
  // NOVO: Só executar se user ID realmente mudou
  if (user?.id === previousUserIdRef.current) {
    return; // Mesmo usuário, ignorar
  }
  
  previousUserIdRef.current = user?.id || null;
  
  if (user) {
    fetchUserAgencies();
  } else {
    // ... cleanup
  }
}, [user?.id]); // Só depender do ID, não do objeto inteiro
```

---

### Parte 3: Persistir Cache em sessionStorage

Modificar `useCache.tsx` para usar `sessionStorage` como fallback:

```typescript
// Carregar cache inicial do sessionStorage
const [cache, setCache] = useState<Map<string, CacheItem<T>>>(() => {
  try {
    const stored = sessionStorage.getItem(`cache_${namespace}`);
    return stored ? new Map(JSON.parse(stored)) : new Map();
  } catch {
    return new Map();
  }
});

// Salvar cache quando mudar
useEffect(() => {
  try {
    sessionStorage.setItem(
      `cache_${namespace}`, 
      JSON.stringify(Array.from(cache.entries()))
    );
  } catch {}
}, [cache]);
```

---

### Parte 4: Adicionar Debounce em Efeitos de Visibilidade

No `useSubscription`, adicionar debounce para evitar múltiplos checks:

```typescript
const visibilityDebounceRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (!isVisible) {
    wasVisibleRef.current = false;
    lastVisibilityCheckRef.current = Date.now();
    return;
  }
  
  // NOVO: Debounce para evitar checks rápidos demais
  if (visibilityDebounceRef.current) {
    clearTimeout(visibilityDebounceRef.current);
  }
  
  visibilityDebounceRef.current = setTimeout(() => {
    if (!wasVisibleRef.current) {
      const timeAway = Date.now() - lastVisibilityCheckRef.current;
      if (user && timeAway > AWAY_THRESHOLD) {
        setShowRefreshAlert(true);
      }
    }
    wasVisibleRef.current = true;
  }, 500); // 500ms debounce
  
  return () => {
    if (visibilityDebounceRef.current) {
      clearTimeout(visibilityDebounceRef.current);
    }
  };
}, [isVisible]);
```

---

### Parte 5: Preservar Estado de Formulários/Tarefas

Adicionar hook para auto-salvar drafts em localStorage:

```typescript
// Novo arquivo: src/hooks/useFormDraft.tsx
export function useFormDraft<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`draft_${key}`);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  // Auto-save com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`draft_${key}`, JSON.stringify(value));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [key, value]);
  
  const clearDraft = () => {
    localStorage.removeItem(`draft_${key}`);
    setValue(initialValue);
  };
  
  return [value, setValue, clearDraft] as const;
}
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAuth.tsx` | Filtrar eventos `TOKEN_REFRESHED` e comparar user ID antes de atualizar estado |
| `src/hooks/useAgency.tsx` | Usar `useRef` para evitar re-fetch quando user não mudou |
| `src/hooks/useSubscription.tsx` | Adicionar debounce no efeito de visibilidade |
| `src/hooks/usePaymentMiddleware.tsx` | Remover dependência de `isVisible` do cache check |
| `src/hooks/useCache.tsx` | Adicionar persistência em sessionStorage (opcional) |
| `src/hooks/useFormDraft.tsx` | **NOVO** - Hook para auto-salvar drafts de formulários |

---

## Benefícios Esperados

1. **Sem refreshes ao trocar de aba** - Token refresh não causa re-render
2. **Formulários preservados** - Drafts salvos em localStorage
3. **Menos chamadas ao banco** - Fetch só quando necessário
4. **UX fluida** - Usuário não perde trabalho em andamento

---

## Detalhes Técnicos

### Mudança Principal no `useAuth.tsx`

A mudança mais importante é no listener do Supabase. Atualmente:

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
```

Deve virar:

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  // Eventos silenciosos que não devem causar re-render
  const silentEvents = ['TOKEN_REFRESHED', 'USER_UPDATED'];
  
  if (silentEvents.includes(event)) {
    // Atualizar refs internamente sem re-render
    sessionRef.current = session;
    return;
  }
  
  // Só atualizar estado se user realmente mudou
  const newUserId = session?.user?.id || null;
  const currentUserId = user?.id || null;
  
  if (newUserId !== currentUserId) {
    setSession(session);
    setUser(session?.user ?? null);
    // ... resto
  }
});
```

Esta mudança elimina a principal causa de re-renders desnecessários.

