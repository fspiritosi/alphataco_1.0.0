# Spec: Flujo is_active de Tipos de Documentos

**Fecha**: 2026-03-13
**Estado**: Aprobado (brainstorming + review)
**Enfoque**: B (Application layer + fix minimal de triggers)

---

## Contexto

Los tipos de documentos tienen una propiedad `is_active` que actualmente no tiene impacto real en la app. Al crear un tipo mandatorio se generan alertas vacias (registros con `document_path IS NULL`) para cada empleado/equipo. Existen 5 problemas:

1. **Alertas no se crean** — triggers usan `auth.jwt()` para obtener `company_id`, pero Prisma bypassa RLS y JWT es NULL
2. **`is_active` no se considera** en ningun trigger — nuevos empleados reciben alertas de tipos inactivos, status incorrecto
3. **Flujo de desactivacion es estatico** — no verifica documentos subidos ni ofrece opciones
4. **No hay opcion de borrado permanente** — si nadie subio documentos, deberia poder eliminarse
5. **Triggers pueden borrar alertas masivamente** — condiciones malformadas causan DELETE masivo

## Principios de Diseno

- Triggers SQL: fix minimal (is_active, company_id, safety guards). Solo INSERT, nunca DELETE masivo.
- Logica nueva: server actions con Prisma (TypeScript, tipado, debuggeable).
- Frontend: dialog inteligente que analiza impacto antes de actuar.
- Recalculo de status: considera solo tipos `is_active = true`.
- Reactivacion: manejada 100% por application layer, nunca por triggers.

---

## Seccion 1 — Fix de Triggers SQL

### Inventario de funciones

Hay 4 funciones principales y 2 triggers relevantes:

| Funcion                                                               | Se dispara desde                          | Que hace                                                          |
| --------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| `controlar_alertas_single_document_all_employees(docTypeId)`          | Trigger INSERT/UPDATE en `document_types` | Itera TODOS los empleados de la empresa para UN tipo de documento |
| `controlar_alertas_single_document_all_vehicles(docTypeId)`           | Trigger INSERT/UPDATE en `document_types` | Itera TODOS los vehiculos de la empresa para UN tipo de documento |
| `controlar_alertas_documentos_single_employee(employeeId, companyId)` | Trigger INSERT/UPDATE en `employees`      | Itera TODOS los tipos de documento para UN empleado               |
| `controlar_alertas_documentos_single_vehicle(vehicleId, companyId)`   | Trigger INSERT/UPDATE en `vehicles`       | Itera TODOS los tipos de documento para UN vehiculo               |

Triggers sobre `document_types`:

- `document_types_after_insert` → `trg_document_types_insert()`
- `document_types_after_update` → `trg_document_types_update()`
- `add_new_document_trigger` → `add_new_document()` (**duplicado, activo por error**)

### A) Funciones `controlar_alertas_single_document_all_employees` y `controlar_alertas_single_document_all_vehicles`

Estas funciones se disparan al INSERT/UPDATE de `document_types` y recorren TODOS los recursos.

Cambios:

1. **Reemplazar `auth.jwt()`**: eliminar `user_jwt := auth.jwt()` y `company_id_var := user_jwt->...`. Usar `doc.company_id` (ya disponible del SELECT INTO doc)
2. **Agregar `AND is_active = true`** al SELECT de `document_types`
3. **Eliminar TODAS las sentencias DELETE** — estas funciones masivas solo deben INSERT, nunca borrar
4. **Eliminar el UPDATE de status inline** — el recalculo se hara desde application layer
5. **Eliminar el guard `myapp.inside_single_document_batch`** — ya no es necesario porque `add_new_document_trigger` sera deshabilitado (ver seccion E)
6. Para `user_id`: usar NULL (no critico, es metadata de quien creo la alerta)

Codigo resultante (ejemplo para employees, vehicles es analogo):

```sql
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
    -- Tipo no especial: crear para todos
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

### B) Funciones `controlar_alertas_documentos_single_employee` y `controlar_alertas_documentos_single_vehicle`

Estas funciones se disparan al INSERT/UPDATE de `employees`/`vehicles` y recorren TODOS los tipos de documento para UN recurso.

Cambios:

1. **Agregar `AND is_active = true`** al FOR loop:
   ```sql
   FOR doc IN SELECT * FROM document_types
     WHERE mandatory = true AND applies = 'Persona' AND is_active = true
   ```
2. **Agregar `AND dt.is_active = true`** al calculo de status (CUANDO determina "Incompleto"):
   ```sql
   WHEN EXISTS (
     SELECT 1 FROM document_types dt
     WHERE dt.mandatory = true AND dt.applies = 'Persona' AND dt.is_active = true
       AND NOT EXISTS (...)
   ) THEN 'Incompleto'
   ```
3. **Agregar guarda en DELETE individual**: si `where_sql` es `'TRUE'`, NULL o vacio, NO borrar para ese doc (solo insertar):
   ```sql
   IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
     -- Condiciones invalidas: no crear ni borrar, skip este tipo
     CONTINUE;
   END IF;
   ```
4. El DELETE individual (para UN empleado + UN tipo) se mantiene con la guarda de seguridad. Esto cubre el caso donde un empleado cambia de provincia y ya no cumple condiciones de un tipo especial.

### C) `trg_document_types_update`

Cambios:

```sql
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

**Nota**: La reactivacion se maneja 100% desde application layer (`reactivateDocumentType`). El trigger NO reconcilia en reactivacion. Esto es intencional: la server action pregunta al usuario si quiere crear alertas y las crea con logica Prisma.

### D) `build_vehicle_where_alias`

La version actual NO tiene las guardas de seguridad que si tiene `build_employee_where_alias`. Cambios concretos:

1. Agregar filtro de IDs vacios en el SELECT de ids:

   ```sql
   -- ANTES (sin filtro):
   SELECT '(' || string_agg(quote_literal(id), ',') || ')'
     INTO ids_txt
     FROM jsonb_array_elements_text(c -> 'ids') id;

   -- DESPUES (con filtro, igual que employee):
   SELECT '(' || string_agg(quote_literal(id), ',') || ')'
     INTO ids_txt
     FROM jsonb_array_elements_text(c -> 'ids') id
     WHERE id IS NOT NULL AND id <> '';
   ```

2. Agregar check de parts vacios al final (antes del RETURN):

   ```sql
   -- Agregar ANTES de la linea final "RETURN array_to_string(parts, ' AND ')":
   IF array_length(parts, 1) IS NULL OR array_length(parts, 1) = 0 THEN
     RETURN 'TRUE';
   END IF;
   ```

3. Agregar manejo de `ids_txt IS NULL` dentro del CASE (para evitar SQL invalido):
   ```sql
   -- Despues de calcular ids_txt, agregar:
   IF ids_txt IS NULL OR ids_txt = '()' THEN
     CONTINUE;  -- Skip esta condicion
   END IF;
   ```

### E) Deshabilitar `add_new_document_trigger`

Estado actual: este trigger esta **activo** (fue re-creado en migracion `20251106214934` sin DISABLE). Es duplicado de `document_types_after_insert` — ambos llaman a las mismas funciones.

```sql
DROP TRIGGER IF EXISTS add_new_document_trigger ON document_types;
```

Se usa DROP en vez de DISABLE para limpiar completamente.

---

## Seccion 2 — Server Actions (Prisma)

Ubicacion: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`

### Eliminacion de funcion existente

La funcion `toggleDocumentTypeActive` actual (simple toggle sin logica) se **elimina**. Se reemplaza por las nuevas acciones `deactivateDocumentType`, `reactivateDocumentType` y `hardDeleteDocumentType`. Todos los callsites (actualmente solo `_DocumentTypeFormModal.tsx` via `toggleMutation`) se migran al nuevo componente `_ToggleDocTypeDialog`.

### A) `analyzeDocumentTypeImpact(docTypeId: string)`

Obtiene `company_id` desde `docType.company_id` (del registro de `document_types`, NO de `getServerCompanyId`), pero valida pertenencia con `getServerCompanyId()` para seguridad.

Retorna:

```typescript
{
  docType: { id, name, applies, is_active, mandatory, special },
  uploadedCount: number,      // document_path IS NOT NULL
  emptyAlertCount: number,    // document_path IS NULL
  totalResources: number,     // total registros (uploaded + empty)
  missingAlertCount: number,  // recursos activos de la empresa sin alerta para este tipo
  canHardDelete: boolean,     // uploadedCount === 0
}
```

Implementacion:

```typescript
const companyId = await getServerCompanyId();
const [docType, counts, missingCount] = await Promise.all([
  prisma.document_types.findUnique({ where: { id: docTypeId, company_id: companyId }, ... }),
  // Counts de uploaded vs empty segun applies:
  countDocumentsByType(docTypeId, applies),
  // Missing: recursos activos sin alerta:
  countMissingAlerts(docTypeId, companyId, applies),
]);
```

Para `Persona`: cuenta en `documents_employees`, recursos en `employees`.
Para `Equipos`: cuenta en `documents_equipment`, recursos en `vehicles`.
Para `Empresa`: cuenta en `documents_company` (1 registro max, `missingAlertCount` es 0 o 1).

### B) `deactivateDocumentType(docTypeId: string, options: { deleteEmptyAlerts: boolean })`

Flujo en `prisma.$transaction`:

1. Verificar que el tipo existe, pertenece a la empresa, y `is_active = true`
2. `UPDATE document_types SET is_active = false`
3. Si `deleteEmptyAlerts = true`:
   - Segun `applies`:
     - `Persona`: `DELETE FROM documents_employees WHERE id_document_types = id AND document_path IS NULL`
     - `Equipos`: `DELETE FROM documents_equipment WHERE ...`
     - `Empresa`: `DELETE FROM documents_company WHERE ...`
   - Obtener IDs de recursos afectados (pre-delete query)
4. Recalcular status via `recalculateResourceStatus` (solo para `Persona` y `Equipos`)

**Empresa**: no tiene status que recalcular. El DELETE se hace si corresponde, pero sin recalculo.

### C) `hardDeleteDocumentType(docTypeId: string)`

Solo permitido si `uploadedCount === 0` (validacion server-side).

Flujo en `prisma.$transaction`:

1. Doble check: contar documentos subidos. Si > 0, throw error
2. Obtener IDs de recursos afectados (para recalcular status despues)
3. DELETE alertas vacias de la tabla correspondiente segun `applies`
4. DELETE el registro de `document_types`
5. Recalcular status de recursos afectados (solo `Persona`/`Equipos`)

### D) `reactivateDocumentType(docTypeId: string, options: { recreateAlerts: boolean })`

Flujo en `prisma.$transaction`:

1. Verificar que el tipo existe, pertenece a la empresa, y `is_active = false`
2. `UPDATE document_types SET is_active = true`
3. Si `recreateAlerts = true` y tipo es `mandatory`:
   - Obtener recursos activos de la empresa sin alerta para este tipo
   - Si tipo es `special`: evaluar condiciones en TypeScript (reusar logica de `countMatchingResources` que ya existe)
   - INSERT alertas vacias para recursos que califican
4. Recalcular status de recursos afectados (solo `Persona`/`Equipos`)

### E) `recalculateResourceStatus(resourceIds: string[], resourceType: 'Persona' | 'Equipos')`

Helper interno (no exportado). Solo para `Persona` y `Equipos` — **Empresa no tiene campo `status`** en la tabla `company`, por eso se excluye.

Logica:

```
Para cada recurso:
  - Si tiene documento con state = 'vencido' → "Completo con doc vencida"
  - Si le falta documento de tipo mandatory = true AND is_active = true → "Incompleto"
  - Else → "Completo"
```

Implementacion eficiente con raw query batch (no N+1):

```sql
UPDATE employees SET status = CASE
  WHEN EXISTS (SELECT 1 FROM documents_employees de WHERE de.applies = employees.id AND de.state = 'vencido')
    THEN 'Completo con doc vencida'
  WHEN EXISTS (
    SELECT 1 FROM document_types dt
    WHERE dt.mandatory = true AND dt.applies = 'Persona' AND dt.is_active = true
      AND NOT EXISTS (SELECT 1 FROM documents_employees de2 WHERE de2.id_document_types = dt.id AND de2.applies = employees.id)
  ) THEN 'Incompleto'
  ELSE 'Completo'
END
WHERE employees.id IN (...)
```

---

## Seccion 3 — Frontend

### Componente `_ToggleDocTypeDialog`

Reemplaza el `AlertDialog` estatico actual en `_DocumentTypeFormModal`. Tambien se eliminan: `toggleConfirmOpen` state, `toggleMutation`, y el `AlertDialog` de confirmacion del modal.

Ubicacion: `src/features/Documentacion/TiposDocumentos/components/_ToggleDocTypeDialog.tsx`

Props:

```typescript
interface ToggleDocTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentTypeListItem;
  onSuccess: () => void; // para invalidar queries y cerrar modal padre
}
```

### Query de analisis

```typescript
const { data: impact, isLoading } = useQuery({
  queryKey: ['doc-type-impact', documentType.id],
  queryFn: () => analyzeDocumentTypeImpact(documentType.id),
  enabled: open,
  staleTime: 0, // siempre fresh, datos cambian con cada accion
});
```

### Flujo DESACTIVAR (is_active: true → false)

Al abrirse:

- Muestra skeleton mientras `isLoading`
- Segun resultado, presenta la pantalla correcta:

**Caso A: `uploadedCount === 0` y tipo mandatorio (nadie subio documentos)**

Opciones (RadioGroup):

1. Desactivar y mantener alertas
2. Desactivar y borrar las N alertas
3. Eliminar permanentemente (tipo + alertas)

**Caso B: `uploadedCount > 0` (hay documentos subidos)**

Mensaje de advertencia con counts. Opciones:

1. Desactivar y mantener las alertas vacias
2. Desactivar y borrar las N alertas vacias

Los documentos subidos siempre se mantienen. No se puede eliminar permanentemente.

**Caso C: Tipo no mandatorio (sin alertas)**

Confirmacion simple: "¿Desactivar este tipo?" o "¿Eliminar permanentemente?"

**Caso Empresa:**

- Si `document_path IS NULL` → desactivar o eliminar permanentemente
- Si `document_path IS NOT NULL` → solo desactivar (documento se mantiene)

### Flujo ACTIVAR (is_active: false → true)

**Si `missingAlertCount > 0` y tipo es mandatorio:**

Opciones:

1. Activar y crear N alertas
2. Activar sin crear alertas

**Si `missingAlertCount === 0` o tipo no mandatorio:**

Confirmacion simple: "¿Confirma la activacion?"

### Mutaciones

```typescript
const deactivateMutation = useMutation({
  mutationFn: (opts: { deleteEmptyAlerts: boolean }) => deactivateDocumentType(documentType.id, opts),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['doc-types'] });
    queryClient.invalidateQueries({ queryKey: ['doc-type-impact', documentType.id] });
    onSuccess();
  },
});

const hardDeleteMutation = useMutation({
  mutationFn: () => hardDeleteDocumentType(documentType.id),
  onSuccess: () => {
    /* misma invalidacion + onSuccess */
  },
});

const reactivateMutation = useMutation({
  mutationFn: (opts: { recreateAlerts: boolean }) => reactivateDocumentType(documentType.id, opts),
  onSuccess: () => {
    /* misma invalidacion + onSuccess */
  },
});
```

### Integracion con `_DocumentTypeFormModal`

Eliminar del modal:

- `toggleConfirmOpen` state
- `toggleMutation`
- El `AlertDialog` de confirmacion (lineas ~729-764)
- Import de `toggleDocumentTypeActive`

Agregar:

- `toggleDialogOpen` state
- `<_ToggleDocTypeDialog>` en el JSX
- El boton de "Desactivar"/"Activar" abre este nuevo dialog

---

## Edge Cases Contemplados

1. **Race condition**: entre analisis y ejecucion alguien sube documento → `hardDeleteDocumentType` valida server-side y falla con error descriptivo
2. **Tipo especial con condiciones malformadas**: triggers masivos nunca borran, solo insertan. Guard de `where_sql` invalido
3. **Tipo de empresa**: flujo simplificado 1:1, sin recalculo de status
4. **Tipo no mandatorio**: no tiene alertas, desactivar/eliminar es directo (solo toggle/delete del tipo)
5. **Tipo ya desactivado que se intenta desactivar**: server action valida `is_active` actual
6. **Empleado creado mientras tipo esta inactivo**: trigger filtra `is_active = true`, no crea alerta
7. **Trigger de UPDATE de employee recalcula status**: ahora excluye tipos inactivos
8. **`build_vehicle_where_alias` con IDs vacios**: ahora tiene las mismas guardas que la version de employees
9. **Doble trigger en INSERT**: `add_new_document_trigger` eliminado (DROP)
10. **Reactivacion via trigger**: trigger NO reconcilia en reactivacion/desactivacion — application layer maneja ambos
11. **`company_id` en analisis**: obtenido de `docType.company_id`, validado contra `getServerCompanyId()`
12. **Empresa sin campo status**: `recalculateResourceStatus` solo aplica a Persona/Equipos

---

## Fuera de Alcance

- Migracion de datos existente (alertas de tipos ya inactivos) — se puede hacer despues con script
- Notificaciones al desactivar/activar
- Audit log de cambios de estado
- Bulk activate/deactivate desde la tabla
