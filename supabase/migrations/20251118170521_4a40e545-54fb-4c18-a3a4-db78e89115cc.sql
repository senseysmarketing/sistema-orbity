-- Criar tabela para auditoria de chamadas à Facebook Marketing API
CREATE TABLE IF NOT EXISTS public.facebook_api_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  ad_account_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  response_data JSONB,
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_facebook_api_audit_agency_id ON public.facebook_api_audit(agency_id);
CREATE INDEX idx_facebook_api_audit_created_at ON public.facebook_api_audit(created_at DESC);
CREATE INDEX idx_facebook_api_audit_status ON public.facebook_api_audit(status);
CREATE INDEX idx_facebook_api_audit_ad_account_id ON public.facebook_api_audit(ad_account_id);

-- Habilitar RLS
ALTER TABLE public.facebook_api_audit ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas auditorias da sua agência
CREATE POLICY "Users can view their agency's audit logs"
  ON public.facebook_api_audit
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users
      WHERE user_id = auth.uid()
    )
  );

-- Política para permitir que edge functions insiram registros
CREATE POLICY "Service role can insert audit logs"
  ON public.facebook_api_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE public.facebook_api_audit IS 'Auditoria de chamadas à Facebook Marketing API para monitoramento e compliance';
COMMENT ON COLUMN public.facebook_api_audit.endpoint IS 'Endpoint da API chamado (ex: /campaigns, /insights)';
COMMENT ON COLUMN public.facebook_api_audit.status IS 'Status da chamada: success ou error';
COMMENT ON COLUMN public.facebook_api_audit.response_time_ms IS 'Tempo de resposta da API em milissegundos';