# Help Ticket Reopen Request — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al reporter de un ticket en estado terminal (`resolved`/`done`/`closed`) solicitar su reapertura desde gh_gestion con justificación + adjuntos, y permitir a cualquier admin del workspace en TaskApp aprobar o denegar la solicitud (denegación con motivo obligatorio).

**Architecture:** El ticket conserva su status terminal durante la solicitud; el estado activo vive en columnas `reopen_*` de `tasks` y el historial en `ticket_reopen_events`. Tres PRs (taskApp-backend → gh_gestion + taskApp-frontend) coordinados via API pública (`X-Project-Key`) y endpoints internos JWT. SSE y emails existentes se reusan, no se modifican.

**Tech Stack:** Go + chi + Postgres (taskApp-backend) · Next.js 16 + React Query + RHF + Zod + shadcn (gh_gestion) · Vite + React 19 + TanStack Query + shadcn (taskApp-frontend) · S3 storage compartido · SMTP existente.

**Spec:** `docs/superpowers/specs/2026-05-27-help-ticket-reopen-request-design.md`

---

## File Structure

### taskApp-backend (Go)
```
db/migrations/030_add_ticket_reopen_requests.sql              NEW   schema changes
internal/model/task.go                                        EDIT  +reopen_* fields on Task
internal/model/ticket_reopen_event.go                         NEW   model + request structs
internal/repository/task_repository.go                        EDIT  select/update incl. reopen_* cols
internal/repository/ticket_reopen_event_repository.go         NEW   CRUD for reopen events
internal/handler/public_ticket.go                             EDIT  +RequestReopen handler
internal/handler/reopen.go                                    NEW   ApproveReopen + DenyReopen (internal)
internal/service/email.go                                     EDIT  +NotifyReopenRequested + NotifyReopenResolved
internal/service/templates/reopen_requested.html              NEW   HTML email template
internal/service/templates/reopen_resolved.html               NEW   HTML email template
cmd/server/main.go                                            EDIT  wire repo + handler + 3 routes
```

### gh_gestion (TypeScript / Next.js)
```
src/shared/lib/taskapp/types.ts                                              EDIT  +4 reopen_* fields on Ticket
src/shared/lib/taskapp/client.ts                                             EDIT  +requestTicketReopen method
src/features/Ayuda/actions/support-reopen.ts                                 NEW   server action
src/features/Ayuda/hooks/useRequestTicketReopen.ts                           NEW   mutation hook
src/features/Ayuda/components/detail/TicketReopenRequestBanner.tsx           NEW   conditional banner
src/features/Ayuda/components/detail/TicketReopenRequestDialog.tsx           NEW   RHF + Zod form
src/features/Ayuda/components/detail/TicketDetailSheet.tsx                   EDIT  mount banner
src/features/Ayuda/hooks/queryKeys.ts                                        EDIT  +reopen invalidation key (if needed)
cypress/e2e/help/ticket-reopen.cy.ts                                         NEW   E2E happy path
```

### taskApp-frontend (TypeScript / React + Vite)
```
src/types/index.ts                                            EDIT  +4 reopen_* fields on Task
src/api/tickets.ts                                            EDIT  +approveReopen + denyReopen
src/hooks/use-reopen.ts                                       NEW   useApproveReopen + useDenyReopen
src/components/ticket/reopen-request-banner.tsx               NEW   conditional banner
src/components/ticket/approve-reopen-dialog.tsx               NEW   AlertDialog
src/components/ticket/deny-reopen-dialog.tsx                  NEW   Dialog with form
src/pages/ticket-detail.tsx                                   EDIT  mount banner
```

---

## Branch Strategy

Before any code, create one branch per repo:

| Repo | Base | Branch name |
|------|------|-------------|
| taskApp-backend | `main` (or repo default) | `feat/ticket-reopen-request` |
| gh_gestion | `dev` | `feat/ticket-reopen-request` |
| taskApp-frontend | `main` (or repo default) | `feat/ticket-reopen-request` |

PR-1 (backend) must be merged AND DEPLOYED to the environment used by the other two repos before PR-2 and PR-3 can be tested end-to-end. PR-2 and PR-3 can be developed in parallel after PR-1 is deployed.

---

# PR-1 · taskApp-backend

## Task 1: Database migration

**Files:**
- Create: `db/migrations/030_add_ticket_reopen_requests.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 030_add_ticket_reopen_requests.sql
-- Adds support for reopen requests on closed tickets.
-- Active request state lives on `tasks.reopen_*` columns; history lives in `ticket_reopen_events`.

BEGIN;

-- Active reopen request state (one active per ticket; NULL when none)
ALTER TABLE tasks
  ADD COLUMN reopen_status VARCHAR(20),
  ADD COLUMN reopen_reason TEXT,
  ADD COLUMN reopen_attachments TEXT[],
  ADD COLUMN reopen_requested_at TIMESTAMP,
  ADD COLUMN reopen_requested_by VARCHAR(255),
  ADD COLUMN pre_reopen_status_id BIGINT;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_reopen_status_check
  CHECK (reopen_status IS NULL OR reopen_status = 'pending');

-- Immutable history of every reopen request and its resolution.
CREATE TABLE ticket_reopen_events (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  requested_at TIMESTAMP NOT NULL,
  requested_by_email VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  attachments TEXT[],
  pre_reopen_status_id BIGINT NOT NULL,
  resolution VARCHAR(20),
  resolved_at TIMESTAMP,
  resolved_by_email VARCHAR(255),
  denial_reason TEXT,
  CONSTRAINT reopen_events_resolution_check
    CHECK (resolution IS NULL OR resolution IN ('approved', 'denied')),
  CONSTRAINT reopen_events_denial_requires_reason
    CHECK (resolution <> 'denied' OR denial_reason IS NOT NULL),
  CONSTRAINT reopen_events_resolved_columns_together
    CHECK (
      (resolution IS NULL AND resolved_at IS NULL AND resolved_by_email IS NULL)
      OR
      (resolution IS NOT NULL AND resolved_at IS NOT NULL AND resolved_by_email IS NOT NULL)
    )
);

CREATE INDEX idx_ticket_reopen_events_task_id_requested_at
  ON ticket_reopen_events (task_id, requested_at DESC);

COMMIT;
```

- [ ] **Step 2: Apply locally**

Run: `psql $LOCAL_DATABASE_URL -f db/migrations/030_add_ticket_reopen_requests.sql`
Expected: `BEGIN`, six `ALTER TABLE`s, `CREATE TABLE`, `CREATE INDEX`, `COMMIT`. No errors.

- [ ] **Step 3: Verify**

Run: `psql $LOCAL_DATABASE_URL -c "\d tasks" | grep reopen` — should list the 6 new columns.
Run: `psql $LOCAL_DATABASE_URL -c "\d ticket_reopen_events"` — should show the new table with 11 columns and 3 CHECK constraints.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/030_add_ticket_reopen_requests.sql
git commit -m "feat(reopen): add tasks reopen columns and ticket_reopen_events table"
```

---

## Task 2: Extend Task model

**Files:**
- Modify: `internal/model/task.go`

- [ ] **Step 1: Add fields to Task struct**

In `internal/model/task.go`, append the following fields to the `Task` struct (after `ApproverEmail`, before `Labels`):

```go
ReopenStatus       *string    `json:"reopen_status"`
ReopenReason       *string    `json:"reopen_reason"`
ReopenAttachments  []string   `json:"reopen_attachments"`
ReopenRequestedAt  *time.Time `json:"reopen_requested_at"`
ReopenRequestedBy  *string    `json:"reopen_requested_by"`
PreReopenStatusID  *int64     `json:"pre_reopen_status_id,omitempty"`
```

- [ ] **Step 2: Verify compilation**

Run: `go build ./...`
Expected: builds OK (Task struct used in many places, this is purely additive).

- [ ] **Step 3: Commit**

```bash
git add internal/model/task.go
git commit -m "feat(reopen): extend Task model with reopen request fields"
```

---

## Task 3: Create TicketReopenEvent model

**Files:**
- Create: `internal/model/ticket_reopen_event.go`

- [ ] **Step 1: Write the model**

```go
package model

import "time"

// TicketReopenEvent records a single reopen request and its resolution.
// One row is inserted at request time (resolution NULL); the same row is
// updated when an admin approves or denies.
type TicketReopenEvent struct {
	ID                 int64      `json:"id"`
	TaskID             int64      `json:"task_id"`
	RequestedAt        time.Time  `json:"requested_at"`
	RequestedByEmail   string     `json:"requested_by_email"`
	Reason             string     `json:"reason"`
	Attachments        []string   `json:"attachments"`
	PreReopenStatusID  int64      `json:"pre_reopen_status_id"`
	Resolution         *string    `json:"resolution"`
	ResolvedAt         *time.Time `json:"resolved_at"`
	ResolvedByEmail    *string    `json:"resolved_by_email"`
	DenialReason       *string    `json:"denial_reason"`
}

// RequestReopenRequest is the body of POST /api/public/v1/tickets/{id}/request-reopen.
type RequestReopenRequest struct {
	ReporterEmail string   `json:"reporter_email"`
	Reason        string   `json:"reason"`
	Attachments   []string `json:"attachments"`
}

// DenyReopenRequest is the body of POST /api/tasks/{id}/deny-reopen.
type DenyReopenRequest struct {
	DenialReason string `json:"denial_reason"`
}
```

- [ ] **Step 2: Verify compilation**

Run: `go build ./...`
Expected: builds OK.

- [ ] **Step 3: Commit**

```bash
git add internal/model/ticket_reopen_event.go
git commit -m "feat(reopen): add TicketReopenEvent model and request DTOs"
```

---

## Task 4: TicketReopenEventRepository

**Files:**
- Create: `internal/repository/ticket_reopen_event_repository.go`

- [ ] **Step 1: Write the repository**

Use the existing repository pattern in this repo (database/sql + parameterised queries, no ORM). Match the style of `internal/repository/task_repository.go` for connection handling and error wrapping.

```go
package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/lib/pq"

	"taskapp/internal/model"
)

type TicketReopenEventRepository struct {
	db *sql.DB
}

func NewTicketReopenEventRepository(db *sql.DB) *TicketReopenEventRepository {
	return &TicketReopenEventRepository{db: db}
}

// Create inserts a new pending request and returns the inserted row id.
func (r *TicketReopenEventRepository) Create(taskID int64, requestedByEmail, reason string, attachments []string, preReopenStatusID int64) (*model.TicketReopenEvent, error) {
	const q = `
		INSERT INTO ticket_reopen_events
		  (task_id, requested_at, requested_by_email, reason, attachments, pre_reopen_status_id)
		VALUES ($1, NOW(), $2, $3, $4, $5)
		RETURNING id, requested_at
	`
	ev := &model.TicketReopenEvent{
		TaskID:            taskID,
		RequestedByEmail:  requestedByEmail,
		Reason:            reason,
		Attachments:       attachments,
		PreReopenStatusID: preReopenStatusID,
	}
	if err := r.db.QueryRow(q, taskID, requestedByEmail, reason, pq.Array(attachments), preReopenStatusID).
		Scan(&ev.ID, &ev.RequestedAt); err != nil {
		return nil, err
	}
	return ev, nil
}

// Resolve updates the latest pending event for a task with the given resolution.
// Returns ErrNoActiveRequest if no pending event exists (race-safe).
var ErrNoActiveRequest = errors.New("no active reopen request")

func (r *TicketReopenEventRepository) Resolve(taskID int64, resolution string, resolvedByEmail string, denialReason *string) error {
	const q = `
		UPDATE ticket_reopen_events
		SET resolution = $1,
		    resolved_at = NOW(),
		    resolved_by_email = $2,
		    denial_reason = $3
		WHERE task_id = $4
		  AND resolution IS NULL
	`
	res, err := r.db.Exec(q, resolution, resolvedByEmail, denialReason, taskID)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNoActiveRequest
	}
	return nil
}

// GetActiveByTaskID returns the pending event for a task, or nil if none.
func (r *TicketReopenEventRepository) GetActiveByTaskID(taskID int64) (*model.TicketReopenEvent, error) {
	const q = `
		SELECT id, task_id, requested_at, requested_by_email, reason,
		       COALESCE(attachments, '{}'), pre_reopen_status_id,
		       resolution, resolved_at, resolved_by_email, denial_reason
		FROM ticket_reopen_events
		WHERE task_id = $1 AND resolution IS NULL
		ORDER BY requested_at DESC
		LIMIT 1
	`
	ev := &model.TicketReopenEvent{}
	var attachments pq.StringArray
	var resolvedAt sql.NullTime
	var resolvedByEmail, denialReason, resolution sql.NullString
	err := r.db.QueryRow(q, taskID).Scan(
		&ev.ID, &ev.TaskID, &ev.RequestedAt, &ev.RequestedByEmail, &ev.Reason,
		&attachments, &ev.PreReopenStatusID,
		&resolution, &resolvedAt, &resolvedByEmail, &denialReason,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	ev.Attachments = []string(attachments)
	if resolution.Valid {
		v := resolution.String
		ev.Resolution = &v
	}
	if resolvedAt.Valid {
		t := resolvedAt.Time.UTC()
		ev.ResolvedAt = &t
	}
	if resolvedByEmail.Valid {
		v := resolvedByEmail.String
		ev.ResolvedByEmail = &v
	}
	if denialReason.Valid {
		v := denialReason.String
		ev.DenialReason = &v
	}
	_ = time.Now // keep time import in case downstream tests need it
	return ev, nil
}
```

- [ ] **Step 2: Verify compilation**

Run: `go build ./...`
Expected: builds OK.

- [ ] **Step 3: Commit**

```bash
git add internal/repository/ticket_reopen_event_repository.go
git commit -m "feat(reopen): add ticket reopen event repository"
```

---

## Task 5: Extend TaskRepository to read/write reopen_* columns

**Files:**
- Modify: `internal/repository/task_repository.go`

- [ ] **Step 1: Read the existing file**

Read `internal/repository/task_repository.go` end-to-end to find every `SELECT` from `tasks` and every `UPDATE tasks`. There are several (GetByID, GetByIDAndProjectID, List, Create, Update, etc.).

- [ ] **Step 2: Add reopen_* columns to SELECT lists**

For every SELECT against `tasks`, add these columns to the column list (in this order, at the end):

```
reopen_status, reopen_reason, COALESCE(reopen_attachments, '{}'), reopen_requested_at, reopen_requested_by, pre_reopen_status_id
```

For every `Scan(...)` of a `Task`, add the matching destinations:

```go
var reopenStatus, reopenReason, reopenRequestedBy sql.NullString
var reopenAttachments pq.StringArray
var reopenRequestedAt sql.NullTime
var preReopenStatusID sql.NullInt64

// in Scan(...):
&reopenStatus, &reopenReason, &reopenAttachments, &reopenRequestedAt, &reopenRequestedBy, &preReopenStatusID,

// after Scan, hydrate:
if reopenStatus.Valid { v := reopenStatus.String; task.ReopenStatus = &v }
if reopenReason.Valid { v := reopenReason.String; task.ReopenReason = &v }
task.ReopenAttachments = []string(reopenAttachments)
if reopenRequestedAt.Valid { t := reopenRequestedAt.Time.UTC(); task.ReopenRequestedAt = &t }
if reopenRequestedBy.Valid { v := reopenRequestedBy.String; task.ReopenRequestedBy = &v }
if preReopenStatusID.Valid { v := preReopenStatusID.Int64; task.PreReopenStatusID = &v }
```

- [ ] **Step 3: Add a new helper `UpdateReopenFields`**

Append to `internal/repository/task_repository.go`:

```go
// UpdateReopenFields sets all six reopen_* columns atomically.
// Pass nil pointers to clear (used after approve/deny).
func (r *TaskRepository) UpdateReopenFields(taskID int64, status *string, reason *string, attachments []string, requestedBy *string, preStatusID *int64) error {
	const q = `
		UPDATE tasks
		SET reopen_status = $1,
		    reopen_reason = $2,
		    reopen_attachments = $3,
		    reopen_requested_at = CASE WHEN $1::varchar IS NULL THEN NULL ELSE NOW() END,
		    reopen_requested_by = $4,
		    pre_reopen_status_id = $5,
		    updated_at = NOW()
		WHERE id = $6
	`
	var attachmentsArg interface{}
	if attachments == nil {
		attachmentsArg = nil
	} else {
		attachmentsArg = pq.Array(attachments)
	}
	_, err := r.db.Exec(q, status, reason, attachmentsArg, requestedBy, preStatusID, taskID)
	return err
}
```

- [ ] **Step 4: Verify compilation and existing tests**

Run: `go build ./...`
Expected: builds OK.

Run: `go test ./internal/repository/...`
Expected: existing tests pass (we did not change behaviour for non-reopen fields).

- [ ] **Step 5: Commit**

```bash
git add internal/repository/task_repository.go
git commit -m "feat(reopen): teach TaskRepository to load and update reopen_* columns"
```

---

## Task 6: Public handler — RequestReopen

**Files:**
- Modify: `internal/handler/public_ticket.go`
- Modify: `cmd/server/main.go` (wire repo into handler)

- [ ] **Step 1: Inject the new repo into PublicTicketHandler**

Read the constructor of `PublicTicketHandler` in `internal/handler/public_ticket.go`. Add a new field:

```go
reopenRepo *repository.TicketReopenEventRepository
```

Update the constructor signature to accept it (last param) and assign in the struct literal.

- [ ] **Step 2: Add the handler method**

Append to `internal/handler/public_ticket.go`:

```go
// RequestReopen creates a pending reopen request on a terminal-status widget ticket.
func (h *PublicTicketHandler) RequestReopen(w http.ResponseWriter, r *http.Request) {
	projectID := middleware.GetProjectID(r)
	ownerID := middleware.GetProjectOwnerID(r)

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid ticket id")
		return
	}

	var req model.RequestReopenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.ReporterEmail == "" {
		writeError(w, http.StatusBadRequest, "reporter_email is required")
		return
	}
	if l := len(req.Reason); l < 20 || l > 2000 {
		writeError(w, http.StatusBadRequest, "reason must be between 20 and 2000 characters")
		return
	}
	if len(req.Attachments) > 3 {
		writeError(w, http.StatusBadRequest, "at most 3 attachments allowed")
		return
	}

	task, err := h.taskRepo.GetByIDAndProjectID(id, projectID)
	if err != nil || task == nil || task.Source != "widget" {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}
	if task.ReporterEmail == nil || *task.ReporterEmail != req.ReporterEmail {
		writeError(w, http.StatusForbidden, "reporter_email does not match ticket reporter")
		return
	}

	if status, err := h.statusRepo.GetByID(task.StatusID); err == nil && status != nil {
		task.Status = status
	}
	if task.Status == nil {
		writeError(w, http.StatusInternalServerError, "ticket has no status")
		return
	}
	allowed := map[string]bool{"resolved": true, "done": true, "closed": true}
	if !allowed[task.Status.Slug] {
		writeError(w, http.StatusConflict, "cannot reopen a ticket in this status")
		return
	}
	if task.ReopenStatus != nil && *task.ReopenStatus == "pending" {
		writeError(w, http.StatusConflict, "there is already an active reopen request")
		return
	}

	// Insert event row first; if anything fails afterwards we want this row visible
	// (it is the canonical history; we update tasks last).
	if _, err := h.reopenRepo.Create(task.ID, req.ReporterEmail, req.Reason, req.Attachments, task.StatusID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record reopen request")
		return
	}
	pendingStatus := "pending"
	preStatusID := task.StatusID
	if err := h.taskRepo.UpdateReopenFields(task.ID, &pendingStatus, &req.Reason, req.Attachments, &req.ReporterEmail, &preStatusID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update ticket")
		return
	}

	// Reload task so the response reflects the new fields.
	task, _ = h.taskRepo.GetByIDAndProjectID(task.ID, projectID)
	if task != nil {
		if status, err := h.statusRepo.GetByID(task.StatusID); err == nil && status != nil {
			task.Status = status
		}
		task.Attachments = h.resolveAttachmentURLs(task.Attachments)
		task.ReopenAttachments = h.resolveAttachmentURLs(task.ReopenAttachments)
	}

	if h.emailService != nil {
		project := middleware.GetProject(r)
		go h.emailService.NotifyReopenRequested(task, project)
	}
	if h.hub != nil && task != nil && task.WorkspaceID != nil {
		h.hub.Broadcast(*task.WorkspaceID, ownerID, realtime.Event{Type: "task.updated", ID: task.ID})
	}
	if h.publicHub != nil && task != nil && task.ReporterEmail != nil {
		h.publicHub.Broadcast(*task.ReporterEmail, realtime.Event{Type: "ticket.updated", ID: task.ID})
	}

	writeJSON(w, http.StatusOK, task)
}
```

- [ ] **Step 3: Wire repo and route in main.go**

In `cmd/server/main.go`:

Near the other repository constructions:
```go
ticketReopenRepo := repository.NewTicketReopenEventRepository(db)
```

Pass it to `NewPublicTicketHandler(...)` as the last argument.

In the `/api/public/v1` route group (lines 312–325), add:
```go
r.Post("/tickets/{id}/request-reopen", publicTicketHandler.RequestReopen)
```

- [ ] **Step 4: Verify compilation**

Run: `go build ./...`
Expected: builds OK.

- [ ] **Step 5: Commit**

```bash
git add internal/handler/public_ticket.go cmd/server/main.go
git commit -m "feat(reopen): add public POST /tickets/{id}/request-reopen endpoint"
```

---

## Task 7: Internal handlers — ApproveReopen and DenyReopen

**Files:**
- Create: `internal/handler/reopen.go`
- Modify: `cmd/server/main.go` (wire handler + routes)

- [ ] **Step 1: Write the handler file**

```go
package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"taskapp/internal/middleware"
	"taskapp/internal/model"
	"taskapp/internal/realtime"
	"taskapp/internal/repository"
	"taskapp/internal/service"
)

type ReopenHandler struct {
	taskRepo     *repository.TaskRepository
	statusRepo   *repository.TaskStatusRepository
	reopenRepo   *repository.TicketReopenEventRepository
	commentRepo  *repository.CommentRepository
	emailService *service.EmailService
	hub          *realtime.Hub
	publicHub    *realtime.PublicHub
}

func NewReopenHandler(
	taskRepo *repository.TaskRepository,
	statusRepo *repository.TaskStatusRepository,
	reopenRepo *repository.TicketReopenEventRepository,
	commentRepo *repository.CommentRepository,
	emailService *service.EmailService,
	hub *realtime.Hub,
	publicHub *realtime.PublicHub,
) *ReopenHandler {
	return &ReopenHandler{
		taskRepo:     taskRepo,
		statusRepo:   statusRepo,
		reopenRepo:   reopenRepo,
		commentRepo:  commentRepo,
		emailService: emailService,
		hub:          hub,
		publicHub:    publicHub,
	}
}

func (h *ReopenHandler) Approve(w http.ResponseWriter, r *http.Request) {
	h.resolve(w, r, true, "")
}

func (h *ReopenHandler) Deny(w http.ResponseWriter, r *http.Request) {
	var req model.DenyReopenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if l := len(req.DenialReason); l < 10 || l > 1000 {
		writeError(w, http.StatusBadRequest, "denial_reason must be between 10 and 1000 characters")
		return
	}
	h.resolve(w, r, false, req.DenialReason)
}

func (h *ReopenHandler) resolve(w http.ResponseWriter, r *http.Request, approved bool, denialReason string) {
	user := middleware.GetUser(r)
	if user == nil || user.Email == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid ticket id")
		return
	}

	task, err := h.taskRepo.GetByID(id)
	if err != nil || task == nil {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}
	if task.ReopenStatus == nil || *task.ReopenStatus != "pending" {
		writeError(w, http.StatusConflict, "no active reopen request")
		return
	}
	// Workspace gating: user must belong to the same workspace.
	if task.WorkspaceID == nil || !middleware.UserHasWorkspaceAccess(r, *task.WorkspaceID) {
		writeError(w, http.StatusForbidden, "not authorized for this workspace")
		return
	}

	// 1. Resolve the event row (idempotent guard against double-click / race).
	var denial *string
	resolution := "approved"
	if !approved {
		resolution = "denied"
		denial = &denialReason
	}
	if err := h.reopenRepo.Resolve(task.ID, resolution, user.Email, denial); err != nil {
		if err == repository.ErrNoActiveRequest {
			writeError(w, http.StatusConflict, "no active reopen request")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to resolve reopen")
		return
	}

	// 2. Clear reopen_* columns on the task. On approval also move status to in_progress.
	if err := h.taskRepo.UpdateReopenFields(task.ID, nil, nil, nil, nil, nil); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to clear reopen fields")
		return
	}
	if approved {
		target, err := h.statusRepo.GetBySlug("in_progress")
		if err != nil || target == nil {
			writeError(w, http.StatusInternalServerError, "in_progress status not found")
			return
		}
		task.StatusID = target.ID
		task.Status = target
		task.ResolvedAt = nil
		if err := h.taskRepo.Update(task); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to reopen ticket")
			return
		}
	}

	// 3. Auto-post a public comment (author_email = NULL → renders as "Sistema").
	var body string
	if approved {
		body = "Solicitud de reapertura aprobada por " + user.Email + ". El ticket vuelve a En curso."
	} else {
		body = "Solicitud de reapertura denegada por " + user.Email + ". Motivo: " + denialReason
	}
	_, _ = h.commentRepo.Create(&model.Comment{
		TaskID:     task.ID,
		AuthorID:   nil,
		AuthorEmail: nil,
		Body:       body,
		IsInternal: false,
	})

	// 4. Reload for response.
	task, _ = h.taskRepo.GetByID(task.ID)
	if task != nil {
		if status, err := h.statusRepo.GetByID(task.StatusID); err == nil && status != nil {
			task.Status = status
		}
	}

	// 5. Side effects.
	if h.emailService != nil && task != nil {
		go h.emailService.NotifyReopenResolved(task, approved, denialReason)
	}
	if h.hub != nil && task != nil && task.WorkspaceID != nil {
		h.hub.Broadcast(*task.WorkspaceID, 0, realtime.Event{Type: "task.updated", ID: task.ID})
	}
	if h.publicHub != nil && task != nil && task.ReporterEmail != nil {
		h.publicHub.Broadcast(*task.ReporterEmail, realtime.Event{Type: "ticket.updated", ID: task.ID})
	}

	writeJSON(w, http.StatusOK, task)
}
```

> **Note on `middleware.UserHasWorkspaceAccess`**: if a helper with that exact name does not exist, look in `internal/middleware/` for the equivalent (e.g. a `GetUserWorkspaces` returning a slice and check membership inline). The spec says "any internal user of the workspace"; adapt the check to whatever the existing JWT middleware exposes. Do not invent new auth — reuse what's already wired.

- [ ] **Step 2: Wire handler + routes in main.go**

```go
// Near other handler constructions:
reopenHandler := handler.NewReopenHandler(
	taskRepo, statusRepo, ticketReopenRepo, commentRepo,
	emailService, hub, publicHub,
)
```

In the authenticated `/api/tasks` group (find the existing routes for `/api/tasks/{id}`), add:
```go
r.Post("/tasks/{id}/approve-reopen", reopenHandler.Approve)
r.Post("/tasks/{id}/deny-reopen", reopenHandler.Deny)
```

- [ ] **Step 3: Verify compilation**

Run: `go build ./...`
Expected: builds OK.

- [ ] **Step 4: Commit**

```bash
git add internal/handler/reopen.go cmd/server/main.go
git commit -m "feat(reopen): add internal approve-reopen and deny-reopen handlers"
```

---

## Task 8: Email templates

**Files:**
- Create: `internal/service/templates/reopen_requested.html`
- Create: `internal/service/templates/reopen_resolved.html`

- [ ] **Step 1: Write `reopen_requested.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Solicitud de reapertura — TKT-{{.TicketID}}</title>
</head>
<body style="font-family: -apple-system, system-ui, sans-serif; color: #1f2937;">
  <h2 style="color: #d97706;">Nueva solicitud de reapertura</h2>
  <p>El reporter <strong>{{.ReporterEmail}}</strong> solicitó reabrir el ticket:</p>
  <p style="font-size: 18px;"><strong>TKT-{{.TicketID}} · {{.Title}}</strong></p>
  <h3>Motivo</h3>
  <blockquote style="border-left: 3px solid #d97706; padding: 8px 12px; background: #fff7ed; white-space: pre-wrap;">{{.Reason}}</blockquote>
  {{if .Attachments}}
  <h3>Adjuntos</h3>
  <ul>
    {{range .Attachments}}
    <li><a href="{{.}}">{{.}}</a></li>
    {{end}}
  </ul>
  {{end}}
  <p style="margin-top: 24px;">
    <a href="{{.TicketURL}}" style="background: #2563eb; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px;">
      Revisar solicitud
    </a>
  </p>
</body>
</html>
```

- [ ] **Step 2: Write `reopen_resolved.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Solicitud de reapertura — TKT-{{.TicketID}}</title>
</head>
<body style="font-family: -apple-system, system-ui, sans-serif; color: #1f2937;">
  {{if .Approved}}
  <h2 style="color: #059669;">Tu solicitud fue aprobada</h2>
  <p>El ticket <strong>TKT-{{.TicketID}} · {{.Title}}</strong> fue reabierto y volvió a estar <strong>En curso</strong>.</p>
  {{else}}
  <h2 style="color: #b91c1c;">Tu solicitud fue denegada</h2>
  <p>No pudimos reabrir el ticket <strong>TKT-{{.TicketID}} · {{.Title}}</strong>.</p>
  <h3>Motivo</h3>
  <blockquote style="border-left: 3px solid #b91c1c; padding: 8px 12px; background: #fef2f2; white-space: pre-wrap;">{{.DenialReason}}</blockquote>
  {{end}}
  <p style="margin-top: 24px;">
    <a href="{{.TicketURL}}" style="background: #2563eb; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px;">
      Ver el ticket
    </a>
  </p>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add internal/service/templates/reopen_requested.html internal/service/templates/reopen_resolved.html
git commit -m "feat(reopen): add email templates for request and resolution"
```

---

## Task 9: Email service methods

**Files:**
- Modify: `internal/service/email.go`

- [ ] **Step 1: Read the existing file** to find the pattern used by `NotifyTicketValorized` and `NotifyStatusChanged` (template loading, SMTP send, goroutine wrapper, recipient lookup).

- [ ] **Step 2: Add `NotifyReopenRequested`**

```go
// NotifyReopenRequested emails all internal users of the workspace when a reopen
// request is created. Best-effort, never blocks.
func (s *EmailService) NotifyReopenRequested(task *model.Task, project *model.Project) {
	if task == nil || task.WorkspaceID == nil {
		return
	}
	recipients, err := s.userRepo.ListEmailsByWorkspace(*task.WorkspaceID)
	if err != nil || len(recipients) == 0 {
		return
	}
	data := struct {
		TicketID      int64
		Title         string
		ReporterEmail string
		Reason        string
		Attachments   []string
		TicketURL     string
	}{
		TicketID:      task.ID,
		Title:         task.Title,
		ReporterEmail: deref(task.ReopenRequestedBy),
		Reason:        deref(task.ReopenReason),
		Attachments:   task.ReopenAttachments,
		TicketURL:     s.ticketURLFor(task),
	}
	body, err := s.renderTemplate("reopen_requested.html", data)
	if err != nil {
		log.Printf("reopen email template render failed: %v", err)
		return
	}
	subject := fmt.Sprintf("Solicitud de reapertura — TKT-%d: %s", task.ID, task.Title)
	for _, to := range recipients {
		_ = s.send(to, subject, body)
	}
}
```

- [ ] **Step 3: Add `NotifyReopenResolved`**

```go
// NotifyReopenResolved emails the reporter when an admin approves or denies the request.
func (s *EmailService) NotifyReopenResolved(task *model.Task, approved bool, denialReason string) {
	if task == nil || task.ReporterEmail == nil || *task.ReporterEmail == "" {
		return
	}
	data := struct {
		TicketID     int64
		Title        string
		Approved     bool
		DenialReason string
		TicketURL    string
	}{
		TicketID:     task.ID,
		Title:        task.Title,
		Approved:     approved,
		DenialReason: denialReason,
		TicketURL:    s.ticketURLFor(task),
	}
	body, err := s.renderTemplate("reopen_resolved.html", data)
	if err != nil {
		log.Printf("reopen-resolved email template render failed: %v", err)
		return
	}
	suffix := "(aprobada)"
	if !approved {
		suffix = "(denegada)"
	}
	subject := fmt.Sprintf("Tu solicitud de reapertura — TKT-%d %s", task.ID, suffix)
	_ = s.send(*task.ReporterEmail, subject, body)
}

// deref returns the value of a *string, or "" if nil.
func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
```

> **Note**: the helpers `s.userRepo.ListEmailsByWorkspace`, `s.renderTemplate`, `s.send`, `s.ticketURLFor` are placeholders for whatever the existing service exposes. Read the file and adapt names exactly. If `ticketURLFor` does not exist, build the URL from `BASE_URL + "/tickets/" + task.ID`.

- [ ] **Step 4: Verify compilation**

Run: `go build ./...`
Expected: builds OK.

- [ ] **Step 5: Commit**

```bash
git add internal/service/email.go
git commit -m "feat(reopen): add email notifications for reopen request and resolution"
```

---

## Task 10: Backend integration test — happy path

**Files:**
- Create: `internal/handler/reopen_integration_test.go`

- [ ] **Step 1: Write the test**

Use the same testing approach as existing integration tests in the repo (httptest server, real DB or testcontainers if that's the convention). Skeleton:

```go
package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"taskapp/internal/testutil" // adjust to the actual test helper package
)

func TestReopenRequest_HappyPath(t *testing.T) {
	srv := testutil.NewServer(t) // sets up DB, seeded statuses, etc.
	defer srv.Close()

	// 1. Create a widget ticket via public API.
	ticketID := testutil.SeedWidgetTicket(t, srv, "reporter@example.com")

	// 2. Mark it resolved.
	testutil.MoveTicketToStatus(t, srv, ticketID, "resolved")

	// 3. Request reopen.
	body, _ := json.Marshal(map[string]interface{}{
		"reporter_email": "reporter@example.com",
		"reason":         "El error volvió a aparecer al hacer login otra vez.",
		"attachments":    []string{},
	})
	req := httptest.NewRequest("POST", "/api/public/v1/tickets/"+itoa(ticketID)+"/request-reopen", bytes.NewReader(body))
	req.Header.Set("X-Project-Key", testutil.ProjectKey)
	rr := httptest.NewRecorder()
	srv.Handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK { t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String()) }

	// 4. Verify reopen_status is 'pending'.
	ticket := testutil.GetTicket(t, srv, ticketID)
	if ticket.ReopenStatus == nil || *ticket.ReopenStatus != "pending" {
		t.Fatalf("expected reopen_status=pending, got %v", ticket.ReopenStatus)
	}

	// 5. Admin approves.
	req = httptest.NewRequest("POST", "/api/tasks/"+itoa(ticketID)+"/approve-reopen", nil)
	testutil.AuthAsAdmin(t, req)
	rr = httptest.NewRecorder()
	srv.Handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK { t.Fatalf("approve expected 200, got %d", rr.Code) }

	// 6. Verify ticket is now in_progress and reopen_* cleared.
	ticket = testutil.GetTicket(t, srv, ticketID)
	if ticket.Status.Slug != "in_progress" { t.Fatalf("expected in_progress, got %s", ticket.Status.Slug) }
	if ticket.ReopenStatus != nil { t.Fatalf("reopen_status not cleared") }

	// 7. Verify the auto-generated comment exists.
	comments := testutil.ListComments(t, srv, ticketID)
	found := false
	for _, c := range comments {
		if c.AuthorEmail == nil && strings.Contains(c.Body, "aprobada") {
			found = true
		}
	}
	if !found { t.Fatalf("expected auto-generated comment with author=null and 'aprobada' body") }
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
```

> If `internal/testutil` does not exist, write minimal helpers inline in this test file. The key is that the test exercises the full HTTP path.

- [ ] **Step 2: Run the test**

Run: `go test ./internal/handler/ -run TestReopenRequest_HappyPath -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add internal/handler/reopen_integration_test.go
git commit -m "test(reopen): integration test for request + approve happy path"
```

---

## Task 11: PR-1 — push and open PR

- [ ] **Step 1: Verify all green**

Run: `go build ./...`
Run: `go test ./...`
Expected: both succeed.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/ticket-reopen-request
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "feat(reopen): backend support for ticket reopen requests" --body "$(cat <<'EOF'
## Summary
- Adds `reopen_*` columns to `tasks` and a `ticket_reopen_events` history table.
- New public endpoint `POST /api/public/v1/tickets/{id}/request-reopen` for the widget/gh_gestion to consume.
- New internal endpoints `POST /api/tasks/{id}/approve-reopen` and `/deny-reopen`.
- Email notifications and SSE broadcasts wired to the existing infra (no new transports).
- Spec: see gh_gestion `docs/superpowers/specs/2026-05-27-help-ticket-reopen-request-design.md`.

## Test plan
- [ ] Migration applies cleanly on a fresh DB.
- [ ] `go test ./...` passes.
- [ ] Manual: hit `request-reopen` against a `resolved` widget ticket; verify event row + tasks columns.
- [ ] Manual: hit `approve-reopen` as an admin; verify status moves to `in_progress`, comment auto-posted, email fired.
- [ ] Manual: hit `deny-reopen` with `denial_reason`; verify status unchanged, comment auto-posted, email fired.
EOF
)"
```

- [ ] **Step 4: Wait for review + deploy**

Block on merge + deploy of PR-1 to the environment used by gh_gestion. PR-2 and PR-3 are blocked until this is live.

---

# PR-2 · gh_gestion

> **Prerequisites**: PR-1 must be merged AND DEPLOYED before this PR can be tested end-to-end (`npm run dev` will start, but the new endpoint will 404 on the deployed taskApp-backend until PR-1 is live there).

Branch: already on `feat/maintenance-request-description`. Switch and create a new branch:

```bash
git checkout dev
git pull
git checkout -b feat/ticket-reopen-request
```

## Task 12: Extend Ticket type

**Files:**
- Modify: `src/shared/lib/taskapp/types.ts:33`

- [ ] **Step 1: Add four fields to the Ticket interface**

In `src/shared/lib/taskapp/types.ts`, after the `labels` field of `Ticket`, add:

```ts
  reopen_status: 'pending' | null;
  reopen_reason: string | null;
  reopen_attachments: string[]; // signed URLs (15-min TTL), like `attachments`
  reopen_requested_at: string | null;
```

The full extended interface:

```ts
export interface Ticket {
  id: number;
  title: string;
  description: string;
  status_id: number;
  status?: TicketStatus;
  priority: TicketPriority;
  reporter_email: string | null;
  reporter_name: string | null;
  approver_email: string | null;
  estimated_hours: number | null;
  attachments: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  labels: TicketLabel[];
  reopen_status: 'pending' | null;
  reopen_reason: string | null;
  reopen_attachments: string[];
  reopen_requested_at: string | null;
}
```

- [ ] **Step 2: Verify type check**

Run: `npm run check-types`
Expected: PASS (TS may complain about consumers that destructure `Ticket` — investigate any error and add safe `?? null` / `?? []` defaults where needed).

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/taskapp/types.ts
git commit -m "feat(reopen): extend Ticket type with reopen request fields"
```

---

## Task 13: Add `requestTicketReopen` to client

**Files:**
- Modify: `src/shared/lib/taskapp/client.ts`

- [ ] **Step 1: Append the method to the `taskAppClient` object**

After `attachToTicket`:

```ts
  requestTicketReopen: (
    ticketId: number,
    reporterEmail: string,
    reason: string,
    attachmentKeys: string[]
  ) =>
    request<Ticket>(`/tickets/${ticketId}/request-reopen`, {
      method: 'POST',
      body: JSON.stringify({
        reporter_email: reporterEmail,
        reason,
        attachments: attachmentKeys,
      }),
    }),
```

- [ ] **Step 2: Verify type check**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/taskapp/client.ts
git commit -m "feat(reopen): add requestTicketReopen method to taskApp client"
```

---

## Task 14: Server action

**Files:**
- Create: `src/features/Ayuda/actions/support-reopen.ts`

- [ ] **Step 1: Write the file**

```ts
'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { TaskAppError } from '@/shared/lib/taskapp/errors';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { getReporterEmail } from './getReporterEmail';
import { getSupportTicketById } from './support-tickets';

const logger = new Logger('features/Ayuda/support-reopen');

const TERMINAL_STATUSES = new Set(['resolved', 'done', 'closed']);

/**
 * Solicita la reapertura de un ticket cerrado.
 * Solo el reporter del ticket puede solicitar.
 */
export async function requestSupportTicketReopen(
  ticketId: number,
  reason: string,
  attachmentKeys: string[]
): Promise<Ticket> {
  const reporter = await getReporterEmail();
  if (!reporter) throw new Error('No hay usuario autenticado');

  const ticket = await getSupportTicketById(ticketId);
  if (!ticket) throw new Error('No tenés acceso a este ticket');

  if (ticket.reporter_email !== reporter.email) {
    logger.warn('Usuario no es el reporter del ticket', {
      data: { ticketId, user: reporter.email, reporter: ticket.reporter_email },
    });
    throw new Error('Solo el reporter original puede solicitar reapertura');
  }

  if (!ticket.status || !TERMINAL_STATUSES.has(ticket.status.slug)) {
    throw new Error('Solo se pueden reabrir tickets resueltos o cerrados');
  }
  if (ticket.reopen_status === 'pending') {
    throw new Error('Ya hay una solicitud de reapertura pendiente para este ticket');
  }

  const trimmed = reason.trim();
  if (trimmed.length < 20 || trimmed.length > 2000) {
    throw new Error('La justificación debe tener entre 20 y 2000 caracteres');
  }
  if (attachmentKeys.length > 3) {
    throw new Error('Máximo 3 adjuntos');
  }

  logger.info('Solicitando reapertura', {
    data: { ticketId, reporterEmail: reporter.email, keysCount: attachmentKeys.length },
  });

  try {
    return await taskAppClient.requestTicketReopen(ticketId, reporter.email, trimmed, attachmentKeys);
  } catch (error) {
    if (error instanceof TaskAppError && error.code === 'config') {
      throw new Error('El servicio de soporte no está configurado');
    }
    logger.error('Error solicitando reapertura', { data: { ticketId, error } });
    throw new Error('No pudimos enviar tu solicitud. Probá de nuevo en unos minutos.');
  }
}
```

- [ ] **Step 2: Verify type check**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/Ayuda/actions/support-reopen.ts
git commit -m "feat(reopen): server action requestSupportTicketReopen"
```

---

## Task 15: React Query hook

**Files:**
- Create: `src/features/Ayuda/hooks/useRequestTicketReopen.ts`

- [ ] **Step 1: Read** `src/features/Ayuda/hooks/queryKeys.ts` to confirm the exported key names (`ticketDetailKey`, `myTicketsKey`).

- [ ] **Step 2: Write the hook**

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestSupportTicketReopen } from '../actions/support-reopen';
import { myTicketsKey, ticketDetailKey } from './queryKeys';

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

- [ ] **Step 3: Verify type check**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/Ayuda/hooks/useRequestTicketReopen.ts
git commit -m "feat(reopen): hook useRequestTicketReopen"
```

---

## Task 16: Reopen request dialog

**Files:**
- Create: `src/features/Ayuda/components/detail/TicketReopenRequestDialog.tsx`

- [ ] **Step 1: Write the dialog**

```tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { uploadSupportTicketAttachment } from '../../actions/support-attachments';
import { useRequestTicketReopen } from '../../hooks/useRequestTicketReopen';
import { TicketAttachmentInput } from '../TicketAttachmentInput';

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(20, 'Contanos un poco más, mínimo 20 caracteres')
    .max(2000, 'Máximo 2000 caracteres'),
  attachments: z.array(z.instanceof(File)).max(3).optional().default([]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketReopenRequestDialog({ ticketId, open, onOpenChange }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '', attachments: [] },
  });
  const [uploading, setUploading] = useState(false);
  const reopen = useRequestTicketReopen(ticketId);
  const isBusy = uploading || reopen.isPending;

  async function onSubmit(values: FormValues) {
    try {
      let keys: string[] = [];
      if (values.attachments && values.attachments.length > 0) {
        setUploading(true);
        const results = await Promise.all(
          values.attachments.map(async (file) => {
            const fd = new FormData();
            fd.append('file', file);
            return uploadSupportTicketAttachment(fd);
          })
        );
        keys = results.map((r) => r.key);
        setUploading(false);
      }
      await reopen.mutateAsync({ reason: values.reason, attachmentKeys: keys });
      toast.success('Solicitud enviada. Te avisamos cuando haya respuesta.');
      form.reset({ reason: '', attachments: [] });
      onOpenChange(false);
    } catch (e) {
      setUploading(false);
      toast.error(e instanceof Error ? e.message : 'Error al enviar la solicitud');
    }
  }

  const reasonValue = form.watch('reason') ?? '';

  return (
    <Dialog open={open} onOpenChange={(o) => !isBusy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-emerald-600" />
            Solicitar reapertura del ticket
          </DialogTitle>
          <DialogDescription>
            Explicale al equipo por qué necesitás retomar este ticket. Si tenés capturas o archivos que ayuden, sumalos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificación</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Ej: el error volvió a aparecer al hacer X después de Y. Ya probé con Z y no se resuelve…"
                      disabled={isBusy}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <FormMessage />
                    <span>{reasonValue.length}/2000</span>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Adjuntos (opcional)</FormLabel>
                  <FormControl>
                    <TicketAttachmentInput
                      files={field.value ?? []}
                      onChange={field.onChange}
                      disabled={isBusy}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar solicitud
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify type check**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/Ayuda/components/detail/TicketReopenRequestDialog.tsx
git commit -m "feat(reopen): TicketReopenRequestDialog form"
```

---

## Task 17: Reopen request banner

**Files:**
- Create: `src/features/Ayuda/components/detail/TicketReopenRequestBanner.tsx`

- [ ] **Step 1: Write the banner**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { Clock, RotateCcw } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import { useState } from 'react';
import { TicketReopenRequestDialog } from './TicketReopenRequestDialog';

const TERMINAL_STATUSES = new Set(['resolved', 'done', 'closed']);

interface Props {
  ticket: Ticket;
  currentUserEmail: string;
}

export function TicketReopenRequestBanner({ ticket, currentUserEmail }: Props) {
  const [open, setOpen] = useState(false);

  const isReporter = ticket.reporter_email === currentUserEmail;
  if (!isReporter) return null;

  if (ticket.reopen_status === 'pending' && ticket.reopen_requested_at) {
    return (
      <div className="border-b bg-amber-50 dark:bg-amber-950/40 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium">Solicitud de reapertura enviada</p>
            <p className="text-xs text-muted-foreground">
              {moment(ticket.reopen_requested_at).locale('es').fromNow()} — un agente la va a revisar y te avisamos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isTerminal = ticket.status != null && TERMINAL_STATUSES.has(ticket.status.slug);
  const canRequest = isTerminal && ticket.reopen_status == null;
  if (!canRequest) return null;

  return (
    <>
      <div className="border-b bg-emerald-50 dark:bg-emerald-950/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">¿Necesitás reabrir este ticket?</p>
              <p className="text-xs text-muted-foreground">
                Contanos por qué y agregá evidencia si la tenés.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            Solicitar reapertura
          </Button>
        </div>
      </div>
      <TicketReopenRequestDialog ticketId={ticket.id} open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: Verify type check**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/Ayuda/components/detail/TicketReopenRequestBanner.tsx
git commit -m "feat(reopen): TicketReopenRequestBanner with eligible/pending states"
```

---

## Task 18: Mount banner in TicketDetailSheet

**Files:**
- Modify: `src/features/Ayuda/components/detail/TicketDetailSheet.tsx`

- [ ] **Step 1: Import + mount**

Add the import:
```ts
import { TicketReopenRequestBanner } from './TicketReopenRequestBanner';
```

In the JSX, inside the `<div className="shrink-0">` block, **after** `<TicketApprovalBanner ... />` and before the closing `</div>`:

```tsx
<TicketReopenRequestBanner ticket={ticket} currentUserEmail={currentUserEmail} />
```

The full block becomes:

```tsx
<div className="shrink-0">
  <TicketDetailHeader ticket={ticket} />
  <TicketApprovalBanner ticket={ticket} currentUserEmail={currentUserEmail} />
  <TicketReopenRequestBanner ticket={ticket} currentUserEmail={currentUserEmail} />
</div>
```

- [ ] **Step 2: Verify type check**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/Ayuda/components/detail/TicketDetailSheet.tsx
git commit -m "feat(reopen): mount reopen request banner in detail sheet"
```

---

## Task 19: Cypress E2E (happy path)

**Files:**
- Create: `cypress/e2e/help/ticket-reopen.cy.ts`

- [ ] **Step 1: Read** an existing Cypress test under `cypress/e2e/help/` (or `cypress/e2e/`) to copy the auth fixture and seeding helpers used in the repo.

- [ ] **Step 2: Write the test**

```ts
/// <reference types="cypress" />

describe('Ticket reopen request — happy path', () => {
  beforeEach(() => {
    cy.loginAsReporter(); // existing custom command; adapt to repo's auth helper
  });

  it('reporter solicita reapertura sobre un ticket resolved', () => {
    cy.seedResolvedTicket().then((ticketId: number) => {
      cy.visit(`/dashboard/help?ticket=${ticketId}`);

      // El banner verde aparece
      cy.contains('¿Necesitás reabrir este ticket?').should('be.visible');
      cy.contains('button', 'Solicitar reapertura').click();

      // Dialog abierto
      cy.contains('Solicitar reapertura del ticket').should('be.visible');

      // Validación: reason muy corto → mensaje de error
      cy.get('textarea').type('corto');
      cy.contains('button', 'Enviar solicitud').click();
      cy.contains('Contanos un poco más, mínimo 20 caracteres').should('be.visible');

      // Reason válido
      cy.get('textarea').clear().type('El error volvió a aparecer al hacer login otra vez, ya lo probé varias veces');
      cy.contains('button', 'Enviar solicitud').click();

      // Toast de éxito
      cy.contains('Solicitud enviada').should('be.visible');

      // Banner cambia a ámbar "pendiente"
      cy.contains('Solicitud de reapertura enviada').should('be.visible');
    });
  });
});
```

> The `cy.loginAsReporter` and `cy.seedResolvedTicket` are placeholders. Implement them as custom commands in `cypress/support/commands.ts` if they do not already exist. The seeding can hit a test-only API or use Supabase fixtures depending on what the existing tests do.

- [ ] **Step 3: Run the test**

Make sure PR-1 is deployed to the target environment (or running locally on `localhost:8080`).

Run: `npm run test:e2e -- --spec cypress/e2e/help/ticket-reopen.cy.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add cypress/e2e/help/ticket-reopen.cy.ts cypress/support/commands.ts
git commit -m "test(reopen): e2e happy path for reopen request"
```

---

## Task 20: PR-2 — open

- [ ] **Step 1: Final type check**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 2: Push**

```bash
git push -u origin feat/ticket-reopen-request
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --base dev --title "feat(ayuda): solicitar reapertura de ticket cerrado" --body "$(cat <<'EOF'
## Summary
- Banner condicional en el detalle del ticket para reporters con ticket en `resolved`/`done`/`closed`.
- Dialog con form (RHF + Zod) para justificación + hasta 3 adjuntos (imagen o PDF, 10 MB c/u).
- Server action `requestSupportTicketReopen` + hook `useRequestTicketReopen`.
- Reusa el sistema existente de unread tracking — no agrega tracking nuevo.

## Test plan
- [ ] `npm run check-types` pasa.
- [ ] E2E Cypress `ticket-reopen.cy.ts` pasa.
- [ ] Manual: como reporter, abrir un ticket resuelto y solicitar reapertura con adjuntos.
- [ ] Manual: el banner ámbar aparece tras enviar.
- [ ] Manual: tras aprobación en TaskApp, el ticket aparece como no leído (status change) y vuelve a in_progress.
- [ ] Manual: tras denegación en TaskApp, el ticket aparece como no leído (comentario auto-generado).
EOF
)"
```

---

# PR-3 · taskApp-frontend

> **Prerequisites**: PR-1 deployed. Can be done in parallel with PR-2.

Branch:

```bash
git checkout main   # or repo's default
git pull
git checkout -b feat/ticket-reopen-request
```

## Task 21: Extend Task type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add four fields to the Task interface**

Find the `Task` interface (around lines 50–80 per the codebase map). Add at the end:

```ts
  reopen_status: 'pending' | null;
  reopen_reason: string | null;
  reopen_attachments: string[];
  reopen_requested_at: string | null;
```

- [ ] **Step 2: Verify type check**

Run: `npm run typecheck` (or whatever script the repo uses; check `package.json`).
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(reopen): extend Task type with reopen request fields"
```

---

## Task 22: API client methods

**Files:**
- Modify: `src/api/tickets.ts`

- [ ] **Step 1: Read** the existing file to copy the exact axios import/pattern and Task return shape used by `valorizeTicket`.

- [ ] **Step 2: Append the two methods**

```ts
export const approveReopen = (id: number) =>
  axios.post<Task>(`/api/tasks/${id}/approve-reopen`).then((r) => r.data);

export const denyReopen = (id: number, denialReason: string) =>
  axios
    .post<Task>(`/api/tasks/${id}/deny-reopen`, { denial_reason: denialReason })
    .then((r) => r.data);
```

> If the file uses a custom `api` instance instead of `axios` directly, replace `axios` with that instance.

- [ ] **Step 3: Commit**

```bash
git add src/api/tickets.ts
git commit -m "feat(reopen): approveReopen and denyReopen API clients"
```

---

## Task 23: Mutation hooks

**Files:**
- Create: `src/hooks/use-reopen.ts`

- [ ] **Step 1: Write**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveReopen, denyReopen } from '@/api/tickets';

export function useApproveReopen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveReopen(id),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tickets', task.id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['comments', task.id] });
    },
  });
}

export function useDenyReopen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, denialReason }: { id: number; denialReason: string }) =>
      denyReopen(id, denialReason),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tickets', task.id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['comments', task.id] });
    },
  });
}
```

- [ ] **Step 2: Verify type check**

Run: `npm run typecheck` (or repo equivalent).
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-reopen.ts
git commit -m "feat(reopen): useApproveReopen and useDenyReopen hooks"
```

---

## Task 24: Approve dialog

**Files:**
- Create: `src/components/ticket/approve-reopen-dialog.tsx`

- [ ] **Step 1: Read** an existing AlertDialog in the project (search `AlertDialog` in `src/components/`) to match imports and styling.

- [ ] **Step 2: Write**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useApproveReopen } from '@/hooks/use-reopen';

interface Props {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApproveReopenDialog({ ticketId, open, onOpenChange }: Props) {
  const approve = useApproveReopen();

  async function handleApprove() {
    try {
      await approve.mutateAsync(ticketId);
      toast.success('Reapertura aprobada. El ticket volvió a En curso.');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al aprobar');
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !approve.isPending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Aprobar la reapertura?</AlertDialogTitle>
          <AlertDialogDescription>
            El ticket volverá al estado <strong>En curso</strong> y el reporter podrá retomarlo.
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={approve.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove} disabled={approve.isPending}>
            Aprobar reapertura
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ticket/approve-reopen-dialog.tsx
git commit -m "feat(reopen): ApproveReopenDialog"
```

---

## Task 25: Deny dialog

**Files:**
- Create: `src/components/ticket/deny-reopen-dialog.tsx`

- [ ] **Step 1: Write**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDenyReopen } from '@/hooks/use-reopen';

interface Props {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DenyReopenDialog({ ticketId, open, onOpenChange }: Props) {
  const [reason, setReason] = useState('');
  const deny = useDenyReopen();
  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= 10 && trimmed.length <= 1000 && !deny.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await deny.mutateAsync({ id: ticketId, denialReason: trimmed });
      toast.success('Solicitud denegada. Avisamos al reporter.');
      setReason('');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al denegar');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !deny.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Denegar solicitud de reapertura</DialogTitle>
          <DialogDescription>
            Explicale al reporter por qué no podemos reabrir este ticket. Tu mensaje quedará registrado
            como comentario público.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={5}
          placeholder="Ej: el ticket fue resuelto siguiendo el procedimiento definido en…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={deny.isPending}
        />
        <p className="text-right text-xs text-muted-foreground">{trimmed.length}/1000</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deny.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit}>
            Denegar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ticket/deny-reopen-dialog.tsx
git commit -m "feat(reopen): DenyReopenDialog with required motivo"
```

---

## Task 26: Reopen request banner

**Files:**
- Create: `src/components/ticket/reopen-request-banner.tsx`

- [ ] **Step 1: Write**

```tsx
import { Task } from '@/types';
import { FileText, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApproveReopenDialog } from './approve-reopen-dialog';
import { DenyReopenDialog } from './deny-reopen-dialog';

interface Props {
  ticket: Task;
}

function isImage(url: string): boolean {
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
}

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url, 'https://placeholder');
    const parts = u.pathname.split('/');
    return parts[parts.length - 1] || url;
  } catch {
    return url;
  }
}

export function ReopenRequestBanner({ ticket }: Props) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);

  if (ticket.reopen_status !== 'pending') return null;

  const requestedAt = ticket.reopen_requested_at
    ? new Date(ticket.reopen_requested_at).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <>
      <div className="rounded-md border-l-4 border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 p-4 my-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Solicitud de reapertura</p>
              <p className="text-xs text-muted-foreground">
                Solicitado por <strong>{ticket.reopen_requested_by ?? ticket.reporter_email}</strong> — {requestedAt}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDenyOpen(true)}>
              Denegar
            </Button>
            <Button size="sm" onClick={() => setApproveOpen(true)}>
              Aprobar reapertura
            </Button>
          </div>
        </div>

        {ticket.reopen_reason && (
          <blockquote className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-sm border-l-2 border-amber-400 bg-white/60 dark:bg-amber-950/30 px-3 py-2 text-sm">
            {ticket.reopen_reason}
          </blockquote>
        )}

        {ticket.reopen_attachments && ticket.reopen_attachments.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {ticket.reopen_attachments.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-md border bg-muted/30"
              >
                {isImage(url) ? (
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img src={url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="truncate bg-background/90 px-1.5 py-1 text-[10px] text-muted-foreground">
                  {filenameFromUrl(url)}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <ApproveReopenDialog ticketId={ticket.id} open={approveOpen} onOpenChange={setApproveOpen} />
      <DenyReopenDialog ticketId={ticket.id} open={denyOpen} onOpenChange={setDenyOpen} />
    </>
  );
}
```

> If the `Task` type uses `reporter_email` in a different shape (e.g. nested object), adapt accordingly.

- [ ] **Step 2: Verify type check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ticket/reopen-request-banner.tsx
git commit -m "feat(reopen): ReopenRequestBanner for admins on ticket detail"
```

---

## Task 27: Mount banner in `ticket-detail.tsx`

**Files:**
- Modify: `src/pages/ticket-detail.tsx`

- [ ] **Step 1: Read** the file around lines 230–250 to identify the Reporter Info Card block (line ~237) and the h1 (line ~239).

- [ ] **Step 2: Add the import**

```ts
import { ReopenRequestBanner } from '@/components/ticket/reopen-request-banner';
```

- [ ] **Step 3: Mount the banner**

Place `<ReopenRequestBanner ticket={ticket} />` between the Reporter Info Card and the h1:

```tsx
{/* Reporter info card existing */}
<ReporterInfoCard ... />

{/* NEW */}
<ReopenRequestBanner ticket={ticket} />

{/* Title h1 existing */}
<h1>{ticket.title}</h1>
```

- [ ] **Step 4: Verify type check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ticket-detail.tsx
git commit -m "feat(reopen): mount ReopenRequestBanner in ticket detail page"
```

---

## Task 28: Manual smoke test of full flow

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`

- [ ] **Step 2: Test approve path**

1. Open a widget ticket in `resolved` status via the seeded DB.
2. In gh_gestion (on the same env), have the reporter submit a reopen request with reason and an image.
3. Refresh the ticket detail page in taskApp-frontend — banner ámbar visible with reason + image preview.
4. Click "Aprobar reapertura" → confirm → toast success.
5. Verify: ticket is now `in_progress`, banner gone, comment auto-posted by "Sistema" visible in comments thread.

- [ ] **Step 3: Test deny path**

1. Move the ticket back to `resolved` (via DB or admin tooling).
2. Reporter submits another reopen request.
3. Admin clicks "Denegar" → dialog → type denial reason (≥10 chars) → click Denegar.
4. Verify: ticket stays `resolved`, banner gone, comment auto-posted with denial reason.

- [ ] **Step 4: Test validation errors**

1. Submit with denial reason of 5 chars → button disabled (or 400 if forced).
2. Submit reopen with reason of 10 chars from gh_gestion side → toast error from server action.

- [ ] **Step 5: Commit (optional notes)**

If you wrote any setup helpers during smoke testing, commit them. Otherwise skip.

---

## Task 29: PR-3 — open

- [ ] **Step 1: Push**

```bash
git push -u origin feat/ticket-reopen-request
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat(tickets): admin UI for reopen request approval" --body "$(cat <<'EOF'
## Summary
- Adds `ReopenRequestBanner` shown at the top of the ticket detail when `reopen_status = 'pending'`.
- `ApproveReopenDialog` (confirm) and `DenyReopenDialog` (textarea with required motivo).
- Hooks `useApproveReopen` / `useDenyReopen` invalidate ticket + comments queries on success.

## Test plan
- [ ] `npm run typecheck` pasa.
- [ ] Manual: aprobar reapertura — ticket pasa a `in_progress`, comentario auto-generado.
- [ ] Manual: denegar reapertura — status sin cambios, comentario auto-generado con motivo.
- [ ] Manual: validar que el dialog de denegación bloquea submit con motivo < 10 chars.
EOF
)"
```

---

# Final Validation (cross-repo)

## Task 30: End-to-end manual check on staging

Once all 3 PRs are merged AND deployed to staging:

- [ ] **Step 1**: Login to gh_gestion staging as a real reporter. Open a real ticket already in `resolved`.
- [ ] **Step 2**: See the green banner "¿Necesitás reabrir este ticket?" + Solicitar reapertura.
- [ ] **Step 3**: Submit with reason and 2 attachments (1 PNG, 1 PDF).
- [ ] **Step 4**: Verify the banner turns amber "Solicitud de reapertura enviada".
- [ ] **Step 5**: Verify email arrives at the admin inbox (subject: "Solicitud de reapertura — TKT-…").
- [ ] **Step 6**: Login to TaskApp as admin. Open the same ticket. See banner with reason + attachments.
- [ ] **Step 7**: Click "Aprobar reapertura" → confirm.
- [ ] **Step 8**: Verify ticket status = `in_progress` and an auto-generated comment appears.
- [ ] **Step 9**: Return to gh_gestion. The ticket appears as unread (`hasStatusChange`). Open it, see banner gone, ticket open for comments.
- [ ] **Step 10**: Verify the reporter received the resolution email (subject: "Tu solicitud de reapertura — TKT-… (aprobada)").
- [ ] **Step 11**: Repeat steps 1–4 on another resolved ticket and verify deny path: admin denies with motivo, reporter sees comment "Solicitud de reapertura denegada por… Motivo: …", status remains terminal, email arrives.

---

## Self-Review Notes (filled in during writing)

**Spec coverage:** Each numbered item in the spec maps to a task in this plan:
- Spec §4 (data model) → Task 1, 2, 3
- Spec §5 (API) → Tasks 4–7
- Spec §6 (gh_gestion UI) → Tasks 12–18
- Spec §7 (TaskApp UI) → Tasks 21–27
- Spec §8 (emails / SSE) → Tasks 8, 9 (emails); SSE inlined in Tasks 6 and 7
- Spec §9 (edge cases) → covered by validations in Tasks 6, 7; race in Task 4 (Resolve returns ErrNoActiveRequest)
- Spec §10 (testing) → Tasks 10 (backend), 19 (Cypress), 28 and 30 (manual)
- Spec §11 (out of scope) → no tasks (correctly excluded)
- Spec §12 (PRs) → Tasks 11, 20, 29

**Notes for executor:**
- Per project rule, **do NOT auto-commit**: the `git commit` steps in this plan are the recommended grouping but only execute them when the user explicitly asks. Default behaviour during implementation: leave changes in the working tree and report status; the user will batch the commits at the end.
- Per project rule, **no Co-Authored-By or AI attribution** in any commit message.
- Per project rule, **no `console.*`** — use `Logger` from `@/lib/logger` in gh_gestion (already followed in the plan above).
- Per project rule, **no `:any`** — every type in this plan is either inferred or declared with concrete shape.
