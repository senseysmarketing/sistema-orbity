-- ========================================
-- FASE 1: Sistema ERP Financeiro Completo
-- ========================================

-- 1. Criar enum para tipos de despesa
CREATE TYPE expense_type AS ENUM ('avulsa', 'recorrente', 'parcelada');

-- 2. Criar tabela de categorias de despesas
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agency_id, name)
);

-- RLS para categorias
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage expense categories"
ON expense_categories FOR ALL
USING (is_agency_admin(agency_id));

-- 3. Adicionar novos campos à tabela expenses
ALTER TABLE expenses 
  ADD COLUMN expense_type expense_type DEFAULT 'avulsa',
  ADD COLUMN category TEXT,
  ADD COLUMN installment_total INTEGER,
  ADD COLUMN installment_current INTEGER,
  ADD COLUMN parent_expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  ADD COLUMN recurrence_day INTEGER CHECK (recurrence_day >= 1 AND recurrence_day <= 31),
  ADD COLUMN description TEXT;

-- 4. Migrar dados existentes (is_fixed -> expense_type)
UPDATE expenses 
SET expense_type = CASE 
  WHEN is_fixed = true THEN 'recorrente'::expense_type 
  ELSE 'avulsa'::expense_type 
END;

-- 5. Criar tabela de fechamentos mensais
CREATE TABLE IF NOT EXISTS monthly_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  closure_month DATE NOT NULL,
  payments_generated INTEGER DEFAULT 0,
  recurring_expenses_generated INTEGER DEFAULT 0,
  installments_generated INTEGER DEFAULT 0,
  salaries_generated INTEGER DEFAULT 0,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  execution_details JSONB DEFAULT '{}'::jsonb,
  UNIQUE(agency_id, closure_month)
);

-- RLS para fechamentos mensais
ALTER TABLE monthly_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view monthly closures"
ON monthly_closures FOR SELECT
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "System can insert monthly closures"
ON monthly_closures FOR INSERT
WITH CHECK (true);

-- 6. Criar tabela de snapshots mensais
CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  snapshot_month DATE NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  total_salaries NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  active_clients_count INTEGER DEFAULT 0,
  paid_payments_count INTEGER DEFAULT 0,
  pending_payments_count INTEGER DEFAULT 0,
  overdue_payments_count INTEGER DEFAULT 0,
  paid_expenses_count INTEGER DEFAULT 0,
  pending_expenses_count INTEGER DEFAULT 0,
  paid_salaries_count INTEGER DEFAULT 0,
  pending_salaries_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agency_id, snapshot_month)
);

-- RLS para snapshots mensais
ALTER TABLE monthly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view monthly snapshots"
ON monthly_snapshots FOR SELECT
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "System can insert monthly snapshots"
ON monthly_snapshots FOR INSERT
WITH CHECK (true);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_parent ON expenses(parent_expense_id);
CREATE INDEX IF NOT EXISTS idx_monthly_closures_month ON monthly_closures(agency_id, closure_month);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_month ON monthly_snapshots(agency_id, snapshot_month);

-- 8. Criar categorias padrão para agências existentes
INSERT INTO expense_categories (agency_id, name, icon, color)
SELECT DISTINCT 
  id as agency_id,
  unnest(ARRAY['Marketing', 'Infraestrutura', 'Recursos Humanos', 'Impostos', 'Ferramentas', 'Outros']) as name,
  unnest(ARRAY['📢', '🏢', '👥', '📊', '🔧', '📦']) as icon,
  unnest(ARRAY['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-gray-500']) as color
FROM agencies
WHERE is_active = true
ON CONFLICT (agency_id, name) DO NOTHING;

-- 9. Trigger para atualizar updated_at em expense_categories
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();