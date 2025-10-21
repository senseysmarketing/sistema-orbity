-- Add unique constraint to stripe_invoice_id in billing_history
ALTER TABLE public.billing_history 
ADD CONSTRAINT billing_history_stripe_invoice_id_key 
UNIQUE (stripe_invoice_id);

-- Create index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_billing_history_stripe_invoice_id 
ON public.billing_history(stripe_invoice_id);