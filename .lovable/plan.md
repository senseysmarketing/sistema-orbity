

# Auto-close popup Facebook + fix ReferenceError (com lock anti-race)

## 1. `src/components/traffic/FacebookConnectionDialog.tsx`

Substituir o bloco `setInterval` atual (linhas ~152-200) por polling com **lock `isChecking`** + verify_connection ativo:

```ts
let isChecking = false;
pollId = window.setInterval(async () => {
  if (authCompleted || isChecking) return;

  isChecking = true;
  try {
    const { data } = await supabase.functions.invoke('facebook-auth', {
      body: { action: 'verify_connection' }
    });
    if (data?.connected) {
      authCompleted = true;
      window.clearInterval(pollId!);
      window.removeEventListener('message', messageHandler);
      if (popup && !popup.closed) popup.close();
      setProgress(100);
      toast({ title: 'Conectado com sucesso!', description: 'Sua conta do Facebook foi conectada.' });
      onSuccess();
      setIsConnecting(false);
      return;
    }
  } catch (err) {
    console.warn('Polling verify error:', err);
  } finally {
    isChecking = false;
  }

  if (popup?.closed && !authCompleted) {
    window.clearInterval(pollId!);
    window.removeEventListener('message', messageHandler);
    setIsConnecting(false);
    setProgress(0);
  }
}, 3000);
```

- Mantém `messageHandler` como fast-path (postMessage sub-segundo).
- Remove a lógica redundante de `verify_connection` que estava no branch `popup.closed` antigo.

## 2. `supabase/functions/facebook-auth/index.ts`

Localizar o bloco GET do callback OAuth (após `.upsert()` em `facebook_connections`) e renomear `insertErr` → `upsertErr` para alinhar com o nome real do destructure e eliminar o `ReferenceError`.

## Guardrails

| # | Garantia |
|---|---|
| 1 | **Lock `isChecking`** previne overlap de requests em rede lenta. |
| 2 | Auto-close em ≤3s após token salvo (polling ativo). |
| 3 | `postMessage` continua como fast-path (sub-segundo). |
| 4 | Cancelamento manual preservado — sem toast de erro. |
| 5 | `clearInterval` + `removeEventListener` em todos os caminhos de saída. |
| 6 | Edge function não quebra com `ReferenceError`. |

## Ficheiros alterados
- `src/components/traffic/FacebookConnectionDialog.tsx`
- `supabase/functions/facebook-auth/index.ts`

Sem migrations. Sem novas secrets.

