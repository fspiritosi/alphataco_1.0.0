'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useRef } from 'react';

interface PostHogProviderProps {
  children: React.ReactNode;
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
      debug: false,
    });

    initialized.current = true;

    const supabase = supabaseBrowser();

    // CRÍTICO: Identificar al usuario si ya tiene sesión activa al cargar la app.
    // Sin esto, el identify solo se llama en SIGNED_IN (al hacer login), pero si
    // el usuario recarga la página con sesión existente, todos los eventos quedan
    // como anónimos hasta que haga logout+login de nuevo.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email ?? undefined,
        });
      }
    });

    // Listener de cambios de estado de autenticación para login/logout posteriores
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email ?? undefined,
        });
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
