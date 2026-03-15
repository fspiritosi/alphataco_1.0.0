# Spec: Optimizacion de Performance del Detalle de Empleado

**Fecha**: 2026-03-14
**Alcance**: `/dashboard/employee/action?action=view|edit|new&employee_id=UUID`
**Objetivo**: Reducir el tiempo de carga de ~3s a <800ms y eliminar la recarga completa al cambiar modo view↔edit

---

## 1. Problema

### 1.1 Waterfall de Queries (CRITICAL)

La pagina ejecuta ~20 queries Supabase antes de mostrar NADA:

```
await getEmployeeById()                    → ~300-500ms (7 JOINs explicitos)
await fetchDiagramsHistoryByEmployeeId()   → ~200-400ms (SELECT * con JOIN)
await fetchDiagramsByEmployeeId()          → ~200-400ms (SELECT * con JOIN)
await fetchDiagramsTypes()                 → ~100ms
────────────────────────────────────────────
TOTAL BLOQUEANTE: ~800ms - 1.4s (NADA se muestra)

+ 14 catalogos lanzados sin await pero resueltos en el cliente via React.use()
+ generateMetadata: getEmployeeNameById() (double-fetch del empleado)
+ middleware: supabase.auth.getUser() (~50-200ms)
────────────────────────────────────────────
TOTAL PERCIBIDO: 2-3+ segundos
```

### 1.2 Cambio de Modo view↔edit (HIGH)

El `EmployeeHeader` usa `router.push()` para cambiar `?action=view` ↔ `?action=edit`. Esto causa:

- Re-ejecucion COMPLETA del `page.tsx` (server-side)
- Re-fetch de las ~20 queries
- Re-descarga del bundle JS
- Re-hidratacion de React Hook Form con 30+ campos

**Es decir, cada click en "Editar" o "Cancelar" tarda los mismos 2-3s.**

### 1.3 useForm en modo view (HIGH)

`EmployeeTabs` instancia `useForm<EmployeeFormData>()` con `zodResolver` y 30+ campos SIEMPRE, incluso en modo `view` donde el formulario es readonly. Overhead innecesario de React Hook Form + Zod en el bundle y en la hidratacion.

### 1.4 Catalogos ineficientes (HIGH)

- 14 queries Supabase con `SELECT *` cuando solo se necesita `id, name`
- Cada query crea su propia instancia de `supabaseServer()` (13 clientes separados)
- Se pasan como `Promise` al Client Component y se resuelven con `React.use()`, bloqueando la hidratacion
- No hay cache — cada visita al detalle re-carga todos los catalogos

### 1.5 Codigo muerto masivo (~25 archivos)

Archivos del sistema viejo (Supabase + BaseDataTable) y formularios reemplazados que siguen en el repositorio.

---

## 2. Solucion

### 2.1 Arquitectura Resultante

```
page.tsx (Server Component — THIN)
  ├── const companyId = getCachedSession().user.app_metadata.company
  ├── const employee = await getEmployeeByIdCached(id)  ← UNICA query bloqueante
  │     └── React.cache() → deduplicado con generateMetadata
  │
  ├── <EmployeeDetailClient                          ← Client Component principal
  │     employee={employee}
  │     initialMode={mode}
  │     companyId={companyId}
  │     employeeId={id}
  │     header={<EmployeeHeaderContent employee={employee} />}  ← Server Component como children
  │     documentsSlot={...}
  │     diagramsSlot={<Suspense><EmployeeDiagramsSection /></Suspense>}
  │   >
  │     ├── mode gestionado con estado local (NO router.push)
  │     ├── Renderiza header como children (Server Component pass-through)
  │     ├── Botones Editar/Cancelar: Client Components hoja con callbacks
  │     ├── {mode !== 'view' && <EmployeeFormWrapper>}  ← monta/desmonta form
  │     │     └── useForm() vive DENTRO del wrapper (nunca condicional)
  │     ├── Tab "Datos Personales" → useQuery('catalog-countries') on-demand
  │     ├── Tab "Datos de Contacto" → useQuery('catalog-provinces') on-demand
  │     ├── Tab "Datos Laborales" → useQuery('catalog-*') on-demand (12 catalogos)
  │     └── Tab "Documentacion" → documentsSlot (Server Component pre-renderizado)
  │
  └── <Suspense fallback={<DiagramSkeleton />}>
        └── <EmployeeDiagramsSection employeeId={id} />  ← Server Component async
              └── 3 queries Prisma en Promise.all (diagrams + history + types)
```

**Nota sobre companyId**: `page.tsx` lee `companyId` via `getCachedSession()` y lo pasa como prop al Client Component. Las server actions de catalogos reciben `companyId` como parametro (no leen cookies). Esto permite que el Client Component llame a las server actions directamente via `useQuery`.

**Nota sobre EmployeeHeader**: El header se renderiza como Server Component desde `page.tsx` y se pasa como prop `header` al `EmployeeDetailClient`. El Client Component lo renderiza como children (patron valido: Server Component como children de Client Component). Los botones Editar/Cancelar son Client Components separados que reciben `onModeChange` callback del `EmployeeDetailClient`.

**Nota sobre EmployeeDocumentDetail**: Se pre-renderiza en `page.tsx` como Server Component (con su propio Suspense si es async) y se pasa como `documentsSlot` prop al Client Component. El Client Component lo renderiza dentro de la tab "Documentacion". Esto evita que el Client Component necesite hacer fetch de documentos.

### 2.2 Cambio de Modo Sin Navegacion

**Antes**: `router.push('?action=edit')` → re-render SSR completo (~3s)
**Despues**: Estado local en el Client Component + `window.history.replaceState` para actualizar la URL sin navegacion.

```typescript
// EmployeeDetailClient.tsx
const [currentMode, setCurrentMode] = useState<'view' | 'edit'>(initialMode);

const switchToEdit = () => {
  setCurrentMode('edit');
  window.history.replaceState(null, '', `?action=edit&employee_id=${employeeId}`);
};

const switchToView = () => {
  setCurrentMode('view');
  form?.reset(); // reset form si existia
  window.history.replaceState(null, '', `?action=view&employee_id=${employeeId}`);
};
```

La URL se actualiza para que refresh/bookmark funcione, pero NO se ejecuta ninguna navegacion de Next.js.

### 2.3 useForm Condicional (via Componente Wrapper)

**IMPORTANTE**: No se puede llamar `useForm` condicionalmente (viola las Rules of Hooks de React). El patron correcto es montar/desmontar un componente wrapper:

```typescript
// EmployeeDetailClient.tsx
const [currentMode, setCurrentMode] = useState<'view' | 'edit' | 'new'>(initialMode);

return (
  <div>
    {/* Header siempre visible */}
    {header}
    <ModeButtons currentMode={currentMode} onModeChange={setCurrentMode} />

    {/* En modo view: renderizar datos como texto estatico */}
    {currentMode === 'view' && (
      <EmployeeViewDisplay employee={employee} />
    )}

    {/* En modo edit/new: montar el wrapper que contiene useForm */}
    {currentMode !== 'view' && (
      <EmployeeFormWrapper
        employee={employee}
        mode={currentMode}
        companyId={companyId}
        onSaved={() => setCurrentMode('view')}
      />
    )}
  </div>
);

// EmployeeFormWrapper.tsx — componente que SI usa useForm (siempre montado cuando existe)
function EmployeeFormWrapper({ employee, mode, companyId, onSaved }) {
  const form = useForm<EmployeeFormData>({  // ✅ Hook siempre ejecutado (no condicional)
    resolver: zodResolver(employeeFormSchema),
    defaultValues: buildDefaultValues(employee),
  });

  return (
    <Form {...form}>
      <EmployeePersonalDataForm form={form} companyId={companyId} />
      <EmployeeContactDataForm form={form} />
      <EmployeeWorkDataForm form={form} companyId={companyId} />
      <Button type="submit">Guardar</Button>
    </Form>
  );
}
```

**Beneficio**: Cuando `currentMode === 'view'`, el componente `EmployeeFormWrapper` NO esta montado → `useForm`, `zodResolver` y los 30+ campos NO se instancian. Al cambiar a `edit`, se monta el wrapper y React ejecuta el hook normalmente.

Los sub-forms tienen 2 modos de renderizado:

- **view** (`EmployeeViewDisplay`): Muestra datos como texto estatico (sin FormField, sin FormControl, sin useForm)
- **edit/new** (`EmployeeFormWrapper` + sub-forms): Renderiza inputs con `<FormField>` + `<FormControl>` + catalogos on-demand

### 2.4 Catalogos On-Demand con useQuery + Skeletons

Los 14 catalogos se eliminan del `page.tsx` (server-side) y se cargan on-demand en cada sub-form:

```typescript
// Dentro de EmployeeWorkDataForm (Client Component)
const { data: hierarchyOptions, isLoading: loadingHierarchy } = useQuery({
  queryKey: ['catalog', 'hierarchy', companyId],
  queryFn: () => getAllHierarchyOptions(companyId),
  staleTime: 10 * 60 * 1000, // 10min — catalogos cambian poco
  enabled: currentMode !== 'view', // Solo cargar cuando se necesita editar
});

// En el Select/Combobox:
{loadingHierarchy ? (
  <Skeleton className="h-9 w-full" />
) : (
  <Select options={hierarchyOptions} ... />
)}
```

**En modo view**: Los datos del empleado ya vienen resueltos del server (ej: `employee.hierarchy?.name`), asi que NO se necesitan los catalogos. Los catalogos solo se cargan cuando el usuario hace click en "Editar".

**En modo new**: Los catalogos se cargan al montar el componente (no hay datos previos).

### 2.5 Migracion a Prisma

#### 2.5.1 `getEmployeeById` → Prisma

```typescript
// Nueva implementacion en src/features/Employees/EmpleadoID/actions.server.ts
import { cache } from 'react';

export const getEmployeeByIdCached = cache(async (employeeId: string) => {
  const data = await prisma.employees.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      full_name: true,
      cuil: true,
      document_type: true,
      document_number: true,
      nationality: true,
      gender: true,
      marital_status: true,
      level_of_education: true,
      born_date: true,
      picture: true,
      street: true,
      street_number: true,
      postal_code: true,
      phone: true,
      email: true,
      file: true,
      normal_hours: true,
      date_of_admission: true,
      is_active: true,
      status: true,
      affiliate_status: true,
      reason_for_termination: true,
      termination_date: true,
      allocated_to: true,
      cost_type: true,
      hierarchical_position: true,
      company_position: true,
      workflow_diagram: true,
      type_of_contract: true,
      guild_id: true,
      covenants_id: true,
      category_id: true,
      cost_center_id: true,
      workshop_sector_id: true,
      // FKs escalares necesarias para preseleccionar dropdowns en edit
      province: true,
      city: true,
      birthplace: true,
      // Relaciones — solo id + name para mostrar en view
      countries: { select: { id: true, name: true } },
      provinces: { select: { id: true, name: true } },
      cities: { select: { id: true, name: true } },
      hierarchy: { select: { id: true, name: true } },
      company_positions: { select: { id: true, name: true } },
      work_diagram: { select: { id: true, name: true } },
      types_of_contract: { select: { id: true, name: true } },
      guild: { select: { id: true, name: true } },
      covenant: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      cost_center: { select: { id: true, name: true } },
      workshop_sectors: { select: { id: true, name: true } },
      contractor_employee: {
        select: { customers: { select: { id: true, name: true } } },
      },
      empleado_aptitudes: {
        select: { aptitudes_tecnicas: { select: { id: true, nombre: true } } },
      },
    },
  });
  return data;
});
```

**Ventajas**:

- 1 sola query SQL (Prisma genera JOINs optimizados)
- `React.cache()` deduplicada con `generateMetadata`
- `select` explicito — solo trae campos necesarios

#### 2.5.2 Catalogos → Prisma

Todas las funciones de `catalog-actions.ts` migran a Prisma con `select: { id, name }`:

```typescript
// src/features/Employees/EmpleadoID/actions.server.ts
export async function getAllHierarchyOptions(companyId: string) {
  return prisma.hierarchy.findMany({
    where: { company_id: companyId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}
// ... idem para los demas 13 catalogos (14 en total)
```

#### 2.5.3 Diagramas → Prisma + Suspense

```typescript
// src/features/Employees/EmpleadoID/components/EmployeeDiagramsSection.tsx (Server Component)
export async function EmployeeDiagramsSection({ employeeId }: { employeeId: string }) {
  const [history, diagrams, diagramTypes] = await Promise.all([
    getEmployeeDiagramHistory(employeeId),    // Prisma
    getEmployeeDiagrams(employeeId),          // Prisma
    getDiagramTypes(),                         // Prisma
  ]);
  return <DiagramDetailEmployeeView historyData={history} diagrams={diagrams} ... />;
}
```

Envuelto en `<Suspense>` en el `page.tsx` — no bloquea el render del header ni del form.

### 2.6 EmployeeHeader como Server Component

El header actual es Client Component innecesariamente. Refactorizar:

- `EmployeeHeaderContent` → Server Component (muestra datos del empleado: avatar, nombre, email, DNI, badge activo/inactivo, posicion jerarquica)
- Se renderiza en `page.tsx` y se pasa como prop `header` a `EmployeeDetailClient` (patron: Server Component como children de Client Component)
- Los botones Editar/Cancelar/QuickActions son Client Components separados renderizados por `EmployeeDetailClient` (tienen acceso a `setCurrentMode`)

```typescript
// page.tsx (Server Component)
<EmployeeDetailClient
  header={<EmployeeHeaderContent employee={employee} />}  // Server Component pre-renderizado
  ...
/>

// EmployeeDetailClient.tsx (Client Component)
function EmployeeDetailClient({ header, ... }) {
  return (
    <Card>
      <CardContent>
        {header}  {/* Server Component renderizado como children */}
        <ModeButtons mode={currentMode} onModeChange={setCurrentMode} />
      </CardContent>
      {/* ... tabs ... */}
    </Card>
  );
}
```

**Eliminacion del store Zustand `useEmployeeFormReset`**: El store actual (`src/store/employeeFormReset.ts`) se usa para comunicar el reset del form entre `EmployeeHeader` (que llama `triggerReset()`) y `EmployeeTabs` (que escucha `resetTrigger` con `useEffect`). Con la nueva arquitectura, el reset queda cubierto por:

1. `setCurrentMode('view')` desmonta `EmployeeFormWrapper` (que destruye el form)
2. Si se vuelve a montar en edit, `useForm` se reinicializa con `defaultValues` del employee

Eliminar: `src/store/employeeFormReset.ts` y todos sus imports/uses.

### 2.7 Estructura de Archivos Resultante

```
src/features/Employees/EmpleadoID/
├── actions.server.ts                          ← NUEVO: todas las server actions (Prisma)
│   ├── getEmployeeByIdCached()                ← React.cache()
│   ├── getAllHierarchyOptions()
│   ├── getAllCompanyPositionOptions()
│   ├── getAllCostCenterOptions()
│   ├── getAllGuildOptions()
│   ├── getAllCovenantOptions()
│   ├── getAllCategoryOptions()
│   ├── getAllWorkDiagramOptions()
│   ├── getAllContractTypeOptions()
│   ├── getAllWorkshopSectorOptions()
│   ├── getAllContractorOptions()
│   ├── getAllAptitudeOptions()
│   ├── getAllProvinceOptions()
│   ├── getCitiesByProvince()
│   ├── getAllCountryOptions()
│   ├── getEmployeeDiagramHistory()
│   ├── getEmployeeDiagrams()
│   └── getDiagramTypes()
│
├── components/
│   ├── EmployeeDetailClient.tsx               ← NUEVO: Client Component principal
│   │     (gestiona modo view/edit, useForm condicional, tabs)
│   ├── EmployeeHeader.tsx                     ← REFACTORIZADO: datos estaticos
│   ├── EmployeeDiagramsSection.tsx            ← NUEVO: Server Component con Suspense
│   ├── employee-document-detail.tsx           ← SIN CAMBIOS
│   ├── employee-documents.tsx                 ← SIN CAMBIOS
│   ├── employee-document-upload.tsx           ← SIN CAMBIOS
│   ├── employee-quick-actions.tsx             ← SIN CAMBIOS
│   │
│   ├── forms/
│   │   ├── employee-form.tsx                  ← REFACTORIZADO: schema + submit
│   │   ├── employee-personal-data-form.tsx    ← REFACTORIZADO: useQuery catalogos + view/edit
│   │   ├── employee-contact-data-form.tsx     ← REFACTORIZADO: useQuery catalogos + view/edit
│   │   └── employee-work-data-form.tsx        ← REFACTORIZADO: useQuery catalogos + view/edit
│   │
│   └── skeletons/
│       ├── employee-header-skeleton.tsx        ← SIN CAMBIOS
│       ├── employee-form-skeleton.tsx          ← SIN CAMBIOS
│       ├── employee-documents-skeleton.tsx     ← SIN CAMBIOS
│       └── employee-diagrams-skeleton.tsx      ← NUEVO
│
├── hooks/
│   └── useEmployeeCatalogs.ts                 ← NUEVO: custom hooks para catalogos
│
└── lib/                                       ← SE ELIMINA (migrado a actions.server.ts)
    ├── actions/
    │   ├── catalog-actions.ts                 ← ELIMINAR
    │   ├── employee-actions.ts                ← MIGRAR a actions.server.ts
    │   └── document-actions.ts                ← MIGRAR a actions.server.ts
    ├── hooks/
    │   ├── use-employee-data.ts               ← EVALUAR si se usa
    │   └── use-employee-form.ts               ← EVALUAR si se usa
    └── utils/
        └── employee-utils.ts                  ← MOVER a utils/
```

---

## 3. Archivos a Eliminar (Codigo Muerto)

### 3.1 Sistema viejo de tabla de empleados (EmpleadosTables/)

| Archivo                                                                                                  | Razon                                                      |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/features/Employees/Empleados/EmpleadosTables/Activos/employee_table.tsx`                            | Usa BaseDataTable + Supabase, reemplazado por EmployeeList |
| `src/features/Employees/Empleados/EmpleadosTables/Activos/components/EmployeesTableServer.tsx`           | Solo importado por archivo anterior                        |
| `src/features/Employees/Empleados/EmpleadosTables/Inactivos/EmpleadosInactivosTable.tsx`                 | Idem, sistema viejo                                        |
| `src/features/Employees/Empleados/EmpleadosTables/Inactivos/components/EmployeesInactiveTableServer.tsx` | Solo importado por archivo anterior                        |

### 3.2 Archivos con solo codigo comentado

| Archivo                                                                   | Razon                         |
| ------------------------------------------------------------------------- | ----------------------------- |
| `src/features/Employees/Empleados/components/employee_table_server.tsx`   | Solo comentarios (~10 lineas) |
| `src/features/Employees/Empleados/components/tables/EmployeeListTabs.tsx` | Todo comentado                |
| `src/features/Employees/Empleados/components/tables/EmployeesTable.tsx`   | Todo comentado                |
| `src/features/Employees/Empleados/components/tables/columns.tsx`          | Sin importadores              |
| `src/features/Employees/Empleados/components/tables/data/columns.tsx`     | Sin importadores              |
| `src/features/Employees/Empleados/components/tables/data/types.ts`        | Sin importadores              |
| `src/features/Employees/Empleados/components/employee_table_inactive.tsx` | Sin importadores              |

### 3.3 Documentos viejos (reemplazados por features/Documentacion/)

| Archivo                                                                                             | Razon               |
| --------------------------------------------------------------------------------------------------- | ------------------- |
| `src/features/Employees/Empleados/Documents/EmployeeDocumentsTabs.tsx`                              | Feature reemplazada |
| `src/features/Employees/Empleados/Documents/Monthly/MonthlyDocuments.tsx`                           | Feature reemplazada |
| `src/features/Employees/Empleados/Documents/Monthly/components/MonthlyDocumentsTableServer.tsx`     | Feature reemplazada |
| `src/features/Employees/Empleados/Documents/Monthly/components/table-columns.tsx`                   | Feature reemplazada |
| `src/features/Employees/Empleados/Documents/Monthly/lib/actions/actions.ts`                         | Feature reemplazada |
| `src/features/Employees/Empleados/Documents/Permanents/PermanentDocuments.tsx`                      | Feature reemplazada |
| `src/features/Employees/Empleados/Documents/Permanents/components/TablaPermanentDocumentServer.tsx` | Feature reemplazada |
| `src/features/Employees/Empleados/Documents/Permanents/components/table-colum.tsx`                  | Feature reemplazada |
| `src/features/Employees/Empleados/Documents/Permanents/lib/actions/actions.ts`                      | Feature reemplazada |

### 3.4 Forms viejos

| Archivo                                                                              | Razon                                           |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `src/features/Employees/EmpleadoID/components/forms/employee-personal-info-form.tsx` | Reemplazado por employee-personal-data-form.tsx |
| `src/features/Employees/EmpleadoID/components/forms/employee-work-info-form.tsx`     | Reemplazado por employee-work-data-form.tsx     |

### 3.5 Server actions duplicadas/muertas

| Archivo                                                                                                        | Razon                                                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/app/dashboard/employee/action/actions/actions.ts`                                                         | Duplica catalog-actions.ts, sin importadores           |
| `src/features/Employees/Empleados/EmployeeList/actions.server.ts` → funcion `getEmployeesFacets` (~300 lineas) | Reemplazada por `getEmployeeSingleFacet`, ya no se usa |

### 3.6 Tabla vieja en app/ (requiere verificacion de consumidores)

| Archivo                                     | Estado                                                              |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `src/app/dashboard/employee/columns.tsx`    | Tiene consumidor activo en `data-table.tsx`                         |
| `src/app/dashboard/employee/data-table.tsx` | Tiene consumidores en `CustomerComponent.tsx` y `data-customer.tsx` |

**Nota**: Estos 2 archivos NO se pueden eliminar aun porque tienen consumidores ajenos. Quedan pendientes para cuando se migre la tabla de clientes.

---

## 4. Flujo de Datos Resultante

### 4.1 Primera Carga (SSR)

```
Middleware (getUser) → page.tsx
  ├── getEmployeeByIdCached(id) → 1 query Prisma (~200ms)
  │     └── React.cache() → generateMetadata reutiliza
  ├── Render <EmployeeHeader /> (Server Component — instantaneo, datos ya disponibles)
  ├── Render <EmployeeDetailClient /> (Client Component — hidratacion rapida)
  │     └── mode='view' → NO useForm, NO catalogos → render inmediato
  │     └── Solo muestra datos del employee como texto
  └── <Suspense> → <EmployeeDiagramsSection /> (async, no bloquea)
        └── Promise.all([history, diagrams, types]) → ~300ms (paralelo, Prisma)
        └── Streamed al browser cuando termina

TOTAL PERCIBIDO: ~300-500ms (header + datos visibles)
                  + streaming de diagramas (~300ms despues)
```

### 4.2 Click en "Editar" (Client-Side, SIN navegacion)

```
setCurrentMode('edit') → re-render local
  ├── useForm() se instancia con defaultValues del employee
  ├── Cada sub-form activa sus useQuery de catalogos:
  │     ├── Tab activa: carga catalogos inmediatamente (~100-200ms)
  │     └── Tabs inactivas: cargan catalogos al seleccionarlas (lazy)
  ├── Mientras cargan: <Skeleton /> en cada Select/Combobox
  └── URL actualizada con replaceState (sin navegacion)

TOTAL PERCIBIDO: instantaneo (inputs vacios → skeletons → opciones)
```

### 4.3 Click en "Cancelar" (Client-Side, SIN navegacion)

```
setCurrentMode('view') → re-render local
  ├── form.reset() + form = null
  ├── Sub-forms vuelven a modo texto (datos del employee)
  └── URL actualizada con replaceState

TOTAL PERCIBIDO: instantaneo
```

### 4.4 Crear Nuevo Empleado (mode='new')

```
page.tsx detecta mode='new' → NO llama getEmployeeById
  ├── <EmployeeDetailClient mode='new' employee={null} />
  │     ├── useForm() se instancia con defaultValues vacios
  │     └── Catalogos se cargan on-demand con useQuery
  └── Sin diagramas, sin documentos (tabs deshabilitadas)

TOTAL PERCIBIDO: ~100ms (solo render del form vacio + carga de catalogos)
```

---

## 5. Fixes Adicionales

### 5.1 useEffect de errores → derivacion directa

```typescript
// ANTES (useEffect)
useEffect(() => {
  const errors = form.formState.errors;
  setErrors({ personalData: personalDataFields.some(...), ... });
}, [form.formState.errors]);

// DESPUES (derivado)
const formErrors = form?.formState.errors;
const tabErrors = {
  personalData: formErrors ? personalDataFields.some(f => f in formErrors) : false,
  contactData: formErrors ? contactDataFields.some(f => f in formErrors) : false,
  workData: formErrors ? workDataFields.some(f => f in formErrors) : false,
};
```

### 5.2 console.error → logger.error

Reemplazar en:

- `src/app/server/GET/actions.ts` (lineas 52, 2018, 2053)
- `src/features/Employees/EmpleadoID/lib/actions/employee-actions.ts`

### 5.3 Eliminar `:any` types

- `(item.modified_by as any)?.fullname` → tipar correctamente desde Prisma
- `data as any` en `createEmployee` / `updateEmployee` → usar tipo inferido
- `diagrams2 as any` en page.tsx → tipar correctamente

### 5.4 fetchCitiesByProvinceId con non-null assertion

```typescript
// ANTES
const cities = fetchCitiesByProvinceId(employee?.provinces?.id!);

// DESPUES (se elimina del page.tsx, se carga on-demand en el form)
// En el form: useQuery con enabled: !!selectedProvinceId
```

### 5.5 getEmployeesFacets bulk → eliminar

La funcion `getEmployeesFacets` (~300 lineas) en `actions.server.ts` de EmployeeList ya no se usa (reemplazada por `getEmployeeSingleFacet`). Eliminar la funcion y el tipo `EmployeeFacets`.

### 5.6 Tab `diagrams` sin Suspense en lista de empleados

En `src/app/dashboard/employee/page.tsx` L176, `<EmployesDiagram>` no tiene `<Suspense>`. Agregar.

### 5.7 Eliminar Zustand store `useEmployeeFormReset`

El store `src/store/employeeFormReset.ts` y su patron de comunicacion via `triggerReset()` + `useEffect(resetTrigger)` quedan obsoletos. Con la nueva arquitectura:

- Cancelar edicion → `setCurrentMode('view')` → desmonta `EmployeeFormWrapper` → form destruido
- Volver a editar → monta nuevo `EmployeeFormWrapper` → `useForm` reinicializado con defaults

**Archivos a limpiar:**

- Eliminar `src/store/employeeFormReset.ts`
- Eliminar imports de `useEmployeeFormReset` en `employee-header.tsx` y `employee-tabs.tsx`
- Eliminar el `useEffect` de `resetTrigger` en `employee-tabs.tsx` (L143-148)

### 5.8 Consolidar catálogos dispersos

Mover las funciones de fetch de catalogo de:

- `src/features/Empresa/RRHH/actions/actions.ts` → `fetchAllAptitudesTecnicas`
- `src/features/Empresa/RRHH/components/TypeContract/actions/actions.ts` → `fetchAllContractTypes`
- `src/shared/actions/employees.actions.ts` → `fetchCountrys`

A `src/features/Employees/EmpleadoID/actions.server.ts` como Prisma queries.
(Los imports originales se mantienen si otros consumidores los usan; se agrega la version Prisma para el detalle de empleado).

---

## 6. Estimacion de Mejora

| Metrica              | Antes                       | Despues                           |
| -------------------- | --------------------------- | --------------------------------- |
| Primera carga (view) | ~2-3s                       | ~300-500ms                        |
| Click "Editar"       | ~2-3s (navegacion completa) | ~instantaneo (estado local)       |
| Click "Cancelar"     | ~2-3s (navegacion completa) | ~instantaneo (estado local)       |
| Crear nuevo          | ~1-2s                       | ~100ms                            |
| Queries por visita   | ~20 (Supabase)              | 1 Prisma (+ streaming diagramas)  |
| Catalogos            | 14 cargados siempre         | 0-14 on-demand (solo en edit/new) |
| Bundle JS            | useForm siempre cargado     | useForm solo en edit/new          |
| Codigo muerto        | ~25 archivos                | 0                                 |

---

## 7. Riesgos y Mitigaciones

| Riesgo                                                                | Mitigacion                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useForm` condicional puede romper reglas de hooks                    | Usar patron de componente wrapper: `<EmployeeFormProvider>` solo se monta en edit/new                                                                                                                      |
| Catalogos on-demand: flash de skeleton al editar                      | `staleTime: 10min` + prefetch al hover sobre "Editar"                                                                                                                                                      |
| Cambio de modo con replaceState: back button del browser              | `replaceState` NO agrega al history stack, asi que el boton "atras" navega a la pagina anterior (lista de empleados), NO al modo previo. Este es el comportamiento correcto y deseado — no hay riesgo real |
| Diagramas en Suspense: el componente actual es Client Component       | Crear Server Component wrapper que resuelve datos y pasa a Client                                                                                                                                          |
| `createNestedFilterOptions` de employees-table.tsx tiene consumidores | Mover a `src/shared/utils/` antes de eliminar el archivo                                                                                                                                                   |

---

## 8. Fuera de Alcance

- Migrar la tabla vieja en `src/app/dashboard/employee/data-table.tsx` (tiene consumidores activos en CustomerComponent)
- Optimizar el middleware `getUser()` (afecta a toda la app, no solo al detalle de empleado)
- Migrar DiagramDetailEmployeeView internamente (solo se wrappea en Suspense)
- Refactorizar la lista de empleados `/dashboard/employee?tab=employees` (ya esta bien implementada)
