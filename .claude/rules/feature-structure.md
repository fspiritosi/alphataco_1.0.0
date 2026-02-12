# Estructura de Features

## Principio Fundamental

**Toda la logica de negocio, componentes relacionados y acciones deben ubicarse en `src/features/`, NO en `src/app/`.**

Las paginas en `app/` deben ser delgadas y solo importar componentes desde `features/`.

## Estructura Estandar de una Feature

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

## Jerarquia de Tabs Reflejada en Carpetas

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

## Separacion de Responsabilidades

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

## Reorganizacion Automatica de Archivos

**IMPORTANTE**: Cuando trabajes en una feature, SIEMPRE verifica que los archivos esten correctamente organizados segun esta estructura. Si detectas archivos mal ubicados, muevelos inmediatamente.

### Reglas de Reorganizacion

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

### Proceso de Reorganizacion

Cuando detectes archivos mal organizados:

1. **Identificar** todos los archivos que no siguen la estructura
2. **Crear** las carpetas necesarias (`components/`, `hooks/`, `types/`, `utils/`, `actions/`)
3. **Mover** los archivos a su ubicacion correcta
4. **Actualizar** todas las importaciones en los archivos afectados
5. **Verificar** que no se rompan las referencias

### Ejemplo de Reorganizacion

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
