

# Fix: Redeploy `create-gateway-charge` Edge Function

## Diagnostico

1. **`config.toml`** ja possui `verify_jwt = false` — nenhuma alteracao necessaria.
2. **O codigo** ja valida JWT internamente via `getClaims()` — correto.
3. **Os logs** mostram que a versao deployada ainda usa `api.conexa.app` (URL antiga), confirmando que o deploy mais recente do codigo (que usa `api.conexapay.com.br` + fallback local para Conexa) **nao foi aplicado**.
4. O erro de "Invalid API key" reportado pelo usuario pode ter sido um erro anterior ao ultimo deploy, ou a funcao nunca foi redeployada apos as correcoes.

## Acao

Apenas **redeployar** a Edge Function `create-gateway-charge`. Nenhuma alteracao de codigo e necessaria — o arquivo local ja esta correto com:
- `verify_jwt = false` no config
- Validacao JWT interna via `getClaims()`
- Fallback local para Conexa (sem chamada de API externa)

## Arquivo

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/create-gateway-charge/index.ts` | Redeploy apenas (sem mudancas) |

