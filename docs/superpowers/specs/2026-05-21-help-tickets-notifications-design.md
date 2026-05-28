# Notificaciones de tickets de Ayuda — Diseño

**Fecha**: 2026-05-21
**Scope**: Cross-repo (taskApp-backend + gh_gestion)
**Estado**: Diseñado, pendiente de aprobación

---

## 1. Problema

Cuando un usuario de gh_gestion reporta un ticket en el módulo de Ayuda, después no tiene forma visual de saber si:

- El estado de su ticket cambió (`open → in_progress → resolved`).
- Un agente le respondió con un comentario.

Hoy tiene que entrar a `/dashboard/help` y abrir cada ticket para enterarse. La feature agrega indicadores visuales en dos lugares:

- **Sidebar**: badge con número en el ítem "Ayuda" mostrando cantidad de tickets con novedades sin leer.
- **TicketCard**: dot pulsante + microcopy ("Nueva respuesta" / "Cambio de estado") en cada card que tenga novedad.

---

## 2. Decisiones tomadas en brainstorming

| # | Decisión | Valor |
|---|---|---|
| 1 | Eventos que cuentan como novedad | Cambios de estado del ticket + comentarios nuevos del agente (`author_email !== reporter_email`) |
| 2 | Persistencia del "yo lo vi" | Tabla nueva `support_ticket_views` en Supabase de gh_gestion |
| 3 | Cuándo se marca como leído | Al abrir el TicketDetailSheet |
| 4 | Refresh strategy | Refetch on focus + on navigation + **SSE público** (sin polling) |
| 5 | Scope de tickets | Solo donde el usuario es `reporter_email` |
| 6 | Visual sidebar | Badge con número (`9+` si > 9) |
| 7 | Visual card | Dot pulsante en esquina + microcopy contextual |

---

## 3. Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│ TaskApp Backend (Go)                                            │
│  • POST /public/v1/tickets, /comments, ...  (existente)         │
│  • POST /public/v1/tickets/{id}/approve, /reject  (NUEVOS)      │
│  • GET  /public/v1/events?reporter_email=  (SSE público NUEVO)  │
│  • PublicHub indexado por reporter_email  (NUEVO)               │
└─────────────────────────────────────────────────────────────────┘
                ▲ HTTP REST           ▲ SSE stream (X-Project-Key)
                │                     │
┌─────────────────────────────────────────────────────────────────┐
│ gh_gestion (Next.js)                                            │
│                                                                 │
│  Capa server (Server Actions + API Route):                      │
│   • getMyTicketsWithUnread()                                    │
│   • markSupportTicketAsRead(ticketId)                           │
│   • app/api/taskapp/events/route.ts  (proxy SSE)                │
│                                                                 │
│  Supabase tabla: support_ticket_views                           │
│   • PK (user_id, taskapp_ticket_id)                             │
│   • last_seen_at, last_seen_status_id                           │
│                                                                 │
│  Capa cliente (React Query + provider SSE):                     │
│   • useMyTicketsWithUnread / useUnreadSupportTicketsCount       │
│   • useMarkTicketAsReadMutation                                 │
│   • <SupportTicketsRealtimeProvider /> en dashboard layout      │
│                                                                 │
│  UI:                                                            │
│   • SidebarLink → muestra badge si count > 0                    │
│   • TicketCard → dot pulsante + microcopy si unread             │
│   • TicketDetailSheet → dispara markAsRead al abrir             │
└─────────────────────────────────────────────────────────────────┘
```

### Principios de separación

- **TaskApp = fuente de verdad del contenido**. No replicamos título, descripción, comments en Supabase.
- **Supabase = "yo lo vi"**. Tabla pequeña, una fila por (user, ticket). Si Supabase se cae, los tickets siguen funcionando (sin sistema de unread).
- **SSE = trigger de refresh**. No transporta datos del ticket — solo dice "el ticket X cambió, refrescá". El refetch va por REST.
- **Capa server gh_gestion = orchestrator**. Hace el join TaskApp + Supabase. El browser nunca habla directo con TaskApp.

### Proxy SSE: por qué

El browser NO se conecta directo a TaskApp porque:

1. `X-Project-Key` quedaría expuesto. EventSource no soporta custom headers.
2. CORS: TaskApp tendría que permitir origin de gh_gestion.
3. Acoplamiento: cambios en URL/formato de TaskApp obligarían a tocar cliente.

Una API route en gh_gestion (`app/api/taskapp/events/route.ts`) recibe la conexión del browser (con cookie de sesión) y abre un fetch streaming hacia TaskApp con `X-Project-Key` server-side, retransmitiendo el body. ~50 LOC.

---

## 4. Backend TaskApp — cambios

### 4.1 PublicHub paralelo

Archivo nuevo: `internal/realtime/public_hub.go`

```go
type PublicHub struct {
    mu        sync.RWMutex
    clients   map[string]map[*Client]struct{} // key: reporter_email
}

func NewPublicHub() *PublicHub
func (h *PublicHub) Subscribe(reporterEmail string) *Client
func (h *PublicHub) Unsubscribe(c *Client)
func (h *PublicHub) Broadcast(reporterEmail string, event Event)
```

- Estructura idéntica al `Hub` interno (`internal/realtime/hub.go`) pero indexado por `reporter_email` string (no por `workspaceID` int64).
- Buffer de 64 eventos por cliente, heartbeat cada 30s — mismas tuning.
- Si no hay clientes suscritos al email, `Broadcast` es no-op (no acumula).

### 4.2 Bridge desde services

En `internal/service/task.go`, en cada lugar donde hoy se hace `s.hub.Broadcast(workspaceID, ...)`:

```go
// además del broadcast interno existente:
if task.ReporterEmail != nil && *task.ReporterEmail != "" {
    s.publicHub.Broadcast(*task.ReporterEmail, Event{
        Type:        "ticket.updated",
        ID:          task.ID,
        WorkspaceID: task.WorkspaceID,
    })
}
```

Eventos a emitir al PublicHub:

| Trigger | Evento al PublicHub |
|---|---|
| `service/task.go` Update / status change | `ticket.updated` (con ticket id) |
| `service/comment.go` Create | `comment.created` (con ticket id) |
| `service/task.go` Approve | `ticket.updated` |
| `service/task.go` Reject | `ticket.updated` |

`ticket.created` NO se emite (el reporter ya tiene el dato; lo creó él).

### 4.3 Endpoint SSE público

Archivo nuevo: `internal/handler/public_sse.go`

Ruta a registrar en `cmd/server/main.go` bajo el grupo público:

```
GET /api/public/v1/events?reporter_email=<email>
```

- Middleware: `apikey.RequireProjectKey` (existente) — valida `X-Project-Key`.
- Validación inline: `reporter_email` required, sino 400.
- Headers de respuesta:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no` (para Nginx)
- Loop:
  - Subscribe al PublicHub con el email.
  - Emitir evento inicial `{"type":"connected"}`.
  - Por cada evento del canal del client: serializar JSON y escribir como SSE `data: {...}\n\n`.
  - Heartbeat `:keepalive\n\n` cada 30s.
  - On request context done (cliente desconectó): unsubscribe + return.

Estructura del payload de eventos:

```json
{
  "type": "ticket.updated",
  "ticket_id": 123
}
```

```json
{
  "type": "comment.created",
  "ticket_id": 123
}
```

### 4.4 Endpoints faltantes (paralelo)

El frontend de gh_gestion ya invoca estos pero el backend no los tiene. Se cierran en la misma iteración:

- `POST /api/public/v1/tickets/{id}/approve` — body `{ approver_email }`. Updatea status del ticket a `approved`.
- `POST /api/public/v1/tickets/{id}/reject` — body `{ approver_email }`. Updatea status a `rejected`.

Ambos disparan `publicHub.Broadcast(reporter_email, ticket.updated)` al final.

### 4.5 Wiring en main

`cmd/server/main.go`:

```go
publicHub := realtime.NewPublicHub()
taskService := service.NewTaskService(..., hub, publicHub)
commentService := service.NewCommentService(..., hub, publicHub)
publicSSEHandler := handler.NewPublicSSEHandler(publicHub)

mux.Handle("GET /api/public/v1/events", apikey.RequireProjectKey(publicSSEHandler.Stream))
mux.Handle("POST /api/public/v1/tickets/{id}/approve", apikey.RequireProjectKey(publicTicketHandler.Approve))
mux.Handle("POST /api/public/v1/tickets/{id}/reject", apikey.RequireProjectKey(publicTicketHandler.Reject))
```

---

## 5. Schema Supabase + Prisma

### 5.1 Migración Prisma

Archivo: `prisma/migrations/<timestamp>_create_support_ticket_views/migration.sql`

```sql
CREATE TABLE support_ticket_views (
  user_id              uuid        NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  taskapp_ticket_id    bigint      NOT NULL,
  last_seen_at         timestamptz NOT NULL DEFAULT now(),
  last_seen_status_id  bigint      NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, taskapp_ticket_id)
);

CREATE INDEX idx_support_ticket_views_user_id
  ON support_ticket_views (user_id);

-- Trigger para updated_at automático (si el proyecto tiene helper, reusarlo)
```

Notas:

- `taskapp_ticket_id` es `bigint` porque el `id` en TaskApp Go es `int64`.
- No hay FK a una tabla local de tickets (el ticket vive en TaskApp). Es una "FK lógica" pero no enforced.
- `last_seen_status_id` es `bigint NOT NULL` — el status del ticket al momento de marcarlo visto. Sirve para detectar cambios de estado.
- **Importante**: la columna es NOT NULL, pero al hacer el JOIN izquierdo desde tickets de TaskApp, un ticket SIN registro en esta tabla genera un view "ausente" — el server action lo trata como `lastSeenStatusId = null` en memoria (la fila simplemente no existe en la BD). Sección 6.1 explica cómo se maneja ese caso.
- Cascade en delete de `profile`: si se borra el usuario, se borran sus views.
- **Verificar antes de migrar**: confirmar nombre exacto del modelo de perfil de usuario en `prisma/schema.prisma` (puede ser `profile`, `profiles`, `User`, etc.). El SQL y el modelo Prisma deben referenciar el nombre real.

### 5.2 Modelo Prisma

En `prisma/schema.prisma`:

```prisma
model support_ticket_views {
  user_id             String   @db.Uuid
  taskapp_ticket_id   BigInt
  last_seen_at        DateTime @default(now()) @db.Timestamptz(6)
  last_seen_status_id BigInt
  created_at          DateTime @default(now()) @db.Timestamptz(6)
  updated_at          DateTime @updatedAt @db.Timestamptz(6)

  profile             profile  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@id([user_id, taskapp_ticket_id])
  @@index([user_id])
}
```

Agregar relación reversa en `model profile`:

```prisma
support_ticket_views support_ticket_views[]
```

---

## 6. Server actions en gh_gestion

Ubicación: `src/features/Ayuda/actions/support-tickets.ts` (existente, agregar funciones).

### 6.1 `getMyTicketsWithUnread()`

Reemplaza al uso actual de `getMySupportTickets()` en `HelpCenter.tsx` y en el sidebar.

```typescript
'use server';

export type TicketWithUnread = Ticket & {
  unread: {
    hasStatusChange: boolean;
    hasNewAgentComment: boolean;
    lastSeenAt: string | null;
  };
};

export async function getMyTicketsWithUnread(): Promise<TicketWithUnread[]>
```

Pseudocódigo:

```
1. const profile = await getCurrentProfile()       // perfil de gh
2. const reporter = await getReporterEmail()       // existente
3. const tickets = await taskApp.listTicketsByReporter(reporter)
4. const views = await prisma.support_ticket_views.findMany({
     where: { user_id: profile.id, taskapp_ticket_id: { in: tickets.map(t => BigInt(t.id)) } }
   })
5. const viewsMap = new Map(views.map(v => [Number(v.taskapp_ticket_id), v]))

6. // Identificar tickets que requieren fetch de comments
   const ticketsToCheckComments = tickets.filter(t => {
     const view = viewsMap.get(t.id)
     if (!view) return true                              // nunca visto → puede haber comments nuevos
     return new Date(t.updated_at) > view.last_seen_at   // movimiento desde la última vez
   })

7. // Fetch comments en paralelo (Promise.all) — solo para los que se movieron
   const commentsByTicket = new Map<number, Comment[]>()
   await Promise.all(ticketsToCheckComments.map(async (t) => {
     const comments = await taskApp.listComments(t.id)
     commentsByTicket.set(t.id, comments)
   }))

8. // Calcular unread por ticket
   return tickets.map(t => {
     const view = viewsMap.get(t.id)
     const lastSeenAt = view?.last_seen_at ?? null
     const lastSeenStatusId = view?.last_seen_status_id ?? null

     const hasStatusChange = lastSeenStatusId === null
       ? false   // nunca visto: no marcamos como "cambió" porque no hay snapshot previo
       : BigInt(t.status_id) !== lastSeenStatusId

     const comments = commentsByTicket.get(t.id) ?? []
     const hasNewAgentComment = comments.some(c =>
       c.author_email !== reporter &&
       (lastSeenAt === null || new Date(c.created_at) > lastSeenAt)
     )

     return { ...t, unread: { hasStatusChange, hasNewAgentComment, lastSeenAt: lastSeenAt?.toISOString() ?? null } }
   })
```

Observaciones clave:

- **Tickets sin view**: `lastSeenStatusId = null` → `hasStatusChange = false`. Esto evita marcar todo como "cambio de estado" en tickets nunca abiertos por el reporter. Sin embargo, `hasNewAgentComment` SÍ puede ser true si hay comments del agente (pendiente de leer desde el inicio).
- **N+1 acotado**: solo fetcheamos comments para tickets que efectivamente se movieron (`updated_at > last_seen_at`). En la práctica son pocos.
- **Race condition mínima**: si llega un comment nuevo mientras se calcula, el próximo refetch lo detecta. No es crítico.
- **Logging**: usar `Logger` (`@/lib/logger`) con scope `features/Ayuda/notifications`.

### 6.2 `markSupportTicketAsRead(taskappTicketId: number)`

Nueva función. Llamada desde el TicketDetailSheet al abrir.

```typescript
'use server';

export async function markSupportTicketAsRead(taskappTicketId: number): Promise<void>
```

Pseudocódigo:

```
1. const profile = await getCurrentProfile()
2. const ticket = await taskApp.getTicketById(taskappTicketId)
   // necesitamos el status_id actual para guardarlo como last_seen_status_id

3. await prisma.support_ticket_views.upsert({
     where: { user_id_taskapp_ticket_id: { user_id: profile.id, taskapp_ticket_id: BigInt(taskappTicketId) } },
     create: {
       user_id: profile.id,
       taskapp_ticket_id: BigInt(taskappTicketId),
       last_seen_at: new Date(),
       last_seen_status_id: BigInt(ticket.status_id),
     },
     update: {
       last_seen_at: new Date(),
       last_seen_status_id: BigInt(ticket.status_id),
     },
   })

4. revalidatePath('/dashboard/help')   // por las dudas, fuerza re-render del server component
```

### 6.3 Extensión de `createSupportTicket()`

La función ya existe. Después del POST exitoso a TaskApp, agregar:

```typescript
const ticket = await taskApp.createTicket(input)

await prisma.support_ticket_views.create({
  data: {
    user_id: profile.id,
    taskapp_ticket_id: BigInt(ticket.id),
    last_seen_at: new Date(),
    last_seen_status_id: BigInt(ticket.status_id),
  },
})

return ticket
```

Si el `create` de la view falla, log warning pero NO romper el flujo (el ticket en TaskApp ya existe). Degradación: el ticket aparecerá como "no leído" hasta que el usuario lo abra.

---

## 7. API route SSE proxy

Archivo nuevo: `src/app/api/taskapp/events/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { getReporterEmail } from '@/features/Ayuda/actions/getReporterEmail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const reporter = await getReporterEmail()
  if (!reporter) return new Response('Unauthorized', { status: 401 })

  const baseUrl = process.env.TASKAPP_BASE_URL!
  const apiKey = process.env.TASKAPP_PROJECT_API_KEY!

  const upstream = await fetch(
    `${baseUrl}/api/public/v1/events?reporter_email=${encodeURIComponent(reporter)}`,
    {
      headers: { 'X-Project-Key': apiKey, Accept: 'text/event-stream' },
      signal: req.signal,
    }
  )

  if (!upstream.ok || !upstream.body) {
    return new Response('Upstream unavailable', { status: 502 })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

- Cuando el browser cierra la conexión, `req.signal` aborta el upstream fetch → TaskApp recibe close → unsubscribe.
- Streaming de body sin intermediación (zero-copy del backpressure).

---

## 8. Hooks de React Query

Ubicación: `src/features/Ayuda/hooks/`.

### 8.1 `useMyTicketsWithUnread.ts`

Reemplaza al `useMyTickets.ts` actual.

```typescript
export const MY_TICKETS_QUERY_KEY = ['ayuda', 'my-tickets-with-unread'] as const

export function useMyTicketsWithUnread(initialData?: TicketWithUnread[]) {
  return useQuery({
    queryKey: MY_TICKETS_QUERY_KEY,
    queryFn: () => getMyTicketsWithUnread(),
    staleTime: 60_000,
    initialData,
    // refetchOnWindowFocus: true (default)
    // refetchOnMount: true (default)
    // NO refetchInterval
  })
}
```

### 8.2 `useUnreadSupportTicketsCount.ts`

Hook para el sidebar. Deriva del mismo caché.

```typescript
export function useUnreadSupportTicketsCount() {
  const { data } = useMyTicketsWithUnread()
  return useMemo(() => {
    if (!data) return 0
    return data.filter(t => t.unread.hasStatusChange || t.unread.hasNewAgentComment).length
  }, [data])
}
```

### 8.3 `useMarkTicketAsReadMutation.ts`

```typescript
export function useMarkTicketAsReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ticketId: number) => markSupportTicketAsRead(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY })
    },
  })
}
```

### 8.4 `useSupportTicketsRealtimeSync.ts`

```typescript
export function useSupportTicketsRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const eventSource = new EventSource('/api/taskapp/events')

    eventSource.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as { type: string; ticket_id?: number }
        if (event.type === 'ticket.updated' || event.type === 'comment.created') {
          queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY })
        }
      } catch {
        // ignore malformed events
      }
    }

    eventSource.onerror = () => {
      // EventSource reconecta automáticamente.
      // Forzamos refetch de cortesía por si perdimos eventos durante la desconexión.
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY })
    }

    return () => {
      eventSource.close()
    }
  }, [queryClient])
}
```

---

## 9. UI

### 9.1 Provider en el layout

Archivo nuevo: `src/features/Ayuda/components/SupportTicketsRealtimeProvider.tsx`

```typescript
'use client'

export function SupportTicketsRealtimeProvider({ children }: { children: React.ReactNode }) {
  useSupportTicketsRealtimeSync()
  return <>{children}</>
}
```

Montaje: en `src/app/dashboard/layout.tsx` (o equivalente), envolver el árbol del dashboard dentro del provider. Solo se monta cuando hay sesión válida (heredado del layout).

### 9.2 Badge en el sidebar

Modificación en `src/features/Layout/sidebar/components/SidebarLink.tsx` (o donde se renderice el ítem).

Estrategia: el componente `SidebarLink` no debe asumir conocimiento del feature de Ayuda. Aceptar una prop opcional:

```typescript
interface SidebarLinkProps {
  // ...existentes
  badgeCount?: number
}
```

En `useSidebarLinks.ts` (o donde se compongan los links), para el ítem `ayuda`:

```typescript
const ayudaUnreadCount = useUnreadSupportTicketsCount()

return links.map(link => link.moduleSlug === 'ayuda'
  ? { ...link, badgeCount: ayudaUnreadCount }
  : link
)
```

Render del badge en `SidebarLink`:

```tsx
{badgeCount !== undefined && badgeCount > 0 && (
  <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
    {badgeCount > 9 ? '9+' : badgeCount}
  </Badge>
)}
```

Posición: a la derecha del label, alineado con `ml-auto`.

### 9.3 Dot + microcopy en TicketCard

Modificación en `src/features/Ayuda/components/TicketCard.tsx`.

Prop nueva: `unread: TicketWithUnread['unread']`.

```tsx
const microcopy = unread.hasNewAgentComment
  ? 'Nueva respuesta'
  : unread.hasStatusChange
    ? 'Cambio de estado'
    : null

const isUnread = unread.hasStatusChange || unread.hasNewAgentComment

return (
  <Card className={...}>
    {isUnread && (
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-xs font-medium text-primary">{microcopy}</span>
      </div>
    )}
    {/* resto del card existente */}
  </Card>
)
```

Si `hasStatusChange && hasNewAgentComment`, prioriza "Nueva respuesta" (el comment del agente es lo más relevante para el usuario).

### 9.4 Mark as read en TicketDetailSheet

Modificación en `src/features/Ayuda/components/detail/TicketDetailSheet.tsx`:

```typescript
const markAsReadMutation = useMarkTicketAsReadMutation()

useEffect(() => {
  if (ticketId != null) {
    markAsReadMutation.mutate(ticketId)
  }
}, [ticketId])
```

- Idempotente: si el ticket ya está leído, el upsert solo actualiza timestamps. No daña nada.
- No esperamos respuesta antes de mostrar el sheet — la mutación corre en background.

---

## 10. Flujos end-to-end (casos canónicos)

### 10.1 Crear ticket

1. Vos clickeás "Reportar" → `createSupportTicket()`.
2. POST a TaskApp → recibe `ticket.id` y `ticket.status_id`.
3. INSERT en `support_ticket_views` (vos, ticket.id, now, status_id).
4. React Query invalida la lista → refetch → ticket nuevo aparece con `unread = { hasStatusChange: false, hasNewAgentComment: false }`.
5. SSE recibe `ticket.updated` por el broadcast del create — se ignora porque el ticket ya está en la lista actualizada.

### 10.2 Agente cambia estado

1. Mariana cambia status a `in_progress` en taskapp-frontend.
2. TaskApp service emite `publicHub.Broadcast(reporter, "ticket.updated")`.
3. EventSource de Carlos lo recibe → invalida query.
4. Refetch corre `getMyTicketsWithUnread()` → ticket tiene `status_id` diferente al `last_seen_status_id` → `hasStatusChange = true`.
5. Sidebar badge sube. Si Carlos está en /help, card muestra dot + "Cambio de estado".

### 10.3 Agente comenta

1. Mariana comenta → `publicHub.Broadcast(reporter, "comment.created")`.
2. EventSource invalida query.
3. Refetch fetcha comments del ticket → encuentra comment con `author_email !== reporter && created_at > last_seen_at` → `hasNewAgentComment = true`.
4. Card muestra dot + "Nueva respuesta".

### 10.4 Carlos abre el ticket

1. Click en card → TicketDetailSheet abre con `ticketId=123`.
2. `useEffect` dispara `markSupportTicketAsRead(123)`.
3. UPSERT en `support_ticket_views` con `last_seen_at = now` y `last_seen_status_id = current`.
4. `onSuccess` invalida query.
5. Refetch → `hasStatusChange = false`, `hasNewAgentComment = false` → dot desaparece, badge baja.

### 10.5 Carlos comenta su propio ticket

1. Composer submit → `createSupportTicketComment(123, "...")` → POST a TaskApp.
2. TaskApp emite `publicHub.Broadcast(reporter, "comment.created")` — incluye al propio reporter.
3. EventSource invalida query.
4. Refetch fetcha comments → el comment nuevo tiene `author_email === reporter` → no se cuenta como agent comment.
5. `hasNewAgentComment` se mantiene en el valor que ya tenía (false si no había, true si ya estaba en true por otro comment anterior). Sin badge falso.

### 10.6 Carlos offline durante 4 días

Cubierto en sección "Resiliencia" abajo.

---

## 11. Casos de borde y resiliencia

| Escenario | Comportamiento |
|---|---|
| Usuario offline durante días, agente le responde 5 veces | Al volver, primer fetch detecta `updated_at > last_seen_at` y comments con `created_at > last_seen_at`. Badge correcto. PublicHub descarta los eventos enviados durante la ausencia (no hay buffer infinito). |
| Usuario abre 3 tabs | Cada tab tiene su `EventSource`. PublicHub registra 3 clients para el mismo email. Cada evento llega a los 3 → cada tab invalida su React Query → todos consistentes. |
| TaskApp caído al cargar la página | `getMyTicketsWithUnread()` falla → React Query muestra error. UI muestra estado de error con botón retry (el RefreshCcw que ya existe). Sin SSE conectado, `EventSource onerror` reintenta exponencialmente. |
| Supabase caído | `getMyTicketsWithUnread()` falla en el `prisma.findMany`. Igual que el caso anterior. |
| SSE proxy 502 | EventSource reintenta. Mientras tanto, `refetchOnWindowFocus` y `refetchOnMount` siguen funcionando — la feature degrada a "pull pasivo" sin perder correctitud. |
| Ticket creado afuera de gh (otro cliente con mismo reporter_email) | No tiene view inicial. Aparece con `hasStatusChange = false` (nunca lo vimos) pero `hasNewAgentComment = true` si hay comments del agente. Correcto: lo cuenta como novedad pendiente. |
| Usuario nunca abrió ningún ticket | `support_ticket_views` vacía. Tickets viejos aparecen con `hasStatusChange = false`. Si hay comments del agente sin leer, aparecen con `hasNewAgentComment = true`. Si no quisiéramos eso al estrenar la feature, ver "Estreno" abajo. |
| Borrar perfil | `ON DELETE CASCADE` borra todas las views del usuario. |
| Migrar entre empresas (mismo email) | Los tickets en TaskApp son por `reporter_email` global, no por empresa. El usuario seguiría viendo sus tickets aunque cambie de empresa. Esto **no** es un cambio respecto al comportamiento actual del feature de Ayuda. |

### 11.1 Estreno de la feature

El día del deploy, los usuarios existentes no tienen filas en `support_ticket_views`. Esto significa que TODOS los tickets viejos con comments del agente aparecerían como "Nueva respuesta" en el badge.

Para evitar ruido al estreno, opciones:

- **Migración seed**: en la misma migración SQL, después del CREATE TABLE, INSERT inicial seedeando `support_ticket_views` con `last_seen_at = now()` y `last_seen_status_id = current` para cada par `(profile.id, ticket.id)` existente. Requiere que la migración tenga acceso a TaskApp (no lo tiene desde SQL).
- **Seed script post-deploy**: script Node que recorre todos los profiles, llama a TaskApp por sus tickets, insertea views iniciales. Se corre una vez post-deploy.
- **No hacer nada**: aceptar el ruido del primer día. Los usuarios limpian abriendo o ignoran y se va estabilizando.

**Decisión propuesta**: script de seed post-deploy. Más limpio, controlado, no afecta a usuarios futuros.

---

## 12. Error handling y degradación

### 12.1 Capas y modos de falla

```
┌──────────────────────────────────────────────────────────────┐
│ SSE conectado    │ SSE roto       │ Supabase caída │ TaskApp caída │
├──────────────────┼────────────────┼────────────────┼───────────────┤
│ Real-time        │ Refetch on     │ Sin badges, sin│ Feature       │
│ instant updates  │ focus/nav      │ unread,        │ inutilizable  │
│                  │                │ tickets OK     │ (error UI)    │
└──────────────────┴────────────────┴────────────────┴───────────────┘
```

### 12.2 Reglas

- **No bloquear la lista de tickets si Supabase falla**. El `getMyTicketsWithUnread()` debe tener `try/catch` alrededor del `prisma.findMany`: si falla, retornar tickets con `unread = { hasStatusChange: false, hasNewAgentComment: false, lastSeenAt: null }` para todos. Log error.
- **No bloquear si comments fallan para un ticket puntual**: el fetch lazy de comments también dentro de `try/catch` per ticket. Si falla, asumir `hasNewAgentComment = false` para ese ticket.
- **No bloquear el ticket creation si la view insert falla**: el `support_ticket_views.create` en `createSupportTicket` se hace en try/catch, log warn, return del ticket igual.
- **`markSupportTicketAsRead` puede fallar**: en ese caso el upsert falla, el dot no se limpia. Próximo intento (al volver a abrir el ticket) lo reintenta. Aceptable.

### 12.3 Observabilidad

- Logger con scope `features/Ayuda/notifications` (Logger del proyecto, no `console.*`).
- Métricas a loggear (level=info):
  - Inicio y fin de SSE connection.
  - Falla de fetch de comments por ticket.
  - Falla de upsert de view.
  - Falla de fetch tickets de TaskApp.

---

## 13. Testing

### 13.1 Backend TaskApp (Go)

Tests nuevos:

- `internal/realtime/public_hub_test.go`: subscribe, broadcast, unsubscribe, múltiples clients por reporter, buffer overflow.
- `internal/handler/public_sse_test.go`: integration test que verifique formato SSE, heartbeat, cleanup en disconnect, 400 sin reporter_email, 401 sin X-Project-Key.
- `internal/service/task_test.go`: verificar que después de Update se llama a `publicHub.Broadcast` con el reporter_email correcto.
- `integration_test.go`: end-to-end de un POST /tickets + comment → verificar que llega el evento por SSE.

### 13.2 Frontend gh_gestion

No hay tests unitarios en el proyecto hoy (solo Cypress E2E). El testing manual cubre los flujos:

1. Crear un ticket → confirmar que NO aparece como no leído.
2. Cambiar manualmente el `status_id` en la BD de TaskApp (o vía taskapp-frontend) → confirmar badge sube + dot aparece + microcopy "Cambio de estado".
3. Crear un comment como otro usuario en TaskApp → confirmar badge sube + microcopy "Nueva respuesta".
4. Abrir el ticket → confirmar badge baja + dot desaparece.
5. Comentar yo mismo en mi ticket → confirmar badge NO sube.
6. Abrir 2 tabs simultáneos → confirmar que ambos reaccionan al evento.
7. Cerrar tab → reabrir → confirmar que badge refleja cambios ocurridos durante la ausencia.
8. Matar TaskApp → confirmar UI degrada (error visible, no white screen).
9. Matar Supabase → confirmar lista de tickets sigue funcionando, sin badges.

Opcional: agregar test Cypress de happy path "crear ticket → ver lista".

---

## 14. Out of scope

- Push notifications nativas del browser (Web Push API).
- Emails al reporter cuando hay novedad.
- Mark all as read bulk action (decisión 3 lo descartó implícitamente).
- Notificaciones de tickets donde el usuario es approver (decisión 5 lo descartó).
- Realtime para usuarios internos de gh_gestion sobre tickets de TaskApp (ej: si una persona aprueba algo, otra ve la actualización).
- Replay de eventos perdidos durante desconexiones (Last-Event-ID). Confiamos en el refetch on reconnect.

---

## 15. Plan de implementación (alto nivel)

El detalle por tarea con dependencias lo genera writing-plans. A nivel de fases:

### Fase A — Backend TaskApp

1. PublicHub paralelo al Hub interno.
2. Endpoint SSE público con auth X-Project-Key.
3. Bridge desde services a PublicHub.
4. Endpoints approve/reject paralelos.
5. Tests Go.

### Fase B — Schema gh_gestion

6. Migración Prisma `support_ticket_views`.
7. Update `schema.prisma` con el modelo y la relación a `profile`.
8. Regenerar Prisma client.

### Fase C — Server gh_gestion

9. Extender cliente TaskApp en `src/shared/lib/taskapp/client.ts` con approve/reject (ya invocados pero sin endpoint hasta Fase A).
10. Server action `getMyTicketsWithUnread`.
11. Server action `markSupportTicketAsRead`.
12. Extender `createSupportTicket` con el INSERT inicial de view.
13. API route `app/api/taskapp/events/route.ts`.

### Fase D — Cliente gh_gestion

14. Hook `useMyTicketsWithUnread` (reemplazo de `useMyTickets`).
15. Hook `useUnreadSupportTicketsCount`.
16. Hook `useMarkTicketAsReadMutation`.
17. Hook `useSupportTicketsRealtimeSync`.
18. Componente `SupportTicketsRealtimeProvider`.

### Fase E — UI

19. Badge en `SidebarLink` con prop `badgeCount`.
20. Componer count en `useSidebarLinks` para el ítem `ayuda`.
21. Dot + microcopy en `TicketCard` con prop `unread`.
22. Mark as read en `TicketDetailSheet`.
23. Montar `SupportTicketsRealtimeProvider` en `app/dashboard/layout.tsx`.

### Fase F — Estreno

24. Script de seed post-deploy para users existentes (si decidimos hacerlo).
25. Smoke test manual de los 9 casos del plan de testing.

Cada fase puede ser un commit/PR independiente o todo junto. writing-plans propone el desglose final.

---

## 16. Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| N+1 fetch de comments si todos los tickets se movieron simultáneamente | Filtrado por `updated_at > last_seen_at`. En la práctica muy pocos. Si se vuelve problema, agregar endpoint `/tickets/with-comments` en TaskApp que devuelva tickets con comments embedded. |
| Múltiples conexiones SSE por usuario (1 por tab) sobrecargan PublicHub | Aceptable hasta cientos de usuarios. Si escalamos, agregar dedup por session id (cookie) en el proxy de gh. |
| Cambio de `status_id` en TaskApp por edición administrativa (no por flujo natural) genera dot raro | Aceptable: cualquier cambio de status es novedad legítima desde la perspectiva del reporter. |
| Race condition: agente comenta exactamente al mismo tiempo que el reporter abre el ticket | El `markAsRead` se ejecuta on-open con timestamp `now()`. Si llega un comment después de ese `now()`, se contará como no leído en el próximo refetch. Correcto. |
| Reporter cambia su email (rare) | Pierde acceso a sus tickets viejos en TaskApp y a sus views en Supabase. Ya es comportamiento existente; no agravamos. |

---

## 17. Conclusión

El sistema queda con responsabilidades limpias:

- **TaskApp**: contenido + eventos.
- **Supabase**: estado personal de lectura.
- **gh_gestion server**: orchestrator + proxy SSE.
- **gh_gestion cliente**: caché compartido + UI.

El SSE es un optimizador de latencia, no un sistema crítico — si falla, la feature degrada a pull pasivo automáticamente. El cálculo de "no leído" siempre es determinista a partir de los timestamps persistidos.
