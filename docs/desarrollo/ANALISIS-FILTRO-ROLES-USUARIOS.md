# Análisis: Sistema de Filtros en Tabla de Usuarios

## Resumen Ejecutivo

La tabla de usuarios (`UsersTableServer`) muestra usuarios de la tabla `share_company_users` y necesita implementar un filtro por roles. El desafío principal es que **no hay una relación directa** entre `share_company_users` y `user_roles`, requiriendo múltiples JOINs a través de varias tablas.

## Estructura de Relaciones

### Tablas Involucradas:

1. **`share_company_users`** (tabla principal)

   - `id` (UUID)
   - `profile_id` (UUID) → FK a `profile.id`
   - `company_id` (UUID)
   - `customer_id` (UUID, nullable)

2. **`profile`**

   - `id` (UUID) → **Es el mismo UUID que `auth.users.id`**
   - `email`, `fullname`, etc.

3. **`user_roles`** (tabla intermedia N:N)

   - `id` (UUID)
   - `user_id` (UUID) → FK a `auth.users.id` (que es igual a `profile.id`)
   - `role_id` (bigint) → FK a `roles.id`
   - `assigned_by`, `assigned_at`

4. **`roles`**
   - `id` (bigint)
   - `name` (text)
   - `color` (text)
   - `is_active` (boolean)

### Cadena de Relaciones:

```
share_company_users
  └─ profile_id → profile.id
       └─ profile.id = auth.users.id
            └─ user_roles.user_id = auth.users.id (= profile.id)
                 └─ user_roles.role_id → roles.id
                      └─ roles.name (valor final)
```

## Cómo Funcionan los Filtros Actualmente

### Sistema de Filtros en BaseDataTable

El sistema usa `DataTableFacetedFilter` que utiliza `querySelectDistinct` para obtener valores únicos y sus conteos.

### Tipos de Filtros Disponibles:

#### 1. **Filtro Simple con Relación Directa**

```typescript
{
  columnId: 'profile.email',
  title: 'Correo',
  config: {
    tableName: 'share_company_users',
    select: 'profile.email' as '*',
    relation: '{"profile": "profile_id"}', // JSON de relación
    p_filters: { company_id: company_id! },
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

**Cómo funciona:**

- `relation: '{"profile": "profile_id"}'` indica que hay una relación desde `share_company_users.profile_id` hacia `profile.id`
- La función RPC `select_distinct_values` hace el JOIN automáticamente
- `p_filters` aplica filtros adicionales (como `company_id`)

#### 2. **Filtro Complejo con Múltiples JOINs (multiJoinPaths)**

Para relaciones que requieren atravesar múltiples tablas:

```typescript
{
  columnId: 'service_sectors.sectors.name',
  title: 'Sector',
  config: {
    tableName: 'dailyreportrows',
    select: 'id' as '*',
    multiJoinPaths: {
      joins: [
        {
          from_table: 'dailyreportrows',
          to_table: 'service_sectors',
          from_column: 'sector_service_id',
          to_column: 'id',
        },
        {
          from_table: 'service_sectors',
          to_table: 'sectors',
          from_column: 'sector_id',
          to_column: 'id',
        },
      ],
      final_column: 'sectors.name',
    },
    p_filters: { daily_report_id: dailyReportId },
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

**Cómo funciona:**

- `multiJoinPaths.joins` define una serie de JOINs secuenciales
- Cada JOIN conecta `from_table.from_column` con `to_table.to_column`
- `final_column` especifica qué columna seleccionar del último JOIN
- La función RPC construye la query SQL con múltiples LEFT JOINs

### Aplicación de Filtros en la Query Principal

Cuando un usuario selecciona valores en el filtro, estos se pasan como `columnFilters` a `queryWithPagination`:

```typescript
// En queryWithPagination (probando.ts)
if (id.includes('.')) {
  // Es una relación anidada
  // Aplica filtros usando la notación de punto
  // Ejemplo: 'profile.email' o 'user_roles.roles.name'
}
```

El sistema detecta automáticamente relaciones anidadas usando la notación de punto (`.`) y aplica los filtros correspondientes.

## Problema Específico: Filtrar por Roles

### El Desafío:

1. **No hay relación directa**: `share_company_users` no tiene una columna que apunte directamente a `roles`
2. **Requiere múltiples JOINs**:
   - `share_company_users` → `profile` (por `profile_id`)
   - `profile` → `user_roles` (por `id = user_id`, porque `profile.id = auth.users.id`)
   - `user_roles` → `roles` (por `role_id`)
3. **Relación N:N**: Un usuario puede tener múltiples roles
4. **La columna en la tabla usa `accessorKey`**: `'user_roles.roles.name'` pero el valor real viene de un hook client-side

### Solución Propuesta:

Usar **`multiJoinPaths`** para hacer los múltiples JOINs necesarios:

```typescript
{
  columnId: 'user_roles.roles.name', // Debe coincidir con accessorKey en columns
  title: 'Rol',
  config: {
    tableName: 'share_company_users',
    select: 'id' as '*',
    multiJoinPaths: {
      joins: [
        {
          from_table: 'share_company_users',
          to_table: 'profile',
          from_column: 'profile_id',
          to_column: 'id',
        },
        {
          from_table: 'profile',
          to_table: 'user_roles',
          from_column: 'id',
          to_column: 'user_id',
        },
        {
          from_table: 'user_roles',
          to_table: 'roles',
          from_column: 'role_id',
          to_column: 'id',
        },
      ],
      final_column: 'roles.name',
    },
    p_filters: { company_id: company_id! },
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

### Consideraciones Importantes:

1. **`profile.id = auth.users.id`**: La tabla `profile` usa el mismo UUID que `auth.users`, por lo que podemos hacer JOIN directo desde `profile.id` a `user_roles.user_id`

2. **Múltiples roles por usuario**: El sistema maneja esto correctamente porque:

   - `user_roles` es una tabla intermedia que permite N roles por usuario
   - El filtro mostrará todos los roles únicos disponibles
   - Al seleccionar un rol, filtrará usuarios que tengan ese rol (aunque puedan tener otros también)

3. **Aplicación del filtro**: Cuando se selecciona un rol, `queryWithPagination` necesita aplicar el filtro en la query principal. Esto se hace detectando que `id` incluye `.` y aplicando el filtro en la relación correspondiente.

### Aplicación del Filtro en la Query Principal

El sistema de filtrado en `queryWithPagination` necesita aplicar el filtro cuando se selecciona un rol. Como el `columnId` es `'user_roles.roles.name'`, el sistema debería:

1. Detectar que es una relación anidada (tiene `.`)
2. Aplicar el filtro usando la notación de PostgREST para relaciones anidadas
3. Filtrar usuarios que tengan ese rol específico

**Query esperada:**

```sql
SELECT * FROM share_company_users
WHERE user_roles(user_id=profile_id).roles.name IN ('Rol1', 'Rol2')
```

O usando la sintaxis de PostgREST:

```typescript
query.filter('user_roles.roles.name', 'in', selectedRoles);
```

## Pasos para Implementar el Filtro

1. **Agregar el filtro en `UsersTableServer.tsx`**:

   - Agregar entrada en `filterableColumns` con `multiJoinPaths`
   - Configurar los JOINs correctos
   - Agregar `mapper` para formatear los resultados

2. **Verificar que el filtro se aplique correctamente**:

   - El sistema debería aplicar automáticamente el filtro cuando se selecciona un rol
   - Verificar que `queryWithPagination` maneje correctamente la relación `user_roles.roles.name`

3. **Probar casos edge**:
   - Usuarios sin roles
   - Usuarios con múltiples roles
   - Filtrar por múltiples roles simultáneamente

## Notas Adicionales

- El `columnId` **DEBE coincidir exactamente** con el `accessorKey` o `id` de la columna en `columns.tsx`
- Actualmente la columna usa `accessorKey: 'user_roles.roles.name'` pero el valor real se obtiene del hook `useUserRoles`
- Para que el filtro funcione, necesitamos asegurarnos de que el filtro pueda aplicarse correctamente en la query principal
- Puede ser necesario ajustar cómo se aplica el filtro en `queryWithPagination` para relaciones tan complejas
