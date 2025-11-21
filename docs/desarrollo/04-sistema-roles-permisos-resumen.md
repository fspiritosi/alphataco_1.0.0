# Sistema de Roles y Permisos - Resumen Ejecutivo

## 🎯 ¿Qué es?

Sistema RBAC (Role-Based Access Control) con permisos personalizados que controla el acceso a módulos, tabs y acciones en CodeControl.

## 📊 Estructura en 3 Niveles

```
MÓDULO → TAB → ACCIÓN
  ↓       ↓       ↓
Empresa → Clientes → Ver/Crear/Editar/Eliminar
```

## 🔑 Conceptos Clave

### Roles

Grupos predefinidos de permisos que se asignan a usuarios.

**Roles del Sistema** (no editables):

- Super Admin, Admin, Auditor, CodeControlClient, Developer

**Roles Personalizados** (editables):

- Usuario, Invitado, Administrador, + cualquier rol custom

### Permisos

Combinación de: `módulo + tab + acción`

**Ejemplo:** `empresa/clientes/create` = "Crear clientes en el módulo Empresa"

### Jerarquía de Permisos

1. **Permisos Personalizados** (mayor prioridad)

   - Sobrescriben permisos de roles
   - Pueden conceder o revocar acceso

2. **Permisos de Roles**

   - Suma de todos los roles asignados
   - Un usuario puede tener múltiples roles

3. **Sin Acceso** (por defecto)

## 🗄️ Tablas Principales

| Tabla              | Descripción                                           |
| ------------------ | ----------------------------------------------------- |
| `modules`          | Módulos del sidebar (Dashboard, Empresa, etc.)        |
| `tabs`             | Pestañas dentro de módulos (con soporte para subtabs) |
| `actions`          | Acciones CRUD (view, create, update, delete)          |
| `roles`            | Roles disponibles                                     |
| `role_permissions` | Permisos de cada rol                                  |
| `user_roles`       | Roles asignados a usuarios                            |
| `user_permissions` | Permisos personalizados por usuario                   |

## 🎨 Vista de Gestión

**Ruta:** `/dashboard/company/actualCompany/user/[id]`

### Componentes Principales

1. **RoleSelector** - Asignar/remover roles
2. **ModulePermissions** - Gestionar permisos granulares
3. **RoleManager** - Crear/editar roles personalizados

## 💻 Uso en Código

### Proteger un Componente

```tsx
<PermissionGuard moduleSlug="empresa" tabSlug="clientes" actionSlug="create">
  <Button>Crear Cliente</Button>
</PermissionGuard>
```

### Verificar Permiso

```typescript
const canCreate = await checkUserPermission('empresa', 'clientes', 'create');
```

### Asignar Rol

```typescript
await assignRoleToUser(userId, roleId);
```

### Crear Permiso Personalizado

```typescript
await setUserPermission(userId, tabId, actionId, true);
```

## 📁 Archivos Importantes

```
src/features/
├── Permissions/
│   ├── actions.ts                    # API de permisos
│   ├── hooks/useUserPermissions.ts   # Hook principal
│   └── components/PermissionGuard.tsx
│
└── UserPermissionsManager/
    ├── UserPermissionsManager.tsx    # Vista principal
    └── components/
        ├── RoleSelector.tsx          # Asignación de roles
        ├── ModulePermissions.tsx     # Permisos granulares
        └── RoleManager.tsx           # Gestión de roles
```

## ⚠️ Pendientes Críticos

- [ ] Reemplazar políticas RLS temporales por políticas de seguridad
- [ ] Integrar con Sidebar para filtrar módulos
- [ ] Implementar middleware de protección de rutas
- [ ] Agregar auditoría de cambios

## 🔗 Documentación Completa

Ver: [04-sistema-roles-permisos.md](./04-sistema-roles-permisos.md)

---

**Última actualización**: 2024-11-21
