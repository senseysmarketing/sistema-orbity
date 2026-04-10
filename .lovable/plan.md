

# Enriquecer Card Meta Ads (sem gastos/campanhas)

## Informações a exibir quando conectado

1. **Conta conectada** — nome do negócio (`business_name`)
2. **Facebook User ID** — `facebook_user_id`
3. **Contas de anúncio vinculadas** — contagem de `selected_ad_accounts` ativas
4. **Validade do token** — `token_expires_at` com badge verde/amarelo/vermelho
5. **Última sincronização** — `last_sync` mais recente das contas
6. **Data da conexão** — `created_at`

## Alteração

**Arquivo**: `src/components/settings/FacebookIntegration.tsx`

- Buscar `selected_ad_accounts` ativas (count) e `last_sync` mais recente
- Buscar `token_expires_at` e `facebook_user_id` da conexão
- Layout com linhas de informação (label à esquerda, valor à direita) igual aos outros cards
- Badge de status do token: verde (>30 dias), amarelo (≤30 dias), vermelho (expirado)
- Manter botões de conectar/desconectar existentes

