'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutos - datos considerados frescos
      gcTime: 5 * 60 * 1000, // 5 minutos - mantener en cache
      refetchOnWindowFocus: false,
      retry: 1, // Solo 1 reintento en caso de error
    },
    mutations: {
      retry: 0, // No reintentar mutaciones fallidas
    },
  },
});
function TanstackQueryInicializador({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default TanstackQueryInicializador;
