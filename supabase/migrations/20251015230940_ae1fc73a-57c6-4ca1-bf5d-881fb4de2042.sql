-- Create contracts table
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  client_id UUID REFERENCES clients(id),
  
  -- Dados do cliente
  client_name TEXT NOT NULL,
  client_cpf_cnpj TEXT,
  client_address TEXT,
  client_city TEXT,
  client_state TEXT,
  client_phone TEXT,
  client_email TEXT,
  
  -- Testemunhas
  witness1_name TEXT,
  witness1_cpf TEXT,
  witness2_name TEXT,
  witness2_cpf TEXT,
  
  -- Serviços contratados
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_value NUMERIC NOT NULL DEFAULT 0,
  
  -- Datas do contrato
  contract_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Dados da agência (snapshot)
  agency_name TEXT NOT NULL,
  agency_cnpj TEXT,
  agency_address TEXT,
  agency_representative TEXT,
  
  -- Termos e cláusulas
  custom_clauses TEXT,
  payment_terms TEXT,
  
  -- Controle
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contract services templates table
CREATE TABLE contract_services_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  description TEXT,
  default_value NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_services_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contracts
CREATE POLICY "Agency members can view contracts"
  ON contracts FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can update contracts"
  ON contracts FOR UPDATE
  USING (is_agency_admin(agency_id));

CREATE POLICY "Agency admins can delete contracts"
  ON contracts FOR DELETE
  USING (is_agency_admin(agency_id));

-- RLS Policies for contract services templates
CREATE POLICY "Agency members can view service templates"
  ON contract_services_templates FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage service templates"
  ON contract_services_templates FOR ALL
  USING (is_agency_admin(agency_id));

-- Trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_services_templates_updated_at
  BEFORE UPDATE ON contract_services_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();