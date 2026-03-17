# Private Document Permissions — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar permisos `view_private` y `upload_private` para controlar acceso a tipos de documentos privados y sus documentos instanciados.

**Architecture:** 2 nuevas acciones (`view_private`, `upload_private`) ya insertadas en BD. Se agregan a `allowedActions` de 6 tabs existentes en `permissions-map.ts`. Cada server action que lista tipos/documentos llama `checkPermissionServer` una vez y pasa el resultado a `buildWhereClause` para filtrar `private: { not: true }` cuando el usuario no tiene permiso. UI protege botones de upload con `PermissionGuard` o condicional sobre `upload_private`.

**Tech Stack:** Prisma (where clauses), `checkPermissionServer` (RPC), `permissions-map.ts` (tipado), `PermissionGuard` (UI)

**Pre-requisito completado:** SQL ejecutado en BD — 2 acciones + 9 role_permissions para admin.

---

## Mapping de referencia

| `applies` / contexto   | Tab slug para `view_private` | Tab slug para `upload_private` |
| ---------------------- | ---------------------------- | ------------------------------ |
| `Persona` (tipos docs) | `tipos-docs-personas`        | N/A                            |
| `Equipos` (tipos docs) | `tipos-docs-equipos`         | N/A                            |
| `Empresa` (tipos docs) | `tipos-docs-empresa`         | N/A                            |
| Empleados (docs)       | `documentos-de-empleados`    | `documentos-de-empleados`      |
| Equipos (docs)         | `documentos-de-equipos`      | `documentos-de-equipos`        |
| Empresa (docs)         | `documentos-de-empresa`      | `documentos-de-empresa`        |
| Dashboard empleados    | `documentos-de-empleados`    | N/A                            |
| Dashboard vehículos    | `documentos-de-equipos`      | N/A                            |

---

## Task 1: permissions-map.ts — Registrar nuevas acciones

**Files:**

- Modify: `src/features/Permissions/permissions-map.ts`

- [ ] **Step 1: Agregar acciones al objeto ACTIONS**

```typescript
// En ACTIONS (línea ~24), agregar:
export const ACTIONS = {
  view: { slug: 'view', name: 'Ver' },
  create: { slug: 'create', name: 'Crear' },
  update: { slug: 'update', name: 'Editar' },
  delete: { slug: 'delete', name: 'Eliminar' },
  view_all_requests: { slug: 'view_all_requests', name: 'Ver todas las solicitudes' },
  view_private: { slug: 'view_private', name: 'Ver privados' },
  upload_private: { slug: 'upload_private', name: 'Subir privados' },
} as const;
```

- [ ] **Step 2: Agregar acciones a allowedActions de 6 tabs del módulo documentacion**

Tabs padre (agregar `view_private` + `upload_private`):

- `documentos-de-empleados` (línea ~760): `allowedActions: ['view', 'create', 'view_private', 'upload_private']`
- `documentos-de-equipos` (línea ~783): `allowedActions: ['view', 'create', 'view_private', 'upload_private']`
- `documentos-de-empresa` (línea ~806): `allowedActions: ['view', 'create', 'view_private', 'upload_private']`

Tabs de tipos (solo `view_private`):

- `tipos-docs-personas` (línea ~836): `allowedActions: ['view', 'update', 'create', 'view_private']`
- `tipos-docs-equipos` (línea ~843): `allowedActions: ['view', 'update', 'create', 'view_private']`
- `tipos-docs-empresa` (línea ~850): `allowedActions: ['view', 'update', 'create', 'view_private']`

- [ ] **Step 3: Verificar tipos** — `npm run check-types`

---

## Task 2: RolePermissionsEditor — Iconos, labels y dependencias

**Files:**

- Modify: `src/features/UserPermissionsManager/components/RolePermissionsEditor.tsx`

- [ ] **Step 1: Agregar iconos, labels y colores para las nuevas acciones**

```typescript
import { EyeOff, Upload } from 'lucide-react';

const ACTION_ICONS = {
  // ...existentes...
  view_private: EyeOff,
  upload_private: Upload,
};

const ACTION_LABELS = {
  // ...existentes...
  view_private: 'Ver Privados',
  upload_private: 'Subir Privados',
};

const ACTION_COLORS = {
  // ...existentes...
  view_private: 'text-indigo-600',
  upload_private: 'text-teal-600',
};
```

- [ ] **Step 2: Agregar lógica de dependencia en `togglePermission`**

En la función `togglePermission`, después de la lógica existente de auto-assign view (línea ~153), agregar:

```typescript
// AUTO-ASSIGN view_private: Si agregamos upload_private, también agregar view_private
if (isAdding && actionSlug === 'upload_private') {
  const viewPrivateAction = targetTab?.actions?.find((a) => a.slug === 'view_private');
  if (viewPrivateAction) {
    const vpKey = `${tabId}:${viewPrivateAction.id}`;
    if (!permissionSet.has(vpKey)) newPermissions.push({ tabId, actionId: viewPrivateAction.id });
  }
}

// AUTO-REMOVE upload_private: Si removemos view_private, también remover upload_private
if (!isAdding && actionSlug === 'view_private') {
  const uploadPrivateAction = targetTab?.actions?.find((a) => a.slug === 'upload_private');
  if (uploadPrivateAction) {
    const upKey = `${tabId}:${uploadPrivateAction.id}`;
    newPermissions = newPermissions.filter((p) => !(p.tabId === tabId && p.actionId === uploadPrivateAction.id));
  }
}
```

También bloquear remoción de `view_private` si `upload_private` está activo (misma lógica que view/update):

```typescript
// En la sección donde verifica si se puede remover 'view' (línea ~124), agregar caso para view_private:
if (!isAdding && actionSlug === 'view_private') {
  const hasUploadPrivate = targetTab?.actions?.some((a) => {
    if (a.slug !== 'upload_private') return false;
    return permissionSet.has(`${tabId}:${a.id}`);
  });
  if (hasUploadPrivate) return; // No permitir remover view_private si upload_private está activo
}
```

- [ ] **Step 3: Verificar tipos** — `npm run check-types`

---

## Task 3: TiposDocumentos — Filtrar tipos privados

**Files:**

- Modify: `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts`

- [ ] **Step 1: Agregar import y mapping**

```typescript
import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import type { document_applies } from '@/generated/prisma';

const PRIVATE_PERMISSION_TAB: Record<string, string> = {
  Persona: 'tipos-docs-personas',
  Equipos: 'tipos-docs-equipos',
  Empresa: 'tipos-docs-empresa',
};
```

- [ ] **Step 2: Crear helper para obtener filtro de privados**

```typescript
async function getPrivateFilter(applies: document_applies) {
  const tabSlug = PRIVATE_PERMISSION_TAB[applies];
  if (!tabSlug) return {};
  const canViewPrivate = await checkPermissionServer('documentacion', tabSlug, 'view_private');
  return canViewPrivate ? {} : { private: { not: true } };
}
```

- [ ] **Step 3: Integrar en buildWhereClause**

Cambiar `buildWhereClause` a `async` y agregar el filtro:

```typescript
async function buildWhereClause(companyId: string, applies: document_applies, state: ParsedSearchParams) {
  const privateFilter = await getPrivateFilter(applies);
  return {
    company_id: companyId,
    applies,
    ...privateFilter, // ← { private: { not: true } } si no tiene permiso
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...boolFilters,
  };
}
```

- [ ] **Step 4: Actualizar todos los callers de buildWhereClause para usar await**

Las funciones `getDocTypesPaginated`, `getDocTypesForExport`, y `getDocTypesSingleFacet` ya son async, solo agregar `await` antes de `buildWhereClause(...)`.

- [ ] **Step 5: Verificar tipos** — `npm run check-types`

---

## Task 4: DocumentosEmpleados — Filtrar docs de tipos privados

**Files:**

- Modify: `src/features/Documentacion/DocumentosEmpleados/Permanentes/actions.server.ts`
- Modify: `src/features/Documentacion/DocumentosEmpleados/Mensuales/actions.server.ts`

- [ ] **Step 1: Permanentes — agregar filtro de privados**

Import:

```typescript
import { checkPermissionServer } from '@/features/Permissions/actionsServer';
```

Cambiar `buildWhereClause` a `async` y agregar dentro del objeto `document_types`:

```typescript
async function buildWhereClause(companyId, state, employeeId?) {
  const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-empleados', 'view_private');
  return {
    // ...existente...
    document_types: {
      is_it_montlhy: false,
      ...(!canViewPrivate && { private: { not: true } }), // ← NUEVO
      // ...filtros existentes de mandatory, multiresource...
    },
    // ...resto existente...
  };
}
```

Actualizar callers con `await`.

- [ ] **Step 2: Mensuales — mismo patrón**

Leer el archivo de Mensuales, aplicar el mismo cambio en su `buildWhereClause` (agregar `private: { not: true }` dentro de `document_types` cuando no tiene permiso).

- [ ] **Step 3: Verificar tipos** — `npm run check-types`

---

## Task 5: DocumentosEquipos — Filtrar docs de tipos privados

**Files:**

- Modify: `src/features/Documentacion/DocumentosEquipos/Permanentes/actions.server.ts`
- Modify: `src/features/Documentacion/DocumentosEquipos/Mensuales/actions.server.ts`

- [ ] **Step 1: Permanentes — mismo patrón que Task 4**

Tab slug: `'documentos-de-equipos'`

- [ ] **Step 2: Mensuales — mismo patrón**

- [ ] **Step 3: Verificar tipos** — `npm run check-types`

---

## Task 6: DocumentosEmpresa — Reemplazar hardcode por check dinámico

**Files:**

- Modify: `src/features/Documentacion/DocumentosEmpresa/actions.server.ts`

- [ ] **Step 1: Reemplazar `private: false` hardcoded**

Import `checkPermissionServer`. Cambiar `buildWhereClause` a `async`.

Reemplazar (línea ~204):

```typescript
// ANTES:
private: false,

// DESPUES:
...(!canViewPrivate && { private: { not: true } }),
```

Donde `canViewPrivate` se obtiene al inicio de `buildWhereClause`:

```typescript
const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-empresa', 'view_private');
```

- [ ] **Step 2: Verificar tipos** — `npm run check-types`

---

## Task 7: Dashboard vencimientos — Excluir docs privados

**Files:**

- Modify: `src/features/Dashboard/Documentacion/Empleados/actions.server.ts`
- Modify: `src/features/Dashboard/Documentacion/Vehiculos/actions.server.ts`

- [ ] **Step 1: Empleados — agregar filtro en buildWhereClause**

```typescript
import { checkPermissionServer } from '@/features/Permissions/actionsServer';

// En buildWhereClause (async):
const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-empleados', 'view_private');
// Agregar en document_types:
document_types: {
  is_it_montlhy: false,
  ...(!canViewPrivate && { private: { not: true } }),
},
```

- [ ] **Step 2: Vehículos — mismo patrón**

Tab slug: `'documentos-de-equipos'`

- [ ] **Step 3: Verificar tipos** — `npm run check-types`

---

## Task 8: Selector de tipos al subir documento

**Files:**

- Modify: `src/features/Employees/EmpleadoID/lib/actions/document-actions.ts`

- [ ] **Step 1: Filtrar tipos privados del dropdown**

La función `fetchDocumentTypes()` trae todos los tipos. Agregar filtro:

```typescript
import { checkPermissionServer } from '@/features/Permissions/actionsServer';

export async function fetchDocumentTypes() {
  const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-empleados', 'view_private');

  // En la query, agregar filtro:
  // Si usa Supabase: .eq('private', false) cuando !canViewPrivate
  // Si usa Prisma: where: { ...(!canViewPrivate && { private: { not: true } }) }
}
```

Nota: esta función actualmente usa Supabase directo. Aplicar el filtro con `.eq('private', false)` si `!canViewPrivate`, o migrar a Prisma si es oportuno.

- [ ] **Step 2: Verificar tipos** — `npm run check-types`

---

## Task 9: UI — Proteger botón "Subir documento" para docs privados

**Files:**

- Modify: `src/features/Documentacion/DocumentosEmpleados/Permanentes/columns.tsx`
- Modify: `src/features/Documentacion/DocumentosEmpleados/Mensuales/columns.tsx` (si tiene botón upload)
- Modify: `src/features/Documentacion/DocumentosEquipos/Permanentes/columns.tsx`
- Modify: `src/features/Documentacion/DocumentosEquipos/Mensuales/columns.tsx` (si tiene botón upload)
- Modify: `src/features/Documentacion/DocumentosEmpresa/` columns (si aplica)

- [ ] **Step 1: Entender patrón actual**

Actualmente el botón "Subir documento" está protegido con `PermissionGuard` para la acción `update`. Para docs privados necesitamos verificar ADICIONALMENTE si el usuario tiene `upload_private`.

El `select` de la query de documentos debe incluir `document_types.private` para saber si el doc es de tipo privado.

- [ ] **Step 2: Agregar `private` al select de document_types en las queries**

En cada `actions.server.ts` de documentos, verificar que el `select` de la relación `document_types` incluya `private`:

```typescript
select: {
  // ...campos existentes...
  document_types: {
    select: { id: true, name: true, mandatory: true, multiresource: true, explired: true, is_it_montlhy: true, private: true },
    //                                                                                                          ^^^^^^^^^ NUEVO
  },
}
```

- [ ] **Step 3: Agregar PermissionGuard adicional para upload_private**

En `ActionsCell` de cada columns.tsx, envolver el botón de upload con lógica adicional:

```tsx
// Dentro de ActionsCell, donde se renderiza el botón "Subir documento":
const isPrivateDocType = row.original.document_types?.private === true;

{
  /* Si NO es privado → PermissionGuard normal con action="update" */
}
{
  /* Si ES privado → PermissionGuard con action="upload_private" en la tab padre */
}
{
  !isPrivateDocType ? (
    <PermissionGuard module="documentacion" tab="docs-empleados-permanentes" action="update">
      <Button>Subir documento</Button>
    </PermissionGuard>
  ) : (
    <PermissionGuard module="documentacion" tab="documentos-de-empleados" action="upload_private">
      <Button>Subir documento</Button>
    </PermissionGuard>
  );
}
```

- [ ] **Step 4: Verificar tipos** — `npm run check-types`

---

## Task 10: Verificación integral

- [ ] **Step 1: Verificar tipos y lint**

```bash
npm run check-types
npm run lint
```

- [ ] **Step 2: Verificar en browser**

1. Login como admin → debe ver documentos privados en todas las listas
2. Login como usuario sin permiso `view_private` → no debe ver documentos privados
3. Verificar que el Role Editor muestra los checkboxes de "Ver Privados" y "Subir Privados"
4. Verificar dependencias: marcar "Subir Privados" auto-marca "Ver Privados"
5. Verificar dashboard de vencimientos filtra correctamente
