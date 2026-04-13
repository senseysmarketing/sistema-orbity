

# Atualizar Stripe Price IDs nos planos Orbity

## O que já foi feito

Os produtos e preços foram criados com sucesso no Stripe:

| Plano | Produto | Price ID | Valor |
|-------|---------|----------|-------|
| Orbity Mensal | `prod_UKVcka52hXSHPs` | `price_1TLqbBCLXDdhG50oXYQnIRz7` | R$ 397/mês |
| Orbity Anual | `prod_UKVcSlJKBjvsdf` | `price_1TLqbVCLXDdhG50olvvUBnzv` | R$ 3.564/ano |

## O que falta

Atualizar os registros no banco de dados (os planos herdaram IDs antigos do plano "basic"). Uma migration SQL com os seguintes UPDATEs:

```sql
-- orbity_monthly: setar price mensal correto, limpar yearly
UPDATE public.subscription_plans
SET stripe_price_id_monthly = 'price_1TLqbBCLXDdhG50oXYQnIRz7',
    stripe_price_id_yearly = NULL
WHERE slug = 'orbity_monthly';

-- orbity_annual: setar price anual correto, limpar monthly
UPDATE public.subscription_plans
SET stripe_price_id_monthly = NULL,
    stripe_price_id_yearly = 'price_1TLqbVCLXDdhG50olvvUBnzv'
WHERE slug = 'orbity_annual';

-- orbity_trial: garantir que não tem price IDs (é gratuito)
UPDATE public.subscription_plans
SET stripe_price_id_monthly = NULL,
    stripe_price_id_yearly = NULL
WHERE slug = 'orbity_trial';
```

### Arquivo
- Nova migration SQL em `supabase/migrations/`

