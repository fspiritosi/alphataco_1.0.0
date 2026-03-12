# COD-325: Soft Delete de Usuarios Invitados

## Resumen

Cambiar la eliminacion de usuarios invitados (`share_company_users`) de hard delete a soft delete mediante baneo a nivel de Supabase Auth. Incluir flujo bidireccional empleado-usuario y fixes de auditoria de la tabla de usuarios.

## Arquitectura

**Enfoque B — Logica separada por feature, modal reutilizado.** Las server actions de ban/unban se crean en `features/Empresa/Usuarios/actions.server.ts` usando Prisma + Supabase Admin API. El formulario de baja (reason + date) se extrae a un componente compartido `TerminationFormFields`. No se modifica `toggleEmployeeStatus` existente (empleado -> usuario ya funciona).

**Stack**: Prisma (datos), Supabase Admin API (auth ban/unban), React Hook Form + Zod (formularios), DataTable nuevo (client-side navigation + lazy-load facets).

---

## Edge Cases y Decisiones de Diseno

### Ruta del credential_id

La ruta real en BD es: `share_company_users.profile_id` -> `profile.credential_id`. Las server actions DEBEN hacer el include de profile para obtener `credential_id`. Si `profile_id` es null o `profile.credential_id` es null, la action debe lanzar un error explicito: "El usuario no tiene credenciales de acceso vinculadas." No se ejecuta ban parcial.

### Transaccionalidad entre Supabase Auth y Prisma

Supabase Auth API y Prisma son sistemas independientes — no hay transaccion atomica posible. Estrategia: ejecutar el ban en Supabase Auth PRIMERO. Si tiene exito, actualizar Prisma (`is_active`). Si Prisma falla, intentar rollback del ban en Auth (unban). Si el rollback tambien falla, loguear el error critico para intervencion manual. La inconsistencia temporal es aceptable porque el estado de auth (baneado) es el que realmente bloquea acceso.

### Owner de la empresa

El owner tiene `isOwner: true` y no tiene fila real en `share_company_users` (su ID en tabla es virtual: `"owner-{uuid}"`). El boton de "Dar de baja" NO se muestra para el owner — se mantiene el comportamiento actual donde la columna actions devuelve `null` para el owner.

### Empleado ya inactivo al banear usuario

Si el empleado vinculado ya esta inactivo (`is_active = false`) al momento de banear el usuario, NO se pregunta si dar de baja al empleado (ya lo esta). Se ejecuta solo el ban del usuario.

### Usuario sin empleado vinculado al reactivar

Si el usuario baneado no tiene empleado vinculado (o el empleado ya esta activo), la reactivacion es directa sin pregunta de cascada.

### `is_active` del owner en ordenamiento

El owner no tiene fila en `share_company_users`, se inyecta manualmente al inicio de la pagina 0 con `is_active: true`. El owner siempre aparece primero, antes del ordenamiento por `is_active`. No puede ser baneado.

---

## 1. Flujos de Negocio

### 1.1 Ban de Usuario (desde tabla de usuarios)

```
Click "Dar de baja" en tabla
  -> tiene empleado vinculado?
    -> SI -> AlertDialog: "Tambien dar de baja al empleado [legajo] Apellido?"
      -> "Si, ambos" -> Modal con TerminationFormFields (reason + date)
        -> banCompanyUser(id, { reason, date })
      -> "No, solo quitar acceso" -> banCompanyUser(id)
    -> NO -> AlertDialog simple: "Este usuario sera baneado"
      -> banCompanyUser(id)
```

### 1.2 Reactivacion de Usuario (desde tabla de usuarios)

```
Click "Reactivar" en tabla
  -> tiene empleado vinculado inactivo?
    -> SI -> AlertDialog: "Tambien reactivar al empleado?"
      -> "Si, ambos" -> unbanCompanyUser(id, reactivateEmployee: true)
      -> "No, solo restaurar acceso" -> unbanCompanyUser(id, reactivateEmployee: false)
    -> NO -> unbanCompanyUser(id) directamente
```

### 1.3 Desactivacion de Empleado (flujo existente, NO se modifica)

`toggleEmployeeStatus()` ya banea al usuario vinculado automaticamente via `adminSupabase.auth.admin.updateUserById(credentialId, { ban_duration: '876600h' })`. No se toca este codigo.

### 1.4 Reactivacion de Empleado (flujo existente, NO se modifica)

`toggleEmployeeStatus()` ya desbanea al usuario vinculado automaticamente. No se toca.

### 1.5 Login de Usuario Baneado

Supabase devuelve `{ error: { message: "User is banned" } }`. Interceptar en el formulario de login y mostrar toast: "Tu acceso ha sido revocado. Contacta al administrador de tu empresa."

---

## 2. Migracion de Base de Datos

```sql
ALTER TABLE share_company_users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

Razon: No se puede hacer JOIN directo a `auth.users` desde Prisma para leer `banned_until`. El flag local `is_active` se sincroniza en `banUser`/`unbanUser`.

---

## 3. Server Actions

### 3.1 `banCompanyUser(shareCompanyUserId, employeeTermination?)`

Ubicacion: `src/features/Empresa/Usuarios/actions.server.ts`

```
1. Buscar share_company_users con include: { profile: { select: { credential_id } }, employees: true }
2. Validar: si profile.credential_id es null -> throw Error("Usuario sin credenciales")
3. Banear usuario: adminSupabase.auth.admin.updateUserById(profile.credential_id, { ban_duration: '876600h' })
4. Si ban exitoso -> prisma.share_company_users.update({ is_active: false })
   Si Prisma falla -> intentar rollback: adminSupabase.auth.admin.updateUserById(id, { ban_duration: 'none' })
   Si rollback falla -> logger.error critico para intervencion manual
5. Si employeeTermination Y empleado vinculado activo:
   - prisma.employees.update({ is_active: false, reason_for_termination, termination_date })
   - RPC update_employee_diagram_status
6. invalidateCacheTags(COMPANY_USERS_INVALIDATION)
```

### 3.2 `unbanCompanyUser(shareCompanyUserId, reactivateEmployee?)`

Ubicacion: `src/features/Empresa/Usuarios/actions.server.ts`

```
1. Buscar share_company_users con include: { profile: { select: { credential_id } }, employees: true }
2. Validar: si profile.credential_id es null -> throw Error("Usuario sin credenciales")
3. Desbanear: adminSupabase.auth.admin.updateUserById(profile.credential_id, { ban_duration: 'none' })
4. Si unban exitoso -> prisma.share_company_users.update({ is_active: true })
   Si Prisma falla -> intentar rollback: adminSupabase.auth.admin.updateUserById(id, { ban_duration: '876600h' })
5. Si reactivateEmployee Y empleado vinculado inactivo:
   - prisma.employees.update({ is_active: true, reason_for_termination: null, termination_date: null })
   - RPC update_employee_diagram_status
6. invalidateCacheTags(COMPANY_USERS_INVALIDATION)
```

### 3.3 Modificaciones a `getCompanyUsersPaginated`

- Incluir `is_active` en el select
- Incluir `file` (legajo) del empleado vinculado (campo `file` en schema Prisma, mostrado como "Legajo" en UI)
- Orden por defecto: `is_active DESC, lastname ASC` (baneados al final)

### 3.4 `getCompanyUserSingleFacet(columnId, searchParams)`

Nueva funcion para lazy-load facets. Reemplaza el bulk `getCompanyUserFacets()`. Implementa `crossWhere(excludeColumn)` para cross-filtering.

Columnas con facet:

- `is_active`: boolean -> facet con "Activo"/"Baneado" (enum-like, 2 opciones fijas)
- `role`: portar la logica existente de `resolveRoleFilter` + conteos de usuarios sin rol al patron single-facet. Mantener la misma logica de resolucion, solo encapsularla en el switch-case de columnId
- `linked_employee`: FK facet con opciones de empleados vinculados (id + `[file] lastname firstname`)

### 3.5 `getCompanyUsersForExport` — Modificaciones

Agregar formatters para la nueva columna `is_active` (Activo/Baneado) y `file` (legajo).

---

## 4. Componentes UI

### 4.1 `TerminationFormFields` (NUEVO - compartido)

Ubicacion: `src/features/Employees/components/shared/TerminationFormFields.tsx`

**Exporta:**

- `terminationSchema` — schema Zod con `reason_for_termination` (z.string required) y `termination_date` (z.date required)
- `TERMINATION_REASONS` — array de 6 strings (Despido sin causa, Renuncia, Despido con causa, Acuerdo de partes, Fin de contrato, Fallecimiento)
- `TerminationFormFields` — componente React

Props: `{ form: UseFormReturn<z.infer<typeof terminationSchema>> }`

Renderiza:

- FormField con Select de 6 opciones (`TERMINATION_REASONS`)
- FormField con date input de escritura directa + calendario (corrige bug actual del date picker solo-calendario)

Se usa desde:

- `UserStatusCell.tsx` (tabla de usuarios, flujo de ban con empleado) — importa schema + componente
- `employee-quick-actions.tsx` (detalle de empleado, refactor para usar el compartido) — importa schema + componente

### 4.2 `UserStatusCell` (NUEVO - reemplaza `DeleteUserCell`)

Ubicacion: `src/features/Empresa/Usuarios/table/UserStatusCell.tsx`

**Usuario activo**: Boton "Dar de baja" (icono `Ban`)

- Con empleado vinculado: AlertDialog 2 pasos (pregunta + formulario)
- Sin empleado vinculado: AlertDialog simple

**Usuario baneado**: Boton "Reactivar" (icono `UserCheck`)

- Con empleado vinculado inactivo: AlertDialog con pregunta de cascada
- Sin empleado vinculado inactivo: Reactivacion directa

### 4.3 Columna `is_active` / status (NUEVA)

Badge con filtro facetado:

- `<Badge variant="success">Activo</Badge>`
- `<Badge variant="destructive">Baneado</Badge>`

`is_active` debe ser uno de los 3 `DEFAULT_VISIBLE_FILTERS` (junto con `role` y `linked_employee`), ya que es el filtro mas relevante de esta feature.

### 4.4 Columna `linked_employee` (MODIFICAR)

Agregar legajo: `[file_number] Apellido Nombre`. Agregar filtro facetado.

### 4.5 Login Error Handler (MODIFICAR)

Archivo: `src/app/login/componentsLogin/LoginButton.tsx`

En el callback `error` del `toast.promise`, verificar si `error?.message` contiene `"User is banned"`. Si es asi, mostrar mensaje amigable: "Tu acceso ha sido revocado. Contacta al administrador de tu empresa." en vez del mensaje crudo de Supabase.

### 4.6 `employee-quick-actions.tsx` (REFACTOR MENOR)

Extraer campos del formulario al `TerminationFormFields` compartido. Misma funcionalidad.

---

## 5. Fixes de Auditoria (incluidos)

| #   | Prioridad | Fix                                                  | Archivo                                  |
| --- | --------- | ---------------------------------------------------- | ---------------------------------------- |
| 1   | CRITICAL  | Client-Side Navigation Mode (queryFn + React Query)  | \_UsersDataTable.tsx                     |
| 2   | CRITICAL  | paramNamespace={tableId}                             | \_UsersDataTable.tsx                     |
| 3   | HIGH      | Lazy-load facets (migrar bulk a fetchFacet)          | \_UsersDataTable.tsx + actions.server.ts |
| 4   | HIGH      | Legajo [file] en linked_employee                     | columns.tsx                              |
| 5   | HIGH      | Filtro facetado para linked_employee                 | columns.tsx + actions.server.ts          |
| 6   | MEDIUM    | DataTableColumnHeader en columna role                | columns.tsx                              |
| 7   | MEDIUM    | Tipo inferido Awaited<ReturnType<...>>               | actions.server.ts                        |
| 8   | LOW       | stripPrefixFromSearchParams en Server Component      | UsersDataTableList.tsx                   |
| 9   | HIGH      | Columna is_active en share_company_users (migracion) | actions.server.ts                        |
| 10  | MEDIUM    | Export con currentParams                             | \_UsersDataTable.tsx                     |

---

## 6. Permisos

Las acciones de ban/unban se protegen con el sistema de permisos existente:

- `PermissionGuard module="empresa" tab="usuarios" action="delete"` para el boton de dar de baja
- `PermissionGuard module="empresa" tab="usuarios" action="update"` para el boton de reactivar

No se crean nuevas tabs ni permisos. Se reutilizan los existentes.

---

## 7. Archivos Afectados (resumen)

| Archivo                                                                   | Accion                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------ |
| `src/features/Empresa/Usuarios/actions.server.ts`                         | MODIFICAR — ban/unban, facets lazy, tipos        |
| `src/features/Empresa/Usuarios/table/_UsersDataTable.tsx`                 | MODIFICAR — client-side nav, lazy facets, export |
| `src/features/Empresa/Usuarios/table/columns.tsx`                         | MODIFICAR — status, legajo, filtros, headers     |
| `src/features/Empresa/Usuarios/table/DeleteUserCell.tsx`                  | ELIMINAR                                         |
| `src/features/Empresa/Usuarios/table/UserStatusCell.tsx`                  | CREAR                                            |
| `src/features/Empresa/Usuarios/UsersDataTableList.tsx`                    | MODIFICAR — stripPrefix, paramNamespace          |
| `src/features/Employees/components/shared/TerminationFormFields.tsx`      | CREAR                                            |
| `src/features/Employees/EmpleadoID/components/employee-quick-actions.tsx` | MODIFICAR — usar TerminationFormFields           |
| `src/app/login/componentsLogin/LoginButton.tsx`                           | MODIFICAR — error de usuario baneado             |
| Migracion SQL                                                             | CREAR via MCP                                    |
| Prisma types                                                              | REGENERAR con npm run genlocaltypes              |
