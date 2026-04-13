

# Refatoração Full-Stack: Modelo Híbrido PLG + SLG (com 3 correções)

## Resumo
Implementar o novo modelo de negócio com trial self-service de 7 dias, agendamento de demo, preços públicos (R$ 397/mês ou R$ 297/mês anual), e as 3 correções solicitadas: blindagem de datas no scheduling, seleção de plano pós-trial, e atualização dos slugs de pricing.

---

## 1. Migration: Colunas em `orbity_leads`

```sql
ALTER TABLE orbity_leads
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'application';
```

E atualizar `subscription_plans` com os novos valores:

```sql
UPDATE subscription_plans SET price_monthly = 397.00, price_yearly = 3564.00 WHERE slug = 'basic';
```

Criar um slug `basic_annual` se necessário, ou usar o campo `billing_cycle` existente em `agency_subscriptions` para diferenciar mensal vs anual.

---

## 2. Novo: `DemoSchedulingModal.tsx`

Modal de 2 etapas ativado por "Agendar Apresentação":

- **Etapa 1**: Nome, Nome da Agência, Email, Telefone (máscara BR)
- **Etapa 2**: Calendar + grid de horários (09:00-18:00, intervalos 1h)

**Correção 1 aplicada — Blindagem de data/hora:**
- Calendar: `disabled={(date) => date < today || isWeekend(date)}`
- Horários: Se a data selecionada for hoje, filtra `hora > horaAtual` (ex: se são 14:30, oculta 09:00 a 14:00)
- Se nenhum horário disponível no dia de hoje, mostrar mensagem "Sem horários disponíveis hoje"

Submissão: INSERT em `orbity_leads` com `lead_source: 'scheduling'`, `scheduled_at`, `agency_name`, `phone`. Tela de sucesso.

---

## 3. Novo: `PricingSection.tsx`

Toggle Mensal/Anual:
- Mensal: R$ 397/mês
- Anual: R$ 297/mês (R$ 3.564/ano, economia de R$ 1.200)
- CTA primário: "Começar Teste Grátis (7 Dias)" → `/onboarding?flow=trial`
- CTA secundário: "Agendar Apresentação" → abre DemoSchedulingModal

---

## 4. Landing Page e componentes

**`LandingPage.tsx`**: Adicionar `schedulingOpen` state, `DemoSchedulingModal`, `PricingSection` entre seções existentes. Passar `onOpenScheduling` aos componentes.

**`HeroSection.tsx`**: Botão primário "Começar Teste Grátis" → `/onboarding?flow=trial`. Botão secundário "Agendar Apresentação" → `onOpenScheduling()`. Adicionar prop `onOpenScheduling`.

**`CTASection.tsx`**: Dois botões (trial + agendamento). Adicionar prop `onOpenScheduling`.

**`FAQSection.tsx`**: Atualizar FAQs para refletir preços públicos e trial grátis.

---

## 5. Onboarding (`useOnboarding.tsx` + `Onboarding.tsx`)

Ler `?flow=trial|direct_monthly|direct_annual` via `useSearchParams`.

- **`flow=trial`**: Pular `PlanSelectionStep` (totalSteps = 3). No `submitOnboarding`, planSlug = `'basic'` automaticamente. Redireciona para dashboard após login.
- **`flow=direct_monthly`**: planSlug = `'basic'`, billing_cycle = `'monthly'`. Após criar agência, chama `initiateCheckout`.
- **`flow=direct_annual`**: planSlug = `'basic'`, billing_cycle = `'yearly'`. Após criar agência, chama `initiateCheckout`.

**Correção 3 aplicada**: Os flows `direct_monthly` e `direct_annual` mapeiam para o mesmo plano `basic` mas com `billing_cycle` diferente, e os valores corretos (R$ 397 mensal, R$ 297/mês anual) são puxados da tabela `subscription_plans`.

---

## 6. BlockedAccessScreen — Correção 2 aplicada

**Problema**: Trial expirado → botão "Assinar Agora" chamava checkout direto sem escolha de plano.

**Solução**: Adicionar estado `showPlanSelection` ao `BlockedAccessScreen`. Ao clicar "Assinar Agora":
1. Mostrar um sub-componente inline com dois cards: Mensal (R$ 397) e Anual (R$ 297/mês)
2. Ao escolher, chamar `createCheckout` com o billing_cycle adequado
3. Botão "Voltar" para retornar à tela de bloqueio

---

## 7. Master Panel

**`AgenciesTable.tsx`**: Adicionar badge "Trial" com dias restantes para agências com `subscription_status = 'trial'`. Usar `differenceInDays(trial_end, now())`.

**`OrbityLeadsTable.tsx`**: Adicionar colunas `agency_name`, `scheduled_at`, `phone`. Atualizar STATUS_OPTIONS para incluir "Agendado", "Apresentado", "Fechado", "Perdido". Ordenar por `scheduled_at ASC NULLS LAST`.

---

## Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Colunas em `orbity_leads` + UPDATE `subscription_plans` |
| `src/components/landing/DemoSchedulingModal.tsx` | Novo |
| `src/components/landing/PricingSection.tsx` | Novo |
| `src/pages/LandingPage.tsx` | Modificado |
| `src/components/landing/HeroSection.tsx` | Modificado |
| `src/components/landing/CTASection.tsx` | Modificado |
| `src/components/landing/FAQSection.tsx` | Modificado |
| `src/pages/Onboarding.tsx` | Modificado |
| `src/hooks/useOnboarding.tsx` | Modificado |
| `src/components/payment/BlockedAccessScreen.tsx` | Modificado |
| `src/components/master/AgenciesTable.tsx` | Modificado |
| `src/components/master/OrbityLeadsTable.tsx` | Modificado |

