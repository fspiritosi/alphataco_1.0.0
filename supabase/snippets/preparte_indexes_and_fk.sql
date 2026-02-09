-- ============================================
-- Optimizaciones de Preparte - Índices y FK
-- ============================================
-- IMPORTANTE: Ejecutar manualmente en el orden indicado
-- ============================================

-- 1. Verificar FK existente entre preparte_change_logs.changed_by y profile.credential_id
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'preparte_change_logs'
  AND kcu.column_name = 'changed_by';

-- 2. Crear FK si NO existe (necesario para JOINs en change logs)
-- IMPORTANTE: Solo ejecutar si la query anterior NO devuelve resultados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'preparte_change_logs'
      AND constraint_name = 'fk_preparte_change_logs_profile'
  ) THEN
    ALTER TABLE preparte_change_logs
    ADD CONSTRAINT fk_preparte_change_logs_profile
    FOREIGN KEY (changed_by)
    REFERENCES profile(credential_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Índices para optimizar queries

-- Para getPreparteChangeLogsByOrderNumber (JOIN con preparte)
CREATE INDEX IF NOT EXISTS idx_preparte_numero_pedido
ON preparte(numero_pedido);

-- Para queries de change logs (filtrado y ordenamiento)
CREATE INDEX IF NOT EXISTS idx_preparte_change_logs_preparte_id
ON preparte_change_logs(preparte_id);

CREATE INDEX IF NOT EXISTS idx_preparte_change_logs_changed_at
ON preparte_change_logs(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_preparte_change_logs_changed_by
ON preparte_change_logs(changed_by);

-- Para batch lookups en createPreparte (queries .in())
CREATE INDEX IF NOT EXISTS idx_service_sectors_service_id
ON service_sectors(service_id);

CREATE INDEX IF NOT EXISTS idx_service_sectors_sector_id
ON service_sectors(sector_id);

-- Índice compuesto para lookups que filtran por ambos campos
CREATE INDEX IF NOT EXISTS idx_service_sectors_service_sector
ON service_sectors(service_id, sector_id);

-- Para batch lookups de áreas
CREATE INDEX IF NOT EXISTS idx_service_areas_service_id
ON service_areas(service_id);

CREATE INDEX IF NOT EXISTS idx_service_areas_area_id
ON service_areas(area_id);

-- Índice compuesto para lookups que filtran por ambos campos
CREATE INDEX IF NOT EXISTS idx_service_areas_service_area
ON service_areas(service_id, area_id);

-- Para queries de listPrepartes y fetchPrepartes
CREATE INDEX IF NOT EXISTS idx_preparte_created_at
ON preparte(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preparte_status
ON preparte(status);

CREATE INDEX IF NOT EXISTS idx_preparte_cliente_id
ON preparte(cliente_id);

CREATE INDEX IF NOT EXISTS idx_preparte_contrato_id
ON preparte(contrato_id);

-- Comentarios finales
COMMENT ON INDEX idx_preparte_numero_pedido IS
  'Optimiza getPreparteChangeLogsByOrderNumber con JOIN a preparte';
COMMENT ON INDEX idx_service_sectors_service_sector IS
  'Optimiza batch lookup en createPreparte para normalización de sectores';
COMMENT ON INDEX idx_service_areas_service_area IS
  'Optimiza batch lookup en createPreparte para normalización de áreas';

-- ============================================
-- Verificación de índices creados
-- ============================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('preparte', 'preparte_change_logs', 'service_sectors', 'service_areas')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
