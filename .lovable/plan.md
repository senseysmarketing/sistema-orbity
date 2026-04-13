

# Fix: Logout Travado + Guard no onAuthStateChange

## Resumo

Corrigir logout que trava quando Supabase nao responde, adicionar guard no `onAuthStateChange` para SIGNED_OUT, e garantir staleTime adequado. O usuario tambem vai expandir o storage do Supabase por conta propria (causa raiz dos 504s).

## Alteracoes

### 1. `src/hooks/useAuth.tsx` — signOut com Promise.race (3s timeout)

Refatorar `signOut` (linhas 297-322):
- Primeiro: executar `supabase.auth.signOut({ scope: 'local' })` dentro de `Promise.race` com timeout de 3s
- O SDK limpa localStorage/cookies sincronamente antes da chamada de rede
- Se timeout: catch assume, limpa estado React residual
- Depois do Promise.race (success ou timeout): limpar states locais e fazer `window.location.replace('/auth')`
- NAO redirecionar antes do signOut (evita loop de reautenticacao)

### 2. `src/hooks/useAuth.tsx` — Guard no onAuthStateChange

No listener `onAuthStateChange` (linhas 117-191), adicionar early return no topo:

```
if (event === 'SIGNED_OUT' || !newSession) {
  currentUserIdRef.current = null;
  sessionRef.current = null;
  setUser(null);
  setSession(null);
  setProfile(null);
  setLoading(false);
  return; // JAMAIS fazer fetch de profile
}
```

Isso substitui a logica atual que tenta processar SIGNED_OUT junto com SIGNED_IN (linha 162).

### 3. `src/hooks/useAgency.tsx` — Guard contra fetch pos-logout

Na funcao `fetchUserAgencies` (linha 74), apos o await do Supabase (linha 92), verificar se `user` ainda existe antes de processar resultado. Se user ficou null durante o fetch, descartar e retornar.

### 4. staleTime — Ja configurado

O `staleTime` global de 5 minutos ja esta definido em `src/App.tsx` (linha 51). Nenhuma alteracao necessaria.

## Detalhes tecnicos

```text
signOut():
  try:
    await Promise.race([
      supabase.auth.signOut({ scope: 'local' }),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
    ])
  catch:
    console.warn('[Auth] signOut timeout or error')
  finally:
    // Limpar estado React
    setUser(null), setSession(null), setProfile(null)
    currentUserIdRef.current = null
    window.location.replace('/auth')
```

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useAuth.tsx` | signOut com Promise.race 3s, guard SIGNED_OUT no onAuthStateChange |
| `src/hooks/useAgency.tsx` | Guard contra fetch quando user e null pos-logout |

