# P2 — Datos → Prisma en todo el código — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ningún archivo de `src/` use PostgREST (`.from()`), RPC (`.rpc()`) ni el cliente Supabase en el navegador para datos; todo el acceso a datos pasa por Prisma (server actions) con `company_id` explícito, actor en sesión SQL, sin `any`, sin realtime de Supabase y sin la cookie `actualComp`. Al terminar P2 la app corre contra el Postgres del compose (P1).

**Architecture:** Migración carpeta por carpeta (una task = una carpeta o grupo), en orden de dependencia. Tres piezas transversales primero: `callFunction` (RPC → `$queryRaw` tipado + Zod), `withActor` (fija `app.user_id` para los triggers de auditoría) y la limpieza de `src/shared`. Supabase Auth (`auth.*`) y Storage (`storage.*`) se conservan en esta etapa (P3/P4 los reemplazan); sólo se migra el acceso a datos.

**Tech Stack:** Prisma 7, Zod, React Query 5, Vitest, Cypress (no ejecutable en este entorno: se deja registrado).

**Spec:** `docs/superpowers/specs/2026-09-21-salida-de-supabase-design.md` (secciones 6, 7, 8-P2, 9).

## Global Constraints

- Reglas del repo: commits sólo asunto sin Co-Authored-By; sin prettier/eslint; sin `any`; `logger`, no `console.*`; React Query para datos en cliente; sin `useEffect`+`useState` para fetch; `getActiveCompanyId()` (nunca cookie) en actions; `withCompany` en lecturas de tablas con `company_id`; `company_id` explícito en todo `create`; `PermissionGuard` intacto.
- **Definición de "carpeta migrada"** (criterio de terminado de cada task):
  1. `grep -rlE "\.from\('|\.rpc\('|supabaseBrowser\(" <carpeta>` → 0. `supabaseServer()`/`adminSupabaseServer()` sólo para `auth.*` y `storage.*` (con comentario `// P3: storage` / `// P4: auth`).
  2. `grep -rE ":\s*any\b|as any" <carpeta>` → 0.
  3. `grep -rn "actualComp" <carpeta>` → 0.
  4. `grep -rn "console\." <carpeta>` → 0 (logger).
  5. `grep -rn "database.types" <carpeta>` → 0 (tipos desde `@/generated/prisma/client` o propios).
  6. Archivos tocados > 1.000 líneas: divididos por responsabilidad (`queries.server.ts` / `mutations.server.ts` / `export.server.ts` / `lib/*.ts` puro con test). (Desvío del spec: 1.000 en lugar de 600; los de 600–1.000 se dividen sólo si la migración lo pide.)
  7. Lógica pura nueva o extraída (validaciones, cálculos, máquinas de estado) con test Vitest.
  8. `npm run check-types` y `npm test` verdes; commit por subcarpeta.
- Flujos anónimos (`src/app/maintenance/**`, `NuevoPedido`, `Checklist`, `OperatorPanel`) derivan `company_id` del recurso; funciones `'use cache'` reciben `companyId` por parámetro.
- Cypress no corre en este entorno (sin `cypress.env.json` ni app levantada): cada task lista los specs afectados en el reporte para correrlos en CI.
- No tocar `src/lib/supabase/{server,browser}.ts` (los borra P4).

---

### Task 0: Piezas transversales y `src/shared`

**Files:**
- Create: `src/shared/lib/sql.ts`, `src/shared/lib/sql.test.ts`, `src/shared/lib/actor.ts`, `src/shared/lib/actor.test.ts`
- Modify/Delete: los 19 archivos de `src/shared/**` con Supabase (`grep -rlE "supabaseServer\(|supabaseBrowser\(|createClient\(" src/shared`), en particular `src/shared/actions/document-actions.ts`, `src/shared/actions/supabase-query.ts` (`select_distinct_values`), `src/shared/actions/company.actions.ts`, `company-user.actions.ts`, `src/shared/store/{loggedUser,countries}.ts` (realtime), `src/shared/components/**` que consulten datos desde el cliente.
- Modify: `src/lib/**` que use `.from()` (2 archivos; verificar).

**Interfaces:**
- Produces:
  ```ts
  // src/shared/lib/sql.ts  (server-only)
  import 'server-only';
  import { Prisma } from '@/generated/prisma/client';
  import { z } from 'zod';
  export async function callFunction<T extends z.ZodTypeAny>(
    name: string,                       // nombre de función SQL en public, validado con /^[a-z_][a-z0-9_]*$/
    args: readonly unknown[],           // se bindean como $1..$n (nunca interpolados)
    schema: T,                          // schema Zod del resultado (array de filas o valor escalar)
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<z.infer<T>>;
  // Genera: SELECT * FROM public.<name>($1, $2, ...) para funciones que devuelven TABLE/SETOF;
  // para escalares (RETURNS boolean/int/json) usa SELECT public.<name>($1,...) AS value y devuelve value.
  // Segundo helper explícito: callScalar(name, args, schema).
  ```
  ```ts
  // src/shared/lib/actor.ts
  import 'server-only';
  /** Ejecuta fn dentro de una transacción con SET LOCAL app.user_id = <userId> (uuid validado) para los triggers de auditoría. */
  export async function withActor<T>(userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  /** Variante para usar dentro de una tx existente. */
  export async function setActor(tx: Prisma.TransactionClient, userId: string): Promise<void>;
  ```
  `userId` = `profile.credential_id` del usuario de sesión (hasta P4, el `user.id` de Supabase Auth). Helper `getSessionUserId()` en `src/shared/lib/session.ts` que hoy lee `supabaseServer().auth.getUser()` (P4 lo reemplaza) — único punto de contacto.

- [ ] **Step 1 (TDD `callFunction`)**: tests con un `client` falso que capture el SQL generado: nombre inválido → lanza; args se bindean (`$1`, `$2`) y no aparecen en el texto; schema inválido → `ZodError`; escalar vs tabla. RED → implementar → GREEN.
- [ ] **Step 2 (TDD `withActor`)**: con cliente falso, verifica que se emite `SET LOCAL app.user_id = '<uuid>'` con uuid validado (regex) antes de `fn`, y que un uuid inválido lanza sin abrir tx.
- [ ] **Step 3**: migrar `src/shared/**`: `select_distinct_values` → `callFunction` con schema `z.array(z.object({ value: z.string().nullable() }))` (verificar firma en `prisma/sql/misc.sql`); `document-actions.ts` → Prisma (`document_types.findMany`, `documents_*.findUnique` con `include` de lo que consumen los llamadores); stores con realtime → quitar `.channel()`; los datos pasan a React Query con `refetchInterval` donde corresponda (`countries`: sin refetch, es catálogo).
- [ ] **Step 4**: `npm test`, `check-types`, criterio de carpeta migrada sobre `src/shared` y `src/lib` (salvo `supabase/`). Commit `refactor(shared): callFunction, withActor y shared sin PostgREST`.

---

### Task 1: Permissions + UserPermissionsManager

**Files:** `src/features/Permissions/{actionsServer.ts,actions.ts,...}`, `src/features/UserPermissionsManager/**`.

- [ ] Los 4 RPC (`get_user_permissions`, `check_multiple_permissions`, `user_has_permission`, `get_user_accessible_modules`) → `callFunction` con `p_user_id = await getSessionUserId()` y schemas Zod (firmas en `prisma/sql/permissions.sql`). Unificar `Permissions/actions.ts` (cliente) y `UserPermissionsManager/actions.server.ts` en una sola capa de server actions; CRUD de `roles`/`role_permissions`/`user_permissions` en Prisma con la unique compuesta.
- [ ] Corregir el `tabId` duplicado de `permissions-map.ts` (`equipments_with_deviations` en `equipos:627` y `mantenimiento:994`): asignar UUID nuevo a la entrada de `equipos` y agregar la tab a `scripts/seed-company.ts` vía el mapa (el seed la crea sola) + migración `YYYYMMDDHHMMSS_fix_duplicate_tab_id/migration.sql` con el INSERT de la tab y sus `role_permissions` para los 3 roles.
- [ ] Test Vitest de `canViewServer`/inferencia de subtabs (lógica pura extraída a `lib/visibility.ts`).
- [ ] Criterio de carpeta migrada. Commit `refactor(permisos): permisos sobre Prisma y callFunction, capa única`.

### Task 2: Documentacion (13 archivos)
- [ ] `TiposDocumentos/actions/actions.server.ts` (1.717 líneas) → dividir en `queries.server.ts`, `mutations.server.ts`, `consistency.server.ts`, `lib/document-conditions.ts` (puro: `resourceMatchesConditions(resource, conditions)` con tests). Unificar `SimpleDocument` y `UploadDocumentMulti*` en `uploadMultiResourceDocument` (N=1); `shared/actions/document-actions.ts` ya migrado en Task 0. Llamadas a `controlar_alertas_*` vía `callFunction` (firmas nuevas: ver INVENTARIO) dentro de `withActor`.
- [ ] Criterio. Commits por subcarpeta (`DocumentosEmpleados`, `DocumentosEquipos`, `DocumentosEmpresa`, `TiposDocumentos`, `shared`).

### Task 3: Employees (14 archivos)
- [ ] `Diagrams/`: `diagram-mutations.ts`, `diagram-queries.ts`, `action.ts`, `supabase-query.ts` → Prisma; RPC `check_diagram_conflicts_with_operations_v2`, `process_massive_diagram_creation_v2`, `check_novelty_conflicts`, `process_massive_novelty_creation`, `update_employee_diagram_status` → `callFunction`; quitar realtime de `DiagramEmployeeView.tsx`; `DiagramEmployeeViewCOPI.tsx` → `DiagramEmployeeView*` (renombrar, corregir `EmployesDiagramWrapper`). `PreLegajos` ya en Prisma: sumar `state-machine.test.ts`. `EmpleadoID/lib/actions/*` restantes.
- [ ] Criterio. Commits por subcarpeta.

### Task 4: Equipos (13 archivos)
- [ ] `EquipoID/lib/actions/vehicle-actions.ts` (`vehicleData: any` → `Prisma.vehiclesCreateInput`), `OtherEquipment`, `DocumentosEquipos`, `vehicle-tires` restos. QR: `getResourceCompanyId` ya existe.
- [ ] Criterio. Commits por subcarpeta.

### Task 5: Empresa A — Clientes
- [ ] `Clientes/actions/{customer,service,services,itemsService}.ts` → un `Clientes/actions/*.server.ts` por dominio (customers, services, items, areas, sectors, contacts, equipos) en Prisma; `components/**` que hagan fetch desde cliente → React Query sobre las actions; `data-customer.tsx` (1.030) dividido. Afectaciones M:M mantienen altas/bajas explícitas + `callFunction('controlar_alertas_documentos_single_employee'...)`.
- [ ] Criterio. Commits por subcarpeta.

### Task 6: Empresa B — General, Usuarios, Contactos, AccesosExternos, Mantenimiento (talleres/sectores)
- [ ] `General/actions/{actions.server,actions,workshops.actions}.ts`, `Usuarios` (ya Prisma en su mayoría; el `registerUserWithRole` sigue con `auth.admin` → `// P4: auth`), `Contactos`, `AccesosExternos` (ya Prisma).
- [ ] Criterio. Commits.

### Task 7: Empresa C — RRHH, Equipos (catálogos), CCT
- [ ] Consolidar forms legacy con importadores vivos: `Equipos/{brand,sub_types,types}` → mover el form a la carpeta del DataTable nuevo (`EquipmentBrands`, `EquipmentSubTypes`, `EquipmentTypes`) y borrar la carpeta legacy; `RRHH/components/{AptitudesTecnicas,verActivosButton.tsx,work-diagram-form.tsx}` ídem; `CCT/` (mutaciones embebidas en modales → `CCT/actions/*.server.ts`); `RRHH/tabs/TiposDeNovedades/actions/actions.ts`; `Equipos/actions/actions.ts` (1.133: `getHitchTypesForType`, `getCompatibleItemsForSubType`).
- [ ] Criterio. Commits por subcarpeta.

### Task 8: Operaciones + Comercial
- [ ] `PartesDiarios/actions/actions.ts` (2.174) y `detail/actions.server.ts` (2.380): dividir (`queries`, `mutations`, `validation`, `export`, `history`); RPC `get_daily_report_deviations`, `get_dailyreportrow_history`, `get_services_summary_by_type` → `callFunction`; eliminar la llamada comentada a `get_services_summary_by_type_with_dates` (no existe); `lib/resource-deviations.ts` puro con tests (`classifyEmployeeDeviation`, `classifyEquipmentDeviation`); `Preparte/actions/preparte.ts` (`get_max_order_number(p_company_id)`, update masivo → `updateMany`); `PreparteForm.tsx` (1.450) dividido por sección. `Certificacion/actions/actions.ts` → server action Prisma `bulkCertifyRows` (mover `transformDailyReports` a `Certificacion/lib/transform.ts`, rompe el ciclo con Comercial). `Comercial` wrappers sin `.from()`.
- [ ] Criterio. Commits por subcarpeta.

### Task 9: Mantenimiento, OperatorPanel, Checklist, Formularios
- [ ] Mantenimiento (9 restos Supabase), `OperatorPanel/actions/actionsServer.ts` (1.284 → `auth.server.ts` + `work-orders.server.ts`), `Checklist/actions`, `Formularios/actions/checklist-actions.ts` (`find_employee_by_full_name_v2` → `callFunction`), `NormalizedChecklistForm.tsx` (2.467 → `lib/checklist-evaluation.ts` puro con tests + componentes por sección), `Inputs.tsx` (1.068). Separar `Formularios` (custom_form) de `Checklists` en carpetas propias. `getChecklistTemplatesForEquipment` (`'use cache'`) recibe `companyId` del vehículo. Título hardcodeado `'Transporte SP-ANAY - CHK - HYS - 03'` → filtro real por subtipo.
- [ ] Criterio. Commits por subcarpeta.

### Task 10: Dashboard, Layout, Ayuda, Clothing
- [ ] `Dashboard/Principal/actions/actions.server.ts` (1.907 → `fleet`, `rrhh`, `services`, `checklists`); `KPIs` RPC `generate_kpi_code`, `get_kpi_range` → `callFunction`; `Layout` (selector de empresa sobre `setNewCompanyUserMetadata` sin `.from()`), `Ayuda` (sólo `support_ticket_views`), `Clothing` restos.
- [ ] Criterio. Commits.

### Task 11: `src/app` (37 archivos)
- [ ] `api/` (23): borrar handlers sin consumidores (verificar con grep en `src` y `cypress`; conservar `external/v1`, `taskapp/events`, `auth/*`, `upload` si tiene consumidores); los que tengan consumidores → server actions en la feature dueña y borrar el handler. `dashboard/**/page.tsx` (6) y `dashboard/company/actualCompany/**` → mover lógica a `features/Empresa` y dejar páginas delgadas; borrar realtime en `company/page.tsx`. `maintenance/**` (6): datos por server actions (la sesión anónima `auth.*` se queda `// P4`). `login`/`operator`: sólo `auth.*`.
- [ ] Criterio para `src/app`. Commits por subcarpeta.

### Task 12: Auth (5 archivos) — sólo datos
- [ ] `profile`, `share_company_users`, `user_roles`, `password_reset_tokens` → Prisma; las llamadas `auth.*` se conservan con `// P4: auth`. Eliminar el flujo propio de reset (`password_reset_tokens`, `verifyResetToken`, `markTokenAsUsed`) y dejar sólo el nativo (P4 lo reemplaza entero). `registerUserWithRole(values: RegisterUserInput)` con Zod en `Auth/schemas/`.
- [ ] Criterio. Commit.

### Task 13: Cierre de P2
- [ ] `grep -rlE "\.from\('|\.rpc\('|supabaseBrowser\(" src` → 0; `grep -rn "actualComp" src` → sólo `src/lib/supabase`/middleware si aún la fija (P4 la elimina) — objetivo 0 en `features`; `grep -rn "database.types" src` → 0 y borrar `database.types.ts`; `grep -rn "\.channel(" src` → 0; `any` → 0 en `src/features` y `src/shared`.
- [ ] Extensión de Prisma "guardia multi-tenant" en `src/shared/lib/prisma.ts` (modo `warn` en producción, `throw` en dev/test) con test.
- [ ] Baseline de métricas actualizado (`docs/superpowers/plans/baseline-2026-09-18.md` + sección "P2"); `.claude/rules/server-actions.md`/`react-query.md`/`efficient-queries.md` sin menciones a Supabase como opción.
- [ ] Commit `chore(p2): cierre — sin PostgREST ni RPC en src, guardia multi-tenant`.

**Criterio de terminado P2:** los 8 puntos de "carpeta migrada" en todo `src/features`, `src/shared`, `src/app`; `npm test` y `check-types` verdes; la app levanta contra el Postgres del compose (login sigue en Supabase Auth hasta P4).
