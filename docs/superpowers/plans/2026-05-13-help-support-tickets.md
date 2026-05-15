# Centro de Ayuda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REGLA GLOBAL DEL USUARIO (overridea cualquier instrucción de skill que diga "commit"):**
> NUNCA ejecutar `git commit` ni `git push` en ningún task de este plan. Dejar los cambios en working tree (modified) o staged si conviene. El commit final lo decide el usuario al cierre del trabajo, cuando lo pida explícitamente.
>
> Por la misma razón, los pasos "Commit" del template estándar de superpowers se reemplazan acá por **"Stop & report"**: reportar al usuario qué archivos cambiaron y esperar antes de seguir.

**Spec:** `docs/superpowers/specs/2026-05-13-help-support-tickets-design.md`

**Goal:** Reemplazar el render de `<ReportAnIssue />` en `/dashboard/help` por un Centro de Ayuda con formulario "Reportar un problema" + lista "Mis tickets", integrado al backend Go `taskApp-backend` vía server actions y API key server-only.

**Architecture:** Cliente HTTP `server-only` en `src/shared/lib/taskapp/` encapsula `fetch` al backend Go con header `X-Project-Key`. Feature `Ayuda` orquesta server actions (`createSupportTicket`, `getMySupportTickets`), hooks de React Query y componentes shadcn. La página awaitea `getMySupportTickets()` server-side y pasa los datos al cliente como `initialData`. Layout dos paneles (form izq + lista der, mobile stacking). El código legacy (`ReportAnIssue.tsx`, `/api/send`, template `help`) queda intacto.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, shadcn/ui + Tailwind v4, react-hook-form + zod, @tanstack/react-query, sonner (toasts), moment.js (locale `es`), Supabase (auth), Cypress (E2E).

**Working directory:** `C:/Users/Yorda/OneDrive/Escritorio/Workspace/codecontrol/gh_gestion`

**Testing strategy:** Este repo solo hace E2E con Cypress (no hay unit tests por convención del proyecto). La verificación intermedia entre tasks es `npm run check-types`. El test E2E va al final (Task 14) y cubre el flujo principal.

---

## Task 1: Setup de variables de entorno (acción del usuario, sin código)

Esta task NO es de código. Es un pre-requisito que el usuario hace una sola vez por entorno. La incluimos para que el implementer la verifique antes de seguir.

**Files:** ninguno

- [ ] **Step 1: Verificar que el usuario configuró las env vars**

Pedir al usuario confirmación de que el `.env.local` tiene:

```env
TASKAPP_BASE_URL=http://localhost:8080
TASKAPP_PROJECT_API_KEY=<api_key_del_proyecto_gh_gestion_en_taskApp>
```

Y que el proyecto "gh_gestion" existe en taskApp-backend.

Si el usuario no lo hizo, los tasks de código se pueden seguir igual: el cliente lanza error solo en runtime cuando se llama. Pero el flujo end-to-end de Task 14 (Cypress + manual) requiere las vars.

- [ ] **Step 2: Stop & report**

Confirmar al usuario que se sigue al Task 2.

---

## Task 2: Cliente HTTP de taskApp (errors, types, client)

**Files:**
- Create: `src/shared/lib/taskapp/errors.ts`
- Create: `src/shared/lib/taskapp/types.ts`
- Create: `src/shared/lib/taskapp/client.ts`

- [ ] **Step 1: Crear `errors.ts`**

```typescript
export class TaskAppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: 'config' | 'http' | 'network' | 'parse',
    message: string
  ) {
    super(message);
    this.name = 'TaskAppError';
  }
}
```

- [ ] **Step 2: Crear `types.ts`**

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

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status_id: number;
  status?: TicketStatus;
  priority: string;
  reporter_email: string | null;
  reporter_name: string | null;
  attachments: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  labels: TicketLabel[];
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  reporter_email: string;
  reporter_name?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}
```

- [ ] **Step 3: Crear `client.ts`**

```typescript
import 'server-only';
import { Logger } from '@/lib/logger';
import { TaskAppError } from './errors';
import type { CreateTicketRequest, Ticket } from './types';

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

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Key': apiKey(),
        ...init.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
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

export const taskAppClient = {
  createTicket: (body: CreateTicketRequest) =>
    request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(body) }),

  listTicketsByReporter: (reporterEmail: string) =>
    request<Ticket[]>(`/tickets?reporter_email=${encodeURIComponent(reporterEmail)}`),
};
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run check-types`
Expected: PASS (0 errores nuevos).

> Nota: `import 'server-only'` requiere que el paquete `server-only` esté instalado. Es transitivo en Next.js 16; si fallara el build, el implementer puede instalarlo con `npm install server-only --save`. Reportar al usuario antes de instalar.

- [ ] **Step 5: Stop & report**

Reportar al usuario: 3 archivos nuevos en `src/shared/lib/taskapp/`, `npm run check-types` OK.

---

## Task 3: Constants (categorías + estados de ticket)

**Files:**
- Create: `src/features/Ayuda/constants/categories.ts`
- Create: `src/features/Ayuda/constants/ticket-status.ts`
- Create: `src/features/Ayuda/types/index.ts`

- [ ] **Step 1: Crear `categories.ts`**

```typescript
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  HandHelping,
  LayoutDashboard,
  MoreHorizontal,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type CategorySlug =
  | 'dashboard'
  | 'empresa'
  | 'empleados'
  | 'equipos'
  | 'comercial'
  | 'documentacion'
  | 'operaciones'
  | 'mantenimiento'
  | 'formularios'
  | 'otro';

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryDef[] = [
  { slug: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { slug: 'empresa', label: 'Empresa', icon: Building2 },
  { slug: 'empleados', label: 'Empleados', icon: Users },
  { slug: 'equipos', label: 'Equipos', icon: Truck },
  { slug: 'comercial', label: 'Comercial', icon: HandHelping },
  { slug: 'documentacion', label: 'Documentación', icon: FileText },
  { slug: 'operaciones', label: 'Operaciones', icon: Calendar },
  { slug: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
  { slug: 'formularios', label: 'Formularios', icon: ClipboardList },
  { slug: 'otro', label: 'Otro', icon: MoreHorizontal },
];

export const CATEGORY_BY_SLUG: Record<CategorySlug, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
) as Record<CategorySlug, CategoryDef>;

const CATEGORY_PREFIX_RE = /^\[([^\]]+)\]\s*(.*)$/;

export function parseCategoryFromTitle(title: string): { categoryLabel: string | null; cleanTitle: string } {
  const match = title.match(CATEGORY_PREFIX_RE);
  if (!match) return { categoryLabel: null, cleanTitle: title };
  return { categoryLabel: match[1], cleanTitle: match[2] || title };
}

export function buildTitleWithCategory(category: CategorySlug, rawTitle: string): string {
  const label = CATEGORY_BY_SLUG[category]?.label ?? 'Otro';
  return `[${label}] ${rawTitle.trim()}`;
}
```

> Verificar que `HandHelping` exista en `lucide-react`. Si no, usar `Handshake` o cualquier ícono compatible.

- [ ] **Step 2: Crear `ticket-status.ts`**

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

- [ ] **Step 3: Crear `types/index.ts`**

```typescript
export type { CategorySlug, CategoryDef } from '../constants/categories';
export type { StatusDef } from '../constants/ticket-status';
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 5: Stop & report**

---

## Task 4: Helper server-side `getReporterEmail`

**Files:**
- Create: `src/features/Ayuda/server/getReporterEmail.ts`

- [ ] **Step 1: Crear `getReporterEmail.ts`**

```typescript
'use server';

import { supabaseServer } from '@/lib/supabase/server';

export interface ReporterIdentity {
  email: string;
  name: string | null;
}

export async function getReporterEmail(): Promise<ReporterIdentity | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstname = typeof meta.firstname === 'string' ? meta.firstname : null;
  const lastname = typeof meta.lastname === 'string' ? meta.lastname : null;
  const fullName = typeof meta.full_name === 'string' ? meta.full_name : null;

  let name: string | null = null;
  if (firstname && lastname) name = `${firstname} ${lastname}`;
  else if (fullName) name = fullName;
  else if (firstname) name = firstname;

  return { email: user.email, name };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

## Task 5: Server Actions (`createSupportTicket`, `getMySupportTickets`)

**Files:**
- Create: `src/features/Ayuda/actions/support-tickets.ts`

> Nota: el archivo legacy `src/features/Ayuda/actions/company-details.ts` NO se modifica.

- [ ] **Step 1: Crear `support-tickets.ts`**

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { TaskAppError } from '@/shared/lib/taskapp/errors';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { buildTitleWithCategory, type CategorySlug } from '../constants/categories';
import { getReporterEmail } from '../server/getReporterEmail';

const logger = new Logger('features/Ayuda/support-tickets');

export interface CreateSupportTicketInput {
  category: CategorySlug;
  title: string;
  description: string;
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<Ticket> {
  const reporter = await getReporterEmail();
  if (!reporter) {
    logger.warn('createSupportTicket sin usuario autenticado');
    throw new Error('No hay usuario autenticado');
  }

  logger.info('Creando ticket de soporte', {
    data: { category: input.category, email: reporter.email },
  });

  try {
    return await taskAppClient.createTicket({
      title: buildTitleWithCategory(input.category, input.title),
      description: input.description,
      reporter_email: reporter.email,
      reporter_name: reporter.name ?? undefined,
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

export type MyTicketsData = Awaited<ReturnType<typeof getMySupportTickets>>;
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

## Task 6: React Query hooks (`useMyTickets`, `useCreateTicket`)

**Files:**
- Create: `src/features/Ayuda/hooks/useMyTickets.ts`
- Create: `src/features/Ayuda/hooks/useCreateTicket.ts`

- [ ] **Step 1: Crear `useMyTickets.ts`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getMySupportTickets, type MyTicketsData } from '../actions/support-tickets';

export const MY_TICKETS_QUERY_KEY = ['ayuda', 'my-support-tickets'] as const;

export function useMyTickets(initialData?: MyTicketsData) {
  return useQuery({
    queryKey: MY_TICKETS_QUERY_KEY,
    queryFn: () => getMySupportTickets(),
    initialData,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 2: Crear `useCreateTicket.ts`**

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupportTicket } from '../actions/support-tickets';
import { MY_TICKETS_QUERY_KEY } from './useMyTickets';

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    },
  });
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 4: Stop & report**

---

## Task 7: Badges (`TicketStatusBadge`, `TicketCategoryBadge`)

**Files:**
- Create: `src/features/Ayuda/components/TicketStatusBadge.tsx`
- Create: `src/features/Ayuda/components/TicketCategoryBadge.tsx`

- [ ] **Step 1: Crear `TicketStatusBadge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { statusFor } from '../constants/ticket-status';

interface Props {
  slug: string | undefined;
  name: string | undefined;
}

export function TicketStatusBadge({ slug, name }: Props) {
  const def = statusFor(slug, name);
  return (
    <Badge variant="outline" className={`border-transparent ${def.badgeClass}`}>
      {def.label}
    </Badge>
  );
}
```

- [ ] **Step 2: Crear `TicketCategoryBadge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';

interface Props {
  label: string;
}

export function TicketCategoryBadge({ label }: Props) {
  return (
    <Badge variant="secondary" className="font-normal">
      {label}
    </Badge>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 4: Stop & report**

---

## Task 8: Empty state + Skeleton

**Files:**
- Create: `src/features/Ayuda/components/EmptyTicketsState.tsx`
- Create: `src/features/Ayuda/fallback/MyTicketsListSkeleton.tsx`

- [ ] **Step 1: Crear `EmptyTicketsState.tsx`**

```tsx
import { Inbox } from 'lucide-react';

export function EmptyTicketsState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed text-center px-6 py-12">
      <Inbox className="h-10 w-10 text-muted-foreground/60 mb-3" />
      <h3 className="font-medium">Todavía no enviaste ningún reporte</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Cuando lo hagas, vas a verlo acá con su estado actual.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Crear `MyTicketsListSkeleton.tsx`**

```tsx
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function MyTicketsListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="p-4 border-l-4 border-l-muted">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-4/5" />
          <div className="mt-3 flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 4: Stop & report**

---

## Task 9: `TicketCard`

**Files:**
- Create: `src/features/Ayuda/components/TicketCard.tsx`

- [ ] **Step 1: Crear `TicketCard.tsx`**

```tsx
import { Card } from '@/components/ui/card';
import moment from 'moment';
import 'moment/locale/es';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { parseCategoryFromTitle } from '../constants/categories';
import { statusFor } from '../constants/ticket-status';
import { TicketCategoryBadge } from './TicketCategoryBadge';
import { TicketStatusBadge } from './TicketStatusBadge';

interface Props {
  ticket: Ticket;
}

export function TicketCard({ ticket }: Props) {
  const { categoryLabel, cleanTitle } = parseCategoryFromTitle(ticket.title);
  const status = statusFor(ticket.status?.slug, ticket.status?.name);

  return (
    <Card
      className={`border-l-4 ${status.borderClass} p-4 animate-in fade-in-50 slide-in-from-top-2 duration-300`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug">{cleanTitle}</h3>
        {categoryLabel && <TicketCategoryBadge label={categoryLabel} />}
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

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

## Task 10: `MyTicketsList`

**Files:**
- Create: `src/features/Ayuda/components/MyTicketsList.tsx`

- [ ] **Step 1: Crear `MyTicketsList.tsx`**

```tsx
'use client';

import type { Ticket } from '@/shared/lib/taskapp/types';
import { EmptyTicketsState } from './EmptyTicketsState';
import { TicketCard } from './TicketCard';

interface Props {
  tickets: Ticket[];
}

export function MyTicketsList({ tickets }: Props) {
  if (tickets.length === 0) {
    return <EmptyTicketsState />;
  }

  return (
    <div className="flex flex-col gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

## Task 11: `TicketForm`

**Files:**
- Create: `src/features/Ayuda/components/TicketForm.tsx`

- [ ] **Step 1: Crear `TicketForm.tsx`**

```tsx
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
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CATEGORIES, type CategorySlug } from '../constants/categories';
import { useCreateTicket } from '../hooks/useCreateTicket';

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
  title: z
    .string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(200, 'Máximo 200 caracteres'),
  description: z
    .string()
    .trim()
    .min(10, 'Contanos un poco más (mínimo 10 caracteres)')
    .max(5000, 'Máximo 5000 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

export function TicketForm() {
  const mutation = useCreateTicket();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: 'otro' as CategorySlug,
      title: '',
      description: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync(values);
      toast.success('Tu reporte fue enviado. Te avisaremos cuando haya novedades.');
      form.reset({ category: values.category, title: '', description: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos enviar tu reporte');
    }
  }

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Reportar un problema</CardTitle>
          <CardDescription>Contanos qué pasó y vamos a ocuparnos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asunto</FormLabel>
                <FormControl>
                  <Input placeholder="Resumí en una línea qué te pasa" {...field} />
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

## Task 12: `HelpCenter` (orquestador del layout)

**Files:**
- Create: `src/features/Ayuda/components/HelpCenter.tsx`

> Nota: NO se toca `src/features/Ayuda/components/ReportAnIssue.tsx` (queda intacto como referencia legacy).

- [ ] **Step 1: Crear `HelpCenter.tsx`**

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import type { MyTicketsData } from '../actions/support-tickets';
import { useMyTickets } from '../hooks/useMyTickets';
import { MyTicketsList } from './MyTicketsList';
import { TicketForm } from './TicketForm';

interface Props {
  initialTickets: MyTicketsData;
}

export function HelpCenter({ initialTickets }: Props) {
  const { data: tickets = [] } = useMyTickets(initialTickets);

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <HelpCircle className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Centro de Ayuda</h1>
            <p className="text-sm text-muted-foreground">
              Reportá un problema o consultá el estado de tus solicitudes.
            </p>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        <Card className="p-0">
          <TicketForm />
        </Card>
        <MyTicketsList tickets={tickets} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 3: Stop & report**

---

## Task 13: Actualizar `/dashboard/help/page.tsx`

**Files:**
- Modify: `src/app/dashboard/help/page.tsx`

> Nota: `ReportAnIssue.tsx` queda intacto. Solo se cambia el import + lo que la página renderiza.

- [ ] **Step 1: Leer estado actual**

Confirmar que el archivo actual importa `ReportAnIssue` y lo renderiza. (Ver spec §5.)

- [ ] **Step 2: Reemplazar contenido**

Sustituir el contenido de `src/app/dashboard/help/page.tsx` por:

```tsx
import { getMySupportTickets } from '@/features/Ayuda/actions/support-tickets';
import { HelpCenter } from '@/features/Ayuda/components/HelpCenter';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
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

export default async function HelpPage() {
  const initialTickets = await getMySupportTickets();

  return (
    <PermissionGuard module="ayuda" action="view" redirect>
      <HelpCenter initialTickets={initialTickets} />
    </PermissionGuard>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS.

> Si `PermissionGuard` no acepta `action="view"` o `redirect` (chequear su API real en `src/features/Permissions/components/PermissionGuard.tsx`), ajustar las props al contrato real. Si la prop fuera distinta (ej. `requiredAction`, `tab`), adaptarla — NO inventar campos. Reportar al usuario si el shape no calza con lo asumido.

- [ ] **Step 4: Levantar dev server y probar manualmente**

Run: `npm run dev` en background
Abrir `http://localhost:3000/dashboard/help` (con sesión iniciada)

Validaciones manuales:
1. Se ve el header "Centro de Ayuda".
2. Form a la izquierda con Categoría / Asunto / Descripción.
3. Lista a la derecha (vacía o con tickets reales si las env vars están configuradas).
4. Submit del form con campos válidos → si las env vars están OK → ticket aparece en la lista.
5. Sin env vars → toast de error "El servicio de soporte no está configurado", la página no crashea.

- [ ] **Step 5: Stop & report**

Capturar al usuario qué se vio (visualmente) y si el end-to-end funciona.

---

## Task 14: Test E2E con Cypress

**Files:**
- Create: `cypress/e2e/ayuda/help-center.cy.ts`

> Nota: el test mockea el backend Go con `cy.intercept` para no depender de que esté levantado durante la corrida de Cypress.

- [ ] **Step 1: Inspeccionar config Cypress existente**

Leer `cypress.config.ts` y un test existente (ej: `cypress/e2e/<algún test>.cy.ts`) para entender la convención de login del proyecto.

- [ ] **Step 2: Crear `help-center.cy.ts`**

> Adaptá el patrón de login a la convención del repo. Asumo que existe un comando `cy.login()` o similar; si no, reemplazar por el flujo manual.

```typescript
describe('Centro de Ayuda', () => {
  beforeEach(() => {
    cy.login(); // ajustar al helper de login del repo
  });

  it('muestra el centro de ayuda con form y lista vacía', () => {
    cy.intercept('GET', '**/api/public/v1/tickets**', { body: [] }).as('listTickets');
    cy.visit('/dashboard/help');

    cy.contains('h1', 'Centro de Ayuda').should('be.visible');
    cy.contains('Reportar un problema').should('be.visible');
    cy.contains('Todavía no enviaste ningún reporte').should('be.visible');
  });

  it('valida campos requeridos antes de enviar', () => {
    cy.intercept('GET', '**/api/public/v1/tickets**', { body: [] });
    cy.visit('/dashboard/help');

    cy.contains('button', 'Enviar reporte').click();
    cy.contains('Mínimo 3 caracteres').should('be.visible');
    cy.contains('mínimo 10 caracteres').should('be.visible');
  });

  it('crea un ticket y lo muestra en la lista', () => {
    cy.intercept('GET', '**/api/public/v1/tickets**', { body: [] }).as('listEmpty');

    const created = {
      id: 42,
      title: '[Empleados] No puedo subir el legajo',
      description: 'Intento subir el PDF y devuelve error 500',
      status_id: 1,
      status: { id: 1, slug: 'open', name: 'Abierto' },
      priority: 'medium',
      reporter_email: 'test@example.com',
      reporter_name: 'Test User',
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      labels: [],
    };

    cy.intercept('POST', '**/api/public/v1/tickets', {
      statusCode: 201,
      body: created,
    }).as('createTicket');

    cy.visit('/dashboard/help');

    // Seleccionar Empleados
    cy.get('[role="combobox"]').first().click();
    cy.contains('[role="option"]', 'Empleados').click();

    cy.get('input').first().type('No puedo subir el legajo');
    cy.get('textarea').first().type('Intento subir el PDF y devuelve error 500.');

    // Tras submit, el GET de listado se llama de nuevo (invalidate). Responder con el creado.
    cy.intercept('GET', '**/api/public/v1/tickets**', { body: [created] }).as('listWithOne');

    cy.contains('button', 'Enviar reporte').click();

    cy.wait('@createTicket');
    cy.contains('Tu reporte fue enviado').should('be.visible');
    cy.contains('No puedo subir el legajo').should('be.visible');
    cy.contains('Empleados').should('be.visible');
    cy.contains('Abierto').should('be.visible');
  });
});
```

- [ ] **Step 3: Correr el test**

Run: `npm run test:e2e -- --spec cypress/e2e/ayuda/help-center.cy.ts`
Expected: 3 tests pasando.

> Si el helper `cy.login()` no existe o la convención difiere, ajustar al patrón real del repo y reportar al usuario.

- [ ] **Step 4: Stop & report**

---

## Task 15: Verificación final + handoff al usuario

**Files:** ninguno (verificación)

- [ ] **Step 1: Lint de tipos full**

Run: `npm run check-types`
Expected: PASS, 0 errores.

- [ ] **Step 2: Búsqueda de patrones prohibidos**

Run (PowerShell):
```powershell
Get-ChildItem -Path src/features/Ayuda, src/shared/lib/taskapp -Recurse -Include *.ts,*.tsx |
  Select-String -Pattern "console\.|: any|as any|date-fns|useEffect"
```

Expected: ninguna coincidencia en archivos nuevos. (`useEffect` y `date-fns` están prohibidos por reglas del repo; `console.*` y `any` también.)

> Si aparecen matches solo en `ReportAnIssue.tsx` o `company-details.ts`, está OK: son legacy intactos.

- [ ] **Step 3: Listar archivos creados/modificados**

Run: `git status` y `git diff --stat`

Comparar contra esta lista esperada:

```
NUEVOS:
src/shared/lib/taskapp/errors.ts
src/shared/lib/taskapp/types.ts
src/shared/lib/taskapp/client.ts
src/features/Ayuda/constants/categories.ts
src/features/Ayuda/constants/ticket-status.ts
src/features/Ayuda/types/index.ts
src/features/Ayuda/server/getReporterEmail.ts
src/features/Ayuda/actions/support-tickets.ts
src/features/Ayuda/hooks/useMyTickets.ts
src/features/Ayuda/hooks/useCreateTicket.ts
src/features/Ayuda/components/TicketStatusBadge.tsx
src/features/Ayuda/components/TicketCategoryBadge.tsx
src/features/Ayuda/components/EmptyTicketsState.tsx
src/features/Ayuda/components/TicketCard.tsx
src/features/Ayuda/components/MyTicketsList.tsx
src/features/Ayuda/components/TicketForm.tsx
src/features/Ayuda/components/HelpCenter.tsx
src/features/Ayuda/fallback/MyTicketsListSkeleton.tsx
cypress/e2e/ayuda/help-center.cy.ts

MODIFICADOS:
src/app/dashboard/help/page.tsx
docs/superpowers/specs/2026-05-13-help-support-tickets-design.md (creado en brainstorming)
docs/superpowers/plans/2026-05-13-help-support-tickets.md      (este archivo)

LEGACY INTACTOS (verificar git diff):
src/features/Ayuda/components/ReportAnIssue.tsx        ← sin cambios
src/features/Ayuda/actions/company-details.ts          ← sin cambios
(cualquier archivo de /api/send o template 'help')     ← sin cambios
```

- [ ] **Step 4: Stop & handoff al usuario**

NO commitear. Reportar al usuario:
- Archivos creados / modificados
- Output de `npm run check-types` (PASS)
- Resultado del E2E (PASS / FAIL + detalles)
- Validación manual realizada en `npm run dev`
- Cualquier asunción que tuvo que tomar (ej. ajustes al `cy.login()`, props de `PermissionGuard`, etc.)

Esperar instrucciones del usuario. NO ejecutar `git commit` ni `git push` hasta que el usuario lo pida explícitamente con palabras inequívocas ("commiteá", "haz commit", "commit y push").

---

## Self-Review (post-escritura del plan)

### Cobertura del spec

| Sección del spec | Task que la implementa |
| --- | --- |
| §1 Setup operativo (env vars) | Task 1 (acción del usuario) |
| §2 Cliente HTTP de taskApp | Task 2 |
| §3 Feature Ayuda — estructura | Tasks 3-12 (granuladas por archivo/responsabilidad) |
| §3 `constants/categories.ts` | Task 3 |
| §3 `constants/ticket-status.ts` | Task 3 |
| §3 `server/getReporterEmail.ts` | Task 4 |
| §3 `actions/support-tickets.ts` | Task 5 |
| §3 `hooks/useMyTickets.ts` + `useCreateTicket.ts` | Task 6 |
| §4 Componentes (badges) | Task 7 |
| §4 Componentes (empty state + skeleton) | Task 8 |
| §4 `TicketCard` | Task 9 |
| §4 `MyTicketsList` | Task 10 |
| §4 `TicketForm` | Task 11 |
| §4 `HelpCenter` | Task 12 |
| §5 Página `/dashboard/help` | Task 13 |
| §6 Manejo de errores | Cubierto en Tasks 2 (TaskAppError), 5 (try/catch en server actions), 11 (toast.error en form), 13 (validación manual sin env vars) |
| §7 Testing (Cypress E2E) | Task 14 |
| Definition of Done | Task 15 (verificación final) |

### Placeholders / red flags

Sin placeholders ni "TODO". Todos los snippets contienen código completo. Notas de "verificar API real" (`PermissionGuard` props, `HandHelping` icon, `cy.login()` helper) son explícitas y el implementer sabe qué hacer si el contrato real difiere.

### Consistencia de tipos

- `MyTicketsData` se define en Task 5 (`support-tickets.ts`) y se usa en Tasks 6 (hook) y 12 (HelpCenter prop). ✓
- `CategorySlug` se define en Task 3 (`categories.ts`) y se usa en Tasks 5 (server action input), 11 (form schema enum), 12 (no se usa allí, pero está disponible). ✓
- `Ticket` viene de `src/shared/lib/taskapp/types` (Task 2) y se usa en Tasks 5, 6, 9, 10. ✓
- `MY_TICKETS_QUERY_KEY` exportado de Task 6 y consumido por `useCreateTicket` también de Task 6. ✓

### Scope

V1 = crear ticket + lista propia. No hay detail/comments/attachments. Consistente con el spec.
