# COD-580 + COD-581 — Plan de implementación: aviso de duplicados al clonar partes diarios

> **Para agentes ejecutores:** Este plan se implementa con `superpowers:subagent-driven-development` o `superpowers:executing-plans`. Steps usan checkbox (`- [ ]`).
>
> **Regla del usuario (override absoluto):** **NO commitear** después de cada tarea ni al final. El usuario commitea manualmente cuando lo pida explícitamente. Por eso las tareas NO incluyen pasos de `git add` / `git commit`. Si una skill cargada dice "commit your work", se ignora — esta regla del usuario tiene prioridad máxima.
>
> **Verificación**: este repo no tiene tests unitarios (solo Cypress E2E). La verificación de cada tarea es: `npm run check-types` + revisión manual con MCP `supabase-LOCAL` (readonly) cuando aplique.

**Goal:** Permitir que el usuario detecte y resuelva clonaciones duplicadas en `dailyreportrows` antes de ejecutar el clone, agregando trazabilidad del row padre y un flujo de revisión dentro del `CloneRowsDialog` existente. Bloquear los botones del flow durante el submit para evitar interrupciones.

**Architecture:** Nueva columna `cloned_from_row_id` (UUID self-FK nullable) en `dailyreportrows` poblada por `cloneDailyReportRows`. Nueva server action `getCloneConflicts` que se ejecuta antes del clone. El dialog `CloneRowsDialog` se convierte en un wizard de dos vistas (`select` ↔ `conflicts`) dentro del mismo `DialogContent`, sin modales encadenados. Filtrado opcional per-`(rowId, fecha)` mediante `skipRowIdsByDate` en el clone.

**Tech Stack:** Next.js 16 / React 19 + Server Actions, Prisma (Supabase PostgreSQL), Zod, React Query, shadcn/ui, Tailwind, moment, Lucide.

**Spec asociada:** `docs/superpowers/specs/2026-05-06-cod580-cod581-clone-conflict-warning-design.md`

**Branch destino:** `cod-580-581-clone-conflict-warning` (NO usar la branch sugerida por Linear).

---

## File Structure

### Archivos nuevos

| Archivo                                                                                    | Responsabilidad                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/migrations/20260506HHMMSS_add_cloned_from_row_id_to_dailyreportrows/migration.sql` | Migración SQL: agrega columna + FK self + índice parcial.                                                                           |
| `src/features/Operaciones/PartesDiarios/detail/components/CloneRowsConflictView.tsx`       | Subcomponente puro de presentación de la Vista 2 (lista agrupada por fecha + footer con 3 acciones). Recibe props del dialog padre. |

### Archivos modificados

| Archivo                                                                        | Cambio                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                         | Self-relation `cloned_from_row` / `clones` en el modelo `dailyreportrows`.                                                                                                                                           |
| `src/features/Operaciones/PartesDiarios/detail/actions.server.ts`              | (a) `cloneDailyReportRows`: parámetro `skipRowIdsByDate`, set de `cloned_from_row_id`, no crear header si no quedan rows. (b) Nueva server action `getCloneConflicts` y tipos. (c) Tipo exportado `ConflictsByDate`. |
| `src/features/Operaciones/PartesDiarios/detail/components/CloneRowsDialog.tsx` | Refactor: dos vistas (`select` / `conflicts`) en un solo `DialogContent`. Mutación `checkConflictsMutation` previa al clone. Lock de botones en `isPending`. Reset de `conflicts` al cambiar selección.              |

---

## Task 1 — Generar la migración SQL de la columna

**Files:**

- Create: `prisma/migrations/<timestamp>_add_cloned_from_row_id_to_dailyreportrows/migration.sql`

**Contexto:** Se sigue el flujo de `.claude/rules/migrations.md` — diff → carpeta → SQL → db execute → resolve → generate. **NO usar `npx prisma migrate dev`** (rompe por el shadow database).

- [ ] **Step 1.1: Modificar `prisma/schema.prisma`** — agregar la self-relation al modelo `dailyreportrows`.

Ubicación: el modelo `dailyreportrows` empieza en `prisma/schema.prisma:1214`. Agregar dos líneas dentro del modelo, ordenadas alfabéticamente respecto a otras relaciones:

```prisma
model dailyreportrows {
  // ... campos existentes ...
  preparte_id                              String?                                    @unique @db.Uuid
  last_comercial_edit_at                   DateTime?                                  @db.Timestamp(6)
  cloned_from_row_id                       String?                                    @db.Uuid
  // ... relaciones existentes (después del bloque de campos) ...
  cloned_from_row                          dailyreportrows?                           @relation("DailyReportRowClones", fields: [cloned_from_row_id], references: [id], onDelete: SetNull, onUpdate: NoAction)
  clones                                   dailyreportrows[]                          @relation("DailyReportRowClones")
  // ... resto de relaciones existentes ...
}
```

> **Cuidado**: ubicar `cloned_from_row_id` junto a los otros campos escalares (antes de las relaciones), y las dos relaciones nuevas dentro del bloque de relaciones — NO mezclar.

- [ ] **Step 1.2: Generar el diff SQL contra el schema**

Run:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Expected output (extraer solo lo relevante — ignorar drift colateral):

```sql
ALTER TABLE "dailyreportrows" ADD COLUMN "cloned_from_row_id" UUID;

ALTER TABLE "dailyreportrows" ADD CONSTRAINT "dailyreportrows_cloned_from_row_id_fkey"
  FOREIGN KEY ("cloned_from_row_id") REFERENCES "dailyreportrows"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
```

- [ ] **Step 1.3: Crear la carpeta de migración**

Reemplazar `<TS>` por timestamp `YYYYMMDDHHMMSS` (ej: `20260506140000`):

```bash
mkdir prisma/migrations/<TS>_add_cloned_from_row_id_to_dailyreportrows
```

- [ ] **Step 1.4: Escribir `migration.sql`**

Crear `prisma/migrations/<TS>_add_cloned_from_row_id_to_dailyreportrows/migration.sql`:

```sql
-- Add cloned_from_row_id self-reference to dailyreportrows for clone traceability (COD-581)

ALTER TABLE "dailyreportrows"
  ADD COLUMN "cloned_from_row_id" UUID;

ALTER TABLE "dailyreportrows"
  ADD CONSTRAINT "dailyreportrows_cloned_from_row_id_fkey"
  FOREIGN KEY ("cloned_from_row_id")
  REFERENCES "dailyreportrows"("id")
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

CREATE INDEX "idx_dailyreportrows_cloned_from_row_id"
  ON "dailyreportrows" ("cloned_from_row_id")
  WHERE "cloned_from_row_id" IS NOT NULL;
```

> El índice parcial es deliberado — la mayoría de rows tendrán `NULL` (rows creadas manualmente sin clonar).

- [ ] **Step 1.5: Aplicar la migración**

```bash
npx prisma db execute --file prisma/migrations/<TS>_add_cloned_from_row_id_to_dailyreportrows/migration.sql
```

- [ ] **Step 1.6: Registrar la migración como aplicada**

```bash
npx prisma migrate resolve --applied <TS>_add_cloned_from_row_id_to_dailyreportrows
```

- [ ] **Step 1.7: Regenerar el cliente Prisma**

```bash
npx prisma generate
```

- [ ] **Step 1.8: Verificar con MCP `supabase-LOCAL` (readonly)**

Ejecutar via MCP `supabase-LOCAL execute_sql`:

```sql
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'dailyreportrows'
  AND column_name = 'cloned_from_row_id';

SELECT conname, contype, confdeltype, confupdtype
FROM pg_constraint
WHERE conname = 'dailyreportrows_cloned_from_row_id_fkey';

SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname = 'idx_dailyreportrows_cloned_from_row_id';
```

Expected:

- columna `cloned_from_row_id` tipo `uuid`, `is_nullable = YES`
- constraint con `confdeltype = 'n'` (SET NULL)
- índice parcial con `WHERE cloned_from_row_id IS NOT NULL`

- [ ] **Step 1.9: Verificación de tipos**

```bash
npm run check-types
```

Expected: no errors. La self-relation queda disponible en `prisma.dailyreportrows.findMany({ include: { cloned_from_row: true, clones: true } })`.

---

## Task 2 — Extender `cloneDailyReportRows` con `cloned_from_row_id` y `skipRowIdsByDate`

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/actions.server.ts:1517-1737`

- [ ] **Step 2.1: Extender `CloneRowsOptions`**

Localizar la interfaz (línea 1517 aprox.) y agregar el nuevo campo:

```typescript
export interface CloneRowsOptions {
  /** Si true, copia empleados activos de las filas originales */
  includeEmployees?: boolean;
  /** Si true, copia equipos (vehículos + otros) de las filas originales */
  includeEquipment?: boolean;
  /**
   * Si se provee y rowIds está vacío, clona TODAS las filas del parte indicado.
   * Permite el flujo "Clonar todo el parte" sin selección previa.
   */
  cloneAllFromReportId?: string;
  /**
   * Filtro opcional de tipos de servicio a incluir (solo aplica en modo "clonar todo").
   * Si no se provee, se incluyen todos los tipos.
   */
  typeServiceFilter?: Array<'mensual' | 'adicional' | 'adicional_permanente'>;
  /**
   * Map de `targetDate (YYYY-MM-DD) → array de rowIds a omitir en esa fecha`.
   * Permite clonar el resto de las rows en fechas con conflictos parciales.
   * Si una fecha no está en el map, se clonan todas las rows.
   */
  skipRowIdsByDate?: Record<string, string[]>;
}
```

- [ ] **Step 2.2: Aplicar el skip per-fecha y setear `cloned_from_row_id`**

Dentro del loop `for (const targetDate of targetDates)` (línea 1637 aprox.), agregar el filtrado al inicio del loop interno y el campo en el `create`:

```typescript
for (const targetDate of targetDates) {
  // Resolver rows efectivas para ESTA fecha (aplica skip si corresponde)
  const skipForDate = options.skipRowIdsByDate?.[targetDate] ?? [];
  const rowsForThisDate = skipForDate.length ? originalRows.filter((r) => !skipForDate.includes(r.id)) : originalRows;

  // Si no quedan rows para clonar en esta fecha, no crear header ni transacción
  if (rowsForThisDate.length === 0) {
    continue;
  }

  let report = existingByDate.get(targetDate);

  if (!report) {
    // Crear el parte diario para esta fecha
    report = await prisma.dailyreport.create({
      data: {
        id: crypto.randomUUID(),
        date: new Date(targetDate),
        company_id: companyId,
      },
      select: { id: true, date: true },
    });
    createdReportIds.push(report.id);
  }

  allReportIds.push(report.id);
  const targetReportId = report.id;

  // Clonar todas las filas para esta fecha en una transacción
  await withAuditUser(async (tx) => {
    for (const originalRow of rowsForThisDate) {
      // ... (mismo código de empleados/equipos/customer equipment) ...

      const newRowId = crypto.randomUUID();

      await tx.dailyreportrows.create({
        data: {
          id: newRowId,
          daily_report_id: targetReportId,
          customer_id: originalRow.customer_id,
          service_id: originalRow.service_id,
          item_id: originalRow.item_id,
          working_day: originalRow.working_day,
          start_time: originalRow.start_time,
          end_time: originalRow.end_time,
          description: originalRow.description,
          areas_service_id: originalRow.areas_service_id,
          sector_service_id: originalRow.sector_service_id,
          type_service: originalRow.type_service,
          status: newStatus,
          cloned_from_row_id: originalRow.id, // ← NUEVO: trazabilidad COD-581
        },
      });

      await createRowRelations(
        tx,
        newRowId,
        employeesToCopy,
        vehiclesToCopy,
        otherEquipmentToCopy,
        customerEquipmentToCopy
      );

      totalCloned++;
    }
  });
}
```

> **Cuidado**: el array `originalRows` es del scope externo (cargado una sola vez antes del loop). El nuevo `rowsForThisDate` es derivado por iteración. NO modificar `originalRows`.
> **Cuidado**: la verificación `if (rowsForThisDate.length === 0) continue;` debe ir ANTES del `existingByDate.get(targetDate)` para no consumir nada de DB si no hay nada que hacer en la fecha.

- [ ] **Step 2.3: Verificación de tipos**

```bash
npm run check-types
```

Expected: no errors.

---

## Task 3 — Implementar `getCloneConflicts`

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/actions.server.ts` (agregar al final, antes del `export type CloneDailyReportRowsResult` o después).

- [ ] **Step 3.1: Definir tipos exportados**

Agregar al archivo (después de `export type CloneDailyReportRowsResult = ...`):

```typescript
export interface CloneConflictRow {
  id: string;
  cloned_from_row_id: string;
  customerName: string | null;
  serviceName: string | null;
  itemName: string | null;
  sectorName: string | null;
  areaName: string | null;
  workingDay: string | null;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  typeService: 'mensual' | 'adicional' | 'adicional_permanente' | null;
  clonedAt: string | null;
}

export interface CloneConflictsByDate {
  /** Map de targetDate (YYYY-MM-DD) → conflictos en esa fecha. Solo incluye fechas con al menos un conflicto. */
  conflicts: Record<string, CloneConflictRow[]>;
  /** Total sumado de todos los conflictos. */
  totalCount: number;
  /** Map sugerido para el botón "Excluir duplicados": targetDate → rowIds (de los seleccionados) que tienen clon previo en esa fecha. */
  skipMap: Record<string, string[]>;
}
```

- [ ] **Step 3.2: Implementar la función**

Agregar después de `cloneDailyReportRows`:

```typescript
/**
 * Verifica si las rows a clonar ya fueron clonadas previamente a las fechas destino.
 *
 * Para cada `(rowId, targetDate)` busca si existe un `dailyreportrows` cuyo
 * `cloned_from_row_id ∈ effectiveRowIds` dentro del `dailyreport` correspondiente
 * a esa fecha y la `company_id` actual.
 *
 * Si `rowIds` está vacío y hay `cloneAllFromReportId`, primero resuelve las rows
 * efectivas (mismo comportamiento que `cloneDailyReportRows`).
 */
export async function getCloneConflicts(
  rowIds: string[],
  targetDates: string[],
  cloneAllFromReportId?: string,
  typeServiceFilter?: Array<'mensual' | 'adicional' | 'adicional_permanente'>
): Promise<CloneConflictsByDate> {
  logger.debug('Buscando conflictos de clonación', {
    data: { rowCount: rowIds.length, dateCount: targetDates.length, cloneAllFromReportId },
  });

  if (targetDates.length === 0) {
    return { conflicts: {}, totalCount: 0, skipMap: {} };
  }

  try {
    // 1. Resolver rows efectivas (mismo flujo que el clone)
    let effectiveRowIds = rowIds;
    if (effectiveRowIds.length === 0) {
      if (!cloneAllFromReportId) {
        return { conflicts: {}, totalCount: 0, skipMap: {} };
      }
      const allRows = await prisma.dailyreportrows.findMany({
        where: {
          daily_report_id: cloneAllFromReportId,
          ...(typeServiceFilter?.length ? { type_service: { in: typeServiceFilter } } : {}),
        },
        select: { id: true },
      });
      effectiveRowIds = allRows.map((r) => r.id);
      if (effectiveRowIds.length === 0) {
        return { conflicts: {}, totalCount: 0, skipMap: {} };
      }
    }

    // 2. Obtener company_id desde la cookie
    const { cookies } = await import('next/headers');
    const { getCompanyId } = await import('@/lib/company-config');
    const cookieStore = await cookies();
    const companyId = getCompanyId(cookieStore.get('actualComp')?.value);

    // 3. Resolver dailyreports destino
    const reports = await prisma.dailyreport.findMany({
      where: {
        date: { in: targetDates.map((d) => new Date(d)) },
        company_id: companyId,
      },
      select: { id: true, date: true },
    });

    if (reports.length === 0) {
      return { conflicts: {}, totalCount: 0, skipMap: {} };
    }

    const reportIdToDate = new Map(reports.map((r) => [r.id, moment(r.date).format('YYYY-MM-DD')]));

    // 4. Buscar rows duplicadas en esos partes
    const duplicatedRows = await prisma.dailyreportrows.findMany({
      where: {
        daily_report_id: { in: reports.map((r) => r.id) },
        cloned_from_row_id: { in: effectiveRowIds },
      },
      select: {
        id: true,
        cloned_from_row_id: true,
        daily_report_id: true,
        working_day: true,
        start_time: true,
        end_time: true,
        description: true,
        type_service: true,
        created_at: true,
        customers: { select: { name: true } },
        customer_services: { select: { service_name: true } },
        service_items: { select: { item_name: true } },
        service_sectors: { select: { sectors: { select: { name: true } } } },
        service_areas: { select: { areas_cliente: { select: { descripcion_corta: true } } } },
      },
    });

    // 5. Componer el resultado agrupado por fecha
    const conflicts: Record<string, CloneConflictRow[]> = {};
    const skipMap: Record<string, string[]> = {};

    for (const dup of duplicatedRows) {
      const targetDate = reportIdToDate.get(dup.daily_report_id ?? '') ?? null;
      if (!targetDate || !dup.cloned_from_row_id) continue;

      const formatTime = (t: Date | null) => {
        if (!t) return null;
        const hh = String(t.getUTCHours()).padStart(2, '0');
        const mm = String(t.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      };

      const conflictRow: CloneConflictRow = {
        id: dup.id,
        cloned_from_row_id: dup.cloned_from_row_id,
        customerName: dup.customers?.name ?? null,
        serviceName: dup.customer_services?.service_name ?? null,
        itemName: dup.service_items?.item_name ?? null,
        sectorName: dup.service_sectors?.sectors?.name ?? null,
        areaName: dup.service_areas?.areas_cliente?.descripcion_corta ?? null,
        workingDay: dup.working_day,
        startTime: formatTime(dup.start_time),
        endTime: formatTime(dup.end_time),
        description: dup.description,
        typeService: dup.type_service,
        clonedAt: dup.created_at?.toISOString() ?? null,
      };

      if (!conflicts[targetDate]) conflicts[targetDate] = [];
      conflicts[targetDate].push(conflictRow);

      if (!skipMap[targetDate]) skipMap[targetDate] = [];
      if (!skipMap[targetDate].includes(dup.cloned_from_row_id)) {
        skipMap[targetDate].push(dup.cloned_from_row_id);
      }
    }

    const totalCount = Object.values(conflicts).reduce((sum, arr) => sum + arr.length, 0);

    return { conflicts, totalCount, skipMap };
  } catch (error) {
    logger.error('Error al verificar conflictos de clonación', { data: { error } });
    throw new Error('No se pudieron verificar los registros existentes. Intentá nuevamente.');
  }
}
```

- [ ] **Step 3.3: Verificación de tipos**

```bash
npm run check-types
```

Expected: no errors. La función está disponible para importar desde el dialog.

- [ ] **Step 3.4: Smoke test manual con MCP `supabase-LOCAL`**

Verificar que la query base funciona consultando un caso conocido (si hay rows clonadas previas). Si no hay datos previos (DB limpia), saltar este paso — se valida en Task 7 con datos de prueba.

```sql
-- Confirmar que la columna existe y la query no rompe (debe retornar 0 rows en DB limpia)
SELECT id, cloned_from_row_id
FROM dailyreportrows
WHERE cloned_from_row_id IS NOT NULL
LIMIT 5;
```

---

## Task 4 — Crear `CloneRowsConflictView` (Vista 2 del dialog)

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/components/CloneRowsConflictView.tsx`

- [ ] **Step 4.1: Crear el componente**

```tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { dailyReportTypeServiceLabels } from '@/shared/utils/mappers';
import { AlertTriangle, ArrowLeft, Calendar as CalendarIcon, Copy } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import type { CloneConflictRow, CloneConflictsByDate } from '../actions.server';

moment.locale('es');

interface Props {
  conflicts: CloneConflictsByDate;
  isCloning: boolean;
  onBack: () => void;
  onSkipAndClone: () => void;
  onCloneAnyway: () => void;
}

export function CloneRowsConflictView({ conflicts, isCloning, onBack, onSkipAndClone, onCloneAnyway }: Props) {
  // Ordenar fechas ascendente
  const sortedDates = Object.keys(conflicts.conflicts).sort();

  return (
    <div className="flex flex-col gap-4">
      {/* Mensaje principal con icono ámbar */}
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Ya clonaste estos registros antes</p>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Encontramos <span className="font-semibold">{conflicts.totalCount}</span>{' '}
            {conflicts.totalCount === 1 ? 'registro ya clonado' : 'registros ya clonados'} desde tu selección a las
            fechas destino. Revisalos antes de continuar.
          </p>
        </div>
      </div>

      {/* Lista agrupada por fecha */}
      <ScrollArea className="max-h-[40vh] pr-2">
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const items = conflicts.conflicts[dateKey];
            const formattedDate = moment(dateKey).format('dddd D [de] MMMM, YYYY');
            return (
              <section key={dateKey} className="space-y-2">
                <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-background/95 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  <h4 className="text-sm font-medium capitalize">{formattedDate}</h4>
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-medium">
                    {items.length} {items.length === 1 ? 'duplicado' : 'duplicados'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <ConflictCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer con 3 acciones */}
      <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onBack} disabled={isCloning}>
          <ArrowLeft className="mr-1.5 size-3.5" />
          Volver a la selección
        </Button>
        <Button variant="outline" onClick={onSkipAndClone} disabled={isCloning}>
          Excluir duplicados y clonar el resto
        </Button>
        <Button onClick={onCloneAnyway} disabled={isCloning}>
          {isCloning ? 'Clonando...' : 'Clonar igualmente'}
        </Button>
      </div>
    </div>
  );
}

function ConflictCard({ item }: { item: CloneConflictRow }) {
  const lineParts = [item.customerName, item.serviceName, item.itemName].filter(Boolean).join(' · ');
  const meta = [
    item.sectorName,
    item.areaName,
    item.workingDay,
    item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : null,
    item.typeService ? dailyReportTypeServiceLabels[item.typeService] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const clonedAtText = item.clonedAt ? moment(item.clonedAt).format('DD/MM HH:mm') : null;

  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={cn('truncate text-sm font-medium', !lineParts && 'italic text-muted-foreground')}>
            {lineParts || 'Sin información de cliente/servicio'}
          </p>
          {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
          {item.description && <p className="line-clamp-1 text-xs italic text-muted-foreground">{item.description}</p>}
        </div>
        {clonedAtText && (
          <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
            <Copy className="size-3" />
            <span>Clonada {clonedAtText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

> **Cuidado con los imports**: `dailyReportTypeServiceLabels` viene de `@/shared/utils/mappers` (verificar que esté exportado allí; si no, usar el path donde está definido — buscar con `Grep` antes).

- [ ] **Step 4.2: Verificación de tipos**

```bash
npm run check-types
```

Expected: no errors.

---

## Task 5 — Refactor de `CloneRowsDialog` para soportar dos vistas

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/components/CloneRowsDialog.tsx` (refactor mayor del componente).

- [ ] **Step 5.1: Agregar imports nuevos**

Reemplazar el bloque de imports actual añadiendo:

```typescript
import { cloneDailyReportRows, getCloneConflicts, getDailyReportTypeServiceSummary } from '../actions.server';
import type { CloneConflictsByDate } from '../actions.server';
import { CloneRowsConflictView } from './CloneRowsConflictView';
```

- [ ] **Step 5.2: Agregar estado de vista y conflictos**

Dentro del componente `CloneRowsDialog`, después de la línea de `const isAllMode = mode === 'all'`:

```typescript
// ── Estado de vista (select | conflicts) y conflictos ───────────────────
type DialogView = 'select' | 'conflicts';
const [view, setView] = useState<DialogView>('select');
const [conflicts, setConflicts] = useState<CloneConflictsByDate | null>(null);
```

- [ ] **Step 5.3: Reset de conflictos al cambiar selección**

Agregar un `useEffect` que limpie `conflicts` y vuelva a `view = 'select'` cuando cambian las dependencias de la consulta (fechas, tipos):

```typescript
// Si el usuario cambia la selección, los conflictos previos se invalidan
useEffect(() => {
  setConflicts(null);
}, [selectedDates.length, includeMensuales, includeAdicionales, includeAdicionalesPermanentes]);
```

> Se usa `selectedDates.length` en lugar de `selectedDates` directamente para evitar runs innecesarios cuando React Strict Mode genera nuevas referencias del array. Si `length` no cambia pero las fechas sí, igual se invalida via los toggles de tipos o el `handleClose`.

> **Mejor**: usamos un signature hash para cubrir el caso "mismo length, distintas fechas":

Reemplazar el efecto anterior por:

```typescript
const selectionSignature = useMemo(() => {
  const dates = [...selectedDates]
    .map((d) => d.toDateString())
    .sort()
    .join('|');
  return `${dates}::${includeMensuales}::${includeAdicionales}::${includeAdicionalesPermanentes}`;
}, [selectedDates, includeMensuales, includeAdicionales, includeAdicionalesPermanentes]);

useEffect(() => {
  setConflicts(null);
  if (view === 'conflicts') setView('select');
}, [selectionSignature]);
```

- [ ] **Step 5.4: Agregar la mutación de check de conflictos**

Justo arriba de la mutación existente `useMutation` (línea ~108), agregar:

```typescript
// ── Mutación de verificación de conflictos ─────────────────────────────
const { mutate: checkConflicts, isPending: isCheckingConflicts } = useMutation({
  mutationFn: () => {
    const targetDates = selectedDates.map((d) => moment(d).format('YYYY-MM-DD'));

    if (isAllMode) {
      const typeFilter: Array<'mensual' | 'adicional' | 'adicional_permanente'> = [];
      if (includeMensuales) typeFilter.push('mensual');
      if (includeAdicionales) typeFilter.push('adicional');
      if (includeAdicionalesPermanentes) typeFilter.push('adicional_permanente');
      return getCloneConflicts([], targetDates, dailyReportId, typeFilter.length ? typeFilter : undefined);
    }

    const rowIds = selectedRows.map((r) => r.id);
    return getCloneConflicts(rowIds, targetDates);
  },
  onSuccess: (result) => {
    if (result.totalCount === 0) {
      // No hay conflictos → ejecutar clone directo sin filtros
      setConflicts(null);
      executeMutate(undefined);
      return;
    }
    // Hay conflictos → mostrar vista de revisión
    setConflicts(result);
    setView('conflicts');
  },
  onError: (error: Error) => {
    toast.error(error.message ?? 'No se pudieron verificar los registros existentes');
  },
});
```

- [ ] **Step 5.5: Refactor de la mutación de clone para aceptar `skipRowIdsByDate`**

Reemplazar la mutación existente `const { mutate, isPending } = useMutation({...})` por una helper `executeMutate(skipMap)` y la mutación misma:

```typescript
// ── Mutación de clone ──────────────────────────────────────────────────
const { mutate: cloneMutate, isPending: isCloning } = useMutation({
  mutationFn: (skipRowIdsByDate: Record<string, string[]> | undefined) => {
    const targetDates = selectedDates.map((d) => moment(d).format('YYYY-MM-DD'));

    if (isAllMode) {
      const typeFilter: Array<'mensual' | 'adicional' | 'adicional_permanente'> = [];
      if (includeMensuales) typeFilter.push('mensual');
      if (includeAdicionales) typeFilter.push('adicional');
      if (includeAdicionalesPermanentes) typeFilter.push('adicional_permanente');

      return cloneDailyReportRows([], targetDates, {
        includeEmployees,
        includeEquipment,
        cloneAllFromReportId: dailyReportId,
        ...(typeFilter.length > 0 ? { typeServiceFilter: typeFilter } : {}),
        ...(skipRowIdsByDate ? { skipRowIdsByDate } : {}),
      });
    }

    const rowIds = selectedRows.map((r) => r.id);
    return cloneDailyReportRows(rowIds, targetDates, {
      includeEmployees,
      includeEquipment,
      ...(skipRowIdsByDate ? { skipRowIdsByDate } : {}),
    });
  },
  onSuccess: (result) => {
    const dateCount = selectedDates.length;

    if (result.clonedRowCount === 0) {
      toast.warning('No quedaron registros para clonar después de excluir los duplicados');
    } else {
      toast.success(
        `Se clonaron ${result.clonedRowCount} registros en ${dateCount} ${dateCount === 1 ? 'fecha' : 'fechas'}`
      );
    }

    const reportIds = result.allReportIds ?? [];
    const shouldNavigate =
      navigateAfterClone && selectedDates.length === 1 && reportIds.length > 0 && result.clonedRowCount > 0;

    const navigateToId = shouldNavigate ? reportIds[0] : null;

    handleClose();
    onSuccess();

    if (navigateToId) {
      setTimeout(() => {
        router.push(`/dashboard/operations/${navigateToId}`);
      }, 300);
    }
  },
  onError: (error: Error) => {
    toast.error(error.message ?? 'Ocurrió un error al clonar los registros');
  },
});

const executeMutate = (skipMap: Record<string, string[]> | undefined) => cloneMutate(skipMap);
```

> **Cuidado**: el `clonedRowCount === 0` ahora puede ocurrir cuando el usuario excluye todos los duplicados Y todas las fechas ya tenían conflicto. Por eso el toast cambia a `warning` en ese caso y NO navega.

- [ ] **Step 5.6: Adaptar `handleClose` para resetear vista**

Reemplazar la función `handleClose` actual:

```typescript
function handleClose() {
  onOpenChange(false);
  setSelectedDates([]);
  setIncludeEmployees(false);
  setIncludeEquipment(false);
  setNavigateAfterClone(true);
  setView('select');
  setConflicts(null);
}
```

- [ ] **Step 5.7: Adaptar `handleSubmit` para disparar el check primero**

Reemplazar `handleSubmit`:

```typescript
function handleSubmit() {
  if (selectedDates.length === 0) {
    toast.error('Debes seleccionar al menos una fecha para clonar los registros');
    return;
  }

  if (isAllMode && !includeMensuales && !includeAdicionales && !includeAdicionalesPermanentes) {
    toast.error('Debes seleccionar al menos un tipo de registro a clonar');
    return;
  }

  // Si ya teníamos conflictos calculados para la misma selección, ir directo a Vista 2
  if (conflicts && conflicts.totalCount > 0) {
    setView('conflicts');
    return;
  }

  checkConflicts();
}
```

- [ ] **Step 5.8: Bloquear el cierre del dialog mientras corre algo**

Reemplazar el handler del `Dialog`:

```tsx
<Dialog
  open={open}
  onOpenChange={(isOpen) => {
    if (isCheckingConflicts || isCloning) return; // Bloquea Esc / overlay click
    if (!isOpen) handleClose();
  }}
>
```

- [ ] **Step 5.9: Renderizar Vista 1 o Vista 2 condicionalmente**

Reemplazar el `<DialogContent>` body:

```tsx
<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-auto gap-4">
  {view === 'conflicts' && conflicts ? (
    <>
      <DialogHeader className="space-y-1.5">
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          Revisión de duplicados
        </DialogTitle>
        <DialogDescription className="text-xs">
          Algunos registros ya fueron clonados antes a estas fechas. Decidí cómo continuar.
        </DialogDescription>
      </DialogHeader>

      <CloneRowsConflictView
        conflicts={conflicts}
        isCloning={isCloning}
        onBack={() => setView('select')}
        onSkipAndClone={() => executeMutate(conflicts.skipMap)}
        onCloneAnyway={() => executeMutate(undefined)}
      />
    </>
  ) : (
    <>
      <DialogHeader className="space-y-1.5">
        <DialogTitle>
          {isAllMode ? `Clonar registros del ${formattedReportDate}` : 'Clonar registros seleccionados'}
        </DialogTitle>
        <DialogDescription className="text-xs">
          {isAllMode
            ? 'Seleccioná las fechas destino y los tipos de registros a clonar.'
            : `Se clonarán ${rowCount} ${rowCount === 1 ? 'registro' : 'registros'} a las fechas que selecciones.`}
        </DialogDescription>
      </DialogHeader>

      <TooltipProvider delayDuration={150}>
        {/* ... TODO el grid actual con calendario, chips, tipos, recursos, navegación ... */}
      </TooltipProvider>

      <DialogFooter className="gap-2 sm:gap-2 pt-2">
        <Button variant="outline" onClick={handleClose} disabled={isCheckingConflicts || isCloning}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="min-w-32">
          {isCheckingConflicts ? 'Verificando...' : isCloning ? 'Clonando...' : 'Clonar registros'}
        </Button>
      </DialogFooter>
    </>
  )}
</DialogContent>
```

- [ ] **Step 5.10: Actualizar `canSubmit`**

Reemplazar la línea actual `const canSubmit = selectedDates.length > 0 && !isPending;` por:

```typescript
const canSubmit = selectedDates.length > 0 && !isCheckingConflicts && !isCloning;
```

- [ ] **Step 5.11: Eliminar las referencias a `isPending` y `mutate` originales**

Buscar en el archivo `isPending` y `mutate(` y reemplazar por las nuevas referencias (`isCloning`, `cloneMutate`, etc.). Asegurarse de que ningún uso quedó colgado.

- [ ] **Step 5.12: Importar `AlertTriangle` para el header de Vista 2**

En la línea de imports de `lucide-react`, agregar `AlertTriangle`:

```typescript
import { AlertTriangle, Info, X } from 'lucide-react';
```

- [ ] **Step 5.13: Verificación de tipos**

```bash
npm run check-types
```

Expected: no errors.

---

## Task 6 — Verificación manual con datos de prueba

**Files:** ninguno (testing manual).

- [ ] **Step 6.1: Iniciar dev server**

```bash
npm run dev
```

Login en `http://localhost:3000` con credenciales DEV (ver memoria del agente).

- [ ] **Step 6.2: Caso A — clone sin conflicto previo**

1. Navegar a un parte diario con rows existentes (`/dashboard/operations/<id>`).
2. Seleccionar 2-3 rows.
3. Click `Clonar` → seleccionar una fecha futura sin partes previos.
4. Click `Clonar registros` → debe mostrar `Verificando...` brevemente y luego `Clonando...`, sin pasar por la Vista 2.
5. Toast verde con cantidad clonada.
6. Verificar con MCP `supabase-LOCAL`: `SELECT id, cloned_from_row_id, daily_report_id FROM dailyreportrows WHERE cloned_from_row_id IS NOT NULL ORDER BY created_at DESC LIMIT 5;` — las nuevas rows deben tener `cloned_from_row_id` poblado.

- [ ] **Step 6.3: Caso B — clone con conflicto en una fecha**

1. Repetir el clone del Caso A con las mismas rows hacia la misma fecha.
2. Click `Clonar registros` → debe aparecer Vista 2 con N conflictos en esa fecha.
3. Verificar que cada Card muestra: cliente, servicio, ítem, sector, área, jornada, horarios, descripción truncada, fecha "Clonada DD/MM HH:mm".
4. Click `Volver a la selección` → vuelve a Vista 1 con la selección preservada.
5. Click `Clonar registros` de nuevo → vuelve a Vista 2 (debe estar cacheado, no re-disparar verificación porque la selección no cambió).
6. Click `Clonar igualmente` → toast verde, queda doblado en la fecha (verificar en DB).

- [ ] **Step 6.4: Caso C — exclusión de duplicados con fechas mixtas**

1. Seleccionar 2 rows.
2. Clonar a 2 fechas — F1 (donde ya hay clones de Caso B) y F2 (sin clones previos).
3. Click `Clonar registros` → Vista 2 muestra solo conflictos en F1, no en F2.
4. Click `Excluir duplicados y clonar el resto`.
5. Verificar que en F1 NO se duplicaron (la cantidad de rows en el report se mantuvo) y en F2 SÍ se clonaron las 2 rows.
6. Toast verde con la cantidad efectivamente clonada (solo las de F2).

- [ ] **Step 6.5: Caso D — exclusión total**

1. Seleccionar las mismas rows que ya tienen clones en TODAS las fechas destino.
2. Click `Clonar registros` → Vista 2 con todos como duplicados.
3. Click `Excluir duplicados y clonar el resto`.
4. Toast `warning`: "No quedaron registros para clonar después de excluir los duplicados".
5. Dialog cierra, no hay navegación.

- [ ] **Step 6.6: Caso E — bloqueo de botones (COD-580)**

1. Seleccionar rows + fecha.
2. Click `Clonar registros`.
3. Mientras `Verificando...` o `Clonando...`:
   - El botón `Cancelar` debe estar disabled.
   - Esc / click fuera no cierra el dialog.
   - Si llegó a Vista 2: los 3 botones del footer disabled mientras el segundo o tercer botón está corriendo el clone.

- [ ] **Step 6.7: Caso F — modo "Clonar todo el parte"**

1. En el parte original, click `Clonar Registros` SIN seleccionar rows (modo `all`).
2. Marcar tipos (mensuales, adicionales, etc.).
3. Seleccionar fecha donde ya hay clones de algún tipo.
4. Click `Clonar registros` → Vista 2 con conflictos del tipo coincidente.
5. Verificar que el `getCloneConflicts` respetó el `typeServiceFilter` (no hay conflictos de tipos no marcados).

- [ ] **Step 6.8: Caso G — invalidación al cambiar selección**

1. Generar conflictos (Caso B).
2. En Vista 2, click `Volver a la selección`.
3. Cambiar la fecha (deseleccionar la actual, seleccionar otra).
4. Click `Clonar registros` → debe disparar verificación NUEVA (no usar el resultado cacheado).

- [ ] **Step 6.9: `npm run check-types` final**

```bash
npm run check-types
```

Expected: no errors.

---

## Verificación final del plan (self-review)

- ✅ Cobertura COD-581: Tasks 1, 2, 3, 4, 5 cubren columna + clone update + check + UI.
- ✅ Cobertura COD-580: Step 5.5 (label dinámico), 5.8 (bloquear close), Step 5.9 (botones disabled), Step 6.6 (verificación).
- ✅ Edge cases del spec: skip per-fecha, no crear header vacío, modo "clonar todo", typeServiceFilter respetado, reagendar sin warning, invalidación de conflictos al cambiar selección, ON DELETE SET NULL.
- ✅ No hay placeholders ni "TODO".
- ✅ Tipos exportados consistentes (`CloneConflictRow`, `CloneConflictsByDate`).
- ✅ No tests automatizados — verificación manual completa en Task 6.
- ✅ NO hay pasos de `git commit` ni `git push` (regla del usuario).
