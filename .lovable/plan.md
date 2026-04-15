

# Painel de Auditoria — Histórico de Envios de Cobrança

## 1. Migration — Tabela `billing_message_logs`

Criar tabela com RLS usando `user_belongs_to_agency` (confirmado existente no projeto):

```sql
CREATE TABLE public.billing_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.client_payments(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('reminder', 'overdue')),
  status text NOT NULL CHECK (status IN ('success', 'error')),
  error_details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view billing logs"
  ON public.billing_message_logs FOR SELECT TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

CREATE INDEX idx_billing_message_logs_agency_created
  ON public.billing_message_logs (agency_id, created_at DESC);
```

## 2. Edge Function — `process-billing-reminders/index.ts`

Após cada tentativa de envio (linhas ~292-320), inserir log em `billing_message_logs` com **try/catch isolado** (Guardrail 2):

- **Sucesso**: `{ agency_id: agencyId, client_id: payment.client_id, payment_id: payment.id, message_type: msgType, status: 'success' }`
- **Erro de envio**: `{ ..., status: 'error', error_details: JSON.stringify(sendData) }`
- **Catch do payment**: `{ ..., status: 'error', error_details: String(paymentErr) }`

Cada inserção envolvida em seu próprio try/catch para nunca interromper o loop.

## 3. UI — `BillingAutomationSettings.tsx`

Abaixo do botão "Salvar Régua de Cobrança" (linha 431):

- `<Separator className="my-6" />`
- Título: "Histórico de Envios (Últimos 3 dias)" com ícone `History`
- Importar `useAgency` para obter `agencyId`
- Query Supabase: `billing_message_logs` filtrado por `agency_id`, `created_at >= 3 dias`, limit 50, order `created_at DESC`, join `clients(name)`
- `<ScrollArea className="h-[250px]">` com lista compacta
- Cada item: nome do cliente, data/hora (dd/MM HH:mm), tipo (Lembrete/Atraso)
- `CheckCircle2` verde para success, `AlertCircle` vermelho para error
- Error: `<Tooltip>` com `error_details` (Guardrail 3: já tem `TooltipProvider` importado)
- Empty state amigável

## Arquivos alterados
1. **Migration SQL** — nova tabela + RLS + index
2. **`supabase/functions/process-billing-reminders/index.ts`** — inserções de log resilientes
3. **`src/components/admin/BillingAutomationSettings.tsx`** — seção de histórico
4. **Deploy** da edge function

