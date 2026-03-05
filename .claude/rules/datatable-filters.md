# Regla de Filtros: 1 Filtro por Columna

## Principio Fundamental

**TODA columna de datos filtrable DEBE tener su propio filtro configurado.** No se permite que una columna muestre datos sin opcion de filtrar.

## Matriz Columna → Filtro

| Tipo de Columna                         | Tipo de Filtro | filterFn necesario                                                                      | Helper server                                            |
| --------------------------------------- | -------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Enum nullable (status, condition)       | `faceted`      | `if (val == null) return value.includes(NULL_FILTER_VALUE); return value.includes(val)` | `buildFiltersWhere`                                      |
| Enum NOT NULL (gender)                  | `faceted`      | `value.includes(row.getValue(id))`                                                      | `buildFiltersWhere`                                      |
| FK UUID (categoryId)                    | `faceted`      | `value.includes(row.original.xxx?.id)`                                                  | `buildFiltersWhere` con mapping                          |
| FK Int (nationalityId)                  | `faceted`      | `value.includes(String(row.original.xxx?.id))`                                          | Manual `map(Number).filter(!isNaN)`                      |
| ID externo enriquecido (userId de auth) | `faceted`      | `value.includes(row.original.rawField)`                                                 | `buildFiltersWhere` (campo real en BD)                   |
| Booleano (isActive)                     | `faceted`      | `value.includes(String(row.getValue(id)))`                                              | Manual `=== 'true'` conversion                           |
| Fecha (createdAt, hireDate)             | `dateRange`    | NO necesario                                                                            | `buildDateRangeFiltersWhere`                             |
| Texto (name, phone, email, address)     | `text`         | NO necesario                                                                            | `buildTextFiltersWhere` + `exclude` en buildFiltersWhere |
| Virtual/computada (\_count, avatar)     | SIN filtro     | —                                                                                       | —                                                        |
| select / actions                        | SIN filtro     | —                                                                                       | —                                                        |

## Reglas Criticas

1. **TODA columna de texto** (name, code, address, phone, email, description, notes) DEBE tener su filtro `text` individual, **incluso si tambien esta en `searchPlaceholder`**. Ambos mecanismos coexisten: busqueda global (OR en todos los campos) y filtro por columna especifica.

2. **TODA FK** DEBE tener filtro `faceted` con opciones cargadas desde `getEntityFacets()`. Esto incluye relaciones "padre" (ej: `employee` en tabla de documentos, `vehicle` en equipos).

3. **TODO enum** DEBE tener filtro `faceted` con opciones de `Object.values(PrismaEnum)`.

4. **TODA fecha** DEBE tener filtro `dateRange`.

5. **TODO booleano** DEBE tener filtro `faceted` con opciones `"Activo"/"Inactivo"` o `"Si"/"No"`.

6. **IDs externos enriquecidos** (ej: userId de auth que se muestra como nombre) DEBEN tener filtro `faceted`. El campo raw ES una columna real de BD, filtrable server-side. Las facetas enriquecen los IDs para labels legibles.

## Lazy-Load Facets — fetchFacet Obligatorio

Todo filtro `faceted` DEBE usar `fetchFacet` para cargar opciones y counts on-demand (lazy-load). **NO usar `options`/`externalCounts` props estáticos** — ese es el patrón viejo (bulk).

```typescript
// ✅ CORRECTO — lazy-load con fetchFacet
{
  columnId: 'status',
  title: 'Estado',
  fetchFacet: makeEnumFetchFacet('status', Object.values(EntityStatus), statusLabels, statusIcons),
}

// ❌ INCORRECTO — patrón viejo bulk (DEPRECADO)
{
  columnId: 'status',
  title: 'Estado',
  options: statusOptions,                    // ❌ opciones estáticas
  externalCounts: facets?.status,            // ❌ counts del bulk query
}
```

El componente `DataTableFacetedFilter` tiene un `useQuery` interno que se activa al abrir el popover. Muestra skeleton mientras carga y cachea los resultados (staleTime: 5min). Cross-filter se maneja server-side en `getEntitySingleFacet`.

## Manejo de Null — "Sin asignar" (TODA columna nullable)

**TODA columna nullable** (FK, enum, booleano, texto) que tenga filtro `faceted` DEBE incluir la opcion "Sin asignar" para filtrar registros con valor null. Esto NO aplica solo a columnas FK — aplica a CUALQUIER columna que pueda tener null en la BD.

### Pasos obligatorios:

1. Importar `NULL_FILTER_VALUE` de `@/shared/components/common/DataTable/helpers`
2. En `filterFn`: Verificar null ANTES de comparar el valor:
   ```typescript
   // Para enums nullable (accessorKey)
   filterFn: (row, id, value: string[]) => {
     const val = row.getValue(id);
     if (val == null) return value.includes(NULL_FILTER_VALUE);
     return value.includes(val as string);
   },
   // Para FK nullable (accessorFn con id)
   filterFn: (row, _id, value: string[]) => {
     const id = row.original.relation?.id;
     if (id == null) return value.includes(NULL_FILTER_VALUE);
     return value.includes(id);
   },
   ```
3. En facets: `toFacetMap()` incluye null como `NULL_FILTER_VALUE` key automaticamente
4. En opciones: Agregar al final del array de opciones (solo si existen registros null):
   ```typescript
   ...(facets?.campo?.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }] : []),
   ```
5. Para M:M: Usar "Sin afectar" en lugar de "Sin asignar"
6. Server-side: `buildFiltersWhere` ya maneja `NULL_FILTER_VALUE` → genera `{ field: null }` para CUALQUIER tipo de columna

## Consistencia Labels y Iconos

- Los **labels** de las opciones del filtro DEBEN coincidir EXACTAMENTE con los labels mostrados en la celda de la columna
- Los **iconos** del filtro DEBEN coincidir con los iconos en el badge de la columna (si aplica)
- Agregar iconos solo en categorias semanticamente claras: estados, tipos de recurso, booleanos, prioridades

## Documentacion Detallada

- **Plantilla completa de filtros**: `.claude/skills/new-datatable/SKILL.md` (seccion "Tipos de columnas y sus filtros")
- **Auditoria de filtros**: `.claude/agents/table-expert.md` (seccion C. Filters + F. Facets Lazy-Load + K2. Lazy-Load Facets)
- **API del componente**: `src/shared/components/common/DataTable/DOCS.md` (seccion Filtros + Lazy-Load Facets)
- **Referencia de implementacion**: tabla de empleados (`src/features/Employees/Empleados/EmployeeList/`) — primera tabla con lazy-load completo
