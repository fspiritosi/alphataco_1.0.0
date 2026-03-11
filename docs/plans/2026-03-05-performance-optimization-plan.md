# Performance Optimization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use the `performance-optimizer` agent for AUDIT mode tasks. Use `git-guardian` agent for all commits.

**Goal:** Optimizar el rendimiento completo de la aplicacion a nivel macro y micro, priorizando tablas de mantenimiento, empleados y equipos.

**Architecture:** El componente DataTable compartido (`src/shared/components/common/DataTable/`) es la base de 21 tablas. Optimizar el componente compartido primero (Fase 0) impacta todas las tablas de golpe. Luego optimizar server actions individuales por modulo (Fases 1-3). Finalmente pages y bundle (Fases 4-5).

**Tech Stack:** Next.js 16, React 19, Prisma, TanStack Table, React Query, Supabase (auth)

---

## Fase 0: Quick Wins Globales (Componente DataTable Compartido)

Cambios en archivos compartidos que benefician a las 21 tablas simultaneamente.

---

### Task 0.1: Remover getFacetedRowModel/getFacetedUniqueValues innecesarios

**Files:**

- Modify: `src/shared/components/common/DataTable/DataTable.tsx:165-166`

**Contexto:** El DataTable configura `getFacetedRowModel()` y `getFacetedUniqueValues()` de TanStack Table, que calculan facets localmente sobre los datos de la pagina actual. Sin embargo, el sistema SIEMPRE usa `externalCounts` del servidor. Esto es trabajo CPU desperdiciado en cada render.

**Step 1: Verificar que ningun componente usa los facets locales**

- Buscar usos de `column.getFacetedUniqueValues()` en el proyecto
- El unico uso esta en `DataTableFacetedFilter.tsx:47` como fallback: `const facets = externalCounts ?? column?.getFacetedUniqueValues();`
- Como TODAS las tablas pasan `externalCounts`, el fallback nunca se ejecuta en produccion

**Step 2: Remover las dos lineas del useReactTable**
En `DataTable.tsx`, eliminar:

```typescript
// ANTES (lineas 165-166)
getFacetedRowModel: getFacetedRowModel(),
getFacetedUniqueValues: getFacetedUniqueValues(),

// DESPUES: eliminar ambas lineas completamente
```

**Step 3: Limpiar imports no usados**
En `DataTable.tsx`, remover de los imports de `@tanstack/react-table`:

```typescript
// ANTES
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel, // ← remover
  getFacetedUniqueValues, // ← remover
  useReactTable,
} from '@tanstack/react-table';

// DESPUES
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
```

**Step 4: Verificar tipos**
Run: `npm run check-types`
Expected: PASS sin errores

**Step 5: Commit**
Mensaje: `perf: remove unused getFacetedRowModel/getFacetedUniqueValues from DataTable`

---

### Task 0.2: Memoizar filterableColumns en DataTable.tsx

**Files:**

- Modify: `src/shared/components/common/DataTable/DataTable.tsx:104`

**Contexto:** `filterableColumns` se recalcula en cada render sin `useMemo`. Se pasa a `useDataTable` que lo usa en dependencias internas. Un nuevo array en cada render causa recalculos innecesarios.

**Step 1: Envolver en useMemo**

```typescript
// ANTES (linea 104)
const filterableColumns = facetedFilters.map((f) => f.columnId);

// DESPUES
const filterableColumns = React.useMemo(() => facetedFilters.map((f) => f.columnId), [facetedFilters]);
```

**Step 2: Verificar tipos**
Run: `npm run check-types`
Expected: PASS

**Step 3: Commit**
Mensaje: `perf: memoize filterableColumns in DataTable`

---

### Task 0.3: Estabilizar updateURL con useRef en useDataTable.ts

**Files:**

- Modify: `src/shared/components/common/DataTable/useDataTable.ts`

**Contexto:** `updateURL` depende de `state` y `searchParams`, que cambian en cada navegacion. Esto causa que `updateURL` se recree en cada cambio de URL, lo que a su vez recrea TODOS los handlers (`onPaginationChange`, `onSortingChange`, `onColumnFiltersChange`). Esto genera re-renders innecesarios en TanStack Table.

**Step 1: Agregar useRef para state y searchParams**

```typescript
// Agregar import de useRef (ya existe en el import de React hooks)
import { useCallback, useMemo, useRef, useTransition } from 'react';

// Despues de la linea que define `state` (useMemo), agregar:
const stateRef = useRef(state);
stateRef.current = state;

const searchParamsRef = useRef(searchParams);
searchParamsRef.current = searchParams;
```

**Step 2: Cambiar updateURL para usar refs en lugar de valores directos**

```typescript
// ANTES
const updateURL = useCallback(
  (newState: Partial<DataTableState>) => {
    const merged = { ...state, ...newState };
    const newParams = stateToSearchParams(merged);

    const finalParams = new URLSearchParams();

    if (prefix) {
      searchParams.forEach((value, key) => {
        if (!key.startsWith(prefix)) {
          finalParams.set(key, value);
        }
      });
      newParams.forEach((value, key) => {
        finalParams.set(`${prefix}${key}`, value);
      });
    } else {
      newParams.forEach((value, key) => {
        finalParams.set(key, value);
      });
    }

    const queryString = finalParams.toString();
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  },
  [state, pathname, router, startTransition, searchParams, prefix]
);

// DESPUES
const updateURL = useCallback(
  (newState: Partial<DataTableState>) => {
    const merged = { ...stateRef.current, ...newState };
    const newParams = stateToSearchParams(merged);

    const finalParams = new URLSearchParams();

    if (prefix) {
      searchParamsRef.current.forEach((value, key) => {
        if (!key.startsWith(prefix)) {
          finalParams.set(key, value);
        }
      });
      newParams.forEach((value, key) => {
        finalParams.set(`${prefix}${key}`, value);
      });
    } else {
      newParams.forEach((value, key) => {
        finalParams.set(key, value);
      });
    }

    const queryString = finalParams.toString();
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  },
  [pathname, router, startTransition, prefix]
);
```

**Step 3: Estabilizar resetFilters tambien**

```typescript
// ANTES
const resetFilters = useCallback(() => {
  if (prefix) {
    const finalParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (!key.startsWith(prefix)) {
        finalParams.set(key, value);
      }
    });
    const queryString = finalParams.toString();
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  } else {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }
}, [pathname, router, startTransition, searchParams, prefix]);

// DESPUES
const resetFilters = useCallback(() => {
  if (prefix) {
    const finalParams = new URLSearchParams();
    searchParamsRef.current.forEach((value, key) => {
      if (!key.startsWith(prefix)) {
        finalParams.set(key, value);
      }
    });
    const queryString = finalParams.toString();
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  } else {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }
}, [pathname, router, startTransition, prefix]);
```

**Step 4: Verificar tipos**
Run: `npm run check-types`
Expected: PASS

**Step 5: Commit**
Mensaje: `perf: stabilize updateURL callbacks with useRef to prevent re-render cascade`

---

### Task 0.4: Simplificar saveTableColumnVisibility a 1 query

**Files:**

- Modify: `src/shared/actions/table-preferences.ts:40-65`

**Contexto:** `saveTableColumnVisibility` hace `findUnique` + `upsert` (2 queries). Podemos usar un Prisma raw upsert con `jsonb_set` para hacer 1 query, o al menos usar `upsert` directamente con un merge en JS sin el findUnique previo.

**Step 1: Refactorizar saveTableColumnVisibility**

```typescript
// ANTES (2 queries)
export async function saveTableColumnVisibility(
  tableId: string,
  columnVisibility: Record<string, boolean>
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const key = `${userId}:${tableId}`;
    const existing = await prisma.user_table_preferences.findUnique({
      where: { user_id: key },
      select: { preferences: true },
    });

    const currentPrefs = (existing?.preferences as TablePref) ?? {};
    const updatedPrefs: TablePref = { ...currentPrefs, columnVisibility };

    await prisma.user_table_preferences.upsert({
      where: { user_id: key },
      create: { user_id: key, preferences: updatedPrefs },
      update: { preferences: updatedPrefs },
    });
  } catch (error) {
    logger.error('Error saving column visibility', { data: { error, tableId } });
  }
}

// DESPUES (1 query con raw SQL jsonb merge)
export async function saveTableColumnVisibility(
  tableId: string,
  columnVisibility: Record<string, boolean>
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const key = `${userId}:${tableId}`;
    const patch = JSON.stringify({ columnVisibility });

    await prisma.$executeRaw`
      INSERT INTO user_table_preferences (user_id, preferences)
      VALUES (${key}, ${patch}::jsonb)
      ON CONFLICT (user_id)
      DO UPDATE SET preferences = user_table_preferences.preferences || ${patch}::jsonb
    `;
  } catch (error) {
    logger.error('Error saving column visibility', { data: { error, tableId } });
  }
}
```

**Step 2: Aplicar el mismo patron a saveTableFilterVisibility**

```typescript
// DESPUES
export async function saveTableFilterVisibility(
  tableId: string,
  filterVisibility: Record<string, boolean>
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const key = `${userId}:${tableId}`;
    const patch = JSON.stringify({ filterVisibility });

    await prisma.$executeRaw`
      INSERT INTO user_table_preferences (user_id, preferences)
      VALUES (${key}, ${patch}::jsonb)
      ON CONFLICT (user_id)
      DO UPDATE SET preferences = user_table_preferences.preferences || ${patch}::jsonb
    `;
  } catch (error) {
    logger.error('Error saving filter visibility', { data: { error, tableId } });
  }
}
```

**Step 3: Verificar tipos**
Run: `npm run check-types`
Expected: PASS

**Step 4: Probar que las preferencias se guardan correctamente**

- Abrir cualquier tabla en el browser
- Toggle visibilidad de una columna
- Recargar la pagina
- Verificar que la columna sigue oculta

**Step 5: Commit**
Mensaje: `perf: reduce table preferences save from 2 queries to 1 with jsonb merge`

---

### Task 0.5: Agregar spinner overlay durante isPending

**Files:**

- Modify: `src/shared/components/common/DataTable/DataTable.tsx`

**Contexto:** Cuando el usuario cambia pagina/sort/filtro, el body de la tabla obtiene `opacity-50 pointer-events-none` pero no hay un indicador claro de carga. En tablas lentas la espera puede ser 2-3 segundos sin feedback.

**Step 1: Agregar import de Loader2**

```typescript
import { Loader2 } from 'lucide-react';
```

**Step 2: Envolver la tabla en un div relative y agregar overlay**

```typescript
// ANTES
<div className="rounded-md border overflow-auto max-h-[60vh]">
  <Table containerClassName="overflow-x-visible overflow-y-visible min-w-fit">

// DESPUES
<div className="relative rounded-md border overflow-auto max-h-[60vh]">
  {isPending && (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )}
  <Table containerClassName="overflow-x-visible overflow-y-visible min-w-fit">
```

**Step 3: Verificar tipos**
Run: `npm run check-types`
Expected: PASS

**Step 4: Commit**
Mensaje: `perf: add spinner overlay during table navigation pending state`

---

### Task 0.6: Centralizar toFacetMap en helpers.ts

**Files:**

- Modify: `src/shared/components/common/DataTable/helpers.ts` (agregar funcion)
- Modify: `src/shared/components/common/DataTable/index.ts` (re-exportar)
- Modify: 17 archivos `actions.server.ts` (reemplazar definicion local por import)

**Contexto:** `toFacetMap` esta definida localmente en 17 archivos con la misma logica. Centralizarla permite mejoras futuras en un solo lugar.

**Step 1: Agregar toFacetMap a helpers.ts**
Al final de `helpers.ts`, agregar:

```typescript
/**
 * Convierte el resultado de un Prisma groupBy a un Map<string, number>
 * para usar como externalCounts en filtros facetados.
 *
 * Maneja null/undefined como NULL_FILTER_VALUE y convierte bigint a string.
 */
export function toFacetMap(
  rows: { key: string | number | bigint | boolean | null | undefined; count: number }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const { key, count } of rows) {
    if (key == null) {
      map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
    } else {
      map.set(String(key), count);
    }
  }
  return map;
}
```

**Step 2: Exportar desde index.ts**
Agregar `toFacetMap` al barrel export en `index.ts`.

**Step 3: Reemplazar en cada actions.server.ts**
En cada uno de los 17 archivos:

1. Agregar `toFacetMap` al import de `@/shared/components/common/DataTable`
2. Eliminar la definicion local de `function toFacetMap(...)`

Lista de archivos a modificar:

- `features/Employees/Empleados/EmployeeList/actions.server.ts`
- `features/Equipos/Equipos/VehicleList/actions/actions.server.ts`
- `features/Equipos/Equipos/DadosDeBaja/Vehiculos/actions/actions.server.ts`
- `features/Equipos/Equipos/DadosDeBaja/OtrosEquipos/actions/actions.server.ts`
- `features/Equipos/OtherEquipment/list/actions.server.ts`
- `features/Documentacion/DocumentosEmpleados/Permanentes/actions.server.ts`
- `features/Documentacion/DocumentosEmpleados/Mensuales/actions.server.ts`
- `features/Documentacion/DocumentosEquipos/Permanentes/actions.server.ts`
- `features/Documentacion/DocumentosEquipos/Mensuales/actions.server.ts`
- `features/Formularios/ChecklistAnswers/actions.server.ts`
- `features/Operaciones/PartesDiarios/list/actions.server.ts`
- `features/Mantenimiento/RepairSolicitudes/actions.server.ts`
- `features/Mantenimiento/OrderManagement/actions.server.ts`
- `features/Mantenimiento/PedidosMantenimiento/Confirmados/actions.server.ts`
- `features/Mantenimiento/WorkshopTracking/actions.server.ts`
- `features/Mantenimiento/PendientesEjecutar/actions.server.ts`

**Step 4: Verificar tipos**
Run: `npm run check-types`
Expected: PASS

**Step 5: Commit**
Mensaje: `refactor: centralize toFacetMap in DataTable helpers (17 files)`

---

## Fase 1: Tablas de Mantenimiento (8 tablas)

> **Para cada tabla:** Usar el agente `performance-optimizer` en modo AUDIT primero, luego FIX.
> **Orden de prioridad:** De mas pesada a mas ligera.

### Task 1.1: Audit + Fix — Solicitudes de Mantenimiento

**Files principales:**

- `features/Mantenimiento/SolicitudesMantenimiento/actions/actionsTableServer.ts`
- `features/Mantenimiento/SolicitudesMantenimiento/_MaintenanceRequestDataTable.tsx`
- `features/Mantenimiento/SolicitudesMantenimiento/MaintenanceRequestList.tsx`
- `features/Mantenimiento/RepairSolicitudes/actions.server.ts`

**Problemas conocidos:**

- **CRITICAL:** `resolveLastModifiedByIds` carga TODOS los repairlogs de la compania (~50k+ rows)
- **CRITICAL:** `REPAIR_SOLICITUDES_SELECT` incluye TODOS los logs de cada solicitud
- **HIGH:** Facets M:M potencialmente secuenciales
- **MEDIUM:** `as any` casts en los dialogs

**Solucion propuesta:**

1. Denormalizar: agregar campo `last_modified_by_user_id` a `repair_solicitudes` (migracion)
2. Cambiar select para traer solo `take: 1` del ultimo log
3. Cargar logs completos solo en dialog de detalle (lazy)
4. Limpiar `as any` casts

### Task 1.2: Audit + Fix — Ordenes de Mantenimiento

**Files principales:**

- `features/Mantenimiento/MaintenanceOrders/table/actions.server.ts`
- `features/Mantenimiento/MaintenanceOrders/table/_MaintenanceOrderDataTable.tsx`
- `features/Mantenimiento/MaintenanceOrders/table/MaintenanceOrderList.tsx`

**Problemas conocidos:**

- **HIGH:** Nesting de 4 niveles en select (order → items → work_orders → items → repairs)
- **NOTA:** Ya tiene `'use cache'` (120s paginated, 180s facets) — evaluar si los TTL son adecuados

**Solucion propuesta:**

1. Evaluar si el progreso se puede pre-calcular con menor nesting
2. Si no, considerar campo denormalizado `progress_percentage` actualizado via trigger

### Task 1.3-1.8: Audit + Fix — Resto de tablas de mantenimiento

Para cada una de las siguientes, ejecutar AUDIT con el agente y aplicar FIX:

- 1.3: Gestion de ordenes (`OrderManagement`) — sin Card wrapper
- 1.4: Workshop tracking (`WorkshopTracking`)
- 1.5: Pedidos pendientes (`PendingOrders`)
- 1.6: Pedidos confirmados (`ConfirmedOrders`)
- 1.7: Para taller (`ForWorkshop`)
- 1.8: Pendientes ejecutar (`PendingExecution`)

---

## Fase 2: Tablas de Empleados y Equipos (5 tablas)

### Task 2.1: Audit + Fix — Empleados Activos

**Files principales:**

- `features/Employees/Empleados/EmployeeList/actions.server.ts`
- `features/Employees/Empleados/EmployeeList/_EmployeeDataTable.tsx`
- `features/Employees/Empleados/EmployeeList/EmployeeList.tsx`

**Problemas conocidos:**

- **CRITICAL:** 42+ queries por request de facets (22 groupBy + 12 findMany + 8 M:M)
- **HIGH:** M:M facets (contractor_employee + empleado_aptitudes) con queries secuenciales
- **MEDIUM:** Sin `'use cache'`

**Solucion propuesta:**

1. Agregar `'use cache'` con TTL de 120s a getPaginated y 180s a facets
2. Paralelizar queries M:M dentro del Promise.all existente
3. Evaluar consolidar groupBy en raw SQL (22 → 3-5 queries)

### Task 2.2: Audit + Fix — Vehiculos Activos

Similar a empleados pero con 24 queries de facets. Aplicar mismos patrones.

### Task 2.3-2.5: Audit + Fix — Otros equipos, inactivos

Para cada una, ejecutar AUDIT + FIX.

---

## Fase 3: Resto de Tablas (8 tablas)

- 3.1: Documentacion empleados permanentes
- 3.2: Documentacion empleados mensuales
- 3.3: Documentacion equipos permanentes
- 3.4: Documentacion equipos mensuales
- 3.5: Formularios
- 3.6: Respuestas de checklist
- 3.7: Partes diarios (falta Card wrapper)
- 3.8: Usuarios (ya tiene cache)

---

## Fase 4: Pages & Routing

> Usar agente `performance-optimizer` en modo AUDIT por page.

Para cada page principal (`/dashboard/maintenance`, `/dashboard/employee`, `/dashboard/equipment`, etc.):

1. **Audit de waterfalls** — Verificar que los fetches en Server Components son paralelos (Promise.all)
2. **Suspense boundaries** — Verificar que cada tab tiene su propio Suspense con skeleton dedicado
3. **Loading.tsx** — Verificar que son especificos (no genericos)
4. **Streaming** — Evaluar oportunidades de streaming con Suspense para secciones independientes
5. **Parallel routes** — Evaluar si alguna page se beneficia de parallel routes de Next.js

**Reglas Vercel a verificar:**

- `async-parallel` — Promise.all para operaciones independientes
- `async-suspense-boundaries` — Suspense para streaming
- `server-parallel-fetching` — Reestructurar para fetch paralelo
- `server-dedup-props` — No pasar mismos datos a multiples hijos
- `server-serialization` — Minimizar datos en props de RSC

---

## Fase 5: Bundle & Infraestructura

1. **Dynamic imports** — Buscar componentes pesados que se cargan estaticamente:

   - Dialogs/modals con forms complejos
   - Charts/graficos
   - Componentes de editor

2. **Barrel file audit** — Verificar imports de `@/components/ui/` y `@/features/`

   - Regla: `bundle-barrel-imports`

3. **next.config** — Verificar configuracion de optimizacion:

   - Headers de cache para assets estaticos
   - Compresion habilitada
   - Image optimization configurado

4. **Middleware** — Audit de peso y logica innecesaria

---

## Como Ejecutar Este Plan

**Para cada task:**

1. Invocar `performance-optimizer` en modo AUDIT para la entidad
2. Revisar el informe generado
3. Aprobar los cambios propuestos
4. Invocar `performance-optimizer` en modo FIX
5. Verificar con `npm run check-types`
6. Usar `git-guardian` para commit
7. Opcionalmente medir con MEASURE antes y despues

**Tracking:** El progreso se registra automaticamente en `memory/performance/optimization-tracker.md`
