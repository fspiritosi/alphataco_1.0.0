# Schema de Base de Datos - Sistema de Permisos

Este documento explica la estructura de la base de datos para el sistema de permisos en Supabase.

## Estructura de Tablas

### 1. **modules** - Módulos del Sistema

Representa los items del sidebar (Dashboard, Usuarios, Productos, etc.)

\`\`\`sql

- id: UUID (PK)
- name: VARCHAR(100) - Nombre del módulo
- slug: VARCHAR(100) - Identificador único (ej: "dashboard")
- icon: VARCHAR(50) - Nombre del ícono
- description: TEXT - Descripción opcional
- order_index: INTEGER - Orden de visualización
- is_active: BOOLEAN - Si está activo
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
  \`\`\`

### 2. **tabs** - Pestañas dentro de Módulos

Cada módulo tiene múltiples tabs que agrupan contenido

\`\`\`sql

- id: UUID (PK)
- module_id: UUID (FK → modules)
- name: VARCHAR(100) - Nombre de la tab
- slug: VARCHAR(100) - Identificador único
- description: TEXT - Descripción opcional
- order_index: INTEGER - Orden de visualización
- is_active: BOOLEAN - Si está activa
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
  \`\`\`

### 3. **actions** - Acciones CRUD

Las 4 acciones disponibles: Ver, Crear, Editar, Eliminar

\`\`\`sql

- id: UUID (PK)
- name: VARCHAR(50) - Nombre de la acción
- slug: VARCHAR(50) - Identificador único (view, create, update, delete)
- description: TEXT - Descripción opcional
- created_at: TIMESTAMP
  \`\`\`

### 4. **roles** - Roles/Presets

Grupos predefinidos de permisos

\`\`\`sql

- id: UUID (PK)
- name: VARCHAR(100) - Nombre del role
- slug: VARCHAR(100) - Identificador único
- description: TEXT - Descripción del role
- color: VARCHAR(20) - Color para la UI
- is_system: BOOLEAN - Si es un role del sistema (no se puede eliminar)
- is_active: BOOLEAN - Si está activo
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
  \`\`\`

### 5. **role_permissions** - Permisos de Roles

Define qué puede hacer cada role en cada tab

\`\`\`sql

- id: UUID (PK)
- role_id: UUID (FK → roles)
- tab_id: UUID (FK → tabs)
- action_id: UUID (FK → actions)
- created_at: TIMESTAMP
  \`\`\`

### 6. **user_roles** - Asignación de Roles a Usuarios

Qué roles tiene cada usuario

\`\`\`sql

- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- role_id: UUID (FK → roles)
- assigned_by: UUID (FK → auth.users) - Quién asignó el role
- assigned_at: TIMESTAMP
  \`\`\`

### 7. **user_permissions** - Permisos Personalizados

Permisos específicos por usuario (excepciones)

\`\`\`sql

- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- tab_id: UUID (FK → tabs)
- action_id: UUID (FK → actions)
- is_granted: BOOLEAN - true = conceder, false = revocar
- assigned_by: UUID (FK → auth.users)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
  \`\`\`

## Jerarquía de Permisos

\`\`\`
MÓDULO (Dashboard, Usuarios, Productos...)
└── TAB (Lista, Permisos, Actividad...)
└── ACCIÓN (Ver, Crear, Editar, Eliminar)
\`\`\`

## Cómo Funcionan los Permisos

1. **Permisos por Role**: Un usuario tiene roles asignados (ej: "Editor")
2. **Permisos del Role**: Cada role tiene permisos predefinidos en `role_permissions`
3. **Permisos Personalizados**: Se pueden agregar excepciones en `user_permissions`
4. **Resultado Final**: La suma de permisos de roles + permisos personalizados

## Funciones SQL Helper

### `get_user_permissions(user_id)`

Obtiene TODOS los permisos de un usuario (roles + personalizados)

### `user_has_permission(user_id, module_slug, tab_slug, action_slug)`

Verifica si un usuario tiene un permiso específico

### `get_user_accessible_modules(user_id)`

Obtiene los módulos a los que el usuario tiene acceso

### `get_role_permissions_summary(role_id)`

Obtiene un resumen de permisos de un role

## Instalación

1. Ejecuta los scripts en orden:

   - `01-create-permissions-schema.sql` - Crea las tablas
   - `02-seed-permissions-data.sql` - Inserta datos iniciales
   - `03-create-rls-policies.sql` - Configura seguridad RLS
   - `04-create-helper-functions.sql` - Crea funciones helper

2. Configura las variables de entorno:
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL=tu_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
   \`\`\`

## Ejemplo de Uso

\`\`\`typescript
// Obtener todos los permisos de un usuario
const permissions = await getAllUserPermissions(userId)

// Verificar un permiso específico
const canEdit = await checkUserPermission(
userId,
'products',
'catalog',
'update'
)

// Asignar un role a un usuario
await assignRoleToUser(userId, roleId, adminId)

// Crear un permiso personalizado
await setUserPermission(userId, tabId, actionId, true, adminId)
\`\`\`

## Seguridad (RLS)

Todas las tablas tienen Row Level Security (RLS) habilitado:

- Los usuarios pueden ver sus propios permisos
- Solo los administradores pueden modificar permisos
- Los roles del sistema no se pueden eliminar
