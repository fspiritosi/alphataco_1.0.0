# Employee Page Performance Optimization Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimizar rendimiento y corregir problemas de la pagina `/dashboard/employee` y sus 5 tabs/subtabs, migrando componentes del sistema viejo (Supabase+useEffect) al nuevo (Prisma+React Query).

**Architecture:** Fase 1 ejecuta quick fixes en paralelo (skeletons, Logger, dead code). Fase 2 reorganiza archivos segun Feature Structure y reescribe componentes del sistema viejo.

**Tech Stack:** Next.js 16, React 19, Prisma, React Query, DataTable nuevo, Logger, shadcn/ui

---

## Fase 1: Quick Fixes (ejecutados en paralelo — YA LANZADOS)

### Task 1: Reemplazar DataTableSkeleton viejo ✅ (agente ejecutando)

- Crear `DiagramsSkeleton.tsx` en `src/features/Employees/Diagrams/fallback/`
- Crear `CovenantTreeSkeleton.tsx` en `src/app/dashboard/company/actualCompany/covenant/fallback/`
- Actualizar `page.tsx`: usar skeletons dedicados, eliminar import del viejo

### Task 2: Reemplazar console.\* con Logger ✅ (agente ejecutando)

- 26+ console.error en `src/components/Diagrams/` → Logger
- Archivos: ConflictResolutionModal, DiagramMassiveForm, DiagramMassiveResults, EmployesDiagramWrapper, DiagramEmployeeView, actions/action.ts

### Task 3: CCT cleanup + company_id como prop ✅ (agente ejecutando)

- Eliminar codigo comentado en CovenantTreeFile.tsx
- Pasar company_id desde getCachedSession() → prop, eliminar js-cookie

---

## Fase 2: Reorganizacion y Reescrituras

### Task 4: Mover archivos de `src/components/Diagrams/` a `src/features/Employees/Diagrams/`

**Justificacion:** Los componentes de Diagramas son funcionalidad del modulo Empleados. Segun la regla de Feature Structure, TODA logica de negocio debe estar en `src/features/`.

**Files:**

- Move: `src/components/Diagrams/` → `src/features/Employees/Diagrams/`
- Modify: 3 archivos externos que importan desde la ubicacion vieja

**Estructura destino:**

```
src/features/Employees/Diagrams/
├── EmployesDiagram.tsx                    # Server Component principal (TabsManager con 4 subtabs)
├── DiagramFormUpdatedWrapper.tsx           # Server Component — wrapper para formulario de carga
├── DiagramReportsWrapper.tsx              # Server Component — wrapper para reportes
├── components/
│   ├── EmployesDiagramWrapper.tsx         # Client — busqueda de diagramas cargados
│   ├── DiagramFormUpdated.tsx             # Client — formulario de carga individual
│   ├── DiagramForm.tsx                    # Client — formulario viejo (legacy)
│   ├── DiagramMassive.tsx                 # Client — carga masiva container
│   ├── DiagramMassiveForm.tsx             # Client — formulario de carga masiva
│   ├── DiagramMassiveResults.tsx          # Client — resultados de carga masiva
│   ├── ConflictResolutionModal.tsx        # Client — modal de conflictos
│   ├── DiagramEmployeeView.tsx            # Client — vista de empleado individual
│   ├── DiagramEmployeeViewCOPI.tsx        # Client — vista COPI
│   ├── DiagramDetailEmployeeView.tsx      # Client — vista detalle empleado
│   ├── DiagramNewTypeForm.tsx             # Client — formulario nuevo tipo
│   ├── DiagramTypeComponent.tsx           # Client — componente de tipo
│   ├── DiagramTypeComponentWrapper.tsx    # Server — wrapper para tipo
│   ├── DiagramReportsTable.tsx            # Client — tabla reportes (legacy)
│   ├── DiagramReportsToolbar.tsx          # Client — toolbar reportes (legacy)
│   └── table/                            # Subcarpeta tabla legacy
│       ├── diagram-detail-colums.tsx
│       ├── diagram-reports-columns.tsx
│       ├── DiagramDetailTable.tsx
│       ├── DataTableToolbarDiagramDetail.tsx
│       └── data-table-faceted-diagramDetail.tsx
├── actions/
│   └── action.ts                          # Server actions de diagramas
├── fallback/
│   └── DiagramsSkeleton.tsx               # Skeleton (creado en Task 1)
└── Reports/                               # Ya existente
    ├── components/
    │   ├── DiagramReportsTable.tsx
    │   └── TableReportDiagram.tsx
    └── lib/actions/
        └── report-actions.ts
```

- [ ] **Step 1: Mover carpeta completa**

  ```bash
  # Crear estructura destino
  mkdir -p src/features/Employees/Diagrams/components/table
  mkdir -p src/features/Employees/Diagrams/actions

  # Mover archivos (Server Components → raiz, Client → components/)
  # Los archivos ya reorganizados por tipo
  ```

- [ ] **Step 2: Actualizar imports internos**
      Todos los imports dentro de `src/components/Diagrams/` usan rutas relativas (`./DiagramEmployeeViewCOPI`). Al mover la carpeta completa, los que estan en el mismo directorio mantienen sus rutas. Los que se separen (raiz vs components/) necesitan actualizacion.

- [ ] **Step 3: Actualizar 3 imports externos**

  - `src/app/dashboard/employee/page.tsx:1` → `@/features/Employees/Diagrams/EmployesDiagram`
  - `src/features/Empresa/RRHH/tabs/TiposDeNovedades/actions/actions.ts:3` → `@/features/Employees/Diagrams/components/DiagramNewTypeForm`
  - `src/features/Employees/EmpleadoID/components/EmployeeDiagramsSection.tsx:2` → `@/features/Employees/Diagrams/components/DiagramDetailEmployeeView`

- [ ] **Step 4: Verificar que compila**
  ```bash
  npm run check-types
  ```

---

### Task 5: Reescribir `EmployesDiagramWrapper` (Tab 3, Subtab "Diagramas Cargados")

**Problema actual:** Componente de 785 lineas con:

- `useEffect` + `useState` para fetching (viola regla React Query)
- 9 queries Supabase via `query()` de `probando.ts` al montar (loadFilterOptions)
- Paginacion manual con "load more"
- `@ts-ignore` y tipos manuales
- `router.refresh()` innecesario
- `Cookies.get('actualComp')` en cliente

**Reescritura:**

**Files:**

- Create: `src/features/Employees/Diagrams/actions/diagram-search-actions.ts` — server actions con Prisma
- Rewrite: `src/features/Employees/Diagrams/components/EmployesDiagramWrapper.tsx` — React Query
- Modify: `src/features/Employees/Diagrams/EmployesDiagram.tsx` — pasar datos del servidor

- [ ] **Step 1: Crear server actions con Prisma**

  Crear `diagram-search-actions.ts` con:

  ```typescript
  'use server';
  import { prisma } from '@/shared/lib/prisma';
  import { getCachedSession } from '@/shared/lib/cached-session';
  import { Logger } from '@/lib/logger';

  const logger = new Logger('features/Employees/Diagrams');

  // Buscar empleados con sus diagramas (paginado)
  export async function searchEmployeeDiagrams(params: {
    filters: Record<string, string | string[]>;
    page: number;
    pageSize: number;
  }) {
    const session = await getCachedSession();
    const companyId = session?.user?.app_metadata?.company;

    // Construir where con Prisma basado en filtros
    // Incluir relaciones: employees_diagram → diagram_type, contractor_employee → customers
    // Retornar { data, total, hasMore }
  }

  // Cargar opciones de UN filtro especifico (on-demand)
  export async function getDiagramFilterOptions(filterType: string) {
    const session = await getCachedSession();
    const companyId = session?.user?.app_metadata?.company;

    // Segun filterType, cargar opciones del catalogo correspondiente
    // 'positions' → company_positions
    // 'workflows' → work_diagram
    // 'costCenters' → cost_center
    // etc.
  }
  ```

- [ ] **Step 2: Reescribir componente cliente**

  Reescribir `EmployesDiagramWrapper.tsx` usando:

  - `useQuery` para los resultados de busqueda
  - `useQuery` con `enabled: false` para cada filtro (carga on-demand al abrir combobox)
  - Eliminar todos los `useState` de data fetching
  - Eliminar `useEffect` de carga
  - Eliminar `router.refresh()`
  - Eliminar `Cookies.get()` — recibir companyId como prop
  - Reemplazar paginacion manual con paginacion server-side

- [ ] **Step 3: Actualizar wrapper server**

  Modificar `EmployesDiagram.tsx` para pasar `companyId` desde `getCachedSession()` al componente.

- [ ] **Step 4: Verificar que funciona**
  ```bash
  npm run check-types
  npm run dev  # Verificar visualmente
  ```

---

### Task 6: Reescribir `TableReportDiagram` (Tab 3, Subtab "Reportes")

**DELEGAR AL AGENTE `table-expert`** — esta es una DataTable del sistema viejo que necesita recrearse completamente.

**Problema actual:**

- Usa `BaseDataTable` de `@/shared/components/data-table/base/`
- Usa `queryWithPagination` de `probando.ts` (Supabase)
- Usa `querySelectDistinct` para filtros
- Usa cookies para persistencia de visibilidad/filtros
- Tiene `:any` types
- Client-side sort (sorts in JS after fetching)

**Marcadores del sistema viejo detectados:**

- `BaseDataTable` import
- `queryWithPagination` en `report-actions.ts`
- `querySelectDistinct` en `TableReportDiagram.tsx`
- `savedVisibility`/`savedFilters` de cookies
- `DataTableColumnHeader` del path viejo

**Modelo Prisma:** `employees_diagram` con relaciones:

- `employees` (employee_id) — tiene `cuil`, `firstname`, `lastname`, `file`, `company_positions`
- `diagram_type` (diagram_type) — tiene `name`, `color`, `short_description`
- Campos propios: `day`, `month`, `year`

**Files a recrear:**

- `src/features/Employees/Diagrams/Reports/actions.server.ts` — Prisma queries (paginada + export + facets)
- `src/features/Employees/Diagrams/Reports/columns.tsx` — columnas nuevas
- `src/features/Employees/Diagrams/Reports/DiagramReportsList.tsx` — Server Component
- `src/features/Employees/Diagrams/Reports/components/_DiagramReportsDataTable.tsx` — Client Component
- `src/features/Employees/Diagrams/Reports/fallback/DiagramReportsSkeleton.tsx` — Skeleton

**Files a eliminar despues:**

- `src/features/Employees/Diagrams/Reports/lib/actions/report-actions.ts` (viejo)
- `src/features/Employees/Diagrams/Reports/components/TableReportDiagram.tsx` (viejo)
- `src/features/Employees/Diagrams/Reports/components/DiagramReportsTable.tsx` (viejo, usa cookies)

- [ ] **Step 1: Invocar agente table-expert en modo CREATE**
- [ ] **Step 2: Actualizar DiagramReportsWrapper para usar el nuevo componente**
- [ ] **Step 3: Eliminar archivos viejos**
- [ ] **Step 4: Verificar compilacion y funcionalidad**

---

### Task 7: `DiagramFormUpdatedWrapper` — busqueda on-demand de empleados

**Problema:** `getEmployeesName()` carga TODOS los empleados en SSR y los serializa al Client Component. Con miles de empleados, esto es un problema de performance (bundle size + serialization time).

**Fix:** Reemplazar el array completo por un Combobox con busqueda server-side.

**Files:**

- Create: `src/features/Employees/Diagrams/actions/diagram-search-actions.ts` (agregar funcion)
- Modify: `src/features/Employees/Diagrams/DiagramFormUpdatedWrapper.tsx`
- Modify: `src/features/Employees/Diagrams/components/DiagramFormUpdated.tsx`

- [ ] **Step 1: Crear server action de busqueda de empleados**

  ```typescript
  // En diagram-search-actions.ts
  export async function searchEmployeesByName(searchTerm: string, limit = 20) {
    const session = await getCachedSession();
    const companyId = session?.user?.app_metadata?.company;

    return prisma.employees.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        OR: [
          { firstname: { contains: searchTerm, mode: 'insensitive' } },
          { lastname: { contains: searchTerm, mode: 'insensitive' } },
          { file_number: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, firstname: true, lastname: true, file_number: true },
      take: limit,
      orderBy: { lastname: 'asc' },
    });
  }
  ```

- [ ] **Step 2: Modificar wrapper**
      Eliminar `getEmployeesName()` del SSR. Ya no pasar `employees` como prop.

- [ ] **Step 3: Modificar formulario**
      Reemplazar el `MultiSelectCombobox` de empleados (que recibe array completo) por un combobox con busqueda server-side usando `useQuery` + `searchEmployeesByName`.

- [ ] **Step 4: Verificar que funciona**

---

### Task 8: Limpiar funciones muertas en DiagramReportsWrapper

**File:** `src/features/Employees/Diagrams/DiagramReportsWrapper.tsx` (despues de mover)

- [ ] Eliminar funciones `fetchEmployeesForReports()` y `fetchNoveltyTypesForReports()` que se definen pero nunca se llaman
- [ ] Mover los tipos exportados (`fetchEmployeesForReportsType`, etc.) al archivo que realmente los usa, o eliminar si ya no se usan despues de Task 6

---

## Orden de Ejecucion Recomendado

1. **Task 4** (mover archivos) — PRIMERO, para que todo lo demas trabaje en la ubicacion correcta
2. **Task 5** (EmployesDiagramWrapper) y **Task 6** (TableReportDiagram) — EN PARALELO, son independientes
3. **Task 7** (DiagramFormUpdatedWrapper) — despues de Task 5 (comparten server actions)
4. **Task 8** (limpiar funciones muertas) — AL FINAL

## Dependencias

- Task 5 depende de Task 4 (los archivos deben estar en la ubicacion nueva)
- Task 6 depende de Task 4 (idem)
- Task 7 depende de Task 5 (reutiliza server actions de diagram-search-actions.ts)
- Task 8 depende de Task 6 (los tipos pueden ser eliminados si ya no se usan)
