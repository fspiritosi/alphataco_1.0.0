# Help Tickets Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar indicadores visuales (badge en sidebar + dot pulsante en cada TicketCard) cuando un ticket del usuario tiene novedades sin leer (cambio de estado o comentario nuevo del agente), con actualización en tiempo real vía SSE público desde TaskApp.

**Architecture:** Cross-repo. TaskApp (Go) expone un nuevo `PublicHub` indexado por `reporter_email` y un endpoint `GET /api/public/v1/events` con SSE público. gh_gestion (Next.js) guarda el "yo lo vi" en una tabla `support_ticket_views` (Supabase via Prisma), enriquece la lista de tickets con un flag `unread`, y abre un EventSource via API route proxy para refresh instantáneo. React Query comparte cache entre sidebar y página.

**Tech Stack:**
- Backend TaskApp: Go (stdlib net/http), SSE
- gh_gestion: Next.js 16 + React 19 + Prisma + Supabase + React Query + Tailwind/shadcn
- DB: PostgreSQL (Supabase)

---

## Prerequisitos verificados

| Item | Estado | Detalle |
|---|---|---|
| Modelo de perfil de usuario | ✅ | Se llama `profile` en `prisma/schema.prisma:2176`, con `id String @id @db.Uuid` |
| `TASKAPP_BASE_URL` | ✅ | `.env` tiene `https://apitaskapp.codecontrol.com.ar` |
| `TASKAPP_PROJECT_API_KEY` | ✅ | Configurada en `.env` |
| Rama de trabajo | ✅ | `feature/help-support-tickets`, working tree limpio, mergeada con dev |
| Backend TaskApp accesible | ✅ | `C:/Users/Yorda/OneDrive/Escritorio/Workspace/codecontrol/taskApp-backend` |
| Hub interno TaskApp | ✅ | `internal/realtime/hub.go` con Subscribe/Unsubscribe/Broadcast |

## Reglas durante ejecución

- **No commits automáticos**: el usuario los pide explícitamente. Cada bloque sugiere un checkpoint manual al final.
- **Migraciones Prisma**: flujo manual de `.claude/rules/migrations.md` (diff → carpeta → SQL → db execute → resolve → generate). NUNCA `prisma migrate dev`.
- **Logger**: `@/lib/logger` con scope, nunca `console.*`.
- **Tipos**: nunca `:any`. Inferir con `Awaited<ReturnType<...>>`.
- **Idioma**: código en inglés, UI strings y comentarios en español.
- **No unit tests en frontend**: el proyecto no tiene infra de unit tests, solo Cypress E2E. El testing del lado gh_gestion es manual (Fase F). El lado Go SÍ tiene tests (lo que hagamos lo testeamos).

---

## File Structure

### Repo `taskApp-backend` (Go)

```
Create:
  internal/realtime/public_hub.go              # PublicHub indexed by reporter_email
  internal/realtime/public_hub_test.go         # Unit tests
  internal/handler/public_sse.go               # SSE public endpoint handler
  internal/handler/public_sse_test.go          # Handler tests

Modify:
  internal/service/task.go                     # Add publicHub.Broadcast on updates
  internal/service/comment.go                  # Add publicHub.Broadcast on create
  internal/handler/public_ticket.go            # Add Approve / Reject handlers
  internal/service/task.go                     # Add Approve / Reject service methods
  cmd/server/main.go                           # Wire publicHub + routes
  integration_test.go                          # End-to-end test SSE event flow
```

### Repo `gh_gestion` (Next.js)

```
Create:
  prisma/migrations/<timestamp>_create_support_ticket_views/migration.sql
  src/app/api/taskapp/events/route.ts                                # SSE proxy
  src/features/Ayuda/hooks/useMyTicketsWithUnread.ts
  src/features/Ayuda/hooks/useUnreadSupportTicketsCount.ts
  src/features/Ayuda/hooks/useMarkTicketAsReadMutation.ts
  src/features/Ayuda/hooks/useSupportTicketsRealtimeSync.ts
  src/features/Ayuda/components/SupportTicketsRealtimeProvider.tsx
  src/features/Ayuda/actions/support-ticket-views.ts                 # Server actions for views
  scripts/seed-support-ticket-views.ts                               # Post-deploy seed (Fase F)

Modify:
  prisma/schema.prisma                                               # Add support_ticket_views model + relation
  src/shared/lib/taskapp/types.ts                                    # Type TicketWithUnread
  src/features/Ayuda/actions/support-tickets.ts                      # getMyTicketsWithUnread, extend createSupportTicket
  src/features/Ayuda/components/HelpCenter.tsx                       # Use new hook
  src/features/Ayuda/components/MyTicketsList.tsx                    # Pass unread prop to TicketCard
  src/features/Ayuda/components/TicketCard.tsx                       # Render dot + microcopy
  src/features/Ayuda/components/detail/TicketDetailSheet.tsx         # Trigger markAsRead on open
  src/features/Layout/sidebar/components/SidebarLink.tsx             # Accept badgeCount prop
  src/features/Layout/sidebar/hooks/useSidebarLinks.ts               # Inject unread count for ayuda
  src/app/dashboard/layout.tsx                                       # Mount SupportTicketsRealtimeProvider
```

---

## Order of execution

**Critical path** (must be serialized):
```
A (backend TaskApp) ─┐
                     ├─→ C5 (proxy needs backend) ─→ D4 (realtime hook) ─→ E5 (mount provider) ─→ F (smoke)
B (Prisma) ──────────┴─→ C1-C4 (server actions) ─→ D1-D3 (hooks) ─→ E1-E4 (UI)
```

**Parallelizable**: Bloques A y B son independientes (Go backend vs Prisma migration). Si despachás subagentes, podés correrlos en paralelo. Bloque E depende de D, que depende de C.

---

## BLOQUE A — Backend TaskApp (Go)

> Working dir: `C:/Users/Yorda/OneDrive/Escritorio/Workspace/codecontrol/taskApp-backend`

### Task A1: Crear PublicHub

**Files:**
- Create: `internal/realtime/public_hub.go`

- [ ] **Step 1: Crear archivo `internal/realtime/public_hub.go`**

```go
package realtime

import (
	"sync"
)

// PublicClient es un cliente suscrito al PublicHub, identificado por reporter_email.
type PublicClient struct {
	ReporterEmail string
	Send          chan Event
}

// PublicHub mantiene clientes SSE públicos (autenticados via X-Project-Key)
// indexados por reporter_email. Cuando ocurre un cambio relevante en un ticket,
// los servicios llaman Broadcast con el reporter_email del ticket.
type PublicHub struct {
	mu      sync.RWMutex
	clients map[string]map[*PublicClient]bool // reporterEmail -> set of clients
}

func NewPublicHub() *PublicHub {
	return &PublicHub{
		clients: make(map[string]map[*PublicClient]bool),
	}
}

func (h *PublicHub) Subscribe(reporterEmail string) *PublicClient {
	client := &PublicClient{
		ReporterEmail: reporterEmail,
		Send:          make(chan Event, 64),
	}

	h.mu.Lock()
	if h.clients[reporterEmail] == nil {
		h.clients[reporterEmail] = make(map[*PublicClient]bool)
	}
	h.clients[reporterEmail][client] = true
	h.mu.Unlock()

	return client
}

func (h *PublicHub) Unsubscribe(client *PublicClient) {
	h.mu.Lock()
	if clients, ok := h.clients[client.ReporterEmail]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.clients, client.ReporterEmail)
		}
	}
	close(client.Send)
	h.mu.Unlock()
}

func (h *PublicHub) Broadcast(reporterEmail string, event Event) {
	if reporterEmail == "" {
		return
	}

	h.mu.RLock()
	clients := h.clients[reporterEmail]
	h.mu.RUnlock()

	for client := range clients {
		select {
		case client.Send <- event:
		default:
			// Buffer full: skip (next refetch on reconnect recovers state)
		}
	}
}
```

- [ ] **Step 2: Compilar**

Run: `go build ./internal/realtime/...`
Expected: sin errores.

### Task A2: Tests del PublicHub

**Files:**
- Create: `internal/realtime/public_hub_test.go`

- [ ] **Step 1: Escribir tests**

```go
package realtime

import (
	"testing"
	"time"
)

func TestPublicHubSubscribeUnsubscribe(t *testing.T) {
	hub := NewPublicHub()
	client := hub.Subscribe("alice@example.com")

	if client.ReporterEmail != "alice@example.com" {
		t.Fatalf("expected reporter alice@example.com, got %q", client.ReporterEmail)
	}

	hub.Unsubscribe(client)

	// Send channel debe estar cerrado tras Unsubscribe
	_, ok := <-client.Send
	if ok {
		t.Fatal("expected send channel closed after unsubscribe")
	}
}

func TestPublicHubBroadcastDeliversEvent(t *testing.T) {
	hub := NewPublicHub()
	client := hub.Subscribe("alice@example.com")
	defer hub.Unsubscribe(client)

	hub.Broadcast("alice@example.com", Event{Type: "ticket.updated", ID: 42})

	select {
	case ev := <-client.Send:
		if ev.Type != "ticket.updated" || ev.ID != 42 {
			t.Fatalf("unexpected event: %+v", ev)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("event not delivered within 100ms")
	}
}

func TestPublicHubBroadcastFiltersByReporter(t *testing.T) {
	hub := NewPublicHub()
	alice := hub.Subscribe("alice@example.com")
	bob := hub.Subscribe("bob@example.com")
	defer hub.Unsubscribe(alice)
	defer hub.Unsubscribe(bob)

	hub.Broadcast("alice@example.com", Event{Type: "ticket.updated", ID: 1})

	select {
	case ev := <-alice.Send:
		if ev.ID != 1 {
			t.Fatalf("unexpected event for alice: %+v", ev)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("alice did not receive event")
	}

	select {
	case ev := <-bob.Send:
		t.Fatalf("bob should not have received event, got %+v", ev)
	case <-time.After(50 * time.Millisecond):
		// expected: no event for bob
	}
}

func TestPublicHubBroadcastNoSubscribers(t *testing.T) {
	hub := NewPublicHub()
	// debe ser no-op, sin panic
	hub.Broadcast("nobody@example.com", Event{Type: "ticket.updated", ID: 1})
}

func TestPublicHubBufferFullSkipsClient(t *testing.T) {
	hub := NewPublicHub()
	client := hub.Subscribe("alice@example.com")
	defer hub.Unsubscribe(client)

	// llenar buffer (64) + 1 extra
	for i := 0; i < 65; i++ {
		hub.Broadcast("alice@example.com", Event{Type: "ticket.updated", ID: int64(i)})
	}

	// debe haber recibido exactamente 64 (el último se descartó por buffer lleno)
	received := 0
	for {
		select {
		case <-client.Send:
			received++
		case <-time.After(50 * time.Millisecond):
			if received != 64 {
				t.Fatalf("expected 64 events buffered, got %d", received)
			}
			return
		}
	}
}

func TestPublicHubMultipleClientsSameReporter(t *testing.T) {
	hub := NewPublicHub()
	tab1 := hub.Subscribe("alice@example.com")
	tab2 := hub.Subscribe("alice@example.com")
	defer hub.Unsubscribe(tab1)
	defer hub.Unsubscribe(tab2)

	hub.Broadcast("alice@example.com", Event{Type: "ticket.updated", ID: 99})

	for _, c := range []*PublicClient{tab1, tab2} {
		select {
		case ev := <-c.Send:
			if ev.ID != 99 {
				t.Fatalf("unexpected event: %+v", ev)
			}
		case <-time.After(100 * time.Millisecond):
			t.Fatal("a tab did not receive the event")
		}
	}
}
```

- [ ] **Step 2: Run tests**

Run: `go test ./internal/realtime/ -run PublicHub -v`
Expected: 5 tests PASS.

### Task A3: PublicSSEHandler

**Files:**
- Create: `internal/handler/public_sse.go`

- [ ] **Step 1: Crear archivo**

```go
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"taskapp/internal/realtime"
)

type PublicSSEHandler struct {
	publicHub *realtime.PublicHub
}

func NewPublicSSEHandler(publicHub *realtime.PublicHub) *PublicSSEHandler {
	return &PublicSSEHandler{publicHub: publicHub}
}

// Stream maneja GET /api/public/v1/events?reporter_email=<email>
// Requiere middleware X-Project-Key (montado en main.go).
func (h *PublicSSEHandler) Stream(w http.ResponseWriter, r *http.Request) {
	reporter := r.URL.Query().Get("reporter_email")
	if reporter == "" {
		http.Error(w, "reporter_email required", http.StatusBadRequest)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	client := h.publicHub.Subscribe(reporter)
	defer h.publicHub.Unsubscribe(client)

	// Evento inicial: confirmar conexión
	fmt.Fprintf(w, "data: {\"type\":\"connected\"}\n\n")
	flusher.Flush()

	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case ev, ok := <-client.Send:
			if !ok {
				return
			}
			payload, err := json.Marshal(ev)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", payload)
			flusher.Flush()
		case <-heartbeat.C:
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}
```

- [ ] **Step 2: Compilar**

Run: `go build ./internal/handler/...`
Expected: sin errores.

### Task A4: Tests del PublicSSEHandler

**Files:**
- Create: `internal/handler/public_sse_test.go`

- [ ] **Step 1: Escribir tests**

```go
package handler

import (
	"bufio"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"taskapp/internal/realtime"
)

func TestPublicSSEHandlerMissingReporter(t *testing.T) {
	hub := realtime.NewPublicHub()
	h := NewPublicSSEHandler(hub)

	req := httptest.NewRequest(http.MethodGet, "/api/public/v1/events", nil)
	rec := httptest.NewRecorder()
	h.Stream(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestPublicSSEHandlerEmitsConnectedEvent(t *testing.T) {
	hub := realtime.NewPublicHub()
	h := NewPublicSSEHandler(hub)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	req := httptest.NewRequest(http.MethodGet, "/api/public/v1/events?reporter_email=alice@example.com", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		h.Stream(rec, req)
		close(done)
	}()

	// dar tiempo a que escriba el evento inicial
	time.Sleep(50 * time.Millisecond)
	cancel()
	<-done

	body := rec.Body.String()
	if !strings.Contains(body, "\"type\":\"connected\"") {
		t.Fatalf("expected connected event in body, got: %s", body)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("expected text/event-stream, got %s", ct)
	}
}

func TestPublicSSEHandlerForwardsBroadcastEvent(t *testing.T) {
	hub := realtime.NewPublicHub()
	h := NewPublicSSEHandler(hub)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	server := httptest.NewServer(http.HandlerFunc(h.Stream))
	defer server.Close()

	resp, err := http.Get(server.URL + "?reporter_email=alice@example.com")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()

	// Dejar conectar y luego broadcast
	time.Sleep(50 * time.Millisecond)
	hub.Broadcast("alice@example.com", realtime.Event{Type: "ticket.updated", ID: 42})

	scanner := bufio.NewScanner(resp.Body)
	deadline := time.After(500 * time.Millisecond)

	foundConnected := false
	foundUpdated := false
	for !foundUpdated {
		select {
		case <-deadline:
			t.Fatalf("did not receive ticket.updated event (connected=%v)", foundConnected)
		default:
		}
		if !scanner.Scan() {
			break
		}
		line := scanner.Text()
		if strings.Contains(line, "\"type\":\"connected\"") {
			foundConnected = true
		}
		if strings.Contains(line, "\"type\":\"ticket.updated\"") && strings.Contains(line, "\"id\":42") {
			foundUpdated = true
		}
	}

	if !foundUpdated {
		t.Fatalf("expected ticket.updated event in stream")
	}
}
```

- [ ] **Step 2: Run tests**

Run: `go test ./internal/handler/ -run PublicSSE -v`
Expected: 3 tests PASS.

### Task A5: Bridge desde service/task.go

**Files:**
- Modify: `internal/service/task.go`

- [ ] **Step 1: Explorar la estructura actual del TaskService**

Run: `grep -n "type TaskService\|func NewTaskService\|hub\." internal/service/task.go`
Expected: ver el campo `hub *realtime.Hub` y métodos Update/Create.

- [ ] **Step 2: Agregar campo `publicHub` al struct y al constructor**

Localizar el struct `TaskService` y agregar:

```go
type TaskService struct {
	// ...campos existentes...
	hub       *realtime.Hub
	publicHub *realtime.PublicHub
}

func NewTaskService(/* ...args existentes... */, hub *realtime.Hub, publicHub *realtime.PublicHub) *TaskService {
	return &TaskService{
		// ...
		hub:       hub,
		publicHub: publicHub,
	}
}
```

(Ajustar firma del constructor para incluir `publicHub` después de `hub`.)

- [ ] **Step 3: Agregar broadcast público en métodos que modifican tickets**

Buscar todos los lugares donde se llama `s.hub.Broadcast(...)` en `task.go`. Por cada uno, agregar inmediatamente después un broadcast al PublicHub si el task tiene `ReporterEmail`:

```go
// dentro de Update / status change methods, después del s.hub.Broadcast existente:
if task.ReporterEmail != nil && *task.ReporterEmail != "" {
    s.publicHub.Broadcast(*task.ReporterEmail, realtime.Event{
        Type: "ticket.updated",
        ID:   task.ID,
    })
}
```

Aplicar el mismo patrón en cada operación que cambie estado del ticket.

- [ ] **Step 4: Compilar**

Run: `go build ./internal/service/...`
Expected: sin errores. Si hay errores en main.go por firma del constructor, son esperados — los arreglamos en A8.

### Task A6: Bridge desde service/comment.go

**Files:**
- Modify: `internal/service/comment.go`

- [ ] **Step 1: Agregar campo publicHub al struct y constructor**

Misma técnica que A5:

```go
type CommentService struct {
	// ...
	hub       *realtime.Hub
	publicHub *realtime.PublicHub
}

func NewCommentService(/* ... */, hub *realtime.Hub, publicHub *realtime.PublicHub) *CommentService {
	// ...
}
```

- [ ] **Step 2: Agregar broadcast público en Create**

En el método `Create` (o equivalente que inserta comentario), después del `s.hub.Broadcast(...)`:

```go
// Necesitamos el reporter_email del ticket. Si el repository ya devuelve task con reporter o
// hay un método para traerlo, usarlo. Sino, hacer un fetch ligero:
task, err := s.taskRepo.GetByID(ctx, comment.TaskID)
if err == nil && task.ReporterEmail != nil && *task.ReporterEmail != "" {
    s.publicHub.Broadcast(*task.ReporterEmail, realtime.Event{
        Type: "comment.created",
        ID:   comment.TaskID,
    })
}
```

- [ ] **Step 3: Compilar**

Run: `go build ./internal/service/...`
Expected: sin errores (en service; main.go sigue roto hasta A8).

### Task A7: Endpoints approve/reject

**Files:**
- Modify: `internal/service/task.go` (agregar Approve/Reject)
- Modify: `internal/handler/public_ticket.go` (agregar handlers)

- [ ] **Step 1: Agregar métodos Approve / Reject al TaskService**

En `internal/service/task.go`, agregar:

```go
// Approve marca el ticket como aprobado por el approver dado.
// Retorna el ticket actualizado.
func (s *TaskService) Approve(ctx context.Context, ticketID int64, approverEmail string) (*model.Task, error) {
	task, err := s.taskRepo.GetByID(ctx, ticketID)
	if err != nil {
		return nil, err
	}

	// Resolver el statusID de "approved" desde repository de statuses
	approvedStatus, err := s.statusRepo.GetBySlug(ctx, "approved")
	if err != nil {
		return nil, fmt.Errorf("approved status not found: %w", err)
	}

	task.StatusID = approvedStatus.ID
	// si el modelo tiene ApproverEmail, setear:
	// task.ApproverEmail = &approverEmail

	if err := s.taskRepo.Update(ctx, task); err != nil {
		return nil, err
	}

	// Broadcast interno + público
	s.hub.Broadcast(task.WorkspaceID, 0, realtime.Event{Type: "task.updated", ID: task.ID})
	if task.ReporterEmail != nil && *task.ReporterEmail != "" {
		s.publicHub.Broadcast(*task.ReporterEmail, realtime.Event{Type: "ticket.updated", ID: task.ID})
	}

	return task, nil
}

// Reject marca el ticket como rechazado.
func (s *TaskService) Reject(ctx context.Context, ticketID int64, approverEmail string) (*model.Task, error) {
	task, err := s.taskRepo.GetByID(ctx, ticketID)
	if err != nil {
		return nil, err
	}

	rejectedStatus, err := s.statusRepo.GetBySlug(ctx, "rejected")
	if err != nil {
		return nil, fmt.Errorf("rejected status not found: %w", err)
	}

	task.StatusID = rejectedStatus.ID
	if err := s.taskRepo.Update(ctx, task); err != nil {
		return nil, err
	}

	s.hub.Broadcast(task.WorkspaceID, 0, realtime.Event{Type: "task.updated", ID: task.ID})
	if task.ReporterEmail != nil && *task.ReporterEmail != "" {
		s.publicHub.Broadcast(*task.ReporterEmail, realtime.Event{Type: "ticket.updated", ID: task.ID})
	}

	return task, nil
}
```

**Nota**: si los statuses `approved` y `rejected` no existen en la BD, agregar una migración SQL para insertarlos en la tabla `task_statuses` antes de este paso. Verificar con: `psql -c "SELECT id, slug FROM task_statuses WHERE slug IN ('approved', 'rejected');"`. Si no existen, crear migración en `db/migrations/` con `INSERT INTO task_statuses (slug, label) VALUES ('approved', 'Aprobado'), ('rejected', 'Rechazado') ON CONFLICT (slug) DO NOTHING;`.

- [ ] **Step 2: Agregar handlers HTTP Approve / Reject**

En `internal/handler/public_ticket.go`, agregar:

```go
type approveRejectRequest struct {
	ApproverEmail string `json:"approver_email"`
}

func (h *PublicTicketHandler) Approve(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	ticketID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req approveRejectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.ApproverEmail == "" {
		http.Error(w, "approver_email required", http.StatusBadRequest)
		return
	}

	task, err := h.taskService.Approve(r.Context(), ticketID, req.ApproverEmail)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(task); err != nil {
		// no podemos cambiar header después de escribir, solo log
		return
	}
}

func (h *PublicTicketHandler) Reject(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	ticketID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req approveRejectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.ApproverEmail == "" {
		http.Error(w, "approver_email required", http.StatusBadRequest)
		return
	}

	task, err := h.taskService.Reject(r.Context(), ticketID, req.ApproverEmail)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(task)
}
```

- [ ] **Step 3: Compilar**

Run: `go build ./internal/handler/...`
Expected: sin errores.

### Task A8: Wiring en main.go

**Files:**
- Modify: `cmd/server/main.go`

- [ ] **Step 1: Inspeccionar estructura actual de main.go**

Run: `grep -n "NewHub\|NewTaskService\|NewCommentService\|publicTicketHandler\|/api/public/v1" cmd/server/main.go`
Expected: identificar dónde se construyen el hub, los services, y los handlers, y dónde se registran las rutas.

- [ ] **Step 2: Construir el PublicHub**

Justo después de `hub := realtime.NewHub()` (línea ~variable), agregar:

```go
publicHub := realtime.NewPublicHub()
```

- [ ] **Step 3: Pasar publicHub a los services**

Actualizar las llamadas a `NewTaskService(...)` y `NewCommentService(...)` para incluir `publicHub` como argumento:

```go
taskService := service.NewTaskService(/* ...args existentes..., */ hub, publicHub)
commentService := service.NewCommentService(/* ... */, hub, publicHub)
```

- [ ] **Step 4: Construir el SSE handler**

```go
publicSSEHandler := handler.NewPublicSSEHandler(publicHub)
```

- [ ] **Step 5: Registrar las rutas nuevas**

Dentro del grupo de rutas `/api/public/v1/*` (que ya usa el middleware `apikey.RequireProjectKey`):

```go
mux.Handle("GET /api/public/v1/events", apiKeyMiddleware(http.HandlerFunc(publicSSEHandler.Stream)))
mux.Handle("POST /api/public/v1/tickets/{id}/approve", apiKeyMiddleware(http.HandlerFunc(publicTicketHandler.Approve)))
mux.Handle("POST /api/public/v1/tickets/{id}/reject", apiKeyMiddleware(http.HandlerFunc(publicTicketHandler.Reject)))
```

(Adaptar al patrón exacto usado en el archivo para registrar rutas con middleware.)

- [ ] **Step 6: Compilar todo**

Run: `go build ./...`
Expected: sin errores.

- [ ] **Step 7: Correr tests existentes para asegurar no romper nada**

Run: `go test ./...`
Expected: todos PASS (incluyendo los nuevos de A2 y A4).

### Task A9: Integration test end-to-end

**Files:**
- Modify: `integration_test.go`

- [ ] **Step 1: Agregar test que ejercite SSE público**

Al final de `integration_test.go`, agregar:

```go
func TestPublicSSEReceivesTicketUpdate(t *testing.T) {
	// Setup: servidor de integración (usar el mismo pattern que tests existentes)
	srv := setupIntegrationServer(t)
	defer srv.Close()

	reporter := "test-reporter@example.com"

	// 1. Crear ticket
	ticketID := createTestTicket(t, srv, reporter)

	// 2. Abrir SSE en goroutine
	eventCh := make(chan map[string]interface{}, 4)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		req, _ := http.NewRequestWithContext(ctx, "GET", srv.URL+"/api/public/v1/events?reporter_email="+reporter, nil)
		req.Header.Set("X-Project-Key", testProjectKey)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return
		}
		defer resp.Body.Close()

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			var ev map[string]interface{}
			if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &ev); err == nil {
				eventCh <- ev
			}
		}
	}()

	// 3. Esperar evento connected
	select {
	case ev := <-eventCh:
		if ev["type"] != "connected" {
			t.Fatalf("expected connected event, got %v", ev)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for connected event")
	}

	// 4. Cambiar estado del ticket via service (o via PATCH endpoint)
	updateTicketStatus(t, srv, ticketID, "in_progress")

	// 5. Esperar evento ticket.updated
	select {
	case ev := <-eventCh:
		if ev["type"] != "ticket.updated" {
			t.Fatalf("expected ticket.updated, got %v", ev)
		}
		if int64(ev["id"].(float64)) != ticketID {
			t.Fatalf("expected ticket ID %d, got %v", ticketID, ev["id"])
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for ticket.updated event")
	}
}
```

(Ajustar `setupIntegrationServer`, `createTestTicket`, `updateTicketStatus` para usar las helpers que ya existen en el archivo. Si no existen, agregar las que sean necesarias en estilo coherente con el resto.)

- [ ] **Step 2: Run integration tests**

Run: `go test -run TestPublicSSE -v ./...`
Expected: PASS.

- [ ] **Step 3: Verificación manual del backend**

```bash
# Levantar el backend
docker-compose up -d   # o el comando que use el proyecto

# Crear un ticket de prueba via curl
curl -X POST http://localhost:8080/api/public/v1/tickets \
  -H "X-Project-Key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"...","priority":"medium","reporter_email":"alice@test.com"}'

# En otra terminal, suscribirse a SSE
curl -N http://localhost:8080/api/public/v1/events?reporter_email=alice@test.com \
  -H "X-Project-Key: <key>"
# Debe imprimir: data: {"type":"connected","id":0,"workspace_id":0}

# Cambiar estado del ticket → la terminal del SSE debe imprimir ticket.updated
```

**🛑 Checkpoint A**: Backend listo. Sugerencia al usuario: revisar `go test ./...` y considerar commit. NO commitear sin autorización explícita.

---

## BLOQUE B — Schema Supabase (Prisma)

> Working dir: `gh_gestion`

### Task B1: Crear migración SQL

**Files:**
- Create: `prisma/migrations/<timestamp>_create_support_ticket_views/migration.sql`

- [ ] **Step 1: Generar diff Prisma para validar baseline**

Run: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
Expected: vacío o sin cambios pendientes (working tree limpio).

- [ ] **Step 2: Determinar timestamp y crear carpeta**

```powershell
$ts = Get-Date -Format "yyyyMMddHHmmss"
$dir = "prisma/migrations/$($ts)_create_support_ticket_views"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$dir
```

- [ ] **Step 3: Escribir el SQL de la migración**

Crear `prisma/migrations/<timestamp>_create_support_ticket_views/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "support_ticket_views" (
    "user_id" UUID NOT NULL,
    "taskapp_ticket_id" BIGINT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "last_seen_status_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "support_ticket_views_pkey" PRIMARY KEY ("user_id","taskapp_ticket_id")
);

-- CreateIndex
CREATE INDEX "idx_support_ticket_views_user_id" ON "support_ticket_views" ("user_id");

-- AddForeignKey
ALTER TABLE "support_ticket_views" ADD CONSTRAINT "support_ticket_views_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Aplicar migración a la BD local**

Run: `npx prisma db execute --file prisma/migrations/<timestamp>_create_support_ticket_views/migration.sql --schema prisma/schema.prisma`
Expected: `Script executed successfully.`

- [ ] **Step 5: Marcar migración como aplicada**

Run: `npx prisma migrate resolve --applied <timestamp>_create_support_ticket_views`
Expected: confirma que se marcó como aplicada.

- [ ] **Step 6: Verificar con MCP supabase-LOCAL**

Usar MCP `supabase-LOCAL` (o `postgres-tasks` ya disponible) con la query:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'support_ticket_views'
ORDER BY ordinal_position;
```

Expected: 6 columnas (`user_id`, `taskapp_ticket_id`, `last_seen_at`, `last_seen_status_id`, `created_at`, `updated_at`).

```sql
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'support_ticket_views'::regclass;
```

Expected: PK compuesta + FK a `profile`.

### Task B2: Update schema.prisma con el modelo

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Localizar dónde insertar el modelo**

Run: `grep -n "^model profile " prisma/schema.prisma`
Expected: encontrar línea ~2176.

- [ ] **Step 2: Agregar el modelo nuevo al final de la sección de modelos**

Después del último modelo del archivo (o agrupar con tablas relacionadas), agregar:

```prisma
model support_ticket_views {
  user_id             String   @db.Uuid
  taskapp_ticket_id   BigInt
  last_seen_at        DateTime @default(now()) @db.Timestamptz(6)
  last_seen_status_id BigInt
  created_at          DateTime @default(now()) @db.Timestamptz(6)
  updated_at          DateTime @default(now()) @db.Timestamptz(6)

  profile             profile  @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: Cascade)

  @@id([user_id, taskapp_ticket_id])
  @@index([user_id], map: "idx_support_ticket_views_user_id")
}
```

- [ ] **Step 3: Agregar relación reversa en `model profile`**

Dentro del bloque `model profile { ... }`, agregar en la lista de relaciones:

```prisma
support_ticket_views support_ticket_views[]
```

(Mantener el ordenamiento alfabético existente del modelo si es el patrón.)

### Task B3: Regenerar Prisma client

- [ ] **Step 1: Regenerar tipos**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client`.

- [ ] **Step 2: Verificar que TypeScript reconoce el nuevo modelo**

Run: `npx tsc --noEmit prisma/schema.prisma 2>&1 | head -5` (smoke check)
Mejor: crear test temporal usando el modelo:

Run: `npm run check-types`
Expected: PASS.

**🛑 Checkpoint B**: Schema listo. NO commitear sin autorización del usuario.

---

## BLOQUE C — Server gh_gestion (server actions + proxy)

> Working dir: `gh_gestion`

### Task C1: Extender cliente TaskApp (approve/reject/SSE types)

**Files:**
- Modify: `src/shared/lib/taskapp/client.ts`
- Modify: `src/shared/lib/taskapp/types.ts`

- [ ] **Step 1: Confirmar que approveTicket y rejectTicket ya existen**

Run: `grep -n "approveTicket\|rejectTicket" src/shared/lib/taskapp/client.ts`
Expected: los métodos existen (los invoca el frontend hoy).

- [ ] **Step 2: Agregar tipo de evento SSE en types.ts**

Al final de `src/shared/lib/taskapp/types.ts`:

```typescript
export type TaskAppRealtimeEvent =
  | { type: 'connected' }
  | { type: 'ticket.updated'; ticket_id: number }
  | { type: 'comment.created'; ticket_id: number };

export interface TicketUnreadState {
  hasStatusChange: boolean;
  hasNewAgentComment: boolean;
  lastSeenAt: string | null;
}

export type TicketWithUnread = Ticket & {
  unread: TicketUnreadState;
};
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task C2: Server action `getMyTicketsWithUnread`

**Files:**
- Modify: `src/features/Ayuda/actions/support-tickets.ts`

- [ ] **Step 1: Agregar imports y la nueva action al archivo**

Al final de `src/features/Ayuda/actions/support-tickets.ts`:

```typescript
import { prisma } from '@/shared/lib/prisma';
import type { Comment, Ticket, TicketWithUnread } from '@/shared/lib/taskapp/types';
import { Logger } from '@/lib/logger';

const notifLogger = new Logger('features/Ayuda/notifications');

/**
 * Retorna los tickets del reporter actual enriquecidos con info de "no leído":
 * - hasStatusChange: el status actual difiere del que el usuario vio por última vez
 * - hasNewAgentComment: hay comentarios de OTROS (no el reporter) creados después del last_seen_at
 */
export async function getMyTicketsWithUnread(): Promise<TicketWithUnread[]> {
  const profile = await getCurrentProfile(); // helper existente en el feature
  const reporter = await getReporterEmail();
  if (!profile || !reporter) {
    notifLogger.warn('Missing profile or reporter, returning empty');
    return [];
  }

  const tickets = await getMySupportTickets(); // ya existe

  // Traer views del usuario en una sola query
  let viewsMap = new Map<number, { lastSeenAt: Date; lastSeenStatusId: bigint }>();
  try {
    const views = await prisma.support_ticket_views.findMany({
      where: {
        user_id: profile.id,
        taskapp_ticket_id: { in: tickets.map((t) => BigInt(t.id)) },
      },
      select: { taskapp_ticket_id: true, last_seen_at: true, last_seen_status_id: true },
    });
    viewsMap = new Map(
      views.map((v) => [
        Number(v.taskapp_ticket_id),
        { lastSeenAt: v.last_seen_at, lastSeenStatusId: v.last_seen_status_id },
      ])
    );
  } catch (error) {
    notifLogger.error('Failed to fetch ticket views from Supabase', { data: { error } });
    // Degradación: devolver tickets sin unread info
    return tickets.map((t) => ({ ...t, unread: { hasStatusChange: false, hasNewAgentComment: false, lastSeenAt: null } }));
  }

  // Identificar tickets que requieren fetch de comments
  const ticketsNeedingComments = tickets.filter((t) => {
    const view = viewsMap.get(t.id);
    if (!view) return true;
    return new Date(t.updated_at) > view.lastSeenAt;
  });

  // Fetch comments en paralelo, con failure individual aislado
  const commentsByTicket = new Map<number, Comment[]>();
  await Promise.all(
    ticketsNeedingComments.map(async (t) => {
      try {
        const comments = await listSupportTicketComments(t.id); // ya existe
        commentsByTicket.set(t.id, comments);
      } catch (error) {
        notifLogger.warn('Failed to fetch comments for ticket', { data: { ticketId: t.id, error } });
        commentsByTicket.set(t.id, []);
      }
    })
  );

  return tickets.map<TicketWithUnread>((t) => {
    const view = viewsMap.get(t.id);
    const lastSeenAt = view?.lastSeenAt ?? null;
    const lastSeenStatusId = view?.lastSeenStatusId ?? null;

    // Cambio de estado: solo cuenta si ya hay snapshot previo
    const hasStatusChange =
      lastSeenStatusId !== null && BigInt(t.status_id) !== lastSeenStatusId;

    const comments = commentsByTicket.get(t.id) ?? [];
    const hasNewAgentComment = comments.some(
      (c) =>
        c.author_email !== reporter &&
        (lastSeenAt === null || new Date(c.created_at) > lastSeenAt)
    );

    return {
      ...t,
      unread: {
        hasStatusChange,
        hasNewAgentComment,
        lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
      },
    };
  });
}
```

- [ ] **Step 2: Verificar que `getCurrentProfile` existe en el feature**

Run: `grep -rn "export.*getCurrentProfile\|export.*getCurrentUser" src/features/Ayuda/`
Expected: existe en `actions/`. Si no existe (puede llamarse distinto), buscar el helper que devuelve `profile.id` del usuario logueado:

Run: `grep -rn "supabaseServer\|getUser\(\)" src/features/Ayuda/actions/ | head -10`
Adaptar el import al helper real.

Alternativa garantizada: usar `supabaseServer()` directo dentro de la action:

```typescript
import { supabaseServer } from '@/lib/supabase/server';

async function getCurrentProfileId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
```

(Y reemplazar `profile.id` por `profileId` en la action arriba.)

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task C3: Server action `markSupportTicketAsRead`

**Files:**
- Create: `src/features/Ayuda/actions/support-ticket-views.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
'use server';

import { prisma } from '@/shared/lib/prisma';
import { supabaseServer } from '@/lib/supabase/server';
import { Logger } from '@/lib/logger';
import { getSupportTicketById } from './support-tickets';

const logger = new Logger('features/Ayuda/support-ticket-views');

/**
 * Marca un ticket como leído por el usuario actual. Guarda last_seen_at = now
 * y last_seen_status_id = status actual del ticket en TaskApp.
 * Idempotente: si ya existía una view, la actualiza.
 */
export async function markSupportTicketAsRead(taskappTicketId: number): Promise<void> {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('No authenticated user, skipping markAsRead');
      return;
    }

    // Necesitamos el status_id actual del ticket
    const ticket = await getSupportTicketById(taskappTicketId);
    if (!ticket) {
      logger.warn('Ticket not found in TaskApp', { data: { taskappTicketId } });
      return;
    }

    const now = new Date();
    await prisma.support_ticket_views.upsert({
      where: {
        user_id_taskapp_ticket_id: {
          user_id: user.id,
          taskapp_ticket_id: BigInt(taskappTicketId),
        },
      },
      create: {
        user_id: user.id,
        taskapp_ticket_id: BigInt(taskappTicketId),
        last_seen_at: now,
        last_seen_status_id: BigInt(ticket.status_id),
      },
      update: {
        last_seen_at: now,
        last_seen_status_id: BigInt(ticket.status_id),
      },
    });
  } catch (error) {
    logger.error('Failed to mark ticket as read', { data: { taskappTicketId, error } });
    // No re-lanzar: el usuario seguirá viendo el dot hasta el próximo intento, no es crítico
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task C4: Extender `createSupportTicket` con view inicial

**Files:**
- Modify: `src/features/Ayuda/actions/support-tickets.ts`

- [ ] **Step 1: Localizar la función actual**

Run: `grep -n "export async function createSupportTicket" src/features/Ayuda/actions/support-tickets.ts`

- [ ] **Step 2: Después del POST a TaskApp, agregar INSERT de view**

Dentro de la función, justo después de recibir el ticket creado de TaskApp y antes del `return`:

```typescript
// Crear view inicial para que el creador no vea su propio ticket como "no leído"
try {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await prisma.support_ticket_views.create({
      data: {
        user_id: user.id,
        taskapp_ticket_id: BigInt(ticket.id),
        last_seen_at: new Date(),
        last_seen_status_id: BigInt(ticket.status_id),
      },
    });
  }
} catch (error) {
  notifLogger.warn('Failed to create initial ticket view (non-fatal)', { data: { ticketId: ticket.id, error } });
}
```

(Asume que `prisma` y `supabaseServer` ya están importados; agregar imports si no.)

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task C5: API route proxy SSE

**Files:**
- Create: `src/app/api/taskapp/events/route.ts`

- [ ] **Step 1: Crear archivo**

```typescript
import { NextRequest } from 'next/server';
import { getReporterEmail } from '@/features/Ayuda/actions/getReporterEmail';
import { Logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const logger = new Logger('api/taskapp/events');

export async function GET(req: NextRequest) {
  const reporter = await getReporterEmail();
  if (!reporter) {
    return new Response('Unauthorized', { status: 401 });
  }

  const baseUrl = process.env.TASKAPP_BASE_URL;
  const apiKey = process.env.TASKAPP_PROJECT_API_KEY;

  if (!baseUrl || !apiKey) {
    logger.error('Missing TASKAPP_BASE_URL or TASKAPP_PROJECT_API_KEY');
    return new Response('Server configuration error', { status: 500 });
  }

  const upstreamUrl = `${baseUrl}/api/public/v1/events?reporter_email=${encodeURIComponent(reporter)}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        'X-Project-Key': apiKey,
        Accept: 'text/event-stream',
      },
      signal: req.signal,
    });
  } catch (error) {
    logger.error('Failed to connect to TaskApp SSE', { data: { error } });
    return new Response('Upstream unavailable', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    logger.error('TaskApp SSE returned non-OK', { data: { status: upstream.status } });
    return new Response('Upstream unavailable', { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Smoke test manual (requiere backend de A8 corriendo)**

```bash
# Iniciar dev server de gh_gestion
npm run dev

# En otra terminal, con un usuario logueado (cookie del browser):
# (más simple: abrir devtools en localhost:3000 y mirar Network)
curl -N http://localhost:3000/api/taskapp/events --cookie "sb-access-token=...; sb-refresh-token=..."
# Debe stream "data: {"type":"connected"}"
```

**🛑 Checkpoint C**: Server actions + proxy listos. NO commitear sin autorización del usuario.

---

## BLOQUE D — Cliente gh_gestion (hooks + provider)

> Working dir: `gh_gestion`

### Task D1: Hook `useMyTicketsWithUnread`

**Files:**
- Create: `src/features/Ayuda/hooks/useMyTicketsWithUnread.ts`

- [ ] **Step 1: Crear archivo**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyTicketsWithUnread } from '../actions/support-tickets';
import type { TicketWithUnread } from '@/shared/lib/taskapp/types';

export const MY_TICKETS_WITH_UNREAD_QUERY_KEY = ['ayuda', 'my-tickets-with-unread'] as const;

export function useMyTicketsWithUnread(initialData?: TicketWithUnread[]) {
  return useQuery({
    queryKey: MY_TICKETS_WITH_UNREAD_QUERY_KEY,
    queryFn: () => getMyTicketsWithUnread(),
    staleTime: 60_000,
    initialData,
  });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task D2: Hook `useUnreadSupportTicketsCount`

**Files:**
- Create: `src/features/Ayuda/hooks/useUnreadSupportTicketsCount.ts`

- [ ] **Step 1: Crear archivo**

```typescript
'use client';

import { useMemo } from 'react';
import { useMyTicketsWithUnread } from './useMyTicketsWithUnread';

/**
 * Cuenta los tickets del usuario con novedades sin leer.
 * Deriva del mismo caché de useMyTicketsWithUnread: no dispara fetch propio.
 */
export function useUnreadSupportTicketsCount(): number {
  const { data } = useMyTicketsWithUnread();
  return useMemo(() => {
    if (!data) return 0;
    return data.filter((t) => t.unread.hasStatusChange || t.unread.hasNewAgentComment).length;
  }, [data]);
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task D3: Hook `useMarkTicketAsReadMutation`

**Files:**
- Create: `src/features/Ayuda/hooks/useMarkTicketAsReadMutation.ts`

- [ ] **Step 1: Crear archivo**

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markSupportTicketAsRead } from '../actions/support-ticket-views';
import { MY_TICKETS_WITH_UNREAD_QUERY_KEY } from './useMyTicketsWithUnread';

export function useMarkTicketAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: number) => markSupportTicketAsRead(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_WITH_UNREAD_QUERY_KEY });
    },
  });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task D4: Hook `useSupportTicketsRealtimeSync`

**Files:**
- Create: `src/features/Ayuda/hooks/useSupportTicketsRealtimeSync.ts`

- [ ] **Step 1: Crear archivo**

```typescript
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MY_TICKETS_WITH_UNREAD_QUERY_KEY } from './useMyTicketsWithUnread';
import type { TaskAppRealtimeEvent } from '@/shared/lib/taskapp/types';
import { Logger } from '@/lib/logger';

const logger = new Logger('features/Ayuda/realtime-sync');

/**
 * Abre un EventSource al proxy SSE de gh_gestion. Cada evento relevante
 * invalida el caché de tickets para forzar un refetch silencioso.
 *
 * EventSource reconecta automáticamente; cualquier error dispara también
 * un refetch de cortesía para no perder cambios durante desconexiones.
 */
export function useSupportTicketsRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource('/api/taskapp/events');

    source.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as TaskAppRealtimeEvent;
        if (event.type === 'ticket.updated' || event.type === 'comment.created') {
          queryClient.invalidateQueries({ queryKey: MY_TICKETS_WITH_UNREAD_QUERY_KEY });
        }
      } catch (error) {
        logger.warn('Failed to parse SSE event', { data: { error } });
      }
    };

    source.onerror = () => {
      // EventSource reintenta solo. Refetch de cortesía por si perdimos eventos.
      logger.debug('SSE error / reconnecting');
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_WITH_UNREAD_QUERY_KEY });
    };

    return () => {
      source.close();
    };
  }, [queryClient]);
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task D5: `SupportTicketsRealtimeProvider`

**Files:**
- Create: `src/features/Ayuda/components/SupportTicketsRealtimeProvider.tsx`

- [ ] **Step 1: Crear archivo**

```typescript
'use client';

import type { ReactNode } from 'react';
import { useSupportTicketsRealtimeSync } from '../hooks/useSupportTicketsRealtimeSync';

export function SupportTicketsRealtimeProvider({ children }: { children: ReactNode }) {
  useSupportTicketsRealtimeSync();
  return <>{children}</>;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

**🛑 Checkpoint D**: Hooks listos. NO commitear sin autorización del usuario.

---

## BLOQUE E — UI

### Task E1: Badge prop en `SidebarLink`

**Files:**
- Modify: `src/features/Layout/sidebar/components/SidebarLink.tsx`

- [ ] **Step 1: Leer el componente actual**

Run: `cat src/features/Layout/sidebar/components/SidebarLink.tsx`

- [ ] **Step 2: Agregar prop `badgeCount` opcional al tipo de props**

Buscar la interface/type de props (ej: `SidebarLinkProps`) y agregar:

```typescript
interface SidebarLinkProps {
  // ...props existentes
  badgeCount?: number;
}
```

- [ ] **Step 3: Render del badge en el JSX**

Localizar el `return (...)` del componente. Junto al label, agregar (ajustar a la estructura real del JSX):

```tsx
{typeof badgeCount === 'number' && badgeCount > 0 && (
  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
    {badgeCount > 9 ? '9+' : badgeCount}
  </span>
)}
```

(Si el proyecto tiene un componente `Badge` de shadcn, usarlo: `<Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-xs">{badgeCount > 9 ? '9+' : badgeCount}</Badge>`.)

- [ ] **Step 4: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task E2: Inyectar count del feature Ayuda en sidebar

**Files:**
- Modify: `src/features/Layout/sidebar/hooks/useSidebarLinks.ts`

- [ ] **Step 1: Leer el hook actual**

Run: `cat src/features/Layout/sidebar/hooks/useSidebarLinks.ts`

- [ ] **Step 2: Agregar consumo del hook de count y mapeo**

En el body del hook, después de obtener `accessibleModules`:

```typescript
import { useUnreadSupportTicketsCount } from '@/features/Ayuda/hooks/useUnreadSupportTicketsCount';

// dentro del hook:
const ayudaUnreadCount = useUnreadSupportTicketsCount();

// donde se devuelven los links, mapear:
return links.map((link) =>
  link.moduleSlug === 'ayuda' ? { ...link, badgeCount: ayudaUnreadCount } : link
);
```

(Adaptar a la estructura real del hook. Si el hook devuelve un objeto en vez de array, ajustar.)

**Nota crítica**: este hook se ejecuta en cualquier ruta del dashboard. `useUnreadSupportTicketsCount` deriva del caché de `useMyTicketsWithUnread`, que necesita haberse fetcheado al menos una vez para tener data. La fuente del fetch inicial es el `SupportTicketsRealtimeProvider` (Task E5) que va en el layout — el provider no fetchea por sí mismo, pero el sidebar al renderizar dispara `useUnreadSupportTicketsCount → useMyTicketsWithUnread → query con queryFn` automáticamente la primera vez.

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task E3: Dot + microcopy en `TicketCard`

**Files:**
- Modify: `src/features/Ayuda/components/TicketCard.tsx`

- [ ] **Step 1: Cambiar tipo del prop `ticket`**

Cambiar la prop `ticket: Ticket` por `ticket: TicketWithUnread`:

```typescript
import type { TicketWithUnread } from '@/shared/lib/taskapp/types';

interface TicketCardProps {
  ticket: TicketWithUnread;
  onClick?: () => void;
  isActive?: boolean;
}
```

- [ ] **Step 2: Calcular microcopy en el cuerpo del componente**

Dentro de `TicketCard`, antes del `return`:

```typescript
const microcopy = ticket.unread.hasNewAgentComment
  ? 'Nueva respuesta'
  : ticket.unread.hasStatusChange
    ? 'Cambio de estado'
    : null;

const hasUnread = ticket.unread.hasStatusChange || ticket.unread.hasNewAgentComment;
```

- [ ] **Step 3: Renderizar el dot + microcopy en el JSX**

Agregar dentro del Card, posicionado absolutamente arriba a la derecha (ajustar según el layout actual del card):

```tsx
{hasUnread && (
  <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
    {microcopy && (
      <span className="text-xs font-medium text-primary">{microcopy}</span>
    )}
  </div>
)}
```

Asegurar que el Card contenedor tenga `position: relative` (la clase Tailwind `relative`).

- [ ] **Step 4: Actualizar el componente padre `MyTicketsList.tsx` para pasar `TicketWithUnread`**

En `src/features/Ayuda/components/MyTicketsList.tsx`, cambiar el tipo de la prop `tickets`:

```typescript
import type { TicketWithUnread } from '@/shared/lib/taskapp/types';

interface MyTicketsListProps {
  tickets: TicketWithUnread[];
  // ...resto
}
```

(Sin cambios al JSX, solo el tipo.)

- [ ] **Step 5: Actualizar `HelpCenter.tsx`**

Cambiar de `useMyTickets` a `useMyTicketsWithUnread`:

```typescript
import { useMyTicketsWithUnread } from '../hooks/useMyTicketsWithUnread';

// dentro del componente:
const { data: tickets, isFetching, refetch } = useMyTicketsWithUnread(initialTickets);
```

(Adaptar el tipo de `initialTickets` que viene del Server Component a `TicketWithUnread[]`.)

- [ ] **Step 6: Actualizar `app/dashboard/help/page.tsx` (Server Component)**

Cambiar de `getMySupportTickets()` a `getMyTicketsWithUnread()`:

```typescript
import { getMyTicketsWithUnread } from '@/features/Ayuda/actions/support-tickets';

// donde antes:
// const initialTickets = await getMySupportTickets();
const initialTickets = await getMyTicketsWithUnread();
```

- [ ] **Step 7: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task E4: Mark as read on open en `TicketDetailSheet`

**Files:**
- Modify: `src/features/Ayuda/components/detail/TicketDetailSheet.tsx`

- [ ] **Step 1: Leer el componente actual**

Run: `cat src/features/Ayuda/components/detail/TicketDetailSheet.tsx`

- [ ] **Step 2: Agregar mutation + useEffect**

Dentro del componente:

```typescript
import { useEffect } from 'react';
import { useMarkTicketAsReadMutation } from '../../hooks/useMarkTicketAsReadMutation';

// dentro del componente, junto a los demás hooks:
const markAsReadMutation = useMarkTicketAsReadMutation();

useEffect(() => {
  if (ticketId != null) {
    markAsReadMutation.mutate(ticketId);
  }
  // intencional: solo queremos disparar cuando ticketId cambia, no por cambios del mutation
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ticketId]);
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

### Task E5: Montar `SupportTicketsRealtimeProvider` en layout

**Files:**
- Modify: `src/app/dashboard/layout.tsx` (o equivalente)

- [ ] **Step 1: Localizar el layout del dashboard**

Run: `Get-ChildItem src/app/dashboard -Filter layout.tsx -Recurse | Select-Object -First 1 -ExpandProperty FullName`

- [ ] **Step 2: Importar y montar el provider**

Modificar el layout:

```typescript
import { SupportTicketsRealtimeProvider } from '@/features/Ayuda/components/SupportTicketsRealtimeProvider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ...lógica existente del layout (auth check, etc.)
  return (
    <SupportTicketsRealtimeProvider>
      {/* JSX existente del layout */}
      {children}
    </SupportTicketsRealtimeProvider>
  );
}
```

(Si el layout existente envuelve con providers de React Query u otros, el `SupportTicketsRealtimeProvider` debe ir DENTRO del provider de React Query — necesita acceso al QueryClient.)

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 4: Smoke test rápido**

```bash
npm run dev
# Abrir http://localhost:3000/dashboard, loguearse
# Abrir DevTools → Network → ver llamada a /api/taskapp/events (status 200, type=eventsource)
# Si conecta y muestra "data: {"type":"connected"}" → OK
```

**🛑 Checkpoint E**: UI completa. NO commitear sin autorización del usuario.

---

## BLOQUE F — Estreno y smoke

### Task F1: Seed script post-deploy (opcional pero recomendado)

**Files:**
- Create: `scripts/seed-support-ticket-views.ts`

- [ ] **Step 1: Crear el script**

```typescript
/**
 * Seed inicial: para cada profile, fetcha sus tickets de TaskApp y crea
 * una fila en support_ticket_views con last_seen_at = now y last_seen_status_id
 * = status actual. Evita que al estrenar la feature todos los tickets viejos
 * aparezcan como "no leídos".
 *
 * Run: npx tsx scripts/seed-support-ticket-views.ts
 */
import { prisma } from '@/shared/lib/prisma';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { Logger } from '@/lib/logger';

const logger = new Logger('scripts/seed-support-ticket-views');

async function main() {
  const profiles = await prisma.profile.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  logger.info(`Found ${profiles.length} profiles to seed`);

  let totalInserts = 0;
  for (const profile of profiles) {
    if (!profile.email) continue;

    try {
      const tickets = await taskAppClient.listTicketsByReporter(profile.email);
      if (tickets.length === 0) continue;

      const data = tickets.map((t) => ({
        user_id: profile.id,
        taskapp_ticket_id: BigInt(t.id),
        last_seen_at: new Date(),
        last_seen_status_id: BigInt(t.status_id),
      }));

      const result = await prisma.support_ticket_views.createMany({
        data,
        skipDuplicates: true,
      });

      totalInserts += result.count;
      logger.info(`Seeded ${result.count} views for ${profile.email}`);
    } catch (error) {
      logger.error(`Failed to seed views for ${profile.email}`, { data: { error } });
    }
  }

  logger.info(`Done. Total inserts: ${totalInserts}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Fatal error', { data: { error: err } });
    process.exit(1);
  });
```

- [ ] **Step 2: Documentar uso en el script (comment header ya lo dice)**

El script se ejecuta UNA vez post-deploy con:

```bash
npx tsx scripts/seed-support-ticket-views.ts
```

(No agregamos npm script porque es one-shot.)

### Task F2: Smoke test manual

- [ ] **Step 1: Levantar backend TaskApp**

```bash
cd C:/Users/Yorda/OneDrive/Escritorio/Workspace/codecontrol/taskApp-backend
docker-compose up -d   # o el comando del proyecto
```

- [ ] **Step 2: Levantar gh_gestion en dev**

```bash
cd C:/Users/Yorda/OneDrive/Escritorio/Workspace/codecontrol/gh_gestion
npm run dev
```

- [ ] **Step 3: Loguearse y validar los 9 casos del spec sección 13.2**

Para cada caso, marcar PASS/FAIL:

1. [ ] Crear un ticket → confirmar que NO aparece como no leído (sin dot, badge no sube).
2. [ ] Cambiar status del ticket en TaskApp (vía MCP postgres-tasks o vía endpoint) → badge sube + dot con texto "Cambio de estado".
3. [ ] Crear un comment como otro usuario en TaskApp → badge sube + texto "Nueva respuesta".
4. [ ] Abrir el ticket en gh → badge baja + dot desaparece.
5. [ ] Comentar yo mismo en mi ticket → badge NO sube.
6. [ ] Abrir 2 tabs simultáneos → confirmar que ambos reaccionan al mismo evento.
7. [ ] Cerrar tab → reabrir → confirmar badge refleja cambios ocurridos durante la ausencia.
8. [ ] Matar TaskApp → confirmar UI degrada (mensaje de error visible o badge en 0, sin white screen).
9. [ ] Matar Supabase (o desconectar prisma) → tickets siguen apareciendo, sin badges.

- [ ] **Step 4: Correr check-types final**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 5: Reportar al usuario los resultados del smoke**

Mostrar la matriz de 9 casos con PASS/FAIL. Si todos PASS, sugerir commit. Si algún FAIL, debuggear con `superpowers:systematic-debugging` antes de cerrar.

**🛑 Checkpoint F**: Feature completa. Listo para review del usuario y autorización de commit/PR/merge.

---

## Self-review

Verifiqué inline:

- **Cobertura del spec**: cada sección del spec (1-17) tiene tarea correspondiente. Sección 11.1 (estreno) → Task F1. Sección 12 (error handling) → cubierto en C2 (try/catch around prisma) y D4 (onerror SSE). Sección 13 (testing) → A2, A4, A9, F2.
- **Sin placeholders**: todos los pasos tienen código completo o comando exacto. Donde hay variabilidad (ej: el patrón de routes de Go), se referencia el archivo a inspeccionar primero.
- **Consistencia de tipos**: `TicketWithUnread`, `TicketUnreadState`, `TaskAppRealtimeEvent`, `MY_TICKETS_WITH_UNREAD_QUERY_KEY` se usan con el mismo nombre en C1, C2, D1-D4, E3.
- **Paths**: todos son absolutos al working dir del repo correspondiente.
- **Bloques desacoplados**: A es independiente de B/C/D/E (puede correr en paralelo en otro repo). C/D/E son secuenciales dentro de gh_gestion. F al final.

## Riesgos conocidos durante ejecución

- **Statuses `approved`/`rejected` pueden no existir** en `task_statuses` de TaskApp. La nota en Task A7 lo cubre — verificar con `psql` y agregar migración SQL si faltan.
- **`getCurrentProfile` puede no existir** con ese nombre exacto en el feature. Task C2 step 2 da alternativa con `supabaseServer()` directo.
- **Layout exacto del dashboard**: Task E5 step 1 lo localiza dinámicamente.
- **`SidebarLink` puede no tener prop pattern aún**: Task E1 step 1 lo inspecciona antes.
- **Route registration pattern en Go**: Task A8 step 1 lo inspecciona antes de wiring.
