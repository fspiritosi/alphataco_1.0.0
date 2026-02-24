# DataTable con Prisma (Sistema Actual)

## Cuando Aplica Esta Regla

Aplica cuando:

- Estes **creando** una nueva tabla paginada
- Estes **modificando** una tabla existente (columnas, filtros, export)
- Estes **auditando** una tabla para verificar completitud
- Encuentres una tabla que usa el **sistema viejo** (debe migrarse)

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
<DataTable
  columns={columns}
  data={data}
  totalRows={total}
  searchParams={searchParams}
  facetedFilters={facetedFilters}     // Filtros con externalCounts
  exportConfig={exportConfig}         // Excel con formatters
  tableId="entities"                  // Persistencia de preferencias en BD
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

## Permisos y Acciones (Proteccion Obligatoria)

Los permisos se cargan **en el servidor** con `getModulePermissions()` y se pasan al Client Component como prop. Nunca se re-fetchean en el cliente.

- **Boton "Nuevo"**: Envuelto en `<PermissionGuard module="x" tab="y" action="create">` en el Server Component o Client Component.
- **Columna actions**: Se genera condicionalmente con `getColumns(permissions)`. Si el usuario no tiene ningun permiso de accion, la columna NO aparece.
- **Pagina completa**: Envuelta en `<PermissionGuard module="x" action="view" redirect>` en el Server Component.

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

| Marcador | Descripcion |
|----------|-------------|
| `BaseDataTable` | Componente viejo de `@/shared/components/data-table/base/` |
| `queryWithPagination` | Helper de Supabase de `probando.ts` |
| `supabaseServer()` en queries de tabla | Fetching directo con Supabase |
| `toolbarOptions` prop | Prop del sistema viejo (nuevo usa `facetedFilters`) |
| `accessorKey: 'relation.field'` | Dot-notation de Supabase (nuevo usa `accessorFn`) |
| `fetchData` / `fetchAllData` props | Props del BaseDataTable (nuevo usa `exportConfig.fetchAllData`) |
| `savedVisibility` / `savedFilters` de cookies | Persistencia en cookies (nuevo usa BD) |
| `filterableColumns` / `searchableColumns` | Config vieja de toolbar |
| Import de `@/shared/components/data-table/` | Path del componente viejo |
| `import { cookies }` para tabla | Persistencia vieja |

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
