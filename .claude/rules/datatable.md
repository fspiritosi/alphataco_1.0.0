# DataTable Server-Side con Supabase

## Cuando Usar Esta Guia

Esta documentacion aplica cuando:

- Estes **creando una nueva tabla** con paginacion server-side
- Estes **modificando columnas** de una tabla existente
- Estes **agregando filtros** a una tabla
- Estes **configurando relaciones** de Supabase en columnas
- Estes trabajando con `BaseDataTable` o `fetchData` functions

## Arquitectura General

```
{Feature}Table.tsx (Server Component)
    ↓ Carga inicial SSR
{Feature}TableClient.tsx (Client Component)
    ↓ Props y configuracion
BaseDataTable (Componente reutilizable)
```

## Estructura de Archivos

```
src/features/{Feature}/
├── {Feature}Table.tsx              # Server Component (entry point)
├── components/
│   └── {Feature}TableClient.tsx    # Client Component con columnas
└── ...

src/app/server/GET/
└── probando.ts                     # Funciones de fetching genericas
```

## Server Component (Entry Point)

```typescript
// {Feature}Table.tsx
import { fetch{Feature}Data } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import {Feature}TableClient from './components/{Feature}TableClient';

async function {Feature}Table() {
  const cookiesStore = await cookies();

  // Persistencia de estado en cookies
  const savedVisibility = cookiesStore.get(`{tableId}`)?.value;
  const savedFilters = cookiesStore.get(`{tableId}-filters`)?.value;

  // Carga inicial SSR
  const initialData = await fetch{Feature}Data({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <{Feature}TableClient
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}

export default {Feature}Table;
```

## Funcion de Fetching

```typescript
// src/app/server/GET/probando.ts
export async function fetch{Feature}Data(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'{table_name}'>[];
}) {
  const data = await queryWithPagination(
    '{table_name}',
    // Query con relaciones
    '*,relation1(id,name),relation2(id,name),pivot_table(related_table(id,name))',
    {
      ...options,
      sorting: [...options.sorting, { id: 'default_sort_column', desc: true }],
      is_active: true, // Filtro permanente opcional
    }
  );
  return data;
}

// Funcion para exportacion (todos los datos)
export async function fetchAll{Feature}Data(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  const result = await queryWithPagination(
    '{table_name}',
    '*,relation1(id,name),relation2(id,name)',
    {
      pageIndex: 0,
      pageSize: 10000,
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: false,
    }
  );
  return result;
}
```

## Sintaxis de Query de Supabase

```typescript
// Columnas directas
'*'; // Todas las columnas de la tabla principal

// Relacion simple (FK directa)
'relation_alias(id,name)';
// Donde: relation_alias = nombre de la tabla relacionada
// La FK se infiere automaticamente por Supabase

// Relacion Many-to-Many (tabla pivot)
'pivot_table(related_table(id,name))';
// Ejemplo: contractor_employee(customers(id,name))

// Query completa ejemplo:
'empleado_aptitudes(aptitudes_tecnicas(nombre)),*,types_of_contract(id,name),hierarchy(id,name),provinces(id,name),contractor_employee(customers(id,name))';
```

## Definicion de Columnas

### Regla Critica: accessorKey = id

**El `accessorKey` y el `id` de cada columna DEBEN ser identicos y seguir el patron de la query de Supabase.**

```typescript
// ✅ CORRECTO
{
  accessorKey: 'provinces.name',
  id: 'provinces.name',
  // ...
}

// ❌ INCORRECTO
{
  accessorKey: 'province',  // No coincide con la query
  id: 'provinceName',       // Diferente al accessorKey
}
```

### Columnas Directas (tabla principal)

```typescript
{
  accessorKey: 'lastname',
  id: 'lastname',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Apellido" />,
  cell: ({ row }) => <div>{row.original.lastname || '-'}</div>,
  filterFn: (row, id, value) => {
    return value.includes(String(row.getValue(id)));
  },
}
```

### Columnas con Relacion Simple (FK)

```typescript
// Query: 'provinces(id,name)'
// FK en tabla principal: province → provinces.id
{
  accessorKey: 'provinces.name',  // alias.columna
  id: 'provinces.name',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Provincia" />,
  cell: ({ row }) => <div>{row.original.provinces?.name || '-'}</div>,
  filterFn: (row, id, value) => {
    return value.includes(String(row.getValue(id)));
  },
}
```

### Columnas con Relacion Many-to-Many

```typescript
// Query: 'contractor_employee(customers(id,name))'
// Relacion: employees ← contractor_employee → customers
{
  accessorKey: 'contractor_employee.customers.name',
  id: 'contractor_employee.customers.name',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Afectaciones" />,
  cell: ({ row }) => {
    const contractors = row.original.contractor_employee || [];

    if (contractors.length === 0) {
      return <Badge>Sin afectar</Badge>;
    }

    const contractorNames = contractors
      .map((c) => c?.customers?.name || '')
      .filter(Boolean);

    const firstContractor = contractorNames[0] || '—';

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">
              <Badge>
                {firstContractor}
                {contractorNames.length > 1 && ` +${contractorNames.length - 1}`}
              </Badge>
            </div>
          </TooltipTrigger>
          {contractorNames.length > 1 && (
            <TooltipContent className="text-white bg-black rounded-lg p-2">
              <div className="flex flex-col gap-1">
                {contractorNames.map((name, index) => (
                  <span key={index}>{name}</span>
                ))}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  },
  filterFn: (row, id, filterValue) => {
    if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
      return true;
    }
    const contractors = row.original.contractor_employee || [];
    if (contractors.length === 0) return false;
    return contractors.some((c) => {
      const name = c?.customers?.name;
      return name && filterValue.flat().includes(name);
    });
  },
  exportFormatter: (value, row) => {
    const contractors = row.contractor_employee
      ?.map((c) => c.customers?.name || '')
      .filter(Boolean);
    return contractors?.length > 0 ? contractors.join(', ') : 'Sin afectar';
  },
}
```

### Columnas con Formato de Fecha

```typescript
{
  accessorKey: 'date_of_admission',
  id: 'date_of_admission',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de ingreso" />,
  cell: ({ row }) => (
    <div>
      {row.original.date_of_admission
        ? moment(row.original.date_of_admission).format('DD/MM/YYYY')
        : '-'}
    </div>
  ),
}
```

### Columnas con Badge de Estado

```typescript
{
  accessorKey: 'status',
  id: 'status',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
  cell: ({ row }) => {
    type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
    type StatusType = 'Completo' | 'Incompleto' | 'Completo con doc vencida' | 'default';

    const variantStatus: Record<StatusType, BadgeVariant> = {
      Completo: 'success',
      Incompleto: 'destructive',
      'Completo con doc vencida': 'yellow',
      default: 'default',
    };

    return (
      <Badge
        variant={row.original.status
          ? variantStatus[row.original.status as StatusType] || 'default'
          : 'default'}
        className="capitalize"
      >
        {row.original.status || 'Sin estado'}
      </Badge>
    );
  },
}
```

## Sistema de Filtros

### Filtros Simples (columnas directas con ENUM)

```typescript
{
  columnId: 'gender',
  title: 'Genero',
  config: {
    tableName: 'employees',
    select: 'gender' as '*',
    p_filters: { is_active: 'true', company_id: company_id! },
    mapper: (data) => {
      return data.map((value) => ({
        label: String(value.display_value),
        value: String(value.col_value),
        count: value.col_count,
      }));
    },
  },
}
```

### Filtros con Relacion Simple

```typescript
{
  columnId: 'provinces.name',  // DEBE coincidir con el id de la columna
  title: 'Provincia',
  config: {
    tableName: 'employees',
    select: 'provinces.name' as '*',
    relation: '{"provinces": "province"}',  // { tabla_relacionada: columna_fk }
    p_filters: { is_active: 'true', company_id: company_id! },
    mapper: (data) => {
      return data.map((value) => ({
        label: String(value.display_value),
        value: String(value.col_value),
        count: value.col_count,
      }));
    },
  },
}
```

**Formato de `relation`:**

```typescript
'{"nombre_tabla_relacionada": "columna_fk_en_tabla_principal"}';

// Ejemplos:
'{"provinces": "province"}'; // employees.province → provinces.id
'{"hierarchy": "hierarchical_position"}'; // employees.hierarchical_position → hierarchy.id
'{"cost_center": "cost_center_id"}'; // employees.cost_center_id → cost_center.id
```

### Filtros con Multi-Join (Many-to-Many)

```typescript
{
  columnId: 'contractor_employee.customers.name',  // DEBE coincidir con el id de la columna
  title: 'Afectaciones',
  config: {
    tableName: 'employees' as const,
    select: 'id' as '*',
    multiJoinPaths: {
      joins: [
        {
          from_table: 'employees',
          to_table: 'contractor_employee',
          from_column: 'id',
          to_column: 'employee_id',
        },
        {
          from_table: 'contractor_employee',
          to_table: 'customers',
          from_column: 'contractor_id',
          to_column: 'id',
        },
      ],
      final_column: 'customers.name',
    },
    p_filters: { is_active: 'true', company_id: company_id! },
    mapper: (data) => {
      return data
        .filter((value) => value.col_value !== null)
        .map((value) => ({
          label: String(value.display_value),
          value: String(value.col_value),
          count: value.col_count,
        }));
    },
  },
}
```

## Configuracion del BaseDataTable

```typescript
<BaseDataTable
  columns={columns}
  savedVisibility={savedVisibility}
  initialData={initialData}
  tableId="{uniqueTableId}"           // ID unico para cookies
  enableRowSelection={true}
  serverSide={true}
  fetchData={fetch{Feature}Data}
  fetchAllData={handleFetchAllData}   // Para exportacion
  queryKey="{unique-query-key}"
  toolbarOptions={{
    initialVisibleFilters: savedFilters,
    showExport: true,
    searchableColumns: [
      { columnId: 'lastname', placeholder: 'Buscar por nombre' }
    ],
    filterableColumns: [
      // Array de filtros (ver seccion anterior)
    ],
    showFilterOptions: true,
  }}
/>
```

## Mapeo de Relaciones DB → Columnas

| Columna en DB           | FK apunta a            | Query Supabase               | accessorKey/id           | Acceso en cell                         |
| ----------------------- | ---------------------- | ---------------------------- | ------------------------ | -------------------------------------- |
| `province`              | `provinces.id`         | `provinces(id,name)`         | `provinces.name`         | `row.original.provinces?.name`         |
| `city`                  | `cities.id`            | `cities(id,name)`            | `city`                   | `row.original.cities?.name`            |
| `hierarchical_position` | `hierarchy.id`         | `hierarchy(id,name)`         | `hierarchy.name`         | `row.original.hierarchy?.name`         |
| `company_position`      | `company_positions.id` | `company_positions(id,name)` | `company_positions.name` | `row.original.company_positions?.name` |
| `type_of_contract`      | `types_of_contract.id` | `types_of_contract(id,name)` | `types_of_contract.name` | `row.original.types_of_contract?.name` |

## Relaciones Inversas (Many-to-Many)

| Tabla Pivot           | Relacion                                              | Query                                            | accessorKey/id                                 |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `contractor_employee` | `employees ← contractor_employee → customers`         | `contractor_employee(customers(id,name))`        | `contractor_employee.customers.name`           |
| `empleado_aptitudes`  | `employees ← empleado_aptitudes → aptitudes_tecnicas` | `empleado_aptitudes(aptitudes_tecnicas(nombre))` | `empleado_aptitudes.aptitudes_tecnicas.nombre` |

## Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE DATOS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Query Supabase:                                            │
│     'provinces(id,name)' ← Define alias de relacion            │
│                                                                 │
│  2. accessorKey/id:                                            │
│     'provinces.name' ← Ruta de acceso (alias.columna)          │
│                                                                 │
│  3. cell render:                                               │
│     row.original.provinces?.name ← Acceso real al dato         │
│                                                                 │
│  4. filterFn:                                                  │
│     row.getValue('provinces.name') ← Usa el id                 │
│                                                                 │
│  5. Filter config:                                             │
│     columnId: 'provinces.name' ← Debe coincidir con id         │
│     relation: '{"provinces": "province"}' ← FK mapping         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Errores Comunes en DataTable

```typescript
// ❌ accessorKey diferente al id
{ accessorKey: 'province', id: 'provinceName' }
// ✅ CORRECTO
{ accessorKey: 'provinces.name', id: 'provinces.name' }

// ❌ columnId del filtro no coincide con id de columna
// Columna: id: 'provinces.name'
// Filtro: columnId: 'province'
// ✅ CORRECTO
// Columna: id: 'provinces.name'
// Filtro: columnId: 'provinces.name'

// ❌ Acceso incorrecto en cell (para relacion provinces)
cell: ({ row }) => <div>{row.original.province}</div>
// ✅ CORRECTO
cell: ({ row }) => <div>{row.original.provinces?.name}</div>

// ❌ Olvidar optional chaining en relaciones
row.original.provinces.name  // Error si provinces es null
// ✅ CORRECTO
row.original.provinces?.name || '-'
```

## Checklist

- [ ] Crear funcion `fetch{Feature}Data` en `probando.ts`
- [ ] Crear funcion `fetchAll{Feature}Data` para exportacion
- [ ] Definir query de Supabase con todas las relaciones necesarias
- [ ] Crear Server Component con carga de cookies y datos iniciales
- [ ] Crear Client Component con definicion de columnas
- [ ] Verificar que cada `accessorKey` = `id` = patron de query
- [ ] Configurar filtros con `columnId` que coincida con `id` de columna
- [ ] Para relaciones simples: usar `relation` con formato `{"tabla": "fk"}`
- [ ] Para Many-to-Many: usar `multiJoinPaths` con cadena de joins
- [ ] Agregar `exportFormatter` para columnas complejas
- [ ] Configurar `toolbarOptions` con filtros y busqueda
