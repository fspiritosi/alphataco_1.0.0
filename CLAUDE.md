# CLAUDE.md

**IDIOMA**: SIEMPRE comunicarte, planificar, comentar y documentar en **espanol**.

## Project Overview

Sistema de gestion integral para Grupo Horizonte (GH). Administra empleados, equipos, documentacion, operaciones (partes diarios), mantenimiento de vehiculos, formularios, y modulo comercial. Multi-empresa con RLS en Supabase.

## Tech Stack

- **Framework**: Next.js 16 with React 19 (App Router, Server Components)
- **Database**: Supabase (PostgreSQL) — accessed via Prisma ORM (new) or Supabase client (legacy)
- **State**: Zustand (global), React Query (server state), Jotai (atomic)
- **UI**: shadcn/ui + Tailwind CSS + Lucide icons
- **Forms**: React Hook Form + Zod validation
- **Analytics**: PostHog (error tracking and analytics)
- **Dates**: moment.js (NOT date-fns)

## Development Workflow

Verification loop for quality:

1. Make changes
2. Run `npm run check-types` (TypeScript)
3. Before committing: review diff against project rules (see `/review-changes`)
4. Before creating PR: run full check-types + diff review (see `/grill`)

```sh
# Development
npm run dev              # Start Next.js dev server
npm run local            # Start Supabase + Next.js dev server

# Verification
npm run check-types      # TypeScript type checking

# Database
npm run create-migration # Create new migration: npm run create-migration nombre
npm run push-migrations  # Push migrations to remote
npm run migration-status # Check migration status
npx prisma generate      # Regenerate Prisma client

# Testing (E2E only — no unit tests yet)
npm run test:e2e         # Run Cypress E2E tests headless
npm run test:e2e:open    # Open Cypress test runner
```

## Slash Commands

| Command           | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `/commit-push-pr` | Verify, commit, push, and open a PR                     |
| `/quick-commit`   | Stage all changes and commit with a descriptive message |
| `/review-changes` | Review uncommitted changes against project rules        |
| `/test-and-fix`   | Run check-types and fix any failures                    |
| `/worktree`       | Create a git worktree for parallel Claude sessions      |
| `/grill`          | Adversarial code review — don't ship until it passes    |
| `/techdebt`       | End-of-session sweep for duplicated and dead code       |

## Agents

| Agent             | When to use                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| `table-expert`    | Create, audit, or modify DataTables (columns, filters, export, facets) |
| `linear-sync`     | Interact with Linear: create/edit issues, sync notes, audit status     |
| `build-validator` | Ensure project builds correctly for deployment                         |
| `code-architect`  | Design reviews and architectural decisions                             |
| `code-simplifier` | Simplify recently written code without changing functionality          |
| `staff-reviewer`  | Review plans and architectures as a skeptical staff engineer           |
| `verify-app`      | Thoroughly verify the application works correctly after changes        |
| `oncall-guide`    | Help diagnose and resolve production issues                            |

**REGLA DataTables**: TODA tarea que involucre DataTables DEBE delegarse al agente `table-expert`.

## Skills (Superpowers — invocacion automatica)

| Peticion del usuario              | Skill que se invoca                           |
| --------------------------------- | --------------------------------------------- |
| "Planifica esto"                  | `superpowers:brainstorming` → `writing-plans` |
| "Implementa este plan"            | `superpowers:executing-plans`                 |
| "Debuguea esto"                   | `superpowers:systematic-debugging`            |
| "Revisa el codigo"                | `superpowers:requesting-code-review`          |
| "Crea un componente / formulario" | `superpowers:brainstorming` + MCP shadcn      |
| "Verifica que funcione"           | `superpowers:verification-before-completion`  |

Always use Context7 MCP first for library docs. Always use shadcn MCP for UI components.

## MCPs Disponibles

1. **Supabase (LOCAL, PROD)** — SOLO LECTURA. Usar LOCAL por defecto. Solo usar PROD cuando el usuario lo indique explicitamente.
2. **Supabase DEV** — LECTURA + ESCRITURA DE DATOS ÚNICAMENTE. Permitido: `SELECT`, `INSERT`, `UPDATE`, `DELETE` sobre datos existentes (seeds de prueba, clonar registros desde PROD, editar datos para testing). **ESTRICTAMENTE PROHIBIDO**: toda query que modifique estructura o metadata — `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`, `GRANT`, `REVOKE`, cambios de políticas RLS, creación/modificación de funciones/triggers/vistas/índices/tipos/enums. **TODA migración (estructura, funciones, triggers, políticas) se hace EXCLUSIVAMENTE con Prisma** siguiendo `.claude/rules/migrations.md`. Si el usuario pide un cambio estructural, responder con el flujo de Prisma — nunca ejecutarlo por MCP.
3. **shadcn-ui** — SIEMPRE usar para UI
4. **Context7** — SIEMPRE usar PRIMERO para docs de librerias
5. **Migraciones**: Ver `.claude/rules/migrations.md`. NUNCA `prisma migrate dev`. Flujo: diff → carpeta → SQL → db execute → resolve → generate.

## Critical Rules

Todas obligatorias. Guias completas en `.claude/rules/`:

| Regla                              | Archivo                   |
| ---------------------------------- | ------------------------- |
| Migraciones con Prisma             | `migrations.md`           |
| NO `:any` — Inferir tipos          | `typescript-types.md`     |
| Server Actions en features/        | `server-actions.md`       |
| Logger vs console.\*               | `logger.md`               |
| React Query obligatorio            | `react-query.md`          |
| Server Components First            | `server-components.md`    |
| TabContent y Fallbacks             | `tab-content.md`          |
| Sistema de Permisos                | `permissions.md`          |
| DataTable con Prisma               | `datatable.md`            |
| Filtros de DataTable               | `datatable-filters.md`    |
| Estructura de Features             | `feature-structure.md`    |
| Forms con shadcn + zod             | `forms.md`                |
| Evitar useEffect innecesarios      | `no-useeffect.md`         |
| Legajo en listas de empleados      | `employee-file-number.md` |
| Date pickers con escritura directa | `date-pickers.md`         |
| Queries eficientes                 | `efficient-queries.md`    |
| No dialogs nativos                 | `no-native-dialogs.md`    |
| Codigo en ingles                   | `code-language.md`        |
| moment.js para fechas              | `moment-dates.md`         |
| Reglas de Git                      | `git-rules.md`            |

## Self-Improvement

**OBLIGATORIO — NO OMITIR:** Después de TODA corrección del usuario, INMEDIATAMENTE actualizar la sección "Learned Corrections" de este archivo con la regla aprendida. Esto NO es opcional y NO se reemplaza con guardar en memoria (`memory/`). Ambos deben hacerse: memoria Y CLAUDE.md.

Checklist post-corrección:

1. Aplicar el fix solicitado
2. Agregar la regla a "Learned Corrections" en este CLAUDE.md
3. Guardar en memoria si aplica para futuras conversaciones

End corrections with: "Now update CLAUDE.md so you don't make that mistake again."

Keep iterating until the mistake rate measurably drops.

## Working with Plan Mode

- Start every complex task in plan mode (shift+tab to cycle)
- Pour energy into the plan so Claude can 1-shot the implementation
- When something goes sideways, switch back to plan mode and re-plan. Don't keep pushing.
- Use plan mode for verification steps too, not just for the build

## Parallel Work

- For tasks that need more compute, use subagents to work in parallel
- Offload individual tasks to subagents to keep the main context window clean
- When working in parallel, only one agent should edit a given file at a time
- For fully parallel workstreams, use git worktrees: `/worktree`

## Things Claude Should NOT Do

- Don't use `:any` or `as any` in TypeScript without explicit approval
- Don't use `console.*` — use logger from `@/lib/logger`
- Don't use `window.confirm/alert/prompt` — use shadcn dialogs
- Don't use `date-fns` — use moment.js
- Don't use `useEffect` + `useState` for data fetching — use React Query
- Don't use Supabase direct for new code — use Prisma
- Don't create API routes — use Server Actions
- Don't commit without running check-types first
- Don't add Co-Authored-By to commits
- Don't commit automatically — only when the user asks
- Don't skip updating CLAUDE.md "Learned Corrections" after a user correction — SIEMPRE actualizar
- Don't create .md files unless explicitly requested
- Don't skip error handling

## Project Structure

```
src/
├── app/                    # Next.js pages (thin, import from features/)
├── features/               # Business logic by domain
│   └── {Feature}/
│       ├── components/     # React components
│       ├── hooks/          # useQuery hooks
│       ├── actions/        # Server actions ('use server')
│       ├── types/          # TypeScript types
│       └── utils/          # Utilities
├── shared/components/      # Shared components (DataTable, etc.)
├── components/ui/          # shadcn/ui components
├── lib/                    # logger.ts, utils.ts, supabase/, prisma
└── store/                  # Zustand stores
```

## Quick References

- `src/features/Permissions/permissions-map.ts` — Permissions map
- `src/features/Permissions/components/PermissionGuard.tsx` — Permission guard
- `src/lib/logger.ts` — Custom logger
- `src/shared/components/common/DataTable/DataTable.tsx` — DataTable component
- `src/shared/components/common/DataTable/DOCS.md` — DataTable docs
- Module IDs: see `.claude/rules/permissions.md`

## Learned Corrections

### Columnas UUID/FK opcionales: enviar `null`, nunca string vacío

Al persistir en Supabase/Postgres, una columna `@db.Uuid` (o `Int`) que recibe `''` provoca **400 invalid input syntax**. Los forms suelen inicializar FKs opcionales como `vehicle?.campo || ''`; ese `''` debe convertirse a `null` antes del `insert`/`update`. Normalizar en la **server action** (límite contra la BD), no campo por campo en el form. NO convertir columnas de texto ni `NOT NULL` (ej. `engine`). Referencia: `normalizeVehicleFkFields()` en `vehicle-actions.ts`.

### Diagnóstico: ir al error real, no al ruido

Si un error de servidor aparece enmascarado por una capa secundaria (ej. PostHog/instrumentación que falla al capturar la excepción), ignorar esa capa y rastrear el error de origen (el `400`/`500` real de la query). No perseguir issues tangenciales de entorno salvo que el usuario lo pida.

### Permisos: 3 roles de acceso completo

Al insertar nuevas tabs o `role_permissions`, SIEMPRE incluir los 3 roles: `admin`, `administrador`, y `full-access-provisional`. No solo `admin`.

```sql
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
```

### Legajo: columna separada en DataTables

El legajo (`employees.file`) SIEMPRE debe ser una columna separada con su propio filtro `text`. NUNCA embeber el legajo dentro de la columna de nombre (ej: `[123] Apellido Nombre` está MAL). Columna de legajo ANTES de la columna de nombre. En comboboxes/selectores SÍ se puede combinar.

### NUNCA encadenar modales — unificar en un solo form

Si una tarea requiere capturar datos secundarios u opcionales después de una acción principal, **NUNCA** resolver con "un modal que abre otro modal". El usuario detesta ese patrón.

**Solución correcta**: un único formulario con secciones separadas por `<Separator />`:

- Sección principal: campos obligatorios (ej: form de creación del Área)
- Separador con título descriptivo (ej: "Vincular a contratos (opcional)")
- Sección secundaria: campos opcionales, renderizada condicionalmente si dependen de inputs previos (ej: MultiSelect de contratos solo visible cuando hay `customer_id` seleccionado)
- **Un solo botón de submit** que ejecuta: acción principal → captura ID del resultado → acciones secundarias con ese ID

Siempre consultar `/frontend-design:frontend-design` antes de implementar para distribuir el form correctamente.

### Al revisar un ticket, leer SIEMPRE los comentarios (no solo la descripción)

La descripción del ticket suele ser el sintoma percibido por el usuario final; los **comentarios** (`manage_task_comments` action=list) contienen el diagnostico real del equipo. Ej: ticket 292 describia "no puedo asignar recurso empleado", pero el comentario de Fabricio aclaraba "al asignar uno nuevo me borra los anteriores, desde comercial". Leer comentarios ANTES de invertir en investigacion de codigo: reorienta la causa raiz y evita perseguir la hipotesis equivocada.

### Alertas de documentos: excluir bajas SALVO los tipos "Documento de baja"

Al excluir empleados/equipos dados de baja (`is_active = false`) de la generacion de alertas de documentos pendientes, los tipos marcados como **"Documento de baja"** (`document_types.down_document = true`) **DEBEN seguir generando alertas a los recursos dados de baja** (son la documentacion de egreso). Regla: crear/mantener alerta `<=> (down_document = true) OR (recurso is_active = true)`. Los **documentos reales** (con `document_path`) de bajas NUNCA se borran; la limpieza solo elimina filas `state='pendiente'` **sin archivo**. La generacion vive en triggers SQL de Postgres (`controlar_alertas_single_document_all_employees/vehicles`, `controlar_alertas_documentos_single_employee/vehicle`) — modificarlos es migracion Prisma, no MCP.

### Entornos de BD: `.env` local apunta a DEV, prod es otra BD

El `.env` local apunta al proyecto **dev** Supabase (`ref pdrylqbztmpgawsfdsbr`). `DIRECT_URL_MAIN` (prod) NO esta en el `.env` local, asi que `prisma db execute`/`migrate` desde local solo tocan dev (prod corre por el pipeline de deploy). MCP `horizonte-prod` = prod (solo lectura); `horizonte-dev` = dev. Verificar SIEMPRE el target antes de ejecutar migraciones.

### Modal `SimpleDocument` != flujo `UploadDocumentMulti*`

El boton "Subir documento" de las tablas de documentos abre `SimpleDocument.tsx` (flujo propio, persistencia inline), DISTINTO de los forms `UploadDocumentMultiEmployee/Equipment` (que usan `uploadDocument(..., multipleResources)` de `utils.ts`). Si un fix "multirecurso" se hace en uno, verificar el otro: `SimpleDocument` no tenia logica multirecurso (subia a un solo recurso) y usaba `router.refresh()` (recarga toda la ruta) en vez de `queryClient.invalidateQueries()` (refresca solo la tabla en client-side mode).

### "Cerrar una tarea" / "ponle un cierre" = resumen interno, NUNCA comentario al cliente

Cuando el usuario pide "cerrar la tarea", "ponle un cierre", "dale cierre al ticket", se refiere al **cierre interno**: completar el campo `completion_summary` (qué se hizo, causa raíz, fix, commits/PRs, datos tocados) y/o pasar el estado a Resuelto. **NUNCA** significa escribir un comentario de cara al cliente. Los comentarios públicos (`manage_task_comments` con `is_internal: false`) son visibles al reporter externo y **NO** se redactan salvo pedido explícito e inequívoco. Ojo adicional: el estado "Resuelto" (id 6) tiene `triggers_resolved_email: true` → al pasar a Resuelto se dispara un email automático al cliente; tenerlo presente antes de cambiar estado. Ante la duda sobre algo que impacte al cliente (comentario público, email, cambio de estado que notifica), preguntar primero.

### Tras subir documentos: invalidar React Query, no solo `router.refresh()`

Las tablas de documentos (empleados/equipos) corren en **client-side mode con React Query**. Tras subir un documento (flujo masivo `UploadDocumentMultiEmployee/Equipment` o individual `SimpleDocument`), `router.refresh()` por sí solo **NO** actualiza la tabla de fondo (solo refresca Server Components/SSR). SIEMPRE llamar también `queryClient.invalidateQueries()`. Patrón: `queryClient.invalidateQueries(); router.refresh();` (el invalidate para las tablas React Query; router.refresh para las tablas SSR del sistema viejo). Extiende la regla de "Modal SimpleDocument != flujo UploadDocumentMulti*".

### Carga masiva multirecurso: persistir server-side (Prisma), nunca `.in([cientos])` client-side

Subir un documento multirecurso a cientos de recursos con `supabaseBrowser().in('applies', [cientos de ids])` (client-side) **muere por timeout**: arma una URL gigante y dispara la cadena de triggers `update_status_trigger` (row-level) → `UPDATE employees/vehicles` → `controlar_alertas_*` → recálculo completo de alertas, **por cada fila** (N×N×M). Solución: server action Prisma con `$transaction` (`updateMany` faltantes-pendientes + `createMany` ausentes, ignorando los ya presentados) + compensación del storage si la transacción falla. Y los triggers de documentos deben ser **statement-level** (`REFERENCING NEW TABLE ... FOR EACH STATEMENT`, un trigger por evento porque Postgres no admite transition tables con `INSERT OR UPDATE` juntos) con `UPDATE ... SET status = (CASE ... END)::status_type` (la columna `status` es enum, requiere cast explícito). Los `controlar_alertas_*` de employees/vehicles deben tener guarda `WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.company_id IS DISTINCT FROM NEW.company_id)` para no recalcular alertas en cambios de `status`.

---

_Update this file continuously. Every mistake Claude makes is a learning opportunity._
