
-- Tabela de contas WhatsApp (conexão com Evolution API)
CREATE TABLE public.whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  api_url text NOT NULL,
  api_key text NOT NULL,
  status text DEFAULT 'disconnected',
  phone_number text,
  qr_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id)
);

-- Conversas WhatsApp vinculadas a leads
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  session_phone text,
  last_message_at timestamptz,
  last_message_is_from_me boolean,
  last_customer_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mensagens espelhadas
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  phone_number text,
  message_type text DEFAULT 'text',
  content text,
  is_from_me boolean DEFAULT false,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT whatsapp_messages_unique UNIQUE(account_id, message_id)
);

-- Controle de automação
CREATE TABLE public.whatsapp_automation_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id),
  status text DEFAULT 'active',
  current_phase text DEFAULT 'greeting',
  current_step_position integer DEFAULT 1,
  next_execution_at timestamptz,
  last_followup_sent_at timestamptz,
  conversation_state text DEFAULT 'new_lead',
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id, lead_id)
);

-- Templates de mensagens automáticas
CREATE TABLE public.whatsapp_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  phase text NOT NULL,
  step_position integer NOT NULL DEFAULT 1,
  message_template text NOT NULL,
  delay_minutes integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices de performance
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_conversations_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX idx_automation_next_execution ON public.whatsapp_automation_control(next_execution_at) WHERE status = 'active';
CREATE INDEX idx_whatsapp_conversations_lead ON public.whatsapp_conversations(lead_id);

-- RLS
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automation_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies para whatsapp_accounts
CREATE POLICY "Users can view their agency whatsapp account"
  ON public.whatsapp_accounts FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage whatsapp account"
  ON public.whatsapp_accounts FOR ALL
  TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

-- RLS Policies para whatsapp_conversations
CREATE POLICY "Users can view conversations of their agency"
  ON public.whatsapp_conversations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ));

CREATE POLICY "Users can manage conversations of their agency"
  ON public.whatsapp_conversations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ));

-- RLS Policies para whatsapp_messages
CREATE POLICY "Users can view messages of their agency"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ));

CREATE POLICY "Users can manage messages of their agency"
  ON public.whatsapp_messages FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ));

-- RLS Policies para whatsapp_automation_control
CREATE POLICY "Users can view automation of their agency"
  ON public.whatsapp_automation_control FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ));

CREATE POLICY "Users can manage automation of their agency"
  ON public.whatsapp_automation_control FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_accounts wa
    WHERE wa.id = account_id AND public.user_belongs_to_agency(wa.agency_id)
  ));

-- RLS Policies para whatsapp_message_templates
CREATE POLICY "Users can view templates of their agency"
  ON public.whatsapp_message_templates FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage templates"
  ON public.whatsapp_message_templates FOR ALL
  TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_automation_updated_at
  BEFORE UPDATE ON public.whatsapp_automation_control
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
