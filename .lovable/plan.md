
# Correção: Orçamento Diário Calculando Campanhas/Conjuntos Inativos

## Problema Identificado

Na tela de Controle de Tráfego → Painel de Clientes, o **orçamento diário** da conta "Aliança Casas de Madeira" está mostrando R$41 quando deveria ser R$26.

### Causa Raiz

O cálculo atual na edge function `facebook-account-summary` tem dois problemas:

1. **Campanhas com CBO (Campaign Budget Optimization)**: Quando a campanha usa orçamento a nível de campanha, o código soma o `daily_budget` da campanha se ela estiver ATIVA, mas não verifica se a campanha inteira deveria contribuir

2. **Ad Sets com orçamento individual**: Quando o orçamento é a nível de conjunto (ABO), o código soma todos os ad sets ATIVOS, mas **não verifica se a campanha pai também está ATIVA**

### Lógica Atual Problemática

```typescript
// Campanhas - soma daily_budget de campanhas ativas
for (const campaign of campaignsData.data) {
  if (campaign.status === 'ACTIVE' || campaign.effective_status === 'ACTIVE') {
    if (campaign.daily_budget) {
      campaignDailyBudget += parseFloat(campaign.daily_budget) / 100
    }
  }
}

// Ad Sets - soma daily_budget de ad sets ativos
for (const adset of adsetsData.data) {
  if (adset.status === 'ACTIVE' || adset.effective_status === 'ACTIVE') {
    if (adset.daily_budget) {
      adsetDailyBudget += parseFloat(adset.daily_budget) / 100
    }
  }
}

// Problema: Se campanha = 0 e adset > 0, usa adset
// MAS não verifica se a campanha pai do adset está ativa!
```

### Problema Adicional

O campo `effective_status` de um ad set pode ser `ACTIVE` mesmo que sua campanha pai esteja `PAUSED`. Isso porque `effective_status` representa o status do próprio objeto, não considera a hierarquia completa.

---

## Solução

Modificar a edge function `facebook-account-summary` para:

1. **Primeiro**, buscar as campanhas e criar um mapa de campanhas ATIVAS
2. **Depois**, ao iterar os ad sets, verificar se a campanha pai está no mapa de campanhas ativas
3. Só somar o orçamento de ad sets cujas campanhas pai estão ATIVAS

### Código Corrigido

```typescript
// 1. Buscar campanhas e criar mapa de IDs ativos
const activeCampaignIds = new Set<string>()
let campaignDailyBudget = 0

if (campaignsData.data) {
  for (const campaign of campaignsData.data) {
    // Só considerar ACTIVE (não PAUSED, DELETED, etc)
    if (campaign.effective_status === 'ACTIVE') {
      activeCampaignIds.add(campaign.id)
      activeCampaignsCount++
      
      // Somar orçamento da campanha (CBO)
      if (campaign.daily_budget) {
        campaignDailyBudget += parseFloat(campaign.daily_budget) / 100
      }
    }
  }
}

// 2. Buscar ad sets com campo campaign_id para verificar hierarquia
const adsetsUrl = `...&fields=id,status,effective_status,daily_budget,updated_time,campaign_id&...`

// 3. Iterar ad sets verificando se campanha pai está ativa
let adsetDailyBudget = 0

if (adsetsData.data) {
  for (const adset of adsetsData.data) {
    // Só somar se o ad set está ATIVO E a campanha pai está ATIVA
    if (adset.effective_status === 'ACTIVE' && activeCampaignIds.has(adset.campaign_id)) {
      if (adset.daily_budget) {
        adsetDailyBudget += parseFloat(adset.daily_budget) / 100
      }
    }
  }
}
```

---

## Mudanças Detalhadas

### Arquivo: `supabase/functions/facebook-account-summary/index.ts`

| Seção | Mudança |
|-------|---------|
| Linha ~114 | Mudar query de campanhas para usar `effective_status === 'ACTIVE'` (mais restritivo) |
| Linha ~122 | Criar `Set<string>` com IDs de campanhas ativas |
| Linha ~143 | Adicionar `campaign_id` na query de ad sets |
| Linha ~153 | Verificar se `campaign_id` está no set de campanhas ativas antes de somar orçamento |

---

## Benefícios

1. **Orçamento preciso** - Só soma campanhas e conjuntos realmente ativos
2. **Hierarquia respeitada** - Ad sets de campanhas pausadas não são contados
3. **Contagem de campanhas correta** - `active_campaigns_count` refletirá apenas campanhas com `effective_status = 'ACTIVE'`

---

## Testes

Após implementação:
- Verificar que "Aliança Casas de Madeira" mostra R$26 de orçamento
- Validar outras contas para garantir que os valores estão corretos
