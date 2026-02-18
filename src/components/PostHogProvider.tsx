'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useRef } from 'react';

interface PostHogProviderProps {
  children: React.ReactNode;
}

/**
 * Construye las propiedades del usuario para posthog.identify().
 * Extrae nombre y CUIL de user_metadata (cubre tanto usuarios regulares
 * como usuarios anónimos del módulo de mantenimiento que tienen
 * { fullname, cuil, employee_id } en su metadata).
 */
function buildUserProperties(user: {
  email?: string | null;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}) {
  const meta = user.user_metadata ?? {};
  const appMeta = user.app_metadata ?? {};

  // Normalizar: filtrar strings vacíos (usuarios anónimos tienen email: "")
  const str = (val: unknown): string | undefined => (typeof val === 'string' && val.trim() ? val.trim() : undefined);

  return {
    email: str(user.email),
    // Nombre: regular (full_name de OAuth) o mantenimiento (fullname del empleado)
    name: str(meta.full_name ?? meta.fullname),
    // CUIL: solo usuarios anónimos de mantenimiento
    cuil: str(meta.cuil),
    // Rol del usuario en el sistema (seteado por adminSupabaseServer en register-user)
    role: str(appMeta.role),
    // Flag para distinguir empleados de mantenimiento de usuarios del dashboard
    is_maintenance_user: user.is_anonymous === true ? true : undefined,
    // login_type: 'empleado' | 'invitado' | undefined
    login_type: (meta.login_type ?? undefined) as string | undefined,
  };
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || initialized.current) {
      return;
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_exceptions: true,
      defaults: '2025-11-30',
      // No crear perfiles para visitantes anónimos que nunca se autentican.
      // Los usuarios de mantenimiento sí se identifican (aunque sean anónimos en Supabase).
      person_profiles: 'identified_only',
      debug: false,
    });

    initialized.current = true;

    const supabase = supabaseBrowser();

    // Identificar al usuario si ya tiene sesión activa al cargar la app
    // (cubre recargas de página con sesión existente, incluyendo sesiones anónimas
    // de mantenimiento que ya tienen metadata completa)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        posthog.identify(session.user.id, buildUserProperties(session.user));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        // USER_UPDATED cubre el caso de mantenimiento: el usuario anónimo se crea
        // con signInAnonymously() → SIGNED_IN (sin metadata), y luego
        // completeMaintenanceEmployeeAnonymousSession() actualiza su user_metadata
        // con { cuil, fullname, employee_id } → USER_UPDATED (con metadata completa)
        posthog.identify(session.user.id, buildUserProperties(session.user));
      } else if (event === 'SIGNED_OUT') {
        posthog.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
