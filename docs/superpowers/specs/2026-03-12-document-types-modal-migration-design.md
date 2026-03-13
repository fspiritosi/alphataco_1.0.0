# Migración del Modal de Tipos de Documento (COD-312)

## Resumen

Reemplazar completamente la funcionalidad de "Tipos de Documento" en gh_gestion trayendo la UI pulida del proyecto base_erp (newproject). El backend (triggers, formato JSON de condiciones) permanece intacto. Se reescriben los server actions con Prisma y se reorganizan los archivos según la estructura de features del proyecto.

**Alcance**: Solo UI y lógica de UI. No se tocan triggers PostgreSQL, RPCs ni el formato `conditions Json[]`.

---

## 1. Estado Actual (Problemas)

### Archivos mal ubicados

- Componentes en `src/app/dashboard/document/documentComponents/` (violación de feature-structure)
- Form de crear en `src/components/NewDocumentType.tsx` (componente global suelto)
- Server actions en `src/app/server/GET/actions.ts` (legacy)

### Patrones prohibidos

- `supabaseBrowser()` directo desde el cliente para INSERT (NewDocumentType.tsx)
- `supabaseBrowser()` directo para UPDATE de alertas (EditDocumenTypeModal.tsx)
- `BaseDataTable` deprecada (DocumentsTable.tsx)
- Tipado con `:any` en server actions

### UI limitada

- Condiciones configuradas con selectores básicos inline
- Sin panel colapsable ni badges de conteo
- Sin búsqueda server-side en selectores de condiciones

---

## 2. Objetivo (UI del base_erp)

Traer la UI completa del base_erp que incluye:

1. **Dialog (no AlertDialog)** para crear/editar tipos de documento
2. **Panel colapsable de condiciones** con Switch + Collapsible + badge de conteo
3. **MultiSelectField** — combobox con búsqueda server-side (React Query + debounce), Command palette, badges removibles
4. **EnumMultiSelect** — chips toggleables para enums pequeños
5. **Contador en vivo** — "X empleados/equipos coinciden con estos filtros"
6. **3 DataTables nuevas** (Personas, Equipos, Empresa) con el sistema actual de DataTable + Prisma

---

## 3. Arquitectura de Archivos

```
src/features/Documentacion/TiposDocumentos/
├── TiposDocumentosTabContent.tsx            # Server Component (3 subtabs)
│
├── actions/
│   └── actions.server.ts                    # CRUD Prisma + catalog search + count
│
├── components/
│   ├── _DocumentTypeFormModal.tsx            # Dialog crear/editar
│   ├── _ConditionsSection.tsx               # Switch + Collapsible + badge count
│   ├── _EmployeeConditions.tsx              # MultiSelects para props de empleado
│   └── _EquipmentConditions.tsx             # MultiSelects para props de equipo
│
├── config/
│   └── documentConditions.ts                # Config declarativo: campos, labels, iconos, mapeo JSON
│
├── utils/
│   └── conditionsMapper.ts                  # Convierte selections ↔ JSON[] format
│
├── PersonasList/                            # Tab Personas — delegada a table-expert
│   ├── PersonasList.tsx                     # Server Component
│   ├── _PersonasDataTable.tsx               # Client Component
│   └── columns.tsx
│
├── EquiposList/                             # Tab Equipos — delegada a table-expert
│   ├── EquiposList.tsx
│   ├── _EquiposDataTable.tsx
│   └── columns.tsx
│
├── EmpresaList/                             # Tab Empresa — delegada a table-expert
│   ├── EmpresaList.tsx
│   ├── _EmpresaDataTable.tsx
│   └── columns.tsx
│
└── fallback/
    └── TiposDocumentosSkeleton.tsx           # Skeleton dedicado para Suspense (NO <div>Cargando...</div>)

src/shared/components/common/
├── _MultiSelectField.tsx                    # Combobox reutilizable (nuevo)
└── _EnumMultiSelect.tsx                     # Chip selector reutilizable (nuevo)
```

---

## 4. Componentes Compartidos (Nuevos en shared/)

### 4.1 `_MultiSelectField.tsx`

Combobox reutilizable con búsqueda server-side. Traído del base_erp y adaptado.

**Props:**

```typescript
interface MultiSelectFieldProps {
  label: string;
  placeholder?: string;
  searchFn: (query: string) => Promise<{ id: string; name: string }[]>;
  queryKey: string[];
  selected: string[]; // array de IDs seleccionados
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  icon?: LucideIcon; // Se muestra antes del label en el trigger del Popover
  maxSelections?: number;
  initialOptionsMap?: Map<string, string>; // id→name para hidratar badges en modo edición sin re-fetch
}
```

**Comportamiento:**

- Popover con Command (CommandInput + CommandList + CommandItem)
- `useQuery` con `enabled: open` — solo busca cuando el popover está abierto
- Debounce de 300ms en el input de búsqueda
- `selectedOptionsMap: Map<string, string>` preserva nombres de ítems seleccionados aunque cambien los resultados de búsqueda
- Badges removibles debajo del combobox para cada ítem seleccionado
- Botones "Seleccionar todo" (si ≤10 opciones) y "Limpiar"
- Componentes shadcn: `Popover`, `Command`, `Badge`, `Button`

### 4.2 `_EnumMultiSelect.tsx`

Selector de chips toggleables para enums con pocas opciones.

**Props:**

```typescript
interface EnumMultiSelectProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  icon?: LucideIcon;
}
```

**Comportamiento:**

- Cada opción es un botón pill (`rounded-full border`) que se togglea on/off
- El `icon` se muestra antes del `label` como decoración visual del grupo
- Si >3 opciones, también muestra badges removibles debajo
- Sin popover ni búsqueda — todas las opciones visibles de inmediato

---

## 5. Config Declarativo de Condiciones

### 5.1 `documentConditions.ts`

Centraliza la configuración de campos de condición, sus labels, iconos, tipo (relación o enum), y los metadatos necesarios para generar el JSON de condiciones.

```typescript
interface ConditionFieldConfig {
  key: string; // ID interno (ej: 'hierarchicalPosition')
  propertyKey: string; // property_key en JSON (ej: 'hierarchical_position')
  label: string; // Label UI (ej: 'Posición Jerárquica')
  icon: LucideIcon;
  type: 'relation' | 'enum' | 'many_to_many';
  // Para relaciones FK:
  filterColumn?: string; // Columna en la tabla principal (ej: 'hierarchical_position')
  relationType?: 'one_to_many' | 'many_to_many' | 'direct';
  relationTable?: string | null; // Tabla pivot (solo M:M)
  columnOnEntity?: string | null; // Columna en la entidad (solo M:M, ej: 'id')
  columnOnRelation?: string | null; // Columna en la pivot (solo M:M, ej: 'employee_id')
  // Para relaciones — catálogo de búsqueda:
  catalogTable?: string; // Key del CATALOG_MAP para searchFn (ej: 'hierarchy')
  // Para enums:
  enumOptions?: { value: string; label: string }[];
}
```

### 5.2 Condiciones de Empleado (EMPLOYEE_CONDITIONS)

Todas las propiedades soportadas por los triggers (`build_employee_where_alias`):

| key                    | propertyKey             | label               | type           | filterColumn            |
| ---------------------- | ----------------------- | ------------------- | -------------- | ----------------------- |
| `gender`               | `gender`                | Sexo                | `enum`         | `gender`                |
| `maritalStatus`        | `marital_status`        | Estado Civil        | `enum`         | `marital_status`        |
| `nationality`          | `nationality`           | Nacionalidad        | `enum`         | `nationality`           |
| `documentType`         | `document_type`         | Tipo de DNI         | `enum`         | `document_type`         |
| `levelOfEducation`     | `level_of_education`    | Nivel de Educación  | `enum`         | `level_of_education`    |
| `costType`             | `cost_type`             | Tipo de Costo       | `enum`         | `cost_type`             |
| `affiliateStatus`      | `affiliate_status`      | Estado de Convenio  | `enum`         | `affiliate_status`      |
| `typeOfContract`       | `type_of_contract`      | Tipo de Contrato    | `relation`     | `type_of_contract`      |
| `province`             | `province`              | Provincia           | `relation`     | `province`              |
| `hierarchicalPosition` | `hierarchical_position` | Posición Jerárquica | `relation`     | `hierarchical_position` |
| `workflowDiagram`      | `workflow_diagram`      | Diagrama de Flujo   | `relation`     | `workflow_diagram`      |
| `companyPosition`      | `company_position`      | Posición en Empresa | `relation`     | `company_position`      |
| `category`             | `category`              | Categoría           | `relation`     | `category_id`           |
| `guild`                | `guild`                 | Gremio/Sindicato    | `relation`     | `guild_id`              |
| `covenant`             | `covenant`              | Convenio            | `relation`     | `covenants_id`          |
| `costCenter`           | `cost_center`           | Centro de Costo     | `relation`     | `cost_center_id`        |
| `workshopSector`       | `workshop_sector`       | Sector de Taller    | `relation`     | `workshop_sector_id`    |
| `contractorEmployee`   | `contractor_employee`   | Clientes            | `many_to_many` | `contractor_id`         |
| `aptitudes`            | `empleado_aptitudes`    | Aptitudes Técnicas  | `many_to_many` | `aptitud_id`            |

### 5.3 Condiciones de Equipo (EQUIPMENT_CONDITIONS)

| key                   | propertyKey            | label              | type           | filterColumn       |
| --------------------- | ---------------------- | ------------------ | -------------- | ------------------ |
| `brand`               | `brand`                | Marca              | `relation`     | `brand`            |
| `model`               | `model`                | Modelo             | `relation`     | `model`            |
| `type`                | `type`                 | Tipo               | `relation`     | `type`             |
| `typeOfVehicle`       | `types_of_vehicles`    | Categoría Vehículo | `relation`     | `type_of_vehicle`  |
| `condition`           | `condition`            | Condición          | `enum`         | `condition`        |
| `costType`            | `cost_type`            | Tipo de Costo      | `enum`         | `cost_type`        |
| `typeOfContract`      | `type_of_contract`     | Tipo de Contrato   | `enum`         | `type_of_contract` |
| `contractorEquipment` | `contractor_equipment` | Clientes           | `many_to_many` | `contractor_id`    |

### 5.4 Empresa

No soporta condiciones (`COMPANY_CONDITIONS = []`). La sección de condiciones se oculta cuando `applies === 'Empresa'`.

### 5.5 Nota sobre el enum `document_applies`

**Los valores exactos del enum son `Persona | Equipos | Empresa`** (nótese "Equipos" con S). El campo del formulario se llama `applies` y contiene directamente estos valores. En todo el código se debe comparar contra estos valores exactos del enum — nunca usar "Equipo" (singular) ni "appliesTo".

### 5.6 Nota sobre `filterColumn` vs nombre de relación Prisma

En la tabla de condiciones, `filterColumn` se refiere a la **columna real en la tabla SQL**, que puede diferir del nombre de la relación Prisma:

| Relación Prisma     | `filterColumn` (columna SQL) | Ejemplo         |
| ------------------- | ---------------------------- | --------------- |
| `types_of_contract` | `type_of_contract`           | FK en employees |
| `category`          | `category_id`                | FK en employees |
| `guild`             | `guild_id`                   | FK en employees |
| `covenant`          | `covenants_id`               | FK en employees |
| `cost_center`       | `cost_center_id`             | FK en employees |
| `workshop_sectors`  | `workshop_sector_id`         | FK en employees |

El `filterColumn` es lo que va en el JSON para los triggers SQL. El nombre de relación Prisma se usa solo para el `countMatchingResources` server action.

---

## 6. Mapper de Condiciones

### 6.1 `conditionsMapper.ts`

Dos funciones principales que traducen entre la representación de UI (selections) y el formato JSON que esperan los triggers PostgreSQL.

#### `selectionsToConditionsJson(selections, appliesTo, namesMap): Json[]`

Convierte las selecciones del formulario al array JSON del campo `conditions`:

```typescript
// Input (selections del form)
{
  hierarchicalPosition: ['uuid-1', 'uuid-2'],
  gender: ['Masculino'],
  contractorEmployee: ['uuid-cliente-1']
}

// Output (JSON[] para conditions column)
[
  {
    property_key: 'hierarchical_position',
    values: ['Gerente', 'Supervisor'],         // nombres resueltos via namesMap
    reference_values: [],
    ids: ['uuid-1', 'uuid-2'],
    is_relation: true,
    is_array_relation: false,
    relation_type: 'one_to_many',
    relation_table: null,
    column_on_employees: null,
    column_on_relation: null,
    filter_column: 'hierarchical_position',
    property_label: 'Posición Jerárquica'
  },
  {
    property_key: 'gender',
    values: ['Masculino'],
    reference_values: [],
    ids: ['Masculino'],
    is_relation: false,
    is_array_relation: false,
    relation_type: 'direct',
    relation_table: null,
    column_on_employees: null,
    column_on_relation: null,
    filter_column: 'gender',
    property_label: 'Sexo'
  },
  {
    property_key: 'contractor_employee',
    values: ['Cliente ABC'],
    reference_values: [],
    ids: ['uuid-cliente-1'],
    is_relation: true,
    is_array_relation: true,
    relation_type: 'many_to_many',
    relation_table: 'contractor_employee',
    column_on_employees: 'id',
    column_on_relation: 'employee_id',
    filter_column: 'contractor_id',
    property_label: 'Clientes'
  }
]
```

Usa el `ConditionFieldConfig` del config para generar todos los metadatos de relación.

#### `conditionsJsonToSelections(conditions: Json[]): ConditionsState`

Convierte el JSON guardado de vuelta a la estructura de selections para hidratar los MultiSelects al editar:

```typescript
// Input (JSON[] del campo conditions)
[{ property_key: 'hierarchical_position', ids: ['uuid-1'], values: ['Gerente'], ... }]

// Output (selections para el form)
{ hierarchicalPosition: ['uuid-1'], ... }  // + namesMap para resolver labels
```

La función también retorna un `namesMap: Record<string, Map<string, string>>` con los nombres resueltos (id → name) para que los MultiSelectField puedan mostrar los badges correctamente sin re-fetch.

---

## 7. Form Modal (`_DocumentTypeFormModal.tsx`)

### 7.1 Campos del Formulario

**Schema Zod** (mismos campos que el modelo actual):

```typescript
const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  applies: z.nativeEnum(document_applies), // Persona | Equipos | Empresa
  equipment_type: z.string().optional(), // 'vehicle' | 'other_equipment' (solo Equipos)
  mandatory: z.boolean().default(false),
  explired: z.boolean().default(false), // typo original mantenido
  is_it_montlhy: z.boolean().optional().default(false),
  special: z.boolean().default(false),
  private: z.boolean().optional().default(false),
  down_document: z.boolean().optional().default(false),
  multiresource: z.boolean().default(false),
  description: z.string().optional(),
});
```

### 7.2 Estado de Condiciones (fuera de Zod)

Las condiciones se manejan con `useState` separado (igual que base_erp):

```typescript
const [isSpecial, setIsSpecial] = useState(false);
const [conditions, setConditions] = useState<ConditionsState>(initialConditions);
```

`ConditionsState` es un `Record<string, string[]>` donde la key es el `key` del `ConditionFieldConfig` y el valor es un array de IDs o valores de enum seleccionados.

### 7.3 Flujo de Submit

1. Validar formulario con Zod
2. **Validación de condiciones**: Si `isSpecial === true` pero no hay ninguna condición seleccionada (todas las arrays vacías), mostrar toast de error: "Debe seleccionar al menos una condición" y **no enviar el formulario**. Un tipo especial sin condiciones causaría que los triggers lo traten como universal (matchea todo), lo cual probablemente no es la intención del usuario.
3. Si `isSpecial`: convertir selections a JSON con `selectionsToConditionsJson()`
4. Si NO `isSpecial`: `conditions = []` (limpiar), `special = false`
5. Setear `special = isSpecial`
6. Llamar server action `createDocumentType(formData)` o `updateDocumentType(id, formData)`

**Comportamiento del Switch**: Al desactivar `isSpecial` y volver a activarlo, el estado de `conditions` se **preserva** (no se resetea). Solo se limpia al enviar el formulario con `isSpecial = false` o al cerrar el Dialog.

### 7.4 Flujo de Edición

1. Abrir Dialog con `documentType` existente
2. `form.reset(documentType)` para los campos básicos
3. `useQuery` lazy para cargar las conditions del tipo: `getDocumentTypeForEdit(id)`
4. `conditionsJsonToSelections()` para hidratar las selections y obtener `namesMap`
5. Los `MultiSelectField` reciben los IDs via `selected` prop + `initialOptionsMap` (del `namesMap`) para mostrar badges inmediatamente sin re-fetch

### 7.6 Obtención del `companyId`

- **Server side** (Server Components, server actions): usar `getServerCompanyId()` de `@/shared/actions/company.actions.ts` — lee la cookie `actualComp` con fallback a `DEFAULT_COMPANY_ID`.
- **Client side** (el modal): el `companyId` se pasa como **prop** desde el Server Component padre (`TiposDocumentosTabContent` → DataTable → modal). El Server Component llama `getServerCompanyId()` y lo pasa al árbol de componentes.
- **Server actions internas** (create, update, count): llaman `getServerCompanyId()` directamente dentro de la action, no reciben `companyId` como parámetro desde el cliente (más seguro).

**NO usar `useLoggedUserStore`** para obtener `companyId`. Ese store está deprecado para este propósito. Si se encuentra uso de `useLoggedUserStore` para `companyId` en archivos de esta feature, reemplazarlo por el patrón de prop desde servidor.

### 7.7 Labels de los campos booleanos

| Campo BD        | Label en UI                                                       |
| --------------- | ----------------------------------------------------------------- |
| `mandatory`     | Obligatorio                                                       |
| `explired`      | Con vencimiento                                                   |
| `is_it_montlhy` | Mensual                                                           |
| `special`       | (no se muestra como checkbox — se mapea al Switch de condiciones) |
| `private`       | Privado                                                           |
| `down_document` | Documento de baja                                                 |
| `multiresource` | Multi-recurso                                                     |

### 7.5 Mapeo de `special` ↔ `isSpecial`

El campo `special` en la DB se mapea al Switch `isSpecial` en el panel de condiciones. Cuando `special = true`, el tipo tiene condiciones configuradas.

---

## 8. Contador en Vivo de Coincidencias

### 8.1 Comportamiento

Cuando el usuario tiene condiciones activas, se muestra un texto debajo del panel de condiciones:

> "**23 empleados** coinciden con estas condiciones"
> "**8 equipos** coinciden con estas condiciones"

El contador se actualiza con debounce (500ms) cada vez que cambia una selección de condición.

### 8.2 Server Action

```typescript
'use server';

export async function countMatchingResources(applies: 'Persona' | 'Equipos', conditionsJson: Json[]): Promise<number>;
// companyId se obtiene internamente via getServerCompanyId() — NO se recibe del cliente
```

Construye un `where` de Prisma replicando la lógica de `build_employee_where_alias`:

- `direct` → `{ [filterColumn]: { in: ids } }`
- `one_to_many` → `{ [filterColumn]: { in: ids } }`
- `many_to_many` → `{ [relationTable]: { some: { [filterColumn]: { in: ids } } } }`

Luego hace `prisma.employees.count({ where })` o `prisma.vehicles.count({ where })`.

### 8.3 UI del Contador

```typescript
const debouncedConditions = useDebounce(conditions, 500); // hook existente en src/shared/hooks/useDebounce.ts

const { data: matchCount, isLoading: isCountLoading } = useQuery({
  queryKey: ['condition-match-count', appliesTo, debouncedConditions],
  queryFn: () => countMatchingResources(applies, conditionsJson), // companyId se resuelve server-side
  enabled: isSpecial && hasActiveConditions, // hasActiveConditions = al menos 1 key en conditions tiene array no vacío
});
```

- Se muestra como un texto informativo con ícono de Users/Truck y un Skeleton cuando carga
- `hasActiveConditions` = `Object.values(conditions).some(arr => arr.length > 0)`
- Si `isSpecial === true` pero aún no hay condiciones seleccionadas, el contador no se muestra (no mostrar "0 empleados" en ese caso — simplemente oculto)

---

## 9. Server Actions (Prisma)

### 9.1 `actions.server.ts`

Todas las acciones usan Prisma. Se ubican en `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`.

| Función                                               | Descripción                                      |
| ----------------------------------------------------- | ------------------------------------------------ |
| `getAllDocumentTypesByApplies(applies, searchParams)` | Paginado con DataTable helpers + filtros         |
| `getDocumentTypeForEdit(id)`                          | Fetch de un tipo con sus conditions para edición |
| `createDocumentType(data)`                            | Insert con Prisma (conditions como Json[])       |
| `updateDocumentType(id, data)`                        | Update con Prisma                                |
| `toggleDocumentTypeActive(id, isActive)`              | Soft delete/restore                              |
| `countMatchingResources(applies, conditionsJson)`     | Conteo de coincidencias (companyId interno)      |
| `searchCatalogForConditions(table, query)`            | Búsqueda genérica para MultiSelectField          |

### 9.2 Búsqueda de Catálogos

`searchCatalogForConditions` recibe el nombre del catálogo como `keyof typeof CATALOG_MAP` (tipado estricto, no `string`). Retorna `{ id: string; name: string }[]`. Si se pasa un catálogo no reconocido, retorna `[]`. Internamente usa un map para determinar qué modelo Prisma usar:

La conexión entre `ConditionFieldConfig.key` y el catálogo se define en el propio config — cada field config de tipo `relation` o `many_to_many` incluye un campo `catalogTable` que corresponde a una key del `CATALOG_MAP`.

```typescript
const CATALOG_MAP = {
  hierarchy: () => prisma.hierarchy.findMany({ where, select, orderBy, take }),
  types_of_contract: () => prisma.types_of_contract.findMany({ ... }),
  provinces: () => prisma.provinces.findMany({ ... }),
  company_positions: () => prisma.company_positions.findMany({ ... }),
  category: () => prisma.category.findMany({ ... }),
  guild: () => prisma.guild.findMany({ ... }),
  covenant: () => prisma.covenant.findMany({ ... }),
  cost_center: () => prisma.cost_center.findMany({ ... }),
  brand_vehicles: () => prisma.brand_vehicles.findMany({ ... }),
  model_vehicles: () => prisma.model_vehicles.findMany({ ... }),
  types_of_vehicles: () => prisma.types_of_vehicles.findMany({ ... }),
  customers: () => prisma.customers.findMany({ ... }),
  aptitudes_tecnicas: () => prisma.aptitudes_tecnicas.findMany({ ... }),
  work_diagram: () => prisma.work_diagram.findMany({ ... }),
  workshop_sectors: () => prisma.workshop_sectors.findMany({ ... }),
};
```

Cada catálogo filtra por `company_id` (si aplica) y `is_active = true` (si el campo existe), con búsqueda `contains` case-insensitive, limite 20.

---

## 10. DataTables (3 tabs — delegadas a table-expert)

Las 3 tablas son vistas filtradas de la misma tabla `document_types`:

| Tab      | Filtro                | paramNamespace       |
| -------- | --------------------- | -------------------- |
| Personas | `applies = 'Persona'` | `doc-types-personas` |
| Equipos  | `applies = 'Equipos'` | `doc-types-equipos`  |
| Empresa  | `applies = 'Empresa'` | `doc-types-empresa`  |

### Columnas comunes

| Columna       | Tipo     | Filtro          |
| ------------- | -------- | --------------- |
| name          | texto    | text            |
| mandatory     | booleano | faceted (Sí/No) |
| explired      | booleano | faceted (Sí/No) |
| special       | booleano | faceted (Sí/No) |
| multiresource | booleano | faceted (Sí/No) |
| is_it_montlhy | booleano | faceted (Sí/No) |
| private       | booleano | faceted (Sí/No) |
| down_document | booleano | faceted (Sí/No) |
| description   | texto    | text            |
| created_at    | fecha    | dateRange       |
| actions       | —        | —               |

### Columnas adicionales para Equipos

| equipment_type | texto/enum | faceted (Vehículo/Otro equipo) |

### Acciones por fila

- **Editar**: Abre `_DocumentTypeFormModal` en modo edición
- **Activar/Desactivar**: Toggle de `is_active`

### Permisos

Verificar `permissions-map.ts` para los slugs exactos. Mapeo esperado:

| Acción                                                    | Module          | Tab                   | Action   |
| --------------------------------------------------------- | --------------- | --------------------- | -------- |
| Botón "Crear" (fuera del TabsManager, arriba de las tabs) | `documentacion` | `tipos-de-documentos` | `create` |
| Editar (dentro de cada DataTable)                         | `documentacion` | `tipos-de-documentos` | `update` |
| Desactivar/Eliminar (dentro de cada DataTable)            | `documentacion` | `tipos-de-documentos` | `delete` |

El botón "Crear tipo de documento" se ubica **fuera del TabsManager** (como actualmente), visible en las 3 tabs. El Dialog pre-selecciona el `applies` según la tab activa pero permite cambiarlo.

### Lógica compartida entre las 3 DataTables

Las 3 tablas comparten la misma tabla `document_types` con solo un filtro `applies` diferente. Para evitar triplicar la lógica, las server actions paginadas usan una **función base compartida** en `actions/actions.server.ts`:

```typescript
// Función base compartida — NO exportada
function buildDocumentTypesWhere(applies: document_applies, searchParams: DataTableSearchParams) { ... }

// Funciones específicas exportadas (usadas por cada DataTable)
export async function getPersonasDocTypesPaginated(searchParams) {
  return getDocTypesPaginated('Persona', searchParams);
}
export async function getEquiposDocTypesPaginated(searchParams) {
  return getDocTypesPaginated('Equipos', searchParams);
}
export async function getEmpresaDocTypesPaginated(searchParams) {
  return getDocTypesPaginated('Empresa', searchParams);
}
```

Cada DataTable (`PersonasList/`, `EquiposList/`, `EmpresaList/`) tiene sus propios `columns.tsx` y componentes, pero **NO tiene su propio `actions.server.ts`** — todas importan del `actions/actions.server.ts` compartido.

---

## 11. Componentes shadcn Requeridos

Verificar si estos componentes ya están instalados; instalar los faltantes:

- `Dialog` (DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter)
- `Command` (CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty)
- `Collapsible` (CollapsibleContent, CollapsibleTrigger)
- `Switch`
- `Popover` (PopoverContent, PopoverTrigger)
- `Badge`
- `Checkbox`
- `Select` (SelectTrigger, SelectValue, SelectContent, SelectItem)
- `Input`, `Textarea`, `Button`, `Label`
- `Card` (CardContent, CardDescription)
- `AlertDialog` (para confirmar eliminación)

---

## 12. Archivos a Eliminar Post-Migración

Una vez completada la migración:

- `src/app/dashboard/document/documentComponents/TypesDocumentAction.tsx`
- `src/app/dashboard/document/documentComponents/TypesDocumentsViewWrapper.tsx`
- `src/app/dashboard/document/documentComponents/TypesDocumentsView.tsx`
- `src/app/dashboard/document/documentComponents/DocumentsTable.tsx`
- `src/app/dashboard/document/documentComponents/EditDocumenTypeModal.tsx`
- `src/app/dashboard/document/documentComponents/FilterComponent.tsx`
- `src/app/dashboard/document/documentComponents/ButtonTypeRefetch.tsx`
- `src/app/dashboard/document/documentComponents/EquipmentTabs.tsx`
- `src/components/NewDocumentType.tsx`
- Server actions viejas de `src/app/server/GET/actions.ts` relacionadas con document_types (`fetchAllDocumentTypes`, `updateDocumentType`, `fettchExistingEntries`)

**NO eliminar** `src/app/dashboard/document/documentComponents/DownloadButton.tsx` — es usado fuera del scope de esta migración (página de detalle de documentos).

## 12.1 Estrategia de Invalidación de Queries

Tras crear o editar un tipo de documento, se invalidan las 3 queries de DataTable (ya que un tipo puede cambiar su `applies` al editarlo):

```typescript
queryClient.invalidateQueries({ queryKey: ['doc-types-personas'] });
queryClient.invalidateQueries({ queryKey: ['doc-types-equipos'] });
queryClient.invalidateQueries({ queryKey: ['doc-types-empresa'] });
```

Alternativamente, usar un prefijo común:

```typescript
queryClient.invalidateQueries({ queryKey: ['doc-types'] }); // invalida todo lo que empiece con 'doc-types'
```

---

## 13. Lo que NO cambia

- **Triggers PostgreSQL**: `trg_document_types_insert`, `trg_document_types_update`, `controlar_alertas_documentos()`
- **Formato JSON de conditions**: Mismo formato con `property_key`, `ids`, `values`, `relation_type`, etc.
- **Funciones SQL**: `build_employee_where_alias`, `build_vehicle_where_alias`
- **RPCs**: `filter_employees_by_conditions`, `filter_vehicles_by_conditions`
- **Tablas de BD**: Ninguna tabla se crea ni se modifica
- **Lógica de alertas**: Los triggers generan las mismas alertas automáticamente

---

## 14. Flujo Completo

### Crear Tipo de Documento

```
1. Usuario clickea "Crear tipo de documento"
2. Se abre Dialog con formulario vacío
3. Llena campos básicos (nombre, aplica a, obligatorio, etc.)
4. (Opcional) Activa Switch "Especial" → se expande panel de condiciones
5. Selecciona condiciones via MultiSelectField / EnumMultiSelect
6. Ve el contador: "23 empleados coinciden"
7. Clickea "Guardar"
8. Server action: selectionsToConditionsJson() → prisma.document_types.create()
9. Trigger PostgreSQL se activa → genera alertas automáticamente
10. Toast de éxito + invalidate queries
```

### Editar Tipo de Documento

```
1. Usuario clickea "Editar" en la fila de la tabla
2. Se abre Dialog con datos precargados
3. useQuery lazy carga las conditions del tipo
4. conditionsJsonToSelections() hydrata los MultiSelects
5. Usuario modifica lo que necesite
6. Clickea "Guardar"
7. Server action: selectionsToConditionsJson() → prisma.document_types.update()
8. Trigger PostgreSQL se activa → recalcula alertas
9. Toast de éxito + invalidate queries
```
