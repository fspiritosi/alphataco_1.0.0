-- Migración: Sistema de Gestión de Remitos
-- Fecha: 2025-01-18
-- Descripción: Crear tablas para gestionar múltiples remitos por línea de parte diario

-- =====================================================
-- PASO 1: CREAR NUEVAS TABLAS
-- =====================================================

-- Tabla para almacenar remitos
CREATE TABLE IF NOT EXISTS remitos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_row_id UUID NOT NULL REFERENCES dailyreportrows(id) ON DELETE CASCADE,
  remit_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para almacenar documentos de remitos
CREATE TABLE IF NOT EXISTS remito_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  remit_id UUID NOT NULL REFERENCES remitos(id) ON DELETE CASCADE,
  document_path TEXT NOT NULL,
  document_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PASO 2: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_remitos_daily_report_row_id ON remitos(daily_report_row_id);
CREATE INDEX IF NOT EXISTS idx_remito_documents_remit_id ON remito_documents(remit_id);

-- =====================================================
-- PASO 3: AGREGAR COMENTARIOS
-- =====================================================

COMMENT ON TABLE remitos IS 'Tabla para almacenar múltiples remitos por línea de parte diario';
COMMENT ON COLUMN remitos.daily_report_row_id IS 'Referencia a la línea del parte diario';
COMMENT ON COLUMN remitos.remit_number IS 'Número del remito';

COMMENT ON TABLE remito_documents IS 'Tabla para almacenar múltiples documentos por remito';
COMMENT ON COLUMN remito_documents.remit_id IS 'Referencia al remito';
COMMENT ON COLUMN remito_documents.document_path IS 'URL del documento en Supabase Storage';
COMMENT ON COLUMN remito_documents.document_name IS 'Nombre original del archivo';

-- =====================================================
-- PASO 4: HABILITAR RLS (Row Level Security)
-- =====================================================

ALTER TABLE remitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE remito_documents ENABLE ROW LEVEL SECURITY;

-- Políticas para remitos
CREATE POLICY "Usuarios autenticados pueden ver remitos"
  ON remitos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear remitos"
  ON remitos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar remitos"
  ON remitos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar remitos"
  ON remitos FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para remito_documents
CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON remito_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear documentos"
  ON remito_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
  ON remito_documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
  ON remito_documents FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PASO 5: NOTAS IMPORTANTES
-- =====================================================

/*
NOTAS POST-MIGRACIÓN:

1. Las columnas remit_number y document_path en dailyreportrows 
   se mantienen por compatibilidad pero están DEPRECATED.

2. El nuevo sistema permite:
   - Múltiples remitos por línea de parte diario
   - Múltiples documentos por remito
   - Mejor organización y gestión de documentos

3. Para rollback (si es necesario):
   - DROP TABLE remito_documents;
   - DROP TABLE remitos;
   - Los datos originales permanecen intactos en dailyreportrows

4. Próximos pasos:
   - Ejecutar migración de datos (ver 20250118_migrate_remitos_data.sql)
   - Implementar frontend para gestión de remitos
   - Actualizar lógica de negocio para usar nuevas tablas
   - Eventualmente deprecar columnas en dailyreportrows
*/
