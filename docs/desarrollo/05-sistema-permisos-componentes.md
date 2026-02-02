# Sistema de Permisos - Componentes de Ocultación

## 📋 Índice

1. [Introducción](#introducción)
2. [Mapa de Permisos](#mapa-de-permisos)
3. [Componentes](#componentes)
4. [Ejemplos de Uso](#ejemplos-de-uso)
5. [Patrones Comunes](#patrones-comunes)
6. [API Reference](#api-reference)
7. [Agregar Nuevos Módulos](#agregar-nuevos-módulos)

---

## Introducción

Este sistema permite ocultar elementos de la UI basándose en los permisos del usuario. Utiliza un mapa de permisos con tipado fuerte para proporcionar autocompletado inteligente en TypeScript.

### Características

- ✅ **Tipado fuerte**: Autocompletado de módulos, tabs y acciones
- ✅ **Client-side**: Componente con caché de 1 minuto (TanStack Query)
- ✅ **Server-side**: Componente async para Server Components
- ✅ **Performance**: Caché optimizado para navegación rápida
- ✅ **Seguridad**: Verificación en servidor y cliente

---

## Mapa de Permisos

### Estructura

El mapa de permisos está definido en `src/features/Permissions/permissions-map.ts` y contiene:

```typescript
export const PERMISSIONS = {
  empleados: {
    slug: 'empleados',
    name: 'Empleados',
    moduleId: '3c54a757-162c-4afc-8ea5-dca462f92e0c',
    tabs: {
      'documentos-de-empleados': {
        slug: 'documentos-de-empleados',
        name: 'Documentos de Empleados',
        tabId: '20000000-0000-0000-0000-000000000002',
        parent: null,
        subtabs: {
          'docs-empleados-permanentes': {
            slug: 'docs-empleados-permanentes',
            name: 'Permanentes',
            tabId: '20000000-0000-0000-0000-000000000021',
            parent: 'documentos-de-empleados',
          },
          'docs-empleados-mensuales': {
            slug: 'docs-empleados-mensuales',
            name: 'Mensuales',
            tabId: '20000000-0000-0000-0000-000000000022',
            parent: 'documentos-de-empleados',
          },
        },
      },
    },
  },
  // ... otros módulos
} as const;
```

### Módulos Disponibles

1. **dashboard** - Panel principal
2. **empresa** - Gestión de empresa
3. **empleados** - Gestión de empleados
4. **equipos** - Gestión de equipos
5. **comercial** - Gestión comercial
6. **documentacion** - Gestión de documentos
7. **mantenimiento** - Gestión de mantenimiento
8. **operaciones** - Operaciones diarias
9. **formularios** - Formularios personalizados
10. **ayuda** - Centro de ayuda

### Acciones Disponibles

```typescript
export const ACTIONS = {
  view: { slug: 'view', name: 'Ver' },
  create: { slug: 'create', name: 'Crear' },
  update: { slug: 'update', name: 'Editar' },
  delete: { slug: 'delete', name: 'Eliminar' },
} as const;
```

---

## Componentes

### 1. PermissionGuard (Client Component)

Componente para Client Components que usa TanStack Query con caché de 1 minuto.

**Archivo:** `src/features/Permissions/components/PermissionGuard.tsx`

**Características:**

- ✅ Caché de 1 minuto (navegación rápida)
- ✅ Interactivo (reacciona a cambios)
- ✅ Loading states opcionales
- ❌ Flash de contenido mientras carga
- ❌ No es SEO friendly

**Props:**

```typescript
interface PermissionGuardProps {
  module: ModuleSlug; // Slug del módulo
  tab: TabSlug | SubtabSlug; // Slug del tab o subtab
  action: ActionSlug; // 'view' | 'create' | 'update' | 'delete'
  children: ReactNode; // Contenido a proteger
  fallback?: ReactNode; // Contenido alternativo (opcional)
  showLoading?: boolean; // Mostrar skeleton mientras carga (opcional)
}
```

**Ejemplo básico:**

```tsx
'use client';

import { PermissionGuard } from '@/features/Permissions';

export function MyComponent() {
  return (
    <PermissionGuard module="empleados" tab="employees" action="create">
      <Button>Crear Empleado</Button>
    </PermissionGuard>
  );
}
```

---

### 2. PermissionGuardServer (Server Component)

Componente async para Server Components que consulta directamente la BD.

**Archivo:** `src/features/Permissions/components/PermissionGuardServer.tsx`

**Características:**

- ✅ No hay flash de contenido
- ✅ SEO friendly
- ✅ Seguridad: contenido nunca llega al cliente
- ❌ No es interactivo
- ❌ Requiere re-render del servidor

**Props:**

```typescript
interface PermissionGuardServerProps {
  module: ModuleSlug; // Slug del módulo
  tab: TabSlug | SubtabSlug; // Slug del tab o subtab
  action: ActionSlug; // 'view' | 'create' | 'update' | 'delete'
  children: ReactNode; // Contenido a proteger
  fallback?: ReactNode; // Contenido alternativo (opcional)
}
```

**Ejemplo básico:**

```tsx
import { PermissionGuardServer } from '@/features/Permissions';

export default async function MyPage() {
  return (
    <PermissionGuardServer module="empleados" tab="employees" action="view">
      <EmployeesList />
    </PermissionGuardServer>
  );
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Ocultar Botón de Crear

```tsx
'use client';

import { PermissionGuard } from '@/features/Permissions';
import { Button } from '@/components/ui/button';

export function EmployeesHeader() {
  return (
    <div className="flex justify-between items-center">
      <h1>Empleados</h1>

      {/* Botón solo visible si tiene permiso de crear */}
      <PermissionGuard module="empleados" tab="employees" action="create">
        <Button>Crear Empleado</Button>
      </PermissionGuard>
    </div>
  );
}
```

---

### Ejemplo 2: Ocultar Tab Completa (Mensuales vs Permanentes)

```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard } from '@/features/Permissions';

export function DocumentosEmpleadosPage() {
  return (
    <Tabs defaultValue="permanentes">
      <TabsList>
        {/* Tab Permanentes */}
        <PermissionGuard module="empleados" tab="docs-empleados-permanentes" action="view">
          <TabsTrigger value="permanentes">Permanentes</TabsTrigger>
        </PermissionGuard>

        {/* Tab Mensuales - Solo visible si tiene permiso */}
        <PermissionGuard module="empleados" tab="docs-empleados-mensuales" action="view">
          <TabsTrigger value="mensuales">Mensuales</TabsTrigger>
        </PermissionGuard>
      </TabsList>

      {/* Contenido de Permanentes */}
      <PermissionGuard module="empleados" tab="docs-empleados-permanentes" action="view">
        <TabsContent value="permanentes">
          <PermanentDocuments />
        </TabsContent>
      </PermissionGuard>

      {/* Contenido de Mensuales */}
      <PermissionGuard module="empleados" tab="docs-empleados-mensuales" action="view">
        <TabsContent value="mensuales">
          <MonthlyDocuments />
        </TabsContent>
      </PermissionGuard>
    </Tabs>
  );
}
```

---

### Ejemplo 3: Acciones en Tabla (Editar/Eliminar)

```tsx
'use client';

import { PermissionGuard } from '@/features/Permissions';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';

export function EmployeesTable() {
  const columns = [
    // ... otras columnas
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {/* Botón Editar */}
          <PermissionGuard module="empleados" tab="employees" action="update">
            <Button size="sm" variant="outline">
              Editar
            </Button>
          </PermissionGuard>

          {/* Botón Eliminar */}
          <PermissionGuard module="empleados" tab="employees" action="delete">
            <Button size="sm" variant="destructive">
              Eliminar
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={employees} />;
}
```

---

### Ejemplo 4: Mensaje Alternativo (Fallback)

```tsx
'use client';

import { PermissionGuard } from '@/features/Permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function DocumentosSection() {
  return (
    <PermissionGuard
      module="empleados"
      tab="docs-empleados-mensuales"
      action="view"
      fallback={
        <Alert variant="destructive">
          <AlertDescription>
            No tienes permiso para ver documentos mensuales. Contacta al administrador.
          </AlertDescription>
        </Alert>
      }
    >
      <MonthlyDocuments />
    </PermissionGuard>
  );
}
```

---

### Ejemplo 5: Loading State

```tsx
'use client';

import { PermissionGuard } from '@/features/Permissions';

export function EmployeesPage() {
  return (
    <PermissionGuard
      module="empleados"
      tab="employees"
      action="view"
      showLoading={true} // ← Muestra skeleton mientras carga
    >
      <EmployeesList />
    </PermissionGuard>
  );
}
```

---

### Ejemplo 6: Server Component (SEO Friendly)

```tsx
import { PermissionGuardServer } from '@/features/Permissions';

export default async function EmployeesPage() {
  return (
    <div>
      <h1>Empleados</h1>

      {/* Renderizado en servidor - No hay flash */}
      <PermissionGuardServer
        module="empleados"
        tab="employees"
        action="view"
        fallback={<p>No tienes acceso a esta sección</p>}
      >
        <EmployeesList />
      </PermissionGuardServer>
    </div>
  );
}
```

---

### Ejemplo 7: Proteger Server Action

```tsx
'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function deleteEmployee(employeeId: string) {
  // Proceder con la eliminación
  const supabase = await supabaseServer();
  const { error } = await supabase.from('employees').delete().eq('id', employeeId);

  if (error) throw error;

  return { success: true };
}
```

---

### Ejemplo 8: Verificación Programática

```tsx
'use client';

import { usePermissions } from '@/features/Permissions';
import { useToast } from '@/components/ui/use-toast';

export function EmployeeActions({ employeeId }: { employeeId: string }) {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const handleDelete = async () => {
    // Verificar permiso antes de proceder
    if (!hasPermission('empleados', 'employees', 'delete')) {
      toast({
        title: 'Sin permiso',
        description: 'No tienes permiso para eliminar empleados',
        variant: 'destructive',
      });
      return;
    }

    // Proceder con la eliminación
    await deleteEmployee(employeeId);
  };

  return <Button onClick={handleDelete}>Eliminar</Button>;
}
```

---

## Patrones Comunes

### Patrón 1: Página con Múltiples Permisos

```tsx
'use client';

import { PermissionGuard } from '@/features/Permissions';

export function EmployeesPage() {
  return (
    <div className="space-y-6">
      {/* Header con botón de crear */}
      <div className="flex justify-between">
        <h1>Empleados</h1>
        <PermissionGuard module="empleados" tab="employees" action="create">
          <Button>Crear Empleado</Button>
        </PermissionGuard>
      </div>

      {/* Lista de empleados */}
      <PermissionGuard module="empleados" tab="employees" action="view">
        <EmployeesList />
      </PermissionGuard>

      {/* Sección de documentos */}
      <PermissionGuard module="empleados" tab="documentos-de-empleados" action="view">
        <DocumentsSection />
      </PermissionGuard>
    </div>
  );
}
```

---

### Patrón 2: Tabs con Permisos Diferentes

```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard } from '@/features/Permissions';

export function EquiposPage() {
  return (
    <Tabs defaultValue="vehicles">
      <TabsList>
        <PermissionGuard module="equipos" tab="vehicles" action="view">
          <TabsTrigger value="vehicles">Vehículos</TabsTrigger>
        </PermissionGuard>

        <PermissionGuard module="equipos" tab="others" action="view">
          <TabsTrigger value="others">Otros</TabsTrigger>
        </PermissionGuard>

        <PermissionGuard module="equipos" tab="inactive" action="view">
          <TabsTrigger value="inactive">Dados de Baja</TabsTrigger>
        </PermissionGuard>
      </TabsList>

      <PermissionGuard module="equipos" tab="vehicles" action="view">
        <TabsContent value="vehicles">
          <VehiclesList />
        </TabsContent>
      </PermissionGuard>

      <PermissionGuard module="equipos" tab="others" action="view">
        <TabsContent value="others">
          <OtherEquipmentList />
        </TabsContent>
      </PermissionGuard>

      <PermissionGuard module="equipos" tab="inactive" action="view">
        <TabsContent value="inactive">
          <InactiveEquipmentList />
        </TabsContent>
      </PermissionGuard>
    </Tabs>
  );
}
```

---

### Patrón 3: Dropdown Menu con Acciones

```tsx
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PermissionGuard } from '@/features/Permissions';
import { MoreHorizontal } from 'lucide-react';

export function EmployeeActions({ employee }: { employee: Employee }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <PermissionGuard module="empleados" tab="employees" action="view">
          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
        </PermissionGuard>

        <PermissionGuard module="empleados" tab="employees" action="update">
          <DropdownMenuItem>Editar</DropdownMenuItem>
        </PermissionGuard>

        <PermissionGuard module="empleados" tab="employees" action="delete">
          <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
        </PermissionGuard>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## API Reference

### PermissionGuard (Client)

```typescript
<PermissionGuard
  module="empleados"              // ModuleSlug (con autocompletado)
  tab="employees"                 // TabSlug | SubtabSlug (con autocompletado)
  action="view"                   // 'view' | 'create' | 'update' | 'delete'
  fallback={<p>Sin acceso</p>}   // ReactNode (opcional)
  showLoading={true}              // boolean (opcional, default: false)
>
  <Button>Contenido Protegido</Button>
</PermissionGuard>
```

---

### PermissionGuardServer (Server)

```typescript
<PermissionGuardServer
  module="empleados"              // ModuleSlug (con autocompletado)
  tab="employees"                 // TabSlug | SubtabSlug (con autocompletado)
  action="view"                   // 'view' | 'create' | 'update' | 'delete'
  fallback={<p>Sin acceso</p>}   // ReactNode (opcional)
>
  <EmployeesList />
</PermissionGuardServer>
```

---

### usePermissions Hook

```typescript
const {
  permissions, // Array de permisos del usuario
  isLoading, // boolean - Estado de carga
  error, // Error | null
  hasPermission, // (module, tab, action) => boolean
  canView, // (module, tab) => boolean
  canCreate, // (module, tab) => boolean
  canUpdate, // (module, tab) => boolean
  canDelete, // (module, tab) => boolean
} = usePermissions();
```

**Ejemplo:**

```tsx
const { hasPermission, canCreate } = usePermissions();

if (hasPermission('empleados', 'employees', 'delete')) {
  // Usuario puede eliminar
}

if (canCreate('empleados', 'employees')) {
  // Usuario puede crear
}
```

---

### Server Actions

#### checkPermissionServer

```typescript
const hasPermission = await checkPermissionServer(
  'empleados', // module
  'employees', // tab
  'delete' // action
);

if (hasPermission) {
  // Proceder
}
```

```typescript
// Lanza error si no tiene permiso

// Si llega aquí, tiene permiso
await deleteEmployee(id);
```

#### getUserPermissionsServer

```typescript
const permissions = await getUserPermissionsServer();
// Returns: Array de permisos del usuario
```

---

## Agregar Nuevos Módulos

Si necesitas agregar un nuevo módulo o tab, sigue estos pasos:

### 1. Agregar en la Base de Datos

```sql
-- Agregar módulo
INSERT INTO modules (id, name, slug, icon, order_index) VALUES
('new-module-id', 'Nuevo Módulo', 'nuevo-modulo', 'Icon', 11);

-- Agregar tab
INSERT INTO tabs (id, module_id, slug, name, order_index, parent_tab_id) VALUES
('new-tab-id', 'new-module-id', 'nueva-tab', 'Nueva Tab', 1, NULL);
```

### 2. Actualizar permissions-map.ts

```typescript
export const PERMISSIONS = {
  // ... módulos existentes

  'nuevo-modulo': {
    slug: 'nuevo-modulo',
    name: 'Nuevo Módulo',
    moduleId: 'new-module-id',
    tabs: {
      'nueva-tab': {
        slug: 'nueva-tab',
        name: 'Nueva Tab',
        tabId: 'new-tab-id',
        parent: null,
        subtabs: {},
      },
    },
  },
} as const;
```

### 3. Usar en Componentes

```tsx
<PermissionGuard module="nuevo-modulo" tab="nueva-tab" action="view">
  <NuevoContenido />
</PermissionGuard>
```

El autocompletado de TypeScript ahora incluirá el nuevo módulo y tab.

---

## Convenciones y Mejores Prácticas

### 1. Tipado

Seguir las convenciones de TypeScript del proyecto:

```typescript
// ✅ CORRECTO - Usar tipos inferidos del mapa
import type { ModuleSlug, TabSlug, ActionSlug } from '@/features/Permissions';

// ❌ INCORRECTO - No usar strings literales
const module: string = 'empleados';
```

### 2. Caché

```typescript
// ✅ CORRECTO - Client con caché de 1 minuto
const { data } = useQuery({
  queryKey: ['permissions'],
  queryFn: getUserPermissions,
  staleTime: 60 * 1000, // 1 minuto
});

// ❌ INCORRECTO - useEffect + useState
const [permissions, setPermissions] = useState([]);
useEffect(() => {
  getUserPermissions().then(setPermissions);
}, []);
```

### 3. Componentes

```typescript
// ✅ CORRECTO - Client Component para interactividad
'use client';
<PermissionGuard module="empleados" tab="employees" action="create">

// ✅ CORRECTO - Server Component para SEO
<PermissionGuardServer module="empleados" tab="employees" action="view">
```

---

## Troubleshooting

### Problema 1: El autocompletado no funciona

**Solución:** Asegúrate de importar los tipos correctamente:

```typescript
import { PermissionGuard } from '@/features/Permissions';
// NO: import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
```

### Problema 2: Flash de contenido en client component

**Solución:** Usa `showLoading={true}` o cambia a `PermissionGuardServer`:

```tsx
<PermissionGuard module="empleados" tab="employees" action="view" showLoading={true}>
  <Content />
</PermissionGuard>
```

### Problema 3: Permisos no se actualizan

**Solución:** Invalida la query manualmente:

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['permissions'] });
```

---

## Recursos Adicionales

- **Documentación de Roles**: [04-sistema-roles-permisos.md](./04-sistema-roles-permisos.md)
- **Mapa de Permisos**: `src/features/Permissions/permissions-map.ts`
- **Ejemplos**: `src/features/UserPermissionsManager/`

---

**Última actualización**: 2024-11-21  
**Autor**: Sistema de Documentación CodeControl
