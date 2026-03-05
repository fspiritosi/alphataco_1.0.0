# DataTable con Prisma (Sistema Actual)

## Cuando Aplica Esta Regla

Aplica cuando:

- Estes **creando** una nueva tabla paginada
- Estes **modificando** una tabla existente (columnas, filtros, export)
- Estes **auditando** una tabla para verificar completitud
- Encuentres una tabla que usa el **sistema viejo** (debe migrarse)

## CHECKLIST OBLIGATORIO — TODA TABLA NUEVA O MODIFICADA

**VERIFICAR CADA ÍTEM. Ninguno es opcional salvo que tenga justificación explícita.**

### SERVER COMPONENT ({Entity}List.tsx)

- [ ] `TABLE_ID` constante definida como string (ej: `const tableId = 'vehicles'`)
- [ ] **`stripPrefixFromSearchParams(searchParams, tableId)` — SIEMPRE OBLIGATORIO**, aplicado antes del `Promise.all`. Sin esto, si se agrega otra tabla a la página los URL params se mezclarán
- [ ] `getTablePreferences(tableId)` llamado en el `Promise.all`
- [ ] Permisos cargados en servidor (`getUserPermissionsMapServer()` o `getModulePermissions()`) y pasados como prop al Client Component (solo si la tabla tiene columna `actions` con botones protegidos)
- [ ] `<PermissionGuard module="x" action="view" redirect>` envuelve la página completa (si aplica a la tabla)
- [ ] **NO cargar facets en SSR** — los facets se cargan lazy (on-demand) en el cliente. El Server Component NO debe llamar a `getXxxFacets()` ni pasar `initialFacets` como prop
- [ ] Card wrapper: `<Card><CardContent className="pt-6">` envuelve el Client Component **salvo que el componente padre ya provea un `<Card>`** — en ese caso omitir o reemplazar por `<div>` para evitar Card anidada. Verificar el árbol de componentes antes de decidir.

### CLIENT COMPONENT (\_{Entity}DataTable.tsx)

- [ ] **`paramNamespace={tableId}` en `<DataTable>` — CRÍTICO SIN EXCEPCIÓN**. Sin esto, los filtros/ordenamiento se mezclan entre tablas si hay más de una en la página. El costo de incluirlo es cero; el costo de omitirlo puede ser bugs difíciles de detectar
- [ ] `tableId={tableId}` en `<DataTable>` para persistencia de preferencias
- [ ] `searchPlaceholder` prop presente y descriptivo
- [ ] `showFilterToggle={true}` prop presente
- [ ] `emptyMessage` prop presente (en español)
- [ ] **Lazy-load facets con `fetchFacet`** — cada filtro facetado DEBE usar `fetchFacet` en vez de `options`/`externalCounts` estáticos. Ver sección "Lazy-Load Facets" abajo
- [ ] `exportConfig` configurado con formatters para TODOS los campos exportables (enums→labels, fechas→DD/MM/YYYY, booleanos→Sí/No)
- [ ] Permisos recibidos como prop del Server Component — NUNCA re-fetched en el cliente (solo si la tabla tiene columna `actions`)
- [ ] Acciones individuales (editar/eliminar) condicionadas a permisos dentro de la columna `actions` — nunca ocultar la columna completa
- [ ] Solo 3 filtros visibles por defecto (`DEFAULT_VISIBLE_FILTERS`)

### CLIENT-SIDE NAVIGATION MODE — OBLIGATORIO

- [ ] **`queryFn` prop en `<DataTable>` — OBLIGATORIO**. Activa client-side mode: datos via React Query + `replaceState` en vez de `router.push` + SSR. Sin esto, cada filtro/paginación re-renderiza TODA la página
- [ ] **`queryKey` prop estable** — valores primitivos (strings, booleans), NO objetos
- [ ] **`onStateChange` + `currentParams` (useState)** — el Client Component DEBE mantener `currentParams` en estado local para export con filtros activos
- [ ] **`tableQueryFn` memoizado con `useCallback`** — referencia estable para React Query
- [ ] **`exportConfig.fetchAllData` usa `currentParams`** — para respetar filtros activos en la exportación
- [ ] **Referencia**: `docs/desarrollo/client-side-datatable-migration.md` (guía paso a paso)

### LAZY-LOAD FACETS — OBLIGATORIO

- [ ] **`fetchFacet` en cada filtro facetado** — cada filtro carga sus opciones+counts on-demand al abrir el popover. NO usar `options`/`externalCounts` props estáticos
- [ ] **`getEntitySingleFacet(columnId, ...args, searchParams)` en `actions.server.ts`** — función que retorna `{ counts: Map, resolvedOptions?: [...] }` para UNA sola columna
- [ ] **`crossWhere(excludeColumn)` dentro de `getEntitySingleFacet`** — cross-filter obligatorio: excluir filtro propio de la columna
- [ ] **Helpers `buildEnumFacetResult` y `buildFkFacetResult`** en el Client Component para reducir boilerplate al construir `FacetResult`
- [ ] **Factory callbacks `makeEnumFetchFacet` y `makeFkFetchFacet`** con `useCallback` para referencia estable
- [ ] **NO pasar `isFetchingFacets` al DataTable** — cada filtro maneja su propio loading internamente via `useQuery`
- [ ] **NO cargar facets en SSR** — el Server Component NO llama a `getEntityFacets()`. Solo carga datos paginados + preferencias
- [ ] **Referencia**: `src/shared/components/common/DataTable/DOCS.md` sección "Lazy-Load Facets (On-Demand)"

### COLUMNS (columns.tsx)

- [ ] `meta: { title: 'X' }` en TODA columna de datos — sin excepción (para toggle de columnas y cabecera de Excel)
- [ ] `meta: { excludeFromExport: true }` en columnas `select` y `actions`
- [ ] FK: `accessorFn` con `id` explícito — NUNCA `accessorKey` con dot-notation como `'relation.name'`
- [ ] `filterFn` en TODA columna con filtro `faceted`
- [ ] Fechas: `moment(val).format('DD/MM/YYYY')` — NUNCA date-fns
- [ ] Enums: labels de `@/shared/utils/mappers.ts`
- [ ] `NULL_FILTER_VALUE` en `filterFn` de TODA columna FK nullable (verificar null antes de comparar)
- [ ] TODAS las columnas ordenables excepto `select`, `actions` y M:M

### SERVER ACTION (actions.server.ts)

- [ ] Fetching con Prisma — NUNCA Supabase directo
- [ ] `buildWhereClause()` helper interno compartido entre paginated, export y facets (NO duplicar lógica)
- [ ] `VALID_SORT_FIELDS` whitelist + `FK_SORT_MAP` para columnas FK
- [ ] Multi-sort: iterar `state.sorting` (array) — NO usar `state.sortBy` (patrón viejo)
- [ ] `buildSearchWhere`, `buildFiltersWhere`, `buildTextFiltersWhere`, `buildDateRangeFiltersWhere`
- [ ] **`getXxxSingleFacet(columnId, ...args, searchParams)` — función de facet por columna individual** con `crossWhere(excludeColumn)`. Retorna `{ counts: Map, resolvedOptions? }`. Reemplaza al viejo `getXxxFacets()` que cargaba TODAS las facetas en una sola llamada
- [ ] `getXxxForExport()` sin `skip`/`take`, usa `buildWhereClause` (misma lógica de filtros)
- [ ] Tipo inferido: `Awaited<ReturnType<typeof getXxx>>['data'][number]` — NUNCA tipar manualmente
- [ ] Logger (`new Logger(...)`) + try-catch en todas las funciones

### FALLBACK

- [ ] Componente Skeleton dedicado en `fallback/` folder
- [ ] Usado en `<Suspense fallback={<XxxSkeleton />}>` en el TabContent padre — NUNCA `<div>Cargando...</div>`

---

## Componente y Arquitectura Obligatorios

**SIEMPRE** usar el `DataTable` de `@/shared/components/common/DataTable/` con Prisma.

```
page.tsx (thin)
  └── {Entity}List.tsx  (Server Component — fetch Prisma + permisos)
        └── _{Entity}DataTable.tsx  (Client Component — filtros + interactividad)
              └── <DataTable />  (componente compartido)
```

**Documentacion detallada:**

- **Plantilla completa**: `.claude/skills/new-datatable/SKILL.md`
- **API del componente**: `src/shared/components/common/DataTable/DOCS.md`
- **Regla de filtros**: `.claude/rules/datatable-filters.md`
- **Agente experto**: `.claude/agents/table-expert.md`

## Fetching con Prisma (NO Supabase)

```typescript
// actions.server.ts — SIEMPRE Prisma
'use server';
import { prisma } from '@/shared/lib/prisma';
import {
  parseSearchParams, stateToPrismaParams,
  buildSearchWhere, buildFiltersWhere,
  buildTextFiltersWhere, buildDateRangeFiltersWhere,
} from '@/shared/components/common/DataTable';

export async function getEntitysPaginated(searchParams: DataTableSearchParams) {
  const state = parseSearchParams(searchParams);
  const { skip, take, orderBy } = stateToPrismaParams(state);
  // ... where con build*Where helpers ...
  const [data, total] = await Promise.all([
    prisma.entity.findMany({ where, skip, take, orderBy, select: { ... } }),
    prisma.entity.count({ where }),
  ]);
  return { data, total };
}

// Tipo inferido — NUNCA tipar manualmente
export type EntityListItem = Awaited<ReturnType<typeof getEntitysPaginated>>['data'][number];
```

## Props Clave del Nuevo DataTable

```typescript
// Estado reactivo para client-side navigation mode
const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);
const handleStateChange = useCallback((params: DataTableSearchParams) => {
  setCurrentParams(params);
}, []);
const tableQueryFn = useCallback(
  (params: DataTableSearchParams) => getEntityPaginated(params),
  []
);

// ── Lazy-load facets — helpers y factories ──────────────────────────────
// Helper: construir FacetResult para enums
function buildEnumFacetResult(enumValues, labels, icons, counts): FacetResult {
  const options = enumValues.map(v => ({
    value: v, label: labels[v] ?? v, ...(icons?.[v] ? { icon: icons[v] } : {}),
  }));
  return { options, counts };
}

// Factory: crear fetchFacet callback para enums
const makeEnumFetchFacet = useCallback(
  (columnId, enumValues, labels, icons?) => {
    return async (params: DataTableSearchParams): Promise<FacetResult> => {
      const result = await getEntitySingleFacet(columnId, params);
      if (!result) return { options: [], counts: new Map() };
      return buildEnumFacetResult(enumValues, labels, icons, result.counts);
    };
  }, []
);

// Factory: crear fetchFacet callback para FK
const makeFkFetchFacet = useCallback(
  (columnId, nullLabel?) => {
    return async (params: DataTableSearchParams): Promise<FacetResult> => {
      const result = await getEntitySingleFacet(columnId, params);
      if (!result) return { options: [], counts: new Map() };
      return buildFkFacetResult(result.resolvedOptions, result.counts, nullLabel);
    };
  }, []
);

// ── Configurar facetedFilters con fetchFacet ────────────────────────────
const facetedFilters = useMemo(() => [
  {
    columnId: 'status',
    title: 'Estado',
    fetchFacet: makeEnumFetchFacet('status', Object.values(EntityStatus), statusLabels, statusIcons),
  },
  {
    columnId: 'type',
    title: 'Tipo',
    fetchFacet: makeFkFetchFacet('type'),
  },
  // ... más filtros
], [makeEnumFetchFacet, makeFkFetchFacet]);

<DataTable
  columns={columns}
  data={data}
  totalRows={total}
  searchParams={searchParams}
  queryFn={tableQueryFn}               // OBLIGATORIO — activa client-side mode
  queryKey={['entity-list']}           // OBLIGATORIO — key estable para React Query
  onStateChange={handleStateChange}    // Para export con filtros activos
  facetedFilters={facetedFilters}      // Filtros con fetchFacet (lazy-load)
  exportConfig={{
    fetchAllData: () => getAllForExport(currentParams),  // usa currentParams, NO searchParams
    ...
  }}
  tableId="entities"                   // Persistencia de preferencias en BD
  searchPlaceholder="Buscar..."
  showFilterToggle={true}
  emptyMessage="No hay registros"
/>
```

## Reglas de Presentacion

### Card Wrapper Obligatorio

**El DataTable DEBE estar envuelto en `<Card><CardContent className="pt-6">`** para dar fondo y contencion visual. Sin esto, la tabla queda con fondo transparente.

```typescript
<Card>
  <CardContent className="pt-6">
    <_EntityDataTable ... />
  </CardContent>
</Card>
```

### Filtros Visibles por Defecto: Maximo 3

**TODOS los filtros se crean, pero solo 3 se muestran inicialmente.** El usuario activa los demas con el toggle de filtros. Si el usuario ya tiene preferencias guardadas, se usan esas en su lugar.

Elegir los 3 filtros mas logicos/comunes para la entidad (ej: estado, tipo, condicion).

## Reglas de Columnas

1. **`meta: { title: 'X' }`** en TODA columna de datos (para toggle y Excel)
2. **`meta: { excludeFromExport: true }`** en `select` y `actions`
3. **FK**: usar `id` + `accessorFn` (NO `accessorKey` sobre el ID)
4. **`filterFn`**: obligatorio en columnas con filtro `faceted`
5. **Fechas**: `moment(val).format('DD/MM/YYYY')` (NO date-fns)
6. **Enums**: labels de `@/shared/utils/mappers.ts`
7. **Sorting**: TODAS las columnas son ordenables excepto `select`, `actions` y M:M. NO poner `enableSorting: false` en columnas FK — usar `FK_SORT_MAP` en el server action para resolver el orderBy con la relacion.
8. **NULL handling**: Columnas FK nullable DEBEN incluir `NULL_FILTER_VALUE` en el `filterFn` y opcion "Sin asignar" en el filtro facetado.

## Permisos y Acciones

> **Nota**: Este patron SOLO aplica si la tabla tiene una columna `actions` con botones de editar/eliminar. Si la tabla solo tiene un link "Ver detalle", no necesita pasar permisos al componente de tabla.

Los permisos se cargan **en el servidor** y se pasan como prop al Client Component. Nunca se re-fetchean en el cliente (no `useQuery`, no hooks de permisos en el Client).

### Patron con `getUserPermissionsMapServer()` (granular por tab)

Usar cuando se necesita verificar permisos de acciones específicas dentro de la columna actions (ej: "Ver" siempre visible, solo "Eliminar" requiere permiso):

```typescript
// TabContent.tsx (Server Component padre) — carga permisos UNA VEZ
import { checkPermissionServer, getUserPermissionsMapServer } from '@/features/Permissions';

export default async function {Entity}TabContent({ searchParams }: Props) {
  const [canCreate, permissionsMap] = await Promise.all([
    checkPermissionServer('{module}', '{tab_slug}', 'create'),
    getUserPermissionsMapServer(),
  ]);

  return (
    <>
      {canCreate && <CreateForm />}
      <Suspense fallback={<{Entity}TableSkeleton />}>
        <{Entity}List searchParams={searchParams} permissionsMap={permissionsMap} />
      </Suspense>
    </>
  );
}

// {Entity}List.tsx (Server Component) — recibe y reenvía el map
interface Props {
  searchParams: DataTableSearchParams;
  permissionsMap: Record<string, boolean>;
}

export async function {Entity}List({ searchParams, permissionsMap }: Props) {
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);
  const [{ data, total }, preferences] = await Promise.all([
    get{Entity}sPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);
  return (
    <_{Entity}DataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={TABLE_ID}
      permissionsMap={permissionsMap}           // ← map serializable del servidor
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}

// _{Entity}DataTable.tsx (Client Component) — construye helper desde el map
interface Props {
  // ...
  permissionsMap: Record<string, boolean>;  // ← "module:tab:action" → boolean
}

export function _{Entity}DataTable({ permissionsMap, ... }: Props) {
  // Construir helper de permisos — NO re-fetchear, NO useQuery, NO hooks de permisos
  const permissions = useMemo(
    () => ({
      hasPermission: (module: string, tab: string, action: string) =>
        permissionsMap[`${module}:${tab}:${action}`] === true,
    }),
    [permissionsMap]
  );

  const columns = useMemo(() => getColumns(permissions), [permissions]);
  // ...
}

// columns.tsx — recibe permissions y verifica acciones específicas
type Permissions = {
  hasPermission: (module: string, tab: string, action: string) => boolean;
};

export function getColumns(permissions: Permissions): ColumnDef<{Entity}ListItem>[] {
  const canDelete = permissions.hasPermission('{module}', '{tab_slug}', 'delete');

  return [
    // ... columnas de datos ...
    {
      id: 'actions',
      meta: { excludeFromExport: true, title: '' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {/* Link "Ver" siempre visible — no requiere permiso */}
          <Link href={`/dashboard/{module}/${row.original.id}`}>
            <Eye className="h-3.5 w-3.5" /> Ver
          </Link>
          {/* Eliminar SOLO si tiene permiso */}
          {canDelete && <Delete{Entity}Cell row={row} />}
        </div>
      ),
    },
  ];
}
```

**Regla clave**: Nunca ocultar la columna `actions` completa basándose en permisos — ocultar la **acción específica** dentro de la columna. Un link de navegación (Ver detalle) no requiere verificación de permisos.

## Sorting de Columnas FK (Relaciones)

Las columnas FK se ordenan server-side con un mapeo especial (`FK_SORT_MAP`) que traduce el columnId a un `orderBy` de Prisma con relacion:

```typescript
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  type: (dir) => ({ type: { name: dir } }),
  brand: (dir) => ({ brand_vehicles: { name: dir } }),
};

// En safeOrderBy:
const fkMapper = FK_SORT_MAP[state.sortBy];
resolvedSort = fkMapper ? fkMapper(dir) : { [state.sortBy]: dir };
```

## Manejo de Datos Null ("Sin asignar")

Para columnas FK nullable, usar el patron `NULL_FILTER_VALUE` de `helpers.ts`:

1. **Facets**: El `groupBy` incluye filas con null → se mapean a `NULL_FILTER_VALUE` como key en el Map
2. **Filtro**: Agregar opcion `{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }`
3. **filterFn**: Si el ID es null, comparar contra `NULL_FILTER_VALUE`
4. **Server where**: `buildFiltersWhere` ya maneja `NULL_FILTER_VALUE` → genera `{ field: null }`

```typescript
// filterFn en columns.tsx
filterFn: (row, _id, value: string[]) => {
  const id = row.original.relation?.id;
  if (id == null) return value.includes(NULL_FILTER_VALUE);
  return value.includes(id);
},
```

## Export Excel — Regla Suprema

TODA columna exportable debe tener dato legible:

- **Enums** → formatter con labels del mapper
- **Fechas** → formatter con `moment().format('DD/MM/YYYY')`
- **Booleanos** → formatter `val ? 'Si' : 'No'`
- **FK con accessorFn** → NO necesita formatter (ya retorna .name)

---

## SISTEMA VIEJO — DETECCION Y MIGRACION OBLIGATORIA

### Marcadores del Sistema Viejo (DEPRECADO)

Si encuentras CUALQUIERA de estos, la tabla usa el sistema viejo y **DEBE ser recreada desde cero**:

| Marcador                                      | Descripcion                                                     |
| --------------------------------------------- | --------------------------------------------------------------- |
| `BaseDataTable`                               | Componente viejo de `@/shared/components/data-table/base/`      |
| `queryWithPagination`                         | Helper de Supabase de `probando.ts`                             |
| `supabaseServer()` en queries de tabla        | Fetching directo con Supabase                                   |
| `toolbarOptions` prop                         | Prop del sistema viejo (nuevo usa `facetedFilters`)             |
| `accessorKey: 'relation.field'`               | Dot-notation de Supabase (nuevo usa `accessorFn`)               |
| `fetchData` / `fetchAllData` props            | Props del BaseDataTable (nuevo usa `exportConfig.fetchAllData`) |
| `savedVisibility` / `savedFilters` de cookies | Persistencia en cookies (nuevo usa BD)                          |
| `filterableColumns` / `searchableColumns`     | Config vieja de toolbar                                         |
| Import de `@/shared/components/data-table/`   | Path del componente viejo                                       |
| `import { cookies }` para tabla               | Persistencia vieja                                              |

### Marcadores de Facets Bulk (DEPRECADO — migrar a Lazy-Load)

Si encuentras CUALQUIERA de estos patrones, los facets usan el sistema viejo **bulk** y DEBEN migrarse a **lazy-load**:

| Marcador                                                      | Descripcion                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `getXxxFacets()` que retorna TODAS las facetas en una llamada | Patrón bulk — reemplazar por `getXxxSingleFacet(columnId, ...)`             |
| `initialFacets` prop en Client Component                      | Facets cargados en SSR — NO cargar en servidor, usar lazy-load              |
| `options: statusOptions` (array estático) en facetedFilters   | Opciones pre-calculadas — reemplazar por `fetchFacet`                       |
| `externalCounts: facets?.status` en facetedFilters            | Counts del bulk query — reemplazar por `fetchFacet`                         |
| `useQuery` de facets BULK en Client Component                 | Un solo `useQuery` que carga todas las facetas — eliminar                   |
| `isFetchingFacets` prop en `<DataTable>`                      | Loading state del bulk — no necesario con lazy-load (cada filtro lo maneja) |
| `getXxxFacets` en `Promise.all` del Server Component          | Facets en SSR — eliminar del `Promise.all`                                  |

### Regla de Migracion

**NUNCA parchear** una tabla del sistema viejo. Siempre recrear completamente:

1. Leer el Prisma schema de la entidad
2. Seguir `.claude/skills/new-datatable/SKILL.md` paso a paso
3. Crear `actions.server.ts` con Prisma (query paginada + export + facets)
4. Crear `columns.tsx` con la nueva API
5. Crear Server Component `{Entity}List.tsx`
6. Crear Client Component `_{Entity}DataTable.tsx`
7. Actualizar `page.tsx` para usar el nuevo componente
8. Eliminar archivos viejos y limpiar imports de Supabase

### Agente Experto

Delegar TODA tarea de DataTable al agente `table-expert`. Tiene modos:

- **AUDIT**: Verificar completitud de una tabla existente (si detecta sistema viejo → cambia a CREATE)
- **FIX**: Corregir problemas encontrados en audit
- **CREATE**: Crear tabla nueva desde cero O rehacer tabla vieja completamente

**Deteccion obligatoria**: Antes de cualquier modo, el agente ejecuta el Step 0 que detecta si la tabla usa el sistema viejo. Si lo usa, automaticamente cambia a CREATE para rehacer desde cero.
