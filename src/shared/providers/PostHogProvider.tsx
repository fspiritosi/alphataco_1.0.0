'use client';

// Activa el errorMap de zod en español (side-effect: z.setErrorMap).
// Se importa acá porque este es un Client Component de raíz — así el side-effect
// se ejecuta en el bundle del cliente, donde viven los forms con zodResolver.
import { authClient } from '@/shared/lib/auth-client';
import '@/lib/zod-es';
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

    // Identifica al usuario en PostHog. Antes esto escuchaba `onAuthStateChange` de Supabase;
    // con Better Auth alcanza con leer la sesión al montar: el login y el logout son Server
    // Actions que terminan en una navegación, así que el provider se vuelve a montar y esto
    // corre de nuevo con la sesión ya cambiada.
    let cancelled = false;
    void authClient.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data?.user) {
        posthog.identify(data.user.id, { email: data.user.email });
      } else {
        posthog.reset();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Solo renderizar provider si PostHog está configurado
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
