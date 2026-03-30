# Dashboard Shell Performance Optimization Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maximize dashboard load speed by eliminating redundant network calls, dead code, and anti-patterns in the shared shell (layout, middleware, navbar, sidebar, providers).

**Architecture:** Create a `getCachedSession()` helper with `React.cache()` to deduplicate auth calls across server components; use Supabase Custom Access Token Hook to inject `has_company` into JWT claims, eliminating the middleware DB query; remove all dead code and unused features (notifications, PermissionsProvider, FilterCleanupInitializer).

**Tech Stack:** Next.js 16, Supabase (Custom Access Token Hook, JWT claims), React.cache(), TanStack Query, next/image.

---

## Chunk 1: Foundation — getCachedSession + Middleware Optimization

### Task 1: Create `getCachedSession` helper

**Files:**

- Create: `src/shared/lib/cached-session.ts`

- [ ] **Step 1: Create the cached session helper**

This helper reads the user session from the JWT cookie with **zero network calls**. It uses `React.cache()` to deduplicate within a single server request.

```typescript
// src/shared/lib/cached-session.ts
import { cache } from 'react';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Cached session reader — 0 network calls.
 *
 * getSession() reads the JWT from the cookie without contacting the Auth server.
 * React.cache() deduplicates within the same server request, so multiple server
 * components calling getCachedSession() only decode the JWT once.
 *
 * IMPORTANT: Only use this AFTER middleware has already validated the user
 * with getUser(). In the middleware itself, use getUser() for security.
 */
export const getCachedSession = cache(async () => {
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/lib/cached-session.ts
git commit -m "feat: add getCachedSession helper with React.cache for zero-cost auth dedup"
```

---

### Task 2: Create Supabase Custom Access Token Hook

**Files:**

- SQL migration via MCP (Supabase LOCAL)

This injects `has_company` into the JWT `app_metadata` at token issuance time, so the middleware can read it from the JWT without querying the DB.

- [ ] **Step 1: Apply the SQL migration**

Use the Supabase LOCAL MCP to apply this migration:

```sql
-- Custom Access Token Hook
-- Injects has_company into app_metadata in the JWT
-- This eliminates the need for getUserProfile() DB query in middleware

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_email text;
  company_count int;
BEGIN
  -- Get current claims
  claims := event->'claims';
  user_email := claims->>'email';

  -- Check if user has any company (own or shared)
  SELECT COUNT(*) INTO company_count
  FROM (
    SELECT 1 FROM company c
    JOIN profile p ON p.id = c.owner_id
    WHERE p.email = user_email
    UNION ALL
    SELECT 1 FROM share_company_users scu
    JOIN profile p ON p.id = scu.profile_id
    WHERE p.email = user_email
  ) sub;

  -- Inject has_company into app_metadata
  claims := jsonb_set(
    claims,
    '{app_metadata,has_company}',
    to_jsonb(company_count > 0)
  );

  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

- [ ] **Step 2: Enable the hook in Supabase Dashboard**

**MANUAL STEP**: Go to Supabase Dashboard → Authentication → Hooks → Enable "Custom Access Token" hook → Select function `custom_access_token_hook` → Save.

This must also be done in DEV and PROD when deploying.

- [ ] **Step 3: Commit plan docs (no code changes for this step)**

```bash
git add docs/superpowers/plans/2026-03-12-dashboard-performance-optimization.md
git commit -m "docs: add dashboard performance optimization plan"
```

---

### Task 3: Optimize middleware — eliminate getUserProfile DB query

**Files:**

- Modify: `src/proxy.ts`
- File to eventually delete: `src/shared/actions/middleware.actions.ts` (after verifying no other imports)

- [ ] **Step 1: Modify proxy.ts to read has_company from JWT claims**

Replace the `getUserProfile()` DB query with reading `has_company` from the JWT `app_metadata`:

```typescript
// src/proxy.ts
import { Logger } from '@/lib/logger';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/utils/middleware';

const logger = new Logger('Proxy');

export async function proxy(req: NextRequest) {
  // Actualizar sesión y obtener usuario
  const { response, user } = await updateSession(req);

  // 1. Verificar autenticación
  if (!user?.id) {
    logger.debug('Usuario no autenticado, redirigiendo a login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. Usuarios anónimos no pueden acceder a /dashboard
  if (user.is_anonymous) {
    logger.debug('Usuario anónimo intentando acceder a dashboard, redirigiendo a maintenance');
    return NextResponse.redirect(new URL('/maintenance', req.url));
  }

  // 3. Verificar si tiene compañía desde JWT claims (0 DB queries)
  // El Custom Access Token Hook inyecta has_company en app_metadata
  const hasCompany = user.app_metadata?.has_company === true;

  if (!hasCompany && !req.url.includes('/dashboard/company/new')) {
    logger.debug('Usuario sin compañía, redirigiendo a crear compañía');
    return NextResponse.redirect(new URL('/dashboard/company/new', req.url));
  }

  // 4. Usuario autenticado con compañía - permitir acceso
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

- [ ] **Step 2: Verify no other files import getUserProfile**

```bash
grep -r "getUserProfile" src/ --include="*.ts" --include="*.tsx" -l
```

If only `src/proxy.ts` imports it, the file `src/shared/actions/middleware.actions.ts` can be deleted. If other files import it, leave the file but remove the import from proxy.ts.

- [ ] **Step 3: Remove middleware.actions.ts if unused**

Only if Step 2 confirms no other imports:

```bash
rm src/shared/actions/middleware.actions.ts
```

- [ ] **Step 4: Run type check**

```bash
npm run check-types
```

Expected: PASS — no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts
# If deleted: git add src/shared/actions/middleware.actions.ts
git commit -m "perf(middleware): eliminate DB query by reading has_company from JWT claims"
```

---

## Chunk 2: Dead Code Removal

### Task 4: Remove dead code from dashboard layout

**Files:**

- Modify: `src/app/dashboard/layout.tsx`
- Delete: `src/components/PermissionsProvider.tsx`
- Delete: `src/components/FilterCleanupInitializer.tsx`
- Delete: `src/lib/one-time-filter-cleanup.ts`

- [ ] **Step 1: Clean up layout.tsx**

Remove: `FilterCleanupInitializer`, `PermissionsProvider`, unused `Inter` font import, duplicate `globals.css` import (already imported in root `src/app/layout.tsx`, so the dashboard layout import is redundant).

```typescript
// src/app/dashboard/layout.tsx — AFTER cleanup
import { PasswordChangeAlertWrapper } from '@/components/PasswordChangeAlertWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import NavbarFeat from '@/features/Layout/navbar/NavbarFeat';
import SidebarFeat from '@/features/Layout/sidebar/SidebarFeat';
import { Suspense } from 'react';
import TanstackQueryInicializador from './TanstackQueryInicializador';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-rows-[auto_1fr] grid-cols-[auto_1fr]" suppressHydrationWarning>
      <div className="row-span-2">
        <Suspense fallback={<Skeleton className="h-screen w-16" />}>
          <SidebarFeat />
        </Suspense>
      </div>
      <div className="border-r border-b border-muted/50 dark:bg-slate-950 mb-2">
        <Suspense fallback={<Skeleton className="h-14 w-full" />}>
          <NavbarFeat />
        </Suspense>
      </div>
      <div className="min-h-0 overflow-y-auto">
        <TanstackQueryInicializador>
          <Suspense fallback={null}>
            <PasswordChangeAlertWrapper />
          </Suspense>
          <div className="px-6 pb-4">{children}</div>
        </TanstackQueryInicializador>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete dead files**

```bash
git rm src/components/PermissionsProvider.tsx
git rm src/components/FilterCleanupInitializer.tsx
git rm src/lib/one-time-filter-cleanup.ts
```

- [ ] **Step 3: Verify no other files import the deleted components**

```bash
grep -r "FilterCleanupInitializer\|PermissionsProvider\|one-time-filter-cleanup" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: Only the deleted files themselves (already removed). If other files import them, update those too.

- [ ] **Step 4: Remove unused Inter font from root layout**

Modify `src/app/layout.tsx` — remove the unused `Inter` import and variable:

```typescript
// BEFORE (line 6-7 of src/app/layout.tsx):
import { Inter, Poppins } from 'next/font/google';
// ...
const inter = Inter({ subsets: ['latin'] });

// AFTER:
import { Poppins } from 'next/font/google';
// Delete the `const inter` line entirely
```

- [ ] **Step 5: Run type check**

```bash
npm run check-types
```

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/layout.tsx src/app/layout.tsx
git commit -m "perf: remove dead code (PermissionsProvider, FilterCleanupInitializer, unused Inter font)"
```

Note: The deleted files are already staged via `git rm` in Step 2.

---

### Task 5: Comment out notifications system

**Files:**

- Modify: `src/features/Layout/navbar/NavbarFeat.tsx`
- Modify: `src/features/Layout/navbar/components/Navbar.tsx`
- Modify: `src/features/Layout/navbar/types/navbar.types.ts`
- Leave untouched (may be used by other features): `src/features/Layout/navbar/actions/actions.navbar.ts`

The notifications system is confirmed unused. We comment it out (not delete) so it can be restored if needed.

- [ ] **Step 1: Remove notifications from NavbarFeat.tsx**

```typescript
// src/features/Layout/navbar/NavbarFeat.tsx — AFTER
import { fetchCurrentCompany, fetchUserCompanies } from '@/shared/actions/company.actions';
import { getCurrentUserProfile } from './actions/actions.navbar';
import { Navbar } from './components/Navbar';
import { getCachedSession } from '@/shared/lib/cached-session';

async function NavbarFeat() {
  // Get userId from cached session (0 network calls — reads JWT cookie)
  const session = await getCachedSession();
  const userId = session?.user?.id || '';

  // Run ALL queries in parallel — no waterfall
  const [user, currentCompany, { sharedCompanies, allCompanies }] = await Promise.all([
    getCurrentUserProfile(),
    fetchCurrentCompany(),
    fetchUserCompanies(userId),
  ]);

  return (
    <Navbar
      user={user}
      companies={{
        sharedCompanies,
        allCompanies,
        currentCompany,
      }}
    />
  );
}

export default NavbarFeat;
```

- [ ] **Step 2: Remove notifications from Navbar.tsx**

```typescript
// src/features/Layout/navbar/components/Navbar.tsx — AFTER
import { ModeToggle } from '@/components/ui/ToogleDarkButton';
import { Button } from '@/components/ui/button';
import { NavbarClientProps } from '../types/navbar.types';
import { _CompanySelector } from './modals/_CompanySelector';
// import { _NotificationsModal } from './modals/_NotificationsModal'; // COMMENTED OUT — notifications unused
import { _SidebarToggle } from './ui/_SidebarToggle';
import { _UserMenu } from './ui/_UserMenu';

export function Navbar({ user, companies }: NavbarClientProps) {
  return (
    <nav className="flex flex-shrink items-center justify-end sm:justify-between dark:bg-slate-950 bg-gh text-foreground pr-4 py-4 px-7 pl-0">
      <div className="items-center flex gap-6">
        <_SidebarToggle />
        <_CompanySelector
          sharedCompanies={companies.sharedCompanies}
          allCompanies={companies.allCompanies}
          currentCompany={companies.currentCompany ?? []}
        />
      </div>

      <div className="flex gap-8 items-center">
        {user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Developer' ? (
          <Button variant="default" asChild>
            <a href="/admin/panel">Panel</a>
          </Button>
        ) : null}

        {/* <_NotificationsModal notifications={notifications} /> */}
        <ModeToggle />
        <_UserMenu user={user} />
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Update NavbarClientProps type**

Remove `notifications` from the type in `src/features/Layout/navbar/types/navbar.types.ts`:

```typescript
// BEFORE:
export type NavbarClientProps = {
  user: UserProfile | null;
  notifications: FormattedNotifications[];
  companies: {
    sharedCompanies: Company[];
    allCompanies: Company[];
    currentCompany: Company[] | null;
  };
};

// AFTER:
export type NavbarClientProps = {
  user: UserProfile | null;
  // notifications: FormattedNotifications[]; // COMMENTED OUT — notifications unused
  companies: {
    sharedCompanies: Company[];
    allCompanies: Company[];
    currentCompany: Company[] | null;
  };
};
```

- [ ] **Step 4: Run type check**

```bash
npm run check-types
```

- [ ] **Step 5: Commit**

```bash
git add src/features/Layout/navbar/NavbarFeat.tsx src/features/Layout/navbar/components/Navbar.tsx src/features/Layout/navbar/types/navbar.types.ts
git commit -m "perf(navbar): remove notifications (unused) and parallelize all queries"
```

---

## Chunk 3: Component-Level Optimizations

### Task 6: Optimize SidebarFeat — remove dead props

**Files:**

- Modify: `src/features/Layout/sidebar/SidebarFeat.tsx`
- Modify: `src/features/Layout/sidebar/components/Sidebar.tsx`
- Modify: `src/features/Layout/sidebar/types/types.ts`
- Delete: `src/shared/actions/actions.navbar.ts` (only contains `getCurrentPath`)

`getCurrentPath()` uses the unreliable `referer` header and the Sidebar already uses `usePathname()` client-side. The `isActive` cookie is read but the Sidebar uses `useSidebarStore` instead.

- [ ] **Step 1: Simplify SidebarFeat.tsx**

```typescript
// src/features/Layout/sidebar/SidebarFeat.tsx — AFTER
import { getUserAccessibleModulesServer } from '@/features/Permissions';
import { Sidebar } from './components/Sidebar';

async function SidebarFeat() {
  const accessibleModules = await getUserAccessibleModulesServer();
  return <Sidebar accessibleModules={accessibleModules} />;
}

export default SidebarFeat;
```

- [ ] **Step 2: Update Sidebar.tsx to remove unused props**

```typescript
// src/features/Layout/sidebar/components/Sidebar.tsx
// Change the component signature — remove initialPathname, it's not needed
// usePathname() ALWAYS returns a value in client components

// BEFORE (line 22):
export function Sidebar({ initialPathname, accessibleModules }: SidebarProps) {

// AFTER:
export function Sidebar({ accessibleModules }: SidebarProps) {
```

Also simplify the pathname logic:

```typescript
// BEFORE (lines 26-29):
const clientPathname = usePathname();
const currentPathname = clientPathname || initialPathname;

// AFTER:
const currentPathname = usePathname();
```

- [ ] **Step 3: Update SidebarProps type**

```typescript
// src/features/Layout/sidebar/types/types.ts — AFTER
export interface AccessibleModule {
  module_id: string;
  module_slug: string;
  module_name: string;
  module_icon: string;
}

export interface SidebarProps {
  accessibleModules: AccessibleModule[];
}
```

- [ ] **Step 4: Delete actions.navbar.ts**

Verify it only contains `getCurrentPath`:

```bash
grep -r "getCurrentPath\|actions\.navbar" src/ --include="*.ts" --include="*.tsx" -l
```

If only `SidebarFeat.tsx` imports from it (and we already removed that import), delete it:

```bash
rm src/shared/actions/actions.navbar.ts
```

- [ ] **Step 5: Run type check**

```bash
npm run check-types
```

- [ ] **Step 6: Commit**

```bash
git add src/features/Layout/sidebar/SidebarFeat.tsx src/features/Layout/sidebar/components/Sidebar.tsx src/features/Layout/sidebar/types/types.ts
git add src/shared/actions/actions.navbar.ts
git commit -m "perf(sidebar): remove dead getCurrentPath + unused isActive cookie read"
```

---

### Task 7: Optimize PasswordChangeAlertWrapper — use getCachedSession

**Files:**

- Modify: `src/components/PasswordChangeAlertWrapper.tsx`

Replace the independent `supabase.auth.getUser()` call (1 network call) with `getCachedSession()` (0 network calls).

- [ ] **Step 1: Replace getUser with getCachedSession**

```typescript
// src/components/PasswordChangeAlertWrapper.tsx — AFTER
import { getCachedSession } from '@/shared/lib/cached-session';
import { PasswordChangeAlert } from './PasswordChangeAlert';

export async function PasswordChangeAlertWrapper() {
  const session = await getCachedSession();
  const user = session?.user;

  if (!user) {
    return null;
  }

  return <PasswordChangeAlert userMetadata={user.user_metadata} />;
}
```

- [ ] **Step 2: Run type check**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PasswordChangeAlertWrapper.tsx
git commit -m "perf: replace getUser() with getCachedSession() in PasswordChangeAlertWrapper"
```

---

### Task 8: Fix TanStack Query singleton anti-pattern

**Files:**

- Modify: `src/app/dashboard/TanstackQueryInicializador.tsx`

The current code creates a `QueryClient` at module level, which shares cache across SSR requests (potential data leak between users). Also `staleTime: 0` causes every query to refetch on mount.

- [ ] **Step 1: Fix the singleton and staleTime**

```typescript
// src/app/dashboard/TanstackQueryInicializador.tsx — AFTER
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 minuto — datos frescos no se refetchean
        gcTime: 5 * 60 * 1000, // 5 minutos
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

function TanstackQueryInicializador({ children }: { children: React.ReactNode }) {
  // useState con factory function — cada componente monta su propio QueryClient
  // En SSR esto previene data leaks entre requests de diferentes usuarios
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default TanstackQueryInicializador;
```

- [ ] **Step 2: Run type check**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/TanstackQueryInicializador.tsx
git commit -m "fix: QueryClient singleton SSR data leak + increase staleTime to 60s"
```

---

### Task 9: Remove \_CompanySelector useEffect that fires server action on every mount

**Files:**

- Modify: `src/features/Layout/navbar/components/modals/_CompanySelector.tsx`

The `useEffect` calls `setNewCompanyUserMetadata()` (server action) on EVERY mount, even when the cookie is already valid. The middleware already handles cookie initialization in `updateSession()`.

**Accepted risk**: The `else` branch called `setNewCompanyUserMetadata(actualCompany)` to sync `app_metadata.company` on every mount. Removing this means if `app_metadata` diverges from the cookie (e.g., direct DB edit), it won't self-heal on mount. This is acceptable because: (1) company changes go through `handleNewCompany` which calls `setNewCompanyUserMetadata`, (2) the middleware sets the cookie, and (3) the on-mount server action is expensive (~50ms+ per page load).

- [ ] **Step 1: Remove the useEffect**

In `src/features/Layout/navbar/components/modals/_CompanySelector.tsx`, delete lines 34-45 (the entire `useEffect` block):

```typescript
// DELETE THIS ENTIRE BLOCK (lines 34-45):
// Inicializar la cookie con la empresa por defecto si no existe
useEffect(() => {
  const actualCompany = Cookies.get('actualComp');

  // Si no hay cookie o es inválida, usar la empresa por defecto
  if (!actualCompany || actualCompany === 'undefined' || actualCompany.trim() === '') {
    Cookies.set('actualComp', DEFAULT_COMPANY_ID);
    Cookies.set('actualCompName', DEFAULT_COMPANY_NAME);
    setNewCompanyUserMetadata(DEFAULT_COMPANY_ID);
  } else {
    setNewCompanyUserMetadata(actualCompany);
  }
}, [allCompanies, sharedCompanies, currentCompany]);
```

Also remove the unused imports that were only used by the useEffect:

```typescript
// BEFORE:
import { DEFAULT_COMPANY_ID, DEFAULT_COMPANY_NAME } from '@/lib/company-config';
import { useEffect, useState } from 'react';

// AFTER (if DEFAULT_COMPANY_ID/NAME are not used elsewhere in the file — check handleNewCompany):
import { useState } from 'react';
```

**Note**: Keep `DEFAULT_COMPANY_ID` and `DEFAULT_COMPANY_NAME` imports if they're used in other parts of the component (they're not — the middleware handles defaults).

- [ ] **Step 2: Also check if setNewCompanyUserMetadata import can be cleaned**

`setNewCompanyUserMetadata` is still used in `handleNewCompany` (line 53), so keep that import.

- [ ] **Step 3: Run type check**

```bash
npm run check-types
```

- [ ] **Step 4: Commit**

```bash
git add src/features/Layout/navbar/components/modals/_CompanySelector.tsx
git commit -m "perf: remove useEffect that fired server action on every navbar mount"
```

---

## Chunk 4: Config + Minor Optimizations

### Task 10: Clean up next.config.js

**Files:**

- Modify: `next.config.js`

Remove invalid/duplicate config:

- [ ] **Step 1: Fix next.config.js**

```javascript
// next.config.js — AFTER
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 60,
    },
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zktcbhhlcksopklpnubj.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'vvrckjjyrwqzpbaatemz.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'th.bing.com',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
```

Changes:

1. Removed `cacheComponents: true` (not a valid Next.js option)
2. Removed duplicate `vvrckjjyrwqzpbaatemz.supabase.co` entry
3. Made `fullUrl` logging dev-only

- [ ] **Step 2: Commit**

```bash
git add next.config.js
git commit -m "fix: remove invalid cacheComponents, dedupe remotePatterns, dev-only fullUrl logging"
```

---

### Task 11: Replace `<img>` with `next/image` in Sidebar logo

**Files:**

- Modify: `src/features/Layout/sidebar/components/Sidebar.tsx`

- [ ] **Step 1: Replace img tag**

```typescript
// BEFORE (line 45):
<img src="/gh_logo.png" alt="codeControl logo" className="relative block" />

// AFTER:
import Image from 'next/image';
// ...
<Image src="/gh_logo.png" alt="codeControl logo" width={160} height={40} priority />
```

Add `priority` because the logo is above-the-fold and renders immediately.

- [ ] **Step 2: Run type check**

```bash
npm run check-types
```

- [ ] **Step 3: Commit**

```bash
git add src/features/Layout/sidebar/components/Sidebar.tsx
git commit -m "perf(sidebar): use next/image for logo (auto-optimization + priority)"
```

---

### Task 12: Replace console.\* with logger + optimize getCurrentUserProfile in navbar actions

**Files:**

- Modify: `src/features/Layout/navbar/actions/actions.navbar.ts` (logger + getCachedSession)
- Modify: `src/features/Permissions/actionsServer.ts` (logger only, lines 325, 335)

This task combines logger replacement AND getCachedSession optimization for `actions.navbar.ts` in a single pass to avoid modifying the same file twice.

- [ ] **Step 1: Fix navbar actions — logger + getCachedSession**

In `src/features/Layout/navbar/actions/actions.navbar.ts`:

1. Add imports at top:

```typescript
import { Logger } from '@/lib/logger';
import { getCachedSession } from '@/shared/lib/cached-session';

const logger = new Logger('features/Layout/navbar');
```

2. Replace all `console.error` with logger:

```typescript
// Line 22: console.error('Error al actualizar avatar:', error);
// → logger.error('Error al actualizar avatar', { data: { error } });

// Line 42: console.error('Error al eliminar la notificación:', error);
// → logger.error('Error al eliminar la notificación', { data: { error } });

// Line 63: console.error('Error al eliminar notificaciones:', error);
// → logger.error('Error al eliminar notificaciones', { data: { error } });

// Line 86: console.error('Error al obtener perfil:', error);
// → logger.error('Error al obtener perfil', { data: { error } });

// Line 167: console.error('Error al obtener notificaciones:', error);
// → logger.error('Error al obtener notificaciones', { data: { error } });
```

3. Optimize `getCurrentUserProfile` to use `getCachedSession`:

```typescript
// BEFORE:
export async function getCurrentUserProfile() {
  const cookieStore = await cookies();
  const supabase = await supabaseServer();
  const userId = cookieStore.get('userId')?.value;
  const { data: user, error } = await supabase.auth.getUser();
  if (!user?.user?.id) {
    return null;
  }
  try {
    const { data, error } = await supabase.from('profile').select('*').eq('id', user.user.id).single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error al obtener perfil', { data: { error } });
    return null;
  }
}

// AFTER:
export async function getCurrentUserProfile() {
  const supabase = await supabaseServer();
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return null;
  }
  try {
    const { data, error } = await supabase.from('profile').select('*').eq('id', session.user.id).single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error al obtener perfil', { data: { error } });
    return null;
  }
}
```

Remove unused `cookies` import ONLY if no other function in the file uses it. `deleteNotification` and `deleteAllNotifications` use `cookies()`, so keep it.

- [ ] **Step 2: Fix permissions actionsServer.ts — logger only**

In `src/features/Permissions/actionsServer.ts`, replace `console.error` and `console.warn` in `getUserAccessibleModulesServer`:

```typescript
// Line 325: console.error('Error getting user from auth:', authError);
// → logger.error('Error getting user from auth', { data: { authError } });

// Line 335: console.error('Error fetching accessible modules:', error);
// → logger.error('Error fetching accessible modules', { data: { error } });
```

Check if `logger` is already imported at the top of this file. If not, add:

```typescript
import { Logger } from '@/lib/logger';
const logger = new Logger('features/Permissions');
```

Also check for any `console.warn` in the file and replace with `logger.warn`.

- [ ] **Step 3: Run type check**

```bash
npm run check-types
```

- [ ] **Step 4: Commit**

```bash
git add src/features/Layout/navbar/actions/actions.navbar.ts src/features/Permissions/actionsServer.ts
git commit -m "perf: logger + getCachedSession in navbar actions, logger in permissions"
```

---

### Task 13: Optimize getUserAccessibleModulesServer — use getCachedSession

**Files:**

- Modify: `src/features/Permissions/actionsServer.ts`

- [ ] **Step 1: Replace getUser with getCachedSession**

```typescript
// BEFORE (lines 315-340):
export async function getUserAccessibleModulesServer() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error getting user from auth:', authError);
    return [];
  }

  const { data, error } = await supabase.rpc('get_user_accessible_modules', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error fetching accessible modules:', error);
    return [];
  }

  return data || [];
}

// AFTER:
export async function getUserAccessibleModulesServer() {
  const supabase = await supabaseServer();
  const session = await getCachedSession();

  if (!session?.user) {
    logger.error('No authenticated user for accessible modules');
    return [];
  }

  const { data, error } = await supabase.rpc('get_user_accessible_modules', {
    p_user_id: session.user.id,
  });

  if (error) {
    logger.error('Error fetching accessible modules', { data: { error } });
    return [];
  }

  return data || [];
}
```

Add import at top if not already there:

```typescript
import { getCachedSession } from '@/shared/lib/cached-session';
```

- [ ] **Step 2: Also update getCachedUserPermissions to use getCachedSession**

This function (around line 43) also calls `supabase.auth.getUser()`. Replace it:

```typescript
// BEFORE (inside getCachedUserPermissions):
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  console.error('...');
  return [];
}

// AFTER — simplified, no fake authError needed:
const session = await getCachedSession();
const user = session?.user;

if (!user) {
  logger.error('No authenticated session for permissions');
  return [];
}
```

- [ ] **Step 3: Run type check**

```bash
npm run check-types
```

- [ ] **Step 4: Commit**

```bash
git add src/features/Permissions/actionsServer.ts
git commit -m "perf: use getCachedSession in permissions (eliminate 2 getUser network calls)"
```

---

## Chunk 5: Verification

### Task 14: Full verification

- [ ] **Step 1: Run type check**

```bash
npm run check-types
```

Expected: PASS.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No new warnings/errors.

- [ ] **Step 3: Verify JWT hook is injecting has_company**

After enabling the Custom Access Token Hook in Supabase Dashboard, log in as a test user and inspect the JWT claims:

```sql
-- Run via Supabase SQL Editor or MCP to verify the hook works
SELECT
  raw_app_meta_data->'has_company' as has_company
FROM auth.users
WHERE email = 'yordanpz@hotmail.com';
```

Also verify in the browser: DevTools → Application → Cookies → find the Supabase auth cookie → decode the JWT at jwt.io → check `app_metadata.has_company` is present.

**If `has_company` is NOT in the JWT**: The Custom Access Token Hook is not enabled or has an error. Check Supabase Dashboard → Authentication → Hooks. The middleware optimization (Task 3) depends on this.

- [ ] **Step 4: Manual browser test**

Start the dev server and navigate to `/dashboard`:

```bash
npm run dev
```

Verify:

1. Dashboard loads correctly
2. Sidebar renders with correct modules
3. Navbar shows company selector (no notifications bell)
4. Company switching works
5. Page navigation works (sidebar active link updates)
6. No console errors

- [ ] **Step 5: Check network calls in DevTools**

Open Chrome DevTools → Network tab → reload `/dashboard`. Verify:

- No `getUserProfile` DB query from middleware
- No `getUserNotifications` calls
- No redundant `auth/user` calls (should be at most 1 from middleware `updateSession`)

---

## Summary of Performance Gains

| Optimization                   | Before                                                     | After                                                            | Savings                    |
| ------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------- |
| Middleware DB query            | 1 DB query every request                                   | 0 (JWT claim)                                                    | ~50-100ms per request      |
| Notifications fetch            | 3 DB queries (notifications + 2 doc joins)                 | 0 (removed)                                                      | ~100-200ms                 |
| NavbarFeat waterfall           | Sequential: Promise.all → then fetchUserCompanies(user.id) | Parallel: getCachedSession(0ms) → Promise.all with all 3 queries | ~100-150ms                 |
| SidebarFeat getCurrentPath     | 1 unreliable header read + server action                   | Removed                                                          | ~10ms + code cleanup       |
| PasswordChangeAlertWrapper     | 1 getUser() network call                                   | 0 (getCachedSession)                                             | ~50-100ms                  |
| getCurrentUserProfile          | 1 getUser() + 1 DB query                                   | getCachedSession + 1 DB query                                    | ~50-100ms                  |
| getUserAccessibleModulesServer | 1 getUser() + 1 RPC                                        | getCachedSession + 1 RPC                                         | ~50-100ms                  |
| getCachedUserPermissions       | 1 getUser() + DB query                                     | getCachedSession + DB query                                      | ~50-100ms                  |
| \_CompanySelector useEffect    | 1 server action on every mount                             | Removed                                                          | ~50ms + 1 network call     |
| QueryClient staleTime          | 0 (refetch every mount)                                    | 60s (cache 1 min)                                                | Fewer refetches across app |
| QueryClient singleton          | Shared across SSR requests                                 | Per-component instance                                           | Security fix (data leak)   |
| Dead code removal              | 3 components loaded                                        | 0                                                                | Smaller bundle             |
| next.config cleanup            | Invalid options                                            | Clean config                                                     | Correct behavior           |
| Sidebar logo                   | `<img>` tag                                                | `next/image` with priority                                       | Auto-optimization          |

**Total estimated savings on dashboard initial load: ~400-800ms** (varies by network/DB latency).
