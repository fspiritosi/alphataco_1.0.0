# Migración Modal Tipos de Documento — Plan de Implementación

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la funcionalidad de Tipos de Documento con la UI del base_erp, usando Prisma, componentes shadcn y la estructura de features del proyecto.

**Architecture:** 3 capas — config declarativo (condiciones) → mapper (JSON ↔ UI state) → componentes UI (modal con panel colapsable). Server actions Prisma para CRUD, búsqueda de catálogos y contador de coincidencias. 3 DataTables delegadas al agente table-expert.

**Tech Stack:** Next.js 16, React 19, Prisma, shadcn/ui, React Hook Form + Zod, React Query, moment.js

**Spec:** `docs/superpowers/specs/2026-03-12-document-types-modal-migration-design.md`

**Referencia base_erp:** `C:\Users\Yorda\Desktop\Workspace\CodeControl\newproject\src\modules\documents\features\document-types\`

---

## Chunk 1: Foundation — Config, Utils, Shared Components

### Task 1: Instalar componentes shadcn faltantes

**Files:**

- Modify: `components.json` (auto por shadcn CLI)

- [ ] **Step 1: Verificar componentes ya instalados**

Usar el MCP de shadcn (`list_items_in_registries`) para verificar qué componentes existen. Alternativamente:

```bash
ls src/components/ui/ | grep -E "collapsible|command|switch|dialog|popover"
```

- [ ] **Step 2: Instalar los que falten**

Usar el MCP de shadcn para obtener los comandos de instalación exactos de cada componente faltante. Los candidatos son: `collapsible`, `command`, `switch`. Los demás (`dialog`, `popover`, `badge`, `checkbox`, `select`, etc.) probablemente ya existen.

```bash
npx shadcn@latest add collapsible command switch
```

- [ ] **Step 3: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/
git commit -m "chore: add shadcn collapsible, command, switch components"
```

---

### Task 2: Crear config declarativo de condiciones

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/config/documentConditions.ts`

**Referencia:** `newproject/src/shared/config/documentConditions.ts` (195 líneas)

- [ ] **Step 1: Crear el archivo de configuración**

Adaptar el config del base_erp a las tablas y enums de gh_gestion. Diferencias clave:

- base_erp usa `DocumentAppliesTo { EMPLOYEE | EQUIPMENT | COMPANY }` → gh_gestion usa `document_applies { Persona | Equipos | Empresa }`
- base_erp tiene 7 condiciones de empleado → gh_gestion tendrá 19 (todas las propiedades soportadas por triggers)
- base_erp tiene 2 condiciones de equipo → gh_gestion tendrá 8

El archivo debe exportar:

```typescript
// Tipos
export interface ConditionFieldConfig { ... }  // como en el spec sección 5.1
export type ConditionsState = Record<string, string[]>;

// Opciones de enums (para EnumMultiSelect)
export const GENDER_OPTIONS = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Femenino', label: 'Femenino' },
  { value: 'No Declarado', label: 'No Declarado' },
];
// ... más opciones de enums (marital_status, nationality, document_type, level_of_education, cost_type, affiliate_status, condition, contract_type_vehicles)

// Configs por tipo de entidad
export const EMPLOYEE_CONDITIONS: ConditionFieldConfig[] = [...]  // 19 campos según spec sección 5.2
export const EQUIPMENT_CONDITIONS: ConditionFieldConfig[] = [...]  // 8 campos según spec sección 5.3
export const COMPANY_CONDITIONS: ConditionFieldConfig[] = [];

// Helpers
export function getConditionsForAppliesTo(applies: string): ConditionFieldConfig[]
export function supportsConditions(applies: string): boolean  // false para 'Empresa'
export function getRelationConditions(configs: ConditionFieldConfig[]): ConditionFieldConfig[]
export function getEnumConditions(configs: ConditionFieldConfig[]): ConditionFieldConfig[]
export function createEmptyConditionsState(applies: string): ConditionsState
```

Cada `ConditionFieldConfig` de tipo `relation` y `many_to_many` DEBE tener `catalogTable` apuntando a la key correcta del `CATALOG_MAP` (ver Task 6). El tipo de `catalogTable` debe ser `string` por ahora — se tipará como `keyof typeof CATALOG_MAP` en Task 6 cuando el CATALOG_MAP exista. Alternativamente, exportar el tipo `CatalogKey` desde el config y usarlo en ambos lados.

Los valores de `enumOptions` deben coincidir EXACTAMENTE con los valores del enum Prisma correspondiente.

Para cada campo, consultar las tablas de condiciones del spec (secciones 5.2, 5.3, 5.6) para los valores correctos de `propertyKey`, `filterColumn`, `relationType`, `relationTable`, `columnOnEntity`, `columnOnRelation`.

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/config/
git commit -m "feat(document-types): add declarative conditions config"
```

---

### Task 3: Crear mapper de condiciones (selections ↔ JSON)

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/utils/conditionsMapper.ts`

**Referencia:** `gh_gestion/src/components/NewDocumentType.tsx` funciones `prepareConditionsForStorage()` y `prepareVehicleConditionsForStorage()`

- [ ] **Step 1: Crear el archivo con las dos funciones principales**

```typescript
import {
  type ConditionFieldConfig,
  type ConditionsState,
  EMPLOYEE_CONDITIONS,
  EQUIPMENT_CONDITIONS,
  getConditionsForAppliesTo,
} from '../config/documentConditions';
import type { JsonValue } from '@prisma/client/runtime/library';

// Tipo del JSON que esperan los triggers SQL
interface ConditionJson {
  property_key: string;
  values: string[];
  reference_values: string[];
  ids: string[];
  is_relation: boolean;
  is_array_relation: boolean;
  relation_type: string;
  relation_table: string | null;
  column_on_employees?: string | null; // solo para empleados
  column_on_vehicles?: string | null; // solo para equipos
  column_on_relation: string | null;
  filter_column: string;
  property_label: string;
}
```

**`selectionsToConditionsJson(selections, applies, namesMap)`:**

- Iterar `getConditionsForAppliesTo(applies)`
- Para cada config cuyo `selections[config.key]` tenga items:
  - Generar el objeto `ConditionJson` usando los metadatos del config
  - `ids` = los valores seleccionados (UUIDs para relaciones, strings para enums)
  - `values` = nombres resueltos via `namesMap[config.key]` (Map<id, name>). Para enums, id === value.
  - `column_on_employees` o `column_on_vehicles` según `applies`
- Retornar solo las condiciones no vacías (filtrar `selections[key].length > 0`)

**`conditionsJsonToSelections(conditions)`:**

- Recibir `JsonValue[]` (el campo conditions de la BD)
- Iterar cada objeto JSON
- Buscar en `[...EMPLOYEE_CONDITIONS, ...EQUIPMENT_CONDITIONS]` por `propertyKey === json.property_key`
- Mapear `json.ids` → `selections[config.key]`
- Construir `namesMap[config.key]` = `new Map(zip(json.ids, json.values))`
- Retornar `{ selections: ConditionsState, namesMap: Record<string, Map<string, string>> }`

**`hasActiveConditions(conditions: ConditionsState)`:**

- `Object.values(conditions).some(arr => arr.length > 0)`

Seguir el formato exacto de JSON documentado en el spec sección 6.1. Verificar contra `prepareConditionsForStorage()` del archivo actual para asegurar compatibilidad.

**IMPORTANTE — `column_on_employees` vs `column_on_vehicles`:** El mapper DEBE elegir el campo correcto basándose en el parámetro `applies`:

- Si `applies === 'Persona'`: generar `column_on_employees` con el valor del config, `column_on_vehicles` NO incluir (o `null`)
- Si `applies === 'Equipos'`: generar `column_on_vehicles` con el valor del config, `column_on_employees` NO incluir (o `null`)
  Esto es crítico porque los triggers SQL leen el campo correcto según el tipo de entidad.

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/utils/
git commit -m "feat(document-types): add conditions mapper (selections ↔ JSON)"
```

---

### Task 4: Crear `_MultiSelectField.tsx` (componente shared)

**Files:**

- Create: `src/shared/components/common/_MultiSelectField.tsx`

**Referencia:** `newproject/src/shared/components/common/_MultiSelectField.tsx` (297 líneas)

- [ ] **Step 1: Copiar y adaptar el componente del base_erp**

Copiar el archivo de referencia y adaptar:

- Imports de shadcn: verificar paths (`@/components/ui/popover`, `@/components/ui/command`, `@/components/ui/badge`, `@/components/ui/button`)
- Agregar prop `initialOptionsMap?: Map<string, string>` para modo edición
- En el `useEffect` de inicialización, si `initialOptionsMap` existe, inicializar `selectedOptionsMap` con esos valores
- Usar `useDebounce` de `@/shared/hooks/useDebounce` (no `useDebouncedValue`)
- Agregar `'use client'` al inicio del archivo
- El `useQuery` debe usar `@tanstack/react-query`
- Logger: usar `Logger` de `@/lib/logger` si hay logs (el original probablemente no tiene)

Props interface como en el spec sección 4.1 (incluye `initialOptionsMap`).

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/common/_MultiSelectField.tsx
git commit -m "feat(shared): add MultiSelectField combobox component"
```

---

### Task 5: Crear `_EnumMultiSelect.tsx` (componente shared)

**Files:**

- Create: `src/shared/components/common/_EnumMultiSelect.tsx`

**Referencia:** `newproject/src/modules/documents/features/document-types/list/components/_EnumMultiSelect.tsx` (127 líneas)

- [ ] **Step 1: Copiar y adaptar el componente del base_erp**

Copiar el archivo de referencia y adaptar:

- Imports de shadcn: verificar paths (`@/components/ui/badge`)
- Agregar `'use client'` al inicio
- No necesita React Query ni useDebounce (componente puro)
- Props como en spec sección 4.2

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/common/_EnumMultiSelect.tsx
git commit -m "feat(shared): add EnumMultiSelect chip selector component"
```

---

## Chunk 2: Server Actions

### Task 6: Crear server actions con Prisma

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`

**Referencia:** `newproject/src/modules/documents/features/document-types/list/actions.server.ts`

- [ ] **Step 1: Crear el archivo con todas las server actions**

El archivo debe incluir `'use server'` y exportar las siguientes funciones. Para cada una, usar Prisma con `@/shared/lib/prisma` y Logger con `@/lib/logger`.

**Funciones CRUD:**

1. **`getDocTypesPaginated(applies, searchParams)`** — función base (NO exportada directamente):

   - Usar `parseSearchParams`, `stateToPrismaParams` de `@/shared/components/common/DataTable`
   - `where`: `{ is_active: true, company_id: companyId, applies }` + `buildSearchWhere` + `buildFiltersWhere` + `buildTextFiltersWhere` + `buildDateRangeFiltersWhere`
   - Para booleanos en `buildFiltersWhere`: convertir `'true'/'false'` strings a boolean reales
   - `select`: todos los campos del model `document_types` EXCEPTO `conditions` (es pesado, solo se carga al editar)
   - `VALID_SORT_FIELDS` whitelist: `['name', 'mandatory', 'explired', 'special', 'multiresource', 'is_it_montlhy', 'private', 'down_document', 'created_at', 'equipment_type']`
   - `Promise.all([findMany, count])`
   - Retorna `{ data, total }`

2. **`getPersonasDocTypesPaginated(searchParams)`** — wrapper que llama `getDocTypesPaginated('Persona', searchParams)`
3. **`getEquiposDocTypesPaginated(searchParams)`** — wrapper para 'Equipos'
4. **`getEmpresaDocTypesPaginated(searchParams)`** — wrapper para 'Empresa'

5. **`getDocumentTypeForEdit(id)`:**

   - `prisma.document_types.findUnique({ where: { id }, select: { ...allFields, conditions: true } })`
   - Retorna el tipo completo incluyendo conditions JSON

6. **`createDocumentType(data)`:**

   - `getServerCompanyId()` internamente
   - `prisma.document_types.create({ data: { ...fields, company_id: companyId, conditions: data.conditions || [] } })`
   - Retorna el registro creado

7. **`updateDocumentType(id, data)`:**

   - `prisma.document_types.update({ where: { id }, data: { ...fields } })`
   - Retorna el registro actualizado

8. **`toggleDocumentTypeActive(id, isActive)`:**
   - `prisma.document_types.update({ where: { id }, data: { is_active: isActive } })`

**Funciones para condiciones:**

9. **`searchCatalogForConditions(catalogKey, query)`:**

   - `catalogKey` tipado como `keyof typeof CATALOG_MAP` (ej: `'hierarchy' | 'provinces' | ...`)
   - **Exportar el tipo**: `export type CatalogKey = keyof typeof CATALOG_MAP;` para que Task 2 (`documentConditions.ts`) pueda tipar `catalogTable` como `CatalogKey` en vez de `string`
   - `CATALOG_MAP` con entries para cada tabla catálogo (ver spec sección 9.2)
   - **Verificar nombres del Prisma schema** antes de implementar cada entry del map. Usar `npx prisma format` o leer `prisma/schema.prisma` para confirmar nombres exactos de modelos
   - Filtrar por `company_id` (obtener via `getServerCompanyId()`), `is_active: true` (si el campo existe en el modelo), `name contains query` (case-insensitive)
   - `select: { id: true, name: true }`, `orderBy: { name: 'asc' }`, `take: 20`
   - Retorna `{ id: string; name: string }[]`
   - Para modelos con `id` BigInt (provinces, brand_vehicles, model_vehicles, types_of_vehicles): convertir `id` a `String(id)`

10. **`countMatchingResources(applies, conditionsJson)`:**
    - `getServerCompanyId()` internamente
    - Construir `where` de Prisma desde el array JSON de conditions:
      - `direct/one_to_many`: `{ [filterColumn]: { in: ids } }`
      - `many_to_many`: `{ [relationTable]: { some: { [filterColumn]: { in: ids } } } }`
    - Agregar `{ company_id: companyId, is_active: true }` al where
    - `prisma.employees.count({ where })` si `applies === 'Persona'`
    - `prisma.vehicles.count({ where })` si `applies === 'Equipos'`
    - Manejar FK BigInt: convertir strings a Number donde corresponda (province, brand, model, type_of_vehicle)

**Funciones para DataTable (export + facets):**

11. **`getDocTypesForExport(applies, searchParams)`:**

    - Mismo `where` que `getDocTypesPaginated` pero SIN `skip`/`take`
    - Retorna todos los registros filtrados

12. **`getDocTypeSingleFacet(columnId, applies, searchParams)`:**
    - Cross-filter: construir `where` con TODOS los filtros EXCEPTO la columna propia
    - `prisma.document_types.groupBy({ by: [columnId], where, _count: true })`
    - Retorna `{ counts: Map<string, number>, resolvedOptions?: { value: string; label: string }[] }`

**Tipos exportados:**

```typescript
export type DocumentTypeListItem = Awaited<ReturnType<typeof getDocTypesPaginated>>['data'][number];
```

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/actions/
git commit -m "feat(document-types): add Prisma server actions (CRUD, catalog search, count)"
```

---

## Chunk 3: Conditions UI Components

### Task 7: Crear `_ConditionsSection.tsx`

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/components/_ConditionsSection.tsx`

**Referencia:** `newproject/src/modules/documents/features/document-types/list/components/_ConditionsSection.tsx` (170 líneas)

- [ ] **Step 1: Copiar y adaptar del base_erp**

Adaptar:

- Imports de config: usar `../config/documentConditions` en vez del path del base_erp
- `appliesTo === 'COMPANY'` → `applies === 'Empresa'` (usar `supportsConditions()`)
- `appliesTo === 'EMPLOYEE'` → `applies === 'Persona'`
- `appliesTo === 'EQUIPMENT'` → `applies === 'Equipos'`
- Props: `applies: string` (valor del enum `document_applies`), `isSpecial: boolean`, `onIsSpecialChange`, `conditions: ConditionsState`, `onConditionsChange`, `disabled?: boolean`, `companyId: string`
- Usar `Switch` y `Collapsible` de shadcn (`@/components/ui/switch`, `@/components/ui/collapsible`)
- Badge de conteo: mostrar cantidad de condiciones activas
- Renderizar `_EmployeeConditions` cuando `applies === 'Persona'`, `_EquipmentConditions` cuando `applies === 'Equipos'`

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/components/_ConditionsSection.tsx
git commit -m "feat(document-types): add collapsible conditions section"
```

---

### Task 8: Crear `_EmployeeConditions.tsx`

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/components/_EmployeeConditions.tsx`

**Referencia:** `newproject/src/modules/documents/features/document-types/list/components/_EmployeeConditions.tsx` (157 líneas)

- [ ] **Step 1: Copiar y adaptar del base_erp**

Adaptar:

- Importar `_MultiSelectField` de `@/shared/components/common/_MultiSelectField`
- Importar `_EnumMultiSelect` de `@/shared/components/common/_EnumMultiSelect`
- Importar configs de `../config/documentConditions`
- Importar `searchCatalogForConditions` de `../actions/actions.server`
- gh_gestion tiene 19 condiciones de empleado (vs 7 en base_erp), así que el grid tendrá más campos
- Organizar en secciones lógicas:
  - **Enums** (gender, maritalStatus, nationality, documentType, levelOfEducation, costType, affiliateStatus) → `_EnumMultiSelect`
  - **Relaciones FK** (typeOfContract, province, hierarchicalPosition, workflowDiagram, companyPosition, category, guild, covenant, costCenter, workshopSector) → `_MultiSelectField`
  - **M:M** (contractorEmployee, aptitudes) → `_MultiSelectField`
- Cada `_MultiSelectField` necesita:
  - `searchFn`: `(query) => searchCatalogForConditions(config.catalogTable, query)`
  - `queryKey`: `['catalog-search', config.catalogTable]`
  - `selected`: `conditions[config.key] || []`
  - `onChange`: `(ids) => onConditionsChange({ [config.key]: ids })`
- Props: `conditions: ConditionsState`, `onConditionsChange: (partial: Partial<ConditionsState>) => void`, `disabled?: boolean`, `initialNamesMap?: Record<string, Map<string, string>>`

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/components/_EmployeeConditions.tsx
git commit -m "feat(document-types): add employee conditions fields"
```

---

### Task 9: Crear `_EquipmentConditions.tsx`

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/components/_EquipmentConditions.tsx`

**Referencia:** `newproject/src/modules/documents/features/document-types/list/components/_EquipmentConditions.tsx` (61 líneas)

- [ ] **Step 1: Copiar y adaptar del base_erp**

Similar a Task 8 pero con las 8 condiciones de equipo del spec sección 5.3.

- **Enums**: condition, costType, typeOfContract → `_EnumMultiSelect`
- **Relaciones FK**: brand, model, type, typeOfVehicle → `_MultiSelectField`
- **M:M**: contractorEquipment → `_MultiSelectField`

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/components/_EquipmentConditions.tsx
git commit -m "feat(document-types): add equipment conditions fields"
```

---

## Chunk 4: Form Modal

### Task 10: Crear `_DocumentTypeFormModal.tsx`

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/components/_DocumentTypeFormModal.tsx`

**Referencia:** `newproject/src/modules/documents/features/document-types/list/components/_DocumentTypeFormModal.tsx` (434 líneas)

- [ ] **Step 1: Crear el modal Dialog con el formulario**

Este es el componente más complejo. Adaptar del base_erp con estas diferencias críticas:

**Patrón de Form:** Usar `Form` de shadcn (`@/components/ui/form`) con `react-hook-form` + `zodResolver` + Zod. El base_erp usa `register` directo — aquí usar `FormField`/`FormControl`/`FormMessage` como dictan las reglas del proyecto.

**Schema Zod:** Como en spec sección 7.1. Usar `z.nativeEnum()` importando el enum `document_applies` del Prisma client.

**Estado de condiciones:** `useState` separado del form (spec sección 7.2):

```typescript
const [isSpecial, setIsSpecial] = useState(false);
const [conditions, setConditions] = useState<ConditionsState>(() => createEmptyConditionsState(defaultApplies));
```

**Lazy-load de condiciones en edición:**

```typescript
const { data: editData } = useQuery({
  queryKey: ['document-type-edit', documentType?.id],
  queryFn: () => getDocumentTypeForEdit(documentType!.id),
  enabled: open && isEditing && !!documentType?.id,
  staleTime: 0,
});
```

Al recibir `editData`, usar `conditionsJsonToSelections()` para hidratar.

**Contador de coincidencias:** (spec sección 8)

```typescript
const applies = form.watch('applies');
const debouncedConditions = useDebounce(conditions, 500);
const conditionsJson = useMemo(
  () => (isSpecial ? selectionsToConditionsJson(debouncedConditions, applies, namesMapRef.current) : []),
  [isSpecial, debouncedConditions, applies]
);
const hasActive = hasActiveConditions(debouncedConditions);

const { data: matchCount, isLoading: isCountLoading } = useQuery({
  queryKey: ['condition-match-count', applies, conditionsJson],
  queryFn: () => countMatchingResources(applies, conditionsJson),
  enabled: isSpecial && hasActive && applies !== 'Empresa',
});
```

**Mutaciones:**

```typescript
const createMutation = useMutation({
  mutationFn: (data) => createDocumentType(data),
  onSuccess: () => {
    toast.success('Tipo de documento creado');
    queryClient.invalidateQueries({ queryKey: ['doc-types'] });
    onOpenChange(false);
  },
});
const updateMutation = useMutation({
  mutationFn: ({ id, data }) => updateDocumentType(id, data),
  onSuccess: () => {
    /* similar */
  },
});
```

**Submit handler:** (spec sección 7.3)

- Validar con Zod
- Si `isSpecial && !hasActiveConditions(conditions)` → `toast.error('Debe seleccionar al menos una condición')` y return
- Construir payload: `{ ...formValues, special: isSpecial, conditions: isSpecial ? selectionsToConditionsJson(...) : [] }`
- Llamar `createMutation.mutate(payload)` o `updateMutation.mutate({ id, data: payload })`

**Limpieza al cerrar:** Al cerrar el Dialog, resetear form y conditions.

**Layout del Dialog:**

- Header: "Crear tipo de documento" / "Editar tipo de documento"
- Body:
  - `name` (Input)
  - `applies` (Select con opciones Persona/Equipos/Empresa)
  - `equipment_type` (Select, solo visible si `applies === 'Equipos'`)
  - Grid 2 cols con checkboxes: mandatory, explired, is_it_montlhy, private, down_document, multiresource
  - `description` (Textarea)
  - `_ConditionsSection` (el panel colapsable)
  - Contador de coincidencias (debajo de conditions, solo si `isSpecial && hasActive`)
- Footer: Botones Cancelar / Guardar

**Props del componente:**

```typescript
interface DocumentTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType?: DocumentTypeListItem | null; // null = crear, object = editar
  defaultApplies?: string; // pre-seleccionar según tab activa
  companyId: string;
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/components/_DocumentTypeFormModal.tsx
git commit -m "feat(document-types): add create/edit dialog with conditions panel"
```

---

## Chunk 5: DataTables, Integration, Cleanup

### Task 11: Crear las 3 DataTables (delegar a table-expert)

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/PersonasList/PersonasList.tsx`
- Create: `src/features/Documentacion/TiposDocumentos/PersonasList/_PersonasDataTable.tsx`
- Create: `src/features/Documentacion/TiposDocumentos/PersonasList/columns.tsx`
- Create: `src/features/Documentacion/TiposDocumentos/EquiposList/EquiposList.tsx`
- Create: `src/features/Documentacion/TiposDocumentos/EquiposList/_EquiposDataTable.tsx`
- Create: `src/features/Documentacion/TiposDocumentos/EquiposList/columns.tsx`
- Create: `src/features/Documentacion/TiposDocumentos/EmpresaList/EmpresaList.tsx`
- Create: `src/features/Documentacion/TiposDocumentos/EmpresaList/_EmpresaDataTable.tsx`
- Create: `src/features/Documentacion/TiposDocumentos/EmpresaList/columns.tsx`

- [ ] **Step 1: Delegar al agente table-expert**

Crear las 3 tablas usando el agente `table-expert` en modo CREATE. Las 3 comparten:

- Modelo Prisma: `document_types`
- Server actions compartidas en `actions/actions.server.ts` (ya creadas en Task 6)
- Columnas según spec sección 10 (name, mandatory, explired, special, multiresource, is_it_montlhy, private, down_document, description, created_at, actions)
- Equipos tiene columna adicional `equipment_type`
- Acciones por fila: Editar (abre `_DocumentTypeFormModal`) y Activar/Desactivar
- Cada tabla tiene `paramNamespace` diferente: `doc-types-personas`, `doc-types-equipos`, `doc-types-empresa`
- `queryKey` DEBE usar formato de **array con prefijo**: `['doc-types', 'personas']`, `['doc-types', 'equipos']`, `['doc-types', 'empresa']`. Esto permite invalidación por prefijo `['doc-types']` (React Query prefix match). **NUNCA** usar string con guion `'doc-types-personas'` como queryKey — eso es para `paramNamespace`.
- Permisos: module `documentacion`, tab `tipos-de-documentos`

**Requisitos obligatorios del DataTable (CRITICAL para el table-expert):**

Cada `XxxList.tsx` (Server Component) DEBE incluir:

- `stripPrefixFromSearchParams(searchParams, TABLE_ID)` ANTES del Promise.all (OBLIGATORIO — 3 tablas en la misma página sin esto → filtros mezclados)
- `getTablePreferences(TABLE_ID)` en el Promise.all
- Pasar `initialColumnVisibility` e `initialFilterVisibility` al Client Component
- Recibir `companyId: string` como prop y reenviarlo al Client Component

Cada `_XxxDataTable.tsx` (Client Component) DEBE incluir:

- `paramNamespace={TABLE_ID}` en `<DataTable>` (CRÍTICO)
- `tableId={TABLE_ID}` en `<DataTable>`
- Recibir `companyId: string` como prop y pasarlo al `_DocumentTypeFormModal`
- Importar y renderizar `_DocumentTypeFormModal` para edición
- Manejar estado de modal abierto/cerrado y tipo seleccionado
- Los `fetchFacet` factories DEBEN pasar el `applies` fijo de cada tabla: `'Persona'` para Personas, `'Equipos'` para Equipos, `'Empresa'` para Empresa. Ejemplo: `fetchFacet: (params) => getDocTypeSingleFacet('mandatory', 'Persona', params)`

**Cadena de `companyId` (prop drilling):**

```
TiposDocumentosTabContent (Server, obtiene via getServerCompanyId())
  → XxxList.tsx (Server, recibe como prop)
    → _XxxDataTable.tsx (Client, recibe como prop)
      → _DocumentTypeFormModal (Client, recibe como prop)
```

**NUNCA** re-obtener `companyId` en el Client Component (ni con `useLoggedUserStore` ni con un fetch).

**IMPORTANTE:** Las 3 tablas importan de `../actions/actions.server.ts` (funciones `getPersonasDocTypesPaginated`, etc.). NO crear `actions.server.ts` dentro de cada lista.

- [ ] **Step 2: Verificar que las 3 tablas compilan**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/PersonasList/ src/features/Documentacion/TiposDocumentos/EquiposList/ src/features/Documentacion/TiposDocumentos/EmpresaList/
git commit -m "feat(document-types): add 3 DataTables (Personas, Equipos, Empresa)"
```

---

### Task 12: Crear Skeleton de fallback

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/fallback/TiposDocumentosSkeleton.tsx`

- [ ] **Step 1: Crear componente Skeleton**

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TiposDocumentosSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/fallback/
git commit -m "feat(document-types): add skeleton fallback"
```

---

### Task 13: Crear botón "Crear" y reescribir `TiposDocumentosTabContent.tsx`

**Files:**

- Create: `src/features/Documentacion/TiposDocumentos/components/_CreateDocumentTypeButton.tsx`
- Modify: `src/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent.tsx`

- [ ] **Step 1: Crear `_CreateDocumentTypeButton.tsx` (Client Component)**

Este componente es necesario porque el botón "Crear" vive fuera del TabsManager pero necesita abrir un Dialog (estado interactivo). Un Server Component no puede manejar `useState` ni renderizar modales.

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { _DocumentTypeFormModal } from './_DocumentTypeFormModal';

interface CreateDocumentTypeButtonProps {
  companyId: string;
  defaultApplies?: string;
}

export function _CreateDocumentTypeButton({ companyId, defaultApplies }: CreateDocumentTypeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Crear tipo de documento
      </Button>
      <_DocumentTypeFormModal
        open={open}
        onOpenChange={setOpen}
        documentType={null}
        defaultApplies={defaultApplies}
        companyId={companyId}
      />
    </>
  );
}
```

- [ ] **Step 2: Reescribir `TiposDocumentosTabContent.tsx` (Server Component)**

El componente actual usa `TypesDocumentsViewWrapper` y componentes de `documentComponents/`. Reescribir para usar los nuevos componentes:

```typescript
import { Suspense } from 'react';
import { TabsManagerServer } from '@/shared/components/common/TabsManagerServer';
import { PermissionGuardServer } from '@/features/Permissions';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { PersonasList } from './PersonasList/PersonasList';
import { EquiposList } from './EquiposList/EquiposList';
import { EmpresaList } from './EmpresaList/EmpresaList';
import { TiposDocumentosSkeleton } from './fallback/TiposDocumentosSkeleton';
import { _CreateDocumentTypeButton } from './components/_CreateDocumentTypeButton';

// Props: searchParams, permissions, showOnlyPersonas?, showOnlyEquipos?, showOnlyEmpresa?
```

**IMPORTANTE — NO importar `_DocumentTypeFormModal` directamente en este Server Component.** El modal se usa en:

1. Cada `_XxxDataTable.tsx` para **edición** (con documentType seleccionado)
2. `_CreateDocumentTypeButton` para **creación** (con documentType null)

Nunca en el Server Component.

- Mantener la estructura actual de 3 subtabs via `TabsManagerServer`
- Reemplazar `TypesDocumentsViewWrapper` por los nuevos `PersonasList`, `EquiposList`, `EmpresaList`
- Usar `TiposDocumentosSkeleton` como fallback en `<Suspense>` (reemplazar el `<div>Cargando...`)
- El botón "Crear" usa `_CreateDocumentTypeButton` (Client Component) envuelto en `PermissionGuardServer`
- Obtener `companyId` via `getServerCompanyId()` y pasarlo a `_CreateDocumentTypeButton` y a cada `XxxList`
- Pasar `searchParams` a cada `XxxList` (necesario para DataTable server-side params)

- [ ] **Step 2: Verificar tipos**

```bash
npm run check-types
```

- [ ] **Step 3: Verificar que la página carga**

```bash
npm run dev
```

Navegar a `/dashboard/document` y verificar que las 3 tabs cargan datos.

- [ ] **Step 4: Commit**

```bash
git add src/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent.tsx
git commit -m "feat(document-types): wire new components into TabContent"
```

---

### Task 14: Eliminar archivos legacy

**Files:**

- Delete: ver lista en spec sección 12

- [ ] **Step 1: Eliminar archivos viejos**

Eliminar los archivos listados en el spec sección 12. **NO eliminar `DownloadButton.tsx`**.

```bash
rm src/app/dashboard/document/documentComponents/TypesDocumentAction.tsx
rm src/app/dashboard/document/documentComponents/TypesDocumentsViewWrapper.tsx
rm src/app/dashboard/document/documentComponents/TypesDocumentsView.tsx
rm src/app/dashboard/document/documentComponents/DocumentsTable.tsx
rm src/app/dashboard/document/documentComponents/EditDocumenTypeModal.tsx
rm src/app/dashboard/document/documentComponents/FilterComponent.tsx
rm src/app/dashboard/document/documentComponents/ButtonTypeRefetch.tsx
rm src/app/dashboard/document/documentComponents/EquipmentTabs.tsx
rm src/components/NewDocumentType.tsx
```

- [ ] **Step 2: Buscar y limpiar imports rotos**

```bash
npm run check-types
```

Si hay errores de import, buscar todos los archivos que importaban los componentes eliminados y actualizarlos o eliminar las referencias.

**IMPORTANTE:** Verificar especialmente `GeneralTabContent.tsx` y cualquier otro archivo que importe `TypesDocumentAction`, `TypesDocumentsViewWrapper`, o `NewDocumentType`. Estos consumidores deben actualizarse o sus imports deben eliminarse.

Buscar en `src/app/server/GET/actions.ts` las funciones `fetchAllDocumentTypes`, `updateDocumentType`, `fettchExistingEntries` — verificar si algún otro archivo las importa. Si solo las usaban los archivos eliminados, eliminar las funciones también.

- [ ] **Step 3: Verificar que todo compila limpio**

```bash
npm run check-types
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/document/documentComponents/ src/components/NewDocumentType.tsx src/app/server/GET/actions.ts
git commit -m "refactor(document-types): remove legacy components and server actions"
```

---

### Task 15: Verificación final

- [ ] **Step 1: Type check limpio**

```bash
npm run check-types
```

Debe pasar sin errores.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Prueba manual completa**

```bash
npm run dev
```

Verificar en el navegador:

1. Navegar a `/dashboard/document` → tab "Tipos de Documentos"
2. Ver las 3 subtabs (Personas, Equipos, Empresa) con datos
3. Crear un tipo de documento:
   - Llenar nombre, seleccionar "Persona", marcar "Obligatorio"
   - Activar "Especial" → verificar que aparece el panel de condiciones
   - Seleccionar una posición jerárquica → verificar que el contador muestra X empleados
   - Guardar → verificar toast de éxito y tabla actualizada
4. Editar el tipo creado:
   - Verificar que los datos se precargan (incluyendo condiciones)
   - Modificar algo y guardar
5. Desactivar un tipo → verificar toggle
6. Filtrar en la tabla → verificar que los filtros funcionan
7. Exportar a Excel → verificar datos correctos

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat(document-types): complete migration from legacy to new UI (COD-312)"
```
