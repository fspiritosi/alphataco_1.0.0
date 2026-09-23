# Centro de Ayuda — Reporte de tickets de soporte integrado a taskApp

**Date**: 2026-05-13
**Branch**: `dev`
**Status**: Draft (pendiente de revisión del usuario)
**Stack involucrado**: gh_gestion (Next.js 16 / React 19) + taskApp-backend (Go / chi)

## Contexto

Hoy `/dashboard/help` renderiza `<ReportAnIssue />` (`src/features/Ayuda/components/ReportAnIssue.tsx`), un formulario que envía un email a `info@gh-gestion.com` vía `/api/send`. El backend `taskApp-backend` (repo aparte, Go) ya expone un sistema de tickets con autenticación por API key de proyecto en `POST /api/public/v1/tickets` (más list, get, comments, upload).

El usuario quiere reemplazar el flujo de email por **tickets reales** en taskApp, ya asignados al proyecto "gh_gestion". El feature debe poder reusarse en otros proyectos del usuario cambiando solamente la `TASKAPP_PROJECT_API_KEY`. No es multitenant — esta app la usa una sola empresa.

## Problema

1. **Tickets no rastreables**: el email actual no genera un registro. No hay forma de saber el estado del pedido ni de comentarlo.
2. **Sin seguimiento del lado del usuario**: quien envía el reporte no puede ver qué pasó con él.
3. **Sin categoría**: el email no etiqueta el área del problema, lo que dificulta triage.
4. **Sin reusabilidad**: el formulario actual está hardcodeado para `info@gh-gestion.com`. Para usarlo en otro proyecto del usuario hay que reescribir.

## Solución (V1)

Reemplazar el render de `<ReportAnIssue />` en `/dashboard/help` por un **Centro de Ayuda** con dos paneles:

- **Panel izquierdo**: formulario "Reportar un problema" con campos **Asunto** + **Descripción** + **Categoría** (lista fija = ítems del sidebar). Submit dispara una server action que llama a `POST /api/public/v1/tickets` del backend Go.
- **Panel derecho**: "Mis tickets" — lista de los tickets enviados por el usuario logueado (filtra por su email server-side), con badge de estado, badge de categoría, asunto y fecha relativa.

En mobile el grid colapsa vertical (form arriba, lista abajo). Al crear un ticket, la lista se refresca con `queryClient.invalidateQueries`. El usuario nuevo o el que cambia de pestaña con foco re-fetchea en segundo plano.

Sin tocar el código legacy de `/api/send` ni de `ReportAnIssue.tsx` (queda como referencia inerte; se elimina solo el render desde la `page.tsx`).

## Decisiones tomadas durante el brainstorming

| Decisión | Valor |
| --- | --- |
| Alcance V1 | Crear ticket + lista "Mis tickets" (sin detail, sin comments, sin attachments) |
| Acceso al backend | Server-only API key + Server Actions de Next.js como proxy (key nunca llega al navegador) |
| Campos del form | Asunto (req) + Descripción (req) + Categoría (req, lista fija) |
| Categorías | Items del sidebar minus "Ayuda": Dashboard, Empresa, Empleados, Equipos, Comercial, Documentación, Operaciones, Mantenimiento, Formularios + "Otro" como fallback |
| Reporter email | Tomado server-side del usuario logueado en Supabase (`supabaseServer().auth.getUser()`). No se pide en el form. |
| Email legacy a info@gh-gestion.com | Ignorar: la V1 NO envía email, y NO se borra el código viejo (`/api/send`, `ReportAnIssue.tsx`, template `help` quedan en el repo sin uso). |
| Ruta | `/dashboard/help` (existente) — solo se reemplaza el componente importado en la `page.tsx`. |
| Layout | Opción A — dos paneles lado a lado (form + lista). |
| Realtime | NO — `invalidateQueries` post-mutation + `refetchOnWindowFocus`. Si en V2 se necesita push, taskApp-backend ya tiene SSE pero requiere auth distinta. |
| Auth de la página | `PermissionGuard module="ayuda" action="view"` (módulo y permisos ya existen en BD: `7785379f-1e5f-692f-da2d-fccf9ee5af39`). |
| Setup operativo (fuera de código) | El usuario crea el proyecto "gh_gestion" en taskApp-backend y configura `TASKAPP_BASE_URL` + `TASKAPP_PROJECT_API_KEY` en el `.env.local` / `.env.production` de gh_gestion. |

### Decisiones tomadas automáticamente (basadas en reglas del repo + best practices)

- **Forms**: `react-hook-form` + `zod` + `Form` de shadcn (regla `.claude/rules/forms.md`). Schema con `z.infer<typeof formSchema>` para tipado.
- **Fetching cliente**: React Query (`useQuery` + `useMutation`) con hooks dedicados (`useMyTickets`, `useCreateTicket`). Server action en `queryFn`. (regla `react-query.md`, `no-useeffect.md`).
- **Server actions**: en `src/features/Ayuda/actions/support-tickets.ts` con `'use server'`. Sin `console.*` — Logger con scope `features/Ayuda/support-tickets`. Sin `:any` — tipos inferidos del cliente HTTP de taskApp.
- **Server Components First** (regla `server-components.md`): la página obtiene el email del usuario server-side y pre-fetchea los tickets como `initialData` para el cliente. El form/lista interactivos son client components que reciben datos iniciales.
- **Loading states**: la página awaitea los tickets server-side (rápido) y los pasa como `initialData` al `useQuery`. El `MyTicketsListSkeleton` (en `src/features/Ayuda/fallback/`) se usa cuando `isFetching && !initialData` en el `MyTicketsList` (caso de fallo del SSR fetch o refetch manual). Sin `Suspense` boundary porque el `await` server-side ya bloquea hasta tener los datos.
- **moment.js** para fechas relativas en la lista (`moment(t.created_at).locale('es').fromNow()`).
- **Diseño visual** (siguiendo `frontend-design`):
  - Header de página con icono `HelpCircle` + título "Centro de Ayuda" + subtítulo descriptivo y contador "X tickets" del lado derecho del header.
  - Form en `Card` con `CardHeader` + `CardContent` + `CardFooter`. Botón submit con loading state (`Loader2` animado).
  - Lista de tickets: cada ticket en una mini-card con `border-l-4` coloreado según estado (visual scan rápido), título grande, badge de categoría arriba a la derecha, badge de estado abajo a la izquierda, fecha relativa abajo a la derecha.
  - Status badges con paleta semántica: `open` (azul slate), `in_progress` (amarillo), `done` (verde), `blocked` (rojo). Mapping completo en `ticket-status.ts`.
  - Empty state ilustrado (icono `Inbox` + texto + CTA "Reportá tu primer problema") cuando la lista viene vacía.
  - Subtle fade-in en cards de la lista (Tailwind `animate-in fade-in-50 slide-in-from-top-2 duration-300`) para que el ticket recién creado se sienta "entrando" al inval.
- **Vercel React best practices**: server-first, hybrid pattern con `initialData`, `useCallback` para handlers que se pasan a hijos, no hay `useEffect` para data fetching, queries con `staleTime` razonable (60s).

### Decisión no tomada — Categoría como prefijo de título

El endpoint `POST /api/public/v1/tickets` de taskApp **no acepta `labels`** en el body. Las labels solo se asignan vía endpoints protegidos. Para V1, **prefijamos el título con la categoría** entre brackets para que el receptor las distinga al revisar tickets en taskApp:

```
title: "[Empleados] No puedo subir el legajo"
```

Esto se hace dentro del cliente HTTP (`src/shared/lib/taskapp/client.ts`) o del helper de la server action, así el componente no se preocupa por el formato. La categoría también vuelve cuando listamos los tickets y se parsea del título para mostrarla en su badge propio en la card.

**Trade-off**: el título queda con ruido en taskApp. **Alternativa V2**: agregar campo `category` al `CreatePublicTicketRequest` del backend Go + crear/asignar label automáticamente. Requiere PR al repo taskApp-backend (~30 líneas). Documentado en "Fuera de alcance / V2".

## Diseño detallado

### 1. Setup operativo (fuera del código)

El usuario hace, una sola vez por entorno:

1. Levantar el `taskApp-backend` y crear un workspace + un proyecto llamado "gh_gestion" (o equivalente por entorno: dev / prod).
2. Copiar la API key generada del proyecto.
3. Agregar al `.env.local` (dev) y al entorno de prod:

```env
TASKAPP_BASE_URL=http://localhost:8080         # o la URL pública en prod
TASKAPP_PROJECT_API_KEY=ppk_xxxxxxxxxxxxxxxx
```

Sin estas vars, las server actions del Ayuda devuelven error y la lista/form muestran un error controlado ("Servicio de soporte no configurado, contactá al administrador").

### 2. Cliente HTTP del backend de taskApp

Ubicación: `src/shared/lib/taskapp/`

```
src/shared/lib/taskapp/
├── client.ts        # fetch wrapper server-only
├── types.ts         # Ticket, CreateTicketRequest, ListTicketsParams
└── errors.ts        # TaskAppError (status + code + message)
```

#### `client.ts` — esquema

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
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Project-Key': apiKey(),
      ...init.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error('taskApp request failed', { data: { url, status: res.status, body } });
    throw new TaskAppError(res.status, 'http', body || res.statusText);
  }

  return (await res.json()) as T;
}

export const taskAppClient = {
  createTicket: (body: CreateTicketRequest) =>
    request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(body) }),

  listTicketsByReporter: (reporterEmail: string) =>
    request<Ticket[]>(`/tickets?reporter_email=${encodeURIComponent(reporterEmail)}`),
};
```

Notas:
- `'server-only'` importa hace que cualquier intento de bundlear este archivo en cliente falle en build → garantía estática de que la API key no se filtra.
- `X-Project-Key` es el header que usa el middleware `APIKeyAuth(projectRepo)` del backend (confirmado en `taskApp-backend/internal/middleware/apikey.go:18`).
- `cache: 'no-store'` para que Next no haga caching agresivo de los listados.
- Tipos `Ticket`, `CreateTicketRequest` mapean 1:1 el JSON del backend (`internal/model/task.go`).

#### `types.ts`

```typescript
export interface Ticket {
  id: number;
  title: string;
  description: string;
  status_id: number;
  status?: { id: number; slug: string; name: string; color?: string };
  priority: 'low' | 'medium' | 'high' | 'critical' | string;
  reporter_email: string | null;
  reporter_name: string | null;
  attachments: string[];
  created_at: string;  // ISO
  updated_at: string;  // ISO
  resolved_at: string | null;
  labels: Array<{ id: number; name: string; slug: string; color?: string }>;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  reporter_email: string;
  reporter_name?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}
```

### 3. Feature `Ayuda` — estructura

```
src/features/Ayuda/
├── actions/
│   ├── company-details.ts                # LEGACY, no se toca
│   └── support-tickets.ts                # NUEVO — server actions
├── components/
│   ├── ReportAnIssue.tsx                 # LEGACY, no se toca
│   ├── HelpCenter.tsx                    # NUEVO — orquesta el layout (Client Component)
│   ├── TicketForm.tsx                    # NUEVO — RHF + Zod
│   ├── MyTicketsList.tsx                 # NUEVO — useQuery + render
│   ├── TicketCard.tsx                    # NUEVO — card individual
│   ├── TicketStatusBadge.tsx             # NUEVO — badge con color
│   ├── TicketCategoryBadge.tsx           # NUEVO — badge de categoría
│   └── EmptyTicketsState.tsx             # NUEVO — estado vacío
├── constants/
│   ├── categories.ts                     # NUEVO — slug ↔ label ↔ icon
│   └── ticket-status.ts                  # NUEVO — slug ↔ label ↔ color
├── fallback/
│   └── MyTicketsListSkeleton.tsx         # NUEVO — skeleton de la lista mientras refetchea
├── hooks/
│   ├── useMyTickets.ts                   # NUEVO
│   └── useCreateTicket.ts                # NUEVO
├── server/
│   └── getReporterEmail.ts               # NUEVO — helper server-side
└── types/
    └── index.ts                          # NUEVO — Category, exports
```

#### `constants/categories.ts`

```typescript
import {
  Building2, Calendar, ClipboardList, FileText, HandHelping,
  LayoutDashboard, MoreHorizontal, Truck, Users, Wrench,
  type LucideIcon,
} from 'lucide-react';

export type CategorySlug =
  | 'dashboard' | 'empresa' | 'empleados' | 'equipos' | 'comercial'
  | 'documentacion' | 'operaciones' | 'mantenimiento' | 'formularios' | 'otro';

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

export const CATEGORY_BY_SLUG: Record<CategorySlug, CategoryDef> =
  Object.fromEntries(CATEGORIES.map(c => [c.slug, c])) as Record<CategorySlug, CategoryDef>;

/** "[Empleados] Mi título" → { categoryLabel: "Empleados", cleanTitle: "Mi título" } */
export function parseCategoryFromTitle(title: string): { categoryLabel: string | null; cleanTitle: string } {
  const match = title.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) return { categoryLabel: null, cleanTitle: title };
  return { categoryLabel: match[1], cleanTitle: match[2] || title };
}

export function buildTitleWithCategory(category: CategorySlug, rawTitle: string): string {
  const label = CATEGORY_BY_SLUG[category]?.label ?? 'Otro';
  return `[${label}] ${rawTitle.trim()}`;
}
```

#### `constants/ticket-status.ts`

Mapeo `slug → label/color`. Como el backend tiene statuses configurables, el mapeo cubre los conocidos (`open`, `in_progress`, `done`, `blocked`, `closed`, `cancelled`) y para slugs desconocidos cae a `{ label: status.name, color: 'slate' }`.

```typescript
export interface StatusDef {
  label: string;
  badgeClass: string;       // clases Tailwind para el Badge
  borderClass: string;      // clase para border-l de la card
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

#### `server/getReporterEmail.ts`

```typescript
'use server';
import { supabaseServer } from '@/lib/supabase/server';

export async function getReporterEmail(): Promise<{ email: string; name: string | null } | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const fullName =
    (user.user_metadata?.firstname && user.user_metadata?.lastname)
      ? `${user.user_metadata.firstname} ${user.user_metadata.lastname}`
      : (user.user_metadata?.full_name ?? null);
  return { email: user.email, name: fullName };
}
```

#### `actions/support-tickets.ts`

```typescript
'use server';
import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { buildTitleWithCategory, type CategorySlug } from '../constants/categories';
import { getReporterEmail } from '../server/getReporterEmail';
import type { Ticket } from '@/shared/lib/taskapp/types';

const logger = new Logger('features/Ayuda/support-tickets');

interface CreateSupportTicketInput {
  category: CategorySlug;
  title: string;
  description: string;
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<Ticket> {
  const reporter = await getReporterEmail();
  if (!reporter) throw new Error('No hay usuario autenticado');

  logger.info('Creando ticket de soporte', { data: { category: input.category, email: reporter.email } });

  const ticket = await taskAppClient.createTicket({
    title: buildTitleWithCategory(input.category, input.title),
    description: input.description,
    reporter_email: reporter.email,
    reporter_name: reporter.name ?? undefined,
  });

  return ticket;
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

#### `hooks/useMyTickets.ts`

```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import { getMySupportTickets, type MyTicketsData } from '../actions/support-tickets';

export function useMyTickets(initialData?: MyTicketsData) {
  return useQuery({
    queryKey: ['ayuda', 'my-support-tickets'],
    queryFn: () => getMySupportTickets(),
    initialData,
    staleTime: 60_000,
  });
}
```

#### `hooks/useCreateTicket.ts`

```typescript
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupportTicket } from '../actions/support-tickets';

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ayuda', 'my-support-tickets'] });
    },
  });
}
```

### 4. Componentes

#### `HelpCenter.tsx` (Client Component)

Orquesta layout. Recibe `initialTickets` del Server Component padre.

```tsx
'use client';
import { Card } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { useMyTickets } from '../hooks/useMyTickets';
import type { MyTicketsData } from '../actions/support-tickets';
import { TicketForm } from './TicketForm';
import { MyTicketsList } from './MyTicketsList';

interface Props { initialTickets: MyTicketsData; }

export function HelpCenter({ initialTickets }: Props) {
  const { data: tickets = [] } = useMyTickets(initialTickets);

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary"><HelpCircle className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Centro de Ayuda</h1>
            <p className="text-sm text-muted-foreground">
              Reportá un problema o consultá el estado de tus solicitudes
            </p>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        <Card className="p-0"><TicketForm /></Card>
        <MyTicketsList tickets={tickets} />
      </div>
    </section>
  );
}
```

#### `TicketForm.tsx` (Client Component)

`react-hook-form` + `zod` + `Form` shadcn. Submit usa `useCreateTicket`.

Schema:

```typescript
const formSchema = z.object({
  category: z.enum([
    'dashboard','empresa','empleados','equipos','comercial',
    'documentacion','operaciones','mantenimiento','formularios','otro',
  ]),
  title: z.string().trim().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z.string().trim().min(10, 'Contanos un poco más (mínimo 10 caracteres)').max(5000),
});
type FormValues = z.infer<typeof formSchema>;
```

Estructura UI:
- `CardHeader` → "Reportar un problema" + descripción.
- `CardContent` → 3 `FormField`:
  1. **Categoría** → `Select` de shadcn poblado desde `CATEGORIES`, con `<Icon className="mr-2 h-4 w-4" />` por item.
  2. **Asunto** → `Input`, placeholder "Resumí en una línea qué te pasa".
  3. **Descripción** → `Textarea` de 6 filas, placeholder "Pasos para reproducir, qué esperabas vs qué pasó…".
- `CardFooter` → botón submit con `Loader2` cuando `isSubmitting`, label "Enviar reporte".

Submit handler:
```typescript
async function onSubmit(values: FormValues) {
  try {
    await mutation.mutateAsync(values);
    toast.success('Tu reporte fue enviado. Te avisaremos cuando haya novedades.');
    form.reset({ category: values.category, title: '', description: '' });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'No pudimos enviar tu reporte');
  }
}
```

(Reusa la categoría seleccionada en el reset para que reportes consecutivos del mismo módulo no obliguen a re-seleccionar.)

#### `MyTicketsList.tsx` (Client Component)

```tsx
'use client';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { TicketCard } from './TicketCard';
import { EmptyTicketsState } from './EmptyTicketsState';

export function MyTicketsList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) return <EmptyTicketsState />;
  return (
    <div className="flex flex-col gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
      {tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
    </div>
  );
}
```

#### `TicketCard.tsx`

```tsx
import { Card } from '@/components/ui/card';
import moment from 'moment';
import 'moment/locale/es';
import { parseCategoryFromTitle } from '../constants/categories';
import { statusFor } from '../constants/ticket-status';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketCategoryBadge } from './TicketCategoryBadge';
import type { Ticket } from '@/shared/lib/taskapp/types';

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const { categoryLabel, cleanTitle } = parseCategoryFromTitle(ticket.title);
  const status = statusFor(ticket.status?.slug, ticket.status?.name);

  return (
    <Card className={`border-l-4 ${status.borderClass} p-4 animate-in fade-in-50 slide-in-from-top-2 duration-300`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug">{cleanTitle}</h3>
        {categoryLabel && <TicketCategoryBadge label={categoryLabel} />}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
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

#### `EmptyTicketsState.tsx`

```tsx
import { Inbox } from 'lucide-react';

export function EmptyTicketsState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed text-center px-6 py-12">
      <Inbox className="h-10 w-10 text-muted-foreground/60 mb-3" />
      <h3 className="font-medium">Todavía no enviaste ningún reporte</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Cuando lo hagas, vas a verlo acá con su estado actual.
      </p>
    </div>
  );
}
```

### 5. Página

`src/app/dashboard/help/page.tsx` se simplifica:

```tsx
import { HelpCenter } from '@/features/Ayuda/components/HelpCenter';
import { getMySupportTickets } from '@/features/Ayuda/actions/support-tickets';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { cookies } from 'next/headers';

export async function generateMetadata() { /* igual que hoy */ }

export default async function HelpPage() {
  const initialTickets = await getMySupportTickets();
  return (
    <PermissionGuard module="ayuda" action="view" redirect>
      <HelpCenter initialTickets={initialTickets} />
    </PermissionGuard>
  );
}
```

No usamos `<Suspense>` aquí: el `await` de la página ya bloquea hasta tener los datos iniciales y la respuesta del backend público es rápida (un único `SELECT ... WHERE source='widget'`). Si en V2 esto se vuelve lento o queremos streaming real, se puede extraer la lista a un componente async hijo envuelto en Suspense + Skeleton.

### 6. Manejo de errores

| Origen | Reacción |
| --- | --- |
| `TASKAPP_BASE_URL` o `TASKAPP_PROJECT_API_KEY` no configurados | Server action loguea + lanza error genérico; UI muestra toast "El servicio de soporte no está configurado". |
| Backend taskApp 500 / 4xx en `createTicket` | `useMutation.onError` → toast.error con mensaje del backend (si lo trae) o fallback "No pudimos enviar tu reporte". |
| Backend taskApp 500 en `listTicketsByReporter` | Server action retorna `[]`; UI muestra estado vacío. No revienta la página. |
| Backend caído (network error) | Igual que arriba; la página sigue usable. |
| Validación Zod | `<FormMessage />` debajo de cada campo. |
| Usuario sin email (caso raro) | Server action retorna `[]` para lista y bloquea `createTicket` con error claro. |

### 7. Testing

- **Cypress E2E** (consistente con la stack del repo, no hay unit tests):
  - `cypress/e2e/ayuda/help-center.cy.ts`:
    1. Login → ir a `/dashboard/help` → ver el centro de ayuda.
    2. Llenar form (Asunto + Descripción + Categoría) → submit → toast OK → el ticket aparece en la lista (cypress puede mockear el endpoint del backend con `cy.intercept` para no depender de taskApp).
    3. Validar que no se puede submitear con campos vacíos (validación Zod visible).
  - Mock de `taskAppClient` no es directo (server action); en su lugar `cy.intercept` sobre la URL del backend Go.

- **Verificación manual**:
  1. `npm run check-types` → 0 errores.
  2. `npm run dev` + taskApp-backend levantado + env vars configuradas → flujo end-to-end real.
  3. Bajar el backend a mitad de la sesión → verificar mensaje de error controlado.

## Migración de datos

Ninguna. No tocamos la BD de Supabase. La feature solo lee del backend Go.

## Fuera de alcance / V2 sugerido

- **Detail view de ticket**: con su historial de comentarios + composer para nuevos comentarios (`POST /api/public/v1/tickets/{id}/comments`).
- **Adjuntos**: subir screenshots con `POST /api/public/v1/upload` + previsualización inline.
- **Categoría como label real**: PR a `taskApp-backend` para aceptar `category` en `CreatePublicTicketRequest`, crear/asociar label automáticamente. Elimina el prefijo `[Categoría]` en el título.
- **Realtime**: si en V2 hace falta push, hay que evaluar el SSE de taskApp (`GET /api/sse`) — requiere auth distinta a API key.
- **Filtros y búsqueda** en "Mis tickets" (por estado, categoría, texto).
- **Métricas / dashboard de soporte** para admins.
- **Empaquetar como módulo reusable**: una vez probado en gh_gestion, extraer `src/shared/lib/taskapp/` + `src/features/Ayuda/components/HelpCenter*` a un paquete `@codecontrol/taskapp-widget` para copy-paste o publish a privado. Hasta entonces, otros proyectos copian las carpetas a mano.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El backend devuelve un slug de status no mapeado en `STATUS_BY_SLUG` | `statusFor()` hace fallback al `name` del backend + color slate. La UI no se rompe. |
| El usuario logueado no tiene email en Supabase | `getReporterEmail` retorna null → server action tira error claro; la lista queda vacía. |
| Rate limit del backend (60 req/min/key) se golpea | Improbable en uso normal (un usuario, un form). Si se golpea, el toast lo muestra. |
| API key en `.env` se filtra por accidente (commit) | `.env.local` está en `.gitignore`; el cliente es `server-only`. Aún así, revisar al PR. |
| Cambia el shape del JSON del backend Go | Tipos `Ticket`/`CreateTicketRequest` definidos en gh_gestion; un diff de runtime no rompe el build, pero loguea el body en el error logger. |

## Definition of Done

- [ ] `npm run check-types` pasa sin errores.
- [ ] `/dashboard/help` renderiza el nuevo `HelpCenter` con form y lista.
- [ ] Crear un ticket end-to-end con el backend levantado y vars configuradas funciona, y el ticket aparece en la lista al instante.
- [ ] Sin la API key, la app no crashea: muestra estado vacío + toast informativo si se intenta enviar.
- [ ] ~~`ReportAnIssue.tsx` y `/api/send` siguen existiendo intactos (no se borra nada, según pedido del usuario).~~ **Anulado el 23/09/2026 por alphataco (Task 11a de la salida de Supabase), con autorización del usuario.** `/api/send` se borró y `ReportAnIssue.tsx` pasó a una server action. El handler aceptaba `to`, `subject` y `html` del cliente: era un relay de correo abierto. `ReportAnIssue.tsx` no tenía ningún importador desde que entró el sistema de tickets, así que el borrado no afecta a nadie. La tabla `sent_emails` que el handler escribía nunca estuvo modelada en Prisma y no se repone (decisión del usuario).
- [ ] Sin `console.*`, sin `:any`, sin `useEffect` para fetching, sin rutas API nuevas (todo server actions).
- [ ] Cypress E2E del flujo principal pasa.
