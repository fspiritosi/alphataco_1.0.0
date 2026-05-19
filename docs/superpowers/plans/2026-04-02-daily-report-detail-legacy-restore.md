# Daily Report Detail — Restauración Funcionalidad Legacy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar 7 comportamientos del sistema legacy que se perdieron en la migración a Prisma: columnas visibles por defecto, condición de editar por fecha/status, badges de estado enriquecidos (ejecutado parcial, tooltip cancelado), empleados/equipos sin colapso con duplicados marcados en naranja, botón Clonar siempre visible, restricción de selección para bulk edit, y opciones legacy del BulkEditModal.

**Architecture:** Cambios en 6 archivos existentes, sin nuevos archivos ni migraciones de BD. Los cambios son: presentación en `columns.tsx`, flujo de toolbar en `_DailyReportDetailDataTable.tsx`, pasaje de `dailyReportStatus` desde `DailyReportDetailTable.tsx`, extensión del CloneRowsDialog para modo "clonar todo", y extensión del BulkEditModal/server action para opciones legacy.

**Tech Stack:** Next.js 16, React 19, TanStack Table v8, Prisma, moment.js, shadcn/ui (Badge, Tooltip, Dialog, Calendar), Zod, React Hook Form

---

## File Map

| Archivo                                             | Tipo   | Cambios                                                                                                                                                                              |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `detail/columns.tsx`                                | Modify | HIDDEN_COLUMNS_BY_DEFAULT, badge status (parcial/cancelado), condición editar, EmployeeBadgeCell sin colapso + duplicados, EquipmentBadgeCell/CustomerEquipmentBadgeCell sin colapso |
| `detail/DailyReportDetailTable.tsx`                 | Modify | Pasar `dailyReportStatus` al Client Component                                                                                                                                        |
| `detail/components/_DailyReportDetailDataTable.tsx` | Modify | Prop `dailyReportStatus`, botón Crear deshabilitado, Clonar siempre visible, enableRowSelection función                                                                              |
| `detail/components/CloneRowsDialog.tsx`             | Modify | Prop `mode: 'all' \| 'selected'` + `dailyReportId`, título dinámico                                                                                                                  |
| `detail/actions.server.ts`                          | Modify | `cloneDailyReportRows` modo clonar todo; `BulkRowUpdateData` + `bulkUpdateRowStatus` con opciones legacy                                                                             |
| `detail/components/BulkEditModal.tsx`               | Modify | Opciones completar_diurno/nocturno, motivo cancelación, fecha reprogramación                                                                                                         |

---

## Task 1: columns.tsx — Columnas por defecto + badges de estado enriquecidos

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/columns.tsx`

### Paso 1.1 — Agregar imports faltantes

Al inicio del archivo, después de `import type { DailyReportDetailRow } from './types';`:

- [ ] **Step 1: Agregar imports de `moment` y `cn`**

```typescript
// Agregar estas dos líneas al bloque de imports existente:
import { cn } from '@/lib/utils';
import moment from 'moment';
```

### Paso 1.2 — Reducir columnas ocultas por defecto

- [ ] **Step 2: Reemplazar HIDDEN_COLUMNS_BY_DEFAULT**

```typescript
// ANTES (líneas 20-31):
export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = [
  'type_service',
  'sector',
  'area',
  'start_time',
  'end_time',
  'description',
  'remit_number',
  'completed_day',
  'completed_night',
  'customer_equipment',
];

// DESPUÉS:
export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['start_time', 'end_time'];
```

### Paso 1.3 — Badge de estado enriquecido (Ejecutado parcial + tooltip cancelado)

- [ ] **Step 3: Reemplazar la columna `status` cell**

Buscar el bloque que empieza en `// ── Estado (enum NOT NULL)` y reemplazar el `cell` por:

```typescript
    // ── Estado (enum NOT NULL) ────────────────────────────────────────────────
    {
      accessorKey: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const val = row.original.status;
        const label = dailyReportRowStatusLabels[val] ?? val;
        const variant = dailyReportRowStatusBadges[val] ?? 'default';

        // Ejecutado parcial: jornada 24h, no completamente ejecutado, pero al menos un turno completado
        const is24Hours = row.original.working_day === 'Jornada 24 horas';
        const completedDay = row.original.completed_day;
        const completedNight = row.original.completed_night;
        if (is24Hours && val !== 'ejecutado' && (completedDay || completedNight)) {
          return <Badge variant="info">Ejecutado parcial</Badge>;
        }

        // Cancelado con motivo → tooltip
        if (val === 'cancelado' && row.original.cancel_reason) {
          return (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={variant}>{label}</Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs bg-black text-white rounded-lg p-2">
                  <p>{row.original.cancel_reason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string;
        return value.includes(val);
      },
    },
```

- [ ] **Step 4: Run check-types para verificar que no hay errores**

```bash
npm run check-types
```

Expected: `Found 1 error` solo el error pre-existente en `actions.server.ts:1020` — no errores nuevos. Si hay errores nuevos, corregirlos antes de continuar.

---

## Task 2: columns.tsx — Condición de editar por fecha/status

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/columns.tsx`

La columna `actions` llama a `RowActionsCell`. Necesitamos que `RowActionsCell` reciba `reportDate` y aplique la condición del legacy: el botón Editar solo aparece si el status de la fila no es `ejecutado`, O si es `ejecutado` pero la fecha del parte es hoy.

- [ ] **Step 1: Actualizar la columna `actions` para pasar `reportDate` a `RowActionsCell`**

Buscar el bloque `// ── Acciones` al final de `getColumns` y reemplazar el `cell`:

```typescript
    // ── Acciones ──────────────────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { title: '', excludeFromExport: true },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActionsCell
          row={row.original}
          permissions={permissions}
          handlers={handlers}
          reportDate={reportDate}
        />
      ),
    },
```

- [ ] **Step 2: Actualizar la signature de `RowActionsCell` y agregar la condición**

Reemplazar la función `RowActionsCell` completa:

```typescript
function RowActionsCell({
  row,
  permissions,
  handlers,
  reportDate,
}: {
  row: DailyReportDetailRow;
  permissions: Permissions;
  handlers: RowActionHandlers;
  reportDate: string;
}) {
  const isToday = moment(reportDate).isSame(moment(), 'day');
  // Editar solo si: el status no es ejecutado, o si es ejecutado pero es el día de hoy
  const canEdit = permissions.canUpdate && (row.status !== 'ejecutado' || isToday);

  return (
    <div className="flex items-center gap-1">
      {/* Ver detalle — siempre visible */}
      <button
        type="button"
        title="Ver detalle"
        className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={() => handlers.onViewDetail(row)}
      >
        <span className="sr-only">Ver detalle</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {/* Editar — solo si canUpdate Y (status no ejecutado O parte es hoy) */}
      {canEdit && (
        <button
          type="button"
          title="Editar"
          className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={() => handlers.onEdit(row)}
        >
          <span className="sr-only">Editar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* Historial — siempre visible */}
      <button
        type="button"
        title="Historial"
        className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={() => handlers.onHistory(row)}
      >
        <span className="sr-only">Historial</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {/* Remitos — siempre visible */}
      <button
        type="button"
        title="Remitos"
        className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={() => handlers.onRemitos(row)}
      >
        <span className="sr-only">Remitos</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </button>

      {/* Eliminar — solo si canDelete */}
      {permissions.canDelete && (
        <button
          type="button"
          title="Eliminar"
          className="rounded p-1 hover:bg-accent text-red-500 hover:text-red-700"
          onClick={() => handlers.onDelete(row)}
        >
          <span className="sr-only">Eliminar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run check-types**

```bash
npm run check-types
```

Expected: sin errores nuevos.

---

## Task 3: columns.tsx — EmployeeBadgeCell + EquipmentBadgeCell sin colapso + duplicados

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/columns.tsx`

### Paso 3.1 — Helper para detectar duplicados

- [ ] **Step 1: Agregar helper `getDuplicatedEmployeeIds` antes de `EmployeeBadgeCell`**

```typescript
// ============================================================================
// HELPERS
// ============================================================================

/**
 * Retorna un Set de employee_id que aparecen en MÁS de una fila del parte
 * (excluyendo la fila actual). Usado para marcar duplicados en naranja.
 */
function getDuplicatedEmployeeIds(allRows: DailyReportDetailRow[], currentRowId: string): Set<string> {
  const counts = new Map<string, number>();
  for (const r of allRows) {
    if (r.id === currentRowId) continue;
    for (const rel of r.dailyreportemployeerelations) {
      if (rel.employee_id) {
        counts.set(rel.employee_id, (counts.get(rel.employee_id) ?? 0) + 1);
      }
    }
  }
  // Solo los que aparecen al menos una vez en OTRAS filas
  return new Set(counts.keys());
}
```

### Paso 3.2 — Refactorizar EmployeeBadgeCell

- [ ] **Step 2: Reemplazar la función `EmployeeBadgeCell` completa**

```typescript
// ============================================================================
// EMPLOYEE BADGE CELL (with duplication detection)
// ============================================================================

function EmployeeBadgeCell({
  row,
  allRows,
}: {
  row: DailyReportDetailRow;
  allRows: DailyReportDetailRow[];
}) {
  const relations = row.dailyreportemployeerelations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const duplicatedIds = getDuplicatedEmployeeIds(allRows, row.id);

  return (
    <div className="flex flex-col gap-1">
      {relations.map((rel) => {
        const emp = rel.employees;
        if (!emp) return null;
        const isDuplicated = rel.employee_id ? duplicatedIds.has(rel.employee_id) : false;
        const label = `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();

        if (isDuplicated) {
          return (
            <TooltipProvider key={rel.employee_id ?? rel.id} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-xs font-normal border-orange-500 bg-orange-50 dark:bg-orange-950 dark:border-orange-400 cursor-default"
                  >
                    {label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white rounded-lg p-2">
                  <p className="text-xs">Empleado asignado a múltiples filas del parte</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return (
          <Badge key={rel.employee_id ?? rel.id} variant="outline" className="text-xs font-normal">
            {label}
          </Badge>
        );
      })}
    </div>
  );
}
```

### Paso 3.3 — Actualizar columna `employees` para pasar `allRows`

- [ ] **Step 3: Actualizar el `cell` de la columna `employees` en `getColumns`**

Buscar `cell: ({ row }) => <EmployeeBadgeCell row={row.original} reportDate={reportDate} />` y reemplazar por:

```typescript
      cell: ({ row, table }) => (
        <EmployeeBadgeCell
          row={row.original}
          allRows={table.options.data as DailyReportDetailRow[]}
        />
      ),
```

> **Nota:** `reportDate` ya no se pasa a `EmployeeBadgeCell` porque la nueva implementación usa duplicación cross-fila (no diagramas). `table.options.data` contiene las filas de la página actual — el mismo scope que el legacy.

### Paso 3.4 — EquipmentBadgeCell sin colapso

- [ ] **Step 4: Reemplazar la función `EquipmentBadgeCell` completa**

```typescript
// ============================================================================
// EQUIPMENT BADGE CELL (vehicles + other_equipment)
// ============================================================================

function EquipmentBadgeCell({ row }: { row: DailyReportDetailRow }) {
  const relations = row.dailyreportequipmentrelations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {relations.map((rel) => {
        let label = '—';
        if (rel.vehicles) {
          const v = rel.vehicles;
          label = `${v.domain ?? v.intern_number ?? 'Equipo'}${v.brand_vehicles?.name ? ` — ${v.brand_vehicles.name}` : ''}`;
        } else if (rel.other_equipment) {
          const o = rel.other_equipment;
          label = o.intern_number ?? o.serial_number ?? 'Equipo';
        }
        return (
          <Badge key={rel.id} variant="outline" className="text-xs font-normal">
            {label}
          </Badge>
        );
      })}
    </div>
  );
}
```

### Paso 3.5 — CustomerEquipmentBadgeCell sin colapso

- [ ] **Step 5: Reemplazar la función `CustomerEquipmentBadgeCell` completa**

```typescript
// ============================================================================
// CUSTOMER EQUIPMENT BADGE CELL
// ============================================================================

function CustomerEquipmentBadgeCell({ row }: { row: DailyReportDetailRow }) {
  const relations = row.dailyreport_customer_equipment_relations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {relations.map((rel) => (
        <Badge key={rel.id} variant="outline" className="text-xs font-normal">
          {rel.equipos_clientes?.name ?? 'Equipo cliente'}
        </Badge>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run check-types**

```bash
npm run check-types
```

Expected: sin errores nuevos. Si TypeScript se queja del acceso a `table.options.data`, el cast `as DailyReportDetailRow[]` es correcto porque el DataTable usa esa shape.

---

## Task 4: DailyReportDetailTable + \_DailyReportDetailDataTable — Control de flujo del toolbar

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/DailyReportDetailTable.tsx`
- Modify: `src/features/Operaciones/PartesDiarios/detail/components/_DailyReportDetailDataTable.tsx`

### Paso 4.1 — Pasar dailyReportStatus desde el Server Component

- [ ] **Step 1: Modificar `DailyReportDetailTable.tsx` para pasar `dailyReportStatus`**

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { checkPermissionServer } from '@/features/Permissions';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getDailyReportDetailPaginated, getDailyReportHeader } from './actions.server';
import { _DailyReportDetailDataTable } from './components/_DailyReportDetailDataTable';

const TABLE_ID = 'daily-report-detail';

interface Props {
  uuid: string;
  searchParams: DataTableSearchParams;
}

export async function DailyReportDetailTable({ uuid, searchParams }: Props) {
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  const header = await getDailyReportHeader(uuid);
  const rawDate = header?.date ?? new Date();
  const reportDate = rawDate instanceof Date ? rawDate.toISOString() : new Date(rawDate).toISOString();
  const dailyReportStatus = header?.status ?? 'abierto';

  const [{ data, total }, preferences, canUpdate, canDelete] = await Promise.all([
    getDailyReportDetailPaginated(uuid, tableParams, reportDate),
    getTablePreferences(TABLE_ID),
    checkPermissionServer('operaciones', 'detalle-parte-diario', 'update'),
    checkPermissionServer('operaciones', 'detalle-parte-diario', 'delete'),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_DailyReportDetailDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          dailyReportId={uuid}
          reportDate={reportDate}
          dailyReportStatus={dailyReportStatus}
          canUpdate={canUpdate}
          canDelete={canDelete}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
```

### Paso 4.2 — Actualizar \_DailyReportDetailDataTable.tsx

- [ ] **Step 2: Agregar prop `dailyReportStatus` a la interface Props**

```typescript
interface Props {
  data: DailyReportDetailRow[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  dailyReportId: string;
  /** ISO date string of the daily report — used for employee diagram deviation detection */
  reportDate: string;
  /** Status del parte diario (abierto/cerrado/etc.) — para deshabilitar Crear */
  dailyReportStatus: string;
  canUpdate: boolean;
  canDelete: boolean;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
}
```

- [ ] **Step 3: Agregar `dailyReportStatus` al destructuring de props y calcular `canCreate`**

En el cuerpo del componente, después de la línea `const { isOpen: isFormOpen, open: openForm, close: closeForm, editingRowId } = useDailyReportDetailFormStore();`, agregar:

```typescript
// ── Crear: disponible si canUpdate Y (parte abierto O es el día de hoy) ────
const isReportToday = moment(reportDate).isSame(moment(), 'day');
const canCreate = canUpdate && (dailyReportStatus === 'abierto' || isReportToday);
```

> **Nota:** Agregar `import moment from 'moment';` al bloque de imports del archivo si no está presente.

- [ ] **Step 4: Actualizar `toolbarActions` — Crear deshabilitado + Clonar siempre visible + restricción de selección**

Reemplazar el bloque `toolbarActions` completo:

```typescript
  // ── Toolbar: Crear button + bulk actions ──────────────────────────────────
  const toolbarActions = useMemo(() => {
    const hasBulk = selectedRows.length > 0;
    return (
      <div className="flex items-center gap-2">
        {/* Crear — siempre visible si canUpdate, deshabilitado si parte cerrado y no es hoy */}
        {canUpdate && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={() => openForm()}
            disabled={!canCreate}
            title={!canCreate ? 'El parte está cerrado y no es el día de hoy' : undefined}
          >
            <Plus className="h-3.5 w-3.5" />
            Crear
          </Button>
        )}

        {/* Acciones masivas — solo con selección activa */}
        {hasBulk && (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedRows.length} seleccionado{selectedRows.length !== 1 ? 's' : ''}
            </span>
            {canUpdate && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowBulkEdit(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar seleccionados
              </Button>
            )}
          </>
        )}

        {/* Clonar — SIEMPRE visible. Sin selección = clonar todo el parte */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowClone(true)}
        >
          <Copy className="h-3.5 w-3.5" />
          {hasBulk ? 'Clonar seleccionados' : 'Clonar todo el parte'}
        </Button>
      </div>
    );
  }, [selectedRows.length, canUpdate, canCreate, openForm]);
```

- [ ] **Step 5: Actualizar `enableRowSelection` a función — solo filas en status editable**

En el componente `<DataTable ...>`, reemplazar `enableRowSelection={true}` por:

```typescript
        enableRowSelection={(row) =>
          row.original.status !== 'ejecutado' &&
          row.original.status !== 'sin_recursos_asignados' &&
          row.original.status !== 'reprogramado'
        }
```

- [ ] **Step 6: Actualizar el `CloneRowsDialog` para pasar mode y dailyReportId**

Reemplazar el renderizado de `CloneRowsDialog`:

```typescript
      <CloneRowsDialog
        open={showClone}
        onOpenChange={setShowClone}
        mode={selectedRows.length > 0 ? 'selected' : 'all'}
        selectedRows={selectedRows}
        dailyReportId={dailyReportId}
        onSuccess={() => {
          invalidateDetail();
          setSelectedRows([]);
        }}
      />
```

- [ ] **Step 7: Run check-types**

```bash
npm run check-types
```

Expected: errores de TypeScript en `CloneRowsDialog` (props no definidas aún) — se resuelven en Task 5. El error pre-existente en `actions.server.ts:1020` es esperado.

---

## Task 5: CloneRowsDialog + cloneDailyReportRows — Modo "clonar todo el parte"

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/actions.server.ts`
- Modify: `src/features/Operaciones/PartesDiarios/detail/components/CloneRowsDialog.tsx`

### Paso 5.1 — Extender cloneDailyReportRows para clonar todo

- [ ] **Step 1: Actualizar `CloneRowsOptions` interface en `actions.server.ts`**

Buscar `export interface CloneRowsOptions` y agregar:

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
}
```

- [ ] **Step 2: Actualizar `cloneDailyReportRows` para manejar rowIds vacío**

Buscar el bloque al inicio de `cloneDailyReportRows` donde dice:

```typescript
if (rowIds.length === 0 || targetDates.length === 0) {
  return { createdReports: [], clonedRowCount: 0 };
}
```

Reemplazar por:

```typescript
if (targetDates.length === 0) {
  return { createdReports: [], clonedRowCount: 0 };
}

// Modo "clonar todo": si rowIds está vacío pero se proporcionó un dailyReportId,
// buscar todas las filas activas del parte
let resolvedRowIds = rowIds;
if (rowIds.length === 0) {
  if (!options.cloneAllFromReportId) {
    return { createdReports: [], clonedRowCount: 0 };
  }
  const allRows = await prisma.dailyreportrows.findMany({
    where: { daily_report_id: options.cloneAllFromReportId },
    select: { id: true },
  });
  resolvedRowIds = allRows.map((r) => r.id);
  if (resolvedRowIds.length === 0) {
    return { createdReports: [], clonedRowCount: 0 };
  }
}
```

- [ ] **Step 3: Reemplazar todas las referencias a `rowIds` dentro de `cloneDailyReportRows` por `resolvedRowIds`**

Después del bloque anterior, buscar la línea:

```typescript
    const originalRows = await prisma.dailyreportrows.findMany({
      where: { id: { in: rowIds } },
```

y reemplazar `rowIds` por `resolvedRowIds`:

```typescript
    const originalRows = await prisma.dailyreportrows.findMany({
      where: { id: { in: resolvedRowIds } },
```

### Paso 5.2 — Actualizar CloneRowsDialog para modo all/selected

- [ ] **Step 4: Reemplazar `CloneRowsDialog.tsx` completo**

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import moment from 'moment';
import React from 'react';
import { toast } from 'sonner';
import { cloneDailyReportRows } from '../actions.server';
import type { DailyReportDetailRow } from '../types';

interface CloneRowsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'selected' = clonar solo las filas seleccionadas; 'all' = clonar todo el parte */
  mode: 'selected' | 'all';
  selectedRows: DailyReportDetailRow[];
  dailyReportId: string;
  onSuccess: () => void;
}

export function CloneRowsDialog({
  open,
  onOpenChange,
  mode,
  selectedRows,
  dailyReportId,
  onSuccess,
}: CloneRowsDialogProps) {
  const [selectedDates, setSelectedDates] = React.useState<Date[]>([]);
  const [includeEmployees, setIncludeEmployees] = React.useState(true);
  const [includeEquipment, setIncludeEquipment] = React.useState(true);

  const isAllMode = mode === 'all';
  const rowCount = isAllMode ? null : selectedRows.length;

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const targetDates = selectedDates.map((d) => moment(d).format('YYYY-MM-DD'));
      if (isAllMode) {
        // Modo "clonar todo": rowIds vacío + cloneAllFromReportId
        return cloneDailyReportRows([], targetDates, {
          includeEmployees,
          includeEquipment,
          cloneAllFromReportId: dailyReportId,
        });
      }
      const rowIds = selectedRows.map((r) => r.id);
      return cloneDailyReportRows(rowIds, targetDates, { includeEmployees, includeEquipment });
    },
    onSuccess: (result) => {
      const dateCount = selectedDates.length;
      toast.success(
        `Se clonaron ${result.clonedRowCount} registros en ${dateCount} ${dateCount === 1 ? 'fecha' : 'fechas'}`
      );
      handleClose();
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Ocurrió un error al clonar los registros');
    },
  });

  function handleClose() {
    onOpenChange(false);
    setSelectedDates([]);
    setIncludeEmployees(true);
    setIncludeEquipment(true);
  }

  function removeDate(date: Date) {
    setSelectedDates((prev) => prev.filter((d) => d.toDateString() !== date.toDateString()));
  }

  const canSubmit = selectedDates.length > 0 && !isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px] bg-white text-black p-0 gap-0 overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">
            {isAllMode ? 'Clonar todo el parte' : 'Clonar registros seleccionados'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isAllMode
              ? 'Se clonarán todas las filas del parte a las fechas seleccionadas'
              : `Se clonarán ${rowCount} ${rowCount === 1 ? 'registro' : 'registros'} a las fechas seleccionadas`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Calendar multi-select */}
          <div className="rounded-md border border-input bg-background p-4">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates: Date[] | undefined) => setSelectedDates(dates ?? [])}
              captionLayout="dropdown"
              className="rounded-lg border shadow-sm w-full"
            />
          </div>

          {/* Selected dates as removable badges */}
          {selectedDates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Fechas seleccionadas:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDates.map((date) => (
                  <Badge key={date.toISOString()} variant="secondary" className="flex items-center gap-1">
                    {moment(date).format('DD/MM/YYYY')}
                    <button
                      type="button"
                      onClick={() => removeDate(date)}
                      className="ml-1 rounded-full text-xs hover:bg-muted"
                      aria-label={`Eliminar fecha ${moment(date).format('DD/MM/YYYY')}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">Opciones de clonado:</div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-employees"
                checked={includeEmployees}
                onCheckedChange={(checked) => setIncludeEmployees(checked as boolean)}
              />
              <Label htmlFor="include-employees">Incluir empleados (copiar empleados activos asignados)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-equipment"
                checked={includeEquipment}
                onCheckedChange={(checked) => setIncludeEquipment(checked as boolean)}
              />
              <Label htmlFor="include-equipment">Incluir equipos (copiar vehículos asignados)</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutate()} disabled={!canSubmit}>
            {isPending ? 'Clonando...' : 'Clonar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Run check-types**

```bash
npm run check-types
```

Expected: sin errores nuevos.

---

## Task 6: BulkEditModal + bulkUpdateRowStatus — Opciones legacy

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/actions.server.ts`
- Modify: `src/features/Operaciones/PartesDiarios/detail/components/BulkEditModal.tsx`

### Paso 6.1 — Extender BulkRowUpdateData y bulkUpdateRowStatus

- [ ] **Step 1: Actualizar `BulkRowUpdateData` interface en `actions.server.ts`**

Buscar `export interface BulkRowUpdateData` y reemplazar:

```typescript
/** Datos para edición masiva de filas */
export interface BulkRowUpdateData {
  status?: string;
  working_day?: string;
  type_service?: 'mensual' | 'adicional' | 'adicional_permanente' | null;
  description?: string | null;
  /** Motivo de cancelación (requerido cuando status = 'cancelado') */
  cancel_reason?: string | null;
  /**
   * Fecha destino para reprogramación (YYYY-MM-DD).
   * Cuando se provee con status = 'reprogramado', se crean nuevas filas en esa fecha.
   */
  reschedule_date?: string | null;
  /**
   * Pseudo-estados que modifican completed_day / completed_night en lugar del status.
   * Se resuelven en bulkUpdateRowStatus y nunca se persisten como status.
   */
  completar_diurno?: boolean;
  completar_nocturno?: boolean;
}
```

- [ ] **Step 2: Reemplazar la función `bulkUpdateRowStatus` completa en `actions.server.ts`**

Buscar `export async function bulkUpdateRowStatus` y reemplazar la función completa:

```typescript
export async function bulkUpdateRowStatus(rowIds: string[], data: BulkRowUpdateData) {
  logger.debug('Actualizando múltiples filas del parte diario', {
    data: { count: rowIds.length, fields: Object.keys(data) },
  });

  if (rowIds.length === 0) {
    return { count: 0 };
  }

  try {
    // ── Completar diurno (pseudo-estado: solo setea completed_day = true) ────
    if (data.completar_diurno) {
      const result = await prisma.dailyreportrows.updateMany({
        where: { id: { in: rowIds } },
        data: { completed_day: true },
      });
      return { count: result.count };
    }

    // ── Completar nocturno (pseudo-estado: solo setea completed_night = true) ─
    if (data.completar_nocturno) {
      const result = await prisma.dailyreportrows.updateMany({
        where: { id: { in: rowIds } },
        data: { completed_night: true },
      });
      return { count: result.count };
    }

    // ── Reprogramado con fecha: clonar filas a destino + marcar origen ────────
    if (data.status === 'reprogramado' && data.reschedule_date) {
      await cloneDailyReportRows(rowIds, [data.reschedule_date], {
        includeEmployees: false,
        includeEquipment: false,
      });
      await prisma.dailyreportrows.updateMany({
        where: { id: { in: rowIds } },
        data: { status: 'reprogramado' },
      });
      return { count: rowIds.length };
    }

    // ── Actualización normal ─────────────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {};
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.working_day !== undefined) updatePayload.working_day = data.working_day;
    if (data.type_service !== undefined) updatePayload.type_service = data.type_service;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.cancel_reason !== undefined) updatePayload.cancel_reason = data.cancel_reason;

    const result = await prisma.dailyreportrows.updateMany({
      where: { id: { in: rowIds } },
      data: updatePayload,
    });

    return { count: result.count };
  } catch (error) {
    logger.error('Error al actualizar múltiples filas del parte diario', {
      data: { error, rowIds },
    });
    throw new Error('No se pudieron actualizar las filas del parte diario. Intente nuevamente.');
  }
}
```

### Paso 6.2 — Reemplazar BulkEditModal.tsx completo

- [ ] **Step 3: Reemplazar `BulkEditModal.tsx` completo**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon } from 'lucide-react';
import moment from 'moment';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { bulkUpdateRowStatus } from '../actions.server';
import type { DailyReportDetailRow } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const BASE_STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'sin_recursos_asignados', label: 'Sin recursos asignados' },
  { value: 'ejecutado', label: 'Ejecutado' },
  { value: 'reprogramado', label: 'Reprogramado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'en_certificacion', label: 'En certificación' },
];

/** Opciones exclusivas de jornadas 24 horas */
const OPTIONS_24H = [
  { value: 'completar_diurno', label: 'Completar turno diurno' },
  { value: 'completar_nocturno', label: 'Completar turno nocturno' },
];

const WORKING_DAY_OPTIONS = [
  { value: 'Jornada 8 horas', label: 'Jornada 8 horas' },
  { value: 'Jornada 12 horas', label: 'Jornada 12 horas' },
  { value: 'Jornada 24 horas', label: 'Jornada 24 horas' },
];

const TYPE_SERVICE_OPTIONS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'adicional', label: 'Adicional' },
  { value: 'adicional_permanente', label: 'Adicional Permanente' },
];

// ============================================================================
// SCHEMA
// ============================================================================

const formSchema = z
  .object({
    status: z.string().optional(),
    working_day: z.string().optional(),
    type_service: z.enum(['mensual', 'adicional', 'adicional_permanente']).optional(),
    cancel_reason: z.string().optional(),
    reschedule_date: z.string().optional(), // YYYY-MM-DD
  })
  .superRefine((data, ctx) => {
    const hasAnyField =
      data.status !== undefined || data.working_day !== undefined || data.type_service !== undefined;
    if (!hasAnyField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe seleccionar al menos un campo para actualizar',
        path: ['status'],
      });
    }
    if (data.status === 'cancelado' && !data.cancel_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El motivo de cancelación es requerido',
        path: ['cancel_reason'],
      });
    }
    if (data.status === 'reprogramado' && !data.reschedule_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de reprogramación es requerida',
        path: ['reschedule_date'],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: DailyReportDetailRow[];
  dailyReportId: string;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkEditModal({ open, onOpenChange, selectedRows, dailyReportId, onSuccess }: Props) {
  const queryClient = useQueryClient();

  // Detectar si hay filas de jornada 24h en la selección (habilita opciones extra)
  const has24hRows = selectedRows.some((r) => r.working_day === 'Jornada 24 horas');
  const statusOptions = has24hRows ? [...BASE_STATUS_OPTIONS, ...OPTIONS_24H] : BASE_STATUS_OPTIONS;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: undefined,
      working_day: undefined,
      type_service: undefined,
      cancel_reason: undefined,
      reschedule_date: undefined,
    },
  });

  const watchedStatus = form.watch('status');
  const showCancelReason = watchedStatus === 'cancelado';
  const showRescheduleDate = watchedStatus === 'reprogramado';
  const isPseudoStatus = watchedStatus === 'completar_diurno' || watchedStatus === 'completar_nocturno';

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const rowIds = selectedRows.map((r) => r.id);

      // Pseudo-estados de jornada 24h
      if (values.status === 'completar_diurno') {
        return bulkUpdateRowStatus(rowIds, { completar_diurno: true });
      }
      if (values.status === 'completar_nocturno') {
        return bulkUpdateRowStatus(rowIds, { completar_nocturno: true });
      }

      return bulkUpdateRowStatus(rowIds, {
        ...(values.status !== undefined ? { status: values.status } : {}),
        ...(values.working_day !== undefined ? { working_day: values.working_day } : {}),
        ...(values.type_service !== undefined ? { type_service: values.type_service } : {}),
        ...(values.cancel_reason ? { cancel_reason: values.cancel_reason } : {}),
        ...(values.reschedule_date ? { reschedule_date: values.reschedule_date } : {}),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-detail', dailyReportId] });
      onOpenChange(false);
      onSuccess();
      form.reset();
      toast.success(
        `${result.count} registro${result.count !== 1 ? 's' : ''} actualizado${result.count !== 1 ? 's' : ''} exitosamente`
      );
    },
    onError: () => {
      toast.error('Ocurrió un error al actualizar los registros');
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edición masiva</DialogTitle>
          <DialogDescription>
            Actualizando{' '}
            <strong>
              {selectedRows.length} registro{selectedRows.length !== 1 ? 's' : ''}
            </strong>{' '}
            seleccionado{selectedRows.length !== 1 ? 's' : ''}. Solo se actualizarán los campos que completes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Estado */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) => {
                      field.onChange(val === '_none' ? undefined : val);
                      // Limpiar campos condicionales al cambiar estado
                      form.setValue('cancel_reason', undefined);
                      form.setValue('reschedule_date', undefined);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin cambios" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Sin cambios</SelectItem>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Motivo de cancelación — solo si status = cancelado */}
            {showCancelReason && (
              <FormField
                control={form.control}
                name="cancel_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de cancelación</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ingrese el motivo..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fecha de reprogramación — solo si status = reprogramado */}
            {showRescheduleDate && (
              <FormField
                control={form.control}
                name="reschedule_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? moment(field.value).format('DD/MM/YYYY')
                              : 'Seleccionar fecha'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) =>
                            field.onChange(date ? moment(date).format('YYYY-MM-DD') : undefined)
                          }
                          captionLayout="dropdown"
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Jornada — no disponible para pseudo-estados 24h */}
            {!isPseudoStatus && (
              <FormField
                control={form.control}
                name="working_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jornada</FormLabel>
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(val) => field.onChange(val === '_none' ? undefined : val)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin cambios" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Sin cambios</SelectItem>
                        {WORKING_DAY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tipo de servicio — no disponible para pseudo-estados 24h */}
            {!isPseudoStatus && (
              <FormField
                control={form.control}
                name="type_service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de servicio</FormLabel>
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(val) =>
                        field.onChange(
                          val === '_none' ? undefined : (val as 'mensual' | 'adicional' | 'adicional_permanente')
                        )
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin cambios" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Sin cambios</SelectItem>
                        {TYPE_SERVICE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending || selectedRows.length === 0}>
                {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run check-types**

```bash
npm run check-types
```

Expected: sin errores nuevos.

---

## Task 7: Verificación final

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Run check-types completo**

```bash
npm run check-types
```

Expected: solo el error pre-existente en `actions.server.ts:1020` (TS2589: Type instantiation is excessively deep). Ningún error nuevo introducido por este PR.

- [ ] **Step 2: Smoke test manual — flujo básico**

Con la app corriendo (`npm run dev`), navegar a `/dashboard/operations/[uuid]` de un parte con al menos 3-5 filas y verificar:

1. **Columnas visibles**: todas visibles por defecto, solo Hora Inicio y Hora Fin ocultas
2. **Badge ejecutado parcial**: si hay una fila 24h con `completed_day=true` y status distinto de ejecutado, aparece el badge azul "Ejecutado parcial"
3. **Tooltip cancelado**: si hay una fila cancelada con motivo, hacer hover sobre el badge muestra el motivo
4. **Botón Editar en fila ejecutada de hoy**: visible
5. **Botón Editar en fila ejecutada de fecha pasada**: oculto
6. **Empleados**: todos visibles sin `+N`, badge naranja si el mismo empleado aparece en otra fila del parte
7. **Equipos**: todos visibles sin `+N`
8. **Botón Clonar**: visible aunque no haya filas seleccionadas, con label "Clonar todo el parte"
9. **Selección**: las filas con status ejecutado/sin_recursos/reprogramado no tienen checkbox habilitado
10. **Bulk Edit con 24h**: seleccionar una fila de jornada 24h, abrir Editar masivo → aparecen opciones "Completar turno diurno/nocturno"
11. **Bulk Edit cancelado**: seleccionar estado "Cancelado" → aparece campo de motivo
12. **Bulk Edit reprogramado**: seleccionar estado "Reprogramado" → aparece date picker de fecha
