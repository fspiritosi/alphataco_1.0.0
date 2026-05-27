# Solicitud de reapertura de tickets de Ayuda — Diseño

**Fecha**: 2026-05-27
**Scope**: Cross-repo (taskApp-backend + gh_gestion + taskApp-frontend)
**Estado**: Diseñado, pendiente de aprobación

---

## 1. Problema

Cuando un ticket de Ayuda llega a un estado terminal exitoso (`resolved`, `done` o `closed`), el sistema actual bloquea cualquier interacción adicional: no se pueden agregar comentarios y no hay forma de retomar el trabajo si el problema reaparece o el reporte fue cerrado prematuramente.

Hoy la única alternativa es abrir un ticket nuevo, lo que pierde el contexto del original, fragmenta el historial y obliga al agente a recargar contexto.

La feature agrega un flujo asincrónico de **solicitud de reapertura con justificación + evidencia**, donde:

- El reporter pide reabrir el ticket aportando un motivo escrito y, opcionalmente, capturas/PDFs.
- Un agente interno del workspace TaskApp revisa la solicitud y decide aprobar o denegar (denegación requiere motivo).
- La decisión se comunica de vuelta al reporter por los canales ya existentes (cambio de status + comentario auto-generado + email).

---

## 2. Decisiones tomadas en brainstorming

| # | Decisión | Valor |
|---|---|---|
| 1 | Modelo de datos | Campos en `tasks` para la solicitud activa + tabla `ticket_reopen_events` para historial |
| 2 | Estados elegibles | Solo `resolved`, `done`, `closed` (no `cancelled` ni `pending_planning`) |
| 3 | Quién puede solicitar | Solo el reporter original (`tasks.reporter_email`) |
| 4 | Estado post-aprobación | Vuelve a `in_progress` |
| 5 | Quién decide en TaskApp | Cualquier usuario interno del workspace |
| 6 | Re-solicitudes | Sin límite. Solo una activa a la vez |
| 7 | Motivo de denegación | Obligatorio (textarea requerida, mín 10 chars) |
| 8 | Adjuntos en la solicitud | Hasta 3 archivos, 10 MB c/u, imagen o PDF |
| 9 | Justificación textual | Obligatoria (mín 20 chars, máx 2000) |
| 10 | Visibilidad para el admin | Banner en detalle del ticket + email — sin badges en la lista |
| 11 | Feedback al reporter | Email + cambio de status visible + comentario auto-generado |
| 12 | Estrategia de implementación | Approach A: 3 PRs secuenciales (backend → gh_gestion + taskApp-frontend en paralelo) |

---

## 3. Arquitectura

```
┌──────────────────────────────────────────────────────────────────────┐
│ TaskApp Backend (Go) — fuente de verdad                              │
│                                                                      │
│  Migración nueva: 030_add_ticket_reopen_requests.sql                 │
│   • tasks +cols: reopen_status, reopen_reason, reopen_attachments,   │
│                  reopen_requested_at, reopen_requested_by,           │
│                  pre_reopen_status_id                                │
│   • tabla nueva: ticket_reopen_events (historial inmutable)          │
│                                                                      │
│  Endpoints públicos (X-Project-Key):                                 │
│   • POST /api/public/v1/tickets/{id}/request-reopen   NUEVO          │
│                                                                      │
│  Endpoints internos (JWT):                                           │
│   • POST /api/tasks/{id}/approve-reopen               NUEVO          │
│   • POST /api/tasks/{id}/deny-reopen                  NUEVO          │
│                                                                      │
│  Side effects: email + SSE en ambos hubs (internal + publicHub)      │
│  + comment auto-generado en /comments con author_email = null        │
└──────────────────────────────────────────────────────────────────────┘
       ▲ HTTP REST              ▲ HTTP REST              ▲ SSE
       │ X-Project-Key          │ JWT                    │ (ya existe)
       │                        │                        │
┌──────┴────────────┐  ┌────────┴──────────────┐  ┌──────┴────────────┐
│ gh_gestion        │  │ taskApp-frontend      │  │ Reporter ve       │
│ (lado reporter)   │  │ (lado admin)          │  │ actualización en  │
│                   │  │                       │  │ tiempo real       │
│ • Banner en       │  │ • Banner en           │  │                   │
│   TicketDetail-   │  │   ticket-detail.tsx   │  │                   │
│   Sheet           │  │ • ApproveReopen-      │  │                   │
│ • ReopenRequest-  │  │   Dialog +            │  │                   │
│   Dialog (form)   │  │   DenyReopenDialog    │  │                   │
│ • support-reopen  │  │ • use-reopen hooks    │  │                   │
│   server action   │  │                       │  │                   │
└───────────────────┘  └───────────────────────┘  └───────────────────┘
```

### Principios de separación

- **TaskApp = fuente de verdad**. Los campos `reopen_*` viven solo allá. Ni gh_gestion ni TaskApp-frontend persisten estado propio sobre solicitudes.
- **`ticket_reopen_events` es append-mostly**. Se inserta al solicitar, se actualiza solo una vez (al resolver), nunca se elimina. Sirve como log de auditoría y permite mostrar el historial completo si en el futuro se decide exponerlo.
- **El status del ticket NO cambia al solicitar**. El ticket sigue en `resolved`/`done`/`closed` durante toda la fase pendiente. La existencia de la solicitud se detecta por `reopen_status='pending'`. Esto evita romper queries y filtros existentes que asumen "is_completed = terminal".
- **Reuso máximo de infraestructura**. Storage (S3 + signed URLs), SSE (publicHub e internal hub), emails (servicio SMTP), unread tracking (`support_ticket_views`) y comentarios auto-generados ya existen y se reusan sin tocarlos.

---

## 4. Modelo de datos (taskApp-backend)

### 4.1 Extensión de `tasks`

Una sola migración `030_add_ticket_reopen_requests.sql` agrega:

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| `reopen_status` | `VARCHAR(20)` | YES | `NULL` | Solo toma `'pending'` o `NULL`. Cuando se resuelve, vuelve a `NULL` |
| `reopen_reason` | `TEXT` | YES | `NULL` | La justificación del reporter |
| `reopen_attachments` | `TEXT[]` | YES | `NULL` | Storage keys (no URLs) |
| `reopen_requested_at` | `TIMESTAMP` | YES | `NULL` | |
| `reopen_requested_by` | `VARCHAR(255)` | YES | `NULL` | Email del reporter |
| `pre_reopen_status_id` | `BIGINT` | YES | `NULL` | El status terminal previo. Sirve para auditoría / posible rollback futuro |

**Lectura del banner**: la presencia de `reopen_status='pending'` es suficiente — no hay JOIN.

**Resolución (approve o deny)**: las 6 columnas se vacían (`NULL`). El registro queda en `ticket_reopen_events`.

### 4.2 Tabla nueva `ticket_reopen_events`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `BIGSERIAL PRIMARY KEY` | |
| `task_id` | `BIGINT NOT NULL` | `REFERENCES tasks(id) ON DELETE CASCADE` |
| `requested_at` | `TIMESTAMP NOT NULL` | |
| `requested_by_email` | `VARCHAR(255) NOT NULL` | |
| `reason` | `TEXT NOT NULL` | |
| `attachments` | `TEXT[]` | Storage keys |
| `pre_reopen_status_id` | `BIGINT NOT NULL` | El status terminal al momento de pedir |
| `resolution` | `VARCHAR(20)` | `NULL` (pendiente) / `'approved'` / `'denied'` |
| `resolved_at` | `TIMESTAMP` | |
| `resolved_by_email` | `VARCHAR(255)` | Email del admin que decidió |
| `denial_reason` | `TEXT` | Obligatorio si `resolution='denied'` |

**Index**: `(task_id, requested_at DESC)`.

**CHECK constraints**:

- `resolution IN (NULL, 'approved', 'denied')`
- Si `resolution='denied'` → `denial_reason IS NOT NULL`
- Si `resolution IS NOT NULL` → `resolved_at IS NOT NULL AND resolved_by_email IS NOT NULL`

### 4.3 Invariante

Para todo ticket `T` debe cumplirse:

> `T.reopen_status='pending'` ⟺ existe exactamente un `ticket_reopen_events` con `task_id=T.id` y `resolution IS NULL`

Esto se garantiza desde código (los handlers son los únicos que modifican estos registros). No hay constraint nativo para esto en SQL.

---

## 5. API

### 5.1 Endpoint público — `POST /api/public/v1/tickets/{id}/request-reopen`

**Auth**: header `X-Project-Key`.

**Body**:
```json
{
  "reporter_email": "user@example.com",
  "reason": "El problema sigue ocurriendo cuando hago X...",
  "attachments": ["my-project/abc123.png", "my-project/def456.pdf"]
}
```

**Validaciones**:
- Ticket existe y `source='widget'` → 404 si no.
- `reporter_email` coincide con `tasks.reporter_email` → 403.
- `status.slug ∈ {resolved, done, closed}` → 409 con mensaje "No se puede reabrir un ticket en estado X".
- `reopen_status IS NULL` → 409 "Ya existe una solicitud activa".
- `len(reason) ∈ [20, 2000]` → 400.
- `len(attachments) <= 3` → 400.
- Cada key de `attachments` matchea `^{project-slug}/.*` → 400 (defensa contra path traversal).

**Efectos transaccionales**:
1. `INSERT INTO ticket_reopen_events(...)` con `resolution=NULL`.
2. `UPDATE tasks SET reopen_status='pending', reopen_reason=$1, reopen_attachments=$2, reopen_requested_at=NOW(), reopen_requested_by=$3, pre_reopen_status_id=status_id WHERE id=$4`.

**Side effects (post-commit, en goroutines)**:
- Email `reopen_requested.html` a todos los usuarios internos del workspace.
- `publicHub.Broadcast(reporter_email, {type:"ticket.updated", id})` para que gh_gestion refresque.
- `hub.Broadcast(workspaceID, {type:"task.updated", id})` para que TaskApp-frontend refresque.

**Response 200**: el ticket completo con campos `reopen_*` populados y URLs firmadas (15 min TTL) para `reopen_attachments`.

### 5.2 Endpoints internos

#### `POST /api/tasks/{id}/approve-reopen`

**Auth**: JWT existente.

**Body**: vacío.

**Validaciones**:
- Ticket existe → 404.
- `reopen_status='pending'` → 409 "No hay solicitud activa".
- Usuario pertenece al workspace del proyecto → 403.

**Efectos transaccionales**:
1. `UPDATE ticket_reopen_events SET resolution='approved', resolved_at=NOW(), resolved_by_email=$1 WHERE task_id=$2 AND resolution IS NULL`.
2. `UPDATE tasks SET status_id = (SELECT id FROM task_statuses WHERE slug='in_progress'), reopen_status=NULL, reopen_reason=NULL, reopen_attachments=NULL, reopen_requested_at=NULL, reopen_requested_by=NULL, pre_reopen_status_id=NULL, resolved_at=NULL, updated_at=NOW() WHERE id=$2`.
3. `INSERT INTO comments(task_id, author_id, author_email, body, is_internal) VALUES ($2, NULL, NULL, 'Solicitud de reapertura aprobada por {email_admin}. El ticket vuelve a En curso.', false)`.

**Side effects**:
- Email `reopen_resolved.html` al reporter con branch "aprobado".
- Broadcasts en ambos hubs.

#### `POST /api/tasks/{id}/deny-reopen`

**Body**:
```json
{ "denial_reason": "El comportamiento descrito es esperado por la nueva configuración Y." }
```

**Validaciones**:
- Mismas que approve +
- `len(denial_reason) ∈ [10, 1000]` → 400.

**Efectos transaccionales**:
1. `UPDATE ticket_reopen_events SET resolution='denied', resolved_at=NOW(), resolved_by_email=$1, denial_reason=$2 WHERE task_id=$3 AND resolution IS NULL`.
2. `UPDATE tasks SET reopen_status=NULL, reopen_reason=NULL, reopen_attachments=NULL, reopen_requested_at=NULL, reopen_requested_by=NULL, pre_reopen_status_id=NULL WHERE id=$3`. **No cambia `status_id`** — sigue en su estado terminal.
3. `INSERT INTO comments(...) VALUES (..., 'Solicitud de reapertura denegada por {email_admin}. Motivo: {denial_reason}', false)`.

**Side effects**: idénticos a approve pero con branch "denegado" en el email.

### 5.3 Reuso del endpoint de upload existente

El form de gh_gestion sube sus archivos al endpoint que ya existe:

```
POST /api/public/v1/upload         (sin ticket_id)
```

Los archivos quedan en `{project_slug}/{uuid}.{ext}`. **No se usa el subdirectorio `ticket-{id}/`** porque al momento del upload la solicitud todavía no existe como entidad. Las keys se asocian recién al llamar `request-reopen`, que las copia al campo `reopen_attachments`. Esto es consistente con el patrón actual de creación de tickets (donde también se sube antes de tener id).

---

## 6. UI en gh_gestion (lado reporter)

### 6.1 Componentes nuevos

#### `TicketReopenRequestBanner.tsx`

Ubicación: `src/features/Ayuda/components/detail/`.

Render condicional dentro de `TicketDetailSheet`, ubicado **debajo de `TicketApprovalBanner`** dentro del wrapper `<div className="shrink-0">`. Tres estados visuales:

**Estado A — "Elegible para solicitar"**
- Condición: `ticket.status.slug ∈ {resolved, done, closed}` Y `ticket.reopen_status == null` Y `currentUserEmail === ticket.reporter_email`.
- Visual: banner con fondo `bg-emerald-50 dark:bg-emerald-950/40` y borde inferior; icono `RotateCcw` color emerald; copy primario "¿Necesitás reabrir este ticket?"; copy secundario "Contanos por qué y agregá evidencia si la tenés." (text-xs muted); a la derecha botón "Solicitar reapertura" (variant default, size sm) que abre el dialog.

**Estado B — "Solicitud pendiente"**
- Condición: `ticket.reopen_status === 'pending'`.
- Visual: banner ámbar `bg-amber-50 dark:bg-amber-950/40`; icono `Clock`; copy primario "Solicitud de reapertura enviada"; copy secundario `{moment(ticket.reopen_requested_at).fromNow()}`; subcopy small "Un agente la va a revisar y te avisamos.". Sin botones.
- **No expone** la justificación ni los adjuntos al reporter en este banner — los recordatorios ya están en el form que él mismo envió, y aclutterar la UI no aporta.

**Estado C — Otros**
- Render `null`. No se muestra al approver (cuyo flujo es el `TicketApprovalBanner`) ni a tickets que no son del usuario.

**Mutua exclusión con `TicketApprovalBanner`**: ambos banners son condicionales y nunca se cumplen las condiciones simultáneas (uno requiere `status='valued'`, el otro requiere `status ∈ terminales`).

#### `TicketReopenRequestDialog.tsx`

Ubicación: `src/features/Ayuda/components/detail/`.

Estructura: `<Dialog>` de shadcn. Form con `react-hook-form` + Zod schema:

```ts
const schema = z.object({
  reason: z
    .string()
    .min(20, 'Contanos un poco más, mínimo 20 caracteres')
    .max(2000, 'Máximo 2000 caracteres'),
  attachments: z.array(z.instanceof(File)).max(3).optional().default([]),
});
```

Contenido del dialog:
- `DialogHeader` con title "Solicitar reapertura del ticket" + description "Explicale al equipo por qué necesitás retomar este ticket. Si tenés capturas o archivos que ayuden, sumalos.".
- `FormField` con `<Textarea>` de 5 rows, placeholder "Ej: el error volvió a aparecer al hacer X después de Y. Ya probé con Z y no se resuelve…", contador `{reason.length}/2000` debajo a la derecha (text-xs muted).
- `FormField` con `<TicketAttachmentInput files={...} onChange={...} />` — reusa el componente existente (3 archivos, 10 MB, imagen o PDF).
- `DialogFooter` con "Cancelar" (variant outline) + "Enviar solicitud" (variant default, disabled mientras `isSubmitting`).

Submit handler:
1. Si hay attachments: `Promise.all` de `uploadSupportTicketAttachment(formData)` (server action existente) para cada uno → array de `{key}`.
2. `requestSupportTicketReopen(ticketId, reason, keys)` (server action nuevo).
3. `queryClient.invalidateQueries({ queryKey: ticketDetailKey(ticketId) })` + `myTicketsKey`.
4. `toast.success('Solicitud enviada. Te avisamos cuando haya respuesta.')` + cierra dialog.

Error handling: si falla un upload individual, abortar el flujo, restaurar el form, mostrar toast con el mensaje del error. Si fallan keys parciales, no llamar a `request-reopen` (todo-o-nada para no dejar files huérfanos asociados).

### 6.2 Server action nuevo

Archivo: `src/features/Ayuda/actions/support-reopen.ts`.

```ts
'use server';
export async function requestSupportTicketReopen(
  ticketId: number,
  reason: string,
  attachmentKeys: string[]
): Promise<Ticket>
```

Lógica:
1. `getReporterEmail()` — si no hay usuario, throw.
2. `getSupportTicketById(ticketId)` — valida acceso. Si no es el reporter, throw "No sos el reporter de este ticket".
3. Validaciones defensivas en server (`status ∈ {resolved, done, closed}`, `reopen_status == null`, `reason.length ∈ [20,2000]`, `attachmentKeys.length ≤ 3`).
4. `taskAppClient.requestTicketReopen(ticketId, reporter.email, reason, attachmentKeys)`.
5. Mapea `TaskAppError` a mensajes user-friendly y los re-throwea.

### 6.3 Cliente y tipos

`src/shared/lib/taskapp/client.ts` — método nuevo:

```ts
requestTicketReopen: (ticketId, reporterEmail, reason, attachmentKeys) =>
  request<Ticket>(`/tickets/${ticketId}/request-reopen`, {
    method: 'POST',
    body: JSON.stringify({
      reporter_email: reporterEmail,
      reason,
      attachments: attachmentKeys,
    }),
  }),
```

`src/shared/lib/taskapp/types.ts` — extensión de `Ticket`:

```ts
export interface Ticket {
  // ... campos existentes ...
  reopen_status: 'pending' | null;
  reopen_reason: string | null;
  reopen_attachments: string[];          // URLs firmadas
  reopen_requested_at: string | null;
}
```

### 6.4 Hook React Query

`src/features/Ayuda/hooks/useRequestTicketReopen.ts`:

```ts
export function useRequestTicketReopen(ticketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; attachmentKeys: string[] }) =>
      requestSupportTicketReopen(ticketId, input.reason, input.attachmentKeys),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketDetailKey(ticketId) });
      queryClient.invalidateQueries({ queryKey: myTicketsKey });
    },
  });
}
```

### 6.5 Unread tracking — cómo se entera el reporter de la decisión

El sistema actual (`support_ticket_views`) ya cubre el feedback al reporter sin código nuevo:

- **Aprobado**: el status cambia de `resolved/done/closed` → `in_progress`, por lo que `hasStatusChange = true` → badge unread en sidebar y card.
- **Denegado**: el status sigue igual, pero el comentario auto-generado por el sistema dispara `hasNewAgentComment = true` (el `author_email` del comentario es el del admin, distinto del reporter) → badge unread en sidebar y card.

Al abrir el detail sheet, `useMarkTicketAsReadMutation` se dispara y limpia el unread. Mismo flujo que existe hoy.

---

## 7. UI en taskApp-frontend (lado admin)

### 7.1 Componente nuevo: `ReopenRequestBanner.tsx`

Ubicación: `src/components/ticket/reopen-request-banner.tsx`.

Render condicional dentro de `src/pages/ticket-detail.tsx`, **debajo del Reporter Info Card** (línea ~237) y **antes del título h1** (línea ~239). Se muestra solo si `ticket.reopen_status === 'pending'`.

Visual:
- Card con borde izquierdo grueso ámbar (`border-l-4 border-amber-500`), fondo `bg-amber-50/60 dark:bg-amber-950/40`, padding generoso.
- Header del card: icono `RotateCcw` ámbar + título "Solicitud de reapertura" + chip pequeño con `{moment(ticket.reopen_requested_at).fromNow()}` + email del reporter.
- Cuerpo: la `reason` en `whitespace-pre-wrap` dentro de un bloque tipo blockquote con max-height ~200px y scroll si excede.
- Galería de adjuntos (si `reopen_attachments.length > 0`): grid de 3 columnas con miniaturas — imágenes muestran preview cuadrado (aspect-square, object-cover), PDFs muestran icono `FileText` + nombre. Click abre en nueva pestaña (igual al `attachment-uploader.tsx` actual).
- Footer del card: dos botones alineados a la derecha — `Button variant="outline"` "Denegar" + `Button` "Aprobar reapertura".

Estados de loading: ambos botones muestran spinner `Loader2 className="animate-spin"` durante la mutación correspondiente, el otro queda disabled.

### 7.2 Dialogs

#### `ApproveReopenDialog.tsx`

Componente liviano. `AlertDialog` simple con:
- Title: "¿Aprobar la reapertura?"
- Description: "El ticket volverá al estado **En curso** y el reporter podrá retomarlo. Esta acción no se puede deshacer."
- Cancel + Action "Aprobar reapertura" (variant default).

Submit: llama `useApproveReopen().mutate(ticketId)`, en success: toast "Reapertura aprobada" + invalida queries.

#### `DenyReopenDialog.tsx`

`Dialog` con form `react-hook-form` + Zod:

```ts
const schema = z.object({
  denial_reason: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .max(1000, 'Máximo 1000 caracteres'),
});
```

Contenido:
- Title: "Denegar solicitud de reapertura"
- Description: "Explicale al reporter por qué no podemos reabrir este ticket. Tu mensaje quedará registrado como comentario público en el ticket."
- `<Textarea>` con placeholder "Ej: el ticket fue resuelto siguiendo el procedimiento definido en…", rows 5, contador `n/1000` debajo.
- Footer: Cancel + "Denegar" (variant destructive).

Submit: `useDenyReopen().mutate({ ticketId, denialReason })`, en success: toast + invalida queries.

### 7.3 Hooks

Archivo: `src/hooks/use-reopen.ts`.

```ts
export function useApproveReopen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveReopen(id),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['tickets', ticket.id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['comments', ticket.id] });
    },
  });
}

export function useDenyReopen() {
  // análogo, con argumento {id, denialReason}
}
```

### 7.4 API client

Archivo: `src/api/tickets.ts` — agregar:

```ts
export const approveReopen = (id: number) =>
  axios.post<Task>(`/api/tasks/${id}/approve-reopen`).then(r => r.data);

export const denyReopen = (id: number, denialReason: string) =>
  axios.post<Task>(`/api/tasks/${id}/deny-reopen`, { denial_reason: denialReason }).then(r => r.data);
```

### 7.5 Types

`src/types/index.ts` — extender `Task`:

```ts
export interface Task {
  // ... campos existentes ...
  reopen_status: 'pending' | null;
  reopen_reason: string | null;
  reopen_attachments: string[];
  reopen_requested_at: string | null;
}
```

### 7.6 Integración en `ticket-detail.tsx`

Diff conceptual (solo el lugar del insert):

```tsx
{/* Reporter Info Card ya existente */}
<ReporterInfoCard ticket={ticket} />

{/* NUEVO — banner condicional */}
<ReopenRequestBanner ticket={ticket} />

{/* Título h1 ya existente */}
<h1>{ticket.title}</h1>
```

No requiere cambios en sidebar, top bar, list view ni routing.

---

## 8. Notificaciones

### 8.1 Emails (taskApp-backend)

Dos templates nuevos en `internal/service/templates/`:

#### `reopen_requested.html`
- **Destinatarios**: todos los usuarios internos del workspace del proyecto del ticket.
- **Trigger**: post-commit de `request-reopen`.
- **Subject**: "Solicitud de reapertura — TKT-{id}: {title}"
- **Body**: highlight con el motivo del reporter, link al detalle del ticket en TaskApp, lista de adjuntos como links a URLs firmadas.

#### `reopen_resolved.html`
- **Destinatario**: el `reporter_email` del ticket.
- **Trigger**: post-commit de `approve-reopen` o `deny-reopen`.
- **Subject**: "Tu solicitud de reapertura — TKT-{id}" + sufijo "(aprobada)" o "(denegada)".
- **Body**: branch según resolution. Aprobada: "El ticket fue reabierto y volvió a En curso." + link al detalle. Denegada: "No pudimos reabrir el ticket. Motivo: {denial_reason}" + link al detalle.

Service: agregar a `internal/service/email.go` los métodos `NotifyReopenRequested(ctx, task, project, recipients)` y `NotifyReopenResolved(ctx, task, project, approved, denialReason)`. Ambos en goroutines (never block).

### 8.2 SSE / Realtime

Reuso del sistema existente sin cambios estructurales:

- `publicHub.Broadcast(reporter_email, {type:'ticket.updated', id})`:
  - Al `request-reopen` (raro pero consistente — el reporter ya tiene el ticket cargado y quizá quiere ver su propia request).
  - Al `approve-reopen` y `deny-reopen` (esto es lo que dispara el refresh del lado gh_gestion).
- `hub.Broadcast(workspaceID, {type:'task.updated', id})`:
  - En los 3 eventos. Esto dispara invalidación en `taskApp-frontend` para cualquier admin con la UI abierta en otro ticket o lista.

El proxy SSE de `gh_gestion` (`/api/taskapp/events`) ya reenvía estos eventos al cliente. Ningún cambio.

---

## 9. Casos edge / error handling

### 9.1 Race conditions

- **Dos reporters intentan crear la misma solicitud en paralelo** (no aplica — solo el reporter puede solicitar y es uno solo).
- **Dos admins resuelven en paralelo**: la transacción de approve/deny chequea `WHERE resolution IS NULL` en el `UPDATE` de `ticket_reopen_events`. El segundo update afecta 0 rows → handler retorna 409 "La solicitud ya fue resuelta".
- **Reporter solicita mientras admin está respondiendo el banner**: el banner del admin queda stale. Es ok: si intenta aprobar/denegar, el endpoint valida `reopen_status='pending'` y retorna 409 si ya cambió. La UI refresca por SSE.

### 9.2 Storage

- **Keys huérfanas si el upload tuvo éxito pero `request-reopen` falló**: aceptable (los uploads de creación de ticket tienen el mismo comportamiento hoy). Se puede limpiar con un job periódico futuro si se vuelve un problema; out of scope ahora.
- **URLs firmadas con TTL de 15 min**: cuando el admin abre el banner, las URLs se resuelven al cargar el ticket. Si deja la UI abierta más de 15 min, las miniaturas/links pueden expirar. Mitigación primaria: el SSE ya invalida la query del ticket cuando hay actividad. Mitigación secundaria: al click en una miniatura caduca, el navegador muestra error — el admin solo necesita recargar (el invalidate de SSE o cualquier acción que toque la query trae URLs frescas). No vamos a sumar `refetchInterval` solo por esto; el costo de un refresh manual ocasional es menor al de polling permanente.

### 9.3 Estados terminales no contemplados

- **`cancelled`** queda explícitamente fuera. El handler retorna 409 con mensaje "No se puede reabrir un ticket cancelado".
- **`pending_planning`** queda fuera (no es terminal).
- **`valued`** queda fuera (es el flujo de valorización, no de reapertura).

### 9.4 Reporter cambia de email después de solicitar

No aplica — el reporter es identificado por email almacenado en el ticket, no por user_id. Si cambia su email asociado en gh_gestion, deja de ser identificado como reporter para todos los efectos. Comportamiento heredado.

### 9.5 Comentario auto-generado y unread tracking

El comentario auto-generado tiene `author_email = null` (campo "Sistema"). En el cliente gh_gestion, `hasNewAgentComment` se calcula como `c.author_email !== reporter.email`. Como `null !== reporter.email`, dispara el unread. ✓

### 9.6 Eliminación de un ticket con historial de reopen

`ticket_reopen_events.task_id` tiene `ON DELETE CASCADE`. Si el ticket se elimina (raro en TaskApp), su historial también. Aceptable.

---

## 10. Plan de testing

### 10.1 taskApp-backend

- Unit tests del handler de `request-reopen`: validaciones (status terminal, reopen_status null, reporter_email match, reason length, attachments count, project_slug prefix de las keys), happy path, transaction rollback en falla.
- Unit tests de `approve-reopen` y `deny-reopen`: validaciones, happy path, doble resolución concurrente (mocking).
- Integration test: ciclo completo solicitar → aprobar → verificar status, comentario auto-generado, evento en `ticket_reopen_events`, side effects de email (mock) y SSE (mock).

### 10.2 gh_gestion

- E2E happy path (Cypress, similar a los tests existentes en `cypress/e2e/help/`):
  - Login como reporter.
  - Abrir un ticket `resolved`.
  - Banner verde visible.
  - Click "Solicitar reapertura" → dialog abre.
  - Fill reason + 1 adjunto.
  - Submit.
  - Banner cambia a ámbar "Solicitud enviada".
- Casos de validación del form: reason < 20 chars, reason > 2000 chars, archivos > 10 MB, > 3 archivos.

### 10.3 taskApp-frontend

- Tests manuales del flujo de aprobar y denegar:
  - Crear ticket via API, mover a `resolved`, solicitar reopen via API, abrir detalle del ticket en frontend → ver banner.
  - Aprobar → ticket pasa a `in_progress`, comentario auto-generado visible.
  - Volver a mover a `resolved`, solicitar reopen, denegar con motivo → ticket sigue en `resolved`, comentario auto-generado con motivo visible.

---

## 11. Out of scope

Cosas que **NO** hacemos en esta feature (futuro o nunca):

- **Cancelar solicitud propia desde gh_gestion** — el reporter no tiene botón para cancelar una solicitud pendiente. Si cambia de opinión, debe esperar la respuesta del admin.
- **Historial visible en la UI** — `ticket_reopen_events` existe para auditoría / posible reporting, pero no se expone como sección visual en ninguno de los 3 frontends.
- **Cooldown entre solicitudes denegadas** — el reporter puede volver a solicitar inmediatamente después de una denegación.
- **Aprobación parcial / dejar al admin elegir destino** — al aprobar, va siempre a `in_progress`. No hay dropdown.
- **Página dedicada `/admin/reopen-requests`** — el descubrimiento es por email + entrar al ticket. Si crece el volumen, evaluamos en una fase 2.
- **Edición de la justificación enviada** — la solicitud es inmutable una vez enviada.
- **Notificaciones in-app en TaskApp para admins** — solo email y banner al entrar al detalle.
- **Limpieza de keys huérfanas en S3** — aceptamos el cost esperado de orphan uploads. Si crece, sumamos job de limpieza después.

---

## 12. Implementación por fases (Approach A)

### PR-1: taskApp-backend (independiente, deployable solo)

- Migración `030_add_ticket_reopen_requests.sql`.
- Handler `PublicTicketHandler.RequestReopen` en `internal/handler/public_ticket.go`.
- Handlers `TaskHandler.ApproveReopen` y `TaskHandler.DenyReopen` en `internal/handler/task.go` (o file nuevo `internal/handler/reopen.go` si crece el `task.go`).
- Service methods en `email.go`: `NotifyReopenRequested`, `NotifyReopenResolved`.
- Templates: `internal/service/templates/reopen_requested.html`, `reopen_resolved.html`.
- Routes en `cmd/server/main.go`.
- Tests (unit + integration).

Es seguro mergear PR-1 sin las otras: los endpoints son aditivos, ningún consumidor los llama todavía.

### PR-2: gh_gestion (depende de PR-1 desplegado)

- Extensión de `taskapp/types.ts` (campos `reopen_*` en `Ticket`).
- Método `taskAppClient.requestTicketReopen` en `taskapp/client.ts`.
- Server action `support-reopen.ts` con `requestSupportTicketReopen`.
- Hook `useRequestTicketReopen.ts`.
- Componente `TicketReopenRequestBanner.tsx` con sus 3 estados.
- Componente `TicketReopenRequestDialog.tsx` con form.
- Integración en `TicketDetailSheet.tsx`.
- E2E test Cypress.

### PR-3: taskApp-frontend (depende de PR-1 desplegado, paralelizable con PR-2)

- Extensión de `Task` type con campos `reopen_*`.
- API client `approveReopen`, `denyReopen` en `api/tickets.ts`.
- Hooks `use-reopen.ts`.
- Componente `ReopenRequestBanner.tsx`.
- Componentes `ApproveReopenDialog.tsx` y `DenyReopenDialog.tsx`.
- Integración en `pages/ticket-detail.tsx`.
- Verificación manual.

---

## 13. Resumen de archivos

### taskApp-backend (Go)
```
db/migrations/030_add_ticket_reopen_requests.sql            NUEVO
internal/handler/public_ticket.go                           +RequestReopen
internal/handler/task.go (o reopen.go)                      +ApproveReopen, DenyReopen
internal/service/email.go                                   +NotifyReopen*
internal/service/templates/reopen_requested.html            NUEVO
internal/service/templates/reopen_resolved.html             NUEVO
cmd/server/main.go                                          +3 rutas
internal/model/task.go                                      +campos reopen_*
internal/model/ticket_reopen_event.go                       NUEVO
internal/repository/ticket_reopen_repository.go             NUEVO
```

### gh_gestion (TypeScript / Next.js)
```
src/shared/lib/taskapp/client.ts                                       +requestTicketReopen
src/shared/lib/taskapp/types.ts                                        +campos reopen_*
src/features/Ayuda/actions/support-reopen.ts                           NUEVO
src/features/Ayuda/hooks/useRequestTicketReopen.ts                     NUEVO
src/features/Ayuda/components/detail/TicketReopenRequestBanner.tsx     NUEVO
src/features/Ayuda/components/detail/TicketReopenRequestDialog.tsx     NUEVO
src/features/Ayuda/components/detail/TicketDetailSheet.tsx             +integración del banner
cypress/e2e/help/ticket-reopen.cy.ts                                   NUEVO
```

### taskApp-frontend (TypeScript / React)
```
src/types/index.ts                                          +campos reopen_*
src/api/tickets.ts                                          +approveReopen, denyReopen
src/hooks/use-reopen.ts                                     NUEVO
src/components/ticket/reopen-request-banner.tsx             NUEVO
src/components/ticket/approve-reopen-dialog.tsx             NUEVO
src/components/ticket/deny-reopen-dialog.tsx                NUEVO
src/pages/ticket-detail.tsx                                 +integración del banner
```
