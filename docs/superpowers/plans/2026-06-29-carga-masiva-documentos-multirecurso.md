# Carga masiva de documentos multirecurso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que la carga masiva de documentos multirecurso (ej. ART a cientos de empleados) persista de forma eficiente y atómica, sin morir por timeout.

**Architecture:** Triggers row-level → statement-level (1 ejecución por operación); recálculo de alertas con guarda de columna para cortar la cascada N×N×M; persistencia movida de `supabaseBrowser().in([...])` client-side a una server action Prisma con `$transaction` + compensación del storage; modal con estados de carga; eliminación del sistema de notificaciones muerto.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma, Supabase (Postgres + Storage), React Hook Form + Zod, shadcn/ui, moment.js.

## Global Constraints

- Migraciones SOLO con el flujo manual de Prisma (`.claude/rules/migrations.md`): diff/SQL → carpeta → `prisma db execute` → `prisma migrate resolve --applied` → `prisma generate`. NUNCA `prisma migrate dev`.
- `.env` local apunta a **dev** (`pdrylqbztmpgawsfdsbr`). Las migraciones se aplican a dev local; prod corre por el pipeline de deploy.
- MCP Supabase (dev/prod) es de verificación (lectura). No aplicar DDL por MCP.
- NO `:any` / `as any`. Tipos inferidos (`Awaited<ReturnType<...>>`, `z.infer<...>`).
- `logger` de `@/lib/logger`, nunca `console.*`.
- Server Actions en `features/`, nunca API routes.
- Fechas con moment.js. UI en español, código en inglés.
- **NO commits automáticos.** Cada tarea queda en working tree; el commit final lo pide el usuario.
- Verificación por tarea: `npm run check-types` + queries MCP (`horizonte-dev`) + reproducción manual.

## Escenario de prueba (ya preparado en dev)

- `document_types` "Art" multirecurso obligatorio (`id = dc21b3c9-8acc-41fe-ad53-ac3c90ab3478`, `company_id = NULL`).
- 573 filas `documents_employees` en `state='pendiente'` sin archivo, para empresa GRUPO HORIZONTE SRL (`be4119b0-12ca-4a8f-87ed-209239194dab`).
- Dev server corriendo en `http://localhost:3000`.

---

## Task 1: Índices faltantes en documents_employees / documents_equipment

**Files:**
- Create: `prisma/migrations/20260629120000_add_documents_indexes/migration.sql`

**Interfaces:**
- Produces: índices `documents_employees_applies_idx`, `documents_employees_id_document_types_idx`, `documents_equipment_applies_idx`.

- [ ] **Step 1: Crear el archivo de migración**

`prisma/migrations/20260629120000_add_documents_indexes/migration.sql`:

```sql
-- Alinear dev con prod (faltan en dev) y cubrir documents_equipment(applies) (falta en ambos)
CREATE INDEX IF NOT EXISTS documents_employees_applies_idx
  ON public.documents_employees USING btree (applies);
CREATE INDEX IF NOT EXISTS documents_employees_id_document_types_idx
  ON public.documents_employees USING btree (id_document_types);
CREATE INDEX IF NOT EXISTS documents_equipment_applies_idx
  ON public.documents_equipment USING btree (applies);
```

- [ ] **Step 2: Aplicar la migración a dev**

```bash
npx prisma db execute --file prisma/migrations/20260629120000_add_documents_indexes/migration.sql
npx prisma migrate resolve --applied 20260629120000_add_documents_indexes
```

- [ ] **Step 3: Verificar índices con MCP `horizonte-dev`**

```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('documents_employees','documents_equipment') AND schemaname='public'
ORDER BY indexname;
```
Expected: aparecen `documents_employees_applies_idx`, `documents_employees_id_document_types_idx`, `documents_equipment_applies_idx`.

---

## Task 2: Triggers eficientes (statement-level + guarda + eliminar notify)

**Files:**
- Create: `prisma/migrations/20260629120100_optimize_document_triggers/migration.sql`

**Interfaces:**
- Consumes: índices de Task 1 (los recálculos del trigger usan `applies`).
- Produces: funciones `update_status_trigger`, `log_document_employee_changes`, `log_document_equipment_changes` (statement-level); triggers recreados; función/triggers `notify_document_update` eliminados; guarda en `controlar_alertas_employees` / `controlar_alertas_vehicles`.

- [ ] **Step 1: Verificar columnas usadas por la guarda en `vehicles`**

MCP `horizonte-dev`:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='vehicles' AND column_name IN ('is_active','company_id');
```
Expected: ambas existen. (Si `vehicles` no tuviera `company_id`, ajustar la guarda de vehicles a solo `is_active` en el Step 2.)

- [ ] **Step 2: Crear el archivo de migración**

`prisma/migrations/20260629120100_optimize_document_triggers/migration.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. update_status_trigger → STATEMENT-LEVEL (compartida por employees y equipment)
--    Recalcula el status de TODOS los recursos afectados en un solo UPDATE set-based.
--    Cubre INSERT y UPDATE. Corrige la lógica de "vencido" (mira si el recurso tiene
--    ALGUN documento vencido, no solo la fila tocada).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_status_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'documents_employees' THEN
    UPDATE employees e SET status = CASE
      WHEN EXISTS (SELECT 1 FROM documents_employees d WHERE d.applies = e.id AND d.state = 'vencido')
        THEN 'Completo con doc vencida'
      WHEN NOT EXISTS (SELECT 1 FROM documents_employees d WHERE d.applies = e.id AND d.state <> 'presentado')
        THEN 'Completo'
      ELSE 'Incompleto'
    END
    WHERE e.id IN (SELECT DISTINCT applies FROM affected_rows WHERE applies IS NOT NULL);
  ELSIF TG_TABLE_NAME = 'documents_equipment' THEN
    UPDATE vehicles v SET status = CASE
      WHEN EXISTS (SELECT 1 FROM documents_equipment d WHERE d.applies = v.id AND d.state = 'vencido')
        THEN 'Completo con doc vencida'
      WHEN NOT EXISTS (SELECT 1 FROM documents_equipment d WHERE d.applies = v.id AND d.state <> 'presentado')
        THEN 'Completo'
      ELSE 'Incompleto'
    END
    WHERE v.id IN (SELECT DISTINCT applies FROM affected_rows WHERE applies IS NOT NULL);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_update_documents_employees ON public.documents_employees;
CREATE TRIGGER trg_update_documents_employees
  AFTER INSERT OR UPDATE ON public.documents_employees
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

DROP TRIGGER IF EXISTS trg_update_documents_equipment ON public.documents_equipment;
CREATE TRIGGER trg_update_documents_equipment
  AFTER INSERT OR UPDATE ON public.documents_equipment
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. log_document_*_changes → STATEMENT-LEVEL (un solo INSERT...SELECT por lote)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_document_employee_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO documents_employees_logs (documents_employees_id, modified_by, updated_at)
  SELECT id, user_id, now() FROM affected_rows WHERE user_id IS NOT NULL;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS document_employee_changes_trigger ON public.documents_employees;
CREATE TRIGGER document_employee_changes_trigger
  AFTER INSERT ON public.documents_employees
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.log_document_employee_changes();

CREATE OR REPLACE FUNCTION public.log_document_equipment_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO documents_equipment_logs (documents_equipment_id, modified_by, updated_at)
  SELECT id, user_id, now() FROM affected_rows WHERE user_id IS NOT NULL;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS document_equipment_changes_trigger ON public.documents_equipment;
CREATE TRIGGER document_equipment_changes_trigger
  AFTER INSERT ON public.documents_equipment
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.log_document_equipment_changes();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. controlar_alertas_employees / _vehicles → GUARDA DE COLUMNA
--    Que el recálculo pesado de alertas NO se dispare cuando solo cambia `status`.
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS controlar_alertas_employees ON public.employees;
CREATE TRIGGER controlar_alertas_employees
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.company_id IS DISTINCT FROM NEW.company_id)
  EXECUTE FUNCTION public.trg_controlar_alertas_employees();

DROP TRIGGER IF EXISTS controlar_alertas_vehicles ON public.vehicles;
CREATE TRIGGER controlar_alertas_vehicles
  AFTER UPDATE ON public.vehicles
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.company_id IS DISTINCT FROM NEW.company_id)
  EXECUTE FUNCTION public.trg_controlar_alertas_vehicles();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Eliminar el sistema de notificaciones muerto (trigger + función)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS document_update_trigger ON public.documents_employees;
DROP TRIGGER IF EXISTS equipment_update_trigger ON public.documents_equipment;
DROP FUNCTION IF EXISTS public.notify_document_update();
```

- [ ] **Step 3: Aplicar la migración a dev**

```bash
npx prisma db execute --file prisma/migrations/20260629120100_optimize_document_triggers/migration.sql
npx prisma migrate resolve --applied 20260629120100_optimize_document_triggers
```

- [ ] **Step 4: Verificar triggers con MCP `horizonte-dev`**

```sql
SELECT c.relname AS tabla, t.tgname,
       CASE WHEN (t.tgtype::int & 1) = 1 THEN 'ROW' ELSE 'STATEMENT' END AS level
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE c.relname IN ('documents_employees','documents_equipment','employees','vehicles')
  AND NOT t.tgisinternal ORDER BY tabla, t.tgname;
```
Expected: `trg_update_documents_*` y `document_*_changes_trigger` aparecen como `STATEMENT`; `document_update_trigger`/`equipment_update_trigger` ya NO aparecen; `controlar_alertas_*` presentes (ROW, con WHEN). Confirmar también:
```sql
SELECT proname FROM pg_proc WHERE proname='notify_document_update';
```
Expected: vacío.

- [ ] **Step 5: Probar el trigger statement-level con un UPDATE de muestra (1 fila)**

MCP `horizonte-dev` — tomar un empleado con doc pendiente del Art y verificar que su `status` se recalcula:
```sql
-- Antes
SELECT e.status FROM employees e
WHERE e.id = (SELECT applies FROM documents_employees
              WHERE id_document_types='dc21b3c9-8acc-41fe-ad53-ac3c90ab3478' AND state='pendiente' LIMIT 1);
```
(La verificación funcional completa del lote se hace en Task 7.)

---

## Task 3: Server action Prisma `uploadMultiResourceDocument`

**Files:**
- Create: `src/features/Documentacion/shared/actions/upload-multiresource-document.ts`

**Interfaces:**
- Produces:
  ```ts
  // 'use server'
  uploadMultiResourceDocument(formData: FormData): Promise<
    { ok: true; updated: number; created: number } | { ok: false; error: string }
  >
  // FormData keys:
  //   file: File
  //   resource: 'empleado' | 'equipo'
  //   documentTypeId: string (uuid)
  //   appliesIds: string (JSON string de string[])
  //   sharedPath: string (path en storage, ya calculado en el cliente con calculateNameOFDocument)
  //   userId?: string
  //   validity?: string (ISO) | ''
  //   period?: string | ''
  ```

- [ ] **Step 1: Crear la server action**

`src/features/Documentacion/shared/actions/upload-multiresource-document.ts`:

```ts
'use server';

import { prisma } from '@/shared/lib/prisma';
import { supabaseServer } from '@/lib/supabase/server';
import { Logger } from '@/lib/logger';

const logger = new Logger('Documentacion/uploadMultiResourceDocument');

type Result =
  | { ok: true; updated: number; created: number }
  | { ok: false; error: string };

/**
 * Sube un documento multirecurso a TODOS los recursos faltantes de forma atómica.
 * - Sube el archivo al storage (server-side).
 * - Persiste filas en una transacción Prisma: actualiza los `pendiente`, crea los ausentes,
 *   e IGNORA los que ya están `presentado` con archivo (no se pisan).
 * - Si la transacción falla, borra el archivo subido (compensación) → atomicidad efectiva.
 */
export async function uploadMultiResourceDocument(formData: FormData): Promise<Result> {
  const file = formData.get('file') as File | null;
  const resource = formData.get('resource') as 'empleado' | 'equipo' | null;
  const documentTypeId = formData.get('documentTypeId') as string | null;
  const sharedPath = formData.get('sharedPath') as string | null;
  const appliesRaw = formData.get('appliesIds') as string | null;
  const userId = (formData.get('userId') as string | null) || undefined;
  const validityRaw = (formData.get('validity') as string | null) || undefined;
  const period = (formData.get('period') as string | null) || undefined;

  if (!file || !resource || !documentTypeId || !sharedPath || !appliesRaw) {
    return { ok: false, error: 'Faltan datos para subir el documento' };
  }

  let appliesIds: string[];
  try {
    appliesIds = JSON.parse(appliesRaw);
  } catch {
    return { ok: false, error: 'Lista de recursos inválida' };
  }
  if (!appliesIds.length) return { ok: false, error: 'No hay recursos para vincular' };

  const supabase = await supabaseServer();

  // 1. Subir el archivo al storage (upsert: documento compartido por varios recursos)
  const { error: uploadError } = await supabase.storage
    .from('document-files')
    .upload(sharedPath, file, { cacheControl: '0', upsert: true });
  if (uploadError) {
    logger.error('Error al subir archivo multirecurso al storage', { data: { uploadError } });
    return { ok: false, error: 'No se pudo subir el archivo al storage' };
  }

  const validity = validityRaw ? new Date(validityRaw) : null;

  try {
    if (resource === 'empleado') {
      const existing = await prisma.documents_employees.findMany({
        where: { applies: { in: appliesIds }, id_document_types: documentTypeId },
        select: { applies: true, state: true, document_path: true },
      });
      // Ya tienen el documento (presentado con archivo) → ignorar
      const alreadyDone = new Set(
        existing.filter((r) => r.state === 'presentado' && r.document_path).map((r) => r.applies)
      );
      // Tienen fila pero falta el archivo (pendiente / sin path) → actualizar
      const toUpdate = existing
        .filter((r) => !alreadyDone.has(r.applies) && r.applies != null)
        .map((r) => r.applies as string);
      // No tienen ninguna fila → crear
      const withRow = new Set(existing.map((r) => r.applies));
      const toCreate = appliesIds.filter((id) => !withRow.has(id));

      const ops = [];
      if (toUpdate.length) {
        ops.push(
          prisma.documents_employees.updateMany({
            where: { applies: { in: toUpdate }, id_document_types: documentTypeId },
            data: { state: 'presentado', document_path: sharedPath, validity, period, user_id: userId ?? null },
          })
        );
      }
      if (toCreate.length) {
        ops.push(
          prisma.documents_employees.createMany({
            data: toCreate.map((applies) => ({
              applies,
              id_document_types: documentTypeId,
              state: 'presentado' as const,
              document_path: sharedPath,
              validity,
              period,
              user_id: userId ?? null,
            })),
          })
        );
      }
      await prisma.$transaction(ops);
      return { ok: true, updated: toUpdate.length, created: toCreate.length };
    }

    // resource === 'equipo'
    const existing = await prisma.documents_equipment.findMany({
      where: { applies: { in: appliesIds }, id_document_types: documentTypeId },
      select: { applies: true, state: true, document_path: true },
    });
    const alreadyDone = new Set(
      existing.filter((r) => r.state === 'presentado' && r.document_path).map((r) => r.applies)
    );
    const toUpdate = existing
      .filter((r) => !alreadyDone.has(r.applies) && r.applies != null)
      .map((r) => r.applies as string);
    const withRow = new Set(existing.map((r) => r.applies));
    const toCreate = appliesIds.filter((id) => !withRow.has(id));

    const ops = [];
    if (toUpdate.length) {
      ops.push(
        prisma.documents_equipment.updateMany({
          where: { applies: { in: toUpdate }, id_document_types: documentTypeId },
          data: { state: 'presentado', document_path: sharedPath, validity, period, user_id: userId ?? null },
        })
      );
    }
    if (toCreate.length) {
      ops.push(
        prisma.documents_equipment.createMany({
          data: toCreate.map((applies) => ({
            applies,
            id_document_types: documentTypeId,
            state: 'presentado' as const,
            document_path: sharedPath,
            validity,
            period,
            user_id: userId ?? null,
          })),
        })
      );
    }
    await prisma.$transaction(ops);
    return { ok: true, updated: toUpdate.length, created: toCreate.length };
  } catch (error) {
    // Compensación: la BD falló → borrar el archivo subido para no dejar huérfanos
    logger.error('Error al persistir documentos multirecurso; revirtiendo storage', { data: { error } });
    await supabase.storage.from('document-files').remove([sharedPath]);
    return { ok: false, error: 'No se pudieron guardar los documentos. Se revirtió la subida.' };
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: sin errores. (Si el enum `state` exige un tipo específico, Prisma lo infiere del modelo; el literal `'presentado'` debe coincidir con el enum `state` del schema.)

---

## Task 4: Subir el bodySizeLimit de server actions

**Files:**
- Modify: `next.config.*` (raíz del proyecto)

**Interfaces:**
- Consumes: nada. Produces: server actions aceptan `FormData` con archivos hasta 10mb.

- [ ] **Step 1: Localizar la config**

Run: `ls next.config.*`
Abrir el archivo (`next.config.ts` o `.mjs`/`.js`).

- [ ] **Step 2: Agregar/actualizar `serverActions.bodySizeLimit`**

Dentro de la config de Next (en `experimental` si la versión lo requiere, o en `serverActions` top-level según la API de Next 16 — verificar con Context7 MCP `next.config serverActions bodySizeLimit`):

```ts
// Ejemplo (ajustar a la forma existente del archivo):
const nextConfig = {
  // ...config existente...
  experimental: {
    // ...experimental existente...
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};
```

- [ ] **Step 3: Verificar que el server levanta**

El dev server (`http://localhost:3000`) debe recompilar sin error de config. Revisar el log del proceso dev.

---

## Task 5: Frontend — estados de carga + usar la server action (flujo masivo)

**Files:**
- Modify: `src/features/Documentacion/shared/components/UploadDocumentMultiEmployee.tsx`
- Modify: `src/features/Documentacion/shared/components/UploadDocumentMultiEquipment.tsx`
- Modify: `src/features/Documentacion/shared/components/NewDocumentMulti.tsx:85` (botón vacío)

**Interfaces:**
- Consumes: `uploadMultiResourceDocument` (Task 3); `calculateNameOFDocument` de `@/lib/utils`.

- [ ] **Step 1: `UploadDocumentMultiEmployee` — quitar `user_id` del schema Zod**

En el `uploadDocumentSchema`, eliminar el campo:
```ts
// BORRAR estas líneas (causan que el submit muera en silencio sin sesión válida):
user_id: z
  .string()
  .uuid()
  .default(user_id || ''),
```

- [ ] **Step 2: `UploadDocumentMultiEmployee` — reescribir `onSubmit` para usar la server action con estado de carga**

Agregar estado y reemplazar el cuerpo de `onSubmit`. El `document_path` (sharedPath) ya se calcula hoy en el botón "Seleccionar archivo" con `calculateNameOFDocument(...,'multirecursos')` y se guarda en `data.document_path`. Pasar el `File` real (hoy en `selectedFile`) + ese path a la server action:

```ts
const [isSubmitting, setIsSubmitting] = useState(false);

async function onSubmit(data: z.infer<typeof uploadDocumentSchema>) {
  if (!selectedFile) { toast.error('Debe seleccionar un archivo'); return; }
  if (!data.applies?.length) { toast.error('Debe seleccionar al menos un recurso'); return; }

  setIsSubmitting(true);
  try {
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('resource', 'empleado');
    fd.append('documentTypeId', data.id_document_types);
    fd.append('appliesIds', JSON.stringify(data.applies));
    fd.append('sharedPath', data.document_path);
    if (user_id) fd.append('userId', user_id);
    if (data.validity) fd.append('validity', data.validity);
    if (data.period) fd.append('period', data.period);

    const res = await uploadMultiResourceDocument(fd);
    if (!res.ok) { toast.error(res.error); return; }

    toast.success(`Documento cargado (${res.updated + res.created} recursos)`);
    form.reset();
    setSelectedFile(undefined);
    setSelectedDocumentType(undefined);
    setSelectedFileName('');
    router.refresh();
    document.getElementById('close-create-document-modal')?.click();
  } catch (error) {
    logger.error('Error al cargar documento multirecurso de empleados', { data: { error } });
    toast.error(error instanceof Error ? error.message : 'No se pudo cargar el documento');
  } finally {
    setIsSubmitting(false);
  }
}
```
Importar la action: `import { uploadMultiResourceDocument } from '@/features/Documentacion/shared/actions/upload-multiresource-document';`

- [ ] **Step 3: `UploadDocumentMultiEmployee` — botón Enviar con estado de carga**

```tsx
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Enviando…' : 'Enviar'}
</Button>
```
Y el botón Cancelar también `disabled={isSubmitting}`.

- [ ] **Step 4: `UploadDocumentMultiEquipment` — mismos cambios con `resource: 'equipo'`**

Aplicar Steps 1-3 análogos: quitar `user_id` del schema, `onSubmit` que arma `FormData` con `fd.append('resource','equipo')` y llama a `uploadMultiResourceDocument`, botón con `isSubmitting`. (El cálculo del `sharedPath` para equipos usa `'equipos'` como `appliesPathName`; mantener el path que ya calcula el componente.)

- [ ] **Step 5: Revisar el botón vacío (`NewDocumentMulti.tsx:85`)**

El `AlertDialogCancel className="hidden" id="close-create-document-modal"` se ve como un cuadrito vacío. Reemplazar por un cierre no visible que conserve el `id` para el `.click()` programático, sin renderizar un botón con estilos. Opción:
```tsx
<AlertDialogFooter className="hidden">
  <AlertDialogCancel id="close-create-document-modal">Cerrar</AlertDialogCancel>
</AlertDialogFooter>
```
Verificar visualmente que el cuadrito desaparece y que el cierre programático sigue funcionando.

- [ ] **Step 6: Verificar tipos**

Run: `npm run check-types`
Expected: sin errores.

---

## Task 6: Limpieza del sistema de notificaciones muerto

**Files:**
- Delete: `src/features/Layout/navbar/components/modals/_NotificationsModal.tsx`
- Delete: `src/features/Layout/navbar/components/ui/_NotificationItem.tsx`
- Modify: `src/features/Layout/navbar/actions/actions.navbar.ts` (quitar `getUserNotifications`, `deleteNotification`, `deleteAllNotifications`)
- Modify: `src/shared/store/loggedUser.ts` (quitar `allNotifications`, `markAllAsRead`, campo `notifications` y su carga en el cambio de empresa)
- Modify: `src/features/Layout/navbar/types/navbar.types.ts` (quitar prop comentado `notifications`)
- Modify: `src/features/Layout/navbar/components/Navbar.tsx` (quitar import e invocación comentados)
- Modify: `src/shared/types/legacy.ts` (quitar tipo `Notifications`/`FormattedNotifications` si quedan sin uso)

**Interfaces:**
- Consumes: la migración de Task 2 ya eliminó el trigger que escribía la tabla.

- [ ] **Step 1: Buscar todos los usos antes de borrar**

Run (Grep): `getUserNotifications|deleteNotification|deleteAllNotifications|allNotifications|markAllAsRead|_NotificationsModal|_NotificationItem|FormattedNotifications`
Confirmar que, fuera de los archivos listados, no haya consumidores vivos (la auditoría indicó que no los hay; reverificar antes de borrar).

- [ ] **Step 2: Borrar componentes y eliminar funciones/campos**

Eliminar los dos archivos de componentes; quitar las 3 server actions de `actions.navbar.ts`; quitar `allNotifications`/`markAllAsRead`/`notifications` del store y la llamada a `allNotifications()` en el handler de cambio de empresa (`loggedUser.ts:406`); quitar el prop comentado y el import/invocación comentados del Navbar; quitar tipos sin uso.

- [ ] **Step 3: Verificar tipos (detecta imports rotos)**

Run: `npm run check-types`
Expected: sin errores. Si algún archivo importaba algo eliminado, corregir el import.

---

## Task 7: Verificación end-to-end del flujo masivo (escenario clonado)

**Files:** ninguno (verificación).

- [ ] **Step 1: Estado inicial en MCP `horizonte-dev`**

```sql
SELECT state, count(*) FROM documents_employees
WHERE id_document_types='dc21b3c9-8acc-41fe-ad53-ac3c90ab3478' GROUP BY state;
```
Expected: `pendiente` = 573, `presentado` = 0.

- [ ] **Step 2: Cargar el ART masivo desde la UI**

En `http://localhost:3000/dashboard/document` → "Documento Multirecurso" → tab Empleados → tipo "Art" → seleccionar todos (573) → elegir archivo → **Enviar**.
Expected: el botón muestra "Enviando…" (disabled), la operación **completa en segundos**, toast de éxito y el modal se cierra. La pestaña Network ya NO muestra una petición `documents_employees?...in.(...)` colgada.

- [ ] **Step 3: Verificar persistencia y status en MCP `horizonte-dev`**

```sql
SELECT state, count(*) FILTER (WHERE document_path IS NOT NULL) AS con_archivo, count(*)
FROM documents_employees WHERE id_document_types='dc21b3c9-8acc-41fe-ad53-ac3c90ab3478' GROUP BY state;
-- Status de empleados afectados:
SELECT status, count(*) FROM employees
WHERE company_id='be4119b0-12ca-4a8f-87ed-209239194dab' AND is_active GROUP BY status;
```
Expected: `presentado` ≈ 573 con archivo; los `status` de empleados recalculados sin timeout.

- [ ] **Step 4: Verificar "solo faltantes" (idempotencia)**

Volver a abrir el modal y cargar el mismo Art de nuevo.
Expected: completa sin error; los ya presentados se ignoran (no se duplican filas). Confirmar:
```sql
SELECT applies, count(*) FROM documents_employees
WHERE id_document_types='dc21b3c9-8acc-41fe-ad53-ac3c90ab3478'
GROUP BY applies HAVING count(*) > 1;
```
Expected: vacío (sin duplicados).

---

## Task 8: Flujo individual `SimpleDocument` (el "error 2")

**Files:**
- Modify: `src/features/Documentacion/shared/components/SimpleDocument.tsx` (según diagnóstico)

- [ ] **Step 1: Reproducir el error en local**

En la tabla de documentos de UN empleado, usar "Subir documento" (abre `SimpleDocument`) sobre un tipo multirecurso (ART). Capturar el error exacto en consola/Network.

- [ ] **Step 2: Diagnosticar la causa raíz** (systematic-debugging)

Comparar con el flujo masivo ya arreglado. Si el origen es el mismo (`uploadDocument` con `.in()` o el `user_id`), aplicar el fix análogo: para el caso multirecurso reutilizar `uploadMultiResourceDocument`; normalizar `user_id` vacío a null.

- [ ] **Step 3: Implementar el fix mínimo y verificar**

Run: `npm run check-types` + reproducción manual: subir de a uno completa sin error y persiste.

---

## Self-Review (cobertura del spec)

- A (índices) → Task 1 ✓
- B (triggers statement-level, guarda, eliminar notify) → Task 2 ✓
- C (server action Prisma + transacción + compensación + solo faltantes) → Task 3 ✓
- bodySizeLimit → Task 4 ✓
- D (estados de carga, quitar user_id zod, botón vacío) → Task 5 ✓
- E (limpieza notificaciones) → Task 6 ✓
- Verificación end-to-end + idempotencia → Task 7 ✓
- F (flujo individual) → Task 8 ✓

## Commit final (cuando el usuario lo pida)

Un único commit agrupando migraciones + server action + frontend + limpieza. Mensaje sugerido:
`fix(documentacion): carga masiva multirecurso eficiente y atomica (triggers statement-level, server action Prisma)`
(Sin `Co-Authored-By` ni referencias a herramientas, por regla del proyecto.)
