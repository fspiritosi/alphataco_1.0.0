'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 60 * 1000,
      // refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});
function TanstackQueryInicializador({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default TanstackQueryInicializador;
