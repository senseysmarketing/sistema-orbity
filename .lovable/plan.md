

# Correção: formato do `referenceDate` para API Conexa

## Problema
A API Conexa exige o formato `Y-m-d\TH:i:sP` (ex: `2026-04-14T11:11:00+00:00`), mas o código envia `new Date().toISOString()` que inclui milissegundos e termina com `Z`.

## Alteração

**Arquivo**: `supabase/functions/create-gateway-charge/index.ts`, linha 163

Substituir:
```typescript
referenceDate: new Date().toISOString(),
```

Por:
```typescript
referenceDate: new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00'),
```

Depois, redeploy da edge function `create-gateway-charge`.

