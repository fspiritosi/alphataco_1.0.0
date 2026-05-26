# Centro de Ayuda V2 — Paridad con `taskApp-widget` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REGLA GLOBAL DEL USUARIO (overridea cualquier instrucción de skill que diga "commit"):**
> NUNCA ejecutar `git commit` ni `git push` en ningún task de este plan. Dejar los cambios en working tree (modified). El commit final lo decide el usuario al cierre del trabajo, cuando lo pida explícitamente.
>
> Los pasos "Commit" del template estándar de superpowers se reemplazan acá por **"Stop & report"**: reportar al usuario qué archivos cambiaron y esperar antes de seguir.

**Spec:** `docs/superpowers/specs/2026-05-19-help-support-tickets-widget-parity-design.md`

**Goal:** Llevar el Centro de Ayuda a paridad funcional con el widget `taskApp-widget` — prioridad, adjuntos al crear, vista de detalle (Sheet), hilo de comentarios bidireccional, aprobación UAC y horas estimadas — manteniendo el patrón server-only TaskApp client + Server Actions + React Query.

**Architecture:** Cliente HTTP server-only (`src/shared/lib/taskapp/`) se extiende con 7 endpoints nuevos. Cuatro server actions nuevas o ampliadas (`support-tickets`, `support-comments`, `support-approval`, `support-attachments`) en `src/features/Ayuda/actions/`. La página `/dashboard/help` se mantiene como Server Component y pre-fetchea `initialTickets` + `initialTicket` (si la URL trae `?ticket={id}`). El cliente abre un `Sheet` lateral con `dynamic(import)` y maneja el estado de apertura vía `?ticket={id}` en la URL.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, shadcn/ui + Tailwind, react-hook-form + zod, @tanstack/react-query, sonner (toasts), moment.js (locale `es`), Supabase (auth), Cypress (E2E).

**Working directory:** `C:/Users/Yorda/OneDrive/Escritorio/Workspace/codecontrol/gh_gestion`

**Testing strategy:** El repo solo hace E2E con Cypress. La verificación intermedia entre tasks es `npm run check-types`. Los E2E nuevos van en Task 19 y cubren los flujos principales.

---

## Phase A — Foundation (tipos, cliente, constantes)

### Task 1: Extender tipos de TaskApp y Ayuda

**Files:**
- Modify: `src/shared/lib/taskapp/types.ts`
- Modify: `src/features/Ayuda/types/index.ts`

- [ ] **Step 1: Actualizar `src/shared/lib/taskapp/types.ts`**

Reemplazar todo el archivo por:

```typescript
export interface TicketStatus {
  id: number;
  slug: string;
  name: string;
  color?: string;
}

export interface TicketLabel {
  id: number;
  name: string;
  slug: string;
  color?: string;
}

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

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
}

export interface Comment {
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
  priority: TicketPriority;
  attachments?: string[];
}

export interface CreateCommentRequest {
  body: string;
  author_email: string;
}

export interface UploadResult {
  key: string;
}
```

- [ ] **Step 2: Actualizar `src/features/Ayuda/types/index.ts`**

Reemplazar por:

```typescript
import type { Comment, Ticket, TicketPriority } from '@/shared/lib/taskapp/types';
import type { CategorySlug } from '../constants/categories';

export type { CategorySlug, CategoryDef } from '../constants/categories';
export type { StatusDef } from '../constants/ticket-status';
export type { PriorityDef, PrioritySlug } from '../constants/ticket-priority';

export interface ReporterIdentity {
  email: string;
  name: string | null;
}

export interface CreateSupportTicketInput {
  category: CategorySlug;
  title: string;
  description: string;
  priority: TicketPriority;
  attachmentKeys?: string[];
}

export interface CreateSupportCommentInput {
  ticketId: number;
  body: string;
}

export type MyTicketsData = Ticket[];
export type TicketCommentsData = Comment[];
```

- [ ] **Step 3: Verificar que NO compila todavía (porque falta `ticket-priority`)**

Run: `npm run check-types`
Expected: error sobre `'../constants/ticket-priority'` no encontrado. Se resuelve en Task 3.

- [ ] **Step 4: Stop & report**

Reportar al usuario los 2 archivos modificados y avisar que la siguiente task crea los constants.

---

### Task 2: Extender cliente TaskApp con 7 endpoints nuevos

**Files:**
- Modify: `src/shared/lib/taskapp/client.ts`

- [ ] **Step 1: Reemplazar `src/shared/lib/taskapp/client.ts`**

```typescript
import 'server-only';
import { Logger } from '@/lib/logger';
import { TaskAppError } from './errors';
import type { Comment, CreateCommentRequest, CreateTicketRequest, Ticket, UploadResult } from './types';

const logger = new Logger('shared/lib/taskapp');

function baseURL(): string {
  const url = process.env.TASKAPP_BASE_URL;
  if (!url) throw new TaskAppError(500, 'config', 'TASKAPP_BASE_URL not set');
  return url.replace(/\/$/, '');
}

function apiKey(): string {
  const key = process.env.TASKAPP_PROJECT_API_KEY;
  if (!key) throw new TaskAppError(500, 'config', 'TASKAPP_PROJECT_API_KEY not set');
  return key;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${baseURL()}/api/public/v1${path}`;
  const key = apiKey();

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Key': key,
        ...init.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof TaskAppError) throw error;
    logger.error('taskApp network error', { data: { url, error } });
    throw new TaskAppError(0, 'network', error instanceof Error ? error.message : 'network error');
  }

  if (!res.ok) {
    const body = await res.text();
    logger.error('taskApp request failed', { data: { url, status: res.status, body } });
    throw new TaskAppError(res.status, 'http', body || res.statusText);
  }

  try {
    return (await res.json()) as T;
  } catch (error) {
    logger.error('taskApp invalid JSON', { data: { url, error } });
    throw new TaskAppError(res.status, 'parse', 'invalid JSON');
  }
}

async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const url = `${baseURL()}${path}`;
  const key = apiKey();

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'X-Project-Key': key },
      body: formData,
      cache: 'no-store',
    });
  } catch (error) {
    logger.error('taskApp upload network error', { data: { url, error } });
    throw new TaskAppError(0, 'network', error instanceof Error ? error.message : 'network error');
  }

  if (!res.ok) {
    const body = await res.text();
    logger.error('taskApp upload failed', { data: { url, status: res.status, body } });
    throw new TaskAppError(res.status, 'http', body || res.statusText);
  }

  try {
    return (await res.json()) as T;
  } catch (error) {
    logger.error('taskApp upload invalid JSON', { data: { url, error } });
    throw new TaskAppError(res.status, 'parse', 'invalid JSON');
  }
}

export const taskAppClient = {
  createTicket: (body: CreateTicketRequest) =>
    request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(body) }),

  listTicketsByReporter: (reporterEmail: string) =>
    request<Ticket[]>(`/tickets?reporter_email=${encodeURIComponent(reporterEmail)}`),

  getTicketById: (id: number) =>
    request<Ticket>(`/tickets/${id}`),

  listComments: (ticketId: number) =>
    request<Comment[]>(`/tickets/${ticketId}/comments`),

  createComment: (ticketId: number, body: CreateCommentRequest) =>
    request<Comment>(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  approveTicket: (ticketId: number, approverEmail: string) =>
    request<Ticket>(`/tickets/${ticketId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approver_email: approverEmail }),
    }),

  rejectTicket: (ticketId: number, approverEmail: string) =>
    request<Ticket>(`/tickets/${ticketId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ approver_email: approverEmail }),
    }),

  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestMultipart<UploadResult>('/api/public/v1/upload', formData);
  },
};
```

- [ ] **Step 2: check-types (parcial)**

Run: `npm run check-types`
Expected: sigue fallando por `ticket-priority`. La firma del cliente debe compilar sin nuevos errores.

- [ ] **Step 3: Stop & report**

---

### Task 3: Constantes — estados nuevos + prioridad

**Files:**
- Modify: `src/features/Ayuda/constants/ticket-status.ts`
- Create: `src/features/Ayuda/constants/ticket-priority.ts`

- [ ] **Step 1: Ampliar `ticket-status.ts`**

Reemplazar todo el archivo por:

```typescript
export interface StatusDef {
  label: string;
  badgeClass: string;
  borderClass: string;
}

export const STATUS_BY_SLUG: Record<string, StatusDef> = {
  open: {
    label: 'Abierto',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    borderClass: 'border-l-blue-500',
  },
  in_progress: {
    label: 'En curso',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    borderClass: 'border-l-amber-500',
  },
  blocked: {
    label: 'Bloqueado',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    borderClass: 'border-l-red-500',
  },
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
  done: {
    label: 'Resuelto',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    borderClass: 'border-l-emerald-500',
  },
  closed: {
    label: 'Cerrado',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    borderClass: 'border-l-slate-400',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    borderClass: 'border-l-slate-400',
  },
};

export function statusFor(slug: string | undefined, fallbackName?: string): StatusDef {
  if (slug && STATUS_BY_SLUG[slug]) return STATUS_BY_SLUG[slug];
  return {
    label: fallbackName ?? slug ?? 'Desconocido',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    borderClass: 'border-l-slate-400',
  };
}
```

- [ ] **Step 2: Crear `src/features/Ayuda/constants/ticket-priority.ts`**

```typescript
import { ArrowDown, ArrowUp, Equal, Flame, type LucideIcon } from 'lucide-react';
import type { TicketPriority } from '@/shared/lib/taskapp/types';

export type PrioritySlug = TicketPriority;

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

export const PRIORITIES: PriorityDef[] = Object.values(PRIORITY_BY_SLUG);

export function priorityFor(slug: string | undefined): PriorityDef {
  if (slug && slug in PRIORITY_BY_SLUG) return PRIORITY_BY_SLUG[slug as PrioritySlug];
  return PRIORITY_BY_SLUG.medium;
}
```

- [ ] **Step 3: check-types**

Run: `npm run check-types`
Expected: PASS (los 3 archivos previos ahora compilan).

- [ ] **Step 4: Stop & report**

---

## Phase B — Server Actions

### Task 4: Ampliar `support-tickets.ts` (priority + attachments + getById)

**Files:**
- Modify: `src/features/Ayuda/actions/support-tickets.ts`

- [ ] **Step 1: Reemplazar `support-tickets.ts`**

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { TaskAppError } from '@/shared/lib/taskapp/errors';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { buildTitleWithCategory } from '../constants/categories';
import type { CreateSupportTicketInput } from '../types';
import { getReporterEmail } from './getReporterEmail';

const logger = new Logger('features/Ayuda/support-tickets');

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<Ticket> {
  const reporter = await getReporterEmail();
  if (!reporter) {
    logger.warn('createSupportTicket sin usuario autenticado');
    throw new Error('No hay usuario autenticado');
  }

  logger.info('Creando ticket de soporte', {
    data: { category: input.category, priority: input.priority, email: reporter.email },
  });

  try {
    return await taskAppClient.createTicket({
      title: buildTitleWithCategory(input.category, input.title),
      description: input.description,
      reporter_email: reporter.email,
      reporter_name: reporter.name ?? undefined,
      priority: input.priority,
      attachments: input.attachmentKeys ?? [],
    });
  } catch (error) {
    if (error instanceof TaskAppError && error.code === 'config') {
      throw new Error('El servicio de soporte no está configurado');
    }
    logger.error('Error creando ticket', { data: { error } });
    throw new Error('No pudimos enviar tu reporte. Probá de nuevo en unos minutos.');
  }
}

export async function getMySupportTickets(): Promise<Ticket[]> {
  const reporter = await getReporterEmail();
  if (!reporter) return [];

  try {
    return await taskAppClient.listTicketsByReporter(reporter.email);
  } catch (error) {
    logger.error('Error listando tickets propios', { data: { error } });
    return [];
  }
}

/**
 * Retorna el ticket si el usuario logueado es reporter o approver.
 * Si no tiene acceso o el ticket no existe → null (sin throw, para que la UI
 * muestre un estado "no encontrado").
 */
export async function getSupportTicketById(id: number): Promise<Ticket | null> {
  const reporter = await getReporterEmail();
  if (!reporter) {
    logger.warn('getSupportTicketById sin usuario autenticado', { data: { id } });
    return null;
  }

  let ticket: Ticket;
  try {
    ticket = await taskAppClient.getTicketById(id);
  } catch (error) {
    logger.error('Error obteniendo ticket', { data: { id, error } });
    return null;
  }

  const isReporter = ticket.reporter_email === reporter.email;
  const isApprover = ticket.approver_email === reporter.email;
  if (!isReporter && !isApprover) {
    logger.warn('Acceso denegado al ticket', {
      data: { id, user: reporter.email, reporter: ticket.reporter_email, approver: ticket.approver_email },
    });
    return null;
  }

  return ticket;
}
```

- [ ] **Step 2: check-types**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

### Task 5: Server actions de comentarios

**Files:**
- Create: `src/features/Ayuda/actions/support-comments.ts`

- [ ] **Step 1: Crear `support-comments.ts`**

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { TaskAppError } from '@/shared/lib/taskapp/errors';
import type { Comment } from '@/shared/lib/taskapp/types';
import type { CreateSupportCommentInput } from '../types';
import { getReporterEmail } from './getReporterEmail';
import { getSupportTicketById } from './support-tickets';

const logger = new Logger('features/Ayuda/support-comments');

export async function listSupportTicketComments(ticketId: number): Promise<Comment[]> {
  const ticket = await getSupportTicketById(ticketId);
  if (!ticket) {
    logger.warn('listSupportTicketComments sin acceso', { data: { ticketId } });
    return [];
  }

  try {
    const all = await taskAppClient.listComments(ticketId);
    return all.filter((c) => !c.is_internal);
  } catch (error) {
    logger.error('Error listando comentarios', { data: { ticketId, error } });
    return [];
  }
}

export async function createSupportTicketComment(input: CreateSupportCommentInput): Promise<Comment> {
  const reporter = await getReporterEmail();
  if (!reporter) {
    logger.warn('createSupportTicketComment sin usuario autenticado');
    throw new Error('No hay usuario autenticado');
  }

  const ticket = await getSupportTicketById(input.ticketId);
  if (!ticket) {
    throw new Error('No tenés acceso a este ticket');
  }

  const body = input.body.trim();
  if (body.length === 0) {
    throw new Error('El comentario no puede estar vacío');
  }
  if (body.length > 5000) {
    throw new Error('El comentario no puede superar los 5000 caracteres');
  }

  try {
    return await taskAppClient.createComment(input.ticketId, {
      body,
      author_email: reporter.email,
    });
  } catch (error) {
    if (error instanceof TaskAppError && error.code === 'config') {
      throw new Error('El servicio de soporte no está configurado');
    }
    logger.error('Error creando comentario', { data: { ticketId: input.ticketId, error } });
    throw new Error('No pudimos enviar tu comentario. Probá de nuevo.');
  }
}
```

- [ ] **Step 2: check-types**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

### Task 6: Server actions de aprobación UAC

**Files:**
- Create: `src/features/Ayuda/actions/support-approval.ts`

- [ ] **Step 1: Crear `support-approval.ts`**

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { getReporterEmail } from './getReporterEmail';
import { getSupportTicketById } from './support-tickets';

const logger = new Logger('features/Ayuda/support-approval');

async function assertCanApprove(ticketId: number): Promise<{ approverEmail: string; ticket: Ticket }> {
  const reporter = await getReporterEmail();
  if (!reporter) throw new Error('No hay usuario autenticado');

  const ticket = await getSupportTicketById(ticketId);
  if (!ticket) throw new Error('No tenés acceso a este ticket');

  if (ticket.approver_email !== reporter.email) {
    logger.warn('Usuario no es approver', {
      data: { ticketId, user: reporter.email, approver: ticket.approver_email },
    });
    throw new Error('No sos el aprobador asignado a este ticket');
  }

  if (ticket.status?.slug !== 'valued') {
    throw new Error('El ticket no está en estado "Valuado"');
  }

  return { approverEmail: reporter.email, ticket };
}

export async function approveSupportTicket(ticketId: number): Promise<Ticket> {
  const { approverEmail } = await assertCanApprove(ticketId);
  logger.info('Aprobando ticket', { data: { ticketId, approverEmail } });
  try {
    return await taskAppClient.approveTicket(ticketId, approverEmail);
  } catch (error) {
    logger.error('Error aprobando ticket', { data: { ticketId, error } });
    throw new Error('No pudimos registrar la aprobación. Probá de nuevo.');
  }
}

export async function rejectSupportTicket(ticketId: number): Promise<Ticket> {
  const { approverEmail } = await assertCanApprove(ticketId);
  logger.info('Rechazando ticket', { data: { ticketId, approverEmail } });
  try {
    return await taskAppClient.rejectTicket(ticketId, approverEmail);
  } catch (error) {
    logger.error('Error rechazando ticket', { data: { ticketId, error } });
    throw new Error('No pudimos registrar el rechazo. Probá de nuevo.');
  }
}
```

- [ ] **Step 2: check-types**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

### Task 7: Server action de upload de adjuntos

**Files:**
- Create: `src/features/Ayuda/actions/support-attachments.ts`

- [ ] **Step 1: Crear `support-attachments.ts`**

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { TaskAppError } from '@/shared/lib/taskapp/errors';
import { getReporterEmail } from './getReporterEmail';

const logger = new Logger('features/Ayuda/support-attachments');

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = /^(image\/.+|application\/pdf)$/;

export async function uploadSupportTicketAttachment(formData: FormData): Promise<{ key: string }> {
  const reporter = await getReporterEmail();
  if (!reporter) throw new Error('No hay usuario autenticado');

  const raw = formData.get('file');
  if (!(raw instanceof File)) {
    throw new Error('Archivo inválido');
  }

  if (raw.size === 0) {
    throw new Error('El archivo está vacío');
  }
  if (raw.size > MAX_BYTES) {
    throw new Error('El archivo supera los 10 MB');
  }
  if (!ALLOWED_TYPES.test(raw.type)) {
    throw new Error('Formato no permitido. Solo imagen o PDF.');
  }

  try {
    return await taskAppClient.uploadFile(raw);
  } catch (error) {
    if (error instanceof TaskAppError && error.code === 'config') {
      throw new Error('El servicio de soporte no está configurado');
    }
    logger.error('Error subiendo adjunto', { data: { name: raw.name, size: raw.size, error } });
    throw new Error('No pudimos subir el archivo. Probá de nuevo.');
  }
}
```

- [ ] **Step 2: check-types**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

## Phase C — Hooks de React Query

### Task 8: Hooks de detalle, comentarios y mutaciones

**Files:**
- Create: `src/features/Ayuda/hooks/useTicketDetail.ts`
- Create: `src/features/Ayuda/hooks/useTicketComments.ts`
- Create: `src/features/Ayuda/hooks/useCreateComment.ts`
- Create: `src/features/Ayuda/hooks/useApproveTicket.ts`
- Create: `src/features/Ayuda/hooks/useRejectTicket.ts`
- Create: `src/features/Ayuda/hooks/useUploadAttachment.ts`

- [ ] **Step 1: NO modificar `useCreateTicket.ts`**

El hook existente delega en `createSupportTicket` sin anotar tipos manualmente. Cuando la action acepta el `CreateSupportTicketInput` extendido (Task 1 + Task 4), el hook automáticamente acepta `priority` y `attachmentKeys` sin cambios.

- [ ] **Step 2: Crear `useTicketDetail.ts`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { getSupportTicketById } from '../actions/support-tickets';

export const ticketDetailKey = (id: number) => ['ayuda', 'ticket', id] as const;

export function useTicketDetail(id: number | null, initialData?: Ticket | null) {
  return useQuery({
    queryKey: id == null ? ['ayuda', 'ticket', 'none'] : ticketDetailKey(id),
    queryFn: () => (id == null ? Promise.resolve(null) : getSupportTicketById(id)),
    initialData: id == null ? null : initialData ?? undefined,
    enabled: id != null,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 3: Crear `useTicketComments.ts`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { listSupportTicketComments } from '../actions/support-comments';

export const ticketCommentsKey = (id: number) => ['ayuda', 'ticket', id, 'comments'] as const;

export function useTicketComments(id: number | null) {
  return useQuery({
    queryKey: id == null ? ['ayuda', 'ticket', 'none', 'comments'] : ticketCommentsKey(id),
    queryFn: () => (id == null ? Promise.resolve([]) : listSupportTicketComments(id)),
    enabled: id != null,
    staleTime: 15_000,
  });
}
```

- [ ] **Step 4: Crear `useCreateComment.ts`**

Optimistic update — al enviar, agrega un comentario "fantasma" con id negativo. Si falla, rollback.

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Comment } from '@/shared/lib/taskapp/types';
import { createSupportTicketComment } from '../actions/support-comments';
import { ticketCommentsKey } from './useTicketComments';

export function useCreateComment(ticketId: number, authorEmail: string) {
  const queryClient = useQueryClient();
  const key = ticketCommentsKey(ticketId);

  return useMutation({
    mutationFn: (body: string) =>
      createSupportTicketComment({ ticketId, body }),

    onMutate: async (body: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Comment[]>(key) ?? [];
      const optimistic: Comment = {
        id: -Date.now(),
        task_id: ticketId,
        author_email: authorEmail,
        body: body.trim(),
        is_internal: false,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Comment[]>(key, [...previous, optimistic]);
      return { previous };
    },

    onError: (_err, _body, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
```

- [ ] **Step 5: Crear `useApproveTicket.ts`**

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveSupportTicket } from '../actions/support-approval';
import { MY_TICKETS_QUERY_KEY } from './useMyTickets';
import { ticketDetailKey } from './useTicketDetail';

export function useApproveTicket(ticketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveSupportTicket(ticketId),
    onSuccess: (updated) => {
      queryClient.setQueryData(ticketDetailKey(ticketId), updated);
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    },
  });
}
```

- [ ] **Step 6: Crear `useRejectTicket.ts`**

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rejectSupportTicket } from '../actions/support-approval';
import { MY_TICKETS_QUERY_KEY } from './useMyTickets';
import { ticketDetailKey } from './useTicketDetail';

export function useRejectTicket(ticketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectSupportTicket(ticketId),
    onSuccess: (updated) => {
      queryClient.setQueryData(ticketDetailKey(ticketId), updated);
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    },
  });
}
```

- [ ] **Step 7: Crear `useUploadAttachment.ts`**

```typescript
'use client';

import { useMutation } from '@tanstack/react-query';
import { uploadSupportTicketAttachment } from '../actions/support-attachments';

export function useUploadAttachment() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return uploadSupportTicketAttachment(fd);
    },
  });
}
```

- [ ] **Step 8: check-types**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 9: Stop & report**

---

## Phase D — UI primitives, form y lista

### Task 9: Badges y selector de prioridad

**Files:**
- Create: `src/features/Ayuda/components/TicketPriorityBadge.tsx`
- Create: `src/features/Ayuda/components/TicketPrioritySelect.tsx`

- [ ] **Step 1: Crear `TicketPriorityBadge.tsx`**

```typescript
import { Badge } from '@/components/ui/badge';
import { priorityFor } from '../constants/ticket-priority';

interface Props {
  slug: string | undefined;
  showIcon?: boolean;
}

export function TicketPriorityBadge({ slug, showIcon = true }: Props) {
  const def = priorityFor(slug);
  const Icon = def.icon;
  return (
    <Badge variant="outline" className={`border-transparent ${def.badgeClass}`}>
      {showIcon && <Icon className={`mr-1 h-3 w-3 ${def.iconClass}`} />}
      {def.label}
    </Badge>
  );
}
```

- [ ] **Step 2: Crear `TicketPrioritySelect.tsx`**

```typescript
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRIORITIES, type PrioritySlug } from '../constants/ticket-priority';

interface Props {
  value: PrioritySlug;
  onChange: (value: PrioritySlug) => void;
  disabled?: boolean;
}

export function TicketPrioritySelect({ value, onChange, disabled }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PrioritySlug)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Elegí una prioridad" />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => {
          const Icon = p.icon;
          return (
            <SelectItem key={p.slug} value={p.slug}>
              <span className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${p.iconClass}`} />
                {p.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 3: check-types**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 4: Stop & report**

---

### Task 10: Input de adjuntos

**Files:**
- Create: `src/features/Ayuda/components/TicketAttachmentInput.tsx`

- [ ] **Step 1: Crear `TicketAttachmentInput.tsx`**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { FileText, ImageIcon, Paperclip, X } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(file: File) {
  if (file.type.startsWith('image/')) return ImageIcon;
  return FileText;
}

export function TicketAttachmentInput({ files, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length === 0) return;

    const accepted: File[] = [];
    let oversize = 0;
    let invalid = 0;
    for (const f of picked) {
      if (f.size > MAX_BYTES) {
        oversize += 1;
        continue;
      }
      if (!(f.type.startsWith('image/') || f.type === 'application/pdf')) {
        invalid += 1;
        continue;
      }
      accepted.push(f);
    }
    if (oversize > 0) toast.warning(`Ignoramos ${oversize} archivo(s) que superan 10 MB.`);
    if (invalid > 0) toast.warning(`Ignoramos ${invalid} archivo(s) con formato no permitido.`);

    const merged = [...files, ...accepted].slice(0, MAX_FILES);
    if (files.length + accepted.length > MAX_FILES) {
      toast.warning(`Solo podés adjuntar ${MAX_FILES} archivos. Quedaron los primeros ${MAX_FILES}.`);
    }
    onChange(merged);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  const canAddMore = files.length < MAX_FILES;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canAddMore}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="mr-2 h-4 w-4" />
          Adjuntar archivo
        </Button>
        <span className="text-xs text-muted-foreground">
          {files.length}/{MAX_FILES} · máx. 10 MB · imagen o PDF
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handlePick}
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, i) => {
            const Icon = fileIcon(file);
            return (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatSize(file.size)}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={disabled}
                  onClick={() => removeAt(i)}
                  aria-label={`Quitar ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: check-types**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

### Task 11: Ampliar `TicketForm` con prioridad y adjuntos

**Files:**
- Modify: `src/features/Ayuda/components/TicketForm.tsx`

- [ ] **Step 1: Reemplazar `TicketForm.tsx`**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CATEGORIES, type CategorySlug } from '../constants/categories';
import { useCreateTicket } from '../hooks/useCreateTicket';
import { useUploadAttachment } from '../hooks/useUploadAttachment';
import { TicketAttachmentInput } from './TicketAttachmentInput';
import { TicketPrioritySelect } from './TicketPrioritySelect';

const formSchema = z.object({
  category: z.enum([
    'dashboard',
    'empresa',
    'empleados',
    'equipos',
    'comercial',
    'documentacion',
    'operaciones',
    'mantenimiento',
    'formularios',
    'otro',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().trim().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z
    .string()
    .trim()
    .min(10, 'Contanos un poco más (mínimo 10 caracteres)')
    .max(5000, 'Máximo 5000 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

export function TicketForm() {
  const createTicket = useCreateTicket();
  const uploadAttachment = useUploadAttachment();
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: 'otro' as CategorySlug,
      priority: 'medium',
      title: '',
      description: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const attachmentKeys: string[] = [];
      for (const file of files) {
        const { key } = await uploadAttachment.mutateAsync(file);
        attachmentKeys.push(key);
      }

      await createTicket.mutateAsync({
        category: values.category,
        title: values.title,
        description: values.description,
        priority: values.priority,
        attachmentKeys,
      });

      toast.success('Tu reporte fue enviado. Te avisaremos cuando haya novedades.');
      form.reset({ category: values.category, priority: 'medium', title: '', description: '' });
      setFiles([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos enviar tu reporte');
    }
  }

  const isSubmitting = form.formState.isSubmitting || createTicket.isPending || uploadAttachment.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Reportar un problema</CardTitle>
          <CardDescription>Contanos qué pasó y vamos a ocuparnos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => {
                        const Icon = c.icon;
                        return (
                          <SelectItem key={c.slug} value={c.slug}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {c.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad</FormLabel>
                  <FormControl>
                    <TicketPrioritySelect
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asunto</FormLabel>
                <FormControl>
                  <Input placeholder="Resumí en una línea qué te pasa" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    placeholder="Pasos para reproducir, qué esperabas vs qué pasó…"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel className="mb-2 block">Adjuntos</FormLabel>
            <TicketAttachmentInput files={files} onChange={setFiles} disabled={isSubmitting} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Enviando…' : 'Enviar reporte'}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
```

- [ ] **Step 2: check-types**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

### Task 12: `TicketCard` + `MyTicketsList` con URL y refresh

**Files:**
- Modify: `src/features/Ayuda/components/TicketCard.tsx`
- Modify: `src/features/Ayuda/components/MyTicketsList.tsx`

- [ ] **Step 1: Reemplazar `TicketCard.tsx`**

```typescript
'use client';

import { Card } from '@/components/ui/card';
import moment from 'moment';
import 'moment/locale/es';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { parseCategoryFromTitle } from '../constants/categories';
import { statusFor } from '../constants/ticket-status';
import { TicketCategoryBadge } from './TicketCategoryBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { TicketStatusBadge } from './TicketStatusBadge';

interface Props {
  ticket: Ticket;
  onClick: (id: number) => void;
  isActive?: boolean;
}

export function TicketCard({ ticket, onClick, isActive }: Props) {
  const { categoryLabel, cleanTitle } = parseCategoryFromTitle(ticket.title);
  const status = statusFor(ticket.status?.slug, ticket.status?.name);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick(ticket.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(ticket.id);
        }
      }}
      className={`border-l-4 ${status.borderClass} cursor-pointer p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-in fade-in-50 slide-in-from-top-2 duration-300 ${
        isActive ? 'ring-2 ring-primary/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug">{cleanTitle}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <TicketPriorityBadge slug={ticket.priority} />
          {categoryLabel && <TicketCategoryBadge label={categoryLabel} />}
        </div>
      </div>
      {ticket.description && (
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <TicketStatusBadge slug={ticket.status?.slug} name={ticket.status?.name} />
        <time className="text-xs text-muted-foreground" dateTime={ticket.created_at}>
          {moment(ticket.created_at).locale('es').fromNow()}
        </time>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Reemplazar `MyTicketsList.tsx`**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw } from 'lucide-react';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { EmptyTicketsState } from './EmptyTicketsState';
import { TicketCard } from './TicketCard';

interface Props {
  tickets: Ticket[];
  activeTicketId: number | null;
  onSelect: (id: number) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function MyTicketsList({ tickets, activeTicketId, onSelect, onRefresh, isRefreshing }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refrescar lista"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyTicketsState />
      ) : (
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
          {tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onClick={onSelect}
              isActive={activeTicketId === t.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: check-types**

Run: `npm run check-types`
Expected: errores en `HelpCenter.tsx` por las nuevas props requeridas de `MyTicketsList`. Se resuelven en Task 17.

- [ ] **Step 4: Stop & report**

---

## Phase E — Sheet de detalle

### Task 13: Skeletons del Sheet

**Files:**
- Create: `src/features/Ayuda/fallback/TicketDetailSheetSkeleton.tsx`
- Create: `src/features/Ayuda/fallback/TicketCommentsThreadSkeleton.tsx`

- [ ] **Step 1: Crear `TicketDetailSheetSkeleton.tsx`**

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export function TicketDetailSheetSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Crear `TicketCommentsThreadSkeleton.tsx`**

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export function TicketCommentsThreadSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex gap-2 ${i % 2 === 1 ? 'justify-end' : ''}`}>
          {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
          <Skeleton className="h-16 w-2/3 rounded-md" />
          {i % 2 === 1 && <Skeleton className="h-8 w-8 rounded-full" />}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: check-types**

Run: `npm run check-types`
Expected: PASS para estos archivos (los errores previos de `HelpCenter` persisten).

- [ ] **Step 4: Stop & report**

---

### Task 14: Header del Sheet + banner de aprobación

**Files:**
- Create: `src/features/Ayuda/components/detail/TicketDetailHeader.tsx`
- Create: `src/features/Ayuda/components/detail/TicketApprovalBanner.tsx`

- [ ] **Step 1: Crear `TicketDetailHeader.tsx`**

```typescript
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Clock } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { parseCategoryFromTitle } from '../../constants/categories';
import { TicketCategoryBadge } from '../TicketCategoryBadge';
import { TicketPriorityBadge } from '../TicketPriorityBadge';
import { TicketStatusBadge } from '../TicketStatusBadge';

interface Props {
  ticket: Ticket;
}

export function TicketDetailHeader({ ticket }: Props) {
  const { categoryLabel, cleanTitle } = parseCategoryFromTitle(ticket.title);
  return (
    <SheetHeader className="border-b p-6">
      <SheetTitle className="text-lg leading-snug">{cleanTitle}</SheetTitle>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {categoryLabel && <TicketCategoryBadge label={categoryLabel} />}
        <TicketStatusBadge slug={ticket.status?.slug} name={ticket.status?.name} />
        <TicketPriorityBadge slug={ticket.priority} />
        {ticket.estimated_hours != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {ticket.estimated_hours} hs estimadas
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Creado {moment(ticket.created_at).locale('es').format('LL [a las] HH:mm')}
        </span>
      </div>
    </SheetHeader>
  );
}
```

- [ ] **Step 2: Crear `TicketApprovalBanner.tsx`**

```typescript
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { useApproveTicket } from '../../hooks/useApproveTicket';
import { useRejectTicket } from '../../hooks/useRejectTicket';

interface Props {
  ticket: Ticket;
  currentUserEmail: string;
}

export function TicketApprovalBanner({ ticket, currentUserEmail }: Props) {
  const isApprover = ticket.approver_email != null && ticket.approver_email === currentUserEmail;
  const canApprove = isApprover && ticket.status?.slug === 'valued';

  const approve = useApproveTicket(ticket.id);
  const reject = useRejectTicket(ticket.id);

  if (!canApprove) return null;

  async function handleApprove() {
    try {
      await approve.mutateAsync();
      toast.success('Aprobación registrada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al aprobar');
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync();
      toast.success('Rechazo registrado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al rechazar');
    }
  }

  const isBusy = approve.isPending || reject.isPending;

  return (
    <div className="border-b bg-amber-50 dark:bg-amber-950/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium">Te pidieron aprobar esta valuación</p>
            {ticket.estimated_hours != null && (
              <p className="text-xs text-muted-foreground">
                Estimación: <strong>{ticket.estimated_hours} hs</strong>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isBusy}>
                Rechazar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmás que rechazás esta valuación?</AlertDialogTitle>
                <AlertDialogDescription>
                  Al rechazar, el ticket vuelve a planificación para revisar el alcance o el esfuerzo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject}>Rechazar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={handleApprove} disabled={isBusy}>
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprobar
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: check-types**

Run: `npm run check-types`
Expected: PASS para estos archivos.

- [ ] **Step 4: Stop & report**

---

### Task 15: Lista de adjuntos + body del Sheet

**Files:**
- Create: `src/features/Ayuda/components/detail/TicketAttachmentsList.tsx`
- Create: `src/features/Ayuda/components/detail/TicketDetailBody.tsx`

- [ ] **Step 1: Crear `TicketAttachmentsList.tsx`**

```typescript
import { ExternalLink, Paperclip } from 'lucide-react';

interface Props {
  urls: string[];
}

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() || url;
    return decodeURIComponent(last);
  } catch {
    return url;
  }
}

export function TicketAttachmentsList({ urls }: Props) {
  if (urls.length === 0) return null;
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Adjuntos ({urls.length})
      </h4>
      <ul className="space-y-1.5">
        {urls.map((url, i) => (
          <li key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <span className="truncate">{fileNameFromUrl(url)}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Crear `TicketDetailBody.tsx`**

`TicketCommentsThread` maneja su propio loading state inline (porque `useQuery` no suspende), así que no envolvemos en `Suspense`:

```typescript
import type { Ticket } from '@/shared/lib/taskapp/types';
import { TicketAttachmentsList } from './TicketAttachmentsList';
import { TicketCommentsThread } from './TicketCommentsThread';

interface Props {
  ticket: Ticket;
  currentUserEmail: string;
  currentUserName: string;
}

export function TicketDetailBody({ ticket, currentUserEmail, currentUserName }: Props) {
  return (
    <div className="space-y-6 p-6">
      {ticket.description && (
        <section>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Descripción</h4>
          <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.description}</p>
        </section>
      )}

      <TicketAttachmentsList urls={ticket.attachments ?? []} />

      <section>
        <h4 className="mb-3 text-sm font-medium text-muted-foreground">Conversación</h4>
        <TicketCommentsThread
          ticketId={ticket.id}
          currentUserEmail={currentUserEmail}
          currentUserName={currentUserName}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: check-types**

Run: `npm run check-types`
Expected: error porque `TicketCommentsThread` aún no existe. Se crea en Task 16.

- [ ] **Step 4: Stop & report**

---

### Task 16: Hilo de comentarios + item + composer

**Files:**
- Create: `src/features/Ayuda/components/detail/TicketCommentItem.tsx`
- Create: `src/features/Ayuda/components/detail/TicketCommentsThread.tsx`
- Create: `src/features/Ayuda/components/detail/TicketCommentComposer.tsx`

- [ ] **Step 1: Crear `TicketCommentItem.tsx`**

```typescript
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import moment from 'moment';
import 'moment/locale/es';
import type { Comment } from '@/shared/lib/taskapp/types';

interface Props {
  comment: Comment;
  currentUserEmail: string;
  currentUserName: string;
}

function initialsFrom(name: string | null, email: string | null): string {
  const source = name?.trim() || email || '?';
  const parts = source.split(/\s|@|\./).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function TicketCommentItem({ comment, currentUserEmail, currentUserName }: Props) {
  const isMine = comment.author_email === currentUserEmail;
  const displayName = isMine ? currentUserName : comment.author_email ?? 'Soporte';
  const initials = initialsFrom(isMine ? currentUserName : null, comment.author_email);
  const isOptimistic = comment.id < 0;

  return (
    <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className={`max-w-[80%] space-y-1 ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            isMine ? 'bg-primary/10 text-foreground' : 'bg-muted text-foreground'
          } ${isOptimistic ? 'opacity-60' : ''}`}
        >
          <p className="whitespace-pre-wrap">{comment.body}</p>
        </div>
        <div className={`flex items-center gap-2 text-[11px] text-muted-foreground ${isMine ? 'justify-end' : ''}`}>
          <span>{displayName}</span>
          <span aria-hidden>·</span>
          <time dateTime={comment.created_at}>
            {moment(comment.created_at).locale('es').fromNow()}
          </time>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `TicketCommentsThread.tsx`**

`useQuery` no suspende por defecto, así que el skeleton se muestra inline cuando `isLoading` (en lugar de delegar al Suspense del body):

```typescript
'use client';

import { MessageSquare } from 'lucide-react';
import { TicketCommentsThreadSkeleton } from '../../fallback/TicketCommentsThreadSkeleton';
import { useTicketComments } from '../../hooks/useTicketComments';
import { TicketCommentComposer } from './TicketCommentComposer';
import { TicketCommentItem } from './TicketCommentItem';

interface Props {
  ticketId: number;
  currentUserEmail: string;
  currentUserName: string;
}

export function TicketCommentsThread({ ticketId, currentUserEmail, currentUserName }: Props) {
  const { data: comments = [], isLoading } = useTicketComments(ticketId);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <TicketCommentsThreadSkeleton />
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-6 w-6" />
          <p>Todavía no hay respuestas. Sé el primero en escribir.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id}>
              <TicketCommentItem
                comment={c}
                currentUserEmail={currentUserEmail}
                currentUserName={currentUserName}
              />
            </li>
          ))}
        </ul>
      )}

      <TicketCommentComposer ticketId={ticketId} currentUserEmail={currentUserEmail} />
    </div>
  );
}
```

- [ ] **Step 3: Crear `TicketCommentComposer.tsx`**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateComment } from '../../hooks/useCreateComment';

interface Props {
  ticketId: number;
  currentUserEmail: string;
}

export function TicketCommentComposer({ ticketId, currentUserEmail }: Props) {
  const [body, setBody] = useState('');
  const mutation = useCreateComment(ticketId, currentUserEmail);

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= 5000 && !mutation.isPending;

  async function handleSend() {
    if (!canSend) return;
    const toSend = trimmed;
    setBody('');
    try {
      await mutation.mutateAsync(toSend);
    } catch (e) {
      setBody(toSend);
      toast.error(e instanceof Error ? e.message : 'Error al enviar');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribí una respuesta… (Ctrl+Enter para enviar)"
        rows={2}
        className="resize-none border-0 focus-visible:ring-0"
        disabled={mutation.isPending}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{trimmed.length}/5000</span>
        <Button type="button" size="sm" onClick={handleSend} disabled={!canSend}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Enviar
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: check-types**

Run: `npm run check-types`
Expected: PASS (los archivos de detalle ya enlazan).

- [ ] **Step 5: Stop & report**

---

### Task 17: Contenedor `TicketDetailSheet` (lazy)

**Files:**
- Create: `src/features/Ayuda/components/detail/TicketDetailSheet.tsx`

- [ ] **Step 1: Crear `TicketDetailSheet.tsx`**

```typescript
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { Inbox } from 'lucide-react';
import { TicketDetailSheetSkeleton } from '../../fallback/TicketDetailSheetSkeleton';
import { useTicketDetail } from '../../hooks/useTicketDetail';
import { TicketApprovalBanner } from './TicketApprovalBanner';
import { TicketDetailBody } from './TicketDetailBody';
import { TicketDetailHeader } from './TicketDetailHeader';

interface Props {
  ticketId: number | null;
  initialTicket: Ticket | null;
  currentUserEmail: string;
  currentUserName: string;
  onClose: () => void;
}

export default function TicketDetailSheet({
  ticketId,
  initialTicket,
  currentUserEmail,
  currentUserName,
  onClose,
}: Props) {
  const open = ticketId != null;
  const initial = initialTicket && initialTicket.id === ticketId ? initialTicket : null;
  const { data: ticket, isLoading } = useTicketDetail(ticketId, initial);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-2xl flex flex-col p-0 gap-0">
        {isLoading && !ticket ? (
          <TicketDetailSheetSkeleton />
        ) : ticket ? (
          <>
            <TicketDetailHeader ticket={ticket} />
            <TicketApprovalBanner ticket={ticket} currentUserEmail={currentUserEmail} />
            <ScrollArea className="flex-1">
              <TicketDetailBody
                ticket={ticket}
                currentUserEmail={currentUserEmail}
                currentUserName={currentUserName}
              />
            </ScrollArea>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Ticket no encontrado o sin acceso</p>
            <p className="text-xs text-muted-foreground">
              Puede que el ticket haya sido eliminado o que no tengas permiso para verlo.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: check-types**

Run: `npm run check-types`
Expected: PASS para este archivo (los errores en `HelpCenter` siguen).

- [ ] **Step 3: Stop & report**

---

## Phase F — Wiring final y validación

### Task 18: Cablear `HelpCenter` + ampliar `page.tsx`

**Files:**
- Modify: `src/features/Ayuda/components/HelpCenter.tsx`
- Modify: `src/app/dashboard/help/page.tsx`

- [ ] **Step 1: Reemplazar `HelpCenter.tsx`**

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Inbox } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { useMyTickets } from '../hooks/useMyTickets';
import type { MyTicketsData } from '../types';
import { MyTicketsList } from './MyTicketsList';
import { TicketForm } from './TicketForm';

const TicketDetailSheet = dynamic(() => import('./detail/TicketDetailSheet'), { ssr: false });

interface Props {
  initialTickets: MyTicketsData;
  initialTicket: Ticket | null;
  initialTicketId: number | null;
  currentUserEmail: string;
  currentUserName: string;
}

export function HelpCenter({
  initialTickets,
  initialTicket,
  initialTicketId,
  currentUserEmail,
  currentUserName,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: tickets = [], isFetching, refetch } = useMyTickets(initialTickets);
  const count = tickets.length;

  const ticketParam = searchParams.get('ticket');
  const activeTicketId = useMemo(() => {
    if (ticketParam == null) return initialTicketId;
    const n = Number(ticketParam);
    return Number.isFinite(n) ? n : null;
  }, [ticketParam, initialTicketId]);

  const handleSelect = useCallback(
    (id: number) => {
      router.replace(`/dashboard/help?ticket=${id}`, { scroll: false });
    },
    [router],
  );

  const handleClose = useCallback(() => {
    router.replace('/dashboard/help', { scroll: false });
  }, [router]);

  return (
    <section className="space-y-8 pt-2">
      <header className="flex items-center gap-4">
        <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <HelpCircle className="h-6 w-6" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Ayuda</h1>
          <p className="text-sm text-muted-foreground">
            Reportá un problema o consultá el estado de tus solicitudes.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <TicketForm />
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Mis tickets</CardTitle>
              <CardDescription>Historial de reportes que enviaste.</CardDescription>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              aria-label={`${count} ${count === 1 ? 'ticket enviado' : 'tickets enviados'}`}
            >
              <Inbox className="h-3.5 w-3.5" />
              {count}
            </span>
          </CardHeader>
          <CardContent>
            <MyTicketsList
              tickets={tickets}
              activeTicketId={activeTicketId}
              onSelect={handleSelect}
              onRefresh={() => refetch()}
              isRefreshing={isFetching}
            />
          </CardContent>
        </Card>
      </div>

      <TicketDetailSheet
        ticketId={activeTicketId}
        initialTicket={initialTicket}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
        onClose={handleClose}
      />
    </section>
  );
}
```

- [ ] **Step 2: Reemplazar `src/app/dashboard/help/page.tsx`**

```typescript
import { getReporterEmail } from '@/features/Ayuda/actions/getReporterEmail';
import { getMySupportTickets, getSupportTicketById } from '@/features/Ayuda/actions/support-tickets';
import { HelpCenter } from '@/features/Ayuda/components/HelpCenter';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Ayuda | ${companyName}`,
      description: `Centro de ayuda de ${companyName}`,
    };
  }
  const fetched = await getCompanyName();
  if (fetched) {
    return {
      title: `Ayuda | ${fetched.company_name}`,
      description: `Centro de ayuda de ${fetched.company_name}`,
    };
  }
  return { title: 'Ayuda' };
}

interface SearchParams {
  ticket?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function HelpPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawId = params.ticket ? Number(params.ticket) : null;
  const ticketId = rawId != null && Number.isFinite(rawId) ? rawId : null;

  const [initialTickets, initialTicket, reporter] = await Promise.all([
    getMySupportTickets(),
    ticketId != null ? getSupportTicketById(ticketId) : Promise.resolve(null),
    getReporterEmail(),
  ]);

  const currentUserEmail = reporter?.email ?? '';
  const currentUserName = reporter?.name ?? reporter?.email ?? 'Usuario';

  return (
    <HelpCenter
      initialTickets={initialTickets}
      initialTicket={initialTicket}
      initialTicketId={ticketId}
      currentUserEmail={currentUserEmail}
      currentUserName={currentUserName}
    />
  );
}
```

- [ ] **Step 3: check-types completo**

Run: `npm run check-types`
Expected: PASS limpio. Todo el árbol compila.

- [ ] **Step 4: Smoke test manual rápido**

Pedir al usuario que levante `npm run dev` y verifique:
1. Abrir `/dashboard/help`: se ve el form con prioridad y adjuntos + lista.
2. Crear un ticket sin adjuntos: aparece en la lista.
3. Crear un ticket con 1 imagen pequeña: aparece y la imagen queda en TaskApp.
4. Click en una card: se abre el Sheet a la derecha, URL cambia a `?ticket=N`.
5. Escribir un comentario, Ctrl+Enter: aparece optimistic.
6. Cerrar el Sheet (Esc o click fuera): URL vuelve a `/dashboard/help`.
7. Compartir la URL con `?ticket=N`: abre directo en el Sheet de ese ticket.

Si algo falla, NO seguir a Task 19 — reportar al usuario para diagnosticar.

- [ ] **Step 5: Stop & report**

---

### Task 19: Tests E2E con Cypress

**Files:**
- Modify: `cypress/e2e/help/help-page.cy.ts`

- [ ] **Step 1: Leer el archivo actual para entender el setup**

Run: lee `cypress/e2e/help/help-page.cy.ts` y los fixtures/commands que use.

- [ ] **Step 2: Agregar test "Crear ticket con prioridad y verificar en la lista"**

Agregar dentro del `describe` principal del archivo (después de los tests V1):

```typescript
it('crea un ticket con prioridad alta y aparece en la lista con su badge', () => {
  cy.visit('/dashboard/help');

  // Form
  cy.contains('label', 'Categoría').parent().find('button').click();
  cy.contains('div', 'Mantenimiento').click();

  cy.contains('label', 'Prioridad').parent().find('button').click();
  cy.contains('div', 'Alta').click();

  cy.contains('label', 'Asunto').parent().find('input').type('Test ticket prioridad alta');
  cy.contains('label', 'Descripción')
    .parent()
    .find('textarea')
    .type('Descripción de prueba para el ticket de prioridad alta.');

  cy.contains('button', 'Enviar reporte').click();

  // Verificar toast + ticket en la lista
  cy.contains('Tu reporte fue enviado').should('be.visible');
  cy.contains('Test ticket prioridad alta').should('be.visible');
  cy.contains('Test ticket prioridad alta')
    .parents('[role="button"]')
    .within(() => {
      cy.contains('Alta').should('be.visible');
    });
});
```

- [ ] **Step 3: Agregar test "Abrir detalle vía click y vía URL"**

```typescript
it('abre el Sheet de detalle al hacer click en una card y refleja la URL', () => {
  cy.visit('/dashboard/help');

  // Asume que ya existe al menos un ticket
  cy.get('[role="button"]')
    .contains('Test ticket prioridad alta')
    .parents('[role="button"]')
    .first()
    .click();

  cy.url().should('include', '?ticket=');
  cy.get('[role="dialog"]').should('be.visible'); // SheetContent
  cy.get('[role="dialog"]').contains('Conversación').should('be.visible');

  // Cerrar con Esc
  cy.get('body').type('{esc}');
  cy.url().should('not.include', '?ticket=');
});
```

- [ ] **Step 4: Agregar test "Comentar en un ticket"**

```typescript
it('agrega un comentario optimistic y queda persistido tras reload', () => {
  cy.visit('/dashboard/help');

  cy.get('[role="button"]').contains('Test ticket prioridad alta').first().click();
  cy.get('[role="dialog"]').should('be.visible');

  cy.get('[role="dialog"]')
    .find('textarea')
    .type('Comentario de prueba E2E');

  cy.get('[role="dialog"]').contains('button', 'Enviar').click();

  // Optimistic visible inmediato
  cy.get('[role="dialog"]').contains('Comentario de prueba E2E').should('be.visible');

  // Reload + reabrir
  cy.reload();
  cy.get('[role="button"]').contains('Test ticket prioridad alta').first().click();
  cy.get('[role="dialog"]').contains('Comentario de prueba E2E').should('be.visible');
});
```

- [ ] **Step 5: Correr los tests E2E**

Run: `npm run test:e2e`
Expected: los 3 tests nuevos pasan. Si fallan, revisar selectores y ajustar.

- [ ] **Step 6: Stop & report**

---

### Task 20: Validación final + checklist de cierre

**Files:** ninguno (verificaciones)

- [ ] **Step 1: check-types final**

Run: `npm run check-types`
Expected: PASS sin errores.

- [ ] **Step 2: Verificar que no hay `console.*`**

Run: `git diff --diff-filter=A --diff-filter=M | findstr /R "console\."`
Expected: vacío. Si hay matches, reemplazar por `Logger`.

- [ ] **Step 3: Verificar que no hay `:any` ni `as any`**

Run grep manual sobre los archivos creados/modificados.
Expected: cero ocurrencias.

- [ ] **Step 4: Verificar archivos creados/modificados con git status**

Run: `git status -s`
Expected: la lista debe coincidir con el resumen del plan:

```
M src/app/dashboard/help/page.tsx
M src/features/Ayuda/actions/support-tickets.ts
A src/features/Ayuda/actions/support-comments.ts
A src/features/Ayuda/actions/support-approval.ts
A src/features/Ayuda/actions/support-attachments.ts
A src/features/Ayuda/components/TicketAttachmentInput.tsx
A src/features/Ayuda/components/TicketPriorityBadge.tsx
A src/features/Ayuda/components/TicketPrioritySelect.tsx
M src/features/Ayuda/components/HelpCenter.tsx
M src/features/Ayuda/components/MyTicketsList.tsx
M src/features/Ayuda/components/TicketCard.tsx
M src/features/Ayuda/components/TicketForm.tsx
A src/features/Ayuda/components/detail/TicketApprovalBanner.tsx
A src/features/Ayuda/components/detail/TicketAttachmentsList.tsx
A src/features/Ayuda/components/detail/TicketCommentComposer.tsx
A src/features/Ayuda/components/detail/TicketCommentItem.tsx
A src/features/Ayuda/components/detail/TicketCommentsThread.tsx
A src/features/Ayuda/components/detail/TicketDetailBody.tsx
A src/features/Ayuda/components/detail/TicketDetailHeader.tsx
A src/features/Ayuda/components/detail/TicketDetailSheet.tsx
A src/features/Ayuda/constants/ticket-priority.ts
M src/features/Ayuda/constants/ticket-status.ts
A src/features/Ayuda/fallback/TicketCommentsThreadSkeleton.tsx
A src/features/Ayuda/fallback/TicketDetailSheetSkeleton.tsx
A src/features/Ayuda/hooks/useApproveTicket.ts
A src/features/Ayuda/hooks/useCreateComment.ts
A src/features/Ayuda/hooks/useRejectTicket.ts
A src/features/Ayuda/hooks/useTicketComments.ts
A src/features/Ayuda/hooks/useTicketDetail.ts
A src/features/Ayuda/hooks/useUploadAttachment.ts
M src/features/Ayuda/types/index.ts
M src/shared/lib/taskapp/client.ts
M src/shared/lib/taskapp/types.ts
M cypress/e2e/help/help-page.cy.ts
```

- [ ] **Step 5: Stop & wait**

Reportar al usuario:
- El feature está completo y testeado.
- Todo queda en working tree, sin commitear.
- Esperar instrucción explícita del usuario para commitear (un solo commit `feat(ayuda): paridad con taskApp-widget — adjuntos, prioridad, detalle, comentarios y UAC` o lo que decida).

---

## Apéndice — Checklist de spec coverage

Cada item de la spec mapeado al task que lo implementa:

| Spec sección | Task(s) |
| --- | --- |
| Tipos extendidos (`priority`, `estimated_hours`, `approver_email`, `Comment`) | 1 |
| Cliente con 7 endpoints + uploadFile multipart | 2 |
| Estados nuevos (`planned`, `valued`, `pending_planning`) | 3 |
| Constants de prioridad (4 niveles, colores, iconos) | 3 |
| `createSupportTicket` extendido con priority + attachments | 4 |
| `getSupportTicketById` con autorización | 4 |
| `listSupportTicketComments` filtrando internos | 5 |
| `createSupportTicketComment` con validaciones | 5 |
| `approveSupportTicket` / `rejectSupportTicket` con `assertCanApprove` | 6 |
| `uploadSupportTicketAttachment` con límites de tamaño y tipo | 7 |
| Hooks de React Query (detail, comments, mutaciones, upload) | 8 |
| Optimistic update de comentarios | 8 |
| `TicketPriorityBadge`, `TicketPrioritySelect` | 9 |
| `TicketAttachmentInput` (max 3 + 10MB) | 10 |
| `TicketForm` con prioridad + adjuntos + upload secuencial | 11 |
| `TicketCard` con badge de prioridad + onClick | 12 |
| `MyTicketsList` con refresh button + active state | 12 |
| Skeletons del Sheet y de comentarios | 13 |
| `TicketDetailHeader` con todos los badges + `estimated_hours` | 14 |
| `TicketApprovalBanner` solo si approver + status valued + AlertDialog para reject | 14 |
| `TicketAttachmentsList` | 15 |
| `TicketDetailBody` con Suspense propio para comentarios | 15 |
| `TicketCommentItem` con bubble + initials + opacity para optimistic | 16 |
| `TicketCommentsThread` con empty state | 16 |
| `TicketCommentComposer` con Ctrl+Enter + rollback en error | 16 |
| `TicketDetailSheet` lazy, manejo de "no encontrado" | 17 |
| URL state `?ticket={id}`, abrir/cerrar via router.replace | 18 |
| Page con SSR de `initialTicket` cuando hay `?ticket=` | 18 |
| E2E Cypress (crear, abrir detalle, comentar) | 19 |
| Validación final (types, console, any, status) | 20 |
