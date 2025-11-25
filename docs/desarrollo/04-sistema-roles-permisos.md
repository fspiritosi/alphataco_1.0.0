# Sistema de Roles y Permisos

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura de Base de Datos](#arquitectura-de-base-de-datos)
3. [Jerarquía de Permisos](#jerarquía-de-permisos)
4. [Implementación Backend](#implementación-backend)
5. [Implementación Frontend](#implementación-frontend)
6. [Flujo de Asignación de Permisos](#flujo-de-asignación-de-permisos)
7. [Uso en la Aplicación](#uso-en-la-aplicación)
8. [Ejemplos de Código](#ejemplos-de-código)

---

## Introducción

El sistema de roles y permisos implementado en CodeControl es un sistema **RBAC (Role-Based Access Control)** con soporte para **permisos personalizados por usuario**. Permite:

- ✅ Asignar múltiples roles a un usuario
- ✅ Definir permisos granulares por módulo, tab y acción
- ✅ Crear roles personalizados con permisos predefinidos
- ✅ Sobrescribir permisos de roles con permisos personalizados
- ✅ Jerarquía de tabs con herencia de permisos
- ✅ Protección de rutas y componentes basada en permisos

---

## Arquitectura de Base de Datos

### Tablas Principales

#### 1. `modules` - Módulos del Sistema

Representa los items del sidebar (Dashboard, Empresa, Empleados, etc.)

```sql
- id: UUID (PK)
- name: VARCHAR - Nombre del módulo
- slug: VARCHAR - Identificador único (ej: "dashboard", "empresa")
- icon: VARCHAR - Nombre del ícono
- description: TEXT - Descripción opcional
- order_index: INTEGER - Orden de visualización
- is_active: BOOLEAN - Si está activo
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Ejemplo de datos:**

```sql
INSERT INTO modules (slug, name, icon, order_index) VALUES
  ('dashboard', 'Dashboard', 'LayoutDashboard', 1),
  ('empresa', 'Empresa', 'Building2', 2),
  ('empleados', 'Empleados', 'Users', 3);
```

#### 2. `tabs` - Pestañas dentro de Módulos

Cada módulo tiene múltiples tabs que agrupan contenido. Soporta jerarquía con `parent_tab_id`.

```sql
- id: UUID (PK)
- module_id: UUID (FK → modules)
- parent_tab_id: UUID (FK → tabs) - Para subtabs
- name: VARCHAR - Nombre de la tab
- slug: VARCHAR - Identificador único
- description: TEXT - Descripción opcional
- order_index: INTEGER - Orden de visualización
- is_active: BOOLEAN - Si está activa
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Ejemplo de jerarquía:**

```
Empresa (módulo)
├── General (tab principal)
├── Clientes (tab principal)
│   ├── Lista (subtab)
│   └── Servicios (subtab)
└── Usuarios (tab principal)
```

#### 3. `actions` - Acciones CRUD

Las 4 acciones disponibles: Ver, Crear, Editar, Eliminar

```sql
- id: UUID (PK)
- name: VARCHAR - Nombre de la acción
- slug: VARCHAR - Identificador único (view, create, update, delete)
- description: TEXT - Descripción opcional
- created_at: TIMESTAMP
```

**Datos fijos:**

```sql
INSERT INTO actions (slug, name) VALUES
  ('view', 'Ver'),
  ('create', 'Crear'),
  ('update', 'Editar'),
  ('delete', 'Eliminar');
```

#### 4. `roles` - Roles/Presets

Grupos predefinidos de permisos

```sql
- id: BIGINT (PK)
- name: VARCHAR - Nombre del role
- slug: VARCHAR - Identificador único
- description: TEXT - Descripción del role
- color: VARCHAR - Color para la UI (hex)
- is_system: BOOLEAN - Si es un role del sistema (no se puede eliminar)
- is_active: BOOLEAN - Si está activo
- intern: BOOLEAN - Si es interno de CodeControl
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Roles del sistema:**

```sql
- Super Admin (#DC2626) - Acceso total
- Admin (#EA580C) - Administrador con permisos amplios
- Auditor (#7C3AED) - Solo lectura
- CodeControlClient (#0891B2) - Cliente de CodeControl
- Developer (#059669) - Desarrollador
```

**Roles personalizados:**

```sql
- Usuario (#2563EB) - Usuario estándar
- Invitado (#64748B) - Permisos limitados
- Administrador (#F59E0B) - Admin de empresa
```

#### 5. `role_permissions` - Permisos de Roles

Define qué puede hacer cada role en cada tab

```sql
- id: UUID (PK)
- role_id: BIGINT (FK → roles)
- tab_id: UUID (FK → tabs)
- action_id: UUID (FK → actions)
- created_at: TIMESTAMP

UNIQUE (role_id, tab_id, action_id)
```

#### 6. `user_roles` - Asignación de Roles a Usuarios

Qué roles tiene cada usuario (relación muchos a muchos)

```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- role_id: BIGINT (FK → roles)
- assigned_by: UUID (FK → auth.users) - Quién asignó el role
- assigned_at: TIMESTAMP

UNIQUE (user_id, role_id)
```

#### 7. `user_permissions` - Permisos Personalizados

Permisos específicos por usuario (excepciones que sobrescriben roles)

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

---

## Jerarquía de Permisos

### Estructura

```
MÓDULO (Dashboard, Empresa, Empleados...)
└── TAB PRINCIPAL (General, Clientes, Usuarios...)
    └── SUBTAB (Lista, Servicios, Permisos...)
        └── ACCIÓN (Ver, Crear, Editar, Eliminar)
```

### Resolución de Permisos

El sistema resuelve permisos en el siguiente orden de prioridad:

1. **Permisos Personalizados** (`user_permissions`) - Mayor prioridad

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

## Implementación Backend

### Funciones SQL Helper

#### 1. `get_user_permissions(p_user_id UUID)`

Obtiene TODOS los permisos de un usuario (roles + personalizados)

```sql
SELECT * FROM get_user_permissions('user-uuid');
```

**Retorna:**

```typescript
{
  module_id: UUID,
  module_slug: string,
  module_name: string,
  tab_id: UUID,
  tab_slug: string,
  tab_name: string,
  action_id: UUID,
  action_slug: 'view' | 'create' | 'update' | 'delete',
  action_name: string,
  source: 'role' | 'custom',
  is_granted: boolean,
  role_id?: number,
  role_name?: string,
  role_color?: string
}[]
```

#### 2. `user_has_permission(p_user_id, p_module_slug, p_tab_slug, p_action_slug)`

Verifica si un usuario tiene un permiso específico

```sql
SELECT user_has_permission(
  'user-uuid',
  'empresa',
  'clientes',
  'create'
); -- Returns: true/false
```

#### 3. `get_user_accessible_modules(p_user_id UUID)`

Obtiene los módulos a los que el usuario tiene acceso

```sql
SELECT * FROM get_user_accessible_modules('user-uuid');
```

**Retorna:**

```typescript
{
  module_id: UUID,
  module_slug: string,
  module_name: string,
  module_icon: string
}[]
```

### Políticas RLS (Row Level Security)

Todas las tablas tienen RLS habilitado con políticas temporales:

```sql
-- NOTA: Estas políticas son temporales para desarrollo
-- TODO: Implementar políticas de seguridad adecuadas

CREATE POLICY "BORRAR ESTO MAS ADELANTE"
ON public.actions
FOR ALL
TO authenticated
USING (true);
```

⚠️ **IMPORTANTE**: Las políticas actuales permiten acceso total a usuarios autenticados. Deben ser reemplazadas por políticas basadas en permisos antes de producción.

---

## Implementación Frontend

### Estructura de Archivos

```
src/
├── features/
│   ├── Permissions/
│   │   ├── actions.ts              # Server/Client actions
│   │   ├── hooks/
│   │   │   └── useUserPermissions.ts
│   │   └── components/
│   │       └── PermissionGuard.tsx
│   │
│   └── UserPermissionsManager/
│       ├── UserPermissionsManager.tsx
│       └── components/
│           ├── RoleSelector.tsx
│           ├── ModulePermissions.tsx
│           ├── RoleManager.tsx
│           └── RolePermissionsEditor.tsx
```

### Actions (API Layer)

Archivo: `src/features/Permissions/actions.ts`

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

// Asignar un rol a un usuario
export async function assignRoleToUser(
  userId: string,
  roleId: number,
  assignedBy?: string
): Promise<{ success: boolean }>;

// Remover un rol de un usuario
export async function removeRoleFromUser(userId: string, roleId: number): Promise<{ success: boolean }>;

// Establecer permiso personalizado
export async function setUserPermission(
  userId: string,
  tabId: string,
  actionId: string,
  isGranted: boolean,
  assignedBy?: string
): Promise<{ success: boolean }>;

// Remover permiso personalizado
export async function removeUserPermission(
  userId: string,
  tabId: string,
  actionId: string
): Promise<{ success: boolean }>;

// Gestión de roles
export async function getRoles(): Promise<Role[]>;
export async function getUserRoles(userId: string): Promise<UserRole[]>;
export async function getRolePermissions(roleId: number): Promise<RolePermission[]>;
export async function createRole(name: string, description?: string, color?: string): Promise<Role>;
export async function updateRole(roleId: number, name: string, description?: string, color?: string): Promise<Role>;
export async function deleteRole(roleId: number): Promise<{ success: boolean }>;
export async function setRolePermissions(
  roleId: number,
  permissions: Array<{ tabId: string; actionId: string }>
): Promise<{ success: boolean }>;
```

### Hooks

#### `useUserPermissions(userId: string)`

```typescript
import { useUserPermissions } from '@/features/Permissions/hooks/useUserPermissions';

function MyComponent({ userId }: { userId: string }) {
  const { permissions, roles, isLoading, error, refetch } = useUserPermissions(userId);

  // permissions: Array de permisos del usuario
  // roles: Array de roles asignados al usuario
  // isLoading: Estado de carga
  // error: Error si ocurrió
  // refetch: Función para refrescar los datos
}
```

---

## Flujo de Asignación de Permisos

### 1. Vista de Gestión de Permisos de Usuario

**Ruta:** `/dashboard/company/actualCompany/user/[id]`

**Componente:** `UserPermissionsManager`

```typescript
<UserPermissionsManager
  userId={authUserId}
  userName={data[0]?.profile_id?.fullname || ''}
  userEmail={data[0]?.profile_id?.email || ''}
/>
```

### 2. Selección de Roles (RoleSelector)

El componente `RoleSelector` permite:

- ✅ Ver todos los roles disponibles
- ✅ Ver cuántos permisos tiene cada rol
- ✅ Asignar/remover roles con un checkbox
- ✅ Ver si el rol es del sistema o personalizado
- ✅ Identificación visual con colores

**Características:**

- Múltiples roles pueden ser asignados simultáneamente
- Los permisos se suman de todos los roles
- Invalidación automática de queries al cambiar roles

### 3. Permisos por Módulo (ModulePermissions)

El componente `ModulePermissions` permite:

- ✅ Ver estructura jerárquica: Módulos > Tabs > Subtabs > Acciones
- ✅ Seleccionar/deseleccionar permisos individuales
- ✅ Seleccionar/deseleccionar tabs completos
- ✅ Seleccionar/deseleccionar módulos completos
- ✅ Ver origen del permiso (rol o personalizado)
- ✅ Indicadores visuales de permisos parciales (indeterminate checkboxes)
- ✅ Badges con contadores de permisos activos

**Características especiales:**

- **Herencia de permisos**: Al seleccionar un tab padre, se seleccionan todos sus subtabs
- **Indicadores de origen**: Badge con inicial del rol que otorga el permiso
- **Colores por acción**:
  - 🔵 Ver (view) - Azul
  - 🟢 Crear (create) - Verde
  - 🟡 Editar (update) - Amarillo
  - 🔴 Eliminar (delete) - Rojo

### 4. Gestión de Roles (RoleManager)

**Ruta:** `/dashboard/company/actualCompany/users` (tab "Gestión de Roles")

El componente `RoleManager` permite:

- ✅ Crear nuevos roles personalizados
- ✅ Editar roles existentes (solo personalizados)
- ✅ Eliminar roles (solo personalizados)
- ✅ Definir permisos del rol con `RolePermissionsEditor`
- ✅ Asignar nombre, descripción y color al rol

**Restricciones:**

- ❌ No se pueden editar roles del sistema (`is_system = true`)
- ❌ No se pueden eliminar roles del sistema
- ✅ Los roles personalizados tienen total flexibilidad

---

## Uso en la Aplicación

### 1. Proteger Componentes con PermissionGuard

```typescript
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';

function MyComponent() {
  return (
    <PermissionGuard
      moduleSlug="empresa"
      tabSlug="clientes"
      actionSlug="create"
      fallback={<p>No tienes permiso para crear clientes</p>}
    >
      <Button>Crear Cliente</Button>
    </PermissionGuard>
  );
}
```

### 2. Verificar Permisos Programáticamente

```typescript
import { checkUserPermission } from '@/features/Permissions/actions';

async function handleAction() {
  const canCreate = await checkUserPermission('empresa', 'clientes', 'create');

  if (!canCreate) {
    toast.error('No tienes permiso para crear clientes');
    return;
  }

  // Proceder con la acción
}
```

### 3. Requerir Permiso (lanza error si no tiene)

```typescript
import { requirePermission } from '@/features/Permissions/actions';

async function serverAction() {
  'use server';

  // Lanza error si el usuario no tiene el permiso
  await requirePermission('empresa', 'clientes', 'delete');

  // Proceder con la acción
  await deleteClient(clientId);
}
```

### 4. Obtener Módulos Accesibles (para Sidebar)

```typescript
import { getUserAccessibleModules } from '@/features/Permissions/actions';

async function Sidebar() {
  const modules = await getUserAccessibleModules();

  return (
    <nav>
      {modules.map(module => (
        <Link key={module.module_id} href={`/dashboard/${module.module_slug}`}>
          {module.module_name}
        </Link>
      ))}
    </nav>
  );
}
```

---

## Ejemplos de Código

### Ejemplo 1: Crear un Rol Personalizado

```typescript
import { createRole, setRolePermissions } from '@/features/Permissions/actions';

async function createEditorRole() {
  // 1. Crear el rol
  const role = await createRole(
    'Editor de Contenido',
    'Puede ver y editar contenido, pero no eliminar',
    '#F59E0B' // Color naranja
  );

  // 2. Asignar permisos al rol
  await setRolePermissions(role.id, [
    { tabId: 'tab-clientes-uuid', actionId: 'action-view-uuid' },
    { tabId: 'tab-clientes-uuid', actionId: 'action-update-uuid' },
    { tabId: 'tab-empleados-uuid', actionId: 'action-view-uuid' },
  ]);
}
```

### Ejemplo 2: Asignar Múltiples Roles a un Usuario

```typescript
import { assignRoleToUser } from '@/features/Permissions/actions';

async function assignRolesToUser(userId: string) {
  // Asignar rol de Editor
  await assignRoleToUser(userId, 1); // roleId: 1

  // Asignar rol de Auditor
  await assignRoleToUser(userId, 3); // roleId: 3

  // El usuario ahora tiene permisos de ambos roles
}
```

### Ejemplo 3: Revocar Permiso Específico

```typescript
import { setUserPermission } from '@/features/Permissions/actions';

async function revokeDeletePermission(userId: string, tabId: string, actionId: string) {
  // Revocar permiso de eliminar aunque lo tenga por rol
  await setUserPermission(
    userId,
    tabId,
    actionId,
    false // is_granted = false
  );
}
```

### Ejemplo 4: Verificar Permisos en un Hook

```typescript
import { useQuery } from '@tanstack/react-query';
import { checkUserPermission } from '@/features/Permissions/actions';

function useCanCreateClients() {
  return useQuery({
    queryKey: ['permission', 'empresa', 'clientes', 'create'],
    queryFn: () => checkUserPermission('empresa', 'clientes', 'create'),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

function MyComponent() {
  const { data: canCreate, isLoading } = useCanCreateClients();

  if (isLoading) return <Skeleton />;

  return canCreate ? (
    <Button>Crear Cliente</Button>
  ) : (
    <p>No tienes permiso</p>
  );
}
```

---

## Estado Actual y Pendientes

### ✅ Implementado

- ✅ Estructura de base de datos completa
- ✅ Funciones SQL helper
- ✅ Actions del lado del cliente
- ✅ Componentes de gestión de permisos
- ✅ Asignación de roles a usuarios
- ✅ Permisos personalizados por usuario
- ✅ Gestión de roles (crear, editar, eliminar)
- ✅ Vista de permisos jerárquica
- ✅ PermissionGuard component
- ✅ Hooks de permisos

### ⚠️ Pendientes

- ⚠️ **Políticas RLS de seguridad**: Las políticas actuales son temporales y permiten acceso total
- ⚠️ **Integración con Sidebar**: Filtrar módulos según permisos del usuario
- ⚠️ **Middleware de rutas**: Proteger rutas basado en permisos
- ⚠️ **Auditoría**: Registrar cambios de permisos y roles
- ⚠️ **Tests**: Agregar tests unitarios y de integración
- ⚠️ **Documentación de API**: Documentar endpoints si se exponen

### 🔒 Seguridad Crítica

**ANTES DE PRODUCCIÓN:**

1. Reemplazar políticas RLS temporales por políticas basadas en permisos
2. Implementar middleware de protección de rutas
3. Validar permisos en todas las server actions
4. Auditar accesos y cambios de permisos
5. Implementar rate limiting en endpoints de permisos

---

## Convenciones y Mejores Prácticas

### Tipado

Seguir las convenciones de TypeScript del proyecto:

```typescript
// ✅ CORRECTO - Usar Awaited<ReturnType<typeof function>>
export type UserPermission = Awaited<ReturnType<typeof getUserPermissions>>[number];

// ❌ INCORRECTO - No usar tipos de database.types.ts directamente
type UserPermission = Database['public']['Tables']['user_permissions']['Row'];
```

### Fetching

```typescript
// ✅ CORRECTO - Client-side con useQuery
const { data: permissions } = useQuery({
  queryKey: ['user-permissions', userId],
  queryFn: () => getUserPermissions(),
});

// ❌ INCORRECTO - useEffect + useState
const [permissions, setPermissions] = useState([]);
useEffect(() => {
  getUserPermissions().then(setPermissions);
}, []);
```

### Invalidación de Queries

```typescript
// ✅ CORRECTO - Invalidar después de mutaciones
const mutation = useMutation({
  mutationFn: assignRoleToUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
    queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
  },
});
```

---

## Recursos Adicionales

- **Carpeta de inspiración**: `/rolesImplementation/` (contiene componentes de referencia)
- **Migraciones**: `/supabase/migrations/20251114140905_roles_and_fixes.sql`
- **Seeds**: `/supabase/seeds/seed-roles.sql`
- **Documentación de Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security

---

**Última actualización**: 2024-11-21
**Autor**: Sistema de Documentación CodeControl
