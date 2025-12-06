# Análisis del Sistema de Roles - Frontend y Backend

## 📋 Resumen Ejecutivo

El sistema de roles y permisos implementado en CodeControl es un sistema **RBAC (Role-Based Access Control)** completo que permite:

- ✅ Asignar múltiples roles a usuarios
- ✅ Definir permisos granulares por módulo, tab y acción
- ✅ Crear roles personalizados con permisos predefinidos
- ✅ Sobrescribir permisos de roles con permisos personalizados
- ✅ Jerarquía de tabs con herencia de permisos
- ✅ Protección de rutas y componentes basada en permisos

---

## 🗄️ Arquitectura de Base de Datos (Backend)

### Estructura de Tablas

El sistema utiliza 7 tablas principales para gestionar roles y permisos:

#### 1. **`modules`** - Módulos del Sistema

```sql
- id: UUID (PK)
- name: VARCHAR - Nombre del módulo
- slug: VARCHAR - Identificador único (ej: "dashboard", "empresa")
- icon: VARCHAR - Nombre del ícono
- description: TEXT
- order_index: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. **`tabs`** - Pestañas dentro de Módulos

```sql
- id: UUID (PK)
- module_id: UUID (FK → modules)
- parent_tab_id: UUID (FK → tabs) - Para subtabs (jerarquía)
- slug: VARCHAR
- name: VARCHAR
- description: TEXT
- order_index: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 3. **`actions`** - Acciones CRUD

```sql
- id: UUID (PK)
- slug: VARCHAR - 'view', 'create', 'update', 'delete'
- name: VARCHAR - 'Ver', 'Crear', 'Editar', 'Eliminar'
- description: TEXT
- created_at: TIMESTAMP
```

#### 4. **`roles`** - Roles/Presets

```sql
- id: BIGINT (PK)
- name: VARCHAR - Nombre del role
- slug: VARCHAR - Identificador único
- description: TEXT
- color: VARCHAR - Color hex para UI
- is_system: BOOLEAN - Si es del sistema (no editable)
- is_active: BOOLEAN
- intern: BOOLEAN - Si es interno de CodeControl
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Roles del sistema:**

- Super Admin (#DC2626)
- Admin (#EA580C)
- Auditor (#7C3AED)
- CodeControlClient (#0891B2)
- Developer (#059669)

#### 5. **`role_permissions`** - Permisos de Roles

```sql
- id: UUID (PK)
- role_id: BIGINT (FK → roles)
- tab_id: UUID (FK → tabs)
- action_id: UUID (FK → actions)
- created_at: TIMESTAMP
UNIQUE (role_id, tab_id, action_id)
```

#### 6. **`user_roles`** - Asignación de Roles a Usuarios

```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- role_id: BIGINT (FK → roles)
- assigned_by: UUID (FK → auth.users)
- assigned_at: TIMESTAMP
UNIQUE (user_id, role_id)
```

#### 7. **`user_permissions`** - Permisos Personalizados

```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- tab_id: UUID (FK → tabs)
- action_id: UUID (FK → actions)
- is_granted: BOOLEAN - true = conceder, false = revocar
- assigned_by: UUID (FK → auth.users)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
UNIQUE (user_id, tab_id, action_id)
```

### Funciones SQL Helper

#### 1. **`get_user_permissions(p_user_id UUID)`**

Obtiene TODOS los permisos de un usuario (roles + personalizados), con lógica de prioridad.

**Lógica de Resolución:**

1. Primero obtiene permisos de roles (usando `user_roles` + `role_permissions`)
2. Luego obtiene permisos personalizados (usando `user_permissions`)
3. Combina ambos con `FULL OUTER JOIN`
4. **Los permisos personalizados tienen prioridad** sobre los de roles

```sql
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE(
  module_id uuid,
  module_slug text,
  module_name text,
  tab_id uuid,
  tab_slug text,
  tab_name text,
  action_id uuid,
  action_slug text,
  action_name text,
  source text,          -- 'role' o 'custom'
  is_granted boolean,
  role_id bigint,
  role_name text,
  role_color text
)
```

**Implementación:**

- Usa CTEs (Common Table Expressions) para separar lógica:
  - `user_role_permissions`: Permisos desde roles
  - `user_custom_permissions`: Permisos personalizados
- Usa `DISTINCT ON` para asegurar un único resultado por permiso
- Filtra solo permisos donde `is_granted = true`
- Considera solo módulos y tabs activos

#### 2. **`user_has_permission(p_user_id, p_module_slug, p_tab_slug, p_action_slug)`**

Verifica si un usuario tiene un permiso específico.

```sql
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id uuid,
  p_module_slug text,
  p_tab_slug text,
  p_action_slug text
)
RETURNS boolean
```

**Implementación:**

- Llama a `get_user_permissions()` y verifica si existe el permiso específico
- Retorna `true` o `false`

#### 3. **`check_multiple_permissions(p_user_id, p_permissions jsonb)`**

**Optimización importante**: Verifica múltiples permisos en una sola llamada.

```sql
CREATE OR REPLACE FUNCTION public.check_multiple_permissions(
  p_user_id uuid,
  p_permissions jsonb
)
RETURNS TABLE(
  module_slug text,
  tab_slug text,
  action_slug text,
  has_permission boolean
)
```

**Formato de entrada:**

```json
[
  { "module": "empresa", "tab": "clientes", "action": "view" },
  { "module": "empresa", "tab": "clientes", "action": "create" }
]
```

**Rendimiento:**

- 8 tabs = 2 queries (~150ms) vs 16 queries (~1000ms)
- **85% más rápido** que verificar permisos individualmente

#### 4. **`get_user_accessible_modules(p_user_id UUID)`**

Obtiene los módulos a los que el usuario tiene acceso.

**Retorna:**

```typescript
{
  module_id: UUID,
  module_slug: string,
  module_name: string,
  module_icon: string,
  module_order: number
}[]
```

---

## 🎯 Jerarquía de Permisos

### Estructura

```
MÓDULO (Dashboard, Empresa, Empleados...)
└── TAB PRINCIPAL (General, Clientes, Usuarios...)
    └── SUBTAB (Lista, Servicios, Permisos...)
        └── ACCIÓN (Ver, Crear, Editar, Eliminar)
```

### Resolución de Permisos (Orden de Prioridad)

1. **Permisos Personalizados** (`user_permissions`) - **Mayor prioridad**

   - Si `is_granted = false`: Revoca el permiso aunque lo tenga por rol
   - Si `is_granted = true`: Concede el permiso aunque no lo tenga por rol

2. **Permisos de Roles** (`role_permissions` + `user_roles`)

   - Suma de todos los permisos de todos los roles asignados al usuario

3. **Sin Acceso** - Si no tiene ningún permiso

**Ejemplo:**

```
Usuario tiene rol "Editor" con permisos:
  - empresa/clientes/view ✅
  - empresa/clientes/create ✅
  - empresa/clientes/update ✅

Permiso personalizado:
  - empresa/clientes/update = false ❌

Resultado final:
  - empresa/clientes/view ✅
  - empresa/clientes/create ✅
  - empresa/clientes/update ❌ (revocado por permiso personalizado)
```

---

## 🖥️ Implementación Frontend

### Estructura de Archivos

```
src/
├── features/
│   ├── Permissions/
│   │   ├── actions.ts              # Client actions
│   │   ├── actionsServer.ts        # Server actions
│   │   ├── hooks/
│   │   │   ├── usePermissions.ts   # Hook principal
│   │   │   └── useUserPermissions.ts
│   │   ├── components/
│   │   │   ├── PermissionGuard.tsx # Componente de protección
│   │   │   └── PermissionGuardServer.tsx
│   │   └── permissions-map.ts      # Mapa de permisos (tipado)
│   │
│   └── UserPermissionsManager/
│       ├── UserPermissionsManager.tsx
│       └── components/
│           ├── RoleSelector.tsx
│           ├── ModulePermissions.tsx
│           ├── RoleManager.tsx
│           └── RolePermissionsEditor.tsx
```

### Actions (Capa de API)

#### Client Actions (`actions.ts`)

**Funciones principales:**

```typescript
// Obtener estructura de módulos con tabs y acciones
export async function getModulesWithTabs(): Promise<ModuleWithTabs[]>;

// Obtener permisos del usuario actual (desde auth claims)
export async function getUserPermissions(): Promise<UserPermission[]>;

// Verificar si el usuario actual tiene un permiso
export async function checkUserPermission(moduleSlug: string, tabSlug: string, actionSlug: string): Promise<boolean>;

// Obtener módulos accesibles para el usuario actual
export async function getUserAccessibleModules(): Promise<Module[]>;

// Gestión de roles
export async function assignRoleToUser(userId: string, roleId: number): Promise<{ success: boolean }>;
export async function removeRoleFromUser(userId: string, roleId: number): Promise<{ success: boolean }>;
export async function getRoles(): Promise<Role[]>;
export async function getUserRoles(userId: string): Promise<UserRole[]>;

// Permisos personalizados
export async function setUserPermission(
  userId: string,
  tabId: string,
  actionId: string,
  isGranted: boolean
): Promise<{ success: boolean }>;
export async function removeUserPermission(
  userId: string,
  tabId: string,
  actionId: string
): Promise<{ success: boolean }>;
```

**Características:**

- Todas las funciones usan `supabaseBrowser()` para cliente
- Obtienen el `user_id` automáticamente desde `auth.getUser()`
- Manejan errores apropiadamente
- Retornan datos serializables (JSON.parse(JSON.stringify()))

#### Server Actions (`actionsServer.ts`)

**Optimización clave**: Usan `checkMultiplePermissionsServer()` para múltiples verificaciones.

```typescript
// Verificar múltiples permisos en una sola llamada (OPTIMIZADO)
export async function checkMultiplePermissionsServer(
  permissions: Array<{ moduleSlug: string; tabSlug: string; actionSlug: string }>
): Promise<Map<string, boolean>>;

// Verificar un permiso individual
export async function checkPermissionServer(moduleSlug: string, tabSlug: string, actionSlug: string): Promise<boolean>;

// Obtener permisos del usuario actual (server-side)
export async function getUserPermissionsServer(): Promise<UserPermission[]>;

// Requerir permiso (lanza error si no tiene)
export async function requirePermissionServer(moduleSlug: string, tabSlug: string, actionSlug: string): Promise<void>;
```

**Características:**

- Usan `supabaseServer()` para ejecución en servidor
- NO usan caché (cada llamada consulta directamente la DB)
- Optimizados para verificar múltiples permisos a la vez

### Hooks

#### `usePermissions()`

Hook principal para verificar permisos en componentes cliente.

```typescript
export function usePermissions() {
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: getUserPermissions,
    staleTime: 0, // Sin caché por ahora
  });

  // Crea un Map para búsquedas O(1)
  const permissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    permissions.forEach((perm) => {
      const key = `${perm.module_slug}:${perm.tab_slug}:${perm.action_slug}`;
      map.set(key, perm.is_granted !== false);
    });
    return map;
  }, [permissions]);

  // Helpers
  const hasPermission = (moduleSlug: string, tabSlug: string, actionSlug: string): boolean;
  const canView = (moduleSlug: string, tabSlug: string): boolean; // Con visibilidad inferida
  const canCreate = (moduleSlug: string, tabSlug: string): boolean;
  const canUpdate = (moduleSlug: string, tabSlug: string): boolean;
  const canDelete = (moduleSlug: string, tabSlug: string): boolean;

  return {
    permissions,
    isLoading,
    hasPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
  };
}
```

**Características especiales:**

- **Visibilidad inferida**: Si un usuario no tiene permiso explícito de 'view' en un tab, verifica si tiene acceso a alguna subtab
- Usa TanStack Query para caché y refetch automático
- Retorna helpers convenientes (`canView`, `canCreate`, etc.)

#### `useUserPermissions(userId: string)`

Hook para obtener permisos de un usuario específico (útil para gestión).

```typescript
export function useUserPermissions(userId: string) {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => getUserPermissionsByUserId(userId),
  });

  const { data: roles } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => getUserRoles(userId),
  });

  return { permissions, roles, isLoading };
}
```

### Componentes

#### `PermissionGuard`

Componente que renderiza condicionalmente basado en permisos.

```tsx
<PermissionGuard module="empleados" tab="documentos-de-empleados" action="create" fallback={<p>No tienes permiso</p>}>
  <Button>Crear Documento</Button>
</PermissionGuard>
```

**Características:**

- Tipado fuerte con autocompletado
- Soporta loading states
- Soporta fallback cuando no tiene permiso
- Usa `usePermissions()` internamente

#### `RoleSelector`

Componente para asignar/remover roles a usuarios.

```tsx
<RoleSelector userId={userId} />
```

**Características:**

- Muestra todos los roles disponibles
- Muestra cuántos permisos tiene cada rol
- Checkbox para asignar/remover
- Badges con información (sistema/personalizado, cantidad de permisos)
- Invalidación automática de queries después de cambios

#### `ModulePermissions`

Componente para gestionar permisos por módulo, tab y acción.

**Características:**

- Estructura jerárquica visual
- Checkboxes para seleccionar permisos individuales
- Selección masiva (módulo completo, tab completo)
- Indicadores visuales de origen del permiso (badge con inicial del rol)
- Colores por acción (Ver=Azul, Crear=Verde, Editar=Amarillo, Eliminar=Rojo)
- Soporte para permisos personalizados que sobrescriben roles

---

## 🔄 Flujo de Verificación de Permisos

### En el Frontend (Cliente)

1. **Componente carga** → `usePermissions()` hook se ejecuta
2. **Hook hace query** → `getUserPermissions()` action
3. **Action llama a Supabase** → `supabase.rpc('get_user_permissions', { p_user_id: user.id })`
4. **Función SQL ejecuta** → Combina permisos de roles + personalizados
5. **Resultado se cachea** → TanStack Query cachea los permisos
6. **Componente verifica** → `hasPermission(module, tab, action)` usa el Map cacheado
7. **Render condicional** → Muestra/oculta contenido según permiso

### En el Backend (Servidor)

1. **Server Component/Action** → Llama `checkPermissionServer()` o `checkMultiplePermissionsServer()`
2. **Action llama a Supabase Server** → `supabaseServer().rpc('user_has_permission', ...)`
3. **Función SQL ejecuta** → Verifica directamente en la DB
4. **Retorna boolean** → Sin caché, siempre consulta actualizada

### Optimizaciones Implementadas

1. **Verificación múltiple**: `checkMultiplePermissionsServer()` reduce queries de 16 a 2
2. **Map en memoria**: `usePermissions()` crea un Map para búsquedas O(1)
3. **Caché de queries**: TanStack Query cachea permisos (configurable)
4. **Invalidación inteligente**: Al cambiar roles/permisos, se invalidan queries relevantes

---

## 🎨 Vista de Gestión de Permisos

### Ruta

`/dashboard/company/actualCompany/user/[id]`

### Componentes Principales

1. **`UserPermissionsManager`**

   - Contenedor principal
   - Tabs para "Permisos de Usuario" y "Gestión de Roles"

2. **`RoleSelector`**

   - Lista de roles disponibles
   - Checkbox para asignar/remover
   - Badges con información de cada rol

3. **`ModulePermissions`**
   - Vista jerárquica de módulos → tabs → acciones
   - Checkboxes para permisos individuales
   - Gestión de permisos personalizados

---

## 🔒 Seguridad y RLS (Row Level Security)

### Estado Actual

⚠️ **IMPORTANTE**: Las políticas RLS actuales son temporales y permiten acceso total a usuarios autenticados.

```sql
CREATE POLICY "BORRAR ESTO MAS ADELANTE"
ON public.actions
FOR ALL
TO authenticated
USING (true);
```

### Pendientes

- ⚠️ Reemplazar políticas temporales por políticas basadas en permisos
- ⚠️ Implementar middleware de protección de rutas
- ⚠️ Validar permisos en todas las server actions
- ⚠️ Auditar accesos y cambios de permisos

---

## 📊 Ejemplo de Uso Completo

### 1. Verificar Permiso en Componente Cliente

```tsx
'use client';

import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';

export function EmployeesPage() {
  return (
    <div>
      <PermissionGuard module="empleados" tab="employees" action="view" fallback={<p>No tienes acceso</p>}>
        <EmployeesList />
      </PermissionGuard>

      <PermissionGuard module="empleados" tab="employees" action="create">
        <Button>Crear Empleado</Button>
      </PermissionGuard>
    </div>
  );
}
```

### 2. Verificar Permiso en Server Component

```tsx
import { checkMultiplePermissionsServer } from '@/features/Permissions/actionsServer';

export default async function EmployeesPage() {
  const permissions = await checkMultiplePermissionsServer([
    { moduleSlug: 'empleados', tabSlug: 'employees', actionSlug: 'view' },
    { moduleSlug: 'empleados', tabSlug: 'employees', actionSlug: 'create' },
  ]);

  const canView = permissions.get('empleados:employees:view');
  const canCreate = permissions.get('empleados:employees:create');

  return (
    <div>
      {canView && <EmployeesList />}
      {canCreate && <CreateEmployeeButton />}
    </div>
  );
}
```

### 3. Proteger Server Action

```tsx
'use server';

import { requirePermissionServer } from '@/features/Permissions/actionsServer';

export async function deleteEmployee(employeeId: string) {
  // Lanza error si no tiene permiso
  await requirePermissionServer('empleados', 'employees', 'delete');

  // Proceder con eliminación
  const supabase = await supabaseServer();
  await supabase.from('employees').delete().eq('id', employeeId);
}
```

### 4. Usar Hook en Componente

```tsx
'use client';

import { usePermissions } from '@/features/Permissions/hooks/usePermissions';

export function EmployeesActions() {
  const { canCreate, canUpdate, canDelete, isLoading } = usePermissions();

  if (isLoading) return <Skeleton />;

  return (
    <div>
      {canCreate('empleados', 'employees') && <Button>Crear</Button>}
      {canUpdate('empleados', 'employees') && <Button>Editar</Button>}
      {canDelete('empleados', 'employees') && <Button>Eliminar</Button>}
    </div>
  );
}
```

---

## ✅ Estado de Implementación

### Implementado

- ✅ Estructura de base de datos completa
- ✅ Funciones SQL helper (get_user_permissions, user_has_permission, check_multiple_permissions)
- ✅ Actions del lado del cliente (actions.ts)
- ✅ Actions del lado del servidor (actionsServer.ts)
- ✅ Componentes de gestión de permisos
- ✅ Asignación de roles a usuarios
- ✅ Permisos personalizados por usuario
- ✅ Gestión de roles (crear, editar, eliminar)
- ✅ Vista jerárquica de permisos
- ✅ PermissionGuard component
- ✅ Hooks de permisos (usePermissions, useUserPermissions)
- ✅ Optimizaciones de rendimiento (check_multiple_permissions)

### Pendientes

- ⚠️ **Políticas RLS de seguridad**: Reemplazar políticas temporales
- ⚠️ **Integración con Sidebar**: Filtrar módulos según permisos
- ⚠️ **Middleware de rutas**: Proteger rutas basado en permisos
- ⚠️ **Auditoría**: Registrar cambios de permisos y roles
- ⚠️ **Tests**: Agregar tests unitarios y de integración

---

## 📝 Notas Técnicas

### Tipado

El sistema usa tipado fuerte con TypeScript:

```typescript
// Tipos inferidos desde funciones
export type UserPermission = Awaited<ReturnType<typeof getUserPermissions>>[number];
export type Role = Awaited<ReturnType<typeof getRoles>>[number];
```

### Invalidación de Queries

Al cambiar roles/permisos, se invalidan queries relacionadas:

```typescript
queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
queryClient.invalidateQueries({ queryKey: ['permissions'] }); // Query global
```

### Serialización

Los datos se serializan antes de retornar:

```typescript
return JSON.parse(JSON.stringify(data));
```

Esto asegura que los datos sean serializables (útil para server actions).

---

**Última actualización**: 2024-12-19
**Autor**: Análisis del Sistema de Roles
