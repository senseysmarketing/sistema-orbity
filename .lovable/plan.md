

# Remover Limitacoes e Simplificar Aba de Assinatura

## Resumo
Remover todo o sistema de limitacoes (usuarios, clientes, leads, tarefas, contratos) e simplificar a aba de assinatura para mostrar apenas: status, proximo pagamento e tempo restante.

## Arquivos a modificar

### 1. `src/hooks/usePaymentMiddleware.tsx`
- Remover `PlanLimits`, `UsageCounts`, e toda logica de `checkLimit`, `enforceLimit`, `getUsagePercentage`, `refreshUsageCounts`
- Manter apenas `paymentStatus`, `loading`, `isSuperAdmin`, `isAgencyAdmin`, `refreshPaymentStatus`
- Remover as queries de contagem (agency_users, clients, contracts, leads, tasks)

### 2. `src/hooks/useLimitEnforcement.tsx`
- Deletar arquivo (nao sera mais usado)

### 3. `src/components/admin/ClientForm.tsx`
- Remover import de `useLimitEnforcement` e a verificacao de limite antes de criar cliente

### 4. `src/components/subscription/SubscriptionDetails.tsx`
- Remover toda secao "Uso do Plano" (Progress bars, contagens)
- Remover import de `usePaymentMiddleware`
- Manter apenas: plano atual, status, trial info, proxima cobranca, botao gerenciar

### 5. `src/pages/Settings.tsx`
- Remover `<PricingCards />` e o titulo "Planos Disponiveis" da aba de assinatura
- Manter apenas `SubscriptionDetails` e `BillingHistory`

### 6. `src/components/payment/PaymentStatusCard.tsx`
- Remover secao "Uso do Plano" com Progress bars
- Simplificar para mostrar apenas status e datas

### 7. `src/components/payment/BlockedAccessScreen.tsx`
- Remover import e uso de `PricingCards`
- Simplificar para mostrar apenas mensagem de contato com equipe comercial (modelo consultivo)

### 8. `src/components/admin/UsersManagement.tsx`
- Remover import de `usePaymentMiddleware` e referencia a `planLimits`

## Resultado
- Zero limitacoes no sistema — tudo ilimitado
- Aba de assinatura mostra apenas: status ativo/inativo, proximo pagamento, tempo de trial
- Sem cards de precos ou planos na area logada

