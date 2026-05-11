# COD-580 + COD-581 — Clonación de partes diarios: bloqueo en submit + aviso de duplicados

**Date**: 2026-05-06
**Branch**: `cod-580-581-clone-conflict-warning`
**Status**: Approved
**Linear**: [COD-580](https://linear.app/codecontrol-sas/issue/COD-580/deshabilitar-el-boton-de-clonar-en-el-submit) · [COD-581](https://linear.app/codecontrol-sas/issue/COD-581/nueva-columna-en-dailyreportrow-que-guarde-el-id-del-padre-de-la-row)

## Contexto

Hoy en `CloneRowsDialog` (`src/features/Operaciones/PartesDiarios/detail/components/CloneRowsDialog.tsx`) el usuario puede clonar registros de un parte diario hacia una o varias fechas destino. No hay forma de detectar si esa misma row ya fue clonada antes a la misma fecha → terminan apareciendo registros duplicados en la fecha destino sin que el usuario lo sepa hasta navegar al parte clonado.

Adicionalmente, durante el submit de la mutación (`cloneDailyReportRows`) algunos botones del flow siguen siendo clickables, lo que abre puertas a comportamientos no deseados (cancelar a mitad de submit, doble disparo del check, etc.).

## Problema

1. **COD-581** — No hay forma de saber si una `dailyreportrows` ya fue clonada desde otra row. Cuando se clona dos veces la misma fila al mismo `dailyreport` (misma fecha + misma empresa), queda duplicada silenciosamente.
2. **COD-580** — Mientras `cloneDailyReportRows` está en `isPending`, el botón "Cancelar" del dialog y los nuevos botones de la vista de conflictos pueden interactuar con el flujo cuando no deberían.

## Solución

### 1. Trazabilidad de clonaciones

Agregar columna `cloned_from_row_id` (UUID, nullable, self-FK con `ON DELETE SET NULL`) a `dailyreportrows`. Cada clonación guarda el ID del row original. NULL para todas las rows existentes (sin backfill — no es posible inferirlo retroactivamente con confianza).

### 2. Detección y aviso de duplicados

Antes de ejecutar la clonación, una nueva server action `getCloneConflicts(rowIds, targetDates)` consulta para cada `(rowId, targetDate)` si ya existe un `dailyreportrows` cuyo:

- `cloned_from_row_id ∈ rowIds` (este row del destino ya fue clonado de alguno de los rows seleccionados),
- Y pertenece al `dailyreport` correspondiente a `targetDate` con `company_id` actual.

Si hay conflictos, el dialog cambia de la **Vista 1 — Selección** (la actual) a la **Vista 2 — Revisión de conflictos** (nueva), dentro del mismo `DialogContent` (regla `CLAUDE.md` — no encadenar modales).

El usuario decide:

- **Volver** (regresa a Vista 1 sin perder selección).
- **Excluir duplicados y clonar el resto** — para cada `(rowId, targetDate)` con conflicto, se omite la clonación; el resto continúa. Implementado con un nuevo parámetro `skipRowIdsByDate?: Record<string, string[]>` en `cloneDailyReportRows`.
- **Clonar igualmente** — dispara la mutación sin filtrar (queda doble).

### 3. Bloqueo de botones durante submit

- Botón "Cancelar" del dialog (Vista 1) → `disabled={isPending}` (hoy es siempre clickable).
- Botones nuevos del footer de Vista 2 → todos `disabled` mientras corre la mutación.
- Botón principal de Vista 1 → ya está disabled hoy en `isPending`; ahora también muestra `Verificando...` mientras corre el `getCloneConflicts`.

## Diseño detallado

### 1. Schema y migración

```prisma
model dailyreportrows {
  // ...campos existentes...
  cloned_from_row_id String?            @db.Uuid
  cloned_from_row    dailyreportrows?   @relation("DailyReportRowClones", fields: [cloned_from_row_id], references: [id], onDelete: SetNull)
  clones             dailyreportrows[]  @relation("DailyReportRowClones")
}
```

```sql
ALTER TABLE dailyreportrows
  ADD COLUMN cloned_from_row_id UUID NULL;

ALTER TABLE dailyreportrows
  ADD CONSTRAINT dailyreportrows_cloned_from_row_id_fkey
  FOREIGN KEY (cloned_from_row_id) REFERENCES dailyreportrows(id) ON DELETE SET NULL;

CREATE INDEX idx_dailyreportrows_cloned_from_row_id
  ON dailyreportrows (cloned_from_row_id)
  WHERE cloned_from_row_id IS NOT NULL;
```

`ON DELETE SET NULL` para no perder rows clonadas si alguien borra la original. Índice parcial porque la mayoría de rows tendrán `NULL` (rows creadas manualmente).

Sin backfill: no se puede inferir el padre de las rows históricas con confianza. Las clonaciones futuras quedan trazadas; las anteriores no pueden detectarse como duplicadas (no es regresión — el comportamiento actual no las detecta tampoco).

### 2. `cloneDailyReportRows` — cambios

Ubicación: `src/features/Operaciones/PartesDiarios/detail/actions.server.ts:1545`.

Cambios:

1. Nuevo parámetro opcional `skipRowIdsByDate?: Record<string, string[]>` en `CloneRowsOptions`. Se aplica dentro del loop por fecha: si `skipRowIdsByDate[targetDate]?.includes(originalRow.id)` → continuar (saltar esa row para esa fecha).
2. Al crear cada nueva row con `tx.dailyreportrows.create`, agregar el campo `cloned_from_row_id: originalRow.id`.
3. Si tras aplicar el skip la fecha destino queda con 0 rows nuevas a clonar **y el header del `dailyreport` no existía**, no crear el header (evita partes vacíos).
4. La métrica `clonedRowCount` solo cuenta las rows efectivamente creadas.

### 3. `getCloneConflicts` — nueva server action

Ubicación: misma `actions.server.ts`.

```typescript
interface ConflictRow {
  id: string; // ID del row destino que ya existe
  cloned_from_row_id: string; // El padre (uno de los rowIds enviados)
  customerName: string | null;
  serviceName: string | null;
  itemName: string | null;
  sectorName: string | null;
  areaName: string | null;
  workingDay: string | null;
  startTime: string | null; // HH:mm
  endTime: string | null; // HH:mm
  description: string | null;
  typeService: 'mensual' | 'adicional' | 'adicional_permanente' | null;
  clonedAt: string | null; // ISO de when fue creado el clon
}

interface ConflictsByDate {
  /** Map: targetDate (YYYY-MM-DD) → conflictos en esa fecha */
  conflicts: Record<string, ConflictRow[]>;
  /** Total de conflictos sumados */
  totalCount: number;
  /** Map de exclusión sugerido para "Excluir y clonar el resto" */
  skipMap: Record<string, string[]>;
}

async function getCloneConflicts(
  rowIds: string[],
  targetDates: string[],
  cloneAllFromReportId?: string,
  typeServiceFilter?: Array<'mensual' | 'adicional' | 'adicional_permanente'>
): Promise<ConflictsByDate>;
```

Lógica:

1. Resolver `effectiveRowIds`:
   - Si `rowIds.length > 0` → usar `rowIds`.
   - Sino, si `cloneAllFromReportId` → `findMany` igual que en `cloneDailyReportRows` (aplicando `typeServiceFilter` si viene).
   - Sino → retornar `{ conflicts: {}, totalCount: 0, skipMap: {} }`.
2. Obtener `companyId` del cookie `actualComp` (mismo helper que el clone).
3. Resolver IDs de `dailyreport` para `targetDates` y `companyId` con un `findMany`.
4. Por cada `dailyreport` encontrado, hacer un `findMany` de `dailyreportrows` con:
   - `daily_report_id = report.id`
   - `cloned_from_row_id IN effectiveRowIds`
   - `select`: campos enriquecidos con `customers.name`, `customer_services.service_name`, `service_items.item_name`, `service_sectors.sectors.name`, `service_areas.areas_cliente.descripcion_corta`, `working_day`, `start_time`, `end_time`, `description`, `type_service`, `created_at`.
5. Componer `conflicts[targetDate] = [...]` y `skipMap[targetDate] = conflicts.map(c => c.cloned_from_row_id)` (array de IDs únicos del padre — esos son los que se omiten al clonar).
6. NO incluir `dailyreportemployeerelations` ni `dailyreportequipmentrelations` en el `select` (regla del ticket — no exponer recursos en la lista de conflictos).

### 4. UI — `CloneRowsDialog` refactor

Estructura del componente (alto nivel):

```tsx
type DialogView = 'select' | 'conflicts';

const [view, setView] = useState<DialogView>('select');
const [conflicts, setConflicts] = useState<ConflictsByDate | null>(null);

const checkConflictsMutation = useMutation({
  mutationFn: () => getCloneConflicts(...),
  onSuccess: (result) => {
    if (result.totalCount === 0) {
      cloneMutation.mutate({ skipRowIdsByDate: undefined });
    } else {
      setConflicts(result);
      setView('conflicts');
    }
  },
});

const cloneMutation = useMutation({
  mutationFn: ({ skipRowIdsByDate }) => cloneDailyReportRows(..., { ..., skipRowIdsByDate }),
  onSuccess: (result) => { ...flujo actual... },
});
```

`handleSubmit` (botón "Clonar registros" de Vista 1) → `checkConflictsMutation.mutate()` en lugar de `cloneMutation.mutate()` directo.

#### Vista 2 — Revisión de conflictos

Header (mismo `DialogHeader`):

- Título: `Ya clonaste estos registros antes` con icono `AlertTriangle` (ámbar) inline.
- Description: `Encontramos {totalCount} registro(s) ya clonados desde tu selección a las fechas destino. Revisalos antes de continuar.`

Body — agrupado por `targetDate` ordenado ascendentemente:

- Cada grupo: encabezado con fecha humanizada (`moment().format('dddd D [de] MMMM, YYYY')`) y `Badge` con count.
- Lista de `Card` por conflicto:
  - Línea 1 (semibold): `Cliente · Servicio · Ítem`
  - Línea 2 (`text-xs muted`): `Sector · Área · Jornada · {start_time}–{end_time}`
  - Línea 3 (`text-xs muted italic`, opcional): primera línea de la descripción truncada a 80 chars con `line-clamp-1`.
  - Pie (`text-xs muted-foreground` derecha): `Clonada el DD/MM HH:mm`.
- Color del banner del grupo: `bg-amber-50/40 dark:bg-amber-950/20` + borde `border-amber-200 dark:border-amber-900`. Texto `text-amber-700 dark:text-amber-400`.
- Si la lista total supera 5 conflictos → contenedor scrollable (`max-h-[40vh] overflow-y-auto`) con header sticky por grupo.

Footer:

- `Volver` (variant ghost) — `setView('select')`.
- `Excluir duplicados y clonar el resto` (variant outline) — `cloneMutation.mutate({ skipRowIdsByDate: conflicts.skipMap })`.
- `Clonar igualmente` (variant default) — `cloneMutation.mutate({ skipRowIdsByDate: undefined })`.

Todos `disabled={cloneMutation.isPending}`. El botón ejecutado muestra `Clonando...`.

#### Edge cases UI

- Si `cloneMutation.onSuccess` retorna `clonedRowCount === 0` (todas las fechas tenían conflicto y el usuario eligió excluir todo) → toast `No quedaron registros para clonar después de excluir los duplicados`. Cierra el dialog igual.
- Si el usuario hace click en "Volver" desde Vista 2, se preserva el calendario, los chips, los checkboxes de tipos y recursos. Los `conflicts` se mantienen en estado por si vuelve a hacer submit con la misma selección sin cambios — pero **se invalidan al cambiar `selectedDates`, `includeMensuales`, `includeAdicionales` o `includeAdicionalesPermanentes`** (un `useEffect` resetea `conflicts` a `null` ante esos cambios).
- Si el usuario cierra el dialog (`onOpenChange(false)`) durante Vista 2 → `handleClose` resetea `view`, `conflicts`, y todos los flags como hoy.
- Si `checkConflictsMutation` falla → toast con mensaje genérico y se queda en Vista 1.

### 5. Bloqueo de botones (COD-580)

| Botón                        | Ubicación                 | Cambio                                                                                                                                       |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cancelar`                   | `CloneRowsDialog.tsx:408` | Agregar `disabled={isPending \|\| isCheckingConflicts}`                                                                                      |
| `Clonar registros` (Vista 1) | `CloneRowsDialog.tsx:411` | Label dinámico: `Verificando...` mientras corre check; `Clonando...` mientras corre clone. `disabled` ya cubierto por `canSubmit` extendido. |
| `onOpenChange` (overlay/Esc) | `CloneRowsDialog.tsx:194` | Si `isPending \|\| isCheckingConflicts` → ignorar el close.                                                                                  |
| Botones del footer Vista 2   | nuevos                    | Los tres `disabled={cloneMutation.isPending}`                                                                                                |

## Edge cases clave

- **Modo "clonar todo el parte"** (`cloneAllFromReportId` set, `rowIds=[]`): la verificación debe resolver primero la lista efectiva de rowIds (igual que el clone) antes de buscar conflictos. Aplica el mismo `typeServiceFilter`.
- **Reagendar de novedades** (`actions.server.ts:1444` también llama `cloneDailyReportRows`): este flujo NO usa el dialog y NO debe verificar conflictos. La nueva firma es backward compatible — el campo `skipRowIdsByDate` es opcional, y `cloned_from_row_id` se setea igual (es comportamiento deseado: cualquier clon queda trazado).
- **Una row con conflicto en F1 pero no en F2**: `skipMap` solo lista esa row en F1. En F2 se clona normalmente. La métrica `clonedRowCount` es correcta porque cuenta sólo las creaciones efectivas.
- **Borrar una row clonada**: `ON DELETE SET NULL` deja al hijo sin referencia al padre. No bloquea el delete del padre.
- **Borrar un row que es padre**: igual, los hijos sobreviven con `cloned_from_row_id = NULL`.
- **Auditoría (`dailyreportrows_history`)**: el trigger existente sigue logueando insert/update/delete; no requiere cambios. La nueva columna se incluye en `changed_data` automáticamente.
- **Dailyreport destino que no existe**: no hay rows previas → no hay conflicto. Caso limpio.
- **Filtro por `typeServiceFilter` en modo "all"**: el getCloneConflicts respeta el mismo filtro para que la cantidad de conflictos coincida con la cantidad de rows que se intentarían clonar.
- **`getCloneConflicts` sin selección efectiva** (`effectiveRowIds.length === 0`): retorna `{ conflicts: {}, totalCount: 0, skipMap: {} }` — el flow continúa al clone que también devolverá `clonedRowCount: 0` con su validación interna.

## Out of scope

- No se hace backfill de `cloned_from_row_id` para rows históricas.
- No se cambia el flow de "reagendar" (deja la trazabilidad pero no muestra warning de conflictos).
- No se exponen los recursos (empleados, equipos, equipos de cliente) en la lista de conflictos.
- No se agrega un check de "primos" (clonaciones del mismo abuelo) — solo clonación directa al mismo `dailyreport` destino.
- No se cambia el patrón de fetching (sigue usando React Query mutations).

## Tests

E2E (Cypress) no se agrega en esta PR (no hay tests de partes diarios todavía). Verificación manual descrita en el plan.
