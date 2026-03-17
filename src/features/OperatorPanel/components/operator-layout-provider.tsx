'use client';

import type { OperatorContext } from '@/features/OperatorPanel/actions/actionsServer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const OperatorLayoutContext = createContext<OperatorContext | undefined>(undefined);

export function OperatorLayoutProvider({ children, context }: { children: React.ReactNode; context: OperatorContext }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OperatorLayoutContext.Provider value={context}>{children}</OperatorLayoutContext.Provider>
    </QueryClientProvider>
  );
}

export function useOperatorContext() {
  const context = useContext(OperatorLayoutContext);
  if (!context) {
    throw new Error('useOperatorContext must be used within OperatorLayoutProvider');
  }
  return context;
}
