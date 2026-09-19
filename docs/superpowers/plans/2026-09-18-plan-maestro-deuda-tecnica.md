# Plan maestro — Resolución de deuda técnica principal (base alphataco)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el código heredado de gh_gestion limpio de flujos duplicados, código muerto, accesos legacy a datos y riesgos de seguridad, para usarlo como base sana del nuevo producto **alphataco**.

**Architecture:** Se trabaja por fases con orden de dependencia: primero red de seguridad (CI + baseline), luego borrado (lo que no se usa no se migra), luego consolidación de flujos duplicados, luego seguridad/tenancy, y recién después la migración Supabase→Prisma carpeta por carpeta, el split de archivos gigantes con tests unitarios y la limpieza de reglas menores. Cada fase termina con `check-types` verde, E2E verde y un PR mergeado a `dev`.

**Tech Stack:** Next.js 16, React 19, Prisma 7 (`@prisma/adapter-pg`), Supabase (Auth/Storage/RPC), React Query 5, Cypress 15, Vitest (se incorpora en Fase 5), GitHub Actions (se incorpora en Fase 0).

**Spec:** `../../../../reporte-tecnico-gh_gestion.md` (secciones 6, 8 y 9) y `../../../../reporte-funcional-gh_gestion.md`. El plan argumenta desde el reporte técnico; leer ambos antes de ejecutar.

## Global Constraints

- Reglas del repo (`CLAUDE.md`, `.claude/rules/*.md`) siguen vigentes salvo donde este plan diga lo contrario: no `any`, no `console.*`, no API routes nuevas, Prisma para código nuevo, moment.js, React Query, `PermissionGuard` en todo botón de mutación.
- Commits: **sólo línea de asunto**, sin cuerpo, sin `Co-Authored-By` (regla del repo). Formato `tipo(scope): descripción`.
- Ramas: una rama `chore/deuda-fase-N-<tema>` por fase, PR contra `dev`. No mergear con `check-types` o E2E rojos.
- Borrado de código: sólo tras confirmar **0 importadores** con `grep -rl` (los conteos de este plan se midieron el 18/09/2026; re-verificar al ejecutar).
- Migraciones de BD: `npx prisma migrate dev --create-only --name <nombre>` + SQL manual; **nunca aplicar a dev sin validar el alcance** con el responsable del proyecto.
- Decisiones ya tomadas para alphataco (no re-discutir en ejecución):
  1. El circuito legacy de reparaciones (`repair_solicitudes`/`repairlogs`) **se elimina completo**; sobrevive sólo `maintenance_requests → maintenance_orders → work_orders`.
  2. La familia de rutas QR que sobrevive es **`/maintenance/equipment/[id]/*`** (Prisma). `/maintenance/[id]` y `features/Mantenimiento/QR` se eliminan.
  3. Partes diarios viven en **`features/Operaciones`**; `Comercial` consume de ahí.
  4. alphataco se prepara como **multi-empresa**: toda query de negocio filtra por `company_id` obtenido de un único helper; `IS_SINGLE_TENANT`/`DEFAULT_COMPANY_ID` desaparecen.
  5. Los datos específicos de Grupo Horizonte (emails de destinatarios, ids hardcodeados, títulos de checklist) se **parametrizan**, no se borran.

---

## Mapa de fases y orden

| Fase | Tema | Depende de | Esfuerzo estimado |
|---|---|---|---|
| 0 | Red de seguridad: baseline, CI, renombre del paquete | — | 1 día |
| 1 | Purga de código muerto verificado | 0 | 1–2 días |
| 2 | Eliminar flujos duplicados (reparaciones legacy, QR viejo, partes diarios ×3) | 1 | 4–6 días |
| 3 | Seguridad y tenancy (env, `company_id` central, hardcodes GH) | 1 | 2–3 días |
| 4 | Migración Supabase → Prisma por carpeta + eliminación de `any` | 2, 3 | 10–15 días |
| 5 | Split de archivos > 1.000 líneas + Vitest para lógica pura | 4 | 6–8 días |
| 6 | Tests de funciones SQL críticas (pgTAP) | 3 | 3–4 días |
| 7 | Reglas menores (console, date-fns, typos, duplicados residuales) | 4 | 2 días |

Las estimaciones son de una persona a tiempo completo con asistencia de agentes. Las fases 4, 5 y 6 son grandes: **cada carpeta/archivo recibe su propio plan detallado** (con `superpowers:writing-plans`) en el momento de ejecutarla, porque exige leer el código archivo por archivo. Este documento fija el inventario, el orden y el criterio de terminado de cada una.

---

## Fase 0 — Red de seguridad

### Task 0.1: Baseline verificable

**Files:**
- Create: `docs/superpowers/plans/baseline-2026-09-18.md`

- [ ] **Step 1: Instalar y verificar tipos**

Run: `npm ci && npm run check-types`
Expected: exit 0 (si falla, anotar los errores en el baseline; no arreglar todavía).

- [ ] **Step 2: Medir métricas de deuda y guardarlas**

```sh
cd $(git rev-parse --show-toplevel)
{
  echo "# Baseline $(date -I)"
  # src/generated (cliente Prisma) se excluye: es código generado y distorsiona todo
  G=--exclude-dir=generated
  echo "supabase_files: $(grep -rlE $G 'supabaseServer\(|supabaseBrowser\(|createClient\(' src --include='*.ts' --include='*.tsx' | wc -l)"
  echo "prisma_files: $(grep -rl $G 'shared/lib/prisma' src | wc -l)"
  echo "any_usages: $(grep -rE $G ':\s*any\b|as any' src --include='*.ts' --include='*.tsx' | wc -l)"
  echo "console_usages: $(grep -rE $G 'console\.(log|error|warn)' src --include='*.ts' --include='*.tsx' | wc -l)"
  echo "api_routes: $(find src/app/api -name route.ts | wc -l)"
  echo "files_over_1000: $(find src -path src/generated -prune -o -name '*.ts*' -print | xargs wc -l | awk '$1>1000 && $2!="total"' | wc -l)"
  echo "date_fns_files: $(grep -rl $G "from 'date-fns'" src | wc -l)"
} > docs/superpowers/plans/baseline-2026-09-18.md
cat docs/superpowers/plans/baseline-2026-09-18.md
```
Expected (valores del 18/09): supabase 217 · prisma 122 · any 905 · console 354 · api_routes 48 · files_over_1000 32 · date_fns 41.

- [ ] **Step 3: Correr E2E completo una vez con Supabase local**

Run: `npm run local` (en otra terminal) y luego `npm run test:e2e`
Expected: registrar en el baseline qué specs pasan y cuáles fallan **antes** de tocar nada. Los que fallan hoy no bloquean fases posteriores, pero no pueden aumentar. Si no se puede ejecutar (otra instancia de Supabase local ocupando los puertos, sin `cypress.env.json`), registrar `E2E: no ejecutado — <motivo>` y completarlo cuando haya entorno.

- [ ] **Step 4: Commit**

```sh
git checkout -b chore/deuda-fase-0-baseline
git add docs/superpowers/plans/baseline-2026-09-18.md
git commit -m "chore(deuda): baseline de métricas y estado E2E previo a la limpieza"
```

### Task 0.2: CI mínima en GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Crear el workflow**

```yaml
name: CI
on:
  pull_request:
    branches: [dev, main]
  push:
    branches: [dev, main]
jobs:
  types-and-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
        env:
          DATABASE_URL: postgresql://placeholder:placeholder@localhost:5432/placeholder
      - run: npm run check-types
      - run: npx eslint src --ext .ts,.tsx --max-warnings=0 || true   # informativo hasta Fase 7
```
Nota: `postinstall` corre `prisma generate`, que sólo necesita `DATABASE_URL` definido, no accesible.

- [ ] **Step 2: Verificar localmente que el mismo comando pasa**

Run: `npm run check-types`
Expected: exit 0.

- [ ] **Step 3: Commit y PR**

```sh
git add .github/workflows/ci.yml
git commit -m "ci: check-types en PRs a dev y main"
git push -u origin chore/deuda-fase-0-baseline
gh pr create --base dev --title "chore(deuda): fase 0 — baseline y CI" --body "Baseline de métricas + workflow de check-types."
```
Expected: el check `CI / types-and-lint` aparece verde en el PR. (E2E en CI queda para después de la Fase 3, cuando exista un seed reproducible.)

### Task 0.3: Renombrar el paquete

**Files:**
- Modify: `package.json:2` (`"name": "s-code-control"` → `"name": "alphataco"`)
- Modify: `README.md` (encabezado y sección de licencia: dejar sólo lo que aplique a alphataco; conservar las secciones de Supabase/Server actions/tipado)

- [ ] **Step 1: Editar `package.json`**

```sh
sed -i 's/"name": "s-code-control"/"name": "alphataco"/' package.json
grep -n '"name"' package.json
```
Expected: `"name": "alphataco"`.

- [ ] **Step 2: Commit**

```sh
git add package.json README.md
git commit -m "chore: renombrar paquete a alphataco"
```

**Criterio de terminado Fase 0:** PR mergeado a `dev`, CI verde, baseline documentado.

---

## Fase 1 — Purga de código muerto verificado

Todo lo listado tiene **0 importadores** medidos el 18/09/2026. Cada tarea re-verifica antes de borrar.

### Task 1.1: Route handlers sin consumidores

**Files:**
- Delete: `src/app/api/daily-report/**` (10 handlers)
- Delete: `src/app/api/company/**` (4 handlers)

- [ ] **Step 1: Re-verificar consumidores**

```sh
grep -rn "api/daily-report" src --include='*.ts' --include='*.tsx' | grep -v "src/app/api/"
grep -rnE "['\"\`]/api/company" src --include='*.ts' --include='*.tsx' | grep -v "src/app/api/"
```
Expected: ambos sin salida. Si `api/company` tuviera consumidores externos (integraciones del cliente), **preguntar antes de borrar**; para alphataco se asume que no.

- [ ] **Step 2: Borrar y verificar tipos**

```sh
git rm -r src/app/api/daily-report src/app/api/company
npm run check-types
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```sh
git commit -m "chore(api): eliminar handlers daily-report y company sin consumidores"
```

### Task 1.2: `OrdenesTrabajo` huérfano (conservando sus tipos)

**Files:**
- Move: `src/features/Mantenimiento/OrdenesTrabajo/types/*` → `src/features/Mantenimiento/shared/work-order-types.ts`
- Modify: los 6 importadores de `@/features/Mantenimiento/OrdenesTrabajo/types`
- Modify: `src/shared/constants/cache-invalidation-map.ts:155-160` (bloque `── OrdenesTrabajo ──`: conservar sólo las claves que existan como action en `OperatorPanel`/`MaintenanceOrders`; borrar `completeWorkOrder`, `completeWorkOrderItemRepair`, `completeMultipleRepairs`, `cancelWorkOrder` si no hay action con ese nombre fuera de `OrdenesTrabajo`)
- Delete: `src/features/Mantenimiento/OrdenesTrabajo/` (resto)

**Interfaces:**
- Produces: `@/features/Mantenimiento/shared/work-order-types` exportando exactamente los mismos símbolos que hoy exporta `OrdenesTrabajo/types` (`WORK_ORDER_STATUS_LABELS`, `WORK_ORDER_ITEM_STATUS_LABELS`, `WORK_ORDER_PRIORITY_LABELS`, `WorkOrderItemStatus`, `WorkOrderPriority`, y los demás que liste `index.ts`).

- [ ] **Step 1: Ver qué exporta el módulo de tipos y quién lo usa**

```sh
ls src/features/Mantenimiento/OrdenesTrabajo/types
grep -rn "OrdenesTrabajo" src --include='*.ts' --include='*.tsx' | grep -v "src/features/Mantenimiento/OrdenesTrabajo/"
```
Expected: 6 importadores de `.../OrdenesTrabajo/types` + 1 comentario en `cache-invalidation-map.ts`.

- [ ] **Step 2: Mover tipos y reescribir imports**

```sh
git mv src/features/Mantenimiento/OrdenesTrabajo/types/index.ts src/features/Mantenimiento/shared/work-order-types.ts   # ajustar si el archivo tiene otro nombre
grep -rl "features/Mantenimiento/OrdenesTrabajo/types" src | xargs sed -i "s#features/Mantenimiento/OrdenesTrabajo/types#features/Mantenimiento/shared/work-order-types#g"
```

- [ ] **Step 3: Confirmar que los nombres de las actions del bloque de caché existen fuera de OrdenesTrabajo**

```sh
for a in startWorkOrder completeWorkOrder completeWorkOrderItemRepair completeMultipleRepairs cancelWorkOrder; do
  echo "$a: $(grep -rl "export async function $a\b\|export const $a\b" src --include='*.ts' | grep -v OrdenesTrabajo | wc -l)"
done
```
Expected: los que den 0 se eliminan del bloque en `cache-invalidation-map.ts`; los que den ≥1 se mueven bajo el comentario del feature dueño.

- [ ] **Step 4: Borrar la carpeta y verificar**

```sh
git rm -r src/features/Mantenimiento/OrdenesTrabajo
npm run check-types
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```sh
git commit -m "chore(mantenimiento): eliminar OrdenesTrabajo huérfano y mover sus tipos a shared"
```

### Task 1.3: Carpetas legacy de `Empresa/RRHH` y `Empresa/Equipos`

**Files:**
- Delete: `src/features/Empresa/Equipos/{brand,model,sub_types,types,titulares}/`
- Delete: `src/features/Empresa/RRHH/components/{AptitudesTecnicas,CompanyPositions,TypeContract}/`
- Revisar (no borrar a ciegas): `src/features/Empresa/RRHH/components/{baseModal,skeletonTable,verActivosButton,work-diagram-form}.tsx`

- [ ] **Step 1: Re-verificar importadores de cada carpeta**

```sh
for d in Empresa/Equipos/brand Empresa/Equipos/model Empresa/Equipos/sub_types Empresa/Equipos/types Empresa/Equipos/titulares Empresa/RRHH/components/AptitudesTecnicas Empresa/RRHH/components/CompanyPositions Empresa/RRHH/components/TypeContract; do
  echo "$d: $(grep -rlE "features/$d|\./(${d##*/})" src --include='*.ts' --include='*.tsx' | grep -v "src/features/$d/" | wc -l)"
done
```
Expected: todos 0. Cualquier valor > 0 → abrir el importador y decidir (probablemente `EquipmentsTabContent.tsx` / `RrhhTabContent.tsx` con imports relativos que el primer grep no vio).

- [ ] **Step 2: Borrar y verificar**

```sh
git rm -r src/features/Empresa/Equipos/{brand,model,sub_types,types,titulares} src/features/Empresa/RRHH/components/{AptitudesTecnicas,CompanyPositions,TypeContract}
npm run check-types
```
Expected: exit 0. Si falla por los 4 archivos sueltos de `RRHH/components/`, moverlos junto a su único consumidor.

- [ ] **Step 3: Commit**

```sh
git commit -m "chore(empresa): eliminar CRUDs legacy de RRHH y Equipos reemplazados por DataTable"
```

### Task 1.4: Archivos sueltos sospechosos

**Files:**
- Delete (si 0 importadores): `src/features/Operaciones/PartesDiarios/DailyReportTable.tsx`, `src/features/Employees/**/DiagramEmployeeViewCOPI.tsx`

- [ ] **Step 1: Verificar y borrar**

```sh
grep -rn "DailyReportTable'" src --include='*.ts' --include='*.tsx' | grep -v "PartesDiarios/DailyReportTable.tsx"
grep -rn "DiagramEmployeeViewCOPI" src --include='*.ts' --include='*.tsx' | grep -v "DiagramEmployeeViewCOPI.tsx"
```
Expected: sin salida → `git rm` de ambos, `npm run check-types`, commit `chore: eliminar componentes sin importadores`.

### Task 1.5: Tabla `hired_modules` sin uso

**Files:**
- Create: `prisma/migrations/<timestamp>_drop_hired_modules/migration.sql`
- Modify: `prisma/schema.prisma` (quitar `model hired_modules` y la relación inversa en `company` y `modules`)

- [ ] **Step 1: Confirmar 0 usos y crear migración**

```sh
grep -rn "hired_modules" src --include='*.ts' --include='*.tsx' | grep -v generated     # esperado: vacío
npx prisma migrate dev --create-only --name drop_hired_modules
```
Contenido de `migration.sql`:
```sql
DROP TABLE IF EXISTS "public"."hired_modules";
```

- [ ] **Step 2: Quitar el modelo del schema, regenerar y verificar**

Run: `npx prisma generate && npm run check-types`
Expected: exit 0.

- [ ] **Step 3: Validar alcance con el responsable y aplicar en dev**

Run: `npx prisma migrate dev`
Expected: migración aplicada; `npm run db:status` sin pendientes.

- [ ] **Step 4: Commit**

```sh
git add prisma
git commit -m "chore(db): eliminar tabla hired_modules sin consumidores"
```

**Criterio de terminado Fase 1:** `api_routes` ≤ 33, `check-types` verde, E2E igual o mejor que baseline, PR mergeado.

---

## Fase 2 — Eliminar flujos duplicados

### Task 2.1: Circuito legacy de reparaciones (`repair_solicitudes` / `repairlogs`)

**Inventario (17 archivos + 1 ruta):**
- Delete: `src/features/Mantenimiento/{RepairEntry,RepairRequests,RepairSolicitudes}/`
- Delete: `src/features/Mantenimiento/TiposReparaciones/{RepairEntry,RepairEntryMultiple,RepairEntryWrapper}.tsx`
- Modify: `src/features/Mantenimiento/TiposReparaciones/actions/actions.ts` (quitar funciones que toquen `repair_solicitudes`)
- Modify: `src/features/Mantenimiento/actions/maintenance-actions.ts` (ídem)
- Delete: `src/app/api/repair_solicitud/route.ts`, `src/app/api/repairs/**`
- Delete: `src/app/maintenance/equipment/[id]/requests/page.tsx` (listado legacy; el nuevo es `request/`)
- Modify: `src/features/Dashboard/Estadisticas/Mantenimiento/actions/actions.server.ts:279-330,409-425` (quitar `_count.repair_solicitudes`, `TERMINAL_REPAIR_STATES`; los conteos quedan sólo con `maintenance_orders`)
- Modify: `src/features/Mantenimiento/MantenimientoComponent.tsx` (borrar las tabs comentadas `created_solicitudes`/`type_of_repair_new_entry`)
- Modify: `src/types/globals.ts`, `src/shared/types/legacy.ts`, `src/lib/utils.ts` (quitar tipos/helpers de repair)
- Modify: `src/features/Permissions/permissions-map.ts` (quitar tabs del flujo viejo si sólo existen para él) + migración SQL que borre esas `tabs`/`role_permissions`
- Create (al final): migración `drop_repair_solicitudes` que elimine `checklist_answer_repairs`, `repairlogs`, `repair_solicitudes` y quite los modelos del schema

- [ ] **Step 1: Ordenar el borrado desde las hojas**

```sh
grep -rl "repair_solicitudes\|repairlogs\|RepairSolicitudes\|RepairEntry\|RepairRequests" src --include='*.ts' --include='*.tsx' | grep -v generated
```
Borrar primero páginas y rutas API, después componentes, después actions, después tipos. Correr `npm run check-types` tras cada bloque.

- [ ] **Step 2: Ajustar Estadísticas de Mantenimiento**

En `actions.server.ts` reemplazar `const repairs = v._count.repair_solicitudes;` y su suma por sólo `orders`. Verificar que el gráfico sigue renderizando con `npm run dev` → `/dashboard` → Estadísticas → Mantenimiento.

- [ ] **Step 3: E2E afectados**

Run: `npx cypress run --spec 'cypress/e2e/maintenance/**,cypress/e2e/equipment/type_of_repairs--*.cy.ts'`
Expected: los specs `type_of_repairs--created_solicitudes` y `type_of_repairs--type_of_repair_new_entry` se **eliminan** (prueban el flujo borrado); el resto verde.

- [ ] **Step 4: Migración de BD (última, tras validar alcance)**

```sql
DROP TABLE IF EXISTS "public"."checklist_answer_repairs";
DROP TABLE IF EXISTS "public"."repairlogs";
DROP TABLE IF EXISTS "public"."repair_solicitudes";
```
Quitar los tres modelos de `schema.prisma`, `npx prisma generate`, `check-types`.

- [ ] **Step 5: Commits (uno por bloque)**

`refactor(mantenimiento): eliminar rutas y páginas del circuito legacy de reparaciones` · `refactor(mantenimiento): eliminar componentes RepairEntry/RepairRequests/RepairSolicitudes` · `refactor(dashboard): estadísticas de mantenimiento sólo sobre maintenance_orders` · `chore(db): eliminar tablas repair_solicitudes, repairlogs y checklist_answer_repairs`.

### Task 2.2: QR viejo (`/maintenance/[id]` y `features/Mantenimiento/QR`)

**Files:**
- Delete: `src/app/maintenance/[id]/page.tsx`
- Delete: `src/features/Mantenimiento/QR/`
- Revisar: `src/app/api/shared_company_role/route.ts` (sólo lo usa el QR viejo vía `fetch` → borrar si queda sin consumidores)
- Modify: componente que genera el QR en la ficha del equipo (`src/features/Equipos/EquipoID/**` tab "QR" y `OtherEquipment` tab "QR"): la URL codificada debe ser `${NEXT_PUBLIC_PROJECT_URL}/maintenance/equipment/${id}`
- Modify: `src/app/maintenance/equipment/[id]/checklists/page.tsx` — reemplazar el título hardcodeado `'Transporte SP-ANAY - CHK - HYS - 03'` por el filtro real: checklists activos cuyo `checklist_template_sub_types` incluya el `sub_type` del vehículo (ya existe la relación en `sub_type` ↔ `checklist_templates`)

- [ ] **Step 1: Confirmar qué URL genera hoy el QR**

```sh
grep -rn "maintenance/" src/features/Equipos --include='*.tsx' | grep -i "qr\|href\|value" | head
```
Expected: identificar la única función/constante que arma la URL; dejarla apuntando a `/maintenance/equipment/`.

- [ ] **Step 2: Borrar ruta vieja y feature QR, verificar**

```sh
git rm -r "src/app/maintenance/[id]" src/features/Mantenimiento/QR
grep -rn "shared_company_role" src --include='*.ts' --include='*.tsx' | grep -v "src/app/api/"   # si vacío → git rm -r src/app/api/shared_company_role
npm run check-types
```

- [ ] **Step 3: Prueba manual del recorrido chofer**

`npm run dev` → `/maintenance` → seleccionar equipo → `/maintenance/equipment/<id>` → checklist → solicitud → gomería. Los tres botones funcionan con usuario anónimo.

- [ ] **Step 4: Commit**

`refactor(qr): unificar el acceso por QR en /maintenance/equipment/[id]`

### Task 2.3: Partes diarios en un solo lugar

**Situación:** la lógica de fila de parte diario existe en `Operaciones/PartesDiarios/detail/` (nuevo, Prisma) y en `Empresa/Clientes/components/operations/` (viejo, 1.313 líneas en `DailyReportRowForm.tsx` + `DailyReportRowFormRefactored.tsx` + `EnhancedComercialReportTable.tsx` + `ComercialReportTable.tsx` + `BulkCertificacionModal.tsx`), importado por `Comercial/Comerce/components/DayliReportWraper.tsx` y `Operaciones/PartesDiarios/components/DayliReportDetailTable.tsx`.

**Files:**
- Create: `src/features/Operaciones/Certificacion/` (nueva subfeature: tabla de filas ejecutadas por cliente/servicio/fecha + `BulkCertificacionModal` + `actions/certificacion.server.ts` con `bulkCertifyRows(rowIds: string[]): Promise<{ updated: number }>` en Prisma)
- Modify: `src/features/Comercial/Comerce/components/DayliReportWraper.tsx` → renombrar a `DailyReportWrapper.tsx` e importar de `@/features/Operaciones/Certificacion`
- Modify: `src/features/Operaciones/PartesDiarios/components/DayliReportDetailTable.tsx` → renombrar a `DailyReportDetailTable.tsx`; que use `PartesDiarios/detail/DailyReportDetailTable.tsx` (el nuevo) o borrarlo si es sólo un wrapper
- Delete: `src/features/Empresa/Clientes/components/operations/` completo

**Interfaces:**
- Produces: `bulkCertifyRows(rowIds: string[]): Promise<{ updated: number }>` — actualiza `dailyreportrows.status = 'en_certificacion'` sólo para filas en `status = 'ejecutado'` y de la empresa activa; lanza `Error('Ninguna fila elegible')` si `updated === 0`.

- [ ] **Step 1: Escribir el plan detallado de esta tarea con `superpowers:writing-plans`** (requiere leer los 5 componentes viejos y el detalle nuevo para decidir qué se reutiliza). Salida: `docs/superpowers/plans/2026-XX-XX-consolidar-partes-diarios.md`.
- [ ] **Step 2: Ejecutarlo.** Criterio: `grep -rl "Clientes/components/operations" src` vacío; E2E `operations/*` y `comercial/comerce--daily_reports.cy.ts` verdes; `DailyReportRowForm.tsx` de 1.313 líneas desaparece.
- [ ] **Step 3: Commit** `refactor(operaciones): consolidar partes diarios y certificación en features/Operaciones`.

**Criterio de terminado Fase 2:** ningún archivo referencia `repair_solicitudes`, `Mantenimiento/QR`, `maintenance/[id]` ni `Clientes/components/operations`; E2E ≥ baseline menos los specs eliminados a propósito.

---

## Fase 3 — Seguridad y tenancy

### Task 3.1: Auditoría de variables de entorno

**Files:**
- Modify: `.env.example`
- Create: `docs/desarrollo/entornos.md`

- [ ] **Step 1: Verificar en Supabase (dev y prod) qué key está cargada como `NEXT_PUBLIC_SUPABASE_ANON_KEY`**

Decodificar el JWT del `.env` de cada entorno: `node -e "console.log(JSON.parse(Buffer.from(process.argv[1].split('.')[1],'base64').toString()).role)" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"`
Expected: `anon`. Si dice `service_role` → **rotar la key en Supabase** inmediatamente y reemplazarla.

- [ ] **Step 2: Separar la service key en una variable de servidor**

`.env.example` queda:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # anon key (pública)
SUPABASE_SERVICE_ROLE_KEY=          # SOLO servidor, nunca NEXT_PUBLIC_
NEXT_PUBLIC_PROJECT_URL=
DATABASE_URL=
DIRECT_URL=
RESEND_SUPABASE_API_KEY=
TASKAPP_BASE_URL=
TASKAPP_PROJECT_API_KEY=
DOCUMENTS_EXPIRY_RECIPIENTS=        # coma-separado (Fase 3.4)
```
Buscar el cliente admin: `grep -rn "adminSupabaseServer\|service_role\|SERVICE" src/lib src/features/Auth` y hacer que use `process.env.SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 3: Verificar que ninguna variable `NEXT_PUBLIC_*` contiene secretos**

Run: `grep -rn "NEXT_PUBLIC_" src --include='*.ts' --include='*.tsx' -o | sort -u`
Expected: sólo URL, anon key, project URL, SHOW_LOGS, PostHog key.

- [ ] **Step 4: Commit** `fix(env): separar service role key de la anon key pública`

### Task 3.2: Helper único de empresa activa

**Files:**
- Create: `src/shared/lib/tenant.ts`
- Delete: `src/lib/company-config.ts` (8 archivos lo importan)
- Modify: los 8 importadores + los 116 archivos que leen la cookie `actualComp` directamente (migración incremental: primero los server actions, después componentes)
- Test: `src/shared/lib/tenant.test.ts` (Vitest; si Vitest aún no está, esta prueba se agrega en Fase 5.1 — dejar el archivo escrito)

**Interfaces:**
- Produces:
  ```ts
  // src/shared/lib/tenant.ts
  'use server';
  export class NoActiveCompanyError extends Error {}
  /** Empresa activa del request: app_metadata.company del JWT, con fallback a la cookie actualComp. Lanza NoActiveCompanyError si no hay ninguna. */
  export async function getActiveCompanyId(): Promise<string>;
  ```

- [ ] **Step 1: Escribir el test**

```ts
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ supabaseServer: vi.fn() }));
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
import { getActiveCompanyId, NoActiveCompanyError } from './tenant';

describe('getActiveCompanyId', () => {
  it('prefiere app_metadata.company del JWT', async () => {
    (supabaseServer as any).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { app_metadata: { company: 'c-jwt' } } } }) } });
    (cookies as any).mockResolvedValue({ get: () => ({ value: 'c-cookie' }) });
    expect(await getActiveCompanyId()).toBe('c-jwt');
  });
  it('cae a la cookie actualComp si el JWT no trae empresa', async () => {
    (supabaseServer as any).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { app_metadata: {} } } }) } });
    (cookies as any).mockResolvedValue({ get: () => ({ value: 'c-cookie' }) });
    expect(await getActiveCompanyId()).toBe('c-cookie');
  });
  it('lanza si no hay empresa', async () => {
    (supabaseServer as any).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { app_metadata: {} } } }) } });
    (cookies as any).mockResolvedValue({ get: () => undefined });
    await expect(getActiveCompanyId()).rejects.toBeInstanceOf(NoActiveCompanyError);
  });
});
```

- [ ] **Step 2: Implementar**

```ts
'use server';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export class NoActiveCompanyError extends Error {
  constructor() { super('No hay empresa activa para este usuario'); }
}

export async function getActiveCompanyId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const fromJwt = data.user?.app_metadata?.company;
  if (typeof fromJwt === 'string' && fromJwt) return fromJwt;
  const fromCookie = (await cookies()).get('actualComp')?.value;
  if (fromCookie && fromCookie !== 'undefined') return fromCookie;
  throw new NoActiveCompanyError();
}
```

- [ ] **Step 3: Reemplazar `getCompanyId`/`DEFAULT_COMPANY_ID` en los 8 archivos y borrar `company-config.ts`**

```sh
grep -rl "company-config" src | xargs sed -i "s#@/lib/company-config#@/shared/lib/tenant#; s#getCompanyId(\([^)]*\))#await getActiveCompanyId()#g"
git rm src/lib/company-config.ts
npm run check-types
```
Revisar a mano cada uno de los 8 (el `sed` deja `await` en funciones que quizá no sean `async`).

- [ ] **Step 4: Regla de lint que prohíbe leer la cookie a mano en actions**

En `.eslintrc.json` agregar `no-restricted-syntax` para `CallExpression[callee.property.name='get'][arguments.0.value='actualComp']` con mensaje "Usar getActiveCompanyId()". Aplicar a `src/features/**/actions/**` y `src/features/**/*.server.ts`. Los 116 usos se migran por carpeta en Fase 4 (cada plan detallado incluye "reemplazar lectura de actualComp").

- [ ] **Step 5: Commit** `feat(tenant): helper único getActiveCompanyId y baja de company-config`

### Task 3.3: Filtro por empresa en Prisma (compensar RLS)

**Files:**
- Create: `src/shared/lib/prisma-tenant.ts`
- Test: `src/shared/lib/prisma-tenant.test.ts`

**Interfaces:**
- Produces: `withCompany<T extends { company_id?: unknown }>(where: T | undefined, companyId: string): T & { company_id: string }` — helper puro que fuerza `company_id` en un `where` de Prisma; usado por todas las lecturas paginadas de DataTable.

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from 'vitest';
import { withCompany } from './prisma-tenant';
describe('withCompany', () => {
  it('agrega company_id al where', () => {
    expect(withCompany({ is_active: true }, 'c1')).toEqual({ is_active: true, company_id: 'c1' });
  });
  it('sobrescribe un company_id ajeno', () => {
    expect(withCompany({ company_id: 'otro' }, 'c1').company_id).toBe('c1');
  });
  it('acepta where undefined', () => {
    expect(withCompany(undefined, 'c1')).toEqual({ company_id: 'c1' });
  });
});
```

- [ ] **Step 2: Implementación**

```ts
export function withCompany<T extends object>(where: T | undefined, companyId: string): T & { company_id: string } {
  return { ...(where ?? ({} as T)), company_id: companyId };
}
```

- [ ] **Step 3: Aplicar en las actions paginadas ya migradas a Prisma** (las `getXxxPaginated` de DataTable listadas en `.claude/rules/datatable.md`). Grep: `grep -rln "findMany" src/features --include='*.server.ts' | xargs grep -L "company_id"` → cada archivo listado es una query sin filtro de empresa: corregir o documentar por qué no aplica (tablas globales como `provinces`).

- [ ] **Step 4: Commit** `feat(tenant): forzar company_id en queries Prisma de DataTable`

### Task 3.4: Parametrizar hardcodes de Grupo Horizonte

**Files:**
- Modify: `supabase/functions/send-documents-expiry-email/index.ts:631` (default `['yordanpz@hotmail.com']` → si no hay `to` en el body, leer `Deno.env.get('DOCUMENTS_EXPIRY_RECIPIENTS')`; si tampoco existe, responder 400 `"missing recipients"` en vez de enviar)
- Modify: `supabase/functions/send-deviations-email/index.ts` (misma regla con `DEVIATIONS_RECIPIENTS`)
- Create: migración `reschedule_documents_expiry_cron` que reemplace el job `weekly-documents-expiry-email` por uno cuyo body no lleve emails (`{"days_ahead":7,"detail_limit":20}`), y cuya URL y token salgan de `current_setting('app.settings.supabase_url')`/vault en lugar de estar versionados — si el proyecto no usa vault, documentar que el job se crea a mano por entorno y **quitar la migración con el anon key del repo** (`prisma/migrations/20260512162500_schedule_documents_expiry_cron/` → dejarla vacía con un comentario, ya que Prisma no permite borrar migraciones aplicadas)
- Modify: `src/features/Auth/actions/register-actions.ts` (`role: 'CodeControlClient'` → `role: 'User'`, que es el default de `profile.role`)

- [ ] **Step 1: Editar las dos edge functions** y desplegarlas con `npx supabase functions deploy send-documents-expiry-email` / `send-deviations-email` en dev; setear los secrets con `npx supabase secrets set DOCUMENTS_EXPIRY_RECIPIENTS=... DEVIATIONS_RECIPIENTS=...`.
- [ ] **Step 2: Probar** con `SELECT net.http_post(...)` sin `to` en el body → llega a los destinatarios del secret. Con secret vacío → 400.
- [ ] **Step 3: Commit** `fix(email): destinatarios por configuración, sin defaults personales`

**Criterio de terminado Fase 3:** `grep -rn "hotmail\|DEFAULT_COMPANY_ID\|IS_SINGLE_TENANT\|CodeControlClient" src supabase` vacío; ningún `NEXT_PUBLIC_*` con secreto; helper `getActiveCompanyId` en uso por todos los server actions ya en Prisma.

---

## Fase 4 — Migración Supabase → Prisma por carpeta (+ eliminación de `any`)

**Regla de la fase:** se migra **carpeta completa**, nunca archivo suelto, para no dejar mezclas. Cada carpeta recibe su plan detallado con `superpowers:writing-plans` en el momento de arrancarla. Supabase client queda permitido únicamente para: `auth.*`, `storage.*`, `.rpc()` a funciones SQL, y realtime.

**Criterio de "carpeta migrada":**
1. `grep -l "supabaseServer\|supabaseBrowser" <carpeta>` sólo devuelve archivos que usan auth/storage/rpc.
2. `grep -E ":\s*any\b|as any" <carpeta>` devuelve 0.
3. Ninguna lectura de `actualComp` directa; usa `getActiveCompanyId()`.
4. Todo `findMany` de negocio pasa por `withCompany`.
5. `console.*` → `logger`.
6. E2E del módulo verde.

**Orden y inventario (archivos con Supabase / usos de `any`, medidos 18/09):**

| # | Carpeta | Supabase | `any` | Notas / plan detallado |
|---|---|---|---|---|
| 4.1 | `src/shared/actions/document-actions.ts` y `src/shared/**` | 18 | — | `fetchAllDocumentTypes`, `getDocument*ById` con `select('*')`. Base para todo lo documental. |
| 4.2 | `src/features/Empresa/Clientes/actions/*` | (parte de 54) | (parte de 320) | `customer.ts`, `service.ts` (server) y `services.ts`, `itemsService.ts` (**browser en actions**). Unificar en `Clientes/actions/*.server.ts` con Prisma. |
| 4.3 | Resto de `src/features/Empresa/**` | 54 total | 320 total | Subcarpetas General, Usuarios, RRHH, Equipos, CCT (mover mutaciones fuera de componentes), Contactos, AccesosExternos. Una sub-fase por subcarpeta. **Incluye consolidar los forms legacy que la Fase 1 no pudo borrar por tener importadores vivos:** `Equipos/{brand,sub_types,types}` (forms usados por `EquipmentsTabContent.tsx` y los `_*DataTable.tsx`), `RRHH/components/{AptitudesTecnicas,verActivosButton.tsx,work-diagram-form.tsx}` — mover cada form a la carpeta nueva de su DataTable y borrar el resto. |
| 4.4 | `src/features/Employees/Diagrams/**` | 14 (Employees) | 69 (Employees) | `diagram-mutations.ts`, `diagram-queries.ts`, `action.ts`, `supabase-query.ts` → Prisma; ya existen `diagram-massive-actions.ts`/`diagram-search-actions.ts` como referencia. `DiagramEmployeeViewCOPI.tsx` está vivo (lo importa `EmployesDiagramWrapper.tsx`): renombrarlo a `DiagramEmployeeView.tsx` y corregir el typo `Employes`. Después el resto de Employees. |
| 4.5 | `src/features/Equipos/EquipoID/lib/actions/vehicle-actions.ts` y resto de Equipos | 13 | 45 | `toggleVehicleStatus(vehicleData: any)`, `createVehicle`, `updateVehicle`. Tipar con `Prisma.vehiclesCreateInput`. |
| 4.6 | `src/features/Documentacion/**` | 13 | 27 | Unificar `SimpleDocument` y `UploadDocumentMulti*` en un único flujo (`uploadMultiResourceDocument` con N=1). |
| 4.7 | `src/features/Mantenimiento/**` + `OperatorPanel` + `Checklist` | 15 | 41 | Tras Fase 2 queda menos. |
| 4.8 | `src/features/Operaciones/**` | 6 | 60 | `preparte.ts` (update masivo en Supabase → `prisma.preparte.updateMany`), `actions.ts`. |
| 4.9 | `src/features/Formularios/**` | 7 | 65 | `checklist-actions.ts`. Separar en `Formularios` (custom_form) y `Checklists` (templates) como features distintas. |
| 4.10 | `src/features/Dashboard/**`, `Layout`, `Comercial`, `Clothing`, `Ayuda` | 3+2+1+2+2 | 11+2+21 | Chicos; cerrar la fase. |
| 4.11 | `src/features/Permissions/**` + `UserPermissionsManager` | 2 | 19 | RPC se queda; CRUD de roles/tabs pasa a Prisma. Unificar `Permissions/actions.ts` con `UserPermissionsManager/actions.server.ts` (una sola capa). |
| 4.12 | `src/features/Auth/**` | 5 | 8 | `auth.*` se queda; `profile`, `password_reset_tokens`, `share_company_users`, `user_roles` a Prisma. **Elegir un único flujo de reset**: el nativo de Supabase (`resetPasswordForEmail` + `verifyOtp`); eliminar `password_reset_tokens` (tabla + `verifyResetToken`/`markTokenAsUsed`). Tipar `registerUserWithRole(values: RegisterUserInput)` con schema Zod compartido en `Auth/schemas/`. |
| 4.13 | `src/app/**` (57 archivos con Supabase) | 57 | — | Páginas con lógica: `dashboard/company/actualCompany/**/page.tsx` (mover a `features/Empresa`, borrar `api/services/*` cuando `services/[id]/page.tsx` deje de hacer `fetch`), `maintenance/**` (auth anónima se queda; datos a server actions). Al terminar, `api/` debe contener sólo `external/v1`, `taskapp/events`, `auth/*` y `upload` (si se justifica). |

- [ ] Por cada fila: crear plan detallado → ejecutar → verificar los 6 criterios → PR `refactor(<feature>): migrar <carpeta> a Prisma`.
- [ ] Al cerrar la fase, actualizar el baseline: `supabase_files` esperado ≤ 40 (sólo auth/storage/rpc), `any_usages` esperado 0, `api_routes` ≤ 12.

---

## Fase 5 — Split de archivos gigantes + Vitest

### Task 5.1: Incorporar Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts `"test": "vitest run"`, `"test:watch": "vitest"`; devDeps `vitest`, `@vitejs/plugin-react`)
- Modify: `.github/workflows/ci.yml` (agregar `npm test`)
- Modify: `.husky/pre-commit` (agregar `npm test -- --changed`)

- [ ] **Step 1:** `npm i -D vitest @vitejs/plugin-react` y `vitest.config.ts`:
```ts
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```
- [ ] **Step 2:** `npm test` → corren los tests escritos en Fase 3 (`tenant.test.ts`, `prisma-tenant.test.ts`) y pasan.
- [ ] **Step 3:** Commit `test: incorporar vitest para lógica pura`.

### Task 5.2: Split por archivo (inventario, de mayor a menor)

Regla de split: **por responsabilidad, no por tamaño** — `auth.ts` / `queries.server.ts` / `mutations.server.ts` / `export.server.ts` / `pdf.ts`; la lógica pura (validaciones, cálculos, máquinas de estado) va a `lib/*.ts` **sin** `'use server'` y con test Vitest. Objetivo: ningún archivo > 600 líneas en estas carpetas.

| Archivo | Líneas | Lógica pura a extraer y testear |
|---|---|---|
| `Formularios/Checklists/NormalizedChecklistForm.tsx` | 2.467 | `lib/checklist-evaluation.ts`: `computeDeviations(answers, template) → Deviation[]` (qué ítems generan desvío, `is_critical`) |
| `Operaciones/PartesDiarios/detail/actions.server.ts` | 2.380 | `lib/clone-conflicts.ts`: `findCloneConflicts(rows, targetDate) → Conflict[]` |
| `Operaciones/PartesDiarios/actions/actions.ts` | 2.174 | `lib/resource-deviations.ts`: `classifyEmployeeDeviation({ hasContractor, diagramDay }) → 'ok' \| 'no_contractor' \| 'deviation_no_diagram' \| 'deviation_non_work_day'` y equivalente para equipos |
| `Dashboard/Principal/actions/actions.server.ts` | 1.907 | separar en `fleet.server.ts`, `rrhh.server.ts`, `services.server.ts`, `checklists.server.ts` |
| `Mantenimiento/MaintenanceOrders/components/OrderDetailDialog.tsx` | 1.877 | dividir por tab del diálogo |
| `Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm.tsx` | 1.860 | compartir con 5.2.1 |
| `Mantenimiento/OrderManagement/actions/actionsServer.ts` | 1.747 | `lib/work-order-generation.ts`: `groupItemsBySector(items) → Map<sectorId, items[]>` |
| `Documentacion/TiposDocumentos/actions/actions.server.ts` | 1.717 | `lib/document-conditions.ts`: `resourceMatchesConditions(resource, conditions: Json[]) → boolean` (hoy se evaluaba `conditions[0]` a mano — bug documentado) |
| `Operaciones/Preparte/components/PreparteForm.tsx` | 1.450 | dividir por sección del form |
| `Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts` | 1.442 | `lib/request-approval.ts`: transiciones `pending_approval → approved/rejected` |
| `Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts` | 1.341 | `lib/tire-state.ts`: transiciones `AVAILABLE → INSTALLED → IN_REPAIR/DISCARDED` |
| `Mantenimiento/OperatorPanel/actions/actionsServer.ts` | 1.284 | separar `auth.server.ts` de `work-orders.server.ts`; `lib/paused-time.ts` |
| `Employees/PreLegajos/lib/state-machine.ts` | (ya extraída) | agregar `state-machine.test.ts` cubriendo las 5 transiciones y las 4 prohibidas |

- [ ] Por cada archivo: plan detallado → extraer lógica pura con test primero (TDD) → mover el resto por responsabilidad → `check-types` → E2E del módulo → PR `refactor(<feature>): dividir <archivo> y testear <lógica>`.

---

## Fase 6 — Tests de funciones SQL críticas

### Task 6.1: pgTAP en Supabase local

**Files:**
- Create: `supabase/tests/README.md`, `supabase/tests/001_permissions.test.sql`, `supabase/tests/002_document_reconciliation.test.sql`, `supabase/tests/003_daily_report_deviations.test.sql`, `supabase/tests/004_resource_status.test.sql`
- Modify: `package.json` (`"test:db": "npx supabase test db"`)

- [ ] **Step 1:** habilitar pgTAP: migración `enable_pgtap` con `CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;` (sólo local/dev).
- [ ] **Step 2:** `001_permissions.test.sql` — dado un rol con `view` en una subtab, `user_has_permission(user, tab_padre, 'view')` devuelve `true` por inferencia; un `user_permissions.is_granted=false` pisa al rol.
- [ ] **Step 3:** `002_document_reconciliation.test.sql` — crear `document_types` con `conditions` por `company_position`, crear empleado con ese puesto → `controlar_alertas_documentos_single_employee` genera la fila `documents_employees` en `pendiente`; cambiar el puesto → la fila queda `archived_at IS NOT NULL`, no borrada.
- [ ] **Step 4:** `003_daily_report_deviations.test.sql` — fila con empleado sin `contractor_employee` → `get_daily_report_deviations` lo reporta como no asignado.
- [ ] **Step 5:** `004_resource_status.test.sql` — empleado con todos los documentos `aprobado` → `status = 'Completo'`; uno `vencido` → `'Completo con doc vencida'`; uno `pendiente` → `'Incompleto'`. Borrar un documento recalcula (ticket 712).
- [ ] **Step 6:** `npm run test:db` verde; agregar al workflow de CI un job con `supabase/setup-cli` + `supabase start` + `supabase test db`.
- [ ] Commit `test(db): pgTAP para permisos, reconciliación documental, desvíos y status`.

---

## Fase 7 — Reglas menores

### Task 7.1: `console.*` → logger (354 usos)

- [ ] Codemod: `grep -rlE "console\.(log|error|warn)" src --include='*.ts' --include='*.tsx' | xargs sed -i -E "s/console\.log\(/logger.debug(/; s/console\.warn\(/logger.warn(/; s/console\.error\(/logger.error(/"` y agregar `import { logger } from '@/lib/logger';` donde falte (revisar a mano los archivos de cliente que usen `Logger` con scope). Activar la regla ESLint `no-console: error`.
- [ ] Commit `chore: reemplazar console.* por logger`.

### Task 7.2: `date-fns` → moment (41 archivos)

- [ ] Listar: `grep -rl "from 'date-fns'" src`. Migrar por archivo (`format` → `moment(d).format(...)`, `differenceInDays` → `moment(a).diff(b,'days')`), quitar la dependencia de `package.json` al terminar. Verificar que `react-day-picker` no la requiera como peer (si la requiere, dejarla sólo como dep transitiva).
- [ ] Commit `chore: unificar manejo de fechas en moment`.

### Task 7.3: Residuos

- [ ] Renombrar `Dayli*` → `Daily*` (los que sobrevivan a 2.3): `git mv` + `sed` de imports.
- [ ] `tsconfig.json`: quitar `"src/app/dashboard/employee/page.tsx1"` del `include`.
- [ ] `TabsManagerServer.tsx` vs `TabsManagerServerWithPermissions.tsx`: `grep -rl` de cada uno; dejar el que tenga consumidores y migrar los del otro.
- [ ] `Formularios/Checklists/DevAutoFillButton.tsx`: gatear por `process.env.NODE_ENV !== 'production'` además de `NEXT_PUBLIC_SHOW_LOGS`.
- [ ] Clothing: nombre de firma `${companyId}/${crypto.randomUUID()}.png` en vez de `Date.now()`.
- [ ] Commit `chore: limpieza de residuos menores`.

**Criterio de terminado del plan completo:** baseline actualizado con `supabase_files ≤ 40`, `any_usages = 0`, `console_usages = 0`, `api_routes ≤ 12`, `files_over_1000 = 0` en las carpetas de la Fase 5, `date_fns_files = 0`; CI con `check-types` + Vitest + pgTAP verdes; E2E ≥ baseline.

---

## Decisiones que quedan abiertas (confirmar antes de la fase indicada)

| Decisión | Fase | Supuesto del plan |
|---|---|---|
| ¿`api/company/*` tiene algún consumidor externo (integración del cliente)? | 1.1 | No; se borra. |
| ¿Se conserva histórico de `repair_solicitudes` en la BD nueva (para datos migrados de GH)? | 2.1 | No; alphataco arranca sin ese circuito. Si se necesita histórico, exportar a CSV antes del `DROP`. |
| ¿alphataco será realmente multi-empresa (SaaS) o mono-empresa por instalación? | 3.2 | Multi-empresa por filtrado explícito; si es mono-empresa, el helper igual queda y sólo cambia el origen del id. |
| ¿Qué proveedor de email usará alphataco (SMTP propio vs Resend)? | 3.4 | Se mantiene SMTP en edge functions; se parametrizan destinatarios. |
| ¿Se mantiene la dependencia de TaskApp para Ayuda? | 4.10 | Sí, sin cambios en esta iteración. |
