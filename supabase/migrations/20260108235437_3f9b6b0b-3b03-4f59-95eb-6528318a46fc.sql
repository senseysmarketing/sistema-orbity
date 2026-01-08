-- Part 1: Insert statuses for demo agency

-- Insert lead statuses for demo agency
INSERT INTO lead_statuses (agency_id, name, color, order_position, is_default, is_system, is_active) VALUES
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Novo', '#6366f1', 0, true, false, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Contato', '#3b82f6', 1, false, false, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Qualificado', '#22c55e', 2, false, false, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Proposta', '#f59e0b', 3, false, false, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Negociação', '#8b5cf6', 4, false, false, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Fechado', '#10b981', 5, false, false, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Perdido', '#ef4444', 6, false, false, true)
ON CONFLICT DO NOTHING;

-- Insert task statuses for demo agency (with slug)
INSERT INTO task_statuses (agency_id, name, slug, color, order_position, is_default, is_active) VALUES
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'A Fazer', 'a-fazer', '#6366f1', 0, true, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Em Andamento', 'em-andamento', '#3b82f6', 1, false, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Em Revisão', 'em-revisao', '#f59e0b', 2, false, true),
  ('546ccfe0-6fd5-4e57-840b-c7781383d770', 'Concluída', 'concluida', '#22c55e', 3, false, true)
ON CONFLICT DO NOTHING;