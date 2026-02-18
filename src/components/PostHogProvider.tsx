'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useRef } from 'react';

interface PostHogProviderProps {
  children: React.ReactNode;
}

/** Filtra strings vacíos — los usuarios anónimos tienen email: "" */
const str = (val: unknown): string | undefined => (typeof val === 'string' && val.trim() ? val.trim() : undefined);

type UserProfile = {
  fullname?: string | null;
  roles?: string[];
} | null;

/**
 * Construye las propiedades del usuario para posthog.identify().
 *
 * Usuarios autenticados del dashboard:
 *   - email del objeto user
 *   - fullname de public.profile
 *   - roles de public.user_roles JOIN public.roles (tabla de permisos real)
 *
 * Usuarios anónimos de /maintenance:
 *   - is_anonymous: true
 *   - cuil, fullname, login_type de user_metadata (seteados vía admin.updateUserById)
 */
function buildUserProperties(
  user: {
    email?: string | null;
    is_anonymous?: boolean;
    user_metadata?: Record<string, unknown>;
  },
  profile: UserProfile
) {
  const meta = user.user_metadata ?? {};
  const isAnonymous = user.is_anonymous === true;

  return {
    email: str(user.email),

    // Nombre: de public.profile o de user_metadata (mantenimiento anónimo)
    name: str(profile?.fullname) ?? str(meta.full_name ?? meta.fullname),

    // Roles del sistema desde public.user_roles + public.roles
    // Ejemplo: "Supervisor de Operaciones, Full Access Provisional"
    roles: profile?.roles?.length ? profile.roles.join(', ') : undefined,

    // CUIL: solo empleados de mantenimiento (sesión anónima)
    cuil: isAnonymous ? str(meta.cuil) : undefined,

    // Flag para distinguir empleados de mantenimiento de usuarios del dashboard
    is_maintenance_user: isAnonymous ? true : undefined,

    // login_type: 'empleado' | 'invitado'
    login_type: isAnonymous ? str(meta.login_type) : undefined,
  };
}

/**
 * Obtiene fullname (de public.profile) y roles reales (de public.user_roles JOIN public.roles)
 * para usuarios autenticados del dashboard.
 * Los usuarios anónimos de mantenimiento no tienen perfil en estas tablas.
 */
async function fetchUserProfile(supabase: ReturnType<typeof supabaseBrowser>, userId: string): Promise<UserProfile> {
  const [profileResult, rolesResult] = await Promise.all([
    supabase.from('profile').select('fullname').eq('credential_id', userId).maybeSingle(),
    supabase.from('user_roles').select('roles(name)').eq('user_id', userId),
  ]);

  const roles = (rolesResult.data ?? [])
    .map((r: { roles: { name: string } | null }) => r.roles?.name)
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);

  return {
    fullname: profileResult.data?.fullname ?? null,
    roles,
  };
}

async function identifyUser(
  supabase: ReturnType<typeof supabaseBrowser>,
  user: { id: string; email?: string | null; is_anonymous?: boolean; user_metadata?: Record<string, unknown> }
) {
  if (user.is_anonymous) {
    posthog.identify(user.id, buildUserProperties(user, null));
    return;
  }
  const profile = await fetchUserProfile(supabase, user.id);
  posthog.identify(user.id, buildUserProperties(user, profile));
}

/**
 * Para usuarios anónimos de mantenimiento: después del SIGNED_IN,
 * admin.updateUserById() no dispara USER_UPDATED en el cliente.
 * Refrescamos la sesión con delay para obtener la user_metadata actualizada.
 */
async function refreshAndIdentifyAnonymousUser(supabase: ReturnType<typeof supabaseBrowser>, userId: string) {
  await new Promise((r) => setTimeout(r, 1500));
  const { data } = await supabase.auth.refreshSession();
  if (data.user?.id === userId && data.user.is_anonymous) {
    posthog.identify(userId, buildUserProperties(data.user, null));
  }
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const initialized = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const pathname = usePathname();

  // ── Init (solo una vez) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || initialized.current) return;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_exceptions: true,
      defaults: '2025-11-30',
      person_profiles: 'identified_only',
      debug: false,
    });

    initialized.current = true;
    supabaseRef.current = supabaseBrowser();

    const supabase = supabaseRef.current;

    // Identificar sesión activa al cargar la app (incluyendo recargas de página)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      lastUserIdRef.current = session.user.id;
      await identifyUser(supabase, session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
        lastUserIdRef.current = session.user.id;
        if (event === 'SIGNED_IN' && session.user.is_anonymous) {
          // Mantenimiento: identificar inmediatamente y luego refrescar para obtener metadata
          posthog.identify(session.user.id, buildUserProperties(session.user, null));
          refreshAndIdentifyAnonymousUser(supabase, session.user.id);
        } else {
          await identifyUser(supabase, session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        lastUserIdRef.current = null;
        posthog.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── Re-verificar sesión en cada cambio de ruta ───────────────────────────
  // Necesario porque router.push() (client-side navigation) no re-monta el layout.
  // Cuando el usuario hace login server-side y navega client-side, el onAuthStateChange
  // puede no disparar a tiempo. Este effect detecta el cambio leyendo la sesión.
  useEffect(() => {
    if (!initialized.current || !supabaseRef.current) return;

    const supabase = supabaseRef.current;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        // Sesión terminó — resetear si teníamos un usuario identificado
        if (lastUserIdRef.current) {
          lastUserIdRef.current = null;
          posthog.reset();
        }
        return;
      }

      // Si el usuario cambió (ej: login server-side después de mantenimiento), re-identificar
      if (session.user.id !== lastUserIdRef.current) {
        lastUserIdRef.current = session.user.id;
        await identifyUser(supabase, session.user);
      }
    });
  }, [pathname]);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
