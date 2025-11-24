-- Migración de Datos: Remitos Existentes
-- Fecha: 2025-01-18
-- Descripción: Migrar datos existentes desde dailyreportrows a las nuevas tablas

-- =====================================================
-- PASO 1: MIGRAR REMITOS EXISTENTES
-- =====================================================

-- Migrar remitos con número de remito válido
INSERT INTO remitos (daily_report_row_id, remit_number, created_at, updated_at)
SELECT 
  id as daily_report_row_id,
  remit_number,
  created_at,
  updated_at
FROM dailyreportrows 
WHERE remit_number IS NOT NULL 
  AND remit_number != ''
  AND remit_number != 'null'
  -- Evitar duplicados si se ejecuta múltiples veces
  AND id NOT IN (SELECT daily_report_row_id FROM remitos)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PASO 2: MIGRAR DOCUMENTOS ASOCIADOS
-- =====================================================

-- Migrar documentos asociados a los remitos
INSERT INTO remito_documents (remit_id, document_path, document_name, created_at, updated_at)
SELECT 
  r.id as remit_id,
  drr.document_path,
  -- Generar nombre del documento basado en el remito
  CASE 
    WHEN drr.document_path LIKE '%.pdf' THEN 
      CONCAT('remito-', r.remit_number, '.pdf')
    WHEN drr.document_path LIKE '%.jpg' THEN 
      CONCAT('remito-', r.remit_number, '.jpg')
    WHEN drr.document_path LIKE '%.jpeg' THEN 
      CONCAT('remito-', r.remit_number, '.jpeg')
    WHEN drr.document_path LIKE '%.png' THEN 
      CONCAT('remito-', r.remit_number, '.png')
    ELSE 
      CONCAT('remito-', r.remit_number, '.pdf')
  END as document_name,
  drr.created_at,
  drr.updated_at
FROM remitos r
JOIN dailyreportrows drr ON r.daily_report_row_id = drr.id
WHERE drr.document_path IS NOT NULL 
  AND drr.document_path != ''
  AND drr.document_path != 'null'
  -- Evitar duplicados si se ejecuta múltiples veces
  AND NOT EXISTS (
    SELECT 1 FROM remito_documents rd 
    WHERE rd.remit_id = r.id 
    AND rd.document_path = drr.document_path
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- PASO 3: VERIFICACIÓN DE LA MIGRACIÓN
-- =====================================================

DO $$
DECLARE
  remitos_count INTEGER;
  documents_count INTEGER;
  original_remits_count INTEGER;
  original_documents_count INTEGER;
BEGIN
  -- Contar registros migrados
  SELECT COUNT(*) INTO remitos_count FROM remitos;
  SELECT COUNT(*) INTO documents_count FROM remito_documents;
  
  -- Contar registros originales
  SELECT COUNT(*) INTO original_remits_count 
  FROM dailyreportrows 
  WHERE remit_number IS NOT NULL AND remit_number != '' AND remit_number != 'null';
  
  SELECT COUNT(*) INTO original_documents_count 
  FROM dailyreportrows 
  WHERE document_path IS NOT NULL AND document_path != '' AND document_path != 'null'
    AND remit_number IS NOT NULL AND remit_number != '' AND remit_number != 'null';
  
  -- Mostrar resultados
  RAISE NOTICE 'Migración completada:';
  RAISE NOTICE '- Remitos migrados: % de %', remitos_count, original_remits_count;
  RAISE NOTICE '- Documentos migrados: % de %', documents_count, original_documents_count;
  
  -- Verificar que la migración fue exitosa
  IF remitos_count >= original_remits_count AND documents_count >= original_documents_count THEN
    RAISE NOTICE '✅ Migración exitosa';
  ELSE
    RAISE WARNING '⚠️  Revisar migración - números no coinciden';
  END IF;
END $$;

-- =====================================================
-- NOTAS FINALES
-- =====================================================

/*
VERIFICACIÓN POST-MIGRACIÓN:

1. Verificar datos migrados:
   SELECT COUNT(*) FROM remitos;
   SELECT COUNT(*) FROM remito_documents;

2. Verificar integridad:
   SELECT r.*, COUNT(rd.id) as doc_count
   FROM remitos r
   LEFT JOIN remito_documents rd ON r.id = rd.remit_id
   GROUP BY r.id;

3. Comparar con datos originales:
   SELECT 
     drr.id,
     drr.remit_number as old_remit,
     r.remit_number as new_remit,
     drr.document_path as old_doc,
     rd.document_path as new_doc
   FROM dailyreportrows drr
   LEFT JOIN remitos r ON r.daily_report_row_id = drr.id
   LEFT JOIN remito_documents rd ON rd.remit_id = r.id
   WHERE drr.remit_number IS NOT NULL;

4. Si todo está correcto, las columnas remit_number y document_path
   en dailyreportrows pueden marcarse como deprecated en la documentación.
*/
