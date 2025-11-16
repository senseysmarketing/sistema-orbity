-- 1) Remover duplicidades mantendo pagos e os mais antigos
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY agency_id, client_id, date_trunc('month', due_date)
           ORDER BY (status = 'paid') DESC, created_at ASC
         ) AS rn
  FROM public.client_payments
)
DELETE FROM public.client_payments p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 2) Criar função imutável para extrair mês
CREATE OR REPLACE FUNCTION public.extract_month_immutable(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT DATE_TRUNC('month', d)::date;
$$;

-- 3) Criar índice único funcional para garantir um pagamento por cliente/mês
DROP INDEX IF EXISTS public.uniq_client_payment_month_idx;

CREATE UNIQUE INDEX uniq_client_payment_month_idx
  ON public.client_payments (agency_id, client_id, extract_month_immutable(due_date));

-- 4) Índice auxiliar para consultas por agência e vencimento
CREATE INDEX IF NOT EXISTS idx_client_payments_agency_due 
  ON public.client_payments (agency_id, due_date);
