# Análisis: Implementación de Herencia de Permisos

## Contexto

El sistema tiene tabs duplicadas que aparecen tanto en módulos principales como en vistas de detalle. Por ejemplo:

- **Módulo Documentación**: tab `documentos-de-empleados`
- **Detalle de Empleado**: subtab `documentacion-empleado`

El usuario desea que las tabs del detalle **hereden los permisos** de las tabs del módulo principal, evitando duplicación en el sistema de permisos.

## Estructura Actual

### 1. En `permissions-map.ts`

#### Módulo `empleados` → Tab `detalle-empleado`:

```typescript
'detalle-empleado': {
  slug: 'detalle-empleado',
  name: 'Detalle de Empleado',
  subtabs: {
    // ...
    'documentacion-empleado': {
      slug: 'documentacion-empleado',
      name: 'Documentación',
      tabId: '20000000-0000-0000-0000-000000000064',
      parent: 'detalle-empleado',
      allowedActions: ['view'],
    },
    // ...
  },
}
```

#### Módulo `documentacion`:

```typescript
documentacion: {
  slug: 'documentacion',
  tabs: {
    'documentos-de-empleados': {
      slug: 'documentos-de-empleados',
      name: 'Documentos de Empleados',
      tabId: '50000000-0000-0000-0000-000000000001',
      allowedActions: ['view', 'create'],
      subtabs: {}, // No tiene subtabs definidas, pero usa tabs del módulo empleados
    },
  },
}
```

#### Módulo `empleados` → Tab `documentos-de-empleados` (usado por documentacion):

```typescript
empleados: {
  tabs: {
    'documentos-de-empleados': {
      slug: 'documentos-de-empleados',
      subtabs: {
        'docs-empleados-permanentes': {
          slug: 'docs-empleados-permanentes',
          allowedActions: ['view', 'update'],
        },
        'docs-empleados-mensuales': {
          slug: 'docs-empleados-mensuales',
          allowedActions: ['view', 'update'],
        },
      },
    },
  },
}
```

### 2. En la Base de Datos

- Tab `documentacion-empleado` (id: `20000000-0000-0000-0000-000000000064`) en módulo `empleados`
- Tab `documentos-de-empleados` (id: `50000000-0000-0000-0000-000000000001`) en módulo `documentacion`

### 3. En los Componentes

#### `employee-tabs.tsx` (Detalle de Empleado):

```tsx
{
  value: 'documents',
  moduleSlug: 'empleados',
  tabSlug: 'documentacion-empleado',  // ← Debe heredar de documentacion/documentos-de-empleados
  content: documentsComponent,
}
```

#### `DocumentTable.tsx` (Componente usado en el detalle):

- Renderiza subtabs: `permanentes` y `mensuales`
- No tiene verificación de permisos actualmente

#### `DocumentosEmpleadosTabContent.tsx` (Módulo Documentación):

- Usa `PermissionGuardServer` con `module="documentacion"` `tab="documentos-de-empleados"`
- Las subtabs usan `moduleSlug: 'empleados'`, `tabSlug: 'docs-empleados-permanentes'` o `docs-empleados-mensuales`

## Cambios Necesarios

### 1. Frontend - `permissions-map.ts`

**Eliminar** la subtab `documentacion-empleado` de `empleados/detalle-empleado/subtabs` y agregar comentario indicando que hereda:

```typescript
'detalle-empleado': {
  // ...
  subtabs: {
    // ...
    // 'documentacion-empleado': HEREDA de 'documentacion/documentos-de-empleados'
    // Ver: src/features/Employees/EmpleadoID/components/employee-tabs.tsx
    // ...
  },
}
```

### 2. Backend - Base de Datos

**Eliminar** la tab `documentacion-empleado` de la tabla `tabs`:

- ID: `20000000-0000-0000-0000-000000000064`
- Slug: `documentacion-empleado`
- Módulo: `empleados`

**IMPORTANTE**: Verificar si hay permisos asignados a esta tab antes de eliminar (en `role_permissions` o `user_permissions`).

### 3. Frontend - Sistema de Verificación de Permisos

#### A. Crear función de herencia en `actionsServer.ts`:

```typescript
/**
 * Verifica permiso con soporte para herencia
 * Si no encuentra el permiso en el módulo/tab solicitado,
 * verifica en el módulo/tab padre configurado para herencia.
 */
export async function checkPermissionWithInheritance(
  moduleSlug: string,
  tabSlug: string,
  actionSlug: string,
  inheritedFrom?: { module: string; tab: string }
): Promise<boolean> {
  // Primero verificar permiso directo
  const directPermission = await checkPermissionServer(moduleSlug, tabSlug, actionSlug);
  if (directPermission) return true;

  // Si hay herencia configurada, verificar permiso heredado
  if (inheritedFrom) {
    return await checkPermissionServer(inheritedFrom.module, inheritedFrom.tab, actionSlug);
  }

  return false;
}
```

#### B. Mapa de herencia de permisos:

Crear un archivo `permission-inheritance-map.ts`:

```typescript
export const PERMISSION_INHERITANCE = {
  'empleados:detalle-empleado:documentacion-empleado': {
    module: 'documentacion',
    tab: 'documentos-de-empleados',
  },
  // Futuros casos de herencia...
} as const;
```

### 4. Frontend - Componentes

#### A. `employee-tabs.tsx`:

Cambiar la tab de documentación para usar herencia:

```tsx
{
  value: 'documents',
  moduleSlug: 'documentacion',  // ← Cambiar de 'empleados' a 'documentacion'
  tabSlug: 'documentos-de-empleados',  // ← Cambiar de 'documentacion-empleado' a 'documentos-de-empleados'
  content: documentsComponent,
}
```

**Nota**: El `TabsManagerClientSide` usará `canView('documentacion', 'documentos-de-empleados')` que verificará el permiso directamente.

#### B. `DocumentTable.tsx`:

Agregar verificaciones de permisos heredados usando `PermissionGuardServer`:

```tsx
<PermissionGuardServer module="documentacion" tab="documentos-de-empleados" action="create">
  <DocumentNav id_user={employee_id} onlyEmployees onlyNoMultiresource />
</PermissionGuardServer>
```

Para las subtabs, usar permisos de las subtabs correspondientes del módulo empleados (ya que esas subtabs existen en `empleados/documentos-de-empleados`).

### 5. Funciones SQL (si es necesario)

Si necesitamos soporte de herencia en el backend SQL, podríamos crear una función:

```sql
CREATE OR REPLACE FUNCTION user_has_permission_with_inheritance(
  p_user_id UUID,
  p_module_slug TEXT,
  p_tab_slug TEXT,
  p_action_slug TEXT,
  p_inherited_module_slug TEXT DEFAULT NULL,
  p_inherited_tab_slug TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar permiso directo
  IF user_has_permission(p_user_id, p_module_slug, p_tab_slug, p_action_slug) THEN
    RETURN TRUE;
  END IF;

  -- Si hay herencia configurada, verificar permiso heredado
  IF p_inherited_module_slug IS NOT NULL AND p_inherited_tab_slug IS NOT NULL THEN
    RETURN user_has_permission(p_user_id, p_inherited_module_slug, p_inherited_tab_slug, p_action_slug);
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Nota**: Por ahora, la herencia se puede manejar completamente en el frontend, pero si se necesita en el backend, esta función sería útil.

## Plan de Implementación

1. ✅ **Análisis completo** (este documento)
2. ✅ **Eliminar `documentacion-empleado` de `permissions-map.ts`** - Completado con comentario explicativo
3. ✅ **Eliminar tab de la base de datos** - Migración aplicada: `remove_documentacion_empleado_tab_inheritance`
4. ✅ **Actualizar `employee-tabs.tsx`** - Ahora usa `documentacion/documentos-de-empleados` directamente
5. ✅ **Actualizar `DocumentTable.tsx`** - Agregado `PermissionGuardServer` con permisos heredados
6. ⏳ **Probar flujo completo**: permisos, visibilidad, acciones

## Implementación Realizada

### Cambios en Frontend

1. **`src/features/Permissions/permissions-map.ts`**:

   - ✅ Eliminada la subtab `documentacion-empleado` de `empleados/detalle-empleado/subtabs`
   - ✅ Agregado comentario indicando que hereda de `documentacion/documentos-de-empleados`

2. **`src/features/Employees/EmpleadoID/components/employee-tabs.tsx`**:

   - ✅ Cambiado `moduleSlug` de `'empleados'` a `'documentacion'`
   - ✅ Cambiado `tabSlug` de `'documentacion-empleado'` a `'documentos-de-empleados'`
   - ✅ Agregado comentario explicando la herencia

3. **`src/app/dashboard/document/DocumentTable.tsx`**:
   - ✅ Agregado import de `PermissionGuardServer`
   - ✅ Reemplazado check de `role !== 'Invitado'` por `PermissionGuardServer` con permisos heredados
   - ✅ El botón de crear documentos ahora se protege con `documentacion/documentos-de-empleados/create`

### Cambios en Backend

1. **Migración SQL `remove_documentacion_empleado_tab_inheritance`**:
   - ✅ Eliminados permisos de usuario asociados a la tab
   - ✅ Eliminados permisos de roles asociados (si existían)
   - ✅ Eliminada la tab `documentacion-empleado` de la base de datos

### Funcionamiento de la Herencia

La herencia funciona de manera directa:

1. **Tab Principal**: Cuando `TabsManagerClientSide` verifica la visibilidad de la tab de documentación en el detalle de empleado, ahora verifica el permiso en `documentacion/documentos-de-empleados/view` en lugar de `empleados/documentacion-empleado/view`.

2. **Acciones**: Cuando se verifica un permiso de acción (como `create`), se verifica directamente en `documentacion/documentos-de-empleados/create`.

3. **Subtabs**: Las subtabs (`docs-empleados-permanentes`, `docs-empleados-mensuales`) ya usan los permisos correctos del módulo `empleados` donde están definidas, por lo que funcionan correctamente.

### Nota sobre Subtabs

Las subtabs (Permanentes y Mensuales) están definidas en el módulo `empleados` dentro de `documentos-de-empleados/subtabs`. Actualmente usan los permisos del módulo `empleados`, lo cual es correcto. Si en el futuro se necesita que también hereden del módulo `documentacion`, se podría considerar una implementación adicional, pero por ahora funciona correctamente.

## Consideraciones Importantes

1. **Compatibilidad hacia atrás**: Si hay usuarios con permisos asignados directamente a `documentacion-empleado`, necesitaremos migrarlos o eliminarlos.
2. **Subtabs**: Las subtabs (`docs-empleados-permanentes`, `docs-empleados-mensuales`) ya están en el módulo `empleados`, así que solo necesitamos heredar la tab principal.
3. **Otros casos similares**: Este mismo patrón se aplicará a:
   - `diagramas-empleado` (debe heredar de `empleados/diagrams`)
   - Tabs similares en el módulo de equipos
4. **Documentación**: Actualizar documentación del sistema de permisos para explicar la herencia.
