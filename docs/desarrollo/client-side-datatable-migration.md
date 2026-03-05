# Migrar DataTable a Client-Side Navigation

## Problema que resuelve

Por defecto, cada cambio de filtro/paginacion/sorting en una DataTable ejecuta `router.push`, lo que dispara un **re-render completo del servidor** — incluyendo TODAS las tabs de la pagina, no solo la tabla activa. Esto causa:

- Delay de 1-2 segundos por cada interaccion
- Efecto visual "deshabilitado" (opacity-50) prolongado
- Re-ejecucion innecesaria de queries de permisos, otras tabs, etc.

## Solucion: modo client-side

Al pasar `queryFn` al componente `<DataTable>`, se activa el modo client-side:

- **URL**: se actualiza con `window.history.replaceState` (silencioso, sin navegacion)
- **Datos**: se obtienen via React Query (fetch directo, sin pasar por SSR)
- **Resultado**: filtros instantaneos, cache entre paginas, sin re-render de tabs hermanas

## Archivos base modificados (ya estan listos)

Estos archivos ya fueron modificados y soportan ambos modos (server y client-side). **No necesitan cambios adicionales al migrar una tabla.**

| Archivo                                                               | Cambio                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/shared/components/common/DataTable/useDataTable.ts`              | Option `clientSideNavigation` — usa replaceState                       |
| `src/shared/components/common/DataTable/DataTable.tsx`                | Props `queryFn`/`queryKey`/`onStateChange`, useQuery interno           |
| `src/shared/components/common/DataTable/DataTablePendingContext.tsx`  | Contexto extendido con `isClientSide`, `notifyUrlChange`, `urlVersion` |
| `src/shared/components/common/DataTable/DataTableTextFilter.tsx`      | Branch en `isClientSide` para replaceState                             |
| `src/shared/components/common/DataTable/DataTableDateRangeFilter.tsx` | Branch en `isClientSide` para replaceState                             |
| `src/shared/components/common/DataTable/types.ts`                     | Nuevas props en `DataTableProps`                                       |
| `src/app/dashboard/TanstackQueryInicializador.tsx`                    | `gcTime: 0` → `gcTime: 5 * 60 * 1000` (cache 5 min)                    |

## Pasos para migrar una tabla

### Prerequisito

La tabla debe usar el sistema **nuevo** de DataTable (Prisma, `@/shared/components/common/DataTable/`). Si usa el sistema viejo (`BaseDataTable`, Supabase), primero recrearla desde cero.

### Paso 1: Verificar el server action

El server action de datos paginados debe tener esta firma de retorno:

```typescript
// actions.server.ts
export async function getEntityPaginated(
  searchParams: DataTableSearchParams,
  ...extraArgs
): Promise<{ data: EntityItem[]; total: number }>;
```

Si ya devuelve `{ data, total }`, no necesita cambios.

### Paso 2: Agregar imports en el Client Component

```typescript
// _EntityDataTable.tsx
import { useCallback, useState } from 'react';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { getEntityPaginated } from '../actions.server';
```

### Paso 3: Agregar estado local para queries dependientes

Antes del bloque de facets, agregar:

```typescript
// Estado reactivo: cuando DataTable cambia filtros, actualiza currentParams
// → React Query de facets se re-ejecuta con params frescos
const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

const handleStateChange = useCallback((params: DataTableSearchParams) => {
  setCurrentParams(params);
}, []);

// queryFn para fetch client-side de datos de tabla
const tableQueryFn = useCallback(
  (params: DataTableSearchParams) => getEntityPaginated(params, ...extraArgs),
  [extraArgs] // dependencias estables
);
```

### Paso 4: Cambiar facets para usar currentParams

```diff
  const facetParams = useMemo(() => {
-   const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
+   const { page, pageSize, sort, sortBy, sortOrder, ...rest } = currentParams;
    return rest;
- }, [searchParams]);
+ }, [currentParams]);
```

### Paso 5: Agregar props al DataTable

```diff
  <DataTable
    columns={columns}
    data={data}
    totalRows={totalRows}
    searchParams={searchParams}
+   queryFn={tableQueryFn}
+   queryKey={['entity-list', ...stableKeys]}
+   onStateChange={handleStateChange}
    // ... resto de props
    exportConfig={{
-     fetchAllData: () => getAllForExport(searchParams, ...),
+     fetchAllData: () => getAllForExport(currentParams, ...),
      // ... resto
    }}
  />
```

### Paso 6: Verificar que funciona

1. Aplicar un filtro facetado → datos se actualizan instantaneamente
2. Cambiar de pagina → datos cambian
3. Volver a la pagina anterior → datos vienen del cache (instantaneo)
4. Verificar que la URL se actualiza correctamente
5. Recargar la pagina → datos SSR se cargan (primer render)
6. Verificar que las tabs hermanas NO se re-renderizan al filtrar

## Como funciona internamente

```
Filtro click
  → TanStack Table onColumnFiltersChange
  → useDataTable.updateURL (client-side mode)
  → window.history.replaceState (URL silenciosa)
  → notifyUrlChange() → urlVersion++
  → state useMemo re-computa (lee window.location.search)
  → stateSearchParams cambia
  → React Query key cambia → fetch nuevos datos
  → onStateChange(params) → parent actualiza facets query
```

## Notas importantes

- **Backward compatible**: tablas sin `queryFn` siguen usando `router.push` como siempre
- **queryKey debe ser estable**: no incluir objetos que cambien en cada render. Usar valores primitivos (strings, booleans)
- **onStateChange es opcional**: solo necesario si la tabla tiene facets u otras queries que dependen del estado de la tabla
- **exportConfig.fetchAllData**: usar `currentParams` (no `searchParams` original) para que la exportacion respete los filtros actuales
- **gcTime global**: cambiado a 5 minutos — datos se mantienen en cache al cambiar de tab y volver
- **El efecto deshabilitado (opacity-50)**: usa `isPlaceholderData` de React Query — solo se aplica cuando se muestran datos stale de un query key anterior mientras carga nuevos. Si los datos vienen del cache (navegación entre páginas ya visitadas), el efecto NO se aplica y el cambio es instantáneo

## Tablas migradas

- [x] Empleados activos / inactivos (`_EmployeeDataTable.tsx`)
