# CLAUDE.md

**IDIOMA**: SIEMPRE comunicarte, planificar, comentar y documentar en **espanol**. Todos los mensajes, planes, analisis y explicaciones deben ser en espanol.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Framework**: Next.js 16 with React 19 (App Router, Server Components)
- **Database**: Supabase (PostgreSQL) with auto-generated types in `database.types.ts`
- **State**: Zustand (global), React Query (server state), Jotai (atomic)
- **UI**: shadcn/ui + Tailwind CSS + Lucide icons
- **Forms**: React Hook Form + Zod validation
- **Analytics**: PostHog (error tracking and analytics)
- **Dates**: moment.js (NOT date-fns)

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run local            # Start Supabase + Next.js dev server

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier
npm run check-types      # TypeScript type checking

# Database
npm run gentypes         # Generate TS types from remote Supabase
npm run genlocaltypes    # Generate TS types from local Supabase
npm run create-migration # Create new migration: npm run create-migration nombre
npm run push-migrations  # Push migrations to remote
npm run migration-status # Check migration status

# Testing
npm run test:e2e         # Run Cypress E2E tests headless
npm run test:e2e:open    # Open Cypress test runner

# Git Worktree (trabajo paralelo)
git worktree add ../gh_gestion-<nombre> -b <branch>   # Crear worktree + branch
git worktree list                                       # Listar worktrees activos
git worktree remove ../gh_gestion-<nombre>              # Eliminar worktree
```

## MCPs Disponibles

Los siguientes MCPs estan a tu disposicion:

1. **MCP de Supabase (LOCAL, DEV y PROD)**:

   - **supabase-LOCAL**: Base de datos LOCAL (desarrollo local con Docker). Tiene permisos completos de lectura y escritura.
   - **supabase-DEV**: Base de datos de DESARROLLO remoto. Tiene permisos de lectura y escritura (ejecutar queries, aplicar migraciones, modificar datos).
   - **supabase-PROD**: Base de datos de PRODUCCION. Solo tiene permisos de LECTURA (consultas, verificaciones).

   **REGLA CRITICA - USAR LOCAL POR DEFECTO**: SIEMPRE usar `supabase-LOCAL` por defecto para cualquier operacion (queries, migraciones, modificaciones de datos). Solo usar otro MCP cuando el usuario explicitamente lo indique:

   - Usar `supabase-DEV` cuando el usuario diga: "usa dev", "en desarrollo", "en DEV", etc.
   - Usar `supabase-PROD` cuando el usuario diga: "revisa en produccion", "consulta en prod", "verifica en la base de produccion", etc.

   **Si tienes dudas sobre cual usar, PREGUNTA al usuario antes de ejecutar.**

   **REGLA DE MIGRACIONES**: Los cambios en la base de datos (crear tablas, modificar columnas, etc.) se deben aplicar **DIRECTAMENTE usando el MCP de Supabase** con `apply_migration`. **NO crear archivos SQL manualmente en `/supabase/migrations/`**. Supabase tiene comandos para generar migraciones diferenciando bases de datos, por lo que no es necesario crear archivos locales.

   **REGLA DE TIPOS**: Despues de aplicar una migracion con el MCP:

   - Usar `npm run genlocaltypes` para regenerar tipos (ya que el cambio se aplico en LOCAL)
   - `npm run gentypes` es para obtener tipos de PRODUCCION (no reflejara cambios recientes en LOCAL/DEV)

2. **MCP de chrome-devtools**: Para revisar logs de debug y verificaciones generales de la aplicacion
3. **MCP de shadcn-ui**: SIEMPRE usar para cualquier cosa relacionada con UI, componentes, estilos o implementacion de componentes de shadcn/ui. Tiene acceso a documentacion y ejemplos actualizados
4. **MCP de Context7**: SIEMPRE usar como PRIMERA OPCION para consultar documentacion actualizada de librerias, frameworks o herramientas. Si Context7 no tiene la documentacion necesaria, entonces buscar en internet

## Agentes Personalizados

Hay 4 agentes personalizados disponibles. Usarlos segun el contexto:

| Agente                       | Cuando usarlo                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `branch-reviewer`            | Commitear / hacer commit / push / revisar cambios antes de push                   |
| `supabase-query-optimizer`   | Optimizar queries, N+1, performance de DB, diseñar queries para nuevas tablas     |
| `project-standards-enforcer` | Implementar features, corregir bugs, refactorizar codigo (uso PROACTIVO)          |
| `ui-architect`               | Diseñar/implementar nueva UI: formularios, modales, dashboards, tabs, componentes |

**REGLAS DE USO**:

- **`branch-reviewer`**: Usar SIEMPRE que el usuario pida commitear, pushear, crear PR o revisar cambios. Incluye revision diferencial automatica (analisis de riesgo, blast radius y consistencia via git diff) antes de cada commit/push.
- **`supabase-query-optimizer`**: Usar SIEMPRE que el usuario pida optimizar queries, o al crear queries para nuevas tablas paginadas.
- **`project-standards-enforcer`**: Usar PROACTIVAMENTE para cualquier cambio de codigo (features, bugs, refactors, server actions). No esperar que el usuario lo pida.
- **`ui-architect`**: Usar PROACTIVAMENTE cuando el usuario necesite una nueva pantalla, componente visual, formulario, modal o rediseño de UI.

## Team Agents (Equipos de Agentes)

Se puede crear un **equipo de agentes paralelos** para analizar o resolver problemas complejos de manera coordinada. Usar cuando el problema tenga multiples aspectos independientes que se beneficien de analisis simultaneo.

**Cuando usarlo** (sin que el usuario lo pida explicitamente):

- Investigar un bug complejo desde varios angulos a la vez (ej: codigo + DB + logs)
- Analizar impacto de un cambio en multiples features/modulos
- Tareas con partes claramente separables que no tienen dependencias entre si

---

## Reglas Criticas - Guias Detalladas

Las siguientes reglas son **OBLIGATORIAS** y se aplican automaticamente. Las guias completas estan en `.claude/rules/`:

| Regla                                       | Archivo                             | Aplicacion                                        |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------- |
| NO `:any ni as any` - Inferir tipos         | @.claude/rules/typescript-types.md  | Siempre al escribir codigo TypeScript             |
| Server Actions (ubicacion, formato)         | @.claude/rules/server-actions.md    | Al crear/modificar server actions                 |
| Logger vs console.\* (REEMPLAZO AUTOMATICO) | @.claude/rules/logger.md            | Siempre - reemplazar console.\* cuando se detecte |
| React Query obligatorio                     | @.claude/rules/react-query.md       | Fetching en componentes cliente                   |
| Server Components First                     | @.claude/rules/server-components.md | Al crear componentes React                        |
| TabContent y Fallbacks                      | @.claude/rules/tab-content.md       | Al crear/modificar tabs                           |
| Sistema de Permisos                         | @.claude/rules/permissions.md       | Botones CRUD, nuevas tabs                         |
| DataTable con Prisma (+ migracion)          | @.claude/rules/datatable.md         | Tablas con paginacion (detecta sistema viejo)     |
| Filtros de DataTable (1 por columna)        | @.claude/rules/datatable-filters.md | Al crear/modificar filtros de tablas              |
| Estructura de Features                      | @.claude/rules/feature-structure.md | Al crear/modificar features                       |
| Legajo en listas de empleados               | Integrado en CLAUDE.md + agent      | Toda lista/filtro/selector de empleados           |
| Date pickers con escritura directa          | Integrado en CLAUDE.md              | Todo date picker individual (no date range)       |
| Forms con shadcn + zod (OBLIGATORIO)        | @.claude/rules/forms.md             | Todo formulario que recolecte datos del usuario   |
| Evitar useEffect innecesarios               | @.claude/rules/no-useeffect.md      | Siempre al escribir logica reactiva               |
| Revision Diferencial pre-commit             | Integrado en `branch-reviewer`      | Al commitear, pushear o crear PR                  |

Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

---

## Reglas de Oro (Siempre Activas)

### 1. Idioma del Codigo: Ingles

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
```

**La comunicacion con Claude (chat) debe ser en espanol.**

### 2. moment.js para Fechas

**SIEMPRE** usar moment.js para cualquier manejo de fechas, NO date-fns.

```typescript
import moment from 'moment';

// Formatear fecha
moment(date).format('DD/MM/YYYY');

// Comparar fechas
moment(date1).isBefore(date2);
```

### 3. NO Usar Dialogs Nativos del Navegador

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
```

### 4. No Crear Archivos .md

**NO** crear archivos markdown (.md) a menos que se solicite explicitamente.

### 5. NO Commit Automatico

**NUNCA** realizar commits automaticamente. Solo hacer commit cuando el usuario lo indique explicitamente (ej: "commitea", "hace commit", "push", etc.). No asumir que se debe commitear despues de completar una tarea.

### 6. NUNCA Co-Authored-By en Commits

**ESTRICTAMENTE PROHIBIDO** agregar `Co-Authored-By` en los mensajes de commit. JAMAS incluir referencias a IA, Claude, o cualquier co-autor automatico en los commits.

```bash
# ❌ PROHIBIDO - NUNCA hacer esto
git commit -m "feat: something

Co-Authored-By: Claude <noreply@anthropic.com>"

# ✅ CORRECTO - Solo el mensaje del commit
git commit -m "feat: something"
```

### 7. shadcn/ui MCP

**SIEMPRE** usar el MCP de shadcn para buscar componentes disponibles antes de implementar UI. Consultar ejemplos y documentacion de componentes con las herramientas del MCP antes de escribir codigo de UI.

### 8. Queries Eficientes

Analiza el contexto de uso para asegurar que las peticiones sean eficientes:

- **NO** realizar N+1 queries
- **NO** traer todos los datos y filtrar en el frontend
- **NO** traer catalogos completos para hacer lookups en el frontend
- **SIEMPRE** filtrar en la query (hook useQuery o server action)
- **SIEMPRE** resolver nombres/relaciones con Prisma `include`/`select` (nuevo estándar) o JOINs de Supabase (legacy), NO con lookups client-side
- **SIEMPRE** optimizar las peticiones

#### Migracion incremental Supabase → Prisma

Al encontrar código que usa `supabaseServer()`, `supabaseBrowser()` o `.from().select()` para fetching de datos: **preguntar al usuario si desea migrar esa implementación puntual a Prisma**. El cambio reemplaza solo el mecanismo de fetch sin alterar la lógica ni el funcionamiento.

```typescript
// ❌ INCORRECTO - Traer todo y filtrar en frontend
const allEmployees = await getAllEmployees();
const activeEmployees = allEmployees.filter((e) => e.is_active);

// ✅ CORRECTO - Filtrar en la query
const activeEmployees = await getActiveEmployees();

// ❌ INCORRECTO - Traer catalogo completo para resolver nombres en frontend
const allItems = await getAllItems();
// En la tabla: items.find(i => i.id === row.item)?.name
const itemName = allItems.find((i) => i.id === row.item)?.item_name;

// ✅ CORRECTO - Resolver con include/select en Prisma (nuevo estándar)
const data = await prisma.preparte.findMany({
  include: { service_items: { select: { id: true, item_name: true } } },
});
// En la tabla: row.service_items?.item_name (ya viene resuelto)

// ⚠️ LEGACY - Forma con Supabase (solo en código no migrado aún)
// const { data } = await supabase.from('preparte').select('*, service_items(id, item_name)');
```

### 5. Numero de Legajo en Listas de Empleados

**SIEMPRE** incluir el numero de legajo (`file_number`) en TODA superficie donde se muestre informacion de un empleado. Los usuarios identifican a los empleados por su legajo, NO por su nombre. El nombre puede repetirse entre personas; el legajo es unico.

#### Superficies obligatorias

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

#### Regla de Query — `file_number` DEBE viajar en los datos

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

#### Ejemplos de presentacion

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

#### Deteccion automatica y correccion incremental

Al leer cualquier archivo que muestre o filtre empleados, verificar si `file_number` esta presente en los datos y visible en la UI.

**Si se detecta una implementacion incorrecta** (empleados sin legajo en cualquier superficie): **PREGUNTAR al usuario si desea corregirlo antes de continuar** con la tarea principal. Esto permite ir saneando el sistema de forma incremental sin bloquear el trabajo actual.

Formato de pregunta sugerido:

> "Encontre que [componente/tabla/selector] muestra empleados sin el numero de legajo. ¿Queres que lo corrija ahora?"

Si el usuario dice que si → corregirlo primero, luego continuar con la tarea original.
Si el usuario dice que no → continuar con la tarea original sin tocar ese componente.

### 6. Date Pickers con Escritura Directa

**Todo campo de fecha individual (date picker, date input) DEBE permitir que el usuario escriba la fecha directamente**, ademas de usar el calendario. El comportamiento debe ser equivalente al input nativo `<input type="date">` de HTML, pero implementado con componentes de shadcn/ui.

#### Alcance

| Componente                          | Aplica esta regla                       |
| ----------------------------------- | --------------------------------------- |
| Date picker de fecha individual     | ✅ SI — debe permitir escritura directa |
| Date range picker (rango de fechas) | ❌ NO — queda como esta, no se modifica |

#### Implementacion correcta

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
```

#### Deteccion automatica y correccion incremental

Al leer cualquier archivo que contenga un date picker de fecha individual: verificar si el usuario puede escribir la fecha directamente o solo puede seleccionarla por calendario.

**Si se detecta un date picker que NO permite escritura directa** (y NO es un date range): **PREGUNTAR al usuario si desea corregirlo antes de continuar** con la tarea principal.

Formato de pregunta sugerido:

> "Encontre que [componente/formulario] tiene un date picker que no permite escribir la fecha directamente. ¿Queres que lo corrija ahora?"

Si el usuario dice que si → corregirlo primero, luego continuar con la tarea original.
Si el usuario dice que no → continuar con la tarea original sin tocar ese componente.

### 7. Evitar useEffect Innecesarios

**NUNCA** usar `useEffect` para reaccionar a cambios de estado que nosotros mismos provocamos. Mover la logica al punto de origen.

- Si se ejecuta al hacer click → mover al `onClick`
- Si se ejecuta al actualizar un registro → mover a la funcion de update/submit
- Si se ejecuta cuando cambia una prop → evaluar si se puede derivar directamente
- `useEffect` solo para: suscripciones, event listeners del DOM, sincronizacion con APIs externas

```typescript
// ❌ INCORRECTO - useEffect para reaccionar a cambio de estado propio
const [count, setCount] = useState(0);
const [message, setMessage] = useState('');
useEffect(() => {
  setMessage(`Count is ${count}`);
}, [count]);

// ✅ CORRECTO - Derivar directamente
const [count, setCount] = useState(0);
const message = `Count is ${count}`;

// ❌ INCORRECTO - useEffect para logica de click
useEffect(() => {
  if (selectedItem) {
    form.reset(prepareFormData(selectedItem));
  }
}, [selectedItem]);

// ✅ CORRECTO - Mover al handler
const handleSelectItem = (item) => {
  setSelectedItem(item);
  form.reset(prepareFormData(item));
};
```

---

## Estructura del Proyecto

```
src/
├── app/                    # Next.js pages (thin, import from features/)
│   └── server/             # Server Actions organized by HTTP verb
│       ├── GET/actions.ts
│       ├── POST/actions.ts
│       ├── UPDATE/actions.ts
│       └── DELETE/actions.ts
├── features/               # Business logic by domain
│   └── {Feature}/
│       ├── {Feature}Component.tsx    # Main component
│       ├── {SubTab}/                 # Each folder = a tab in UI
│       ├── components/
│       ├── hooks/                    # useQuery hooks
│       ├── actions/
│       ├── types/
│       └── utils/
├── components/ui/          # shadcn/ui components
├── lib/
│   ├── supabase/           # server.ts and browser.ts clients
│   ├── logger.ts           # Custom logger (use instead of console.*)
│   └── utils.ts            # Utilities
├── store/                  # Zustand stores
└── types/                  # Global types
```

---

## Referencias Rapidas

### Archivos Clave

- `src/features/Permissions/permissions-map.ts` - Mapa completo de permisos
- `src/features/Permissions/components/PermissionGuard.tsx` - Componente para proteger elementos
- `src/features/Permissions/hooks/usePermissions.ts` - Hook para verificar permisos
- `src/lib/logger.ts` - Implementacion del logger
- `src/shared/components/common/DataTable/DataTable.tsx` - Componente DataTable actual (Prisma)
- `src/shared/components/common/DataTable/DOCS.md` - Documentacion completa del DataTable
- `src/shared/components/data-table/base/data-table-server.tsx` - (DEPRECADO) Componente viejo de DataTable
- `src/app/server/GET/probando.ts` - (DEPRECADO) Funciones de fetching con Supabase

### Documentacion

- `docs/desarrollo/03-notas-desarrollo.md` - Notas de desarrollo y SQL ejecutado
- `docs/componentes/TabsManager.md` - Gestion de Suspense en tabs

### IDs de Modulos (Referencia)

```typescript
const MODULE_IDS = {
  dashboard: '91ed9ae4-6713-41ac-a87e-6b156e079948',
  empresa: 'e0478383-1287-4b5e-a727-985baf867173',
  empleados: '3c54a757-162c-4afc-8ea5-dca462f92e0c',
  equipos: '34d7f9e5-7c01-4def-9446-6b3f52d761a0',
  operaciones: '5563157e-fc3e-470f-b90b-dadd7cc38417',
  formularios: '6674268f-0d4f-581f-c91c-ebbe8dd49528',
  ayuda: '7785379f-1e5f-692f-da2d-fccf9ee5af39',
  documentacion: '4783f7df-3580-4f54-bf8f-6ef7f252d038',
  mantenimiento: '421e96da-5235-4857-bf81-e63336447f13',
  comercial: '92bfac14-dc5b-41be-b366-740bfbeaea13',
};
```
