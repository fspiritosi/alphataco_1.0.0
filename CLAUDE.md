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

# Sincronizar dev con datos de PROD (clonar prod -> dev para replicar bugs con el ambiente real)
bash scripts/sync-prod-to-dev.sh   # requiere Docker corriendo; pide confirmar con 'CLONAR'
```

### Sincronizar dev con datos de prod

`bash scripts/sync-prod-to-dev.sh` clona los datos de **producción a dev** (para replicar/depurar un bug con el ambiente real, sin tocar prod). Repetible cada vez que reportan un error.

- **Requiere Docker corriendo** — usa `pg_dump`/`psql` dentro de un contenedor `postgres:15`, no instala nada local.
- Lee las connection strings del `.env`: **DEV** = línea activa `DIRECT_URL` (ref `pdrylqbztmpgawsfdsbr`); **PROD** = línea comentada `DIRECT_URL` (ref `vvrckjjyrwqzpbaatemz`). Usa el puerto 5432 (directo), no el pooler `:6543`.
- **Solo LEE prod** (`pg_dump`); **reemplaza** el schema `public` de dev y trae `auth.users`/`identities` con upsert (FK desactivadas durante la carga, conserva los logins de dev). Pide confirmar escribiendo `CLONAR` y muestra progreso tabla por tabla.
- **NO** copia los archivos físicos del Storage (los "Ver documento" dan 404 en dev). Para clonar datos, dev y prod deben tener el mismo esquema (mismas migraciones).

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

**Y SOLO esos 3.** Los roles custom de la empresa (`roles.slug IS NULL`: "Usuario de RR.HH.", "Usuario Control Documental", "Administrador Operaciones", etc.) NO se cargan por migración aunque sean los que más usuarios tienen — se asignan **manualmente** desde el editor de permisos. Si al revisar una tab nueva ves que los roles operativos no la tienen, eso es lo esperado, no un bug de la migración.

Para que la asignación manual funcione, la tab DEBE estar declarada en `permissions-map.ts` con sus `allowedActions`: el editor arma las acciones cruzando `allowedActions` con la tabla `actions`, y una tab ausente del mapa se muestra sin ninguna acción tildeable.

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

Las tablas de documentos (empleados/equipos) corren en **client-side mode con React Query**. Tras subir un documento (flujo masivo `UploadDocumentMultiEmployee/Equipment` o individual `SimpleDocument`), `router.refresh()` por sí solo **NO** actualiza la tabla de fondo (solo refresca Server Components/SSR). SIEMPRE llamar también `queryClient.invalidateQueries()`. Patrón: `queryClient.invalidateQueries(); router.refresh();` (el invalidate para las tablas React Query; router.refresh para las tablas SSR del sistema viejo). Extiende la regla de "Modal SimpleDocument != flujo UploadDocumentMulti\*".

### Carga masiva multirecurso: persistir server-side (Prisma), nunca `.in([cientos])` client-side

Subir un documento multirecurso a cientos de recursos con `supabaseBrowser().in('applies', [cientos de ids])` (client-side) **muere por timeout**: arma una URL gigante y dispara la cadena de triggers `update_status_trigger` (row-level) → `UPDATE employees/vehicles` → `controlar_alertas_*` → recálculo completo de alertas, **por cada fila** (N×N×M). Solución: server action Prisma con `$transaction` (`updateMany` faltantes-pendientes + `createMany` ausentes, ignorando los ya presentados) + compensación del storage si la transacción falla. Y los triggers de documentos deben ser **statement-level** (`REFERENCING NEW TABLE ... FOR EACH STATEMENT`, un trigger por evento porque Postgres no admite transition tables con `INSERT OR UPDATE` juntos) con `UPDATE ... SET status = (CASE ... END)::status_type` (la columna `status` es enum, requiere cast explícito). Los `controlar_alertas_*` de employees/vehicles deben tener guarda `WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.company_id IS DISTINCT FROM NEW.company_id)` para no recalcular alertas en cambios de `status`.

### Cambiar guardas/triggers row-level: analizar cascadas y TODOS los flujos masivos antes

Antes de modificar la guarda `WHEN` o el nivel de un trigger row-level (ej. `controlar_alertas_employees/vehicles`), mapear el grafo COMPLETO de cascadas (qué trigger dispara qué otro) y TODOS los flujos que hacen `UPDATE`/`updateMany` masivo sobre esa tabla. Un "flag de sesión" para cortar la recursión NO cubre los updates masivos originados en server actions (ej. `reassignVehiclesToOwner`, `recalculateResourceStatus`). La opción segura suele ser una **lista explícita de columnas en el `WHEN`** (las que realmente disparan el recálculo), no quitar la guarda. Verificar el disparo/no-disparo empíricamente con `EXPLAIN (ANALYZE)` (reporta el tiempo POR trigger). Extiende [[carga masiva multirecurso]].

### "No solicitar documentos que ya no aplican" (cambio de función): archivar, no borrar

Cuando un documento deja de aplicar a un recurso (cambió `company_position`/categoría/cliente/aptitud), si tiene archivo subido NO se borra: se **archiva** (columna `archived_at`, NULL=vigente) para conservarlo como HISTORIAL, y se excluye de status, listas, alertas, descargas y estadísticas. Solo se muestra en el DETALLE del recurso marcado "Ya no aplica". Las alertas vacías (sin archivo) que dejan de aplicar sí se borran. La re-evaluación se dispara ante el UPDATE del RECURSO (no del documento): por trigger si cambian columnas directas, y por llamada explícita a `controlar_alertas_documentos_single_employee/_vehicle` para las M:M (contratistas/aptitudes, que no tienen trigger en la pivote) desde las server actions de edición/creación y de asignación a cliente. Cobertura "en todo lugar" = mutaciones + mostrar + calcular status + estadísticas.

### Funciones SQL que retornan `void`: usar `$executeRaw`, NUNCA `$queryRaw`

`$queryRaw` **deserializa** el resultado de cada columna; si llamás una función Postgres que retorna `void` (ej. `SELECT controlar_alertas_documentos_single_employee(...)`), Prisma falla en runtime con `UnsupportedNativeDataType: void` / _"Failed to deserialize column of type 'void'"_ (código `P2010`). Usar **`$executeRaw`** (ejecuta sin deserializar, retorna el count de filas). Aplica a TODA invocación de función void via Prisma raw, incluido el patrón `SELECT fn(x) FROM unnest(...)`. **El error NO aparece en `check-types` ni al correr la función por psql/MCP** — solo en el flujo real de la app (editar/crear empleado o equipo, asignar a cliente). Por eso: tras agregar una llamada raw a una función void, **probar el flujo de UI real**, no solo el SQL. Bug introducido en el 358 (los recálculos M:M de `updateEmployee`/`createEmployee`/`updateVehicle`/`assign*ToCustomer`).

### La config de los `document_types` la define el CLIENTE — nos adaptamos, no la cuestionamos

Las condiciones de un tipo de documento (`special`, `conditions` por `company_position`/`guild`/`category`/etc.) son **decisión del cliente**. Si el cliente configuró `Apto Medico GH` como especial para 9 funciones, **así debe ser**: los empleados de otras funciones que lo tengan cargado **ya no lo requieren** y archivarlos es **correcto** — aunque intuitivamente "un apto médico debería aplicar a todos". NO asumir que una config "está mal" ni proponer corregirla salvo que el usuario/cliente lo pida explícitamente. Al validar el backfill o cualquier re-evaluación de alertas, el criterio de verdad es: _"¿el recurso cumple las conditions que el cliente definió?"_ — si no las cumple, el doc no le aplica, punto. La función `controlar_alertas_documentos_single_*` es fiel a esas conditions; un archivado masivo "sorprendente" (ej. 142 aptos médicos) refleja la config del cliente, no un bug. Extiende [[archivado docs por cambio de función]].

### Reconciliacion de documentos: hay DOS funciones (por-recurso vs por-tipo); la "all" estaba rota para tipos globales

Al re-evaluar que documentos aplican hay DOS caminos: `controlar_alertas_documentos_single_employee/_vehicle` (por-RECURSO, se dispara al cambiar el recurso: company_position, guild, category, etc.) y `controlar_alertas_single_document_all_employees/_vehicles` (por-TIPO, se dispara al editar `conditions`/`mandatory` del `document_type` via `trg_document_types_update`). Bug del ticket 411: la version "all" tenia DOS defectos: (a) filtraba `WHERE company_id = doc.company_id` y como los tipos afectados son GLOBALES (`company_id NULL`, ej. Apto Medico GH) no iteraba a NINGUN recurso -> editar sus conditions nunca reconciliaba; y (b) en la rama "vuelve a cumplir" solo hacia `INSERT ... WHERE NOT EXISTS`, sin el `UPDATE ... SET archived_at = NULL` -> los documentos archivados por el 358 quedaban trabados en "Ya no aplica" para siempre aunque el recurso volviera a cumplir la condicion (la version por-recurso SI tenia el des-archivado; por eso los cambios de funcion individuales si reactivaban, pero no la edicion de conditions del tipo). Ademas, el flujo de subida (`SimpleDocument`, `ReplaceDocument`, `upload-multiresource-document`) no limpiaba `archived_at` al subir -> re-subir el documento no lo des-archivaba. **Modelo real de empresas**: es efectivamente MONO-EMPRESA — solo GRUPO HORIZONTE SRL (`be4119b0`) tiene recursos (652 empleados, 377 vehiculos); las otras 3 empresas (La Nueva gh 1, Empresa 2, InfinityBrozz) estan vacias (0 recursos, 0 tipos); los `document_types` son globales (`company_id NULL`) o de GH. Por eso la reconciliacion aplica a TODOS los recursos sin filtrar por empresa (el filtro por company_id solo agregaria complejidad para empresas que nunca tendran recursos). La reparacion de datos (des-archivar los que hoy cumplen) va EMBEBIDA en la migracion para que el deploy corrija prod. Extiende [[archivado docs por cambio de funcion]] y [[config document_types cliente]].

### Toda modificación exige analizar el IMPACTO en lo vinculado — nunca tratar una entidad como aislada

Antes de implementar cualquier cambio (edición, alta, baja, integración), **mapear las relaciones y el flujo real de la funcionalidad** y determinar qué MÁS se ve afectado. Una entidad casi nunca vive sola: modificarla suele tener consecuencias en otras tablas, módulos, cálculos o estados derivados.

**Ejemplo del criterio** (no existe en este proyecto, ilustra la idea): en un módulo de stock, editar una _solicitud de materiales_ — agregar o quitar materiales — no es solo actualizar la solicitud: **impacta el stock** (reservas, disponibilidad, movimientos). Implementar solo el UPDATE de la solicitud dejaría el stock inconsistente.

**Cómo aplicarlo:**

1. **Antes de codear**: leer bien la funcionalidad y sus relaciones (schema Prisma, FKs, tablas pivote, triggers SQL, server actions que tocan lo mismo, cálculos de estado/status, alertas, estadísticas, exportaciones, PDFs).
2. **Listar los efectos colaterales** que el cambio debería producir para que el flujo quede correcto y consistente.
3. **Si hay duda sobre si algo DEBE verse afectado o no, PREGUNTAR al usuario** antes de implementar. No asumir ni por exceso (tocar de más) ni por defecto (dejar datos inconsistentes).
4. **Al reportar**, explicitar qué se tocó y qué quedó deliberadamente afuera.

Casos típicos en este proyecto donde esto aplica: documentos ↔ alertas/status del recurso ↔ triggers SQL; recursos dados de baja ↔ documentación de egreso; asignaciones M:M (contratistas, aptitudes, clientes) ↔ re-evaluación de qué documentos aplican; cambios en DataTables ↔ filtros + facets + export + sorting + permisos. Extiende [[cambiar guardas/triggers row-level]].

### Mensajes de commit: SOLO la línea de asunto, sin cuerpo

Un commit se describe con **una sola línea** en formato conventional commit. **NUNCA** agregar cuerpo, bullets, explicaciones, detalle de archivos ni justificaciones. Si el cambio parece necesitar más explicación, esa explicación va en el PR o en la conversación, no en el commit.

```bash
# ✅ CORRECTO — una línea y nada más
git commit -m "feat(dashboard): 516 - agregar subtipo y propietario al reporte de vencimientos de equipos"

# ❌ INCORRECTO — cuerpo con detalle
git commit -m "feat(dashboard): 516 - agregar subtipo y propietario

- Se suman las columnas X e Y
- Los filtros viven en la relación vehicles
- ..."
```

Aplica a TODOS los commits, sin importar el tamaño del cambio. Formato: `tipo(scope): <nro ticket si aplica> - descripción breve`. Ver también las reglas de `git-rules.md` (conventional commits, cero atribución a herramientas, nunca commitear sin pedido explícito).

### Implementación: usar `/feature-dev:feature-dev`, no las skills de superpowers

Para **implementar** una feature, el flujo preferido del usuario es la skill `feature-dev:feature-dev` (discovery → exploración con agentes → preguntas → arquitectura → implementación → review), **no** `superpowers:writing-plans` / `superpowers:executing-plans` / `superpowers:subagent-driven-development`.

`superpowers:brainstorming` sigue siendo válido para la etapa previa de exploración de la idea y definición de alcance; el cambio aplica al momento de pasar a construir.

### Schemas Zod compartidos server/client: NUNCA definirlos en un archivo `'use client'`

Si una server action importa un schema Zod que vive en un archivo con `'use client'`, Next entrega ese módulo como **referencia de cliente** y el objeto Zod no existe en el servidor: falla en runtime con `X.parse is not a function`. **No lo detecta `npm run check-types`** (los tipos resuelven perfecto) — solo aparece al ejecutar el flujo real.

Regla: los schemas Zod que se usan de los dos lados van en un módulo **sin directiva** (ej. `features/{X}/schemas/*.ts`); el componente de cliente los importa de ahí (y puede re-exportarlos para no romper imports existentes, pero **el consumidor server debe importar del módulo de schemas, no del componente**). Mismo criterio que [[funciones SQL void con executeRaw]]: tras conectar un módulo nuevo entre server y client, **probar el flujo de UI real**, no alcanza con que compile. Bug encontrado en el 505 (`employeeFormSchema` definido en `employee-form.tsx`, importado por `approvePreEmployee`).

### Obligatoriedad de campos: la define el TICKET, no la conveniencia de implementación

Si las notas del ticket especifican que una sección de datos va **completa** (ej. ticket 505: "Datos personales => completo, Datos de Contacto => completo, Datos Laboral => Sector y Puesto Propuestos (solo estos campos)"), esa obligatoriedad es **requisito**, no sugerencia. NO relajarla a `nullable`/opcional porque una decisión de UX (guardado parcial, borrador, wizard por pasos) lo haría más cómodo de implementar.

Cuando una decisión de UX entra en conflicto con una especificación explícita del ticket, **plantear la contradicción al usuario y dejar que él la resuelva** — nunca resolverla unilateralmente en el diseño y menos aún sin mencionarlo. Ojo con el detalle del enunciado: en el 505 el "ir cargando" del pedido original se refiere a **los documentos** ("que julia pueda ir cargando del personal que esta en proceso de ingreso **sus documentos**"), no a los datos personales — leer QUÉ es lo que se carga progresivamente antes de asumir que todo el formulario es un borrador.

Regla práctica al modelar una entidad espejo de otra (pre legajo ↔ empleado): **espejar EXACTAMENTE la nullability de la tabla original** — ni relajar ni endurecer. Si en `employees` la columna es NOT NULL, en la tabla espejo también; si en `employees` admite NULL (`gender`, `email`, `city`, `postal_code`, `born_date`, `document_type`, `nationality`, `marital_status`, `level_of_education`, `picture`…), en la espejo también, **aunque el formulario los exija a todos**. En este proyecto la capa Zod es deliberadamente más estricta que la BD: la obligatoriedad "de negocio" vive en el schema del form, no en el DDL. No "mejorar" el modelo poniendo NOT NULL donde el original no lo tiene. Extiende [[analizar impacto en lo vinculado]].

### Todo `<Button>` dentro de un `<form>` que NO guarda lleva `type="button"`

El `Button` de shadcn (`src/components/ui/button.tsx`) **no fija `type`**, así que dentro de un `<form>` el default del HTML es `type="submit"`: cualquier botón de acción (ver, subir, eliminar, abrir modal, agregar fila) **dispara el submit del formulario** además de su propio `onClick`. El síntoma no se parece a la causa — se ve como "la acción X ejecuta la mutación del form" (bug del 505: tocar "Ver" un documento en la tab Documentos del pre legajo ejecutaba `updatePreEmployee` y tiraba _"El pre legajo ya fue convertido en legajo y no se puede modificar"_).

Regla: al meter cualquier sección interactiva dentro de un `<form>` (tabs, listados, checklists, acciones inline), **todos** sus botones llevan `type="button"` explícito. Excepción: los envueltos por un trigger de Radix con `asChild` (`PopoverTrigger`, `DialogTrigger`, `DropdownMenuTrigger`) — Radix ya inyecta `type="button"`.

Complemento (defensa en profundidad): el handler de submit debe cortar temprano si el estado no admite edición (`if (!canEditData) return;`). Un `<fieldset disabled>` NO alcanza: solo cubre los controles que envuelve, y no impide que un botón fuera de él submitee. Y `check-types` no detecta nada de esto — se ve solo probando el flujo real de UI. Extiende [[analizar impacto en lo vinculado]].

### NUNCA aplicar una migración a dev antes de que el usuario valide el alcance

Aplicar una migración a dev **no es "ir adelantando trabajo"**: dev es el entorno donde el usuario está probando la app en ese mismo momento. En el 546 diseñé y apliqué una migración (rename de tabla, enum de categorías, backfill, `DROP COLUMN`) mientras el usuario usaba el sistema: la ficha de otros equipos dejó de cargar, el usuario intentó subir un documento y falló con un `404` de tabla inexistente, y hubo que revertir todo.

Reglas:

1. **La migración se escribe, se muestra, y se aplica recién con el OK explícito.** El paso `prisma db execute` no se ejecuta "para avanzar".
2. **Antes de diseñar esquema, buscar si la capacidad YA existe y solo está mal nombrada o mal ubicada.** El 546 ("necesito adjuntar documentos a las piletas") se resolvió renombrando el label de una tab que ya hacía exactamente eso. El camino más corto suele ser texto, no DDL.
3. **Si el usuario dice "es simple" o "no requiere migraciones", eso es un dato de alcance, no una subestimación a corregir.** Ajustar la solución hacia abajo, no defender el diseño grande.
4. Si hay que revertir: reconstruir el estado original consultando **PROD** los valores que la migración pisó (`tabs.name`, `description`, `role_permissions`), no adivinarlos. Y borrar la fila de `_prisma_migrations` para dejar el historial limpio.

Extiende [[analizar impacto en lo vinculado]] — el impacto también incluye el entorno de trabajo del usuario, no solo las tablas.

### Mandar un fix aislado a `main` cuando `dev` tiene trabajo sin liberar

`dev` suele acumular features que todavía no deben salir. Si el usuario pide mandar un fix puntual a `main`, **NO** abrir un PR `dev` → `main`: arrastra todo lo pendiente.

Flujo correcto: `git switch -c fix/<ticket>-<desc> origin/main` → `git cherry-pick <commit>` → push de esa rama → PR de esa rama a `main`. Verificar SIEMPRE con `gh pr view <n> --json files` (contra GitHub, no contra la copia local) que el PR contenga solo los archivos esperados.

Ojo con el orden de las migraciones: un fix con timestamp posterior que llega a `main` antes que las migraciones más viejas de `dev` se aplica primero. No rompe nada si es independiente (Prisma aplica todas las pendientes), pero hay que verificar que no dependa de las que quedaron atrás.

---

_Update this file continuously. Every mistake Claude makes is a learning opportunity._
