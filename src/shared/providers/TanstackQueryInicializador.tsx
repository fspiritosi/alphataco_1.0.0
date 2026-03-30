'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 minuto — datos frescos no se refetchean
        gcTime: 5 * 60 * 1000, // 5 minutos — mantener cache al cambiar de tab/página
        refetchOnWindowFocus: false,
        retry: 1, // Solo 1 reintento en caso de error
      },
      mutations: {
        retry: 0, // No reintentar mutaciones fallidas
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
