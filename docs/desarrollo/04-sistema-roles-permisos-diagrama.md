# Sistema de Roles y Permisos - Diagramas

## 🏗️ Arquitectura de Base de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTRUCTURA DE PERMISOS                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   modules    │  Módulos del sistema (Dashboard, Empresa, etc.)
│──────────────│
│ id           │
│ slug         │  "empresa", "empleados", "dashboard"
│ name         │  "Empresa", "Empleados", "Dashboard"
│ icon         │  "Building2", "Users", "LayoutDashboard"
│ order_index  │
│ is_active    │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│     tabs     │  Pestañas dentro de módulos (con jerarquía)
│──────────────│
│ id           │
│ module_id    │──────┐
│ parent_tab_id│──┐   │  Permite subtabs (auto-referencia)
│ slug         │  │   │
│ name         │  │   │
│ order_index  │  │   │
│ is_active    │  │   │
└──────┬───────┘  │   │
       │          │   │
       │ N:N      │   │
       ▼          │   │
┌──────────────┐  │   │
│   actions    │  │   │  Acciones CRUD
│──────────────│  │   │
│ id           │  │   │
│ slug         │  │   │  "view", "create", "update", "delete"
│ name         │  │   │  "Ver", "Crear", "Editar", "Eliminar"
└──────────────┘  │   │
                  │   │
                  │   │
┌─────────────────┴───┴──────────────────────────────────────────┐
│                    SISTEMA DE ROLES                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    roles     │  Roles/Presets de permisos
│──────────────│
│ id           │
│ slug         │  "super-admin", "editor", "viewer"
│ name         │  "Super Admin", "Editor", "Visor"
│ description  │
│ color        │  "#DC2626", "#3B82F6"
│ is_system    │  true/false (protege roles del sistema)
│ is_active    │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│ role_permissions │  Permisos de cada rol
│──────────────────│
│ id               │
│ role_id          │────┐
│ tab_id           │────┼──┐
│ action_id        │────┼──┼──┐
└──────────────────┘    │  │  │
                        │  │  │
                        │  │  │
┌───────────────────────┴──┴──┴──────────────────────────────────┐
│                    PERMISOS DE USUARIOS                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ auth.users   │  Usuarios de Supabase Auth
│──────────────│
│ id           │
│ email        │
└──────┬───────┘
       │
       ├─────────────────┐
       │                 │
       │ N:N             │ N:N
       ▼                 ▼
┌──────────────┐   ┌────────────────┐
│ user_roles   │   │user_permissions│  Permisos personalizados
│──────────────│   │────────────────│  (sobrescriben roles)
│ id           │   │ id             │
│ user_id      │   │ user_id        │
│ role_id      │   │ tab_id         │
│ assigned_by  │   │ action_id      │
│ assigned_at  │   │ is_granted     │  true = conceder, false = revocar
└──────────────┘   │ assigned_by    │
                   └────────────────┘
```

## 🔄 Flujo de Resolución de Permisos

```
┌─────────────────────────────────────────────────────────────────┐
│              ¿Usuario tiene permiso X?                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Usuario    │
                    └──────┬───────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │ ¿Tiene permiso personalizado? │
            └──────┬───────────────┬────────┘
                   │               │
              SÍ   │               │  NO
                   ▼               ▼
         ┌─────────────────┐   ┌──────────────────┐
         │ is_granted?     │   │ ¿Tiene roles     │
         └─────┬─────┬─────┘   │  asignados?      │
               │     │         └────┬─────────┬───┘
          true │     │ false        │         │
               │     │         SÍ   │         │  NO
               ▼     ▼              ▼         ▼
         ┌─────┐ ┌─────┐    ┌──────────┐  ┌─────┐
         │ ✅  │ │ ❌  │    │ Verificar│  │ ❌  │
         │TIENE│ │ NO  │    │ permisos │  │ NO  │
         │     │ │TIENE│    │ de roles │  │TIENE│
         └─────┘ └─────┘    └────┬─────┘  └─────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
               SÍ   │                         │  NO
                    ▼                         ▼
              ┌─────────┐               ┌─────────┐
              │   ✅    │               │   ❌    │
              │  TIENE  │               │ NO TIENE│
              └─────────┘               └─────────┘

PRIORIDAD:
1. Permisos Personalizados (user_permissions)
2. Permisos de Roles (role_permissions + user_roles)
3. Sin Acceso (por defecto)
```

## 🎯 Jerarquía de Tabs

```
┌─────────────────────────────────────────────────────────────────┐
│                    EJEMPLO: MÓDULO EMPRESA                       │
└─────────────────────────────────────────────────────────────────┘

Empresa (módulo)
│
├── General (tab principal)
│   ├── Ver ✅
│   ├── Crear ✅
│   ├── Editar ✅
│   └── Eliminar ❌
│
├── Clientes (tab principal)
│   ├── Ver ✅
│   ├── Crear ✅
│   ├── Editar ✅
│   ├── Eliminar ✅
│   │
│   ├── Lista (subtab)
│   │   ├── Ver ✅
│   │   ├── Crear ✅
│   │   ├── Editar ✅
│   │   └── Eliminar ✅
│   │
│   └── Servicios (subtab)
│       ├── Ver ✅
│       ├── Crear ✅
│       ├── Editar ❌
│       └── Eliminar ❌
│
└── Usuarios (tab principal)
    ├── Ver ✅
    ├── Crear ❌
    ├── Editar ❌
    └── Eliminar ❌
```

## 🎨 Flujo de Asignación de Permisos (UI)

```
┌─────────────────────────────────────────────────────────────────┐
│          Vista: /dashboard/company/actualCompany/user/[id]      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  UserPermissionsManager                                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Usuario: Juan Pérez (juan@example.com)                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ RoleSelector - Asignar Roles                              │ │
│  │                                                           │ │
│  │  ☑ Super Admin (5 permisos) [Sistema]                    │ │
│  │  ☐ Editor (12 permisos) [Personalizado]                  │ │
│  │  ☑ Auditor (8 permisos) [Sistema]                        │ │
│  │  ☐ Usuario (10 permisos) [Personalizado]                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ModulePermissions - Permisos Granulares                   │ │
│  │                                                           │ │
│  │  ▼ Empresa (15/20 permisos)                              │ │
│  │    ▼ Clientes (8/8 permisos)                             │ │
│  │      ☑ Ver  ☑ Crear  ☑ Editar  ☑ Eliminar               │ │
│  │      ▼ Lista (4/4 permisos)                              │ │
│  │        ☑ Ver  ☑ Crear  ☑ Editar  ☑ Eliminar             │ │
│  │                                                           │ │
│  │    ▼ Usuarios (3/8 permisos)                             │ │
│  │      ☑ Ver  ☐ Crear  ☐ Editar  ☐ Eliminar               │ │
│  │                                                           │ │
│  │  ▼ Empleados (12/16 permisos)                            │ │
│  │    ...                                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Ejemplo de Resolución de Permisos

```
┌─────────────────────────────────────────────────────────────────┐
│  Usuario: Juan Pérez                                            │
│  Roles: [Editor, Auditor]                                       │
└─────────────────────────────────────────────────────────────────┘

PASO 1: Permisos de Roles
─────────────────────────────────────────────────────────────────
Rol "Editor":
  ✅ empresa/clientes/view
  ✅ empresa/clientes/create
  ✅ empresa/clientes/update
  ✅ empresa/clientes/delete

Rol "Auditor":
  ✅ empresa/clientes/view
  ❌ empresa/clientes/create
  ❌ empresa/clientes/update
  ❌ empresa/clientes/delete

SUMA de roles:
  ✅ empresa/clientes/view      (Editor + Auditor)
  ✅ empresa/clientes/create    (Editor)
  ✅ empresa/clientes/update    (Editor)
  ✅ empresa/clientes/delete    (Editor)

PASO 2: Permisos Personalizados (sobrescriben)
─────────────────────────────────────────────────────────────────
  ❌ empresa/clientes/delete = false  (REVOCADO)

RESULTADO FINAL:
─────────────────────────────────────────────────────────────────
  ✅ empresa/clientes/view
  ✅ empresa/clientes/create
  ✅ empresa/clientes/update
  ❌ empresa/clientes/delete    (revocado por permiso personalizado)
```

## 📊 Estadísticas del Sistema Actual

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTADO ACTUAL                                │
└─────────────────────────────────────────────────────────────────┘

Tablas Implementadas:        7/7  ✅
Funciones SQL:               3/3  ✅
Actions Frontend:           20/20 ✅
Componentes UI:              5/5  ✅
Hooks:                       1/1  ✅

Políticas RLS:               ⚠️  TEMPORALES (permitir todo)
Middleware de Rutas:         ❌  PENDIENTE
Integración Sidebar:         ❌  PENDIENTE
Auditoría:                   ❌  PENDIENTE
Tests:                       ❌  PENDIENTE

CRÍTICO ANTES DE PRODUCCIÓN:
  ⚠️  Reemplazar políticas RLS temporales
  ⚠️  Implementar middleware de protección
  ⚠️  Validar permisos en server actions
```

---

**Ver documentación completa:** [04-sistema-roles-permisos.md](./04-sistema-roles-permisos.md)
