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
    // Solo inicializar si hay key y no se ha inicializado
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

    // Configurar listener de Supabase con cleanup
    const supabase = supabaseBrowser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Usar user.id como distinctId (según documentación)
        posthog.identify(session.user.id, {
          email: session.user.email,
          // Agregar más propiedades del usuario si es necesario
        });
      } else if (event === 'SIGNED_OUT') {
        // Resetear cuando el usuario cierra sesión
        posthog.reset();
      }
    });

    // Cleanup importante para evitar memory leaks
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Solo renderizar provider si PostHog está configurado
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
