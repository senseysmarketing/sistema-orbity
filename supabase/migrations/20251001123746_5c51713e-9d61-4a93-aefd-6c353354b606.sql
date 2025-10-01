-- Adicionar constraint única para prevenir duplicações futuras
-- Apenas se ainda não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_agency_name_unique'
  ) THEN
    ALTER TABLE clients 
    ADD CONSTRAINT clients_agency_name_unique 
    UNIQUE (agency_id, name);
  END IF;
END $$;