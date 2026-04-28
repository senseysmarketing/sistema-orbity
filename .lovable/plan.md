## Objetivo

Criar fluxo de **Offboarding Inteligente** com 3 guardrails de segurança: (1) caminho único para desativação, (2) alerta de gateway externo, (3) rastreabilidade de cancelamentos.

---

## Diagnóstico já validado

`useFinancialMetrics.tsx` está correto:
- **Fluxo de Caixa Real** (`paidRevenue`, `cashFlowItems`, `netRevenue`) soma `client_payments WHERE status='paid'` no mês — **não filtra por `client.active`**. Histórico imutável.
- **MRR** soma `monthly_value` apenas de `client.active === true`. Projeção correta.

Não requer mudanças funcionais.

---

## 1. Novo componente `ClientOffboardingDialog.tsx`

`src/components/admin/ClientOffboardingDialog.tsx`

**Props:** `{ open, onOpenChange, client, onConfirmed }`

**Comportamento:**
- Ao abrir, fetch: `client_payments WHERE client_id=X AND status='pending' ORDER BY due_date ASC`.
- Cabeçalho fixo: *"Você está prestes a desativar {client.name}. O cliente será removido do MRR projetado. O histórico de pagamentos já realizados permanece intacto."*

**Guardrail 2 — Banner de Gateway Externo:**
Detecta se o cliente possui:
- `client.asaas_customer_id` OU `client.conexa_customer_id` OU `client.stripe_customer_id`
- OU `client.default_billing_type !== 'manual'`
- OU qualquer pagamento pendente com `asaas_charge_id`/`conexa_charge_id`/`stripe_invoice_id`/`billing_type !== 'manual'`

Se sim, injeta `<Alert variant="destructive">` no topo:
> ⚠️ **Atenção: integrações de pagamento ativas.** Cancelar cobranças aqui não cancela assinaturas automáticas no gateway. Lembre-se de suspender a assinatura diretamente no gateway para evitar cobranças indevidas.

**Lista de cobranças pendentes (Quiet Luxury):**
- Cards `border border-border/60 bg-card`, hover `bg-muted/20`
- Badge do mês `Mai/26` (parsing manual `YYYY-MM-DD`, sem timezone shift)
- Valor BRL via `formatCurrency`, vencimento, descrição
- RadioGroup horizontal (2 opções lado a lado, full-width):
  - 🗑️ **Cancelar cobrança** (padrão) — borda destructive
  - 📌 **Manter cobrança** — borda primary
- Atalhos no topo da lista: `[Cancelar todas]` `[Manter todas]`
- Resumo no rodapé: "X a cancelar · Y a manter"

**Caso sem pendências:** card vazio elegante "Nenhuma cobrança pendente. A desativação prosseguirá diretamente."

**Guardrail 3 — Rastreabilidade no confirmar:**
Para cada pagamento marcado como "Cancelar":
```ts
description = (p.description ? p.description + "\n" : "") +
              `[Cancelado via Offboarding em ${stamp}]`
UPDATE client_payments SET status='cancelled', description=<above> WHERE id=?
```
`stamp` = `new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })`.

Por fim: `UPDATE clients SET active=false, cancelled_at=now() WHERE id=?`.

Toast: *"{Nome} desativado. X cobrança(s) cancelada(s), Y mantida(s)."* + `onConfirmed()` (refetch).

---

## 2. Integração nos pontos de entrada

Centralizar a abertura do dialog em **`src/pages/Admin.tsx`**:

- Novo estado: `const [offboardingClient, setOffboardingClient] = useState<Client | null>(null);`
- `handleDeactivateClient(client)` agora apenas faz `setOffboardingClient(client)` (não faz mais o `update` direto).
- Montar o `<ClientOffboardingDialog>` no nível raiz do Admin.tsx, próximo aos outros dialogs:
  ```tsx
  <ClientOffboardingDialog
    open={!!offboardingClient}
    onOpenChange={(o) => !o && setOffboardingClient(null)}
    client={offboardingClient}
    onConfirmed={metrics.refetchAll}
  />
  ```

**`ClientDetailsDialog.tsx`** (linhas 352-382):
- Remover o `<AlertDialog>` interno "Desativar Cliente" e o estado `showDeactivateAlert`.
- Botão "Desativar" passa a chamar diretamente `onDeactivate(client)` (que já abre o novo dialog via Admin.tsx) e fecha o details dialog.

**`ClientManagementSheet.tsx`** (linhas 250-269):
- Remover `<AlertDialog>` interno "Inativar cliente" e estado `confirmClient`.
- `handleToggle` quando `client.active`: precisa abrir o `ClientOffboardingDialog`. Como está dentro do Sheet, adicionar montagem local do dialog no próprio componente:
  ```tsx
  const [offboardClient, setOffboardClient] = useState<Client | null>(null);
  // toggle ativo → setOffboardClient(client)
  <ClientOffboardingDialog
    open={!!offboardClient}
    onOpenChange={(o) => !o && setOffboardClient(null)}
    client={offboardClient}
    onConfirmed={() => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments-all"] });
    }}
  />
  ```
- Remover `toggleMutation` da parte de desativação (mantida apenas para reativação `activate=true`).

**`ClientCard.tsx`** (linha 190): já delega via prop `onDeactivate`, herda automaticamente.

---

## 3. Guardrail 1 — Limpar `PaymentSheet.tsx`

Remover **completamente** a opção "Também inativar este cliente":

- **Remover** o estado `deactivateClient` (linha 50) e `setDeactivateClient`.
- **Remover** o bloco do `<Checkbox>` "deactivate-client" no `cancelDialogOpen` (linhas 708-732).
- **Remover** o bloco no `handleCancelPayment` que faz `update({ active: false })` (linhas 191-197).
- **Remover** import não utilizado `Checkbox` se sobrar (verificar) e `HelpCircle` se não for usado em outro lugar.
- Ajustar a mensagem do toast em `handleCancelPayment` para a forma simples sem branch.

Resultado: a única forma de desativar um cliente passa a ser via `ClientOffboardingDialog`.

---

## Arquivos afetados

**Criados:**
- `src/components/admin/ClientOffboardingDialog.tsx`

**Modificados:**
- `src/pages/Admin.tsx` — estado + handler + montagem do novo dialog
- `src/components/admin/ClientDetailsDialog.tsx` — remover AlertDialog interno de desativação
- `src/components/admin/CommandCenter/ClientManagementSheet.tsx` — substituir AlertDialog por novo dialog
- `src/components/admin/PaymentSheet.tsx` — remover toda lógica de inativar via cancelamento

---

## Resultado

1. **Caminho único:** desativar cliente só é possível via `ClientOffboardingDialog`. Sem cobranças órfãs.
2. **Alerta crítico de gateway:** ninguém esquece de suspender assinatura no Asaas/Stripe.
3. **Auditoria preservada:** toda fatura cancelada carrega o carimbo "Cancelado via Offboarding em DD/MM/AAAA HH:MM".
4. **Histórico financeiro intacto:** receita do mês permanece (já garantido em `useFinancialMetrics`).
5. **MRR limpo:** cliente sai imediatamente da projeção ao desativar.
