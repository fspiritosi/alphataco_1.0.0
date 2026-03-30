# Employee Detail Performance Optimization — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir la carga del detalle de empleado de ~3s a <500ms, eliminar la recarga al cambiar modo view↔edit, y limpiar ~25 archivos de codigo muerto.

**Architecture:** Migrar de Supabase a Prisma con React.cache(). Gestionar modo view/edit con estado local (no router.push). Cargar catalogos on-demand con useQuery. Envolver diagramas en Suspense. Separar vista (texto estatico) de edicion (useForm wrapper).

**Tech Stack:** Next.js 16, React 19, Prisma, React Query, React Hook Form + Zod, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-14-employee-detail-performance-optimization.md`

---

## Chunk 1: Server Actions (Prisma) + Limpieza de Codigo Muerto

### Task 1: Crear `actions.server.ts` — getEmployeeByIdCached (Prisma + React.cache)

**Files:**

- Create: `src/features/Employees/EmpleadoID/actions.server.ts`

- [ ] **Step 1: Crear el archivo con la funcion principal**

```typescript
// src/features/Employees/EmpleadoID/actions.server.ts
'use server';

import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';
import { cache } from 'react';

const logger = new Logger('features/EmpleadoID');

/**
 * Obtiene un empleado por ID con todas sus relaciones resueltas.
 * Usa React.cache() para deduplicar con generateMetadata en el mismo request.
 */
export const getEmployeeByIdCached = cache(async (employeeId: string) => {
  logger.debug('Obteniendo empleado por ID', { data: { employeeId } });

  try {
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
        province: true,
        city: true,
        birthplace: true,
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
  } catch (error) {
    logger.error('Error al obtener empleado', { data: { error, employeeId } });
    throw error;
  }
});

// Tipo inferido — NUNCA definir manualmente
export type EmployeeDetailData = Awaited<ReturnType<typeof getEmployeeByIdCached>>;
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run check-types`
Expected: Sin errores en `actions.server.ts`

- [ ] **Step 3: Commit**

```
feat(employee-detail): add getEmployeeByIdCached with Prisma + React.cache
```

---

### Task 2: Agregar funciones de catalogos (Prisma) al actions.server.ts

**Files:**

- Modify: `src/features/Employees/EmpleadoID/actions.server.ts`
- Reference: `src/features/Employees/EmpleadoID/lib/actions/catalog-actions.ts` (para ver las queries actuales)
- Reference: `prisma/schema.prisma` (para verificar modelos y campos)

- [ ] **Step 1: Agregar las 14 funciones de catalogo**

Agregar al final de `actions.server.ts`. Cada funcion usa Prisma con `select: { id, name }`. Verificar en el schema si cada tabla tiene `company_id` y/o `is_active` para aplicar los filtros correctos.

Patron para cada catalogo:

```typescript
export async function getAllXxxOptions() {
  try {
    return await prisma.xxx.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener xxx', { data: { error } });
    return [];
  }
}
```

Catalogos a crear (14):

1. `getAllCountryOptions()` — `countries` (sin filtro company)
2. `getAllCostCenterOptions()` — `cost_center` (sin filtro company en la query actual)
3. `getAllHierarchyOptions()` — `hierarchy` (sin filtro company en la query actual)
4. `getAllCompanyPositionOptions()` — `company_positions` (sin filtro company en la query actual)
5. `getAllWorkDiagramOptions()` — `work_diagram` (sin filtro company en la query actual)
6. `getAllGuildOptions()` — `guild` (filtro: `is_active: true`)
7. `getAllCovenantOptions()` — `covenant` (filtro: `is_active: true`)
8. `getAllCategoryOptions()` — `category` (filtro: `is_active: true`)
9. `getAllContractorOptions()` — `customers` (sin filtro is_active en query actual — pero work-data-form filtra client-side con `.filter(c => c.is_active)`, asi que agregar `where: { is_active: true }` directamente)
10. `getAllProvinceOptions()` — `provinces`
11. `getCitiesByProvince(provinceId: bigint)` — `cities` con `where: { province_id: provinceId }`
12. `getAllContractTypeOptions()` — `types_of_contract`
13. `getAllAptitudeOptions()` — `aptitudes_tecnicas` con `select: { id, nombre }` (campo es `nombre`, no `name`)
14. `getAllWorkshopSectorOptions()` — `workshop_sectors` con `where: { is_active: true }`, select incluye `workshop_id` y relacion `workshops: { select: { id, name } }`

Exportar tipos inferidos para cada catalogo.

- [ ] **Step 2: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 3: Commit**

```
feat(employee-detail): add 14 Prisma catalog server actions
```

---

### Task 3: Agregar funciones de diagramas (Prisma) al actions.server.ts

**Files:**

- Modify: `src/features/Employees/EmpleadoID/actions.server.ts`
- Reference: `src/app/server/GET/actions.ts` (buscar `fetchDiagramsHistoryByEmployeeId`, `fetchDiagramsByEmployeeId`, `fetchDiagramsTypes`)

- [ ] **Step 1: Leer las queries actuales de diagramas en `src/app/server/GET/actions.ts`**

Buscar las 3 funciones para entender la estructura de datos que retornan y que campos necesitan los consumidores (`DiagramDetailEmployeeView`).

- [ ] **Step 2: Agregar las 3 funciones de diagramas**

```typescript
export async function getEmployeeDiagramHistory(employeeId: string) {
  // Consultar employees_diagram_history o diagrams_logs segun lo que use la query actual
  // Incluir modified_by con select: { id, fullname }
  // Retornar datos ya formateados (no raw)
}

export async function getEmployeeDiagrams(employeeId: string) {
  // Consultar employees_diagram
  // Incluir diagram_type con select: { id, name }
  // NO incluir employee_id(*) — solo necesita el ID
}

export async function getDiagramTypes() {
  // Consultar diagram_type
  // select: { id, name }
}
```

**Importante**: Leer primero `DiagramDetailEmployeeView` para entender exactamente que campos consume y adaptar el retorno de Prisma a esa estructura. NO cambiar la interfaz del componente de diagramas — solo cambiar como se obtienen los datos.

- [ ] **Step 3: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 4: Commit**

```
feat(employee-detail): add Prisma diagram queries for Suspense section
```

---

### Task 4: Migrar `createEmployee` y `updateEmployee` a Prisma

**Files:**

- Modify: `src/features/Employees/EmpleadoID/actions.server.ts`
- Reference: `src/features/Employees/EmpleadoID/lib/actions/employee-actions.ts` (funciones actuales)

- [ ] **Step 1: Leer las funciones actuales**

Leer `employee-actions.ts` para entender la logica de `createEmployee` y `updateEmployee`. Anotar:

- Que campos se insertan/actualizan
- Si hay logica especial (ej: manejar `allocated_to` array, `aptitudes` M:M)
- Si hay validaciones server-side

- [ ] **Step 2: Migrar ambas funciones a Prisma en actions.server.ts**

- Eliminar `:any` types — usar tipos inferidos del schema Prisma
- Manejar relaciones M:M (`contractor_employee`, `empleado_aptitudes`) con `connectOrCreate` / `set` de Prisma
- Mantener la misma interfaz de entrada (parametros) para minimizar cambios en los consumidores

- [ ] **Step 3: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 4: Commit**

```
refactor(employee-detail): migrate createEmployee/updateEmployee to Prisma
```

---

### Task 5: Migrar `document-actions.ts` si tiene funciones usadas

**Files:**

- Reference: `src/features/Employees/EmpleadoID/lib/actions/document-actions.ts`
- Modify (si aplica): `src/features/Employees/EmpleadoID/actions.server.ts`

- [ ] **Step 1: Verificar si `document-actions.ts` tiene consumidores activos**

Buscar imports de este archivo en todo el proyecto. Si tiene consumidores, migrar las funciones a `actions.server.ts`. Si no tiene consumidores, marcar para eliminacion.

- [ ] **Step 2: Migrar o marcar para eliminacion**

- [ ] **Step 3: Commit si hubo cambios**

```
refactor(employee-detail): migrate document-actions to actions.server.ts
```

---

### Task 6: Eliminar codigo muerto masivo (~25 archivos)

**Files:**

- Delete: Todos los archivos listados en spec seccion 3.1 a 3.5
- Modify: Cualquier archivo que importe los eliminados (actualizar imports)

- [ ] **Step 1: Antes de eliminar, verificar con grep que cada archivo NO tiene importadores activos**

Para cada archivo a eliminar, ejecutar:

```bash
grep -r "nombre_del_archivo_sin_extension" src/ --include="*.tsx" --include="*.ts" -l
```

Si un archivo tiene importadores activos fuera de los archivos que tambien se eliminan, NO eliminarlo.

- [ ] **Step 2: Mover `createNestedFilterOptions` a shared antes de eliminar su archivo fuente**

`createNestedFilterOptions` de `src/features/Employees/Empleados/components/tables/data/employees-table.tsx` tiene 4 consumidores activos:

- `data-equipment.tsx`
- `SearchEmployee.tsx`
- `EquipmentByOwnerTable.tsx`
- `data-customer.tsx`

Mover la funcion a `src/shared/utils/table-helpers.ts` y actualizar los 4 imports.

- [ ] **Step 3: Eliminar archivos del sistema viejo de tablas (seccion 3.1)**

```
src/features/Employees/Empleados/EmpleadosTables/ (carpeta completa)
```

- [ ] **Step 4: Eliminar archivos con solo comentarios (seccion 3.2)**

```
src/features/Employees/Empleados/components/employee_table_server.tsx
src/features/Employees/Empleados/components/employee_table_inactive.tsx
src/features/Employees/Empleados/components/tables/EmployeeListTabs.tsx
src/features/Employees/Empleados/components/tables/EmployeesTable.tsx
src/features/Employees/Empleados/components/tables/columns.tsx
src/features/Employees/Empleados/components/tables/data/columns.tsx
src/features/Employees/Empleados/components/tables/data/types.ts
```

- [ ] **Step 5: Eliminar documentos viejos (seccion 3.3)**

```
src/features/Employees/Empleados/Documents/ (carpeta completa)
```

- [ ] **Step 6: Eliminar forms viejos (seccion 3.4)**

```
src/features/Employees/EmpleadoID/components/forms/employee-personal-info-form.tsx
src/features/Employees/EmpleadoID/components/forms/employee-work-info-form.tsx
```

- [ ] **Step 7: Eliminar server actions duplicadas (seccion 3.5)**

```
src/app/dashboard/employee/action/actions/actions.ts
```

- [ ] **Step 8: Eliminar funcion `getEmployeesFacets` de EmployeeList/actions.server.ts**

Buscar y eliminar la funcion `getEmployeesFacets` (~300 lineas) y el tipo `EmployeeFacets` del archivo `src/features/Employees/Empleados/EmployeeList/actions.server.ts`. NO eliminar el archivo completo — solo la funcion muerta.

- [ ] **Step 9: Eliminar store Zustand `useEmployeeFormReset`**

```
src/store/employeeFormReset.ts
```

Actualizar imports en:

- `src/features/Employees/EmpleadoID/components/employee-header.tsx` (eliminar import y uso de `triggerReset`)
- `src/features/Employees/EmpleadoID/components/employee-tabs.tsx` (eliminar import y `useEffect` de `resetTrigger`)

- [ ] **Step 10: Verificar que compila tras todas las eliminaciones**

Run: `npm run check-types`
Corregir cualquier import roto.

- [ ] **Step 11: Commit**

```
chore(employees): remove ~25 dead code files, old tables, commented code, duplicate actions
```

---

## Chunk 2: Refactorizar page.tsx + EmployeeHeader + EmployeeDetailClient

### Task 7: Crear `EmployeeHeaderContent` (Server Component)

**Files:**

- Create: `src/features/Employees/EmpleadoID/components/EmployeeHeaderContent.tsx`
- Reference: `src/features/Employees/EmpleadoID/components/employee-header.tsx` (version actual)

- [ ] **Step 1: Crear el Server Component con los datos estaticos del header**

Extraer la parte visual de `employee-header.tsx` (avatar, nombre, email, DNI, badge activo/inactivo, posicion jerarquica, datos de baja) como Server Component. SIN `'use client'`, SIN `useRouter`, SIN `onClick`.

```typescript
// EmployeeHeaderContent.tsx — Server Component (NO 'use client')
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Mail } from 'lucide-react';
import type { EmployeeDetailData } from '../actions.server';

interface Props {
  employee: NonNullable<EmployeeDetailData>;
}

export function EmployeeHeaderContent({ employee }: Props) {
  const fullName = `${employee.lastname} ${employee.firstname}`;
  const initials = `${employee.lastname?.[0] || ''}${employee.firstname?.[0] || ''}`;

  return (
    <div>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-24 w-24">
              <AvatarImage src={employee.picture || undefined} alt={fullName} />
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
          {/* Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
              <p className="text-muted-foreground">
                {employee.company_positions?.name || 'Sin posicion asignada'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{employee.email || 'Sin email'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">DNI: {employee.document_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={employee.is_active ? 'default' : 'secondary'}
                  className={employee.is_active ? 'bg-green-100 text-green-800' : ''}
                >
                  {employee.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
            {employee.hierarchy?.name && (
              <div className="text-sm text-muted-foreground">
                <strong>Posicion Jerarquica:</strong> {employee.hierarchy.name}
              </div>
            )}
          </div>
        </div>
        {/* Datos de baja */}
        {!employee.is_active && employee.termination_date && (
          <div className="mt-4 pt-4 grid grid-cols-2 gap-4">
            <div className="flex gap-2 text-red-400">
              <p className="font-medium">Fecha de Baja:</p>
              <p className="font-medium">{new Date(employee.termination_date).toLocaleDateString()}</p>
            </div>
            {employee.reason_for_termination && (
              <div className="flex gap-2 text-red-400">
                <p className="font-medium">Razon de Baja:</p>
                <p className="font-medium">{employee.reason_for_termination}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <Separator className="my-2 mt-0" />
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 3: Commit**

```
refactor(employee-header): extract EmployeeHeaderContent as Server Component
```

---

### Task 8: Crear `EmployeeDiagramsSection` (Server Component con Suspense)

**Files:**

- Create: `src/features/Employees/EmpleadoID/components/EmployeeDiagramsSection.tsx`
- Create: `src/features/Employees/EmpleadoID/components/skeletons/employee-diagrams-skeleton.tsx`

- [ ] **Step 1: Crear el skeleton de diagramas**

```typescript
// skeletons/employee-diagrams-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function EmployeeDiagramsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Crear el Server Component que resuelve datos y pasa a DiagramDetailEmployeeView**

```typescript
// EmployeeDiagramsSection.tsx — Server Component async
import { getEmployeeDiagramHistory, getEmployeeDiagrams, getDiagramTypes } from '../actions.server';
import { DiagramDetailEmployeeView } from '@/components/Diagrams/DiagramDetailEmployeeView';

interface Props {
  employeeId: string;
  employee: any; // usar el tipo real de EmployeeDetailData
  searchParams: Record<string, string | undefined>;
}

export async function EmployeeDiagramsSection({ employeeId, employee, searchParams }: Props) {
  const [historyData, diagrams, diagramTypes] = await Promise.all([
    getEmployeeDiagramHistory(employeeId),
    getEmployeeDiagrams(employeeId),
    getDiagramTypes(),
  ]);

  return (
    <DiagramDetailEmployeeView
      historyData={historyData}
      diagrams={diagrams}
      diagrams_types={diagramTypes}
      activeEmploees={[employee]}
      searchParams={searchParams}
    />
  );
}
```

**Nota**: Verificar la interfaz exacta de `DiagramDetailEmployeeView` para asegurar que los datos formateados de Prisma coincidan. El formateo de `historyData` (que hoy se hace en `page.tsx` lineas 88-98) debe moverse a `getEmployeeDiagramHistory` o a este componente.

- [ ] **Step 3: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 4: Commit**

```
feat(employee-detail): add EmployeeDiagramsSection Server Component with Suspense support
```

---

### Task 9: Crear `EmployeeViewDisplay` (modo vista — texto estatico)

**Files:**

- Create: `src/features/Employees/EmpleadoID/components/EmployeeViewDisplay.tsx`

- [ ] **Step 1: Crear componente que muestra datos del empleado como texto**

Este componente reemplaza a los formularios en modo `view`. Muestra los mismos datos pero como texto estatico, sin `useForm`, sin `FormField`, sin `FormControl`.

Organizar en las mismas 3 secciones que los forms (Datos Personales, Datos de Contacto, Datos Laborales) usando tabs.

Cada campo se muestra como:

```typescript
<div className="space-y-1">
  <p className="text-sm font-medium text-muted-foreground">Nombre</p>
  <p className="text-sm">{employee.firstname || '-'}</p>
</div>
```

Para campos con relaciones (FK), mostrar el `name` de la relacion:

```typescript
<p>{employee.hierarchy?.name || '-'}</p>
```

Para M:M (contratistas, aptitudes), mostrar como badges:

```typescript
{employee.contractor_employee?.map(ce => (
  <Badge key={ce.customers?.id}>{ce.customers?.name}</Badge>
))}
```

Usar `TabsManagerClientSide` con las mismas tabs y permisos que el componente actual.

- [ ] **Step 2: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 3: Commit**

```
feat(employee-detail): add EmployeeViewDisplay for static read-only view
```

---

### Task 10: Crear `EmployeeFormWrapper` (wrapper con useForm)

**Files:**

- Create: `src/features/Employees/EmpleadoID/components/EmployeeFormWrapper.tsx`
- Modify: `src/features/Employees/EmpleadoID/components/forms/employee-form.tsx` (simplificar)

- [ ] **Step 1: Crear el wrapper que contiene useForm**

El wrapper:

1. Instancia `useForm` con `zodResolver(employeeFormSchema)` y defaultValues del employee
2. Maneja el submit (createEmployee / updateEmployee)
3. Renderiza `EmployeeForm` (refactorizado) con el form y las tabs
4. Los sub-forms cargan catalogos on-demand con `useQuery`

- [ ] **Step 2: Refactorizar `employee-form.tsx`**

Simplificar: mantener solo el schema Zod, los tipos, y el componente `EmployeeForm` que renderiza los sub-forms segun la tab activa. Eliminar la logica de submit (ahora vive en el wrapper). Eliminar las `Promise` props — los sub-forms cargan sus propios catalogos.

- [ ] **Step 3: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 4: Commit**

```
refactor(employee-form): create EmployeeFormWrapper, simplify form architecture
```

---

### Task 11: Refactorizar sub-forms para cargar catalogos on-demand

**Files:**

- Modify: `src/features/Employees/EmpleadoID/components/forms/employee-personal-data-form.tsx`
- Modify: `src/features/Employees/EmpleadoID/components/forms/employee-contact-data-form.tsx`
- Modify: `src/features/Employees/EmpleadoID/components/forms/employee-work-data-form.tsx`

- [ ] **Step 1: Refactorizar `employee-personal-data-form.tsx`**

- Eliminar prop `countriesPromise` y `use()` de React
- Agregar `useQuery` para cargar paises on-demand:

```typescript
const { data: countries, isLoading: loadingCountries } = useQuery({
  queryKey: ['catalog', 'countries'],
  queryFn: () => getAllCountryOptions(),
  staleTime: 10 * 60 * 1000,
});
```

- En cada Select/Combobox: mostrar `<Skeleton />` mientras `isLoading`
- Mantener la misma UI y campos

- [ ] **Step 2: Refactorizar `employee-contact-data-form.tsx`**

- Eliminar props `provincesPromise` y `citiesPromise`
- Agregar `useQuery` para provincias (siempre) y ciudades (dependiente de provincia seleccionada):

```typescript
const selectedProvince = form.watch('province');

const { data: provinces, isLoading: loadingProvinces } = useQuery({
  queryKey: ['catalog', 'provinces'],
  queryFn: () => getAllProvinceOptions(),
  staleTime: 10 * 60 * 1000,
});

const { data: cities, isLoading: loadingCities } = useQuery({
  queryKey: ['catalog', 'cities', selectedProvince],
  queryFn: () => getCitiesByProvince(selectedProvince!),
  staleTime: 10 * 60 * 1000,
  enabled: !!selectedProvince,
});
```

- [ ] **Step 3: Refactorizar `employee-work-data-form.tsx`**

- Eliminar TODAS las Promise props (11 catalogos)
- Agregar `useQuery` para cada catalogo. Catalogos con cascada (convenio depende de gremio, categoria depende de convenio, puesto depende de sector, etc.) usan `enabled`:

```typescript
const selectedGuild = form.watch('guild_id');
const { data: covenants } = useQuery({
  queryKey: ['catalog', 'covenants', selectedGuild],
  queryFn: () => getCovenantsByGuild(selectedGuild!), // o filtrar client-side
  enabled: !!selectedGuild,
  staleTime: 10 * 60 * 1000,
});
```

- Eliminar el filtrado client-side de `contractorCompanies` (`filter(c => c.is_active)`) — ahora se filtra server-side en la query Prisma
- Mostrar `<Skeleton />` en cada Select mientras carga

- [ ] **Step 4: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 5: Commit**

```
refactor(employee-forms): load catalogs on-demand with useQuery + skeletons
```

---

### Task 12: Crear `EmployeeDetailClient` (Client Component principal)

**Files:**

- Create: `src/features/Employees/EmpleadoID/components/EmployeeDetailClient.tsx`

- [ ] **Step 1: Crear el componente que gestiona el modo y las tabs**

```typescript
'use client';

import { useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions';
import { Edit, X } from 'lucide-react';
import type { EmployeeDetailData } from '../actions.server';
import { EmployeeViewDisplay } from './EmployeeViewDisplay';
import { EmployeeFormWrapper } from './EmployeeFormWrapper';
import { EmployeeQuickActions } from './employee-quick-actions';
import BackButton from '@/components/BackButton';
import { TabsManagerClientSide } from '@/features/TabsManager/TabsManagerClientSide';

interface Props {
  employee: NonNullable<EmployeeDetailData>;
  employeeId: string;
  initialMode: 'view' | 'edit' | 'new';
  companyId: string;
  header: ReactNode;          // Server Component pre-renderizado
  documentsSlot: ReactNode;   // EmployeeDocumentDetail pre-renderizado
  diagramsSlot: ReactNode;    // EmployeeDiagramsSection con Suspense
}

export function EmployeeDetailClient({
  employee, employeeId, initialMode, companyId,
  header, documentsSlot, diagramsSlot,
}: Props) {
  const [currentMode, setCurrentMode] = useState(initialMode);

  const switchToEdit = () => {
    setCurrentMode('edit');
    window.history.replaceState(null, '', `?action=edit&employee_id=${employeeId}`);
  };

  const switchToView = () => {
    setCurrentMode('view');
    window.history.replaceState(null, '', `?action=view&employee_id=${employeeId}`);
  };

  const handleSaved = (newEmployeeId?: string) => {
    if (newEmployeeId) {
      // Nuevo empleado creado — navegar al detalle
      window.location.href = `?action=view&employee_id=${newEmployeeId}`;
    } else {
      switchToView();
    }
  };

  // Tabs segun modo
  const formOrView = currentMode === 'view'
    ? <EmployeeViewDisplay employee={employee} />
    : <EmployeeFormWrapper
        employee={currentMode === 'new' ? null : employee}
        mode={currentMode}
        companyId={companyId}
        onSaved={handleSaved}
      />;

  return (
    <Card>
      {/* Header (Server Component como children) */}
      {currentMode !== 'new' && (
        <>
          {header}
          {/* Botones de modo */}
          <div className="flex items-center gap-2 px-6 pb-2">
            {currentMode === 'view' && (
              <PermissionGuard module="empleados" tab="detalle-empleado" action="update">
                <Button variant="outline" size="sm" onClick={switchToEdit}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
              </PermissionGuard>
            )}
            {currentMode === 'edit' && (
              <Button variant="outline" size="sm" onClick={switchToView}>
                <X className="h-4 w-4 mr-2 text-red-400" /> Cancelar
              </Button>
            )}
            <PermissionGuard module="empleados" tab="detalle-empleado" action="update">
              <EmployeeQuickActions
                employeeId={employee.id}
                isActive={employee.is_active!}
                email={employee.email!}
              />
            </PermissionGuard>
            <Separator orientation="vertical" className="w-[1px] h-10" />
            <BackButton size="sm" />
          </div>
        </>
      )}
      {currentMode === 'new' && (
        <div className="flex justify-end p-4 pb-0">
          <BackButton />
        </div>
      )}

      {/* Contenido principal con tabs */}
      <div className="p-6">
        {/* Las tabs de datos + documentacion + diagramas */}
        {formOrView}
        {/* Documentacion y Diagramas como slots */}
        {/* Integrar dentro del TabsManagerClientSide del formOrView */}
      </div>
    </Card>
  );
}
```

**Integracion de tabs con slots**: `EmployeeDetailClient` es quien renderiza el `TabsManagerClientSide` completo (no los sub-componentes). Las 5 tabs se definen aqui:

```typescript
const tabs = [
  {
    value: 'personalData',
    label: (<div className="flex items-center gap-2"><User className="h-4 w-4" /><span className="hidden sm:inline">Datos Personales</span></div>),
    moduleSlug: 'empleados' as const,
    tabSlug: 'datos-personales' as const,
    content: formOrView, // EmployeeViewDisplay o EmployeeFormWrapper segun modo
  },
  {
    value: 'contactData',
    label: (<div className="flex items-center gap-2"><Phone className="h-4 w-4" /><span className="hidden sm:inline">Datos de Contacto</span></div>),
    moduleSlug: 'empleados' as const,
    tabSlug: 'datos-contacto' as const,
    content: formOrView, // Mismo componente — internamente renderiza solo la tab activa
  },
  {
    value: 'workData',
    label: (<div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /><span className="hidden sm:inline">Datos Laborales</span></div>),
    moduleSlug: 'empleados' as const,
    tabSlug: 'datos-laborales' as const,
    content: formOrView,
  },
  {
    value: 'documents',
    label: (<div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Documentacion</span></div>),
    moduleSlug: 'documentacion' as const,
    tabSlug: 'documentos-de-empleados' as const,
    disabled: currentMode === 'new',
    content: documentsSlot, // Server Component pre-renderizado inyectado como slot
  },
  ...(hasDiagramAccess && currentMode !== 'new' ? [{
    value: 'diagrams',
    label: (<div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Diagramas</span></div>),
    content: diagramsSlot, // Suspense + EmployeeDiagramsSection inyectado como slot
  }] : []),
];

return (
  <TabsManagerClientSide paramName="tab" defaultTab="personalData" tabs={tabs} ... />
);
```

`EmployeeViewDisplay` y `EmployeeFormWrapper` renderizan solo el contenido de UNA tab (reciben `activeTab` como prop o leen el tab activo del `TabsManagerClientSide`). La tab de documentacion y diagramas se manejan como slots directos sin pasar por el form/view.

La forma mas limpia: `EmployeeViewDisplay` y `EmployeeFormWrapper` NO contienen `TabsManagerClientSide` — solo renderizan el contenido de la tab seleccionada. El `TabsManagerClientSide` vive en `EmployeeDetailClient` y decide que renderizar segun la tab activa y el modo actual.

- [ ] **Step 2: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 3: Commit**

```
feat(employee-detail): create EmployeeDetailClient with local mode management
```

---

### Task 13: Reescribir `page.tsx` (thin Server Component)

**Files:**

- Modify: `src/app/dashboard/employee/action/page.tsx`

- [ ] **Step 1: Reescribir page.tsx con la nueva arquitectura**

```typescript
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Logger } from '@/lib/logger';
import { getCachedSession } from '@/shared/lib/cached-session';
import { getEmployeeByIdCached } from '@/features/Employees/EmpleadoID/actions.server';
import { EmployeeDetailClient } from '@/features/Employees/EmpleadoID/components/EmployeeDetailClient';
import { EmployeeHeaderContent } from '@/features/Employees/EmpleadoID/components/EmployeeHeaderContent';
import { EmployeeDiagramsSection } from '@/features/Employees/EmpleadoID/components/EmployeeDiagramsSection';
import { EmployeeDiagramsSkeleton } from '@/features/Employees/EmpleadoID/components/skeletons/employee-diagrams-skeleton';
import { EmployeeDocumentDetail } from '@/features/Employees/EmpleadoID/components/employee-document-detail';

const logger = new Logger('EmployeePage');

interface EmployeePageProps {
  searchParams: Promise<{
    action?: 'view' | 'edit' | 'new';
    employee_id?: string;
  }>;
}

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const resolvedSearchParams = await searchParams;
  const mode = resolvedSearchParams.action || 'view';
  const employeeId = resolvedSearchParams.employee_id;

  if (!employeeId && mode !== 'new') {
    notFound();
  }

  // Obtener session para companyId
  const session = await getCachedSession();
  const companyId = session?.user?.app_metadata?.company;

  // UNICA query bloqueante (React.cache deduplicada con generateMetadata)
  let employee = null;
  if (mode !== 'new' && employeeId) {
    employee = await getEmployeeByIdCached(employeeId);
    if (!employee) notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <EmployeeDetailClient
        employee={employee}
        employeeId={employeeId || ''}
        initialMode={mode}
        companyId={companyId || ''}
        header={employee ? <EmployeeHeaderContent employee={employee} /> : null}
        documentsSlot={
          employeeId ? (
            <EmployeeDocumentDetail employeeId={employeeId} searchParams={resolvedSearchParams} />
          ) : null
        }
        diagramsSlot={
          employeeId && employee ? (
            <Suspense fallback={<EmployeeDiagramsSkeleton />}>
              <EmployeeDiagramsSection
                employeeId={employeeId}
                employee={employee}
                searchParams={resolvedSearchParams}
              />
            </Suspense>
          ) : null
        }
      />
    </div>
  );
}

// generateMetadata usa React.cache() — reutiliza el resultado de getEmployeeByIdCached
export async function generateMetadata({ searchParams }: EmployeePageProps) {
  const resolvedSearchParams = await searchParams;
  const { employee_id } = resolvedSearchParams;

  if (!employee_id) {
    return {
      title: 'Registrar Nuevo Empleado',
      description: 'Crear y registrar un nuevo perfil de empleado en el sistema',
    };
  }

  const employee = await getEmployeeByIdCached(employee_id);
  return {
    title: `Empleado - ${employee?.firstname} ${employee?.lastname}`,
    description: 'Informacion detallada del empleado',
  };
}
```

- [ ] **Step 2: Eliminar imports no usados del page.tsx viejo**

Eliminar imports de: `fetchDiagramsByEmployeeId`, `fetchDiagramsHistoryByEmployeeId`, `fetchDiagramsTypes`, `getEmployeeById`, `getEmployeeNameById`, todas las funciones de `catalog-actions.ts`, `fetchAllAptitudesTecnicas`, `fetchAllContractTypes`, `fetchCountrys`, `moment`, `cookies`, `EmployeeTabs`, `EmployeeHeader`.

- [ ] **Step 3: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 4: Commit**

```
refactor(employee-detail): rewrite page.tsx as thin Server Component with single Prisma query
```

---

## Chunk 3: Fixes Adicionales + Verificacion Final

### Task 14: Fix useEffect de errores → derivacion directa

**Files:**

- Modify: `src/features/Employees/EmpleadoID/components/EmployeeFormWrapper.tsx` (o donde viva la logica de tabs con errores)

- [ ] **Step 1: Reemplazar useEffect + useState por derivacion directa**

En el componente que maneja las tabs del form, reemplazar:

```typescript
// ELIMINAR
const [errors, setErrors] = useState({ personalData: false, contactData: false, workData: false });
useEffect(() => { ... }, [form.formState.errors]);

// REEMPLAZAR CON
const formErrors = form.formState.errors;
const tabErrors = {
  personalData: personalDataFields.some(f => f in formErrors),
  contactData: contactDataFields.some(f => f in formErrors),
  workData: workDataFields.some(f => f in formErrors),
};
```

- [ ] **Step 2: Verificar que compila**

- [ ] **Step 3: Commit**

```
fix(employee-form): derive tab errors directly instead of useEffect
```

---

### Task 15: Fix console.error → logger.error + eliminar `:any` types

**Files:**

- Modify: `src/app/server/GET/actions.ts` (lineas 52, 2018, 2053 con console.error)
- Modify: `src/features/Employees/EmpleadoID/lib/actions/employee-actions.ts` (console.error)
- Modify: `src/features/Employees/EmpleadoID/actions.server.ts` (verificar `:any` types)

- [ ] **Step 1: Buscar y reemplazar console.error en archivos del flujo de empleado**

Usar grep para encontrar todos los `console.error` en:

- `src/app/server/GET/actions.ts`
- `src/features/Employees/EmpleadoID/lib/actions/employee-actions.ts`
- Cualquier otro archivo tocado por esta feature

Reemplazar por `logger.error(...)` con el patron del proyecto.

- [ ] **Step 2: Eliminar `:any` types en archivos del flujo de empleado**

Buscar y corregir estas 3 instancias identificadas en la spec:

1. `(item.modified_by as any)?.fullname` → ya resuelto con Prisma en `getEmployeeDiagramHistory` (Task 3), verificar que no quede en ningun archivo
2. `data as any` en `createEmployee`/`updateEmployee` → ya resuelto con tipos Prisma en Task 4, verificar que no quede
3. `diagrams2 as any` en page.tsx → ya eliminado en la reescritura de page.tsx (Task 13), verificar

Buscar cualquier `:any` remanente:

```bash
grep -rn ": any\|as any" src/features/Employees/EmpleadoID/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 3: Commit**

```
fix: replace console.error with logger, eliminate :any types in employee detail
```

---

### Task 15b: Consolidar catalogos dispersos en actions.server.ts

**Files:**

- Reference: `src/features/Empresa/RRHH/actions/actions.ts` (exporta `fetchAllAptitudesTecnicas`)
- Reference: `src/features/Empresa/RRHH/components/TypeContract/actions/actions.ts` (exporta `fetchAllContractTypes`)
- Reference: `src/shared/actions/employees.actions.ts` (exporta `fetchCountrys`)
- Modify: `src/features/Employees/EmpleadoID/actions.server.ts` (ya tiene versiones Prisma de Task 2)

- [ ] **Step 1: Verificar que las versiones Prisma en actions.server.ts cubren estos 3 catalogos**

En Task 2 se crearon `getAllAptitudeOptions()`, `getAllContractTypeOptions()`, y `getAllCountryOptions()`. Verificar que existen y funcionan correctamente.

- [ ] **Step 2: Verificar que los archivos originales NO se eliminan (tienen otros consumidores)**

```bash
grep -r "fetchAllAptitudesTecnicas" src/ --include="*.tsx" --include="*.ts" -l
grep -r "fetchAllContractTypes" src/ --include="*.tsx" --include="*.ts" -l
grep -r "fetchCountrys" src/ --include="*.tsx" --include="*.ts" -l
```

Si tienen consumidores fuera del detalle de empleado (ej: RRHH tabs, otras features), mantener los archivos originales intactos. Las nuevas funciones Prisma en `actions.server.ts` son versiones independientes para el detalle de empleado.

- [ ] **Step 3: Actualizar imports en sub-forms refactorizados**

Verificar que `employee-personal-data-form.tsx`, `employee-contact-data-form.tsx` y `employee-work-data-form.tsx` importen de `actions.server.ts` (no de los archivos dispersos).

- [ ] **Step 4: Commit si hubo cambios**

```
refactor(employee-detail): consolidate catalog imports to actions.server.ts
```

---

### Task 16: Eliminar viejo `employee-tabs.tsx` y `employee-header.tsx`

**Files:**

- Delete: `src/features/Employees/EmpleadoID/components/employee-tabs.tsx` (reemplazado por EmployeeDetailClient + EmployeeFormWrapper + EmployeeViewDisplay)
- Delete: `src/features/Employees/EmpleadoID/components/employee-header.tsx` (reemplazado por EmployeeHeaderContent)
- Delete: `src/features/Employees/EmpleadoID/lib/` (carpeta completa — funciones migradas a actions.server.ts)

- [ ] **Step 1: Verificar que ningun archivo importe los componentes viejos**

```bash
grep -r "employee-tabs" src/ --include="*.tsx" --include="*.ts" -l
grep -r "employee-header" src/ --include="*.tsx" --include="*.ts" -l
grep -r "catalog-actions" src/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Eliminar archivos**

- [ ] **Step 3: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 4: Commit**

```
chore(employee-detail): remove old employee-tabs, employee-header, and lib/ folder
```

---

### Task 17: Fix Suspense en tab `diagrams` de la lista de empleados

**Files:**

- Modify: `src/app/dashboard/employee/page.tsx` (lista de empleados, no el detalle)

- [ ] **Step 1: Envolver `<EmployesDiagram>` en Suspense**

En `page.tsx` de la lista de empleados, buscar la tab `diagrams` (~L176) y agregar Suspense:

```typescript
content: (
  <Suspense fallback={<DataTableSkeleton />}>
    <EmployesDiagram ... />
  </Suspense>
),
```

- [ ] **Step 2: Commit**

```
fix(employee-list): add Suspense boundary to diagrams tab
```

---

### Task 18: Verificacion final completa

- [ ] **Step 1: Verificar compilacion**

Run: `npm run check-types`
Expected: 0 errores

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`

- [ ] **Step 3: Verificar que el dev server arranca**

Run: `npm run dev`
Navegar a `/dashboard/employee?tab=employees` y verificar que la lista carga.

- [ ] **Step 4: Verificar detalle de empleado en modo view**

Navegar a `/dashboard/employee/action?action=view&employee_id=150b4f46-6219-4d75-a42e-c7057abf0196`
Verificar:

- Header se muestra rapidamente
- Datos del empleado se muestran como texto
- Diagramas cargan con streaming (Suspense)
- No hay catalogos cargandose (modo view)

- [ ] **Step 5: Verificar cambio a modo edit**

Click en "Editar":

- La URL cambia a `?action=edit&...` SIN navegacion
- Los inputs aparecen con skeletons en los selects
- Los catalogos cargan en ~100-200ms
- El form se puede llenar y guardar

- [ ] **Step 6: Verificar cancelar edicion**

Click en "Cancelar":

- Vuelve a modo view SIN navegacion
- Los datos del empleado se muestran como texto
- La URL vuelve a `?action=view&...`

- [ ] **Step 7: Verificar crear nuevo empleado**

Navegar a `/dashboard/employee/action?action=new`

- El form aparece con campos vacios
- Los catalogos cargan on-demand
- Se puede crear un empleado

- [ ] **Step 8: Commit final si hay ajustes**

```
fix(employee-detail): final adjustments after integration testing
```
