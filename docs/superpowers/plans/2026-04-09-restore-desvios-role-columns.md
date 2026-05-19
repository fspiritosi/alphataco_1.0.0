# Restaurar Desvíos y Columnas de Rol — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar paridad funcional con producción: 4 columnas de rol, desvíos completos para empleados y equipos, y orden de columnas original.

**Architecture:** Se reutiliza el RPC existente `get_daily_report_deviations` via el hook `useValidationData` que llama a `getDailyReportDeviations` (ya existe en `actions/actions.ts`). Las funciones `getEmployeeDeviation`/`getEquipmentDeviation` se pasan a `getColumns` para rendering de badges con colores y tooltips por desvío.

**Tech Stack:** React 19, TanStack Table, React Query, Supabase RPC, moment.js, shadcn/ui Badge + Tooltip

---

## Spec de referencia

`docs/superpowers/specs/2026-04-09-restore-desvios-role-columns-design.md`

---

### Task 1: Crear hook `useValidationData`

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/hooks/useValidationData.ts`

- [ ] **Step 1: Crear el hook**

```typescript
// src/features/Operaciones/PartesDiarios/detail/hooks/useValidationData.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getDailyReportDeviations, type EmployeeDeviation, type EquipmentDeviation } from '../../actions/actions';

export const VALIDATION_QUERY_KEY = ['daily-report-deviations'] as const;

/**
 * Hook para obtener desvíos del parte diario via RPC.
 * Aplana rows_with_deviations en maps employee_id:row_id y equipment_id:row_id
 * para acceso O(1) por celda en la tabla.
 */
export function useValidationData(dailyReportId: string, reportDate: string) {
  const { data, isLoading } = useQuery({
    queryKey: [...VALIDATION_QUERY_KEY, dailyReportId, reportDate],
    queryFn: () => getDailyReportDeviations(dailyReportId, reportDate),
    enabled: !!dailyReportId && !!reportDate,
    staleTime: 30 * 1000,
  });

  const employeeDeviationMap = useMemo(() => {
    const map = new Map<string, EmployeeDeviation>();
    if (!data?.rows_with_deviations) return map;
    for (const row of data.rows_with_deviations) {
      for (const dev of row.employee_deviations) {
        map.set(`${dev.employee_id}:${row.row_id}`, dev);
      }
    }
    return map;
  }, [data?.rows_with_deviations]);

  const equipmentDeviationMap = useMemo(() => {
    const map = new Map<string, EquipmentDeviation>();
    if (!data?.rows_with_deviations) return map;
    for (const row of data.rows_with_deviations) {
      for (const dev of row.equipment_deviations) {
        map.set(`${dev.equipment_id}:${row.row_id}`, dev);
      }
    }
    return map;
  }, [data?.rows_with_deviations]);

  const getEmployeeDeviation = (employeeId: string, rowId: string): EmployeeDeviation | null => {
    return employeeDeviationMap.get(`${employeeId}:${rowId}`) ?? null;
  };

  const getEquipmentDeviation = (equipmentId: string, rowId: string): EquipmentDeviation | null => {
    return equipmentDeviationMap.get(`${equipmentId}:${rowId}`) ?? null;
  };

  return {
    isLoading,
    getEmployeeDeviation,
    getEquipmentDeviation,
  };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types 2>&1 | head -30`
Expected: Sin errores en el nuevo archivo.

---

### Task 2: Actualizar `getColumns` — signature y tipos de desvío

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/columns.tsx`

Este task cambia la signature de `getColumns` para recibir las funciones de desvío y el loading state, y agrega los tipos necesarios.

- [ ] **Step 1: Agregar import de tipos de desvío y cn**

Al inicio del archivo, agregar:

```typescript
import { cn } from '@/lib/utils';
import type { EmployeeDeviation, EquipmentDeviation } from '../actions/actions';
```

Nota: `cn` ya debería estar disponible. Si no existe `@/lib/utils`, usar `import { cn } from '@/shared/lib/utils'` — verificar el path correcto con grep antes.

- [ ] **Step 2: Agregar type `DeviationGetters`**

Después del type `RowActionHandlers`, agregar:

```typescript
// ============================================================================
// DEVIATION GETTERS TYPE
// ============================================================================

export type DeviationGetters = {
  getEmployeeDeviation: (employeeId: string, rowId: string) => EmployeeDeviation | null;
  getEquipmentDeviation: (equipmentId: string, rowId: string) => EquipmentDeviation | null;
  loadingValidations: boolean;
};
```

- [ ] **Step 3: Cambiar signature de `getColumns`**

Cambiar de:

```typescript
export function getColumns(
  permissions: Permissions,
  handlers: RowActionHandlers,
  reportDate: string
): ColumnDef<DailyReportDetailRow>[] {
```

A:

```typescript
export function getColumns(
  permissions: Permissions,
  handlers: RowActionHandlers,
  reportDate: string,
  deviations: DeviationGetters
): ColumnDef<DailyReportDetailRow>[] {
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run check-types 2>&1 | head -30`
Expected: Error en `_DailyReportDetailDataTable.tsx` porque falta el 4to argumento — se arregla en Task 4.

---

### Task 3: Reescribir badge cells con desvíos completos

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/columns.tsx`

- [ ] **Step 1: Reemplazar `EmployeeBadgeCell` y agregar `renderEmployeeBadge`**

Reemplazar completamente la función `EmployeeBadgeCell` (líneas 73-118) y la función helper `getDuplicatedEmployeeIds` (líneas 55-67) por:

```typescript
// ============================================================================
// EMPLOYEE BADGE — con desvíos completos del RPC
// ============================================================================

function renderEmployeeBadge(
  employeeName: string,
  employeeId: string | undefined,
  rowId: string,
  deviations: DeviationGetters,
  key?: string | number
) {
  const deviation = employeeId ? deviations.getEmployeeDeviation(employeeId, rowId) : null;

  const isDuplicated = deviation?.is_duplicated ?? false;
  const isUnassigned = deviation?.is_unassigned_to_client ?? false;
  const hasNoDiagram = deviation?.has_no_diagram ?? false;
  const hasNonWorkDay = deviation?.is_non_work_day ?? false;
  const diagramTypeName = deviation?.diagram_type_name ?? null;

  let badgeVariant: 'default' | 'outline' | 'secondary' = 'default';
  let badgeClassName = 'select-none text-nowrap text-xs font-normal';

  const hasBothDeviations = isUnassigned && hasNoDiagram;

  if (deviations.loadingValidations) {
    badgeVariant = 'secondary';
    badgeClassName = cn(badgeClassName, 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400');
  } else if (isDuplicated || isUnassigned || hasNoDiagram || hasNonWorkDay) {
    badgeVariant = 'outline';
    if (isDuplicated) {
      badgeClassName = cn(
        badgeClassName,
        'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-400'
      );
    } else if (hasBothDeviations) {
      badgeClassName = cn(
        badgeClassName,
        'border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-400'
      );
    } else if (isUnassigned) {
      badgeClassName = cn(
        badgeClassName,
        'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
      );
    } else if (hasNoDiagram) {
      badgeClassName = cn(
        badgeClassName,
        'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-400'
      );
    } else {
      // hasNonWorkDay
      badgeClassName = cn(
        badgeClassName,
        'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-400'
      );
    }
  } else {
    badgeClassName = cn(badgeClassName, 'dark:text-black');
  }

  const tooltipMessages: string[] = [];
  if (deviations.loadingValidations) {
    tooltipMessages.push('Validando asignaciones...');
  } else {
    if (isDuplicated) tooltipMessages.push('Empleado asignado en múltiples filas');
    if (isUnassigned) tooltipMessages.push('No asignado al cliente de esta fila');
    if (hasNoDiagram) tooltipMessages.push('Sin diagrama cargado para este día');
    if (hasNonWorkDay) tooltipMessages.push(`Día no laboral: ${diagramTypeName || 'No laboral'}`);
    if (tooltipMessages.length === 0) tooltipMessages.push('Empleado asignado correctamente');
  }

  return (
    <TooltipProvider key={key} delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className={badgeClassName}>
            {employeeName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipMessages.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EmployeeBadgeCell({ row, deviations }: { row: DailyReportDetailRow; deviations: DeviationGetters }) {
  const relations = row.dailyreportemployeerelations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {relations.map((rel) => {
        const emp = rel.employees;
        if (!emp) return null;
        const label = `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
        return renderEmployeeBadge(label, emp.id, row.id, deviations, rel.employee_id ?? rel.id);
      })}
    </div>
  );
}
```

- [ ] **Step 2: Reemplazar `EquipmentBadgeCell` con desvíos completos**

Reemplazar completamente la función `EquipmentBadgeCell` (líneas 124-182) por:

```typescript
// ============================================================================
// EQUIPMENT BADGE CELL — con desvíos completos del RPC
// ============================================================================

const CONDITION_LABELS: Record<string, string> = {
  'no operativo': 'No operativo',
  en_reparacion: 'En reparación',
  'en reparacion': 'En reparación',
  'operativo condicionado': 'Condicionado',
  en_preparacion: 'En preparación',
  'en preparacion': 'En preparación',
};

function EquipmentBadgeCell({ row, deviations }: { row: DailyReportDetailRow; deviations: DeviationGetters }) {
  const relations = row.dailyreportequipmentrelations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {relations.map((rel) => {
        // Vehículo
        if (rel.vehicles && rel.equipment_id) {
          const v = rel.vehicles;
          const equipmentName = v.domain || v.intern_number || '';
          if (!equipmentName.trim()) return null;

          const deviation = v.id ? deviations.getEquipmentDeviation(v.id, row.id) : null;
          const isDuplicated = deviation?.is_duplicated ?? false;
          const isUnassigned = deviation?.is_unassigned_to_client ?? false;
          const condition = deviation?.condition || v.condition || 'operativo';
          const hasConditionIssue = ['no operativo', 'en reparacion', 'en_reparacion'].includes(condition);
          const isNonStandardCondition = condition !== 'operativo';

          let badgeVariant: 'default' | 'outline' | 'secondary' = 'default';
          let badgeClassName = 'select-none text-nowrap text-xs font-normal';

          if (deviations.loadingValidations) {
            badgeVariant = 'secondary';
            badgeClassName = cn(badgeClassName, 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400');
          } else if (isDuplicated) {
            badgeVariant = 'outline';
            badgeClassName = cn(
              badgeClassName,
              'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-400'
            );
          } else if (condition === 'no operativo') {
            badgeVariant = 'outline';
            badgeClassName = cn(
              badgeClassName,
              'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-400'
            );
          } else if (condition === 'en reparacion' || condition === 'en_reparacion') {
            badgeVariant = 'outline';
            badgeClassName = cn(
              badgeClassName,
              'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-400'
            );
          } else if (isUnassigned) {
            badgeVariant = 'outline';
            badgeClassName = cn(
              badgeClassName,
              'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
            );
          } else if (condition === 'operativo condicionado') {
            badgeVariant = 'outline';
            badgeClassName = cn(
              badgeClassName,
              'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-400'
            );
          } else if (condition === 'en preparacion' || condition === 'en_preparacion') {
            badgeVariant = 'outline';
            badgeClassName = cn(
              badgeClassName,
              'border-gray-400 bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-500'
            );
          } else {
            badgeClassName = cn(badgeClassName, 'dark:text-black');
          }

          const tooltipMessages: string[] = [];
          if (deviations.loadingValidations) {
            tooltipMessages.push('Validando asignaciones...');
          } else {
            if (hasConditionIssue || isNonStandardCondition) {
              tooltipMessages.push(`Condición: ${CONDITION_LABELS[condition] ?? condition}`);
            }
            if (isDuplicated) tooltipMessages.push('Asignado en múltiples filas del parte diario');
            if (isUnassigned) tooltipMessages.push('No asignado al cliente de esta fila');
            if (tooltipMessages.length === 0) tooltipMessages.push('Equipo asignado correctamente');
          }

          return (
            <TooltipProvider key={rel.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={badgeVariant} className={badgeClassName}>
                    {equipmentName}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {tooltipMessages.map((msg, i) => (
                    <p key={i}>{msg}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        // Otro equipo operativo
        if (rel.other_equipment && rel.other_equipment_id) {
          const o = rel.other_equipment;
          const otherName = o.intern_number || o.serial_number || '';
          if (!otherName.trim()) return null;

          return (
            <TooltipProvider key={rel.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="select-none text-nowrap text-xs font-normal border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400"
                  >
                    {otherName}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Otro Equipo Operativo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return null;
      })}
    </div>
  );
}
```

---

### Task 4: Agregar 4 columnas de rol y reordenar columnas

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/columns.tsx`

- [ ] **Step 1: Reordenar columnas y agregar las 4 de rol**

Dentro de `getColumns`, desestructurar `deviations`:

```typescript
const { getEmployeeDeviation, getEquipmentDeviation, loadingValidations } = deviations;
```

Luego reordenar el array `return [...]` con las columnas en el orden original. Insertar después de `customer_equipment` y antes de `employees`:

```typescript
    // ── Chofer Día ────────────────────────────────────────────────────────────
    {
      id: 'chofer_dia',
      accessorFn: (row) => {
        const rel = row.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia');
        const emp = rel?.employees;
        return emp ? `${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim() : '';
      },
      meta: { title: 'Chofer Día' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chofer Día" />,
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is12or24 = workingDay === 'jornada 12 horas' || workingDay === 'jornada 24 horas';
        if (!is12or24) return <span className="text-muted-foreground">-</span>;

        const employeeRel = row.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia');
        if (!employeeRel?.employees) {
          return <span className="text-muted-foreground">Sin asignar</span>;
        }

        const emp = employeeRel.employees;
        const name = `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
        return renderEmployeeBadge(name, emp.id, row.original.id, deviations);
      },
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia')?.employees;
        const empB = rowB.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia')?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      exportFormatter: (_value: unknown, row: DailyReportDetailRow) => {
        const emp = row.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia')?.employees;
        return emp ? `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim() : '';
      },
    },

    // ── Ayudante Día ──────────────────────────────────────────────────────────
    {
      id: 'ayudante_dia',
      accessorFn: (row) => {
        const rel = row.dailyreportemployeerelations.find((r) => r.role === 'ayudante_dia');
        const emp = rel?.employees;
        return emp ? `${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim() : '';
      },
      meta: { title: 'Ayudante Día' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ayudante Día" />,
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is12or24 = workingDay === 'jornada 12 horas' || workingDay === 'jornada 24 horas';
        if (!is12or24) return <span className="text-muted-foreground">-</span>;

        const employeeRel = row.original.dailyreportemployeerelations.find((r) => r.role === 'ayudante_dia');
        if (!employeeRel?.employees) {
          return <span className="text-muted-foreground italic">Opcional</span>;
        }

        const emp = employeeRel.employees;
        const name = `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
        return renderEmployeeBadge(name, emp.id, row.original.id, deviations);
      },
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations.find((r) => r.role === 'ayudante_dia')?.employees;
        const empB = rowB.original.dailyreportemployeerelations.find((r) => r.role === 'ayudante_dia')?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      exportFormatter: (_value: unknown, row: DailyReportDetailRow) => {
        const emp = row.dailyreportemployeerelations.find((r) => r.role === 'ayudante_dia')?.employees;
        return emp ? `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim() : '';
      },
    },

    // ── Chofer Noche ──────────────────────────────────────────────────────────
    {
      id: 'chofer_noche',
      accessorFn: (row) => {
        const rel = row.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche');
        const emp = rel?.employees;
        return emp ? `${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim() : '';
      },
      meta: { title: 'Chofer Noche' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chofer Noche" />,
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is24 = workingDay === 'jornada 24 horas';
        if (!is24) return <span className="text-muted-foreground">-</span>;

        const employeeRel = row.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche');
        if (!employeeRel?.employees) {
          return <span className="text-muted-foreground">Sin asignar</span>;
        }

        const emp = employeeRel.employees;
        const name = `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
        return renderEmployeeBadge(name, emp.id, row.original.id, deviations);
      },
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche')?.employees;
        const empB = rowB.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche')?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      exportFormatter: (_value: unknown, row: DailyReportDetailRow) => {
        const emp = row.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche')?.employees;
        return emp ? `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim() : '';
      },
    },

    // ── Ayudante Noche ────────────────────────────────────────────────────────
    {
      id: 'ayudante_noche',
      accessorFn: (row) => {
        const rel = row.dailyreportemployeerelations.find((r) => r.role === 'ayudante_noche');
        const emp = rel?.employees;
        return emp ? `${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim() : '';
      },
      meta: { title: 'Ayudante Noche' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ayudante Noche" />,
      cell: ({ row }) => {
        const workingDay = row.original.working_day?.toLowerCase() || '';
        const is24 = workingDay === 'jornada 24 horas';
        if (!is24) return <span className="text-muted-foreground">-</span>;

        const employeeRel = row.original.dailyreportemployeerelations.find((r) => r.role === 'ayudante_noche');
        if (!employeeRel?.employees) {
          return <span className="text-muted-foreground italic">Opcional</span>;
        }

        const emp = employeeRel.employees;
        const name = `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
        return renderEmployeeBadge(name, emp.id, row.original.id, deviations);
      },
      sortingFn: (rowA, rowB) => {
        const empA = rowA.original.dailyreportemployeerelations.find((r) => r.role === 'ayudante_noche')?.employees;
        const empB = rowB.original.dailyreportemployeerelations.find((r) => r.role === 'ayudante_noche')?.employees;
        const nameA = empA ? `${empA.lastname} ${empA.firstname}` : '';
        const nameB = empB ? `${empB.lastname} ${empB.firstname}` : '';
        return nameA.localeCompare(nameB);
      },
      exportFormatter: (_value: unknown, row: DailyReportDetailRow) => {
        const emp = row.dailyreportemployeerelations.find((r) => r.role === 'ayudante_noche')?.employees;
        return emp ? `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim() : '';
      },
    },
```

- [ ] **Step 2: Actualizar columna Empleados — pasar `deviations`**

Cambiar el cell de la columna `employees` para pasar deviations:

```typescript
cell: ({ row }) => (
  <EmployeeBadgeCell row={row.original} deviations={deviations} />
),
```

Nota: se elimina `table` como argumento — ya no se necesita `allRows` porque las validaciones vienen del RPC.

- [ ] **Step 3: Actualizar columna Equipos — pasar `deviations`**

Cambiar el cell de la columna `equipment`:

```typescript
cell: ({ row }) => <EquipmentBadgeCell row={row.original} deviations={deviations} />,
```

- [ ] **Step 4: Reordenar columnas al orden original**

El orden final del array `return [...]` debe ser:

1. `select`
2. `customer` (Cliente)
3. `service` (Servicio)
4. `item` (Ítem)
5. `sector` (Sector) — nuevo
6. `area` (Área) — nuevo
7. `type_service` (Tipo Servicio)
8. `customer_equipment` (Equipo cliente) — **mover aquí arriba**
9. `chofer_dia` (Chofer Día) — nuevo
10. `ayudante_dia` (Ayudante Día) — nuevo
11. `chofer_noche` (Chofer Noche) — nuevo
12. `ayudante_noche` (Ayudante Noche) — nuevo
13. `employees` (Empleados)
14. `equipment` (Equipo)
15. `working_day` (Jornada)
16. `start_time` (Hora Inicio)
17. `end_time` (Hora Fin)
18. `status` (Estado)
19. `description` (Descripción) — nuevo
20. `remit_number` (Nro Remito) — nuevo
21. `completed_day` (Completado Día) — nuevo
22. `completed_night` (Completado Noche) — nuevo
23. `actions`

- [ ] **Step 5: Agregar export formatters para las 4 role columns en `_DailyReportDetailDataTable.tsx`**

En el objeto `exportFormatters`, agregar:

```typescript
chofer_dia: (val: unknown) => String(val ?? ''),
ayudante_dia: (val: unknown) => String(val ?? ''),
chofer_noche: (val: unknown) => String(val ?? ''),
ayudante_noche: (val: unknown) => String(val ?? ''),
```

---

### Task 5: Integrar `useValidationData` en `_DailyReportDetailDataTable`

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/components/_DailyReportDetailDataTable.tsx`

- [ ] **Step 1: Importar hook**

Agregar import:

```typescript
import { useValidationData } from '../hooks/useValidationData';
```

- [ ] **Step 2: Llamar al hook**

Después de la línea `const { invalidateDetail } = useDailyReportDetailInvalidation();` (línea 136), agregar:

```typescript
// ── Desvíos via RPC ──────────────────────────────────────────────────────
const {
  isLoading: loadingValidations,
  getEmployeeDeviation,
  getEquipmentDeviation,
} = useValidationData(dailyReportId, reportDate);
```

- [ ] **Step 3: Crear objeto `deviations` y pasarlo a `getColumns`**

Después de la línea `const permissions = useMemo(...)` (línea 198), agregar:

```typescript
const deviationGetters = useMemo(
  () => ({
    getEmployeeDeviation,
    getEquipmentDeviation,
    loadingValidations,
  }),
  [getEmployeeDeviation, getEquipmentDeviation, loadingValidations]
);
```

Y cambiar la línea `const columns = useMemo(...)` a:

```typescript
const columns = useMemo(
  () => getColumns(permissions, handlers, reportDate, deviationGetters),
  [permissions, handlers, reportDate, deviationGetters]
);
```

- [ ] **Step 4: Agregar importación de `DeviationGetters` type**

Actualizar el import de `columns`:

```typescript
import { HIDDEN_COLUMNS_BY_DEFAULT, getColumns, type RowActionHandlers, type DeviationGetters } from '../columns';
```

Nota: `DeviationGetters` se importa para que esté disponible si se necesita tipado explícito. Si el check-types no lo requiere, se puede omitir.

- [ ] **Step 5: Verificar tipos**

Run: `npm run check-types 2>&1 | head -50`
Expected: Sin errores.

---

### Task 6: Verificación visual

- [ ] **Step 1: Verificar que la app compila**

Run: `npm run check-types`
Expected: Sin errores.

- [ ] **Step 2: Verificación manual**

Abrir el detalle de un parte diario en el browser. Verificar:

1. Las 4 columnas de rol aparecen en el orden correcto
2. Chofer día / ayudante día solo se muestran para jornada 12h o 24h
3. Chofer noche / ayudante noche solo para jornada 24h
4. Los badges de empleados tienen colores según desvíos (naranja, azul, rojo, amarillo, púrpura)
5. Los tooltips muestran los mensajes correctos al hacer hover
6. Los badges de equipos tienen colores por condición y asignación
7. La columna "Equipos Cliente" aparece después de "Tipo Servicio"
8. Las columnas nuevas (Sector, Área, Descripción, etc.) siguen visibles
