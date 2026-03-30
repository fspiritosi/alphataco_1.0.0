# Document Types is_active Flow — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el flujo completo de activar/desactivar/eliminar tipos de documentos con impacto real en alertas, status y triggers.

**Architecture:** 3 capas — (1) Fix de triggers SQL via migracion Prisma con SQL custom, (2) Server actions Prisma para analyze/deactivate/reactivate/hardDelete/recalculate, (3) Componente frontend `_ToggleDocTypeDialog` que reemplaza el AlertDialog estatico actual.

**Tech Stack:** Prisma migrations (SQL custom), Prisma Client, React Query, shadcn/ui (Dialog, RadioGroup, Alert), Zod.

**Spec:** `docs/superpowers/specs/2026-03-13-document-types-is-active-flow.md`

---

## Chunk 1: Migracion SQL — Fix de triggers y funciones

### Task 1: Crear migracion Prisma con SQL custom

**Files:**

- Create: `prisma/migrations/YYYYMMDD_fix_document_types_triggers/migration.sql`

- [ ] **Step 1: Crear migracion vacia**

```bash
npx prisma migrate dev --create-only --name fix_document_types_triggers
```

- [ ] **Step 2: Escribir el SQL completo en el archivo de migracion**

El archivo `migration.sql` debe contener las siguientes secciones en orden:

#### 2a) DROP del trigger duplicado `add_new_document_trigger`

```sql
-- ============================================================================
-- 1. DROP trigger duplicado (activo por error, duplica document_types_after_insert)
-- ============================================================================
DROP TRIGGER IF EXISTS add_new_document_trigger ON document_types;
```

#### 2b) Fix `controlar_alertas_single_document_all_employees`

Cambios vs actual:

- Reemplazar `auth.jwt()` por `doc.company_id`
- Agregar `AND is_active = true` al SELECT de document_types
- Eliminar TODAS las sentencias DELETE (ELSE con DELETE)
- Eliminar UPDATE de status inline (lo hara application layer)
- Eliminar guard `myapp.inside_single_document_batch`
- user_id = NULL

```sql
-- ============================================================================
-- 2. Fix controlar_alertas_single_document_all_employees
--    - Usa doc.company_id en vez de auth.jwt()
--    - Filtra is_active = true
--    - Solo INSERT, nunca DELETE ni UPDATE status
-- ============================================================================
CREATE OR REPLACE FUNCTION controlar_alertas_single_document_all_employees(document_type_id_param uuid)
RETURNS void AS $$
DECLARE
  doc RECORD;
  employee_record RECORD;
  employee_matches boolean;
  where_sql text;
  conditions_jsonb jsonb;
BEGIN
  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param
    AND mandatory = true
    AND applies = 'Persona'
    AND is_active = true;

  IF NOT FOUND THEN RETURN; END IF;

  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_employee_where_alias(conditions_jsonb, 'e');

    -- Guard: si where_sql es invalido, no hacer nada
    IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN RETURN; END IF;

    FOR employee_record IN
      SELECT id FROM employees WHERE company_id = doc.company_id
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_record.id, doc.company_id, where_sql
      ) INTO employee_matches;

      IF employee_matches THEN
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees
          WHERE id_document_types = doc.id AND applies = employee_record.id
        );
      END IF;
      -- SIN ELSE/DELETE — solo crea, nunca borra
    END LOOP;
  ELSE
    -- Tipo no especial: crear para todos los empleados de la empresa
    FOR employee_record IN
      SELECT id FROM employees WHERE company_id = doc.company_id
    LOOP
      INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_employees
        WHERE id_document_types = doc.id AND applies = employee_record.id
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2c) Fix `controlar_alertas_single_document_all_vehicles`

Mismos cambios que employees pero para vehicles/documents_equipment:

```sql
-- ============================================================================
-- 3. Fix controlar_alertas_single_document_all_vehicles
--    - Usa doc.company_id en vez de auth.jwt()
--    - Filtra is_active = true
--    - Solo INSERT, nunca DELETE ni UPDATE status
-- ============================================================================
CREATE OR REPLACE FUNCTION controlar_alertas_single_document_all_vehicles(document_type_id_param uuid)
RETURNS void AS $$
DECLARE
  doc RECORD;
  vehicle_record RECORD;
  vehicle_matches boolean;
  where_sql text;
  conditions_jsonb jsonb;
BEGIN
  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param
    AND mandatory = true
    AND applies = 'Equipos'
    AND is_active = true;

  IF NOT FOUND THEN RETURN; END IF;

  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');

    IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN RETURN; END IF;

    FOR vehicle_record IN
      SELECT id FROM vehicles WHERE company_id = doc.company_id
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_record.id, doc.company_id, where_sql
      ) INTO vehicle_matches;

      IF vehicle_matches THEN
        INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_equipment
          WHERE id_document_types = doc.id AND applies = vehicle_record.id
        );
      END IF;
    END LOOP;
  ELSE
    FOR vehicle_record IN
      SELECT id FROM vehicles WHERE company_id = doc.company_id
    LOOP
      INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_equipment
        WHERE id_document_types = doc.id AND applies = vehicle_record.id
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2d) Fix `controlar_alertas_documentos_single_employee`

Cambios:

- Agregar `AND is_active = true` al FOR loop de document_types
- Agregar guard en where_sql invalido → CONTINUE (skip ese tipo)
- Agregar `AND dt.is_active = true` en el calculo de status

```sql
-- ============================================================================
-- 4. Fix controlar_alertas_documentos_single_employee
--    - Filtra is_active = true en el FOR loop
--    - Guard de where_sql invalido (CONTINUE)
--    - Status excluye tipos inactivos
-- ============================================================================
CREATE OR REPLACE FUNCTION controlar_alertas_documentos_single_employee(employee_id_param uuid, company_id_param uuid)
RETURNS void AS $$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  employee_matches boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Persona' AND is_active = true
  LOOP
    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_employee_where_alias(conditions_jsonb, 'e');

      -- Guard: condiciones invalidas → skip este tipo
      IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_id_param, company_id_param, where_sql
      ) INTO employee_matches;

      IF employee_matches THEN
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees
          WHERE id_document_types = doc.id AND applies = employee_id_param
        );
      ELSE
        DELETE FROM documents_employees
        WHERE id_document_types = doc.id
          AND applies = employee_id_param
          AND (document_path IS NULL OR document_path = '');
      END IF;
    ELSE
      INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_employees
        WHERE id_document_types = doc.id AND applies = employee_id_param
      );
    END IF;
  END LOOP;

  UPDATE employees e
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM documents_employees de
      WHERE de.applies = employee_id_param AND de.state = 'vencido'
    ) THEN 'Completo con doc vencida'::status_type
    WHEN EXISTS (
      SELECT 1 FROM document_types dt
      WHERE dt.mandatory = true AND dt.applies = 'Persona' AND dt.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM documents_employees de2
          WHERE de2.id_document_types = dt.id AND de2.applies = employee_id_param
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE e.id = employee_id_param;
END;
$$ LANGUAGE plpgsql;
```

#### 2e) Fix `controlar_alertas_documentos_single_vehicle`

Mismos cambios que single_employee pero para vehicles:

```sql
-- ============================================================================
-- 5. Fix controlar_alertas_documentos_single_vehicle
--    - Filtra is_active = true en el FOR loop
--    - Guard de where_sql invalido (CONTINUE)
--    - Status excluye tipos inactivos
-- ============================================================================
CREATE OR REPLACE FUNCTION controlar_alertas_documentos_single_vehicle(vehicle_id_param uuid, company_id_param uuid)
RETURNS void AS $$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  vehicle_matches boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Equipos' AND is_active = true
  LOOP
    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');

      IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_id_param, company_id_param, where_sql
      ) INTO vehicle_matches;

      IF vehicle_matches THEN
        INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, vehicle_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_equipment
          WHERE id_document_types = doc.id AND applies = vehicle_id_param
        );
      ELSE
        DELETE FROM documents_equipment
        WHERE id_document_types = doc.id
          AND applies = vehicle_id_param
          AND (document_path IS NULL OR document_path = '');
      END IF;
    ELSE
      INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, vehicle_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_equipment
        WHERE id_document_types = doc.id AND applies = vehicle_id_param
      );
    END IF;
  END LOOP;

  UPDATE vehicles v
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM documents_equipment de
      WHERE de.applies = vehicle_id_param AND de.state = 'vencido'
    ) THEN 'Completo con doc vencida'::status_type
    WHEN EXISTS (
      SELECT 1 FROM document_types dt
      WHERE dt.mandatory = true AND dt.applies = 'Equipos' AND dt.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM documents_equipment de2
          WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_id_param
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE v.id = vehicle_id_param;
END;
$$ LANGUAGE plpgsql;
```

#### 2f) Fix `trg_document_types_update`

Agregar guards para is_active transitions:

```sql
-- ============================================================================
-- 6. Fix trg_document_types_update
--    - Si se desactiva (is_active → false): no reconciliar (app maneja)
--    - Si se reactiva (is_active false → true): no reconciliar (app maneja)
--    - Reconciliacion normal solo si tipo esta activo y cambio mandatory/conditions
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_document_types_update()
RETURNS trigger AS $$
BEGIN
  -- Si se esta desactivando, no reconciliar (la app maneja la limpieza)
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;
  -- Si se esta reactivando, no reconciliar (la app maneja la creacion de alertas)
  IF OLD.is_active = false AND NEW.is_active = true THEN
    RETURN NEW;
  END IF;
  -- Reconciliacion normal: solo si tipo esta activo y cambio mandatory/conditions
  IF NEW.mandatory OR (OLD.mandatory AND NEW.conditions IS DISTINCT FROM OLD.conditions) THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 2g) Fix `build_vehicle_where_alias` — agregar guardas de seguridad

La version actual NO tiene las guardas que si tiene `build_employee_where_alias`. Agregar:

- Filtro de IDs vacios/null
- Check de `ids_txt IS NULL` → CONTINUE
- Check de parts vacios al final → RETURN 'TRUE'

```sql
-- ============================================================================
-- 7. Fix build_vehicle_where_alias
--    - Agregar filtro de IDs vacios (WHERE id IS NOT NULL AND id <> '')
--    - Agregar check ids_txt IS NULL → CONTINUE
--    - Agregar check parts vacios → RETURN 'TRUE'
-- ============================================================================
CREATE OR REPLACE FUNCTION build_vehicle_where_alias(_conditions jsonb, table_alias text)
RETURNS text AS $$
DECLARE
  c       jsonb;
  parts   text[] := '{}';
  ids_txt text;
BEGIN
  IF _conditions IS NULL OR jsonb_typeof(_conditions) <> 'array' THEN
     RETURN 'TRUE';
  END IF;

  FOR c IN SELECT * FROM jsonb_array_elements(_conditions) LOOP
    -- Filtrar IDs vacios/null (misma guarda que build_employee_where_alias)
    SELECT '(' || string_agg(quote_literal(id), ',') || ')'
      INTO ids_txt
      FROM jsonb_array_elements_text(c -> 'ids') id
      WHERE id IS NOT NULL AND id <> '';

    -- Si no hay IDs validos, skip esta condicion
    IF ids_txt IS NULL OR ids_txt = '()' THEN
      CONTINUE;
    END IF;

    CASE c ->> 'relation_type'
      WHEN 'many_to_many' THEN
        parts := parts || format(
          'EXISTS (SELECT 1 FROM %I rel
                    WHERE rel.%I = %I.%I
                      AND rel.%I IN %s)',
          c ->> 'relation_table',
          c ->> 'column_on_relation',
          table_alias,
          COALESCE(c ->> 'column_on_vehicles', 'id'),
          c ->> 'filter_column',
          ids_txt
        );
      WHEN 'one_to_many' THEN
        parts := parts || format(
          '%I.%I IN %s',
          table_alias,
          c ->> 'filter_column',
          ids_txt
        );
      ELSE
        parts := parts || format(
          '%I.%I IN %s',
          table_alias,
          c ->> 'filter_column',
          ids_txt
        );
    END CASE;
  END LOOP;

  -- Si no se generaron condiciones validas, retornar TRUE
  IF array_length(parts, 1) IS NULL OR array_length(parts, 1) = 0 THEN
    RETURN 'TRUE';
  END IF;

  RETURN array_to_string(parts, ' AND ');
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 3: Revisar el SQL generado**

Abrir el archivo de migracion y verificar que solo contenga los 7 bloques esperados. No debe haber DDL inesperado.

- [ ] **Step 4: Aplicar la migracion**

```bash
npx prisma migrate dev
```

- [ ] **Step 5: Verificar en BD LOCAL que las funciones se actualizaron**

Usar MCP supabase-LOCAL para verificar:

```sql
-- Verificar que add_new_document_trigger ya no existe
SELECT tgname FROM pg_trigger WHERE tgrelid = 'document_types'::regclass AND tgname = 'add_new_document_trigger';
-- Debe retornar 0 filas

-- Verificar que controlar_alertas_single_document_all_employees filtra is_active
SELECT prosrc FROM pg_proc WHERE proname = 'controlar_alertas_single_document_all_employees';
-- Debe contener 'AND is_active = true' y NO contener 'auth.jwt()'

-- Verificar que build_vehicle_where_alias tiene guardas
SELECT prosrc FROM pg_proc WHERE proname = 'build_vehicle_where_alias';
-- Debe contener 'WHERE id IS NOT NULL AND id <> '''
```

- [ ] **Step 6: Regenerar tipos**

```bash
npm run genlocaltypes
```

- [ ] **Step 7: Commit**

```
feat(documentacion): fix document_types triggers for is_active flow

- Drop duplicate add_new_document_trigger
- Fix controlar_alertas_single_document_all_* to use doc.company_id instead of auth.jwt()
- Add is_active = true filter to all trigger functions
- Remove DELETE/UPDATE from mass reconciliation functions (app layer handles)
- Add safety guards to build_vehicle_where_alias (parity with employee version)
- Fix trg_document_types_update to skip reconciliation on activate/deactivate
- Add is_active filter to status recalculation in single_employee/vehicle triggers
```

---

## Chunk 2: Server Actions — analyze, deactivate, hardDelete, reactivate, recalculateStatus

### Task 2: Implementar `recalculateResourceStatus` (helper interno)

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`

- [ ] **Step 1: Agregar funcion helper `recalculateResourceStatus`**

Agregar DESPUES de las funciones existentes (antes de los exports de tipos). NO exportar — es helper interno.

```typescript
// ============================================================================
// HELPER: Recalcular status de recursos afectados
// Solo para Persona y Equipos — Empresa no tiene campo status
// ============================================================================

async function recalculateResourceStatus(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  resourceIds: string[],
  resourceType: 'Persona' | 'Equipos'
) {
  if (resourceIds.length === 0) return;

  if (resourceType === 'Persona') {
    await tx.$executeRawUnsafe(
      `
      UPDATE employees SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_employees de
          WHERE de.applies = employees.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Persona' AND dt.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM documents_employees de2
              WHERE de2.id_document_types = dt.id AND de2.applies = employees.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE employees.id = ANY($1::uuid[])
    `,
      resourceIds
    );
  } else {
    await tx.$executeRawUnsafe(
      `
      UPDATE vehicles SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_equipment de
          WHERE de.applies = vehicles.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Equipos' AND dt.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM documents_equipment de2
              WHERE de2.id_document_types = dt.id AND de2.applies = vehicles.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE vehicles.id = ANY($1::uuid[])
    `,
      resourceIds
    );
  }
}
```

- [ ] **Step 2: Verificar types**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```
feat(documentacion): add recalculateResourceStatus helper
```

### Task 3: Implementar `analyzeDocumentTypeImpact`

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`

- [ ] **Step 1: Agregar funcion `analyzeDocumentTypeImpact`**

```typescript
// ============================================================================
// ANALYZE: Analizar impacto de activar/desactivar un tipo de documento
// ============================================================================

export async function analyzeDocumentTypeImpact(docTypeId: string) {
  const companyId = await getServerCompanyId();

  logger.debug('Analizando impacto de tipo de documento', { data: { docTypeId } });

  try {
    const docType = await prisma.document_types.findFirst({
      where: { id: docTypeId, company_id: companyId },
      select: {
        id: true,
        name: true,
        applies: true,
        is_active: true,
        mandatory: true,
        special: true,
        company_id: true,
      },
    });

    if (!docType) throw new Error('Tipo de documento no encontrado');

    let uploadedCount = 0;
    let emptyAlertCount = 0;
    let missingAlertCount = 0;

    if (docType.applies === document_applies.Persona) {
      const [uploaded, empty, totalActive] = await Promise.all([
        prisma.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        }),
        prisma.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: null },
        }),
        prisma.employees.count({
          where: { company_id: companyId },
        }),
      ]);
      uploadedCount = uploaded;
      emptyAlertCount = empty;
      // Missing = recursos activos sin alerta para este tipo
      const withAlert = await prisma.documents_employees.count({
        where: { id_document_types: docTypeId },
      });
      missingAlertCount = Math.max(0, totalActive - withAlert);
    } else if (docType.applies === document_applies.Equipos) {
      const [uploaded, empty, totalActive] = await Promise.all([
        prisma.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        }),
        prisma.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: null },
        }),
        prisma.vehicles.count({
          where: { company_id: companyId },
        }),
      ]);
      uploadedCount = uploaded;
      emptyAlertCount = empty;
      const withAlert = await prisma.documents_equipment.count({
        where: { id_document_types: docTypeId },
      });
      missingAlertCount = Math.max(0, totalActive - withAlert);
    } else {
      // Empresa: max 1 registro
      const doc = await prisma.documents_company.findFirst({
        where: { id_document_types: docTypeId },
        select: { document_path: true },
      });
      if (doc) {
        if (doc.document_path) {
          uploadedCount = 1;
        } else {
          emptyAlertCount = 1;
        }
      } else {
        missingAlertCount = 1;
      }
    }

    return {
      docType: {
        id: docType.id,
        name: docType.name,
        applies: docType.applies,
        is_active: docType.is_active,
        mandatory: docType.mandatory,
        special: docType.special,
      },
      uploadedCount,
      emptyAlertCount,
      totalResources: uploadedCount + emptyAlertCount,
      missingAlertCount,
      canHardDelete: uploadedCount === 0,
    };
  } catch (error) {
    logger.error('Error al analizar impacto de tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}

export type DocumentTypeImpact = Awaited<ReturnType<typeof analyzeDocumentTypeImpact>>;
```

- [ ] **Step 2: Verificar types**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```
feat(documentacion): add analyzeDocumentTypeImpact server action
```

### Task 4: Implementar `deactivateDocumentType`

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`

- [ ] **Step 1: Agregar funcion `deactivateDocumentType`**

```typescript
// ============================================================================
// DEACTIVATE: Desactivar tipo de documento + opcionalmente borrar alertas vacias
// ============================================================================

export async function deactivateDocumentType(docTypeId: string, options: { deleteEmptyAlerts: boolean }) {
  const companyId = await getServerCompanyId();

  logger.info('Desactivando tipo de documento', { data: { docTypeId, options } });

  try {
    return await prisma.$transaction(async (tx) => {
      const docType = await tx.document_types.findFirst({
        where: { id: docTypeId, company_id: companyId, is_active: true },
        select: { id: true, applies: true, mandatory: true },
      });

      if (!docType) throw new Error('Tipo de documento no encontrado o ya esta inactivo');

      // 1. Desactivar
      await tx.document_types.update({
        where: { id: docTypeId },
        data: { is_active: false },
      });

      // 2. Si deleteEmptyAlerts, borrar alertas sin documento subido
      let affectedResourceIds: string[] = [];

      if (options.deleteEmptyAlerts && docType.mandatory) {
        if (docType.applies === document_applies.Persona) {
          // Obtener IDs afectados antes de borrar
          const affected = await tx.documents_employees.findMany({
            where: { id_document_types: docTypeId, document_path: null },
            select: { applies: true },
          });
          affectedResourceIds = affected.map((a) => a.applies).filter(Boolean) as string[];

          await tx.documents_employees.deleteMany({
            where: { id_document_types: docTypeId, document_path: null },
          });
        } else if (docType.applies === document_applies.Equipos) {
          const affected = await tx.documents_equipment.findMany({
            where: { id_document_types: docTypeId, document_path: null },
            select: { applies: true },
          });
          affectedResourceIds = affected.map((a) => a.applies).filter(Boolean) as string[];

          await tx.documents_equipment.deleteMany({
            where: { id_document_types: docTypeId, document_path: null },
          });
        } else {
          // Empresa
          await tx.documents_company.deleteMany({
            where: { id_document_types: docTypeId, document_path: null },
          });
        }
      }

      // 3. Recalcular status (solo Persona/Equipos)
      if (docType.applies !== document_applies.Empresa) {
        // Si no borramos alertas, recalcular de todos los recursos que TIENEN alertas
        if (!options.deleteEmptyAlerts || affectedResourceIds.length === 0) {
          const resourceTable =
            docType.applies === document_applies.Persona ? 'documents_employees' : 'documents_equipment';
          const resources = await tx.$queryRawUnsafe<{ applies: string }[]>(
            `SELECT DISTINCT applies FROM ${resourceTable} WHERE id_document_types = $1`,
            docTypeId
          );
          affectedResourceIds = resources.map((r) => r.applies);
        }

        await recalculateResourceStatus(tx, affectedResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al desactivar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}
```

- [ ] **Step 2: Verificar types**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```
feat(documentacion): add deactivateDocumentType server action
```

### Task 5: Implementar `hardDeleteDocumentType`

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`

- [ ] **Step 1: Agregar funcion `hardDeleteDocumentType`**

```typescript
// ============================================================================
// HARD DELETE: Eliminar permanentemente tipo de documento (solo si sin docs subidos)
// ============================================================================

export async function hardDeleteDocumentType(docTypeId: string) {
  const companyId = await getServerCompanyId();

  logger.info('Eliminando permanentemente tipo de documento', { data: { docTypeId } });

  try {
    return await prisma.$transaction(async (tx) => {
      const docType = await tx.document_types.findFirst({
        where: { id: docTypeId, company_id: companyId },
        select: { id: true, applies: true, mandatory: true },
      });

      if (!docType) throw new Error('Tipo de documento no encontrado');

      // Double-check: no debe haber documentos subidos
      let uploadedCount = 0;
      if (docType.applies === document_applies.Persona) {
        uploadedCount = await tx.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      } else if (docType.applies === document_applies.Equipos) {
        uploadedCount = await tx.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      } else {
        uploadedCount = await tx.documents_company.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      }

      if (uploadedCount > 0) {
        throw new Error(
          `No se puede eliminar: hay ${uploadedCount} documento(s) subido(s). Desactive el tipo en su lugar.`
        );
      }

      // Obtener IDs de recursos afectados para recalcular status
      let affectedResourceIds: string[] = [];

      if (docType.applies === document_applies.Persona) {
        const affected = await tx.documents_employees.findMany({
          where: { id_document_types: docTypeId },
          select: { applies: true },
        });
        affectedResourceIds = affected.map((a) => a.applies).filter(Boolean) as string[];
        await tx.documents_employees.deleteMany({ where: { id_document_types: docTypeId } });
      } else if (docType.applies === document_applies.Equipos) {
        const affected = await tx.documents_equipment.findMany({
          where: { id_document_types: docTypeId },
          select: { applies: true },
        });
        affectedResourceIds = affected.map((a) => a.applies).filter(Boolean) as string[];
        await tx.documents_equipment.deleteMany({ where: { id_document_types: docTypeId } });
      } else {
        await tx.documents_company.deleteMany({ where: { id_document_types: docTypeId } });
      }

      // Eliminar el tipo de documento
      await tx.document_types.delete({ where: { id: docTypeId } });

      // Recalcular status (solo Persona/Equipos)
      if (docType.applies !== document_applies.Empresa && affectedResourceIds.length > 0) {
        await recalculateResourceStatus(tx, affectedResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al eliminar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}
```

- [ ] **Step 2: Verificar types**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```
feat(documentacion): add hardDeleteDocumentType server action
```

### Task 6: Implementar `reactivateDocumentType`

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`

- [ ] **Step 1: Agregar funcion `reactivateDocumentType`**

```typescript
// ============================================================================
// REACTIVATE: Activar tipo de documento + opcionalmente recrear alertas
// ============================================================================

export async function reactivateDocumentType(docTypeId: string, options: { recreateAlerts: boolean }) {
  const companyId = await getServerCompanyId();

  logger.info('Reactivando tipo de documento', { data: { docTypeId, options } });

  try {
    return await prisma.$transaction(async (tx) => {
      const docType = await tx.document_types.findFirst({
        where: { id: docTypeId, company_id: companyId, is_active: false },
        select: {
          id: true,
          applies: true,
          mandatory: true,
          special: true,
          conditions: true,
          company_id: true,
        },
      });

      if (!docType) throw new Error('Tipo de documento no encontrado o ya esta activo');

      // 1. Activar
      await tx.document_types.update({
        where: { id: docTypeId },
        data: { is_active: true },
      });

      // 2. Si recreateAlerts y es mandatory, crear alertas para recursos sin alerta
      const newAlertResourceIds: string[] = [];

      if (options.recreateAlerts && docType.mandatory) {
        if (docType.applies === document_applies.Persona) {
          // Obtener empleados activos sin alerta para este tipo
          const missing = await tx.$queryRawUnsafe<{ id: string }[]>(
            `
            SELECT e.id FROM employees e
            WHERE e.company_id = $1
              AND NOT EXISTS (
                SELECT 1 FROM documents_employees de
                WHERE de.id_document_types = $2 AND de.applies = e.id
              )
          `,
            docType.company_id,
            docTypeId
          );

          // TODO: Si es special, filtrar por condiciones en TS (reusar countMatchingResources logic)
          // Por ahora, crear para todos los que no tienen alerta (el trigger reconciliara despues si es special)

          for (const emp of missing) {
            await tx.documents_employees.create({
              data: {
                id_document_types: docTypeId,
                applies: emp.id,
                state: 'pendiente',
                is_active: true,
              },
            });
            newAlertResourceIds.push(emp.id);
          }
        } else if (docType.applies === document_applies.Equipos) {
          const missing = await tx.$queryRawUnsafe<{ id: string }[]>(
            `
            SELECT v.id FROM vehicles v
            WHERE v.company_id = $1
              AND NOT EXISTS (
                SELECT 1 FROM documents_equipment de
                WHERE de.id_document_types = $2 AND de.applies = v.id
              )
          `,
            docType.company_id,
            docTypeId
          );

          for (const veh of missing) {
            await tx.documents_equipment.create({
              data: {
                id_document_types: docTypeId,
                applies: veh.id,
                state: 'pendiente',
                is_active: true,
              },
            });
            newAlertResourceIds.push(veh.id);
          }
        } else {
          // Empresa: crear si no existe
          const existing = await tx.documents_company.findFirst({
            where: { id_document_types: docTypeId },
          });
          if (!existing) {
            await tx.documents_company.create({
              data: {
                id_document_types: docTypeId,
                applies: docType.company_id,
                state: 'pendiente',
                is_active: true,
              },
            });
          }
        }
      }

      // 3. Recalcular status (solo Persona/Equipos)
      if (docType.applies !== document_applies.Empresa && newAlertResourceIds.length > 0) {
        await recalculateResourceStatus(tx, newAlertResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al reactivar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}
```

- [ ] **Step 2: Eliminar `toggleDocumentTypeActive` (ya no necesaria)**

Buscar la funcion `toggleDocumentTypeActive` en `actions.server.ts` y eliminarla completamente. Verificar que ningun otro archivo la importe (solo `_DocumentTypeFormModal.tsx` la usa y sera actualizado en Task 8).

- [ ] **Step 3: Verificar types**

```bash
npm run check-types
```

- [ ] **Step 4: Commit**

```
feat(documentacion): add reactivateDocumentType, remove toggleDocumentTypeActive
```

---

## Chunk 3: Frontend — Componente `_ToggleDocTypeDialog`

### Task 7: Crear componente `_ToggleDocTypeDialog`

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/components/_ToggleDocTypeDialog.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Power, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';

import {
  analyzeDocumentTypeImpact,
  deactivateDocumentType,
  hardDeleteDocumentType,
  reactivateDocumentType,
  type DocumentTypeListItem,
} from '../actions/actions.server';

// ============================================
// TYPES
// ============================================

interface ToggleDocTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentTypeListItem;
  onSuccess: () => void;
}

type DeactivateOption = 'keep-alerts' | 'delete-alerts' | 'hard-delete';
type ActivateOption = 'create-alerts' | 'skip-alerts';

// ============================================
// COMPONENT
// ============================================

export function _ToggleDocTypeDialog({
  open,
  onOpenChange,
  documentType,
  onSuccess,
}: ToggleDocTypeDialogProps) {
  const queryClient = useQueryClient();
  const isActive = documentType.is_active;

  // --- Estado de seleccion ---
  const [deactivateOption, setDeactivateOption] = useState<DeactivateOption>('keep-alerts');
  const [activateOption, setActivateOption] = useState<ActivateOption>('create-alerts');

  // --- Query de analisis ---
  const { data: impact, isLoading } = useQuery({
    queryKey: ['doc-type-impact', documentType.id],
    queryFn: () => analyzeDocumentTypeImpact(documentType.id),
    enabled: open,
    staleTime: 0,
  });

  // --- Mutaciones ---
  const invalidateAndClose = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['doc-types'] });
    queryClient.invalidateQueries({ queryKey: ['doc-type-impact', documentType.id] });
    onSuccess();
  }, [queryClient, documentType.id, onSuccess]);

  const deactivateMutation = useMutation({
    mutationFn: (opts: { deleteEmptyAlerts: boolean }) =>
      deactivateDocumentType(documentType.id, opts),
    onSuccess: () => {
      toast.success('Tipo de documento desactivado');
      invalidateAndClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al desactivar');
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () => hardDeleteDocumentType(documentType.id),
    onSuccess: () => {
      toast.success('Tipo de documento eliminado permanentemente');
      invalidateAndClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (opts: { recreateAlerts: boolean }) =>
      reactivateDocumentType(documentType.id, opts),
    onSuccess: () => {
      toast.success('Tipo de documento activado');
      invalidateAndClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al activar');
    },
  });

  const isPending =
    deactivateMutation.isPending || hardDeleteMutation.isPending || reactivateMutation.isPending;

  // --- Handlers ---
  const handleConfirm = useCallback(() => {
    if (isActive) {
      // DESACTIVAR
      if (deactivateOption === 'hard-delete') {
        hardDeleteMutation.mutate();
      } else {
        deactivateMutation.mutate({
          deleteEmptyAlerts: deactivateOption === 'delete-alerts',
        });
      }
    } else {
      // ACTIVAR
      reactivateMutation.mutate({
        recreateAlerts: activateOption === 'create-alerts',
      });
    }
  }, [
    isActive,
    deactivateOption,
    activateOption,
    hardDeleteMutation,
    deactivateMutation,
    reactivateMutation,
  ]);

  // --- Render ---
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isActive ? (
              <>
                <Power className="h-5 w-5 text-destructive" />
                Desactivar tipo de documento
              </>
            ) : (
              <>
                <Power className="h-5 w-5 text-green-600" />
                Activar tipo de documento
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? `Gestionando "${documentType.name}"`
              : `Reactivando "${documentType.name}"`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : impact ? (
            isActive ? (
              <DeactivateContent
                impact={impact}
                option={deactivateOption}
                onOptionChange={setDeactivateOption}
              />
            ) : (
              <ActivateContent
                impact={impact}
                option={activateOption}
                onOptionChange={setActivateOption}
              />
            )
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isPending || isLoading}
            variant={isActive && deactivateOption === 'hard-delete' ? 'destructive' : 'default'}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : isActive ? (
              deactivateOption === 'hard-delete' ? (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar permanentemente
                </>
              ) : (
                'Desactivar'
              )
            ) : (
              'Activar'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================
// SUBCOMPONENTES
// ============================================

function DeactivateContent({
  impact,
  option,
  onOptionChange,
}: {
  impact: Awaited<ReturnType<typeof analyzeDocumentTypeImpact>>;
  option: DeactivateOption;
  onOptionChange: (opt: DeactivateOption) => void;
}) {
  const { uploadedCount, emptyAlertCount, canHardDelete, docType } = impact;

  // Tipo no mandatorio: confirmacion simple
  if (!docType.mandatory) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Este tipo no es obligatorio, por lo que no tiene alertas asociadas.
        </p>
        {canHardDelete ? (
          <RadioGroup value={option} onValueChange={(v) => onOptionChange(v as DeactivateOption)}>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="keep-alerts" id="deact-simple" />
              <Label htmlFor="deact-simple" className="text-sm font-normal">
                Desactivar (se puede reactivar despues)
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="hard-delete" id="deact-delete" />
              <Label htmlFor="deact-delete" className="text-sm font-normal text-destructive">
                Eliminar permanentemente
              </Label>
            </div>
          </RadioGroup>
        ) : (
          <p className="text-sm">Se desactivara el tipo. Podra reactivarse mas tarde.</p>
        )}
      </div>
    );
  }

  // Tipo mandatorio con documentos subidos
  if (uploadedCount > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-600" />
          <div className="text-sm">
            <p className="font-medium">Hay {uploadedCount} documento(s) subido(s)</p>
            <p className="text-muted-foreground">
              Los documentos subidos se mantendran. No se puede eliminar permanentemente.
            </p>
          </div>
        </div>

        {emptyAlertCount > 0 && (
          <RadioGroup value={option} onValueChange={(v) => onOptionChange(v as DeactivateOption)}>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="keep-alerts" id="deact-keep" />
              <Label htmlFor="deact-keep" className="text-sm font-normal">
                Desactivar y mantener las {emptyAlertCount} alerta(s) vacia(s)
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="delete-alerts" id="deact-delete" />
              <Label htmlFor="deact-delete" className="text-sm font-normal">
                Desactivar y borrar las {emptyAlertCount} alerta(s) vacia(s)
              </Label>
            </div>
          </RadioGroup>
        )}

        {emptyAlertCount === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay alertas vacias para borrar. Se desactivara el tipo.
          </p>
        )}
      </div>
    );
  }

  // Tipo mandatorio sin documentos subidos (canHardDelete = true)
  return (
    <div className="space-y-3">
      {emptyAlertCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Hay <Badge variant="secondary">{emptyAlertCount}</Badge> alerta(s) pendiente(s) sin documentos subidos.
        </p>
      )}

      <RadioGroup value={option} onValueChange={(v) => onOptionChange(v as DeactivateOption)}>
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="keep-alerts" id="deact-keep" />
          <Label htmlFor="deact-keep" className="text-sm font-normal">
            Desactivar y mantener alertas
          </Label>
        </div>
        {emptyAlertCount > 0 && (
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="delete-alerts" id="deact-clean" />
            <Label htmlFor="deact-clean" className="text-sm font-normal">
              Desactivar y borrar las {emptyAlertCount} alerta(s) vacia(s)
            </Label>
          </div>
        )}
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="hard-delete" id="deact-permanent" />
          <Label htmlFor="deact-permanent" className="text-sm font-normal text-destructive">
            Eliminar permanentemente (tipo + alertas)
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

function ActivateContent({
  impact,
  option,
  onOptionChange,
}: {
  impact: Awaited<ReturnType<typeof analyzeDocumentTypeImpact>>;
  option: ActivateOption;
  onOptionChange: (opt: ActivateOption) => void;
}) {
  const { missingAlertCount, docType } = impact;

  // Tipo no mandatorio o sin alertas faltantes
  if (!docType.mandatory || missingAlertCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Se activara el tipo de documento. {!docType.mandatory ? 'No es obligatorio, por lo que no se crearan alertas.' : 'Todos los recursos ya tienen su alerta.'}
      </p>
    );
  }

  // Tipo mandatorio con alertas faltantes
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Hay <Badge variant="secondary">{missingAlertCount}</Badge> {docType.applies === 'Persona' ? 'empleado(s)' : docType.applies === 'Equipos' ? 'equipo(s)' : 'registro(s)'} sin alerta para este tipo.
      </p>

      <RadioGroup value={option} onValueChange={(v) => onOptionChange(v as ActivateOption)}>
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="create-alerts" id="act-create" />
          <Label htmlFor="act-create" className="text-sm font-normal">
            Activar y crear {missingAlertCount} alerta(s) pendiente(s)
          </Label>
        </div>
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="skip-alerts" id="act-skip" />
          <Label htmlFor="act-skip" className="text-sm font-normal">
            Activar sin crear alertas
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
```

- [ ] **Step 2: Verificar types**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```
feat(documentacion): add _ToggleDocTypeDialog component
```

### Task 8: Integrar `_ToggleDocTypeDialog` en `_DocumentTypeFormModal`

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/components/_DocumentTypeFormModal.tsx`

- [ ] **Step 1: Actualizar imports**

Eliminar imports no necesarios y agregar el nuevo componente:

```diff
- import {
-   AlertDialog,
-   AlertDialogAction,
-   AlertDialogCancel,
-   AlertDialogContent,
-   AlertDialogDescription,
-   AlertDialogFooter,
-   AlertDialogHeader,
-   AlertDialogTitle,
- } from '@/components/ui/alert-dialog';
  import {
    countMatchingResources,
    createDocumentType,
    getDocumentTypeForEdit,
-   toggleDocumentTypeActive,
    updateDocumentType,
    type DocumentTypeListItem,
  } from '../actions/actions.server';
+ import { _ToggleDocTypeDialog } from './_ToggleDocTypeDialog';
```

- [ ] **Step 2: Reemplazar estado `toggleConfirmOpen` por `toggleDialogOpen`**

```diff
-  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
+  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
```

- [ ] **Step 3: Eliminar `toggleMutation`**

Eliminar completamente las lineas ~234-244:

```diff
-  const toggleMutation = useMutation({
-    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleDocumentTypeActive(id, isActive),
-    onSuccess: (_data, variables) => {
-      toast.success(variables.isActive ? 'Tipo de documento activado' : 'Tipo de documento desactivado');
-      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
-      handleClose();
-    },
-    onError: () => {
-      toast.error('Error al cambiar el estado del tipo de documento');
-    },
-  });
```

- [ ] **Step 4: Actualizar `isPending` para quitar `toggleMutation`**

```diff
-  const isPending = createMutation.isPending || updateMutation.isPending || toggleMutation.isPending;
+  const isPending = createMutation.isPending || updateMutation.isPending;
```

- [ ] **Step 5: Actualizar el boton de Desactivar/Activar en el DialogFooter**

```diff
                  <Button
                    type="button"
                    variant={documentType.is_active ? 'destructive' : 'default'}
                    size="sm"
-                   onClick={() => setToggleConfirmOpen(true)}
+                   onClick={() => setToggleDialogOpen(true)}
                    disabled={isPending}
                  >
```

- [ ] **Step 6: Reemplazar el AlertDialog viejo por `_ToggleDocTypeDialog`**

Eliminar el bloque `{isEditing && documentType && (<AlertDialog...>)}` (lineas ~612-639) y reemplazar por:

```tsx
{
  isEditing && documentType && (
    <_ToggleDocTypeDialog
      open={toggleDialogOpen}
      onOpenChange={setToggleDialogOpen}
      documentType={documentType}
      onSuccess={handleClose}
    />
  );
}
```

- [ ] **Step 7: Verificar types**

```bash
npm run check-types
```

- [ ] **Step 8: Commit**

```
feat(documentacion): integrate _ToggleDocTypeDialog into form modal

Replace static AlertDialog with smart dialog that analyzes impact
before deactivating/activating/deleting document types.
```

---

## Chunk 4: Verificacion final

### Task 9: Verificacion end-to-end

- [ ] **Step 1: Verificar types del proyecto completo**

```bash
npm run check-types
```

- [ ] **Step 2: Verificar lint**

```bash
npm run lint
```

- [ ] **Step 3: Prueba manual en navegador**

Con chrome-devtools MCP:

1. Login con credenciales de test
2. Navegar a Dashboard > Documentacion > Tipos de Documentos
3. Abrir un tipo activo mandatorio → Boton "Desactivar"
   - Verificar que muestra skeleton, luego counts y opciones (RadioGroup)
   - Verificar cada opcion: mantener alertas, borrar alertas, eliminar permanentemente
4. Desactivar un tipo y verificar en BD (via MCP supabase-LOCAL):
   - `SELECT is_active FROM document_types WHERE name = 'X'` → false
   - Verificar status de empleados/vehiculos recalculado
5. Reactivar un tipo desactivado:
   - Verificar que muestra conteo de alertas faltantes
   - Verificar opcion de crear alertas
6. Crear un tipo nuevo mandatorio:
   - Verificar que se crean alertas (trigger funciona con doc.company_id)
   - Verificar que `add_new_document_trigger` ya no existe
7. Crear un empleado nuevo:
   - Verificar que NO recibe alertas de tipos inactivos

- [ ] **Step 4: Commit final si hay ajustes**

```
fix(documentacion): adjustments from e2e testing
```
