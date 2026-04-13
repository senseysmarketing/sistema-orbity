

# Correção do Gateway Conexa: Alinhamento com API + Fix de Estado

## Descobertas da Documentação

A documentação do Conexa (conexa.app) confirma:

1. **Token unico**: O Conexa usa um unico "Application Token" gerado em Config > Integrações > API/Token. Nao existe separacao entre "API Key" e "Token" -- e um unico token de acesso.
2. **O Conexa nao e um gateway de pagamento direto** -- e um sistema de gestao que integra com gateways reais (Efi/Gerencianet, Cielo, Banco Inter) para boleto/PIX/cartao. A API do Conexa expoe endpoints para gerenciar clientes, faturas, cobranças dentro do ecossistema Conexa.
3. **Autenticacao**: Header `token` com o valor do Application Token gerado no painel Conexa.

## O que precisa mudar

### 1. `ConexaIntegration.tsx` -- UI (Input unico + fix de estado)

- **Remover** o input "Token" duplicado e os states `token`, `showToken`
- **Renomear** o input restante para "Token de Acesso (Conexa)"
- Mapear para `conexa_api_key` no banco (coluna existente)
- **Fix do bug de estado**: Adicionar `useRef(initialized)` para evitar que o `useEffect` resete o estado local a cada re-render

### 2. `usePaymentGateway.tsx` -- Estabilizar referencia do fallback

**Root cause do bug**: Linha 114 cria um novo objeto `{ ...defaultSettings, id: '', agency_id: ... }` a cada render quando `settings` e `null`. Isso dispara o `useEffect([settings])` no `ConexaIntegration`, resetando os inputs.

**Fix**: Envolver o fallback em `useMemo` para estabilizar a referencia.

### 3. Limpeza do campo `conexa_token` no DB

O campo `conexa_token` na tabela `agency_payment_settings` fica orfao (nunca mais sera usado). Nao precisa de migration para remover agora -- podemos ignorar. O `handleSave` simplesmente para de enviar `conexa_token`.

### 4. Edge Functions -- sem alteracao necessaria agora

O `settle-gateway-payment` ja tem um `TODO` para Conexa settlement. O `payment-webhook` ja suporta eventos Conexa via `CONEXA_EVENT_MAP` e valida via `x-conexa-token` header. Ambos usam `conexa_api_key` do `agency_payment_settings` para autenticacao. Tudo alinhado com a API real.

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/usePaymentGateway.tsx` | `useMemo` no fallback settings (linha 114) |
| `src/components/settings/ConexaIntegration.tsx` | Input unico + `useRef` init guard |

## Detalhes tecnicos

```text
usePaymentGateway.tsx (linha 114):
  ANTES:  settings: settings ? settings : { ...defaultSettings, ... }
  DEPOIS: settings: useMemo(() => settings ?? { ...defaultSettings, ... }, [settings, agencyId])

ConexaIntegration.tsx:
  - Remove: token state, showToken state, segundo input
  - Add: useRef(false) para initialized
  - useEffect: só popula se !initialized.current
  - handleSave: envia apenas conexa_api_key (sem conexa_token)
  - Label: "Token de Acesso (Conexa)"
```

