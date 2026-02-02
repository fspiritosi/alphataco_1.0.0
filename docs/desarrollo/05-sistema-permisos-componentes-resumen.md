# Sistema de Permisos - Componentes de Ocultación (Resumen)

## 🎯 ¿Qué se implementó?

Sistema completo para ocultar elementos de la UI basándose en permisos del usuario, con tipado fuerte y autocompletado inteligente.

---

## 📁 Archivos Creados/Modificados

### ✅ Nuevos Archivos

```
src/features/Permissions/
├── permissions-map.ts                    # Mapa de permisos con tipado fuerte
├── actionsServer.ts                      # Server Actions (sin caché)
├── components/
│   └── PermissionGuardServer.tsx        # Server Component
└── index.ts                             # Exports centralizados

docs/desarrollo/
├── 05-sistema-permisos-componentes.md           # Documentación completa
└── 05-sistema-permisos-componentes-resumen.md   # Este archivo
```

### ✏️ Archivos Modificados

```
src/features/Permissions/
├── components/
│   └── PermissionGuard.tsx              # Actualizado con tipado fuerte
└── hooks/
    └── usePermissions.ts                # Caché cambiado a 1 minuto
```

---

## 🚀 Uso Rápido

### Client Component (con caché)

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

### Server Component (sin caché)

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

### Proteger Server Action

````tsx
---

## 🎨 Características Principales

### 1. Tipado Fuerte con Autocompletado

```typescript
<PermissionGuard
  module="empleados"  // ← Autocompleta: empleados, empresa, equipos...
  tab="documentos-de-empleados"  // ← Autocompleta solo tabs de empleados
  action="view"  // ← Autocompleta: view, create, update, delete
>
````

### 2. Mapa de Permisos Centralizado

Todos los módulos, tabs y subtabs están mapeados en `permissions-map.ts`:

- ✅ 10 módulos
- ✅ 28 tabs principales
- ✅ 44 subtabs
- ✅ 4 acciones (view, create, update, delete)

### 3. Dos Componentes para Diferentes Casos

| Componente              | Uso               | Caché | SEO | Interactivo |
| ----------------------- | ----------------- | ----- | --- | ----------- |
| `PermissionGuard`       | Client Components | 1 min | ❌  | ✅          |
| `PermissionGuardServer` | Server Components | No    | ✅  | ❌          |

---

## 📊 Ejemplo Completo: Tabs con Permisos

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

      <PermissionGuard module="empleados" tab="docs-empleados-permanentes" action="view">
        <TabsContent value="permanentes">
          <PermanentDocuments />
        </TabsContent>
      </PermissionGuard>

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

## 🔑 Props de los Componentes

### PermissionGuard (Client)

```typescript
<PermissionGuard
  module="empleados"              // ModuleSlug (requerido)
  tab="employees"                 // TabSlug | SubtabSlug (requerido)
  action="view"                   // ActionSlug (requerido)
  fallback={<p>Sin acceso</p>}   // ReactNode (opcional)
  showLoading={true}              // boolean (opcional)
>
  {children}
</PermissionGuard>
```

### PermissionGuardServer (Server)

```typescript
<PermissionGuardServer
  module="empleados"              // ModuleSlug (requerido)
  tab="employees"                 // TabSlug | SubtabSlug (requerido)
  action="view"                   // ActionSlug (requerido)
  fallback={<p>Sin acceso</p>}   // ReactNode (opcional)
>
  {children}
</PermissionGuardServer>
```

---

## 🛠️ API Disponible

### Componentes

```typescript
import {
  PermissionGuard, // Client Component
  PermissionGuardServer, // Server Component
} from '@/features/Permissions';
```

### Hooks

```typescript
import { usePermissions } from '@/features/Permissions';

const {
  hasPermission, // (module, tab, action) => boolean
  canView, // (module, tab) => boolean
  canCreate, // (module, tab) => boolean
  canUpdate, // (module, tab) => boolean
  canDelete, // (module, tab) => boolean
  isLoading, // boolean
} = usePermissions();
```

### Server Actions

```typescript
import {
  checkPermissionServer, // Verifica permiso
  getUserPermissionsServer, // Obtiene todos los permisos
} from '@/features/Permissions';
```

### Tipos

```typescript
import type {
  ModuleSlug, // Tipo de módulos
  TabSlug, // Tipo de tabs
  SubtabSlug, // Tipo de subtabs
  ActionSlug, // Tipo de acciones
} from '@/features/Permissions';
```

---

## 📋 Casos de Uso Comunes

### 1. Ocultar Botón

```tsx
<PermissionGuard module="empleados" tab="employees" action="create">
  <Button>Crear</Button>
</PermissionGuard>
```

### 2. Ocultar Tab

```tsx
<PermissionGuard module="empleados" tab="docs-empleados-mensuales" action="view">
  <TabsTrigger>Mensuales</TabsTrigger>
</PermissionGuard>
```

### 3. Ocultar Acción en Tabla

```tsx
<PermissionGuard module="empleados" tab="employees" action="delete">
  <Button variant="destructive">Eliminar</Button>
</PermissionGuard>
```

### 4. Proteger Página Completa

```tsx
<PermissionGuardServer module="empleados" tab="employees" action="view">
  <EmployeesPage />
</PermissionGuardServer>
```

### 5. Verificación Programática

```tsx
const { hasPermission } = usePermissions();

if (hasPermission('empleados', 'employees', 'delete')) {
  // Proceder
}
```

---

## ⚡ Performance

### Client Component (PermissionGuard)

- ✅ Caché de 1 minuto con TanStack Query
- ✅ Navegación rápida sin re-fetch
- ✅ Prefetch automático
- ✅ Invalidación manual disponible

### Server Component (PermissionGuardServer)

- ✅ Consulta directa a BD (sin caché)
- ✅ Renderizado en servidor
- ✅ No hay flash de contenido
- ✅ SEO friendly

---

## 🎯 Módulos Disponibles

1. **dashboard** - Panel principal
2. **empresa** - Gestión de empresa (3 tabs, 16 subtabs)
3. **empleados** - Gestión de empleados (5 tabs, 8 subtabs)
4. **equipos** - Gestión de equipos (4 tabs, 11 subtabs)
5. **comercial** - Gestión comercial (1 tab, 7 subtabs)
6. **documentacion** - Gestión de documentos (4 tabs, 6 subtabs)
7. **mantenimiento** - Gestión de mantenimiento (1 tab, 4 subtabs)
8. **operaciones** - Operaciones diarias (2 tabs)
9. **formularios** - Formularios personalizados (1 tab)
10. **ayuda** - Centro de ayuda

---

## 📚 Documentación Completa

Ver: [05-sistema-permisos-componentes.md](./05-sistema-permisos-componentes.md)

---

## ✅ Checklist de Implementación

- [x] Crear mapa de permisos con tipado fuerte
- [x] Crear Server Actions (sin caché)
- [x] Crear PermissionGuardServer (Server Component)
- [x] Actualizar PermissionGuard (Client Component)
- [x] Actualizar usePermissions (caché 1 minuto)
- [x] Crear exports centralizados
- [x] Documentar uso y ejemplos
- [x] Documentar patrones comunes

---

## 🚀 Próximos Pasos

1. Integrar con Sidebar para filtrar módulos
2. Agregar middleware de protección de rutas
3. Implementar auditoría de cambios de permisos
4. Agregar tests unitarios

---

**Última actualización**: 2024-11-21  
**Autor**: Sistema de Documentación CodeControl
