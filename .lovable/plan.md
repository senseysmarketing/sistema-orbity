

# Fix Race Condition: Falso Positivo na Tela de Bloqueio (com refinamentos)

## Resumo

Corrigir race condition onde usuarios ativos caem na tela de bloqueio por falha de rede ou timing de auth. Inclui retry automatico, feedback de erro distinto, e botao de soft refresh.

## Alteracoes

### 1. `src/hooks/useAgency.tsx`

**Trava de autenticacao**: O guard `if (!user) return` ja existe (linha 71), mas o `useEffect` (linha ~200) depende de `user?.id`. Reforcar garantindo que `setLoading(false)` so ocorre apos tentativa real.

**Retry com 3 tentativas**:
- Substituir o bloco try/catch de `fetchUserAgencies` por um loop de 3 tentativas com delay de 1s entre cada
- No `catch` final (apos 3 falhas): setar `fetchError = true`, NAO setar `hasNoAgency = true`
- Resetar `fetchError = false` no inicio de cada chamada

**Novo estado e export**:
- Adicionar `const [fetchError, setFetchError] = useState(false)` 
- Expor `fetchError` no contexto e na interface `AgencyContextType`

### 2. `src/components/layout/AppLayout.tsx`

- Importar `fetchError` do `useAgency()`
- Apos o check de auth (`!user`), adicionar:
  ```
  if (fetchError) return <ConnectionErrorScreen onRetry={refreshAgencies} />;
  ```
- Alterar linha 41 para `if (hasNoAgency)` — remover `userAgencies.length === 0` redundante (confiar apenas em `hasNoAgency` que so e setado apos query bem-sucedida)

### 3. `src/components/agency/NoAgencyScreen.tsx`

- Importar `useAgency` para acessar `refreshAgencies`
- Adicionar estado local `retrying` para feedback visual
- Botao "Tentar Novamente" (variant="outline"):
  - Primeiro tenta `refreshAgencies()` (soft refresh)
  - Se apos o refresh `hasNoAgency` ainda for true, faz `window.location.reload()` como fallback
- Manter botao "Sair" existente

### 4. Novo: `src/components/agency/ConnectionErrorScreen.tsx`

Componente simples para erro de conexao (distinto do NoAgencyScreen):
- Icone de erro de rede (WifiOff ou AlertTriangle)
- Titulo: "Falha de Conexao"
- Texto: "Nao foi possivel verificar seus dados. Isso pode ser um problema temporario de rede."
- Botao "Tentar Novamente" que chama `onRetry` prop
- Botao "Sair" secundario
- Visual diferente do NoAgencyScreen para que suporte identifique o problema

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useAgency.tsx` | Retry 3x, estado `fetchError`, export no contexto |
| `src/components/layout/AppLayout.tsx` | Check `fetchError`, remover `userAgencies.length === 0` |
| `src/components/agency/NoAgencyScreen.tsx` | Botao soft refresh + fallback reload |
| `src/components/agency/ConnectionErrorScreen.tsx` | Novo componente de erro de conexao |

