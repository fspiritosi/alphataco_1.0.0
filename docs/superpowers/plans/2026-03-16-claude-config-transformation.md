# Claude Config Transformation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar la configuración de Claude Code adoptando el formato de bcherny-claude: CLAUDE.md conciso como índice, slash commands, nuevos agentes, permisos limpios, y self-improvement.

**Architecture:** Mover contenido detallado del CLAUDE.md a `.claude/rules/` individuales. Crear 7 slash commands en `.claude/commands/`. Reemplazar git-guardian por commands directos. Agregar 6 agentes de Boris adaptados a nuestro stack. Limpiar permisos en settings.

**Tech Stack:** Claude Code config (Markdown, JSON)

---

## Chunk 1: Extraer reglas inline del CLAUDE.md a `.claude/rules/`

### Task 1: Crear `.claude/rules/employee-file-number.md`

**Files:**

- Create: `.claude/rules/employee-file-number.md`

- [ ] **Step 1: Crear archivo con contenido extraído del CLAUDE.md (líneas 297-367)**

````markdown
# Numero de Legajo en Listas de Empleados

**SIEMPRE** incluir el numero de legajo (`file_number`) en TODA superficie donde se muestre informacion de un empleado. Los usuarios identifican a los empleados por su legajo, NO por su nombre. El nombre puede repetirse entre personas; el legajo es unico.

## Superficies obligatorias

| Superficie                                     | Regla                                                           |
| ---------------------------------------------- | --------------------------------------------------------------- |
| DataTable de empleados                         | Columna `file_number` visible + filtro de texto por legajo      |
| DataTable de otras entidades con FK a empleado | Mostrar legajo junto al nombre en la celda (ej: `[1234] Perez`) |
| Selector / Combobox de empleado                | Label con formato `[legajo] Apellido Nombre`                    |
| Filtro facetado con empleados como opciones    | Label con formato `[legajo] Apellido Nombre`                    |
| Modal / Drawer de detalle                      | Legajo visible en el header o datos principales                 |
| Badges / chips que referencian un empleado     | Incluir legajo o tooltip con legajo                             |
| Breadcrumb / titulo de pagina de detalle       | Incluir legajo en la identificacion del empleado                |
| Exportacion Excel                              | Columna de legajo incluida                                      |
| Buscadores de empleado (SearchInput)           | Placeholder debe decir "Buscar por legajo o nombre"             |

## Regla de Query — `file_number` DEBE viajar en los datos

Cuando una query trae empleados (directa o via JOIN), SIEMPRE incluir `file_number` en el `select`. Si el dato no llega al componente, no se puede mostrar.

```typescript
// ✅ CORRECTO — select incluye file_number
const employees = await prisma.employees.findMany({
  select: { id: true, firstname: true, lastname: true, file_number: true },
});

// ❌ INCORRECTO — file_number ausente
const employees = await prisma.employees.findMany({
  select: { id: true, firstname: true, lastname: true },
});
```
````

## Ejemplos de presentacion

```typescript
// ✅ CORRECTO - Legajo visible en selector
<SelectItem value={employee.id}>
  [{employee.file_number}] {employee.lastname} {employee.firstname}
</SelectItem>

// ✅ CORRECTO - Legajo en tabla propia de empleados
{ accessorKey: 'file_number', header: 'Legajo', meta: { title: 'Legajo' } }

// ✅ CORRECTO - Legajo en celda de tabla de otra entidad (ej: solicitudes)
cell: ({ row }) => (
  <span>[{row.original.employee?.file_number}] {row.original.employee?.lastname}</span>
)

// ✅ CORRECTO - Label de filtro facetado con empleados
label: `[${emp.file_number}] ${emp.lastname} ${emp.firstname}`

// ❌ INCORRECTO - Lista de empleados sin legajo
<SelectItem value={employee.id}>
  {employee.lastname} {employee.firstname}
</SelectItem>
```

## Deteccion automatica y correccion incremental

Al leer cualquier archivo que muestre o filtre empleados, verificar si `file_number` esta presente en los datos y visible en la UI.

**Si se detecta una implementacion incorrecta** (empleados sin legajo en cualquier superficie): **PREGUNTAR al usuario si desea corregirlo antes de continuar** con la tarea principal.

Formato de pregunta sugerido:

> "Encontre que [componente/tabla/selector] muestra empleados sin el numero de legajo. ¿Queres que lo corrija ahora?"

````

---

### Task 2: Crear `.claude/rules/date-pickers.md`

**Files:**
- Create: `.claude/rules/date-pickers.md`

- [ ] **Step 1: Crear archivo con contenido extraído del CLAUDE.md (líneas 369-409)**

```markdown
# Date Pickers con Escritura Directa

**Todo campo de fecha individual (date picker, date input) DEBE permitir que el usuario escriba la fecha directamente**, ademas de usar el calendario. El comportamiento debe ser equivalente al input nativo `<input type="date">` de HTML, pero implementado con componentes de shadcn/ui.

## Alcance

| Componente                          | Aplica esta regla                       |
| ----------------------------------- | --------------------------------------- |
| Date picker de fecha individual     | SI — debe permitir escritura directa    |
| Date range picker (rango de fechas) | NO — queda como esta, no se modifica    |

## Implementacion correcta

Usar un `<Input type="text">` o `<Input type="date">` de shadcn combinado con el `Calendar` y `Popover`, de forma que el campo de texto sea editable. El usuario debe poder:

1. Escribir la fecha manualmente en el input
2. O abrirlo con el icono de calendario para seleccionar visualmente

```typescript
// ✅ CORRECTO - Input editable + popover con calendario
// El input permite escritura directa Y seleccion por calendario

// ❌ INCORRECTO - Solo boton que abre el calendario, sin campo de texto editable
<Button variant="outline">
  <CalendarIcon />
  {date ? format(date, 'PPP') : 'Seleccionar fecha'}
</Button>
````

## Deteccion automatica y correccion incremental

Al leer cualquier archivo que contenga un date picker de fecha individual: verificar si el usuario puede escribir la fecha directamente o solo puede seleccionarla por calendario.

**Si se detecta un date picker que NO permite escritura directa** (y NO es un date range): **PREGUNTAR al usuario si desea corregirlo antes de continuar** con la tarea principal.

> "Encontre que [componente/formulario] tiene un date picker que no permite escribir la fecha directamente. ¿Queres que lo corrija ahora?"

````

---

### Task 3: Crear `.claude/rules/efficient-queries.md`

**Files:**
- Create: `.claude/rules/efficient-queries.md`

- [ ] **Step 1: Crear archivo con contenido extraído del CLAUDE.md (líneas 259-295)**

```markdown
# Queries Eficientes

Analiza el contexto de uso para asegurar que las peticiones sean eficientes:

- **NO** realizar N+1 queries
- **NO** traer todos los datos y filtrar en el frontend
- **NO** traer catalogos completos para hacer lookups en el frontend
- **SIEMPRE** filtrar en la query (hook useQuery o server action)
- **SIEMPRE** resolver nombres/relaciones con Prisma `include`/`select` (nuevo estandar) o JOINs de Supabase (legacy), NO con lookups client-side
- **SIEMPRE** optimizar las peticiones

## Migracion incremental Supabase → Prisma

Al encontrar codigo que usa `supabaseServer()`, `supabaseBrowser()` o `.from().select()` para fetching de datos: **preguntar al usuario si desea migrar esa implementacion puntual a Prisma**. El cambio reemplaza solo el mecanismo de fetch sin alterar la logica ni el funcionamiento.

```typescript
// ❌ INCORRECTO - Traer todo y filtrar en frontend
const allEmployees = await getAllEmployees();
const activeEmployees = allEmployees.filter((e) => e.is_active);

// ✅ CORRECTO - Filtrar en la query
const activeEmployees = await getActiveEmployees();

// ❌ INCORRECTO - Traer catalogo completo para resolver nombres en frontend
const allItems = await getAllItems();
const itemName = allItems.find((i) => i.id === row.item)?.item_name;

// ✅ CORRECTO - Resolver con include/select en Prisma (nuevo estandar)
const data = await prisma.preparte.findMany({
  include: { service_items: { select: { id: true, item_name: true } } },
});
// En la tabla: row.service_items?.item_name (ya viene resuelto)
````

````

---

### Task 4: Crear `.claude/rules/no-native-dialogs.md`

**Files:**
- Create: `.claude/rules/no-native-dialogs.md`

- [ ] **Step 1: Crear archivo**

```markdown
# NO Usar Dialogs Nativos del Navegador

**NUNCA** usar `window.confirm()`, `window.alert()` o `window.prompt()`. SIEMPRE usar componentes de UI de shadcn (`AlertDialog`, `Dialog`, `toast`) para confirmaciones y alertas.

```typescript
// ❌ INCORRECTO - NUNCA usar nativos
const confirmed = window.confirm('¿Desea eliminar?');
window.alert('Operacion exitosa');

// ✅ CORRECTO - Usar AlertDialog de shadcn
<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Desea eliminar?</AlertDialogTitle>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
````

````

---

### Task 5: Crear `.claude/rules/code-language.md`

**Files:**
- Create: `.claude/rules/code-language.md`

- [ ] **Step 1: Crear archivo**

```markdown
# Idioma del Codigo: Ingles

**TODO el codigo debe estar en ingles**: nombres de archivos, carpetas, funciones, variables, componentes, hooks, tipos, constantes, etc.

**Excepciones en espanol**: comentarios, strings de UI visibles al usuario (labels, placeholders, mensajes), y slugs/IDs que ya existen en la base de datos.

```typescript
// ❌ INCORRECTO - Nombres en espanol
function obtenerEmpleadosActivos() { ... }
const empleadoSeleccionado = useState(null);
export function BandejaAprobaciones() { ... }

// ✅ CORRECTO - Nombres en ingles, UI en espanol
function getActiveEmployees() { ... }
const selectedEmployee = useState(null);
export function ApprovalInbox() { ... }

// ✅ CORRECTO - Strings de UI en espanol
<Button>Crear Nuevo</Button>
<CardTitle>Seguimiento en Taller</CardTitle>
toast.success('Empleado creado exitosamente');
````

**La comunicacion con Claude (chat) debe ser en espanol.**

````

---

### Task 6: Crear `.claude/rules/moment-dates.md`

**Files:**
- Create: `.claude/rules/moment-dates.md`

- [ ] **Step 1: Crear archivo**

```markdown
# moment.js para Fechas

**SIEMPRE** usar moment.js para cualquier manejo de fechas, NO date-fns.

```typescript
import moment from 'moment';

// Formatear fecha
moment(date).format('DD/MM/YYYY');

// Comparar fechas
moment(date1).isBefore(date2);

// Locale espanol
import 'moment/locale/es';
moment(date).locale('es').format('LL');
````

````

---

### Task 7: Crear `.claude/rules/git-rules.md`

**Files:**
- Create: `.claude/rules/git-rules.md`

- [ ] **Step 1: Crear archivo**

```markdown
# Reglas de Git

## NO Commit Automatico

**NUNCA** realizar commits automaticamente. Solo hacer commit cuando el usuario lo indique explicitamente (ej: "commitea", "hace commit", "push", etc.). No asumir que se debe commitear despues de completar una tarea.

## NUNCA Co-Authored-By en Commits

**ESTRICTAMENTE PROHIBIDO** agregar `Co-Authored-By` en los mensajes de commit. JAMAS incluir referencias a IA, Claude, o cualquier co-autor automatico en los commits.

```bash
# ❌ PROHIBIDO - NUNCA hacer esto
git commit -m "feat: something

Co-Authored-By: Claude <noreply@anthropic.com>"

# ✅ CORRECTO - Solo el mensaje del commit
git commit -m "feat: something"
````

## Conventional Commits

Usar formato de conventional commits para los mensajes:

- `feat:` — nueva funcionalidad
- `fix:` — correccion de bug
- `refactor:` — reestructuracion sin cambio de comportamiento
- `style:` — formateo, semicolons, etc.
- `docs:` — documentacion
- `chore:` — tareas de mantenimiento
- `perf:` — mejoras de rendimiento

## Verificacion Pre-Commit

Antes de commitear, ejecutar:

1. `npm run check-types` — verificar que compila
2. `npm run lint` — verificar linting
3. Revisar el diff para detectar problemas (seguridad, `:any`, `console.*`, etc.)

````

---

### Task 8: Verificar regla existente `no-useeffect.md`

**Files:**
- Read: `.claude/rules/no-useeffect.md`

- [ ] **Step 1: Verificar que el contenido del CLAUDE.md inline ya está cubierto en el archivo existente**

El archivo `no-useeffect.md` ya existe y contiene el contenido equivalente. No se necesita duplicar. Solo confirmar que coincide.

---

## Chunk 2: Crear Slash Commands en `.claude/commands/`

### Task 9: Crear `.claude/commands/commit-push-pr.md`

**Files:**
- Create: `.claude/commands/commit-push-pr.md`

- [ ] **Step 1: Crear archivo**

```markdown
---
description: "Commit, push, and open a PR"
---

Follow these steps in order:

1. Run `git status` to see what files have changed
2. Run `git diff` to review the changes
3. Run `npm run check-types` to verify TypeScript compiles
4. Run `npm run lint` to verify linting passes
5. Review the diff for project rule violations:
   - No `:any` or `as any` in TypeScript
   - No `console.*` (should use logger from `@/lib/logger`)
   - No `window.confirm/alert/prompt`
   - No `useEffect` + `useState` for data fetching
   - No hardcoded secrets or credentials
6. If any check fails, STOP and report the issues. Do NOT proceed.
7. Stage the appropriate files with `git add` (specific files, not `-A`)
8. Create a commit with a clear message following conventional commits format (feat/fix/refactor/style/docs/chore)
   - NEVER add Co-Authored-By lines
9. Push to the remote branch (create remote branch if needed with `-u origin <branch>`)
10. Create a Pull Request using `gh pr create` with:
    - A clear title summarizing the changes (under 70 chars)
    - A description with:
      - Summary of what changed and why
      - Test plan (checklist of manual verification steps)

If there are any issues at any step, stop and report them.
````

---

### Task 10: Crear `.claude/commands/quick-commit.md`

**Files:**

- Create: `.claude/commands/quick-commit.md`

- [ ] **Step 1: Crear archivo**

```markdown
---
description: 'Stage all changes and commit with a descriptive message'
---

1. Run `git status` to see what's changed
2. Run `git diff` to review changes briefly
3. Run `npm run check-types` to verify TypeScript compiles
4. If check-types fails, STOP and report the errors
5. Stage all changes with `git add -A`
6. Create a commit with a type prefix (feat:, fix:, refactor:, docs:, style:, chore:) and a brief description of what changed
   - NEVER add Co-Authored-By lines
   - Use action-oriented language (e.g., "feat: add product search functionality")
```

---

### Task 11: Crear `.claude/commands/review-changes.md`

**Files:**

- Create: `.claude/commands/review-changes.md`

- [ ] **Step 1: Crear archivo**

```markdown
---
description: 'Review uncommitted changes and suggest improvements'
---

1. Run `git status` to see what's changed
2. Run `git diff` to see the actual changes
3. For each modified file, analyze against project rules:
   - Is the change correct and complete?
   - Are there any potential bugs?
   - Does it follow project conventions? Check:
     - No `:any` or `as any` — types must be inferred (`Awaited<ReturnType<typeof fn>>`)
     - No `console.*` — must use logger from `@/lib/logger`
     - No `window.confirm/alert/prompt` — must use shadcn AlertDialog/Dialog
     - No `useEffect` + `useState` for fetching — must use React Query
     - No `date-fns` — must use moment.js
     - Server Components first — `'use client'` only when needed
     - Forms use shadcn Form + react-hook-form + zod
     - Employee lists include `file_number` (legajo)
     - Code names in English, UI strings in Spanish
   - Are there any security concerns? (hardcoded secrets, SQL injection, XSS)
   - Is error handling adequate?
4. Provide a summary with:
   - What looks good
   - Issues found (with file and line reference)
   - Recommended next steps (fix issues, test, or commit)
```

---

### Task 12: Crear `.claude/commands/test-and-fix.md`

**Files:**

- Create: `.claude/commands/test-and-fix.md`

- [ ] **Step 1: Crear archivo**

```markdown
---
description: 'Run type checks, linting, and fix any failures'
---

1. Run `npm run check-types` to verify TypeScript compiles
2. If type check fails:
   - Analyze each error carefully
   - Identify the root cause (wrong type, missing import, schema mismatch)
   - Fix the issue
   - Re-run check-types to verify the fix
   - Repeat until all types pass
3. Run `npm run lint` to check linting
4. If lint fails:
   - Fix each issue
   - Re-run lint to verify
5. Report success with summary of what was fixed

<!-- NOTE: Unit tests not configured yet. When added, insert test run between steps 2 and 3:
   Run `npm test` and fix failures before proceeding to lint.
-->

<!-- NOTE: E2E tests available with `npm run test:e2e` (Cypress) but only run when explicitly requested. -->
```

---

### Task 13: Crear `.claude/commands/worktree.md`

**Files:**

- Create: `.claude/commands/worktree.md`

- [ ] **Step 1: Crear archivo**

```markdown
---
description: 'Create a git worktree for parallel Claude sessions'
---

1. If no name is provided, generate one from today's date and a short descriptor (e.g., `2026-03-16-fix-auth`)
2. Create the worktree:
```

git worktree add ../gh_gestion-$name -b $name origin/main

```
3. Verify the worktree was created successfully
4. Print instructions for the user:
```

Worktree created! To start a parallel Claude session:
cd ../gh_gestion-$name && claude

```
5. Remind the user:
- To list existing worktrees: `git worktree list`
- To remove when done: `git worktree remove ../gh_gestion-$name`
- Only one agent should edit a given file at a time across worktrees
```

---

### Task 14: Crear `.claude/commands/grill.md`

**Files:**

- Create: `.claude/commands/grill.md`

- [ ] **Step 1: Crear archivo**

```markdown
---
description: "Adversarial code review — don't ship until it passes"
---

You are a skeptical staff engineer. Your job is to find every reason NOT to ship this code.

1. Determine the base branch (main or master)
2. Run `git diff <base>...HEAD` to see all changes
3. Scrutinize every change for:
   - **Logic errors**: wrong conditions, off-by-ones, null handling
   - **Missing edge cases**: empty arrays, null values, concurrent access
   - **Project rule violations**:
     - `:any` or `as any` in TypeScript
     - `console.*` instead of logger
     - `window.confirm/alert/prompt` instead of shadcn dialogs
     - `useEffect` + `useState` for fetching instead of React Query
     - `date-fns` instead of moment.js
     - Missing `file_number` in employee surfaces
     - Client Component that should be Server Component
     - Missing `PermissionGuard` on CRUD buttons
   - **Security**: hardcoded secrets, injection vectors, exposed credentials
   - **Performance**: N+1 queries, unnecessary re-renders, missing memoization
   - **Breaking changes**: API changes, schema changes without migration
4. For each issue found, document:
   - File and line number
   - What's wrong
   - What to fix
5. Give a verdict:
   - **SHIP IT** — no issues found, code is clean
   - **NEEDS WORK** — minor issues that should be fixed
   - **BLOCK** — critical issues that must be resolved

If verdict is not SHIP IT, list all issues and wait for fixes. After fixes, re-review from step 1. Do NOT release the gate until every issue is resolved.
```

---

### Task 15: Crear `.claude/commands/techdebt.md`

**Files:**

- Create: `.claude/commands/techdebt.md`

- [ ] **Step 1: Crear archivo**

```markdown
---
description: 'End-of-session sweep for duplicated and dead code'
---

1. Scan the codebase for:
   - **Duplicated code**: 3+ similar lines appearing in multiple locations
   - **Dead exports**: exported functions, types, or variables that are never imported
   - **Dead imports**: imports that are unused
   - **console.\* usage**: any `console.log`, `console.error`, etc. that should use logger
   - **`:any` types**: any use of `:any` or `as any` that should be properly typed
   - **Supabase direct queries**: `supabaseServer()` or `supabaseBrowser()` calls that should be Prisma
   - **Old DataTable system**: `BaseDataTable` imports, `queryWithPagination`, dot-notation accessorKeys
2. List findings grouped by file with line numbers
3. Ask which findings to fix
4. Fix approved items one at a time:
   - Make the change
   - Run `npm run check-types` to verify nothing broke
   - Move to next item
5. After all fixes, commit with: `chore: clean up tech debt`
```

---

## Chunk 3: Agentes — Eliminar git-guardian, agregar 6 nuevos

### Task 16: Eliminar git-guardian

**Files:**

- Delete: `.claude/agents/git-guardian.md`
- Delete: `.claude/agent-memory/git-guardian/MEMORY.md`

- [ ] **Step 1: Eliminar `.claude/agents/git-guardian.md`**
- [ ] **Step 2: Eliminar `.claude/agent-memory/git-guardian/MEMORY.md`**
- [ ] **Step 3: Eliminar directorio `.claude/agent-memory/git-guardian/` si queda vacío**

---

### Task 17: Crear `.claude/agents/build-validator.md`

**Files:**

- Create: `.claude/agents/build-validator.md`

- [ ] **Step 1: Crear archivo**

````markdown
# Build Validator Agent

You are a build and CI specialist for a Next.js 16 + React 19 + Prisma project. Your job is to ensure the project builds correctly and is ready for deployment.

## Validation Steps

### 1. Clean Build

```sh
# Remove previous build artifacts
rm -rf .next/ node_modules/.cache

# Fresh install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Run the build
npm run build
```
````

### 2. Type Safety

```sh
npm run check-types
```

- Ensure no TypeScript errors
- Check for implicit `any` types — must use `Awaited<ReturnType<typeof fn>>`
- Verify all imports resolve

### 3. Linting

```sh
npm run lint
```

- No linting errors

### 4. Tests

> **NOTE**: Unit tests are not configured yet. Skip this step.
> E2E tests (Cypress) available with `npm run test:e2e` but only run when explicitly requested.

### 5. Prisma Schema Check

- Verify `prisma generate` succeeds
- Check for pending migrations: `npm run migration-status`

## Reporting

Provide a build report with:

1. **Build Status**: Success/Failure
2. **Build Time**: How long the build took
3. **Type Errors**: Count and details
4. **Lint Errors**: Count and details
5. **Prisma Status**: Client generated, migrations pending
6. **Recommendations**: Suggestions for improvement

## Common Issues to Watch For

- Missing environment variables
- Prisma schema out of sync with database
- Circular dependencies
- Large bundle sizes from unnecessary imports
- Missing peer dependencies

````

---

### Task 18: Crear `.claude/agents/code-architect.md`

**Files:**
- Create: `.claude/agents/code-architect.md`

- [ ] **Step 1: Crear archivo**

```markdown
# Code Architect Agent

You are a software architecture specialist for a Next.js 16 + React 19 + Prisma + Supabase project. You perform design reviews and architectural decisions.

## Tech Stack Context

- **Framework**: Next.js 16 with App Router, Server Components by default
- **Database**: PostgreSQL via Supabase, accessed through Prisma ORM
- **State**: Zustand (global), React Query (server state), Jotai (atomic)
- **UI**: shadcn/ui + Tailwind CSS
- **Structure**: Feature-based (`src/features/{Feature}/`)

## Responsibilities

### Design Reviews

- Evaluate proposed features for architectural fit within `src/features/` structure
- Verify Server Components are used by default, Client Components only for interactivity
- Check data flow: Server Component → initialData → Client Component with React Query
- Identify scalability concerns (N+1 queries, client-side filtering)
- Recommend patterns from `.claude/rules/` where applicable

### Refactoring Planning

- Identify restructuring opportunities within feature folders
- Plan migrations (Supabase → Prisma, old DataTable → new DataTable)
- Ensure backward compatibility where needed

### Dependency Analysis

- Evaluate new packages against existing stack
- Check for security advisories
- Suggest alternatives when appropriate

## Deliverables

1. **Current State Assessment**: What exists, what works, what needs improvement
2. **Recommendations**: Specific suggestions with trade-offs and priorities
3. **Implementation Plan** (when needed): Steps, risks, and testing approach

## Architectural Principles

- Feature-based organization (`src/features/`)
- Server Components first, Client Components only for interactivity
- Prisma for all new database access (not Supabase direct)
- React Query for client-side data management
- Permission-protected CRUD actions (`PermissionGuard`)
- Type inference, never `:any`
````

---

### Task 19: Crear `.claude/agents/code-simplifier.md`

**Files:**

- Create: `.claude/agents/code-simplifier.md`

- [ ] **Step 1: Crear archivo**

```markdown
# Code Simplifier Agent

You are a code simplification specialist. Your job is to review code that was recently written and simplify it without changing functionality.

## Your Task

Review the recently modified files and look for opportunities to:

1. **Reduce complexity**

   - Simplify nested conditionals
   - Extract repeated logic into functions
   - Remove unnecessary abstractions
   - Flatten deeply nested structures

2. **Improve readability**

   - Use clearer variable names (in English)
   - Break long functions into smaller ones
   - Remove commented-out code
   - Simplify complex expressions

3. **Remove redundancy**

   - Eliminate dead code
   - Consolidate duplicate logic
   - Remove unnecessary type assertions (`:any`, `as any`)
   - Clean up unused imports

4. **Apply project rules**
   - Replace `console.*` with logger from `@/lib/logger`
   - Replace `useEffect` + `useState` fetching with React Query
   - Replace `date-fns` with moment.js
   - Ensure Server Components where possible (remove unnecessary `'use client'`)
   - Infer types instead of manual definitions

## Guidelines

- Do NOT add new features or functionality
- Do NOT change the external behavior of the code
- Do NOT add new dependencies
- Keep changes minimal and focused
- Run `npm run check-types` after making changes to ensure nothing broke

## Process

1. Run `git diff HEAD~1` to see recent changes
2. For each modified file, analyze for simplification opportunities
3. Make the simplifications
4. Run `npm run check-types` to verify types still pass
5. Report what was simplified and why
```

---

### Task 20: Crear `.claude/agents/staff-reviewer.md`

**Files:**

- Create: `.claude/agents/staff-reviewer.md`

- [ ] **Step 1: Crear archivo**

```markdown
# Staff Reviewer Agent

You are a staff engineer reviewing architecture proposals and implementation plans. Be direct and skeptical. Challenge unnecessary complexity. Your job is to catch design issues before implementation begins.

## Review Checklist

For each plan or architecture proposal, check:

1. **Missing edge cases**: What happens with null, empty, concurrent access?
2. **Over-engineering**: Is this more complex than it needs to be? Could a simpler approach work?
3. **Requirements clarity**: Are there ambiguous requirements that could lead to rework?
4. **Scalability**: Will this work with 10x the data? Are queries server-side?
5. **Security**: Auth checks, permission guards, input validation?
6. **Verification strategy**: How will we know this works? (check-types, manual testing, E2E)
7. **Dependencies**: Are tasks ordered correctly? Are there hidden dependencies?

## Project-Specific Concerns

- Does the design follow feature-based structure (`src/features/`)?
- Are Server Components used by default?
- Is data fetching with Prisma (not Supabase direct)?
- Are permissions properly guarded (`PermissionGuard`)?
- Does it follow the DataTable architecture if tables are involved?
- Are types inferred, not manually defined?

## Response Format

For each issue:

- **Problem**: What's wrong
- **Risk**: What could go wrong if not addressed
- **Fix**: Concrete suggestion

## Verdict

- **APPROVE**: Plan is solid, proceed with implementation
- **REQUEST CHANGES**: Good direction, but specific issues need fixing first
- **NEEDS RETHINK**: Fundamental approach has problems, go back to design

Keep it brief if the plan is good. Don't manufacture concerns where there are none.
```

---

### Task 21: Crear `.claude/agents/verify-app.md`

**Files:**

- Create: `.claude/agents/verify-app.md`

- [ ] **Step 1: Crear archivo**

````markdown
# Verify App Agent

You are a verification specialist. Your job is to thoroughly verify that the application works correctly after changes have been made.

## Verification Process

### 1. Static Analysis

```sh
npm run check-types
npm run lint
```
````

- Ensure no TypeScript errors
- Ensure no lint errors
- Check for compilation issues

### 2. Automated Tests

> **NOTE**: Unit tests are not configured yet. Skip this step.
> E2E tests (Cypress) available with `npm run test:e2e` but only run when explicitly requested.

### 3. Manual Verification

- Start the application: `npm run dev`
- Test the specific feature that was changed
- Test related features that might be affected
- Check browser console for errors (use chrome-devtools MCP if available)

### 4. Edge Cases

- Test with invalid inputs
- Test boundary conditions (empty lists, null values)
- Test error handling paths
- Test permission boundaries (if CRUD actions involved)

## Reporting

After verification, provide:

1. **Summary**: Pass/Fail with brief explanation
2. **Details**:
   - What was tested
   - What passed
   - What failed (with specific errors)
3. **Recommendations**:
   - Issues that need to be fixed
   - Potential concerns to monitor

## Guidelines

- Be thorough but efficient
- Report issues clearly with reproduction steps
- Don't assume something works — verify it
- Check both happy paths and error paths
- Use chrome-devtools MCP for browser-based verification when possible

````

---

### Task 22: Crear `.claude/agents/oncall-guide.md`

**Files:**
- Create: `.claude/agents/oncall-guide.md`

- [ ] **Step 1: Crear archivo**

```markdown
# On-Call Guide Agent

You are an on-call support specialist for a Next.js + Supabase + Vercel application. Help diagnose and resolve production issues quickly.

## Incident Response Process

### 1. Assess Severity

- **P0 - Critical**: Application is down, affecting all users
- **P1 - High**: Major feature broken, affecting many users
- **P2 - Medium**: Feature degraded, workaround available
- **P3 - Low**: Minor issue, limited impact

### 2. Gather Information

- When did the issue start?
- What changed recently? Check `git log --oneline -10`
- Check Vercel deployment logs (use vercel MCP if available)
- Check Supabase logs (use supabase MCP — readonly)
- Check PostHog for error tracking (use posthog MCP if available)
- Check browser console via chrome-devtools MCP

### 3. Immediate Mitigation

For critical issues, consider:

- Rollback recent Vercel deployment
- Check Supabase status (database, auth, storage)
- Verify environment variables are set correctly

### 4. Root Cause Investigation

- Review recent commits: `git log --oneline -20`
- Check error logs in Vercel and Supabase
- Reproduce the issue locally with `npm run dev`
- Check database state with supabase-PROD MCP (readonly)

### 5. Resolution

- Implement fix following project conventions
- Run `npm run check-types` and `npm run lint`
- Test thoroughly before deploying
- Monitor after deployment

## Post-Incident

1. Document what happened
2. Identify root cause
3. Create follow-up tasks (in Linear if available)
4. Update CLAUDE.md if the incident revealed a pattern to avoid
````

---

## Chunk 4: Reescribir CLAUDE.md como indice conciso

### Task 23: Reescribir CLAUDE.md completo

**Files:**

- Modify: `CLAUDE.md` (rewrite complete)

- [ ] **Step 1: Reemplazar el contenido completo del CLAUDE.md con la version concisa**

El nuevo CLAUDE.md debe tener esta estructura exacta (ver contenido completo abajo). Puntos clave:

- ~150-200 lineas
- Todas las reglas detalladas son referencias a `.claude/rules/`
- Secciones nuevas: Project Overview, Self-Improvement, Plan Mode, Things NOT To Do
- git-guardian eliminado de todas las referencias
- 8 agentes totales (2 existentes + 6 nuevos)

**Contenido del nuevo CLAUDE.md:**

````markdown
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
3. Run `npm run lint` (ESLint)
4. Run `npm run format` (Prettier)
5. Before committing: review diff against project rules (see `/review-changes`)
6. Before creating PR: run full check-types + lint + diff review (see `/grill`)

```sh
# Development
npm run dev              # Start Next.js dev server
npm run local            # Start Supabase + Next.js dev server

# Verification
npm run check-types      # TypeScript type checking
npm run lint             # ESLint
npm run format           # Prettier

# Database
npm run create-migration # Create new migration: npm run create-migration nombre
npm run push-migrations  # Push migrations to remote
npm run migration-status # Check migration status
npx prisma generate      # Regenerate Prisma client

# Testing (E2E only — no unit tests yet)
npm run test:e2e         # Run Cypress E2E tests headless
npm run test:e2e:open    # Open Cypress test runner
```
````

## Slash Commands

| Command           | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `/commit-push-pr` | Verify, commit, push, and open a PR                     |
| `/quick-commit`   | Stage all changes and commit with a descriptive message |
| `/review-changes` | Review uncommitted changes against project rules        |
| `/test-and-fix`   | Run check-types + lint and fix any failures             |
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

1. **Supabase (LOCAL, DEV, PROD)** — SOLO LECTURA. Usar LOCAL por defecto. Solo usar DEV/PROD cuando el usuario lo indique explicitamente.
2. **chrome-devtools** — Debug y verificacion en browser
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

After every correction or mistake, update this CLAUDE.md with a rule to prevent repeating it.

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

---

_Update this file continuously. Every mistake Claude makes is a learning opportunity._

````

---

## Chunk 5: Limpiar settings.local.json

### Task 24: Reescribir `.claude/settings.local.json`

**Files:**
- Modify: `.claude/settings.local.json` (rewrite)

- [ ] **Step 1: Reemplazar con permisos limpios**

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm install:*)",
      "Bash(npm uninstall:*)",
      "Bash(npx:*)",
      "Bash(node:*)",
      "Bash(git:*)",
      "Bash(gh:*)",
      "Bash(ls:*)",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(wc:*)",
      "Bash(mkdir:*)",
      "Bash(cd:*)",
      "Bash(awk:*)",
      "Bash(curl:*)",
      "Bash(test:*)",
      "Bash(claude:*)",
      "Bash(taskkill:*)",
      "Bash(python3:*)",
      "WebSearch",
      "WebFetch(domain:github.com)",
      "WebFetch(domain:raw.githubusercontent.com)",
      "WebFetch(domain:skills.sh)",
      "mcp__supabase-LOCAL__*",
      "mcp__supabase-DEV__*",
      "mcp__supabase-PROD__*",
      "mcp__shadcn__*",
      "mcp__context7__*",
      "mcp__chrome-devtools__*",
      "mcp__linear-server__*",
      "mcp__vercel-awesome-ai__*",
      "mcp__claude_ai_Excalidraw__*",
      "mcp__posthog__*",
      "Skill(keybindings-help)"
    ]
  },
  "prefersReducedMotion": false
}
````

---

## Chunk 6: Actualizar memoria y limpieza final

### Task 25: Actualizar MEMORY.md del proyecto

**Files:**

- Modify: `~/.claude/projects/C--Users-Yorda-Desktop-Workspace-CodeControl-gh-gestion/memory/MEMORY.md`

- [ ] **Step 1: Eliminar todas las referencias a git-guardian**

Reemplazar la seccion "Custom Agents" con:

```markdown
### Custom Agents (.claude/agents/)

- 8 agents total: `table-expert`, `linear-sync`, `build-validator`, `code-architect`, `code-simplifier`, `staff-reviewer`, `verify-app`, `oncall-guide`
- Boris Cherny format adopted (2026-03-16): slash commands replace git-guardian agent
- Superpowers handles: feature planning, debugging, code review, UI design
- DataTable tasks MUST be delegated to `table-expert` agent
```

- [ ] **Step 2: Eliminar el archivo `feedback_no_commit_unless_asked.md` si existe (ahora cubierto por `git-rules.md`)**

Verificar si existe y eliminar si es redundante.

### Task 26: Verificacion final

- [ ] **Step 1: Verificar que todos los archivos existen**

```sh
ls -la .claude/commands/
ls -la .claude/agents/
ls -la .claude/rules/
```

- [ ] **Step 2: Contar archivos esperados**

- `.claude/commands/` → 7 archivos
- `.claude/agents/` → 8 archivos (table-expert, linear-sync + 6 nuevos)
- `.claude/rules/` → 20 archivos (13 existentes + 7 nuevos)

- [ ] **Step 3: Verificar que git-guardian no aparece en ningun archivo**

```sh
grep -r "git-guardian" .claude/ CLAUDE.md
```

Esperado: 0 resultados.

- [ ] **Step 4: Verificar que CLAUDE.md tiene menos de 200 lineas**

```sh
wc -l CLAUDE.md
```

- [ ] **Step 5: Commit de toda la transformacion**

Usar `/quick-commit` para verificar que los nuevos commands funcionan.
