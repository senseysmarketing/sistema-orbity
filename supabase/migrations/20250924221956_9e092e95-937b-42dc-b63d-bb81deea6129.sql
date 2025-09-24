-- Primeiro, vamos adicionar a nova coluna para dados por plataforma
ALTER TABLE traffic_controls 
ADD COLUMN platform_data JSONB DEFAULT '{}';

-- Migrar os dados existentes para a nova estrutura
UPDATE traffic_controls 
SET platform_data = (
  SELECT jsonb_object_agg(
    platform, 
    jsonb_build_object(
      'daily_budget', daily_budget,
      'last_optimization', last_optimization,
      'situation', situation,
      'results', results
    )
  )
  FROM unnest(COALESCE(platforms, ARRAY[]::text[])) AS platform
)
WHERE platforms IS NOT NULL AND array_length(platforms, 1) > 0;

-- Para registros sem plataformas, criar uma entrada padrão
UPDATE traffic_controls 
SET platform_data = jsonb_build_object(
  'Geral', jsonb_build_object(
    'daily_budget', daily_budget,
    'last_optimization', last_optimization,
    'situation', situation,
    'results', results
  )
)
WHERE platforms IS NULL OR array_length(platforms, 1) = 0;

-- Comentário sobre as colunas antigas (não removemos agora para manter compatibilidade)
COMMENT ON COLUMN traffic_controls.daily_budget IS 'Deprecated: Use platform_data instead';
COMMENT ON COLUMN traffic_controls.last_optimization IS 'Deprecated: Use platform_data instead';
COMMENT ON COLUMN traffic_controls.situation IS 'Deprecated: Use platform_data per platform';
COMMENT ON COLUMN traffic_controls.results IS 'Deprecated: Use platform_data per platform';