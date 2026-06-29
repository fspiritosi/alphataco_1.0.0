# Diseño: Carga masiva de documentos multirecurso (eficiencia + atomicidad)

**Fecha:** 2026-06-29
**Ticket:** 295 — "[Empleados] NO CARGA DOC DE MANERA MASIVA"
**Estado:** Aprobado (pendiente revisión del spec)

## Problema

La carga de un documento multirecurso obligatorio (ej. ART) a cientos de empleados a la vez **muere por timeout** y el modal no se cierra. Síntomas observados:

- El archivo se sube al storage (`200`), pero la petición `SELECT ...in.(573 ids)` queda **Pending** y nunca responde.
- La BD no registra cambios (0 filas actualizadas).
- El usuario reintenta (botón sin estado de carga) → múltiples operaciones colgadas en paralelo.

### Causa raíz (cadena de triggers N×N×M)

```
updateMany documents_employees (600 filas)
  └─► update_status_trigger        (AFTER UPDATE, row-level, ×600)
        └─► UPDATE employees SET status=...   (×600)
              └─► controlar_alertas_employees (AFTER UPDATE, ×600)
                    └─► controlar_alertas_documentos_single_employee(emp, company)  ← recalcula TODAS las alertas, ×600
```

Cargar 1 documento a 600 empleados dispara **600 recálculos completos de alertas**. Agravantes:

1. **Lógica client-side frágil:** `uploadDocument` (`src/lib/utils.ts`) usa `supabaseBrowser()` con `.in('applies', [cientos de ids])` → URL de ~21KB y operación atada al navegador.
2. **Triggers row-level** con subqueries por fila (`notify_document_update` hace un `JOIN employees` por fila *antes* de chequear el `state`).
3. **`controlar_alertas_employees` / `controlar_alertas_vehicles` sin guarda de columna:** se disparan en *cualquier* `UPDATE employees/vehicles`, incluido uno que solo cambia `status`.
4. **Falta de índices en dev:** `documents_employees` en dev solo tiene la PK (prod sí tiene `applies` e `id_document_types`). `documents_equipment(applies)` falta en ambos.
5. **Sistema de notificaciones muerto:** `notify_document_update` inserta en una tabla `notifications` que nadie lee (UI comentada en `Navbar.tsx:28`, server action sin llamadores, sin "marcar como leído").
6. **Modal sin estados de carga:** el botón "Enviar" no se deshabilita durante la operación; el schema Zod `user_id: z.string().uuid().default('')` bloquea el submit en silencio cuando no hay sesión válida.

## Objetivos

- Que la carga masiva persista de forma **eficiente** (no N×N) y **atómica** (si algo falla, se revierte todo, incluido el archivo subido).
- Completar **solo los recursos faltantes** sin pisar a los que ya tienen el documento.
- Triggers que se ejecuten **una vez por operación** (statement-level) y sigan funcionando con una sola fila.
- Modal con manejo correcto de estados de carga.
- Eliminar el sistema de notificaciones muerto.

## Diseño

### A. Índices (migración Prisma)

Crear (con `CREATE INDEX IF NOT EXISTS`):

- `documents_employees(applies)` — falta en dev.
- `documents_employees(id_document_types)` — falta en dev.
- `documents_equipment(applies)` — falta en prod y dev.

> Nota de entorno: el `.env` local apunta a **dev**. La migración se aplica a dev por el flujo manual de Prisma (`.claude/rules/migrations.md`) y a prod por el pipeline de deploy (`prisma migrate deploy`).

### B. Triggers eficientes (statement-level)

Migración Prisma con SQL custom. Para cada trigger row-level que opera sobre `documents_employees` / `documents_equipment`, reescribir a `FOR EACH STATEMENT` con `REFERENCING NEW TABLE`.

**B.1. `update_status_trigger` → statement-level (`AFTER INSERT OR UPDATE`)**

Recalcula el `status` de todos los recursos afectados (`DISTINCT applies` de la transition table) en un solo `UPDATE` set-based:

```sql
UPDATE employees e SET status = CASE
  WHEN EXISTS (SELECT 1 FROM documents_employees d WHERE d.applies = e.id AND d.state = 'vencido')
    THEN 'Completo con doc vencida'
  WHEN NOT EXISTS (SELECT 1 FROM documents_employees d WHERE d.applies = e.id AND d.state <> 'presentado')
    THEN 'Completo'
  ELSE 'Incompleto'
END
WHERE e.id IN (SELECT DISTINCT applies FROM new_rows WHERE applies IS NOT NULL);
```

- Mismo bloque equivalente para `documents_equipment` → `vehicles`.
- Corrige un bug existente: la lógica de "vencido" hoy mira solo `NEW.state` de la fila; ahora considera si el recurso tiene *algún* documento vencido.
- Se agrega cobertura de `INSERT` (hoy solo era `UPDATE`), para que crear el documento faltante también recalcule el `status`.

**B.2. `controlar_alertas_employees` y `controlar_alertas_vehicles` → guarda de columna**

Recrear el trigger con:

```sql
... AFTER UPDATE ON employees
FOR EACH ROW
WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.company_id IS DISTINCT FROM NEW.company_id)
EXECUTE FUNCTION trg_controlar_alertas_employees();
```

Así el recálculo pesado de alertas **deja de dispararse** cuando solo cambia `status` (o cualquier columna que no afecte las alertas) → corta la cascada. El trigger de `INSERT` se mantiene sin cambios.

**B.3. `log_document_employee_changes` (y gemelo de equipos) → statement-level (`AFTER INSERT`)**

```sql
INSERT INTO documents_employees_logs (documents_employees_id, modified_by, updated_at)
SELECT id, user_id, now() FROM new_rows WHERE user_id IS NOT NULL;
```

**B.4. `notify_document_update` → ELIMINADO**

`DROP TRIGGER document_update_trigger ON documents_employees;` + `DROP FUNCTION notify_document_update;` (parte de la limpieza E).

### C. Backend — Server action Prisma con transacción

Nueva server action `'use server'` en `src/features/Documentacion/shared/actions/` (ej. `upload-multiresource-document.ts`).

**Firma (recibe `FormData` para incluir el archivo):**

```
uploadMultiResourceDocument(formData: FormData)
  // file: File
  // documentTypeId, resource ('empleado'|'equipo'), appliesIds (JSON), sharedPath
  // validity?, period?, userId?, mandatory (bool)
```

**Flujo:**

1. Subir el archivo al storage con `supabaseServer()` (`upsert: true`) usando `sharedPath`. Si falla → `return { error }` (nada que revertir).
2. Resolver el set de trabajo (solo faltantes):
   - `findMany` filas existentes para `applies IN appliesIds` y `id_document_types = documentTypeId`.
   - **Ignorar** los que ya están `presentado` con `document_path` (ya lo tienen).
   - **`toUpdate`** = los que tienen fila `pendiente` (o sin archivo).
   - **`toCreate`** = los `appliesIds` sin ninguna fila.
3. Persistir en `prisma.$transaction([...])`:
   - `updateMany({ where: { applies: { in: toUpdate }, id_document_types }, data: { state: 'presentado', document_path, validity, period } })`.
   - `createMany({ data: toCreate.map(...) })`.
   - `user_id` se omite si viene vacío (evita `400 invalid uuid`).
4. Si la transacción **falla** → en el `catch`, borrar el archivo del storage (`remove([sharedPath])`) → **compensación** → `return { error }`.
5. Éxito → `return { ok: true, updated, created }`.

**Atomicidad:** la BD es atómica vía `$transaction`; el storage se compensa con borrado si la BD falla (el storage no participa en transacciones SQL → "best effort" + compensación). Con los triggers ya statement-level, el `updateMany`/`createMany` dispara cada trigger **una vez por statement**, no por fila.

**Config:** subir `experimental.serverActions.bodySizeLimit` en `next.config` a un valor razonable (ej. `"10mb"`) para permitir el archivo en el `FormData`.

### D. Frontend — Estados de carga

`UploadDocumentMultiEmployee.tsx` y `UploadDocumentMultiEquipment.tsx`:

- Estado `isSubmitting`; botón "Enviar" `disabled={isSubmitting}` con spinner / texto "Enviando…". Bloquea reenvíos.
- `onSubmit` arma el `FormData` (archivo + metadata) y llama a `uploadMultiResourceDocument`. Toast de éxito/error; cerrar modal y `router.refresh()` / invalidar queries al éxito.
- Quitar `user_id: z.string().uuid().default(user_id || '')` del schema Zod (causa del submit que moría en silencio).
- Revisar el `AlertDialogCancel` oculto (`NewDocumentMulti.tsx:85`) que se renderiza como un botón vacío visible.

### E. Limpieza del sistema de notificaciones (código muerto)

Eliminar:

- Componentes: `_NotificationsModal.tsx`, `_NotificationItem.tsx`.
- Server actions: `getUserNotifications`, `deleteNotification`, `deleteAllNotifications` (`actions.navbar.ts`).
- Store: `allNotifications`, `markAllAsRead`, campo `notifications` (`loggedUser.ts`).
- Tipos y el prop comentado en `Navbar.tsx` / `navbar.types.ts`.
- BD: trigger `document_update_trigger` + función `notify_document_update` (en la migración B).

> No se elimina la tabla `notifications` en esta iteración (evitar borrado de datos / DDL destructivo); solo se deja de escribir en ella. Se puede archivar/eliminar en una limpieza posterior.

### F. Flujo individual (`SimpleDocument`) — el "error 2"

Cargar de a uno también "tira un error" (reportado, sin captura). **Antes de tocarlo**, reproducir en local para capturar el error exacto (consola/red). Hipótesis: comparte origen con el masivo (mismo `uploadDocument`). Si aplica, reutiliza la misma server action para el caso multirecurso. Se define el fix concreto tras la reproducción.

## Verificación

- **Reproducción en dev:** ya está el escenario clonado (tipo "Art" multirecurso idéntico a prod + 573 filas `pendiente`). Tras los cambios, cargar ART a la empresa debe completar en segundos, cerrar el modal y dejar las filas en `presentado`.
- **Atomicidad:** forzar un fallo en la transacción y verificar que no quedan filas nuevas ni archivo en storage.
- **Solo faltantes:** marcar algunos como `presentado` con archivo y verificar que no se pisan; los `pendiente` se completan.
- **Triggers:** verificar con MCP `supabase-LOCAL`/`dev` que `update_status_trigger` recalcula bien `status` para 1 fila y para lote; que `controlar_alertas_*` no corre en updates de solo `status`.
- `npm run check-types` sin errores.

## Fuera de alcance

- Reescribir/completar el sistema de notificaciones (se elimina).
- Borrar la tabla `notifications` o sus datos.
- Migrar a Prisma el resto de `SimpleDocument` más allá del caso multirecurso necesario para el fix.
