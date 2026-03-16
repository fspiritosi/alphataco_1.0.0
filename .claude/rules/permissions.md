# Sistema de Permisos y Tabs

## Principio Fundamental

**Todo elemento de interaccion (botones de Crear, Editar, Eliminar) debe estar protegido por permisos.**

## Arquitectura del Sistema

### Tablas de Base de Datos

- **`modules`**: Modulos principales (Dashboard, Empresa, Empleados, Equipos, etc.)
- **`tabs`**: Tabs/subtabs dentro de cada modulo (con `parent_tab_id` para jerarquia)
- **`actions`**: Acciones CRUD (`view`, `create`, `update`, `delete`)
- **`roles`**: Roles del sistema
- **`role_permissions`**: Permisos por rol (`role_id` + `tab_id` + `action_id`)
- **`user_permissions`**: Permisos personalizados por usuario (override)

### Archivos Clave

- **`src/features/Permissions/permissions-map.ts`**: Mapa de modulos/tabs/subtabs con `allowedActions`
- **`src/features/Permissions/components/PermissionGuard.tsx`**: Componente para proteger elementos
- **`src/features/Permissions/hooks/usePermissions.ts`**: Hook para verificar permisos

## Proteger Elementos con Permisos

### Usando PermissionGuard (recomendado para ocultar elementos)

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

### Usando usePermissions (para logica condicional)

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

## Deteccion Automatica de Botones Sin Proteger

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

## Checklist: Agregar Nueva Tab

### 1. Codigo Frontend

- [ ] Crear componente de la nueva tab
- [ ] Agregarlo al componente padre (TabsManagerServer/Client)
- [ ] Identificar botones/acciones que necesitan proteccion

### 2. Actualizar `permissions-map.ts`

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

### 3. Insertar Datos en Base de Datos (migracion Prisma con SQL custom)

Los inserts de datos (tabs, permisos) se hacen con una **migracion Prisma vacia** que contiene el SQL:

```bash
# 1. Crear migracion vacia
npx prisma migrate dev --create-only --name add_nueva_tab_permissions
# 2. Escribir el SQL en el archivo generado en prisma/migrations/
# 3. Aplicar la migracion
npx prisma migrate dev
# 4. Verificar con MCP supabase-LOCAL (readonly) que los datos se insertaron
```

**SQL de ejemplo para el archivo de migracion:**

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

### 4. Documentar SQL del Sistema de Permisos

**IMPORTANTE**: Solo documentar en `docs/desarrollo/03-notas-desarrollo.md` las queries **INSERT, UPDATE o DELETE** relacionadas con el **sistema de permisos y enrutado**:

- `tabs` - Nuevas tabs, modificaciones o eliminaciones
- `roles` - Cambios en roles
- `role_permissions` - Asignacion de permisos a roles
- `user_permissions` - Permisos personalizados por usuario

**NO documentar**: DDL (CREATE TABLE, ALTER TABLE, etc.) ni queries de otras tablas. Las migraciones de estructura se obtienen con otros comandos.

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
