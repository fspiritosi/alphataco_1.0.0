# Consolidar partes diarios y certificación en `features/Operaciones` — Plan detallado (Task 2.3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la lógica de partes diarios/certificación comercial viva en un solo lugar (`features/Operaciones`), eliminando la copia muerta que quedó en `features/Empresa/Clientes/components/operations/`.

**Architecture:** Relevamiento del 19/09: el único consumidor de `Empresa/Clientes/components/operations/` es `Comercial/Comerce/components/DayliReportWraper.tsx`, que usa `EnhancedComercialReportTable` (+ `BulkCertificacionModal`, `export-formatters`), `DailyReportRowFormRefactored` (+ `form-sections/`, `components/hooks/`), `hooks/useFilterOptions.ts` y `actions/actions.ts`. Todo lo demás de esa carpeta está muerto: `DailyReportRowForm.tsx` (1.313 líneas; el `_DailyReportDetailDataTable.tsx` nuevo usa su propio `./DailyReportRowForm`), `ComercialReportTable.tsx` (511), `hooks/useDailyReportData.ts`, y el archivo legacy `Operaciones/PartesDiarios/components/DayliReportDetailTable.tsx` que sólo alimentaba al form muerto. Por lo tanto la tarea es un **move + borrado**, no una reescritura: el subconjunto vivo pasa a `src/features/Operaciones/Certificacion/` y el wrapper de Comercial importa desde ahí. La migración de `actions/actions.ts` (hoy `supabaseBrowser()`) a Prisma queda para la Fase 4.8 del plan maestro.

**Tech Stack:** Next.js 16, React 19, React Query. Sin cambios de comportamiento.

**Spec:** `docs/superpowers/plans/2026-09-18-plan-maestro-deuda-tecnica.md` (Task 2.3 y decisión global 3: "Partes diarios viven en features/Operaciones; Comercial consume de ahí").

## Global Constraints

- Reglas del repo: `no-format-commands.md` (nada de prettier/eslint), commits sólo línea de asunto sin Co-Authored-By, `npm run check-types` como única verificación automática.
- Sólo `git mv` para los archivos vivos (conservar historia); sólo `git rm` para lo que tenga 0 importadores tras el move (verificar con grep antes de cada borrado).
- Ningún cambio de comportamiento: no refactorizar el contenido de los archivos movidos salvo rutas de import.

---

### Task 1: Mover el subconjunto vivo a `features/Operaciones/Certificacion/`

**Files:**
- Move: `src/features/Empresa/Clientes/components/operations/components/EnhancedComercialReportTable.tsx` → `src/features/Operaciones/Certificacion/components/EnhancedComercialReportTable.tsx`
- Move: `.../operations/components/BulkCertificacionModal.tsx` → `src/features/Operaciones/Certificacion/components/BulkCertificacionModal.tsx`
- Move: `.../operations/components/export-formatters.ts` → `src/features/Operaciones/Certificacion/components/export-formatters.ts`
- Move: `.../operations/components/DailyReportRowFormRefactored.tsx` → `src/features/Operaciones/Certificacion/components/DailyReportRowFormRefactored.tsx`
- Move: `.../operations/components/form-sections/` (carpeta completa) → `src/features/Operaciones/Certificacion/components/form-sections/`
- Move: `.../operations/components/hooks/` (carpeta completa: `useFormSubmit.ts`, `useCustomerData.ts`, `useFormSchema.ts`, `useFormInitialization.ts`) → `src/features/Operaciones/Certificacion/components/hooks/`
- Move: `.../operations/hooks/useFilterOptions.ts` → `src/features/Operaciones/Certificacion/hooks/useFilterOptions.ts`
- Move: `.../operations/actions/actions.ts` → `src/features/Operaciones/Certificacion/actions/actions.ts`
- Modify: `src/features/Comercial/Comerce/components/DayliReportWraper.tsx` (imports)

**Interfaces:**
- Produces: los mismos símbolos exportados hoy, bajo `@/features/Operaciones/Certificacion/...` (`getFilteredDailyReportRows`, `getFilteredDailyReportRowsType`, `getServicesByCustomer`, `Service`, `EnhancedComercialReportTable`, `DailyReportRowFormRefactored`, `useFilterOptions`).

- [ ] **Step 1: Inventario de imports relativos dentro del subconjunto vivo**

Run: `grep -rn "from '\.\./\|from '\./" src/features/Empresa/Clientes/components/operations/components/{EnhancedComercialReportTable,BulkCertificacionModal,DailyReportRowFormRefactored}.tsx src/features/Empresa/Clientes/components/operations/components/{form-sections,hooks} src/features/Empresa/Clientes/components/operations/hooks/useFilterOptions.ts src/features/Empresa/Clientes/components/operations/actions/actions.ts`
Expected: lista de imports relativos; los que apunten a archivos que se mueven juntos siguen válidos (misma estructura relativa); los que apunten a algo fuera del subconjunto (p. ej. `../../../actions/...` de Clientes) se reescriben a absolutos `@/features/...`.

- [ ] **Step 2: Mover con `git mv` conservando la estructura relativa**

```sh
mkdir -p src/features/Operaciones/Certificacion/{components,hooks,actions}
git mv src/features/Empresa/Clientes/components/operations/components/EnhancedComercialReportTable.tsx src/features/Operaciones/Certificacion/components/
git mv src/features/Empresa/Clientes/components/operations/components/BulkCertificacionModal.tsx src/features/Operaciones/Certificacion/components/
git mv src/features/Empresa/Clientes/components/operations/components/export-formatters.ts src/features/Operaciones/Certificacion/components/
git mv src/features/Empresa/Clientes/components/operations/components/DailyReportRowFormRefactored.tsx src/features/Operaciones/Certificacion/components/
git mv src/features/Empresa/Clientes/components/operations/components/form-sections src/features/Operaciones/Certificacion/components/
git mv src/features/Empresa/Clientes/components/operations/components/hooks src/features/Operaciones/Certificacion/components/
git mv src/features/Empresa/Clientes/components/operations/hooks/useFilterOptions.ts src/features/Operaciones/Certificacion/hooks/
git mv src/features/Empresa/Clientes/components/operations/actions/actions.ts src/features/Operaciones/Certificacion/actions/
```

- [ ] **Step 3: Reescribir imports en el wrapper de Comercial y en los archivos movidos**

En `DayliReportWraper.tsx`: `@/features/Empresa/Clientes/components/operations/actions/actions` → `@/features/Operaciones/Certificacion/actions/actions`; los tres imports relativos `../../../Empresa/Clientes/components/operations/...` → `@/features/Operaciones/Certificacion/components/DailyReportRowFormRefactored`, `.../components/EnhancedComercialReportTable`, `.../hooks/useFilterOptions`.
En los archivos movidos: sólo los imports relativos que salían del subconjunto (Step 1).

- [ ] **Step 4: Verificar**

Run: `npm run check-types`
Expected: exit 0.
Run: `grep -rn "Clientes/components/operations" src --include='*.ts' --include='*.tsx' --exclude-dir=generated`
Expected: sin salida.

- [ ] **Step 5: Commit**

```sh
git add -A src/features/Operaciones/Certificacion src/features/Empresa/Clientes/components/operations src/features/Comercial
git commit -m "refactor(operaciones): mover certificación comercial de Empresa/Clientes a Operaciones/Certificacion"
```

### Task 2: Borrar lo muerto

**Files:**
- Delete: `src/features/Empresa/Clientes/components/operations/components/DailyReportRowForm.tsx`
- Delete: `src/features/Empresa/Clientes/components/operations/components/ComercialReportTable.tsx`
- Delete: `src/features/Empresa/Clientes/components/operations/hooks/useDailyReportData.ts`
- Delete: `src/features/Operaciones/PartesDiarios/components/DayliReportDetailTable.tsx` (legacy; sólo lo importaba el form muerto)
- Delete: cualquier resto de `src/features/Empresa/Clientes/components/operations/` (la carpeta debe desaparecer)

- [ ] **Step 1: Verificar 0 importadores de cada uno**

```sh
for n in "operations/components/DailyReportRowForm'" "ComercialReportTable'" "useDailyReportData" "DayliReportDetailTable" "transformDailyReports"; do echo "$n: $(grep -rn "$n" src --include='*.ts' --include='*.tsx' --exclude-dir=generated | grep -v "Clientes/components/operations/\|PartesDiarios/components/DayliReportDetailTable" | wc -l)"; done
```
Expected: todos 0. (`DailyReportRowForm` a secas SÍ tiene un uso vivo: `PartesDiarios/detail/components/_DailyReportDetailDataTable.tsx` importa `./DailyReportRowForm`, que es OTRO archivo en `detail/components/` — no tocarlo.)

- [ ] **Step 2: Borrar y verificar**

```sh
git rm -r src/features/Empresa/Clientes/components/operations
git rm src/features/Operaciones/PartesDiarios/components/DayliReportDetailTable.tsx
npm run check-types
```
Expected: exit 0; `ls src/features/Empresa/Clientes/components/` sin `operations`.

- [ ] **Step 3: Commit**

```sh
git commit -m "refactor(operaciones): eliminar copia muerta de partes diarios en Empresa/Clientes"
```

### Task 3: Corregir el typo `Dayli` en los archivos que sobreviven

**Files:**
- Move: `src/features/Comercial/Comerce/components/DayliReportWraper.tsx` → `src/features/Comercial/Comerce/components/DailyReportWrapper.tsx`
- Modify: su(s) importador(es) (`grep -rn "DayliReportWraper" src`)

- [ ] **Step 1:** `git mv` + reescribir el import en el importador (probablemente `ComerceTabContent.tsx`) y el nombre del componente/export dentro del archivo si se llama `DayliReportWraper`.
- [ ] **Step 2:** `npm run check-types` exit 0; `grep -rn "Dayli" src --exclude-dir=generated` → 0.
- [ ] **Step 3:** Commit `refactor(comercial): renombrar DayliReportWraper a DailyReportWrapper`.

### Criterio de terminado

- `grep -rl "Clientes/components/operations\|Dayli" src` vacío.
- `check-types` verde.
- E2E `cypress/e2e/comercial/comerce--daily_reports.cy.ts` y `cypress/e2e/operations/*` sin cambios de expectativas (no se ejecutan en este entorno; queda registrado en el ledger).
- Anotar en el plan maestro, fila 4.8: "`Operaciones/Certificacion/actions/actions.ts` usa `supabaseBrowser()` en un archivo de actions — migrar a server action Prisma con `bulkCertifyRows`".
