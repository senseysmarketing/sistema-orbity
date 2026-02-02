
# Correção: Botão Desativar não funciona no ClientCard

## Problema Identificado

O botão "Desativar" no menu dropdown do `ClientCard` não executa nenhuma ação porque as props `onDeactivate` e `onReactivate` **não estão sendo passadas** para o componente.

| Arquivo | Problema |
|---------|----------|
| `src/pages/Admin.tsx` (linha 2130-2147) | Props `onDeactivate` e `onReactivate` não estão sendo passadas ao ClientCard |

### Código Atual (linha 2130-2147):
```tsx
<ClientCard
  key={client.id}
  client={client}
  paymentsThisYear={paymentsThisYear}
  totalPaymentsYear={totalPaymentsYear}
  nextPaymentDate={nextPayment?.due_date || null}
  nextPaymentStatus={nextPayment?.status || null}
  currentMonthPaymentStatus={computedCurrentMonthStatus}
  onView={handleViewClient}
  onEdit={handleEditClient}
  onDelete={handleDeleteClient}                    // ✓ Passado
  onGenerateContract={(client) => navigate('/contracts')}
  onCreateReminder={(client) => navigate('/reminders')}
  onGeneratePayment={(client) => { ... }}
  // ❌ FALTANDO: onDeactivate e onReactivate
/>
```

---

## Solução

Adicionar as duas props faltantes na chamada do `ClientCard`:

```tsx
<ClientCard
  key={client.id}
  client={client}
  paymentsThisYear={paymentsThisYear}
  totalPaymentsYear={totalPaymentsYear}
  nextPaymentDate={nextPayment?.due_date || null}
  nextPaymentStatus={nextPayment?.status || null}
  currentMonthPaymentStatus={computedCurrentMonthStatus}
  onView={handleViewClient}
  onEdit={handleEditClient}
  onDelete={handleDeleteClient}
  onDeactivate={handleDeactivateClient}            // ✅ ADICIONAR
  onReactivate={handleReactivateClient}            // ✅ ADICIONAR
  onGenerateContract={(client) => navigate('/contracts')}
  onCreateReminder={(client) => navigate('/reminders')}
  onGeneratePayment={(client) => { ... }}
/>
```

---

## Resumo da Correção

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Admin.tsx` | Adicionar `onDeactivate={handleDeactivateClient}` e `onReactivate={handleReactivateClient}` nas linhas 2140-2141 |

Essa é uma correção simples de 2 linhas que vai resolver o problema do botão Desativar/Reativar no `ClientCard`.
