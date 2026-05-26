# Centro de Ayuda V2 — Paridad funcional con `taskApp-widget`

**Date**: 2026-05-19
**Branch**: `feature/help-support-tickets`
**Status**: Draft (pendiente de revisión del usuario)
**Spec previa**: [`2026-05-13-help-support-tickets-design.md`](./2026-05-13-help-support-tickets-design.md)
**Referencia externa**: `../taskApp-widget/` (librería React standalone clonada en el directorio hermano)

## Contexto

La V1 del Centro de Ayuda (mergeada en `feature/help-support-tickets`, commit `32f3a116`) entrega:

- Form con **categoría + asunto + descripción**.
- Lista "Mis tickets" con cards (estado, categoría, fecha relativa).
- Cliente `taskAppClient` server-only con dos endpoints: `createTicket` y `listTicketsByReporter`.

El proyecto `taskApp-widget` (librería pensada para embeber en otros sistemas) implementa además: **prioridad**, **adjuntos al crear**, **vista de detalle**, **hilo de comentarios bidireccional**, **aprobación UAC** (User Acceptance Criteria) y **horas estimadas**. Esta V2 traslada todas esas capacidades a `gh_gestion` respetando las reglas y patrones del repo.

## Problema

El usuario hoy puede reportar un problema y ver su estado de alto nivel, pero **no puede**:

1. Indicar la **urgencia** del reporte.
2. Adjuntar capturas, PDFs o evidencia al crear el ticket.
3. **Ver la descripción completa**, los adjuntos ni los comentarios de un ticket existente.
4. **Responder** preguntas del equipo de soporte desde el sistema (hoy debe usar otro canal, lo que rompe el contexto).
5. **Aprobar o rechazar** una propuesta de valuación cuando un ticket llega al estado `valued` y el usuario figura como `approver_email`.
6. Saber cuántas horas estima el equipo para resolver su reporte.

## Solución (V2)

Llevar el Centro de Ayuda a paridad funcional con el widget, manteniendo el patrón **server-only TaskApp client + Server Actions + React Query**. No exponer la API key al navegador. La vista de detalle se abre como **Sheet lateral derecho** (shadcn `Sheet`), con estado en la URL (`?ticket={id}`) para que sea compartible y compatible con back/forward del browser.

## Decisiones tomadas durante el brainstorming

| Decisión | Valor |
| --- | --- |
| Paridad con widget | **Total** — prioridad, adjuntos, detalle, comentarios bidireccionales, aprobación UAC, horas estimadas |
| Cliente TaskApp | Sigue **server-only**. Se extiende con 7 endpoints nuevos. La key nunca llega al navegador |
| Comunicación UI → backend | **Server Actions** (`src/features/Ayuda/actions/`). Una action por operación pública |
| Autorización por action | Cada action lee el usuario logueado y valida que sea **reporter** o **approver** del ticket. Sin esta validación, cualquiera con un ID podría leer cualquier ticket |
| Vista de detalle | **Sheet lateral derecho** (shadcn `Sheet`, `side="right"`, `sm:max-w-2xl`). En mobile ocupa pantalla completa |
| Estado de detalle | En la **URL** vía `?ticket={id}` (lecturable, compartible, navegación funciona). Manejado con `useSearchParams` + `router.replace` (sin scroll) |
| Adjuntos | Hasta **3 archivos** por ticket nuevo. Imagen (`image/*`) o PDF. Tope **10 MB** por archivo. Subida vía Server Action que reenvía a TaskApp (la key nunca sale del server) |
| Prioridad | Select en el form con valores `low / medium / high / critical`. Default **`medium`**. Mapeo de color en `ticket-status.ts` (o nuevo `ticket-priority.ts`) |
| Comentarios | Solo se leen y crean **comentarios públicos** (filtran `is_internal === true`). UI estilo chat (propios a la derecha) |
| Refresh comentarios | **`refetchOnWindowFocus` + invalidate post-mutation**. Sin polling. Sin SSE |
| Refresh lista | `refetchOnWindowFocus` + botón discreto `RefreshCcw` en el header de "Mis tickets" |
| Aprobación UAC | Banner ámbar arriba del body del Sheet con botones **Aprobar / Rechazar**. Visible solo cuando `user.email === ticket.approver_email && ticket.status.slug === 'valued'` |
| `estimated_hours` | Solo lectura. Se muestra como badge con icono de reloj cuando viene presente |
| Estados nuevos | Agregar a `STATUS_BY_SLUG`: `planned`, `valued`, `pending_planning`. Mantener `open`, `in_progress`, `blocked`, `done`, `closed`, `cancelled` |
| Permisos | Se mantienen los actuales (`module="ayuda"`). La aprobación UAC se chequea por email, no por permiso |
| Loading state del Sheet | `Suspense` boundary con Skeleton dedicado para header + body. Comentarios cargan con `useQuery` independiente y muestran su propio skeleton |
| Empty / error states | Componentes dedicados con CTA. Sin `<div>Loading...</div>` plain |
| Notificaciones | Toast (`sonner`) en cada mutation. Notificaciones por email las gestiona TaskApp (fuera de scope) |

### Decisiones tomadas automáticamente (reglas del repo + best practices)

- **Forms**: `react-hook-form` + `zod` + `Form` de shadcn (regla `forms.md`). El schema del form se extiende con `priority` y un `attachments: z.array(z.instanceof(File)).max(3)`.
- **Fetching cliente**: `useQuery` + `useMutation` con server actions. Sin `useEffect`/`useState` para fetch (reglas `react-query.md`, `no-useeffect.md`).
- **Server actions** en `src/features/Ayuda/actions/`. Con `Logger` (scope `features/Ayuda/...`) y `try/catch`. Sin `console.*`. Tipos inferidos del retorno con `Awaited<ReturnType<typeof X>>`.
- **Server Components first**: la página `/dashboard/help` se mantiene como Server Component y pre-fetchea `initialTickets`. Cuando hay `?ticket={id}` en la URL, también pre-fetchea el ticket inicial server-side y lo pasa al Sheet como `initialData` del `useQuery`.
- **No `:any`**. Todos los tipos vienen de `Awaited<ReturnType<typeof X>>` o de `z.infer<typeof schema>`.
- **moment.js** para fechas relativas y absolutas.
- **Logger** en lugar de `console.*` (regla `logger.md`).
- **shadcn** para todos los componentes nuevos: `Sheet`, `Tooltip`, `Badge`, `Avatar`, `Textarea`, `Select`, `Tabs` (si hace falta), `AlertDialog` para confirmaciones.
- **No dialogs nativos** (regla `no-native-dialogs.md`). Confirmar rechazo UAC con `AlertDialog`.
- **moment** + `locale/es` para fechas (regla `moment-dates.md`).
- **Vercel React best practices**:
  - El Sheet se importa con `lazy()` / dynamic import para no aumentar el bundle inicial de la página cuando nadie lo abre.
  - `useQuery` con `initialData` para evitar fetch redundante al abrir el Sheet desde la lista.
  - `useCallback` en handlers que se pasan a hijos memoizados (cards de la lista).
  - Optimistic update para el envío de comentarios (aparece de inmediato; si falla, rollback + toast de error).
  - `Suspense` boundaries por sección (header del Sheet vs hilo de comentarios).

## Diseño detallado

### 0. Mapa de cambios respecto a V1

```
src/features/Ayuda/
├── actions/
│   ├── support-tickets.ts          ← AMPLIAR (crear con priority+attachments, getById)
│   ├── support-comments.ts         ← NUEVO (list + create)
│   ├── support-approval.ts         ← NUEVO (approve + reject)
│   ├── support-attachments.ts      ← NUEVO (uploadAttachment vía Server Action)
│   └── getReporterEmail.ts         ← sin cambios
│
├── components/
│   ├── HelpCenter.tsx              ← AMPLIAR (router + Sheet container)
│   ├── TicketForm.tsx              ← AMPLIAR (priority + attachments)
│   ├── TicketAttachmentInput.tsx   ← NUEVO (input + previews + remove)
│   ├── TicketPrioritySelect.tsx    ← NUEVO (select con iconos/colores)
│   ├── MyTicketsList.tsx           ← AMPLIAR (click → URL ?ticket=id, botón refresh)
│   ├── TicketCard.tsx              ← AMPLIAR (badge de prioridad)
│   ├── EmptyTicketsState.tsx       ← sin cambios
│   ├── detail/                     ← NUEVO sub-folder
│   │   ├── TicketDetailSheet.tsx          ← Sheet container (lazy)
│   │   ├── TicketDetailHeader.tsx         ← título + badges + meta
│   │   ├── TicketDetailBody.tsx           ← descripción + adjuntos + comentarios
│   │   ├── TicketAttachmentsList.tsx      ← chips downloadeables
│   │   ├── TicketCommentsThread.tsx       ← hilo de comentarios
│   │   ├── TicketCommentItem.tsx          ← burbuja individual
│   │   ├── TicketCommentComposer.tsx      ← input + submit (sticky bottom)
│   │   └── TicketApprovalBanner.tsx       ← banner con botones aprobar/rechazar
│   ├── TicketStatusBadge.tsx       ← AMPLIAR (estados nuevos)
│   ├── TicketCategoryBadge.tsx     ← sin cambios
│   └── TicketPriorityBadge.tsx     ← NUEVO
│
├── hooks/
│   ├── useMyTickets.ts             ← sin cambios
│   ├── useCreateTicket.ts          ← AMPLIAR (acepta priority + attachments)
│   ├── useTicketDetail.ts          ← NUEVO
│   ├── useTicketComments.ts        ← NUEVO
│   ├── useCreateComment.ts         ← NUEVO (con optimistic update)
│   ├── useApproveTicket.ts         ← NUEVO
│   ├── useRejectTicket.ts          ← NUEVO
│   └── useUploadAttachment.ts      ← NUEVO (usa la action de attachments)
│
├── constants/
│   ├── categories.ts               ← sin cambios
│   ├── ticket-status.ts            ← AMPLIAR (planned, valued, pending_planning)
│   └── ticket-priority.ts          ← NUEVO (4 niveles + colores + iconos)
│
├── fallback/
│   ├── MyTicketsListSkeleton.tsx   ← sin cambios
│   ├── TicketDetailSheetSkeleton.tsx       ← NUEVO
│   └── TicketCommentsThreadSkeleton.tsx    ← NUEVO
│
└── types/
    └── index.ts                    ← AMPLIAR (Comment, CreateCommentInput, AttachmentUploadResult)

src/shared/lib/taskapp/
├── client.ts                       ← AMPLIAR (getTicketById, listComments, createComment,
│                                              approveTicket, rejectTicket, uploadFile)
├── types.ts                        ← AMPLIAR (priority, estimated_hours, approver_email,
│                                              Comment, CreateCommentRequest)
└── errors.ts                       ← sin cambios

src/app/dashboard/help/
└── page.tsx                        ← AMPLIAR (lee ?ticket= y pre-fetchea ticket inicial)
```

### 1. Cliente TaskApp (`src/shared/lib/taskapp/`)

Endpoints REST nuevos a wrapear (todos contra `${TASKAPP_BASE_URL}/api/public/v1`):

| Método HTTP | Path | Wrapper | Notas |
| --- | --- | --- | --- |
| `GET` | `/tickets/{id}` | `getTicketById(id)` | Devuelve `Ticket` enriquecido |
| `GET` | `/tickets/{id}/comments` | `listComments(ticketId)` | Devuelve `Comment[]` |
| `POST` | `/tickets/{id}/comments` | `createComment(ticketId, body, authorEmail)` | Devuelve `Comment` creado |
| `POST` | `/tickets/{id}/approve` | `approveTicket(ticketId, approverEmail)` | Devuelve `Ticket` actualizado |
| `POST` | `/tickets/{id}/reject` | `rejectTicket(ticketId, approverEmail)` | Devuelve `Ticket` actualizado |
| `POST` | `/upload` | `uploadFile(file: Buffer, filename, contentType)` | Recibe binario, retorna `{ key }` |

El `createTicket` existente se extiende para aceptar `priority` y `attachments: string[]`.

Para `uploadFile`, el cliente recibe `Buffer` + filename + MIME (no `File` del browser, porque se ejecuta en server). El `Content-Type` del request es `multipart/form-data` armado con `FormData` de undici. Header `X-Project-Key` se mantiene.

### 2. Tipos (`src/shared/lib/taskapp/types.ts`)

```ts
export interface Ticket {
  id: number;
  title: string;
  description: string;
  status_id: number;
  status?: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';      // ← antes era string
  reporter_email: string | null;
  reporter_name: string | null;
  approver_email: string | null;                         // ← NUEVO
  estimated_hours: number | null;                        // ← NUEVO
  attachments: string[];                                  // URLs absolutas
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  labels: TicketLabel[];
}

export interface Comment {                                // ← NUEVO
  id: number;
  task_id: number;
  author_email: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  reporter_email: string;
  reporter_name?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';      // ← ahora requerido
  attachments?: string[];                                 // ← keys retornadas por /upload
}

export interface CreateCommentRequest {                   // ← NUEVO
  body: string;
  author_email: string;
}
```

### 3. Server Actions

Todas con `'use server'`, `Logger`, `try/catch`. Cada una valida la identidad del usuario antes de operar.

#### `actions/support-tickets.ts` (ampliar)

```ts
// Existente — se amplía
export async function createSupportTicket(input: CreateSupportTicketInput): Promise<Ticket>
// input ahora incluye: category, title, description, priority, attachmentKeys?: string[]

// NUEVA
export async function getSupportTicketById(id: number): Promise<Ticket | null>
// Valida: reporter_email === user.email || approver_email === user.email
// Si no autorizado → retorna null (no throw, para que el cliente muestre "no encontrado")
```

#### `actions/support-comments.ts` (nuevo)

```ts
export async function listSupportTicketComments(ticketId: number): Promise<Comment[]>
// Primero hace getSupportTicketById para verificar autorización. Si null → [].
// Filtra is_internal === true antes de retornar.

export async function createSupportTicketComment(input: {
  ticketId: number;
  body: string;
}): Promise<Comment>
// Verifica autorización vía getSupportTicketById.
// Toma author_email de getReporterEmail().
// Devuelve el Comment creado.
```

#### `actions/support-approval.ts` (nuevo)

```ts
export async function approveSupportTicket(ticketId: number): Promise<Ticket>
// Verifica: ticket.approver_email === user.email && ticket.status.slug === 'valued'
// Si no cumple → throw Error con mensaje claro.

export async function rejectSupportTicket(ticketId: number): Promise<Ticket>
// Misma validación que approve.
```

#### `actions/support-attachments.ts` (nuevo)

```ts
export async function uploadSupportTicketAttachment(formData: FormData): Promise<{ key: string }>
// Lee 'file' del FormData (debe ser File del cliente).
// Valida: size <= 10MB, type ∈ {image/*, application/pdf}, total acumulado <= 3 (validación en cliente; server valida individual).
// Convierte a Buffer y llama a taskAppClient.uploadFile.
// Retorna { key } para que el cliente acumule las keys y las mande con createTicket.
```

### 4. Hooks de React Query

Cada hook con `queryKey` estable y `staleTime` razonable. Mutaciones invalidan lo necesario.

| Hook | queryKey | staleTime | Invalida |
| --- | --- | --- | --- |
| `useMyTickets` (existente) | `['ayuda', 'my-support-tickets']` | 60s | — |
| `useTicketDetail(id)` | `['ayuda', 'ticket', id]` | 30s | — |
| `useTicketComments(id)` | `['ayuda', 'ticket', id, 'comments']` | 15s | — |
| `useCreateTicket` (ampliar) | mutation | — | `my-support-tickets` |
| `useCreateComment(ticketId)` | mutation con optimistic | — | `['ayuda', 'ticket', ticketId, 'comments']` |
| `useApproveTicket` | mutation | — | `['ayuda', 'ticket', id]`, `my-support-tickets` |
| `useRejectTicket` | mutation | — | `['ayuda', 'ticket', id]`, `my-support-tickets` |
| `useUploadAttachment` | mutation | — | — (las keys quedan en estado local del form) |

`useTicketDetail` recibe `initialData` opcional cuando el ticket viene desde la lista o desde SSR.

### 5. Componentes — UI / `frontend-design`

#### 5.1 Layout general (sin cambios sustanciales)

La página `/dashboard/help` mantiene el header con icono `HelpCircle` + título + subtítulo. El grid 2-col se mantiene (form izquierda, lista derecha). El Sheet de detalle se monta a nivel `HelpCenter` y se abre cuando hay `?ticket={id}` en la URL.

#### 5.2 `TicketForm` ampliado

- Mantiene `category`, `title`, `description`.
- **Agrega**: select de prioridad (`TicketPrioritySelect`) y bloque de adjuntos (`TicketAttachmentInput`).
- Layout vertical: categoría + prioridad en grid 2-col, asunto a fila completa, descripción a fila completa, adjuntos a fila completa, botón submit alineado a la derecha.
- Submit:
  1. Si hay archivos → llama `useUploadAttachment` por cada uno (Promise.all). Si alguno falla → toast de error, no envía el ticket.
  2. Con todas las keys retornadas → `useCreateTicket` con `attachments: [...keys]`.
  3. Toast de éxito + reset del form (mantiene categoría seleccionada).

#### 5.3 `TicketPrioritySelect`

Componente cliente con shadcn `Select`. Cada `SelectItem` tiene icono + label en español:

| Slug | Label | Color | Icono |
| --- | --- | --- | --- |
| `low` | Baja | slate-500 | `ArrowDown` |
| `medium` | Media | blue-500 | `Equal` (default) |
| `high` | Alta | amber-500 | `ArrowUp` |
| `critical` | Crítica | red-600 | `Flame` |

#### 5.4 `TicketAttachmentInput`

- Card interior con borde punteado.
- Texto: "Arrastrá hasta 3 archivos o hacé click — máximo 10 MB c/u (imagen o PDF)".
- Click abre `<input type="file" multiple accept="image/*,application/pdf">`.
- Lista de archivos seleccionados con: icono según tipo, nombre, tamaño formateado, botón `X` para quitar.
- Si supera 3 → solo toma los primeros 3 y muestra toast warning.
- No implementa drag-and-drop real en V2 (KISS, input nativo alcanza). El placeholder dice "Click para seleccionar" pero el wording deja la puerta abierta a drag más adelante.

#### 5.5 `MyTicketsList` ampliado

- Header con título + contador + botón `RefreshCcw` (refetch manual).
- Click en `TicketCard` → `router.replace('/dashboard/help?ticket={id}', { scroll: false })` para abrir el Sheet.
- Si la URL ya tiene `?ticket={id}` al renderizar, el Sheet se abre solo.

#### 5.6 `TicketCard` ampliado

- Agrega `TicketPriorityBadge` arriba a la derecha junto al de categoría.
- Sin cambios estructurales. Mantiene el border-l-4 por estado.

#### 5.7 `TicketDetailSheet` (nuevo, lazy-loaded)

Estructura:

```
<Sheet open={!!ticketId} onOpenChange={...}>
  <SheetContent side="right" className="sm:max-w-2xl flex flex-col p-0 gap-0">
    <Suspense fallback={<TicketDetailSheetSkeleton />}>
      <TicketDetailHeader ticket={ticket} />       {/* sticky-top */}
      <TicketApprovalBanner ticket={ticket} />     {/* renderiza solo si aplica */}
      <ScrollArea className="flex-1">
        <TicketDetailBody ticket={ticket} />
      </ScrollArea>
      <TicketCommentComposer ticketId={ticket.id} /> {/* sticky-bottom */}
    </Suspense>
  </SheetContent>
</Sheet>
```

- `Sheet` se abre con `open = !!ticketId`. Al cerrarse, `router.replace('/dashboard/help', { scroll: false })`.
- `Esc` y click en backdrop ya están manejados por shadcn `Sheet`.
- El sheet se importa con `dynamic(() => import('./detail/TicketDetailSheet'), { ssr: false })` para no inflar el bundle inicial.

#### 5.8 `TicketDetailHeader`

Layout vertical compacto:

- Línea 1: título (clean, sin prefijo de categoría) en `text-lg font-semibold`.
- Línea 2: row de badges → categoría, estado, prioridad, horas estimadas (si existe), fecha relativa.
- Sin botones de acción acá — los botones de aprobación viven en su propio banner.

#### 5.9 `TicketApprovalBanner`

- Visible solo si `ticket.approver_email === user.email && ticket.status?.slug === 'valued'`.
- Card ámbar con icono `ShieldCheck`, texto "Te pidieron aprobar esta valuación" + horas estimadas + 2 botones: **Aprobar** (variant default) y **Rechazar** (variant outline destructive).
- **Aprobar** → confirmación visual con toast + actualiza estado (sin AlertDialog porque es acción positiva).
- **Rechazar** → abre `AlertDialog` con confirmación "¿Confirmás que rechazás esta valuación?".

#### 5.10 `TicketDetailBody`

- Sección "Descripción" con `whitespace-pre-wrap` para respetar saltos.
- Sección "Adjuntos" si `ticket.attachments.length > 0`. Lista vertical de chips con icono + nombre (derivado de la URL) + link `target="_blank"`.
- Sección "Conversación" con `TicketCommentsThread`. Suspense boundary propio (no bloquea el resto del body).

#### 5.11 `TicketCommentsThread` + `TicketCommentItem`

- `useTicketComments(ticket.id)` con `Suspense` skeleton.
- Layout vertical, gap-3.
- Cada comentario: avatar circular con iniciales del email, burbuja con `body`, footer con autor y fecha.
- Burbujas del **usuario actual** alineadas a la derecha, fondo `bg-primary/10`. Otras a la izquierda, fondo `bg-muted`.
- Empty state con icono `MessageSquare` + texto "Todavía no hay respuestas. Sé el primero en escribir."

#### 5.12 `TicketCommentComposer`

- Sticky bottom dentro del SheetContent.
- `Textarea` de 1-3 rows que crece con el contenido (max-h-32) + botón `Send`.
- Submit con Cmd/Ctrl + Enter.
- Optimistic update: agrega un `Comment` "fantasma" al thread con `id: -Date.now()` y opacity baja; al confirmar, lo reemplaza con el real; si falla, lo quita + toast de error.

### 6. Estados y prioridad — constantes

#### `ticket-status.ts` (ampliar)

Agregar:

```ts
planned: {
  label: 'Planificado',
  badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  borderClass: 'border-l-violet-500',
},
valued: {
  label: 'Valuado',
  badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  borderClass: 'border-l-orange-500',
},
pending_planning: {
  label: 'Pendiente de planificación',
  badgeClass: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
  borderClass: 'border-l-fuchsia-500',
},
```

(`open`, `in_progress`, `blocked`, `done`, `closed`, `cancelled` ya existen).

#### `ticket-priority.ts` (nuevo)

```ts
export type PrioritySlug = 'low' | 'medium' | 'high' | 'critical';

export interface PriorityDef {
  slug: PrioritySlug;
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
}

export const PRIORITY_BY_SLUG: Record<PrioritySlug, PriorityDef> = {
  low: {
    slug: 'low',
    label: 'Baja',
    icon: ArrowDown,
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    iconClass: 'text-slate-500',
  },
  medium: {
    slug: 'medium',
    label: 'Media',
    icon: Equal,
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    iconClass: 'text-blue-500',
  },
  high: {
    slug: 'high',
    label: 'Alta',
    icon: ArrowUp,
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    iconClass: 'text-amber-500',
  },
  critical: {
    slug: 'critical',
    label: 'Crítica',
    icon: Flame,
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    iconClass: 'text-red-600',
  },
};
```

### 7. Página `/dashboard/help/page.tsx`

```tsx
type SearchParams = { ticket?: string };

export default async function HelpPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const ticketId = params.ticket ? Number(params.ticket) : null;

  const [initialTickets, initialTicket] = await Promise.all([
    getMySupportTickets(),
    ticketId ? getSupportTicketById(ticketId) : Promise.resolve(null),
  ]);

  return <HelpCenter initialTickets={initialTickets} initialTicket={initialTicket} initialTicketId={ticketId} />;
}
```

El cliente decide si abrir el Sheet a partir de `initialTicketId` y consume `initialTicket` como `initialData` del `useQuery`.

### 8. Validaciones de seguridad (autorización)

| Action | Regla |
| --- | --- |
| `getSupportTicketById(id)` | `user.email === ticket.reporter_email \|\| user.email === ticket.approver_email` |
| `listSupportTicketComments(ticketId)` | Pasa por `getSupportTicketById` primero |
| `createSupportTicketComment` | Pasa por `getSupportTicketById` primero |
| `approveSupportTicket` | Además: `ticket.status.slug === 'valued'` y `user.email === ticket.approver_email` |
| `rejectSupportTicket` | Idem `approve` |
| `uploadSupportTicketAttachment` | `user` logueado. Validar `file.size <= 10MB` y `file.type ∈ {image/*, application/pdf}` |

Sin estas validaciones, cualquier usuario con un ID podría leer tickets ajenos. El widget no las tiene porque corre standalone, pero acá son obligatorias.

### 9. Variables de entorno

Sin cambios — se reusan las V1:

- `TASKAPP_BASE_URL`
- `TASKAPP_PROJECT_API_KEY`

### 10. Estados de error y edge cases

| Caso | Comportamiento |
| --- | --- |
| Usuario no logueado | Las actions retornan `null`/throw `"No hay usuario autenticado"`. La página ya está detrás del layout autenticado, así que no debería pasar. |
| Ticket no encontrado o no autorizado | `getSupportTicketById` retorna `null`. El Sheet muestra estado "Ticket no encontrado o sin acceso" con CTA "Volver". |
| Comentario falla al enviar | Optimistic comment se quita. Toast de error con mensaje del backend. |
| Upload falla | Toast de error específico. El form NO se envía si algún archivo falló. |
| Aprobación no autorizada | El banner ni siquiera se renderiza. Si el usuario llama directo a la action (raro), la action throwea. |
| Estado inesperado de TaskApp (slug nuevo) | `statusFor(slug, fallbackName)` ya maneja el fallback genérico. Sin error. |
| `TASKAPP_BASE_URL` o key faltante | `TaskAppError(code: 'config')` capturado por la action y traducido a toast "El servicio de soporte no está configurado". |

### 11. Testing (Cypress E2E)

Ampliar `cypress/e2e/help/help-page.cy.ts` con:

1. **Crear ticket con prioridad y adjuntos**: subir 1 imagen, mandar, verificar que aparezca en la lista con badge de prioridad.
2. **Abrir detalle**: click en una card → URL cambia a `?ticket=N` → Sheet visible → header con badges → descripción visible.
3. **Comentar**: escribir + enviar → el comentario aparece optimisticamente y queda persistido tras reload.
4. **Cerrar Sheet por Esc** y verificar que `?ticket=` desaparece de la URL.
5. **(Opcional) Aprobación UAC**: requiere fixture con `approver_email === user.email && status === 'valued'`. Si TaskApp permite seedear, agregar test; si no, dejar como TODO.

## Fuera de alcance / V3+

- **Edición de tickets** desde gh_gestion (cambiar título, descripción) — no expuesto por la API pública.
- **Cierre desde el cliente** — solo soporte cierra tickets.
- **Drag-and-drop real de archivos** — input nativo alcanza para V2.
- **Notificaciones push** (toast cuando llega un comentario nuevo de soporte) — requeriría SSE o polling, ambos descartados por costo.
- **Comentarios internos** (`is_internal === true`) — sin caso de uso en gh_gestion.
- **Filtros y búsqueda en "Mis tickets"** — la lista es chica, no hace falta.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| TaskApp cambia el shape del endpoint `/upload` | Wrapper centralizado en `client.ts`. Cambio se hace en un solo punto. |
| Usuario sube archivo > 10MB que el server rechaza | Validar tamaño client-side antes del upload + validar también en la Server Action. |
| Race condition al subir múltiples archivos y abandonar la pestaña | El upload no es atómico, pero si el usuario abandona, las keys huérfanas en TaskApp quedan sin asociar. Lo aceptamos: no rompen nada. |
| Bundle inflado por el Sheet de detalle | `dynamic(import)` con `ssr: false` para que solo se cargue al abrir. |
| Optimistic comment confunde si falla | Rollback + toast claro. |
| El usuario lee tickets ajenos manipulando la URL | Action `getSupportTicketById` valida `reporter_email` o `approver_email` antes de retornar. |

## Open questions

Ninguna pendiente — todas las decisiones fueron resueltas en el brainstorming.

## Próximos pasos

1. Revisión de esta spec por el usuario.
2. Si aprobada: invocar `superpowers:writing-plans` para generar el plan de implementación detallado (orden de tareas, dependencias, tests por paso).
3. Implementación incremental en commits separados (un commit por capa: client → actions → hooks → componentes → página) — pero **sin commitear automáticamente**, esperando el OK del usuario en cada paso.
