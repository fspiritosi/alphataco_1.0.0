# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Framework**: Next.js 16 with React 19 (App Router, Server Components)
- **Database**: Supabase (PostgreSQL) with auto-generated types in `database.types.ts`
- **State**: Zustand (global), React Query (server state), Jotai (atomic)
- **UI**: shadcn/ui + Tailwind CSS + Lucide icons
- **Forms**: React Hook Form + Zod validation
- **Analytics**: PostHog (error tracking and analytics)
- **Dates**: moment.js (NOT date-fns)

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run local            # Start Supabase + Next.js dev server

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier
npm run check-types      # TypeScript type checking

# Database
npm run gentypes         # Generate TS types from remote Supabase
npm run genlocaltypes    # Generate TS types from local Supabase
npm run create-migration # Create new migration: npm run create-migration nombre
npm run push-migrations  # Push migrations to remote
npm run migration-status # Check migration status

# Testing
npm run test:e2e         # Run Cypress E2E tests headless
npm run test:e2e:open    # Open Cypress test runner
```

## MCPs Disponibles

Los siguientes MCPs estan a tu disposicion:

1. **MCP de Supabase (DEV y PROD)**:

   - **supabase-DEV**: Base de datos de DESARROLLO. Tiene permisos de lectura y escritura (ejecutar queries, aplicar migraciones, modificar datos).
   - **supabase-PROD**: Base de datos de PRODUCCION. Solo tiene permisos de LECTURA (consultas, verificaciones).

   **REGLA CRITICA**: SIEMPRE usar `supabase-DEV` por defecto para cualquier operacion. Solo usar `supabase-PROD` cuando el usuario explicitamente indique que necesita revisar o consultar datos en produccion (ej: "revisa en produccion", "consulta en prod", "verifica en la base de produccion").

   **REGLA DE MIGRACIONES**: Los cambios en la base de datos (crear tablas, modificar columnas, etc.) se deben aplicar **DIRECTAMENTE usando el MCP de Supabase** con `apply_migration`. **NO crear archivos SQL manualmente en `/supabase/migrations/`**. Supabase tiene comandos para generar migraciones diferenciando bases de datos, por lo que no es necesario crear archivos locales.

   **REGLA DE TIPOS**: Después de aplicar una migración con el MCP:

   - Usar `npm run genlocaltypes` para regenerar tipos (ya que el cambio se aplicó en DEV/local)
   - `npm run gentypes` es para obtener tipos de PRODUCCIÓN (no reflejará cambios recientes en DEV)

2. **MCP de chrome-devtools**: Para revisar logs de debug y verificaciones generales de la aplicacion
3. **MCP de shadcn-ui**: SIEMPRE usar para cualquier cosa relacionada con UI, componentes, estilos o implementacion de componentes de shadcn/ui. Tiene acceso a documentacion y ejemplos actualizados
4. **MCP de Context7**: SIEMPRE usar como PRIMERA OPCION para consultar documentacion actualizada de librerias, frameworks o herramientas. Si Context7 no tiene la documentacion necesaria, entonces buscar en internet

---

## Reglas Criticas (SIEMPRE Aplicar)

### 1. NO `:any` - SIEMPRE Inferir Tipos

**NUNCA** tipar datos como `:any` o `:Any`. SIEMPRE inferir el tipado usando el tipo de retorno de las funciones:

```typescript
// ❌ INCORRECTO - NUNCA hacer esto
const data: any = await fetchData();
function handleData(data: any) { ... }

// ✅ CORRECTO - Usar Awaited<ReturnType<typeof function>>
export async function getRemitos(rowId: string) {
  const { data, error } = await supabase
    .from('remitos')
    .select('*')
    .eq('daily_report_row_id', rowId);

  if (error) throw error;
  return data || [];
}

// Exportar el tipo
export type Remito = Awaited<ReturnType<typeof getRemitos>>[number];

// Usar el tipo
const remitos: Awaited<ReturnType<typeof getRemitos>> = await getRemitos(rowId);
type MyData = Awaited<ReturnType<typeof fetchData>>;
```

### 2. Server Actions, NO API Routes

**SIEMPRE** usar Server Actions (`'use server'`) en lugar de rutas API (`/api/*`).

#### Ubicacion de Server Actions

**Las Server Actions deben ubicarse SIEMPRE dentro de la carpeta de la feature correspondiente.**  
Cada feature debe tener su propia lógica y acciones en:

```
src/features/{FeatureName}/
├── actions.ts                  # Server actions de la feature ('use server')
├── actionsClient.ts            # (opcional) Acciones específicas del lado cliente si es necesario
```

> **Importante:** Aunque actualmente existen algunas Server Actions en `src/app/server/`, si al modificar una feature encuentras ahí funciones que pertenecen a esa feature, debes moverlas **tal cual** (sin cambios en la lógica) a `src/features/{FeatureName}/actions.ts` y usar ese nuevo path para todos los imports en el proyecto. Así se garantiza la correcta organización y mantenimiento.

**Resumen de ubicaciones correctas:**

- `src/features/{FeatureName}/actions.ts` → Server Actions ('use server') para esa feature (SIEMPRE aquí)
- `src/features/{FeatureName}/actionsClient.ts` → Acciones del lado del cliente si son necesarias para la feature

**NO usar `src/app/server/` para nuevas Server Actions ni modificaciones; migrar a features cuando corresponda.**

#### Nomenclatura de Server Actions

Usar formato `metodoFiltroEntidad`:

```typescript
// ✅ CORRECTO
getAllEmployees();
getActivesEmployees();
createNewFormAnswer();
updateVehicle();
deleteDocument();

// ❌ INCORRECTO
getEmployees(); // Falta especificidad
getActive(); // Falta entidad
createForm(); // Falta especificidad
```

#### Formato de Server Action

```typescript
'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function getAllEmployees() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('employees').select('*');

  if (error) throw error;
  return data || [];
}
```

#### Reglas de Server Actions

```typescript
// ✅ CORRECTO
'use server';
export async function getAllEmployees() { ... }

// ❌ INCORRECTO - NO crear rutas API
// app/api/employees/route.ts
export async function GET() { ... }

// ❌ INCORRECTO - NO olvidar validar permisos
export async function createEmployee(data) {
  await supabase.from('employees').insert(data); // Falta validacion de permisos
}

// ❌ INCORRECTO - NO usar 'use server' en archivos de cliente
'use client';
'use server'; // Esto no funciona
```

### 3. Logger en Lugar de console.\* (CON REEMPLAZO AUTOMATICO)

**SIEMPRE** usar el logger personalizado de `src/lib/logger.ts` en lugar de `console.log`, `console.error`, `console.warn`, etc.

El logger solo emite logs si `NEXT_PUBLIC_SHOW_LOGS === 'true'`, lo que permite controlar el logging en produccion.

#### REGLA CRITICA: Reemplazo Automatico de console.\*

**IMPORTANTE**: Si encuentras cualquier uso de `console.log`, `console.error`, `console.warn`, `console.debug`, `console.group`, `console.table`, `console.time`, o cualquier otro metodo de `console.*` en el codigo, **DEBES** reemplazarlo inmediatamente por el logger correspondiente.

#### Proceso de Reemplazo

1. **Detectar** cualquier uso de `console.*` en el archivo
2. **Agregar** el import del logger si no existe: `import { logger } from '@/lib/logger';` o `import { Logger } from '@/lib/logger';`
3. **Reemplazar** cada llamada de `console.*` por el metodo equivalente del logger
4. **Verificar** que todas las referencias a `console.*` hayan sido eliminadas

#### Mapeo de Reemplazo

| console.\*                               | logger.\*                            | Ejemplo                                                                     |
| ---------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `console.log()`                          | `logger.info()`                      | `console.log('Mensaje')` → `logger.info('Mensaje')`                         |
| `console.error()`                        | `logger.error()`                     | `console.error('Error:', err)` → `logger.error('Error', { data: { err } })` |
| `console.warn()`                         | `logger.warn()`                      | `console.warn('Advertencia')` → `logger.warn('Advertencia')`                |
| `console.debug()`                        | `logger.debug()`                     | `console.debug('Debug info')` → `logger.debug('Debug info')`                |
| `console.group()` / `console.groupEnd()` | `logger.group()`                     | `console.group('Grupo')` → `logger.group('Grupo', () => { ... })`           |
| `console.table()`                        | `logger.table()`                     | `console.table(data)` → `logger.table(data, 'Descripcion')`                 |
| `console.time()` / `console.timeEnd()`   | `logger.time()` / `logger.timeEnd()` | `console.time('label')` → `logger.time('label')`                            |

#### Ejemplo de Reemplazo Completo

```typescript
// ❌ ANTES - Con console.*
console.log('Iniciando proceso');
console.group('Operacion');
console.log('Paso 1');
console.log('Paso 2');
console.groupEnd();
console.error('Error:', error);
console.table(employees);

// ✅ DESPUES - Con logger
import { logger } from '@/lib/logger';

logger.info('Iniciando proceso');
logger.group('Operacion', () => {
  logger.info('Paso 1');
  logger.info('Paso 2');
});
logger.error('Error', { data: { error } });
logger.table(employees, 'Lista de empleados');
```

#### Uso del Logger

```typescript
import { logger } from '@/lib/logger';

// O crear un logger con scope (recomendado)
import { Logger } from '@/lib/logger';
const logger = new Logger('MyComponent');

// Logging basico
logger.info('Empleado creado exitosamente');
logger.debug('Cargando datos del empleado...');
logger.warn('Falta informacion opcional');
logger.error('Error al guardar empleado', {
  data: { error: error.message, employeeId },
});
```

#### Metodos Disponibles del Logger

```typescript
// Niveles de Log
logger.debug(message: string, meta?: LogMeta);
logger.info(message: string, meta?: LogMeta);
logger.warn(message: string, meta?: LogMeta);
logger.error(message: string, meta?: LogMeta);

// Helpers Especiales
logger.group('Operacion Completa', () => {
  logger.info('Paso 1 completado');
  logger.info('Paso 2 completado');
}, { collapsed: true });

logger.table(employees, 'Lista de empleados');

logger.time('Carga de datos');
// ... codigo ...
logger.timeEnd('Carga de datos');

logger.separator('Inicio de seccion');
```

#### Logger con Scope (Recomendado)

```typescript
// En componentes
import { Logger } from '@/lib/logger';
const logger = new Logger('EmployeesTable');

// En features
const logger = new Logger('features/Employees');

// Clonar logger con nuevo scope
const baseLogger = new Logger('BaseScope');
const childLogger = baseLogger.withScope('ChildScope');
```

**Regla de Oro**: NUNCA dejes codigo con `console.*` sin reemplazar. Si ves un `console.log` o cualquier `console.*`, cambialo inmediatamente por el logger correspondiente.

### 4. Queries Eficientes

Analiza el contexto de uso para asegurar que las peticiones sean eficientes:

- **NO** realizar N+1 queries
- **NO** traer todos los datos y filtrar en el frontend
- **SIEMPRE** filtrar en la query (hook useQuery o server action)
- **SIEMPRE** optimizar las peticiones

```typescript
// ❌ INCORRECTO - Traer todo y filtrar en frontend
const allEmployees = await getAllEmployees();
const activeEmployees = allEmployees.filter((e) => e.is_active);

// ✅ CORRECTO - Filtrar en la query
const activeEmployees = await getActiveEmployees();
```

### 5. moment.js para Fechas

**SIEMPRE** usar moment.js para cualquier manejo de fechas, NO date-fns.

```typescript
import moment from 'moment';

// Formatear fecha
moment(date).format('DD/MM/YYYY');

// Comparar fechas
moment(date1).isBefore(date2);
```

### 6. No Crear Archivos .md

**NO** crear archivos markdown (.md) a menos que se solicite explicitamente.

---

## Arquitectura

### Estructura del Proyecto

```
src/
├── app/                    # Next.js pages (thin, import from features/)
│   └── server/             # Server Actions organized by HTTP verb
│       ├── GET/actions.ts
│       ├── POST/actions.ts
│       ├── UPDATE/actions.ts
│       └── DELETE/actions.ts
├── features/               # Business logic by domain
│   └── {Feature}/
│       ├── {Feature}Component.tsx    # Main component
│       ├── {SubTab}/                 # Each folder = a tab in UI
│       ├── components/
│       ├── hooks/                    # useQuery hooks
│       ├── actions/
│       ├── types/
│       └── utils/
├── components/ui/          # shadcn/ui components
├── lib/
│   ├── supabase/           # server.ts and browser.ts clients
│   ├── logger.ts           # Custom logger (use instead of console.*)
│   └── utils.ts            # Utilities
├── store/                  # Zustand stores
└── types/                  # Global types
```

---

## Estructura de Features

### Principio Fundamental

**Toda la logica de negocio, componentes relacionados y acciones deben ubicarse en `src/features/`, NO en `src/app/`.**

Las paginas en `app/` deben ser delgadas y solo importar componentes desde `features/`.

### Estructura Estandar de una Feature

```
src/features/
└── {FeatureName}/                    # Nombre en PascalCase (ej: Employees, Permissions)
    ├── {FeatureName}Component.tsx    # Componente principal (opcional)
    ├── {FeatureName}TabContent.tsx   # Contenido de tab (si aplica)
    │
    ├── actions/                      # Server actions (opcional)
    │   ├── actions.ts                # Client-side actions
    │   ├── actionsServer.ts          # Server-side actions ('use server')
    │   └── server-actions.ts         # Alternativa de nombre
    │
    ├── components/                   # Componentes React de la feature
    │   ├── {SpecificComponent}.tsx
    │   ├── shared/                   # Componentes compartidos dentro de la feature
    │   └── tables/                   # Componentes de tablas especificas
    │
    ├── hooks/                        # Custom hooks
    │   └── use{HookName}.ts
    │
    ├── types/                        # Tipos TypeScript
    │   └── index.ts                  # Exportar todos los tipos
    │
    ├── utils/                        # Funciones utilitarias
    │   └── {utility}.ts
    │
    └── lib/                          # Logica interna/compleja (opcional)
        └── actions/
            └── {actions}.ts
```

### Jerarquia de Tabs Reflejada en Carpetas

**IMPORTANTE**: Cuando una feature tiene multiples tabs, cada subcarpeta representa una tab del sistema.

```
features/Documentacion/
├── DocumentacionComponent.tsx        # Componente principal con TabsManagerServer
├── DocumentosEmpleados/              # Tab: "documentos-de-empleados"
│   └── DocumentosEmpleadosTabContent.tsx
├── DocumentosEquipos/                # Tab: "documentos-de-equipos"
│   └── DocumentosEquiposTabContent.tsx
├── DocumentosEmpresa/                # Tab: "documentos-de-empresa"
│   └── DocumentosEmpresaTabContent.tsx
└── TiposDocumentos/                  # Tab: "tipos-de-documentos"
    └── TiposDocumentosTabContent.tsx
```

**Regla**: La jerarquia de carpetas debe reflejar la jerarquia de tabs del sistema. Cada subcarpeta = una tab.

### Separacion de Responsabilidades

```typescript
// ✅ CORRECTO - app/dashboard/document/page.tsx
import DocumentacionComponent from '@/features/Documentacion/DocumentacionComponent';

export default async function DocumentPage({ searchParams }) {
  return <DocumentacionComponent searchParams={searchParams} />;
}

// ❌ INCORRECTO - No poner logica en app/
export default async function DocumentPage({ searchParams }) {
  const data = await fetchDocuments(); // ❌ Debe estar en features/
  return <DocumentTable data={data} />; // ❌ Componente debe estar en features/
}
```

### Reorganizacion Automatica de Archivos

**IMPORTANTE**: Cuando trabajes en una feature, SIEMPRE verifica que los archivos esten correctamente organizados segun esta estructura. Si detectas archivos mal ubicados, muevelos inmediatamente.

#### Reglas de Reorganizacion

1. **Componentes React** (`.tsx` que no son componentes principales):

   - ✅ Deben estar en `components/` o `components/shared/` o `components/tables/`
   - ❌ NO deben estar en la raiz de la feature
   - **Accion**: Mover a `components/` apropiado

2. **Hooks personalizados** (`use*.ts`):

   - ✅ Deben estar en `hooks/`
   - ❌ NO deben estar en la raiz o en `components/`
   - **Accion**: Mover a `hooks/`

3. **Tipos TypeScript** (`*.ts` que solo exportan tipos):

   - ✅ Deben estar en `types/` (preferiblemente `types/index.ts`)
   - ❌ NO deben estar dispersos en la raiz
   - **Accion**: Mover a `types/` y consolidar en `index.ts` si es posible

4. **Utilidades** (funciones helper, formatters, etc.):

   - ✅ Deben estar en `utils/`
   - ❌ NO deben estar en la raiz o mezclados con componentes
   - **Accion**: Mover a `utils/`

5. **Server Actions** (archivos con `'use server'`):

   - ✅ Deben estar en `actions/` o en la raiz como `actionsServer.ts`
   - ❌ NO deben estar en `components/` o `utils/`
   - **Accion**: Mover a `actions/` o renombrar a `actionsServer.ts`

6. **Fetching del Cliente** (hooks con `useQuery`):
   - ✅ Deben estar en `hooks/` como `use{FeatureName}.ts`
   - ✅ Deben usar `useQuery` de React Query
   - ✅ Deben llamar a server actions (NO usar `supabaseBrowser()` directamente)
   - ❌ NO deben estar en la raiz, `components/` o `actions/`
   - ❌ NO deben usar `useEffect` + `useState` para fetching
   - **Accion**: Crear hook en `hooks/` que use `useQuery` con server actions

#### Proceso de Reorganizacion

Cuando detectes archivos mal organizados:

1. **Identificar** todos los archivos que no siguen la estructura
2. **Crear** las carpetas necesarias (`components/`, `hooks/`, `types/`, `utils/`, `actions/`)
3. **Mover** los archivos a su ubicacion correcta
4. **Actualizar** todas las importaciones en los archivos afectados
5. **Verificar** que no se rompan las referencias

#### Ejemplo de Reorganizacion

```typescript
// ❌ ANTES - Estructura incorrecta
features/Employees/
├── EmployeeCard.tsx          // ❌ Componente en raiz
├── useEmployees.ts          // ❌ Hook en raiz
├── employeeTypes.ts         // ❌ Types en raiz
├── formatEmployee.ts        // ❌ Utilidad en raiz
└── getEmployees.ts          // ❌ Server action en raiz

// ✅ DESPUES - Estructura correcta
features/Employees/
├── components/
│   └── EmployeeCard.tsx     // ✅ Componente en components/
├── hooks/
│   └── useEmployees.ts      // ✅ Hook con useQuery en hooks/
├── types/
│   └── index.ts             // ✅ Types consolidados
├── utils/
│   └── formatEmployee.ts    // ✅ Utilidad en utils/
└── actions/
    └── actionsServer.ts     // ✅ Server action en actions/
```

**Regla de Oro**: Si estas trabajando en una feature y ves archivos fuera de lugar, reorganizalos ANTES de continuar con el trabajo. No dejes archivos mal organizados.

---

## Server Components First (Prioridad)

### Principio Fundamental

**SIEMPRE priorizar Server Components. El fetching DEBE estar del lado del servidor cuando sea posible.**

Solo usar Client Components (`'use client'`) para:

- Interactividad (onClick, onChange, etc.)
- Hooks de React (useState, useEffect, etc.)
- Context API
- React Query en el cliente (cuando no se puede hacer en servidor)

### Server Component por Defecto

```typescript
// ✅ Server Component (NO necesita 'use client')
import { getAllEmployees } from '@/app/server/GET/actions';

export default async function EmployeesPage() {
  // ✅ Fetching en el servidor
  const employees = await getAllEmployees();

  return (
    <div>
      <h1>Empleados</h1>
      <EmployeesTable data={employees} />
    </div>
  );
}

// ❌ INCORRECTO - Client Component innecesario
'use client';

import { useEffect, useState } from 'react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getAllEmployees().then(setEmployees); // ❌ Fetching en cliente innecesario
  }, []);

  return <EmployeesTable data={employees} />;
}
```

### Datos Iniciales del Servidor

```typescript
// Server Component
export default async function EmployeesPage({ searchParams }) {
  // ✅ Cargar datos iniciales en servidor
  const initialData = await getAllEmployees();

  return <EmployeesTableClient initialData={initialData} />;
}

// Client Component (solo para interactividad)
'use client';

export function EmployeesTableClient({ initialData }) {
  const { data } = useQuery({
    queryKey: ['employees'],
    queryFn: getAllEmployees,
    initialData, // ✅ Datos iniciales del servidor
  });

  return <EmployeesTable data={data} />;
}
```

### Cuando Usar Client Components

#### 1. Interactividad

```typescript
'use client';

export function ButtonWithAction() {
  const handleClick = () => {
    // ✅ Interactividad requiere 'use client'
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

#### 2. Estado Local (useState)

```typescript
'use client';

export function FormComponent() {
  const [value, setValue] = useState(''); // ✅ Estado local requiere 'use client'

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

#### 3. React Query para Refetching/Invalidacion

```typescript
'use client';

export function EmployeesTableClient({ initialData }) {
  // ✅ React Query para refetching y invalidacion
  const { data } = useQuery({
    queryKey: ['employees'],
    queryFn: getAllEmployees,
    initialData,
  });

  // ✅ Mutaciones requieren 'use client'
  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  return <EmployeesTable data={data} onAdd={mutation.mutate} />;
}
```

#### 4. Context API

```typescript
'use client';

const ThemeContext = createContext(); // ✅ Context requiere 'use client'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Patron Hibrido Recomendado

```typescript
// ✅ Server Component - Fetching y estructura
export default async function EmployeesPage({ searchParams }) {
  // ✅ Fetching en servidor
  const initialEmployees = await getAllEmployees();
  const filters = parseSearchParams(searchParams);

  return (
    <div>
      <h1>Empleados</h1>
      {/* ✅ Client Component solo para interactividad */}
      <EmployeesTableClient
        initialData={initialEmployees}
        filters={filters}
      />
    </div>
  );
}

// ✅ Client Component - Solo interactividad
'use client';

export function EmployeesTableClient({ initialData, filters }) {
  // ✅ React Query para refetching con filtros
  const { data } = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => getFilteredEmployees(filters),
    initialData,
  });

  const [selectedRows, setSelectedRows] = useState([]); // ✅ Estado local

  return (
    <EmployeesTable
      data={data}
      selectedRows={selectedRows}
      onSelectRows={setSelectedRows} // ✅ Interactividad
    />
  );
}
```

---

## Fetching con React Query

### Principio Fundamental

**TODOS los fetching del lado del cliente DEBEN usar `useQuery` de `@tanstack/react-query`.**

**NUNCA** usar `useEffect` + `useState` para fetching de datos.

### Patron Correcto

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllEmployees } from '@/app/server/GET/actions';

function EmployeesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getAllEmployees(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return <EmployeesTable data={data} />;
}

// ❌ INCORRECTO - useEffect + useState
function EmployeesList() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllEmployees()
      .then(setEmployees)
      .finally(() => setIsLoading(false));
  }, []);

  // ... resto del codigo
}
```

### Query con Parametros

```typescript
function EmployeesTable({ filters }: { filters: FilterState }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employees', filters], // ✅ Incluir filtros en queryKey
    queryFn: () => getFilteredEmployees(filters),
    staleTime: 5 * 60 * 1000,
  });

  // ... renderizado
}
```

### Query Dependiente

```typescript
function EmployeeDocuments({ employeeId }: { employeeId: string }) {
  const { data: employee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployeeById(employeeId),
  });

  // ✅ Query que depende de otra
  const { data: documents } = useQuery({
    queryKey: ['documents', employeeId, employee?.company_id],
    queryFn: () => getDocuments(employeeId, employee.company_id),
    enabled: !!employee?.company_id, // Solo ejecutar cuando employee este cargado
  });

  // ... renderizado
}
```

### Invalidacion de Queries

Siempre invalidar queries despues de mutaciones:

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployee } from '@/app/server/POST/actions';

function EmployeeForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      // ✅ Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
    },
  });

  return <form onSubmit={(e) => mutation.mutate(formData)}>...</form>;
}
```

### Custom Hooks para Queries

```typescript
// hooks/useEmployees.ts
import { useQuery } from '@tanstack/react-query';
import { getAllEmployees } from '@/app/server/GET/actions';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => getAllEmployees(),
    staleTime: 5 * 60 * 1000,
  });
}

// Uso en componente
function EmployeesList() {
  const { data: employees, isLoading } = useEmployees();
  // ... renderizado
}
```

### Opciones Importantes de useQuery

```typescript
useQuery({
  queryKey: ['employees'],
  queryFn: getAllEmployees,
  staleTime: 5 * 60 * 1000, // Tiempo que los datos se consideran frescos
  enabled: !!id, // Controlar cuando se ejecuta la query
  refetchOnWindowFocus: false, // No refetchear al volver foco
});
```

### Server Actions como Query Functions

```typescript
// ✅ CORRECTO
useQuery({
  queryKey: ['employees'],
  queryFn: () => getAllEmployees(), // Server action
});

// ❌ INCORRECTO - No usar supabaseBrowser directamente
useQuery({
  queryKey: ['employees'],
  queryFn: async () => {
    const supabase = await supabaseBrowser();
    return supabase.from('employees').select('*'); // ❌ Debe ser server action
  },
});
```

---

## Suspense y Loading States

### Principio Fundamental

**Usar `Suspense` para Server Components y `isLoading` de `useQuery` para Client Components.**

| Tipo de Componente | Solucion de Loading                  |
| ------------------ | ------------------------------------ |
| Server Component   | `<Suspense fallback={<Skeleton />}>` |
| Client Component   | `isLoading` from `useQuery`          |

### Server Components - Usar Suspense

```typescript
import { Suspense } from 'react';
import { TabsManagerServer } from '@/features/TabsManager';

export default async function DocumentPage({ searchParams }) {
  return (
    <TabsManagerServer
      tabs={[
        {
          value: 'tipos',
          label: 'Tipos',
          content: (
            <Suspense fallback={<div>Cargando tipos de documentos...</div>}>
              <TiposDocumentosTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
```

### Aislar Suspense por Componente

```typescript
// ❌ INCORRECTO - Bloquea toda la UI
export default async function Page() {
  const data = await fetchAllData(); // ❌ Bloquea toda la pagina

  return (
    <Suspense fallback={<Loader />}>
      <Component1 data={data} />
      <Component2 data={data} />
    </Suspense>
  );
}

// ✅ CORRECTO - Carga aislada por componente
export default async function Page() {
  return (
    <div>
      <Suspense fallback={<Component1Skeleton />}>
        <Component1Content /> {/* Carga sus propios datos */}
      </Suspense>
      <Suspense fallback={<Component2Skeleton />}>
        <Component2Content /> {/* Carga sus propios datos */}
      </Suspense>
    </div>
  );
}
```

### Client Components - Usar isLoading de useQuery

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

export function EmployeesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getAllEmployees(),
  });

  // ✅ Usar isLoading de useQuery
  if (isLoading) {
    return <EmployeesTableSkeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return <EmployeesTable data={data} />;
}

// ❌ INCORRECTO - No usar Suspense en Client Components
'use client';

export function EmployeesList() {
  return (
    <Suspense fallback={<Skeleton />}>
      <EmployeesContent /> {/* ❌ useQuery maneja loading */}
    </Suspense>
  );
}
```

### Loading States Condicionales

```typescript
'use client';

export function EmployeeDetail({ employeeId }: { employeeId: string }) {
  const { data: employee, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployeeById(employeeId),
  });

  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['documents', employeeId],
    queryFn: () => getEmployeeDocuments(employeeId),
    enabled: !!employeeId,
  });

  // ✅ Manejar multiples loading states
  if (isLoadingEmployee) {
    return <EmployeeSkeleton />;
  }

  return (
    <div>
      <EmployeeInfo data={employee} />
      {isLoadingDocuments ? (
        <DocumentsSkeleton />
      ) : (
        <DocumentsList data={documents} />
      )}
    </div>
  );
}
```

### Patron Hibrido: Server + Client

```typescript
// Server Component (page.tsx)
export default async function EmployeesPage({ searchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EmployeesPageContent searchParams={searchParams} />
    </Suspense>
  );
}

// Server Component (content)
async function EmployeesPageContent({ searchParams }) {
  const initialData = await getEmployeesInitialData();

  return (
    <EmployeesTableWrapper initialData={initialData} searchParams={searchParams} />
  );
}

// Client Component (wrapper)
'use client';

export function EmployeesTableWrapper({ initialData, searchParams }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employees', searchParams],
    queryFn: () => getFilteredEmployees(searchParams),
    initialData, // ✅ Datos iniciales del servidor
  });

  // ✅ isLoading maneja refetching
  if (isLoading && !data) {
    return <TableSkeleton />;
  }

  return <EmployeesTable data={data} />;
}
```

---

## TabContent y Componentes de Tabs

### Principio Fundamental

**Los componentes `TabContent` NO deben tener `'use client'` si solo sirven como wrapper. El `'use client'` debe estar en el componente interno que realmente necesita interactividad.**

### Reglas de TabContent

#### 1. TabContent como Server Component

```typescript
// ✅ CORRECTO - TabContent es Server Component
// SolicitudesMantenimientoTabContent.tsx
import { getMaintenanceRequests } from './actions/actionsServer';
import { SolicitudesTableClient } from './components/SolicitudesTableClient';

export async function SolicitudesMantenimientoTabContent() {
  // ✅ Fetching en el servidor
  const initialData = await getMaintenanceRequests();

  return <SolicitudesTableClient initialData={initialData} />;
}

// ❌ INCORRECTO - TabContent con 'use client' innecesario
'use client';

export function SolicitudesMantenimientoTabContent() {
  return <SolicitudesTable />; // ❌ Solo es un wrapper, no necesita 'use client'
}
```

#### 2. Fetching SIEMPRE en el Server (cuando sea posible)

**REGLA CRITICA**: Si el fetching de datos NO depende de interaccion del usuario (clicks, filtros dinamicos), DEBE hacerse en el servidor.

```typescript
// ✅ CORRECTO - Datos cargados en Server Component
export async function MyTabContent() {
  const data = await getMyData(); // Server-side fetch
  return <MyTableClient initialData={data} />;
}

// ❌ INCORRECTO - Fetching en cliente sin necesidad
'use client';

export function MyTabContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-data'],
    queryFn: getMyData, // ❌ Esto podria estar en el servidor
  });

  if (isLoading) return <Skeleton />;
  return <MyTable data={data} />;
}
```

#### 3. Cliente Solo para Interactividad

El Client Component interno debe:

- Recibir `initialData` del servidor
- Usar `useQuery` con `initialData` para refetching/invalidacion
- Manejar estado local (seleccion, dialogos, etc.)

```typescript
// ✅ Client Component que recibe datos iniciales
'use client';

export function MyTableClient({ initialData }: { initialData: MyData[] }) {
  const [selectedItem, setSelectedItem] = useState<MyData | null>(null);

  // ✅ useQuery con initialData para refetching
  const { data } = useQuery({
    queryKey: ['my-data'],
    queryFn: getMyData,
    initialData, // ✅ Datos del servidor
  });

  return (
    <>
      <DataTable data={data || []} onSelect={setSelectedItem} />
      {selectedItem && <DetailDialog item={selectedItem} />}
    </>
  );
}
```

### Componentes Fallback para Suspense

#### Regla: Crear Componentes Fallback Dedicados

**NUNCA** usar `<div>Cargando...</div>` como fallback en `Suspense`. SIEMPRE crear un componente Skeleton dedicado.

```typescript
// ❌ INCORRECTO - Fallback generico
<Suspense fallback={<div>Cargando solicitudes...</div>}>
  <SolicitudesTabContent />
</Suspense>

// ✅ CORRECTO - Componente Skeleton dedicado
<Suspense fallback={<SolicitudesTableSkeleton />}>
  <SolicitudesTabContent />
</Suspense>
```

#### Ubicacion de Fallbacks

Los componentes Skeleton/Fallback deben ubicarse en:

```
src/features/{Feature}/
├── fallback/
│   ├── {ComponentName}Skeleton.tsx
│
```

#### Ejemplo de Componente Skeleton

```typescript
// src/features/Mantenimiento/SolicitudesMantenimiento/fallback/SolicitudesTableSkeleton.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SolicitudesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes de Mantenimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Checklist: Crear Nueva Tab

- [ ] Crear `{Tab}TabContent.tsx` como **Server Component** (sin `'use client'`)
- [ ] Hacer fetching de datos iniciales en el Server Component
- [ ] Crear `{Component}Client.tsx` con `'use client'` para interactividad
- [ ] Pasar `initialData` como prop al componente cliente
- [ ] Crear `fallback/{Component}Skeleton.tsx` para el Suspense
- [ ] Usar el Skeleton en el `Suspense fallback` donde se renderiza la tab

---

## Sistema de Permisos y Tabs

### Principio Fundamental

**Todo elemento de interaccion (botones de Crear, Editar, Eliminar) debe estar protegido por permisos.**

### Arquitectura del Sistema

#### Tablas de Base de Datos

- **`modules`**: Modulos principales (Dashboard, Empresa, Empleados, Equipos, etc.)
- **`tabs`**: Tabs/subtabs dentro de cada modulo (con `parent_tab_id` para jerarquia)
- **`actions`**: Acciones CRUD (`view`, `create`, `update`, `delete`)
- **`roles`**: Roles del sistema
- **`role_permissions`**: Permisos por rol (`role_id` + `tab_id` + `action_id`)
- **`user_permissions`**: Permisos personalizados por usuario (override)

#### Archivos Clave

- **`src/features/Permissions/permissions-map.ts`**: Mapa de modulos/tabs/subtabs con `allowedActions`
- **`src/features/Permissions/components/PermissionGuard.tsx`**: Componente para proteger elementos
- **`src/features/Permissions/hooks/usePermissions.ts`**: Hook para verificar permisos

### Proteger Elementos con Permisos

#### Usando PermissionGuard (recomendado para ocultar elementos)

```tsx
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';

// Boton de crear
<PermissionGuard module="modulo" tab="tab_slug" action="create">
  <Button>Crear</Button>
</PermissionGuard>

// Boton de editar
<PermissionGuard module="modulo" tab="tab_slug" action="update">
  <Button>Editar</Button>
</PermissionGuard>

// Boton de eliminar
<PermissionGuard module="modulo" tab="tab_slug" action="delete">
  <Button>Eliminar</Button>
</PermissionGuard>
```

#### Usando usePermissions (para logica condicional)

```tsx
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, canCreate, canUpdate, canDelete } = usePermissions();

  // Verificacion especifica
  const canCreateItem = hasPermission('modulo', 'tab_slug', 'create');
  const canEditItem = hasPermission('modulo', 'tab_slug', 'update');

  // En columnas de tabla
  if (canEditItem) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => <Button>Editar</Button>,
    });
  }
}
```

### Deteccion Automatica de Botones Sin Proteger

**IMPORTANTE**: Al encontrar botones de **Crear**, **Editar** o **Eliminar** que NO tienen `PermissionGuard` o verificacion con `usePermissions`:

1. **PREGUNTAR** al usuario si debe protegerse
2. **ANALIZAR** el contexto para identificar:
   - ¿A que modulo pertenece?
   - ¿A que tab/subtab pertenece?
   - ¿Que accion representa? (create, update, delete)
3. **PROPONER** la solucion:
   - Agregar `PermissionGuard` o `hasPermission`
   - Verificar si la tab existe en `permissions-map.ts`
   - Verificar si la tab existe en la BD

#### Ejemplo de Analisis

```
🔍 DETECTADO: Boton "Crear Nuevo" en ComponenteX sin proteccion de permisos

📍 Ubicacion: src/features/Modulo/ComponenteX.tsx
📋 Contexto: Tab "mi_tab" del modulo "mi_modulo"
🎯 Accion: create

💡 PROPUESTA:
1. Envolver con PermissionGuard:
   <PermissionGuard module="mi_modulo" tab="mi_tab" action="create">
     <Button>Crear Nuevo</Button>
   </PermissionGuard>

2. Verificar en permissions-map.ts que "mi_tab" tenga 'create' en allowedActions
3. Verificar en BD que la tab exista

¿Debo aplicar esta proteccion?
```

### Checklist: Agregar Nueva Tab

#### 1. Codigo Frontend

- [ ] Crear componente de la nueva tab
- [ ] Agregarlo al componente padre (TabsManagerServer/Client)
- [ ] Identificar botones/acciones que necesitan proteccion

#### 2. Actualizar `permissions-map.ts`

```typescript
nueva_tab: {
  slug: 'nueva_tab',
  name: 'Nueva Tab',
  tabId: 'UUID-GENERADO', // Generar UUID unico
  parent: 'tab_padre', // null si es tab principal
  allowedActions: ['view', 'create', 'update'], // Segun funcionalidad
  subtabs: {}, // Si tiene subtabs
}
```

#### 3. Insertar en Base de Datos (usar MCP de Supabase)

```sql
-- 1. Insertar la tab
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('UUID-GENERADO', 'MODULE_ID', 'nueva_tab', 'Nueva Tab', 'Descripcion', ORDER_INDEX, 'PARENT_TAB_ID')
ON CONFLICT (id) DO NOTHING;

-- 2. (Opcional) Agregar permisos a roles existentes si es necesario
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, 'TAB_ID', a.id
FROM roles r, actions a
WHERE r.slug = 'admin' AND a.slug IN ('view', 'create', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

#### 4. Documentar SQL Ejecutado

**IMPORTANTE**: Despues de ejecutar SQL en desarrollo con el MCP, documentar en `docs/desarrollo/03-notas-desarrollo.md`:

```markdown
## [FECHA] - Tab: Nueva Tab

### SQL para replicar en produccion:

\`\`\`sql
-- Insertar tab
INSERT INTO tabs ...

-- Permisos (si aplica)
INSERT INTO role_permissions ...
\`\`\`
```

### IDs de Modulos (Referencia)

```typescript
const MODULE_IDS = {
  dashboard: '91ed9ae4-6713-41ac-a87e-6b156e079948',
  empresa: 'e0478383-1287-4b5e-a727-985baf867173',
  empleados: '3c54a757-162c-4afc-8ea5-dca462f92e0c',
  equipos: '34d7f9e5-7c01-4def-9446-6b3f52d761a0',
  operaciones: '5563157e-fc3e-470f-b90b-dadd7cc38417',
  formularios: '6674268f-0d4f-581f-c91c-ebbe8dd49528',
  ayuda: '7785379f-1e5f-692f-da2d-fccf9ee5af39',
  documentacion: '4783f7df-3580-4f54-bf8f-6ef7f252d038',
  mantenimiento: '421e96da-5235-4857-bf81-e63336447f13',
  comercial: '92bfac14-dc5b-41be-b366-740bfbeaea13',
};
```

---

## DataTable Server-Side con Supabase

### Cuando Usar Esta Guia

Esta documentacion aplica cuando:

- Estes **creando una nueva tabla** con paginacion server-side
- Estes **modificando columnas** de una tabla existente
- Estes **agregando filtros** a una tabla
- Estes **configurando relaciones** de Supabase en columnas
- Estes trabajando con `BaseDataTable` o `fetchData` functions

### Arquitectura General

```
{Feature}Table.tsx (Server Component)
    ↓ Carga inicial SSR
{Feature}TableClient.tsx (Client Component)
    ↓ Props y configuracion
BaseDataTable (Componente reutilizable)
```

### Estructura de Archivos

```
src/features/{Feature}/
├── {Feature}Table.tsx              # Server Component (entry point)
├── components/
│   └── {Feature}TableClient.tsx    # Client Component con columnas
└── ...

src/app/server/GET/
└── probando.ts                     # Funciones de fetching genericas
```

### Server Component (Entry Point)

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

### Funcion de Fetching

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

### Sintaxis de Query de Supabase

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

### Definicion de Columnas

#### Regla Critica: accessorKey = id

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

#### Columnas Directas (tabla principal)

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

#### Columnas con Relacion Simple (FK)

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

#### Columnas con Relacion Many-to-Many

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

#### Columnas con Formato de Fecha

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

#### Columnas con Badge de Estado

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

### Sistema de Filtros

#### Filtros Simples (columnas directas con ENUM)

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

#### Filtros con Relacion Simple

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

#### Filtros con Multi-Join (Many-to-Many)

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

### Configuracion del BaseDataTable

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

### Mapeo de Relaciones DB → Columnas

| Columna en DB           | FK apunta a            | Query Supabase               | accessorKey/id           | Acceso en cell                         |
| ----------------------- | ---------------------- | ---------------------------- | ------------------------ | -------------------------------------- |
| `province`              | `provinces.id`         | `provinces(id,name)`         | `provinces.name`         | `row.original.provinces?.name`         |
| `city`                  | `cities.id`            | `cities(id,name)`            | `city`                   | `row.original.cities?.name`            |
| `hierarchical_position` | `hierarchy.id`         | `hierarchy(id,name)`         | `hierarchy.name`         | `row.original.hierarchy?.name`         |
| `company_position`      | `company_positions.id` | `company_positions(id,name)` | `company_positions.name` | `row.original.company_positions?.name` |
| `type_of_contract`      | `types_of_contract.id` | `types_of_contract(id,name)` | `types_of_contract.name` | `row.original.types_of_contract?.name` |

### Relaciones Inversas (Many-to-Many)

| Tabla Pivot           | Relacion                                              | Query                                            | accessorKey/id                                 |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `contractor_employee` | `employees ← contractor_employee → customers`         | `contractor_employee(customers(id,name))`        | `contractor_employee.customers.name`           |
| `empleado_aptitudes`  | `employees ← empleado_aptitudes → aptitudes_tecnicas` | `empleado_aptitudes(aptitudes_tecnicas(nombre))` | `empleado_aptitudes.aptitudes_tecnicas.nombre` |

### Flujo de Datos Completo

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

### Errores Comunes en DataTable

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

---

## Checklists

### Feature Checklist

Cuando crees una nueva feature:

- [ ] Crear carpeta en `src/features/{FeatureName}/`
- [ ] Pages en `app/` solo importan desde `features/`
- [ ] Server actions en `actions/` o `actionsServer.ts`
- [ ] Custom hooks usando `useQuery` en `hooks/`
- [ ] Agregar a `permissions-map.ts` si tiene tabs
- [ ] Proteger botones de accion con `PermissionGuard`
- [ ] Usar `logger` en lugar de `console.*`
- [ ] Tipos inferidos con `Awaited<ReturnType<>>`

### Tab Checklist

Cuando agregues una nueva tab:

- [ ] Crear componente en `features/{Module}/{TabName}/`
- [ ] Actualizar `permissions-map.ts` con la nueva tab
- [ ] Insertar en BD (documentar SQL en `docs/desarrollo/03-notas-desarrollo.md`)
- [ ] Agregar permisos para roles si es necesario
- [ ] Proteger botones con PermissionGuard

### DataTable Checklist

Cuando crees una nueva tabla:

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

### React Query Checklist

- [ ] Usar `useQuery` para todo fetching del lado del cliente
- [ ] NO usar `useEffect` + `useState` para fetching
- [ ] Incluir todas las dependencias en `queryKey` (filtros, parametros, etc.)
- [ ] Invalidar queries despues de mutaciones
- [ ] Usar `enabled` para queries condicionales
- [ ] Configurar `staleTime` apropiado segun el caso
- [ ] Usar server actions en `queryFn`, no llamadas directas a Supabase
- [ ] Crear custom hooks para queries reutilizables

### Loading States Checklist

- [ ] Server Components: Usar `Suspense` con fallback
- [ ] Client Components: Usar `isLoading` de `useQuery`
- [ ] NO usar `Suspense` en Client Components
- [ ] Aislar carga de datos por componente/tab
- [ ] Crear componentes Skeleton especificos
- [ ] Manejar multiples loading states apropiadamente
- [ ] Pasar `initialData` cuando hay datos del servidor

### Server Actions Checklist

- [ ] Usar `'use server'` en la parte superior del archivo
- [ ] Importar `supabaseServer()` (no `supabaseBrowser()`)
- [ ] Usar nomenclatura `metodoFiltroEntidad`
- [ ] Manejar errores apropiadamente
- [ ] Exportar tipos usando `Awaited<ReturnType<typeof function>>`
- [ ] NO crear rutas API (`/api/*`)

### Logger Checklist

- [ ] Usar `logger` de `@/lib/logger` en lugar de `console.*`
- [ ] Usar nivel apropiado: `debug`, `info`, `warn`, `error`
- [ ] Agregar datos adicionales con `meta.data` cuando sea util
- [ ] Usar scope especifico para mejor organizacion
- [ ] Agrupar logs relacionados con `logger.group()`
- [ ] NO usar `console.log`, `console.error`, `console.warn`, etc.

---

## Referencias

### Archivos Clave

- `src/features/Permissions/permissions-map.ts` - Mapa completo de permisos
- `src/features/Permissions/components/PermissionGuard.tsx` - Componente para proteger elementos
- `src/features/Permissions/hooks/usePermissions.ts` - Hook para verificar permisos
- `src/lib/logger.ts` - Implementacion del logger
- `src/shared/components/data-table/base/data-table-server.tsx` - Componente base de DataTable
- `src/app/server/GET/probando.ts` - Funciones de fetching genericas

### Documentacion

- `docs/desarrollo/03-notas-desarrollo.md` - Notas de desarrollo y SQL ejecutado
- `docs/componentes/TabsManager.md` - Gestion de Suspense en tabs
