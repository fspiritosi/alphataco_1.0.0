# COD-325: Soft Delete de Usuarios Invitados — Plan de Implementacion

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar la eliminacion de usuarios invitados de hard delete a soft delete (ban en Supabase Auth), con flujo bidireccional empleado-usuario y fixes de auditoria de la tabla.

**Architecture:** Server actions con Prisma + Supabase Admin API para ban/unban. Componente compartido `TerminationFormFields` reutilizado desde tabla de usuarios y detalle de empleado. DataTable migrado a client-side navigation + lazy-load facets.

**Tech Stack:** Prisma, Supabase Admin API, React Hook Form + Zod, DataTable (client-side nav), moment.js

**Spec:** `docs/superpowers/specs/2026-03-12-soft-delete-invited-users-design.md`

---

## File Structure

| Archivo                                                                   | Accion        | Responsabilidad                                                        |
| ------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| `src/features/Employees/components/shared/TerminationFormFields.tsx`      | CREAR         | Campos reutilizables de baja (reason + date) + schema Zod exportado    |
| `src/features/Employees/EmpleadoID/components/employee-quick-actions.tsx` | MODIFICAR     | Usar TerminationFormFields compartido, fix date-fns→moment             |
| `src/features/Empresa/Usuarios/actions.server.ts`                         | MODIFICAR     | banUser, unbanUser, singleFacet, is_active en queries, tipos inferidos |
| `src/features/Empresa/Usuarios/table/columns.tsx`                         | MODIFICAR     | Columna is_active, legajo, DataTableColumnHeader en role, filterFn     |
| `src/features/Empresa/Usuarios/table/_UsersDataTable.tsx`                 | MODIFICAR     | Client-side nav, lazy-load facets, currentParams, export               |
| `src/features/Empresa/Usuarios/table/UserStatusCell.tsx`                  | CREAR         | Reemplaza DeleteUserCell — ban/reactivar con cascada a empleado        |
| `src/features/Empresa/Usuarios/table/DeleteUserCell.tsx`                  | ELIMINAR      | Reemplazado por UserStatusCell                                         |
| `src/features/Empresa/Usuarios/table/UsersTableList.tsx`                  | SIN CAMBIOS   | Ya tiene stripPrefix y Card wrapper correctos                          |
| `src/app/login/componentsLogin/LoginButton.tsx`                           | MODIFICAR     | Manejar error "User is banned", fix console.error→logger, fix :any     |
| Migracion SQL                                                             | CREAR via MCP | ALTER TABLE share_company_users ADD COLUMN is_active                   |

---

## Chunk 1: Fundamentos (migracion + componente compartido + login)

### Task 1: Migracion de BD — agregar is_active a share_company_users

**Files:**

- Migracion SQL via MCP supabase-LOCAL

- [ ] **Step 1: Aplicar migracion**

Usar MCP supabase-LOCAL `apply_migration` con nombre `add_is_active_to_share_company_users`:

```sql
ALTER TABLE share_company_users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

- [ ] **Step 2: Regenerar tipos Prisma**

Run: `npx prisma db pull && npx prisma generate`

- [ ] **Step 3: Verificar que el campo aparece en el schema**

Buscar `is_active` en el modelo `share_company_users` de `prisma/schema.prisma`.

- [ ] **Step 4: Commit**

```
feat(db): add is_active column to share_company_users for soft delete
```

---

### Task 2: Crear TerminationFormFields (componente compartido)

**Files:**

- Create: `src/features/Employees/components/shared/TerminationFormFields.tsx`
- Modify: `src/features/Employees/EmpleadoID/components/employee-quick-actions.tsx`

- [ ] **Step 1: Crear el componente compartido**

```typescript
// src/features/Employees/components/shared/TerminationFormFields.tsx
'use client';

import { Calendar } from '@/components/ui/calendar';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

// ── Schema Zod exportado para reutilizar ─────────────────────────────────────
export const terminationSchema = z.object({
  reason_for_termination: z.string({ required_error: 'La razon de baja es requerida.' }),
  termination_date: z.date({ required_error: 'La fecha de baja es requerida.' }),
});

export type TerminationFormValues = z.infer<typeof terminationSchema>;

// ── Opciones de motivo de baja ───────────────────────────────────────────────
export const TERMINATION_REASONS = [
  'Despido sin causa',
  'Renuncia',
  'Despido con causa',
  'Acuerdo de partes',
  'Fin de contrato',
  'Fallecimiento',
] as const;

// ── Componente de campos ─────────────────────────────────────────────────────
interface TerminationFormFieldsProps {
  form: UseFormReturn<TerminationFormValues>;
}

export function TerminationFormFields({ form }: TerminationFormFieldsProps) {
  const [dateInputValue, setDateInputValue] = useState('');

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateInputValue(value);

    // Intentar parsear la fecha escrita (DD/MM/YYYY)
    const parsed = moment(value, 'DD/MM/YYYY', true);
    if (parsed.isValid() && parsed.isSameOrBefore(moment(), 'day')) {
      form.setValue('termination_date', parsed.toDate(), { shouldValidate: true });
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      form.setValue('termination_date', date, { shouldValidate: true });
      setDateInputValue(moment(date).format('DD/MM/YYYY'));
    }
  };

  return (
    <>
      <FormField
        control={form.control}
        name="reason_for_termination"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Motivo de Baja</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la razon" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TERMINATION_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Elige la razon por la que deseas dar de baja</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="termination_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Fecha de Baja</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input
                  placeholder="DD/MM/YYYY"
                  value={dateInputValue || (field.value ? moment(field.value).format('DD/MM/YYYY') : '')}
                  onChange={handleDateInputChange}
                  className="flex-1"
                />
              </FormControl>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex items-center justify-center rounded-md border border-input bg-background px-3 hover:bg-accent',
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={handleCalendarSelect}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <FormDescription>Fecha en la que se dio de baja</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
```

- [ ] **Step 2: Refactorizar employee-quick-actions.tsx para usar TerminationFormFields**

Cambios en `src/features/Employees/EmpleadoID/components/employee-quick-actions.tsx`:

1. Eliminar imports de `date-fns` y `es` locale (lineas 26-27)
2. Eliminar `terminationSchema` local y `termination_reason_enum` local (lineas 42-54)
3. Agregar import:
   ```typescript
   import { TerminationFormFields, terminationSchema } from '../../components/shared/TerminationFormFields';
   ```
4. Reemplazar todo el bloque de `<FormField>` para reason y date (lineas 153-214) por:
   ```typescript
   <TerminationFormFields form={form} />
   ```
5. Eliminar imports no usados: `Calendar`, `Popover*`, `Select*`, `cn`, `CalendarIcon`, `format`, `es`

- [ ] **Step 3: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 4: Commit**

```
refactor(employees): extract TerminationFormFields shared component
```

---

### Task 3: Login — manejar error de usuario baneado

**Files:**

- Modify: `src/app/login/componentsLogin/LoginButton.tsx`

- [ ] **Step 1: Aplicar los 3 fixes en LoginButton.tsx**

Cambios:

1. Agregar import del logger:

   ```typescript
   import { Logger } from '@/lib/logger';
   const logger = new Logger('LoginButton');
   ```

2. Cambiar `const data: any` (linea 45) a `const data` (sin tipo — inferido del retorno de `login`)

3. Reemplazar `console.error(data.error)` (linea 47) por `logger.error('Login error', { data: { error: data.error } })`

4. Reemplazar `console.error(error, 'este es el error')` (linea 59) por `logger.error('Login failed', { data: { error } })`

5. En el callback `error` del `toast.promise` (linea 58-61), agregar deteccion de ban:
   ```typescript
   error: (error) => {
     logger.error('Login failed', { data: { error } });
     if (error?.message?.includes('banned')) {
       return 'Tu acceso ha sido revocado. Contacta al administrador de tu empresa.';
     }
     return error?.message || 'Error desconocido';
   },
   ```

- [ ] **Step 2: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 3: Commit**

```
fix(login): handle banned user error message, replace console.error with logger
```

---

## Chunk 2: Server Actions (ban/unban + singleFacet + queries actualizadas)

### Task 4: Server Actions — ban/unban + is_active en queries

**Files:**

- Modify: `src/features/Empresa/Usuarios/actions.server.ts`

- [ ] **Step 1: Agregar imports necesarios**

Agregar al inicio del archivo (junto a los imports existentes):

```typescript
import { buildFiltersWhere, buildTextFiltersWhere } from '@/shared/components/common/DataTable';
import { adminSupabaseServer } from '@/lib/supabase/server';
```

- [ ] **Step 2: Agregar is_active a SHARE_USER_SELECT y VALID_SORT_FIELDS**

En `SHARE_USER_SELECT` (linea 30), agregar `is_active: true` despues de `created_at: true`.

En `VALID_SORT_FIELDS` (linea 21), agregar `'is_active'`:

```typescript
const VALID_SORT_FIELDS = new Set(['created_at', 'fullname', 'email', 'is_active']);
```

- [ ] **Step 3: Actualizar CompanyUserRow para incluir is_active**

En el tipo `CompanyUserRow` (linea 66), agregar `is_active: boolean;` despues de `isOwner: boolean;`.

En `normalizeRows` (linea 298), agregar al mapeo:

```typescript
is_active: row.is_active,
```

En `getCompanyOwner` (linea 268), agregar al objeto retornado:

```typescript
is_active: true, // El owner siempre está activo
```

- [ ] **Step 4: Actualizar buildWhereClause para filtro de is_active**

Agregar en `buildWhereClause`, despues del `roleWhere`:

```typescript
// Filtro de estado activo/baneado
let isActiveWhere: Record<string, unknown> = {};
if (state.filters.is_active?.length) {
  const values = state.filters.is_active;
  if (values.length === 1) {
    isActiveWhere = { is_active: values[0] === 'true' };
  }
  // Si ambos seleccionados → no filtrar (mostrar todos)
}
```

Y agregarlo al return: `...isActiveWhere,`

- [ ] **Step 5: Actualizar ordenamiento por defecto en getCompanyUsersPaginated**

En `getCompanyUsersPaginated`, cambiar el `safeOrderBy` (linea 352):

```typescript
const safeOrderBy = [...resolvedSorts, { is_active: 'desc' as const }, { profile: { fullname: 'asc' as const } }];
```

Esto pone baneados (`is_active: false`) al final por defecto.

- [ ] **Step 6: Crear banCompanyUser server action**

Agregar despues de `deleteCompanyUser` (que se mantiene temporalmente por retrocompatibilidad):

```typescript
// ── Accion: banear usuario de empresa (soft delete) ─────────────────────────
export async function banCompanyUser(shareCompanyUserId: string, employeeTermination?: { reason: string; date: Date }) {
  logger.debug('Baneando usuario de empresa', { data: { shareCompanyUserId } });

  try {
    // 1. Buscar usuario con profile y empleado vinculado
    const shareUser = await prisma.share_company_users.findUnique({
      where: { id: shareCompanyUserId },
      select: {
        profile: {
          select: {
            id: true,
            credential_id: true,
            employee_id: true,
            employees: { select: { id: true, is_active: true } },
          },
        },
      },
    });

    if (!shareUser?.profile?.credential_id) {
      throw new Error('El usuario no tiene credenciales de acceso vinculadas.');
    }

    const credentialId = shareUser.profile.credential_id;

    // 2. Banear en Supabase Auth
    const adminSupabase = await adminSupabaseServer();
    const { error: banError } = await adminSupabase.auth.admin.updateUserById(credentialId, {
      ban_duration: '876600h',
    });

    if (banError) {
      throw new Error(`Error al banear usuario en Auth: ${banError.message}`);
    }

    // 3. Marcar is_active = false en share_company_users
    try {
      await prisma.share_company_users.update({
        where: { id: shareCompanyUserId },
        data: { is_active: false },
      });
    } catch (prismaError) {
      // Rollback: desbanear si Prisma falla
      logger.error('Prisma fallo, intentando rollback de ban', { data: { prismaError } });
      await adminSupabase.auth.admin.updateUserById(credentialId, { ban_duration: 'none' }).catch((rollbackErr) => {
        logger.error('CRITICO: Rollback de ban fallo. Usuario baneado en Auth pero activo en BD', {
          data: { rollbackErr, credentialId, shareCompanyUserId },
        });
      });
      throw prismaError;
    }

    // 4. Si se debe dar de baja al empleado vinculado
    if (employeeTermination && shareUser.profile.employees?.is_active) {
      const employeeId = shareUser.profile.employees.id;
      await prisma.employees.update({
        where: { id: employeeId },
        data: {
          is_active: false,
          reason_for_termination: employeeTermination.reason,
          termination_date: employeeTermination.date,
        },
      });
      logger.info('Empleado vinculado dado de baja', { data: { employeeId } });
    }

    // 5. Invalidar cache
    await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
    logger.info('Usuario baneado exitosamente', { data: { shareCompanyUserId } });
  } catch (error) {
    logger.error('Error baneando usuario de empresa', { data: { error, shareCompanyUserId } });
    throw error;
  }
}
```

- [ ] **Step 7: Crear unbanCompanyUser server action**

```typescript
// ── Accion: desbanear usuario de empresa (reactivar) ────────────────────────
export async function unbanCompanyUser(shareCompanyUserId: string, reactivateEmployee?: boolean) {
  logger.debug('Desbaneando usuario de empresa', { data: { shareCompanyUserId } });

  try {
    // 1. Buscar usuario con profile y empleado vinculado
    const shareUser = await prisma.share_company_users.findUnique({
      where: { id: shareCompanyUserId },
      select: {
        profile: {
          select: {
            id: true,
            credential_id: true,
            employee_id: true,
            employees: { select: { id: true, is_active: true } },
          },
        },
      },
    });

    if (!shareUser?.profile?.credential_id) {
      throw new Error('El usuario no tiene credenciales de acceso vinculadas.');
    }

    const credentialId = shareUser.profile.credential_id;

    // 2. Desbanear en Supabase Auth
    const adminSupabase = await adminSupabaseServer();
    const { error: unbanError } = await adminSupabase.auth.admin.updateUserById(credentialId, {
      ban_duration: 'none',
    });

    if (unbanError) {
      throw new Error(`Error al desbanear usuario en Auth: ${unbanError.message}`);
    }

    // 3. Marcar is_active = true en share_company_users
    try {
      await prisma.share_company_users.update({
        where: { id: shareCompanyUserId },
        data: { is_active: true },
      });
    } catch (prismaError) {
      logger.error('Prisma fallo, intentando rollback de unban', { data: { prismaError } });
      await adminSupabase.auth.admin.updateUserById(credentialId, { ban_duration: '876600h' }).catch((rollbackErr) => {
        logger.error('CRITICO: Rollback de unban fallo', {
          data: { rollbackErr, credentialId, shareCompanyUserId },
        });
      });
      throw prismaError;
    }

    // 4. Si se debe reactivar al empleado vinculado
    if (reactivateEmployee && shareUser.profile.employees && !shareUser.profile.employees.is_active) {
      const employeeId = shareUser.profile.employees.id;
      await prisma.employees.update({
        where: { id: employeeId },
        data: {
          is_active: true,
          reason_for_termination: null,
          termination_date: null,
        },
      });
      logger.info('Empleado vinculado reactivado', { data: { employeeId } });
    }

    // 5. Invalidar cache
    await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
    logger.info('Usuario desbaneado exitosamente', { data: { shareCompanyUserId } });
  } catch (error) {
    logger.error('Error desbaneando usuario de empresa', { data: { error, shareCompanyUserId } });
    throw error;
  }
}
```

- [ ] **Step 8: Crear getCompanyUserSingleFacet**

Agregar despues de `getCompanyUserFacets`:

```typescript
// ── Single Facet (lazy-load individual) ─────────────────────────────────────
export async function getCompanyUserSingleFacet(
  columnId: string,
  companyId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  logger.debug('Obteniendo facet individual de usuarios', { data: { columnId } });

  try {
    let parsedState: ReturnType<typeof parseSearchParams> | null = null;
    if (searchParams && Object.keys(searchParams).length > 0) {
      parsedState = parseSearchParams(searchParams);
    }

    const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

    function crossWhere(excludeColumn: string) {
      if (!parsedState || !hasActiveFilters) return { company_id: companyId };
      const modified = { ...parsedState, filters: { ...parsedState.filters } };
      delete modified.filters[excludeColumn];
      delete modified.filters[`${excludeColumn}_from`];
      delete modified.filters[`${excludeColumn}_to`];

      // Resolver role filter si presente
      // Nota: para simplicidad, role filter en cross-where se omite (se resuelve async)
      const profileIdsWithRole = null; // No cross-filter role en facets por ahora
      return buildWhereClause(companyId, modified, profileIdsWithRole);
    }

    function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        if (key == null) {
          map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
        } else {
          map.set(String(key), count);
        }
      }
      return map;
    }

    const where = crossWhere(columnId);

    // ── is_active (boolean) ──
    if (columnId === 'is_active') {
      const rows = await prisma.share_company_users.groupBy({
        by: ['is_active'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: String(r.is_active), count: r._count }))),
      };
    }

    // ── role (special: resolved via user_roles join table) ──
    if (columnId === 'role') {
      const usersForRoles = await prisma.share_company_users.findMany({
        where,
        select: { profile_id: true },
      });
      const profileIds = usersForRoles.map((u) => u.profile_id).filter(Boolean) as string[];

      const userRolesRows = await prisma.user_roles.findMany({
        where: { user_id: { in: profileIds } },
        select: { user_id: true, role_id: true },
      });

      const roleCounts = new Map<string, number>();
      const usersWithRoles = new Set(userRolesRows.map((ur) => ur.user_id));
      const nullRoleCount = profileIds.filter((id) => !usersWithRoles.has(id)).length;
      if (nullRoleCount > 0) {
        roleCounts.set(NULL_FILTER_VALUE, nullRoleCount);
      }
      for (const ur of userRolesRows) {
        const key = String(ur.role_id);
        roleCounts.set(key, (roleCounts.get(key) ?? 0) + 1);
      }

      // Resolver nombres de roles
      const roleIds = [...new Set(userRolesRows.map((ur) => ur.role_id))];
      const resolvedRoles =
        roleIds.length > 0
          ? await prisma.roles.findMany({
              where: { id: { in: roleIds } },
              select: { id: true, name: true },
            })
          : [];

      return {
        counts: roleCounts,
        resolvedOptions: resolvedRoles.map((r) => ({ id: String(r.id), name: r.name })),
      };
    }

    // ── linked_employee (FK via profile.employee_id) ──
    if (columnId === 'linked_employee') {
      const usersForEmp = await prisma.share_company_users.findMany({
        where,
        select: {
          profile: {
            select: {
              employee_id: true,
              employees: { select: { id: true, firstname: true, lastname: true, file: true } },
            },
          },
        },
      });

      const counts = new Map<string, number>();
      const employeeMap = new Map<string, { id: string; name: string | null }>();

      for (const u of usersForEmp) {
        const emp = u.profile?.employees;
        if (!emp) {
          counts.set(NULL_FILTER_VALUE, (counts.get(NULL_FILTER_VALUE) ?? 0) + 1);
        } else {
          counts.set(emp.id, (counts.get(emp.id) ?? 0) + 1);
          if (!employeeMap.has(emp.id)) {
            employeeMap.set(emp.id, {
              id: emp.id,
              name: `[${emp.file}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim(),
            });
          }
        }
      }

      return {
        counts,
        resolvedOptions: Array.from(employeeMap.values()),
      };
    }

    logger.warn('Facet column not recognized for company users', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error obteniendo facet individual de usuarios', { data: { error, columnId } });
    return null;
  }
}
```

- [ ] **Step 9: Actualizar tipos exportados**

Al final del archivo, reemplazar los tipos manuales por inferidos:

```typescript
// Tipo inferido — NUNCA tipar manualmente
export type CompanyUserListItem = Awaited<ReturnType<typeof getCompanyUsersPaginated>>['data'][number];
```

Nota: `CompanyUserRow` se mantiene porque es usado por `getCompanyOwner` y `normalizeRows` internamente. Pero `CompanyUserListItem` ahora es el tipo exportado correcto.

- [ ] **Step 10: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 11: Commit**

```
feat(usuarios): add ban/unban server actions, singleFacet, is_active support
```

---

## Chunk 3: UI de la tabla (columns + UserStatusCell + DataTable client-side)

### Task 5: Columnas — is_active, legajo, header fixes

**Files:**

- Modify: `src/features/Empresa/Usuarios/table/columns.tsx`

- [ ] **Step 1: Agregar imports necesarios**

Agregar a los imports existentes:

```typescript
import { Ban, CheckCircle, UserCheck } from 'lucide-react';
```

- [ ] **Step 2: Actualizar tipo Permissions**

```typescript
type Permissions = {
  canDelete: boolean;
  canUpdate: boolean;
};
```

- [ ] **Step 3: Agregar columna is_active despues de fullname**

Insertar despues de la columna `fullname` (antes de `email`):

```typescript
// ── Estado (activo/baneado) ─────────────────────────────────────────────
{
  id: 'is_active',
  accessorFn: (row) => row.is_active,
  meta: { title: 'Estado' },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
  cell: ({ row }) => {
    // Owner siempre activo
    if (row.original.isOwner) {
      return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Activo</Badge>;
    }
    return row.original.is_active
      ? <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Activo</Badge>
      : <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Baneado</Badge>;
  },
  filterFn: (row, _id, value: string[]) => {
    if (row.original.isOwner) return value.includes('true');
    return value.includes(String(row.original.is_active));
  },
  enableSorting: true,
},
```

- [ ] **Step 4: Fix columna role — usar DataTableColumnHeader**

Cambiar `header: 'Rol'` (linea 201) a:

```typescript
header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
```

- [ ] **Step 5: Agregar legajo en linked_employee + filterFn**

En la columna `linked_employee`, modificar:

1. `accessorFn` (linea 213-217) — agregar legajo:

```typescript
accessorFn: (row) => {
  const emp = row.profile?.employees;
  if (!emp) return '';
  return `[${emp.file}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
},
```

2. Agregar `filterFn`:

```typescript
filterFn: (row, _id, value: string[]) => {
  const empId = row.original.profile?.employees?.id;
  if (!empId) return value.includes(NULL_FILTER_VALUE);
  return value.includes(empId);
},
```

- [ ] **Step 6: Actualizar columna actions — usar UserStatusCell**

Reemplazar el import de `DeleteUserCell` por:

```typescript
import { UserStatusCell } from './UserStatusCell';
```

Cambiar la condicion y celda de actions:

```typescript
// ── Acciones ──────────────────────────────────────────────────────────────
...((permissions.canDelete || permissions.canUpdate)
  ? [
      {
        id: 'actions',
        meta: { excludeFromExport: true, title: '' },
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }: { row: { original: CompanyUserListItem } }) => {
          if (row.original.isOwner) return null;
          return <UserStatusCell row={row.original} permissions={permissions} />;
        },
      } satisfies ColumnDef<CompanyUserListItem>,
    ]
  : []),
```

- [ ] **Step 7: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 8: Commit**

```
feat(usuarios): add is_active column, legajo in linked_employee, fix role header
```

---

### Task 6: Crear UserStatusCell

**Files:**

- Create: `src/features/Empresa/Usuarios/table/UserStatusCell.tsx`
- Delete: `src/features/Empresa/Usuarios/table/DeleteUserCell.tsx`

- [ ] **Step 1: Crear UserStatusCell.tsx**

```typescript
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Logger } from '@/lib/logger';
import { TerminationFormFields, terminationSchema, type TerminationFormValues } from '@/features/Employees/components/shared/TerminationFormFields';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Ban, UserCheck } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { CompanyUserListItem } from '../actions.server';
import { banCompanyUser, unbanCompanyUser } from '../actions.server';

const logger = new Logger('UserStatusCell');

interface UserStatusCellProps {
  row: CompanyUserListItem;
  permissions: { canDelete: boolean; canUpdate: boolean };
}

export function UserStatusCell({ row, permissions }: UserStatusCellProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<'closed' | 'confirm-ban' | 'ban-with-employee' | 'confirm-unban'>('closed');

  const hasLinkedEmployee = !!row.profile?.employees;
  const employeeIsActive = row.profile?.employees?.is_active ?? false;
  const employeeName = hasLinkedEmployee
    ? `[${row.profile!.employees!.file}] ${row.profile!.employees!.lastname ?? ''} ${row.profile!.employees!.firstname ?? ''}`.trim()
    : '';

  const form = useForm<TerminationFormValues>({
    resolver: zodResolver(terminationSchema),
    defaultValues: { reason_for_termination: '', termination_date: undefined },
  });

  const invalidateAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ['company-users'] });
    setStep('closed');
    form.reset();
  };

  // ── BAN (dar de baja) ──────────────────────────────────────────────────────
  const handleBanOnly = () => {
    startTransition(async () => {
      try {
        await banCompanyUser(row.id);
        toast.success('Usuario dado de baja exitosamente');
        invalidateAndClose();
      } catch (error) {
        logger.error('Error baneando usuario', { data: { error } });
        toast.error('Error al dar de baja al usuario');
      }
    });
  };

  const handleBanWithEmployee = (values: TerminationFormValues) => {
    startTransition(async () => {
      try {
        await banCompanyUser(row.id, {
          reason: values.reason_for_termination,
          date: values.termination_date,
        });
        toast.success('Usuario y empleado dados de baja exitosamente');
        invalidateAndClose();
      } catch (error) {
        logger.error('Error baneando usuario con empleado', { data: { error } });
        toast.error('Error al dar de baja');
      }
    });
  };

  // ── UNBAN (reactivar) ─────────────────────────────────────────────────────
  const handleUnban = (withEmployee: boolean) => {
    startTransition(async () => {
      try {
        await unbanCompanyUser(row.id, withEmployee);
        toast.success(withEmployee ? 'Usuario y empleado reactivados' : 'Usuario reactivado exitosamente');
        invalidateAndClose();
      } catch (error) {
        logger.error('Error desbaneando usuario', { data: { error } });
        toast.error('Error al reactivar usuario');
      }
    });
  };

  // ── Click inicial ─────────────────────────────────────────────────────────
  const handleClick = () => {
    if (row.is_active) {
      // Dar de baja
      if (!permissions.canDelete) return;
      setStep('confirm-ban');
    } else {
      // Reactivar
      if (!permissions.canUpdate) return;
      if (hasLinkedEmployee && !employeeIsActive) {
        setStep('confirm-unban');
      } else {
        handleUnban(false);
      }
    }
  };

  return (
    <>
      {/* Boton principal */}
      {row.is_active ? (
        permissions.canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleClick}
            disabled={isPending}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        )
      ) : (
        permissions.canUpdate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-50"
            onClick={handleClick}
            disabled={isPending}
          >
            <UserCheck className="h-3.5 w-3.5" />
          </Button>
        )
      )}

      {/* Dialog: Confirmar ban */}
      <AlertDialog open={step === 'confirm-ban'} onOpenChange={(open) => !open && setStep('closed')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dar de baja usuario</AlertDialogTitle>
            <AlertDialogDescription>
              {hasLinkedEmployee && employeeIsActive
                ? `Este usuario tiene un empleado vinculado: ${employeeName}. ¿Deseas tambien dar de baja al empleado?`
                : 'Este usuario sera baneado y no podra acceder al sistema.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {hasLinkedEmployee && employeeIsActive ? (
              <>
                <Button variant="outline" onClick={handleBanOnly} disabled={isPending}>
                  Solo quitar acceso
                </Button>
                <Button variant="destructive" onClick={() => setStep('ban-with-employee')} disabled={isPending}>
                  Dar de baja ambos
                </Button>
              </>
            ) : (
              <AlertDialogAction asChild>
                <Button variant="destructive" onClick={handleBanOnly} disabled={isPending}>
                  {isPending ? 'Procesando...' : 'Dar de baja'}
                </Button>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Ban con formulario de baja de empleado */}
      <AlertDialog open={step === 'ban-with-employee'} onOpenChange={(open) => !open && setStep('closed')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dar de baja empleado vinculado</AlertDialogTitle>
            <AlertDialogDescription>
              Completa los datos de baja para el empleado {employeeName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleBanWithEmployee)} className="space-y-4">
              <TerminationFormFields form={form} />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setStep('closed')}>
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" disabled={isPending}>
                  {isPending ? 'Procesando...' : 'Dar de baja'}
                </Button>
              </div>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Confirmar reactivacion */}
      <AlertDialog open={step === 'confirm-unban'} onOpenChange={(open) => !open && setStep('closed')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              {`Este usuario tiene un empleado vinculado inactivo: ${employeeName}. ¿Deseas tambien reactivar al empleado?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleUnban(false)} disabled={isPending}>
              Solo restaurar acceso
            </Button>
            <Button onClick={() => handleUnban(true)} disabled={isPending}>
              {isPending ? 'Procesando...' : 'Reactivar ambos'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Eliminar DeleteUserCell.tsx**

Eliminar el archivo `src/features/Empresa/Usuarios/table/DeleteUserCell.tsx`.

Nota: el `COMPANY_USERS_QUERY_KEY` que exportaba se mueve a `UserStatusCell` si es necesario, o se usa inline.

- [ ] **Step 3: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 4: Commit**

```
feat(usuarios): create UserStatusCell with ban/unban flow, remove DeleteUserCell
```

---

### Task 7: DataTable — client-side navigation + lazy-load facets

**Files:**

- Modify: `src/features/Empresa/Usuarios/table/_UsersDataTable.tsx`

- [ ] **Step 1: Reescribir \_UsersDataTable.tsx completo**

Reemplazar TODO el contenido del archivo con:

```typescript
'use client';

import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import type {
  DataTableFacetedFilterConfig,
  DataTableSearchParams,
  FacetResult,
} from '@/shared/components/common/DataTable';
import { DataTable } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { Ban, CheckCircle, CircleOff, Shield } from 'lucide-react';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import type { CompanyUserListItem } from '../actions.server';
import {
  getAllCompanyUsersForExport,
  getAvailableRoles,
  getCompanyUserSingleFacet,
  getCompanyUsersPaginated,
} from '../actions.server';
import { CreateUserModal } from '../components/create-user-modal';
import { getCompanyUsersColumns } from './columns';

const TABLE_ID = 'company-users';

const DEFAULT_VISIBLE_FILTERS = ['is_active', 'role', 'linked_employee'];

// ── Helpers para construir FacetResult ───────────────────────────────────────
function buildEnumFacetResult(
  options: Array<{ value: string; label: string; icon?: React.ComponentType<{ className?: string }> }>,
  counts: Map<string, number>
): FacetResult {
  return { options, counts };
}

function buildFkFacetResult(
  resolvedOptions: Array<{ id: string; name: string | null }> | undefined,
  counts: Map<string, number>,
  nullLabel?: string
): FacetResult {
  const options = (resolvedOptions ?? []).map((opt) => ({
    value: opt.id,
    label: opt.name ?? 'Sin nombre',
  }));
  if (counts.has(NULL_FILTER_VALUE)) {
    options.push({ value: NULL_FILTER_VALUE, label: nullLabel ?? 'Sin asignar' });
  }
  return { options, counts };
}

// ── Props ────────────────────────────────────────────────────────────────────
interface UsersDataTableProps {
  data: CompanyUserListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  companyId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
  permissionsMap: Record<string, boolean>;
}

export function _UsersDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  companyId,
  initialColumnVisibility,
  initialFilterVisibility,
  permissionsMap,
}: UsersDataTableProps) {
  // ── Permisos ────────────────────────────────────────────────────────────────
  const canDelete = permissionsMap['empresa:usuarios-empleados:delete'] === true;
  const canCreate = permissionsMap['empresa:usuarios-empleados:create'] === true;
  const canUpdate = permissionsMap['empresa:usuarios-empleados:update'] === true;

  // ── Columnas ────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => getCompanyUsersColumns({ canDelete, canUpdate }),
    [canDelete, canUpdate]
  );

  // ── Client-side navigation state ────────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getCompanyUsersPaginated(companyId, params),
    [companyId]
  );

  // ── Lazy-load facet factories ───────────────────────────────────────────────
  const makeIsActiveFetchFacet = useCallback(
    () => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getCompanyUserSingleFacet('is_active', companyId, params);
        if (!result) return { options: [], counts: new Map() };
        return buildEnumFacetResult(
          [
            { value: 'true', label: 'Activo', icon: CheckCircle },
            { value: 'false', label: 'Baneado', icon: Ban },
          ],
          result.counts
        );
      };
    },
    [companyId]
  );

  const makeRoleFetchFacet = useCallback(
    () => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const [result, availableRoles] = await Promise.all([
          getCompanyUserSingleFacet('role', companyId, params),
          getAvailableRoles(),
        ]);
        if (!result) return { options: [], counts: new Map() };

        const options = availableRoles.map((role) => ({
          value: String(role.id),
          label: role.name ?? 'Sin nombre',
          icon: Shield,
        }));

        if (result.counts.has(NULL_FILTER_VALUE)) {
          options.push({ value: NULL_FILTER_VALUE, label: 'Sin rol', icon: CircleOff });
        }

        return { options, counts: result.counts };
      };
    },
    [companyId]
  );

  const makeLinkedEmployeeFetchFacet = useCallback(
    () => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getCompanyUserSingleFacet('linked_employee', companyId, params);
        if (!result) return { options: [], counts: new Map() };
        return buildFkFacetResult(result.resolvedOptions, result.counts, 'Sin vincular');
      };
    },
    [companyId]
  );

  // ── Filtros facetados (con lazy-load) ───────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'is_active',
        title: 'Estado',
        fetchFacet: makeIsActiveFetchFacet(),
      },
      {
        columnId: 'role',
        title: 'Rol',
        fetchFacet: makeRoleFetchFacet(),
      },
      {
        columnId: 'linked_employee',
        title: 'Empleado vinculado',
        fetchFacet: makeLinkedEmployeeFetchFacet(),
      },
      {
        columnId: 'created_at',
        title: 'Fecha de alta',
        type: 'dateRange' as const,
      },
      {
        columnId: 'fullname',
        title: 'Nombre',
        type: 'text' as const,
      },
      {
        columnId: 'email',
        title: 'Correo',
        type: 'text' as const,
      },
    ],
    [makeIsActiveFetchFacet, makeRoleFetchFacet, makeLinkedEmployeeFetchFacet]
  );

  // ── Toolbar actions ─────────────────────────────────────────────────────────
  const toolbarActions = canCreate ? (
    <PermissionGuard module="empresa" tab="usuarios-empleados" action="create">
      <CreateUserModal />
    </PermissionGuard>
  ) : undefined;

  // ── Visibilidad de filtros ──────────────────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(
      facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)])
    );
  }, [initialFilterVisibility, facetedFilters]);

  // ── Export config ───────────────────────────────────────────────────────────
  const exportConfig = useMemo(
    () => ({
      options: {
        filename: 'usuarios-empresa',
        sheetName: 'Usuarios',
        title: 'Usuarios de la Empresa',
      },
      fetchAllData: () => getAllCompanyUsersForExport(companyId, currentParams),
      formatters: {
        fullname: (_val: unknown, row: CompanyUserListItem) => row.profile?.fullname ?? '',
        email: (_val: unknown, row: CompanyUserListItem) => row.profile?.email ?? '',
        is_active: (_val: unknown, row: CompanyUserListItem) =>
          row.isOwner ? 'Activo' : row.is_active ? 'Activo' : 'Baneado',
        role: (_val: unknown, row: CompanyUserListItem) => {
          const roles = row.profile?.user_roles ?? [];
          if (row.isOwner && roles.length === 0) return 'Propietario';
          if (roles.length === 0) return 'Sin rol';
          return roles.map((ur) => ur.roles?.name ?? '').filter(Boolean).join(', ');
        },
        linked_employee: (_val: unknown, row: CompanyUserListItem) => {
          const emp = row.profile?.employees;
          if (!emp) return 'Sin vincular';
          return `[${emp.file}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
        },
        created_at: (_val: unknown, row: CompanyUserListItem) =>
          row.created_at && row.created_at.getTime() !== 0 ? moment(row.created_at).format('DD/MM/YYYY') : '',
      } as Record<string, (value: unknown, row: CompanyUserListItem) => string>,
    }),
    [companyId, currentParams]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      queryFn={tableQueryFn}
      queryKey={['company-users', companyId]}
      onStateChange={handleStateChange}
      tableId={tableId}
      paramNamespace={TABLE_ID}
      facetedFilters={facetedFilters}
      exportConfig={exportConfig}
      initialColumnVisibility={initialColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      searchPlaceholder="Buscar por nombre o correo..."
      emptyMessage="No hay usuarios registrados"
      showFilterToggle={true}
      toolbarActions={toolbarActions}
    />
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run check-types`

- [ ] **Step 3: Commit**

```
feat(usuarios): migrate DataTable to client-side nav + lazy-load facets
```

---

## Chunk 4: Verificacion final

### Task 8: Verificacion y limpieza

- [ ] **Step 1: Type check completo**

Run: `npm run check-types`

Resolver cualquier error de tipos.

- [ ] **Step 2: Verificar en navegador**

1. Ir a `/dashboard/company/actualCompany` → tab "Usuarios"
2. Verificar que la tabla carga correctamente con columna "Estado"
3. Verificar que los filtros de Estado, Rol, Empleado vinculado funcionan
4. Verificar que el legajo aparece en la columna de empleado vinculado
5. Probar dar de baja un usuario de prueba
6. Verificar que el usuario baneado aparece al final con badge "Baneado"
7. Probar reactivar el usuario baneado
8. Verificar export Excel incluye Estado y legajo

- [ ] **Step 3: Verificar login con usuario baneado**

1. Banear un usuario de prueba
2. Cerrar sesion
3. Intentar loguearse con ese usuario
4. Verificar que aparece el mensaje "Tu acceso ha sido revocado..."

- [ ] **Step 4: Commit final**

```
fix(usuarios): final adjustments and type fixes for soft delete
```
