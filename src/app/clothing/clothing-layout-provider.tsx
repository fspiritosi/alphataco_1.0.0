'use client';

import type { ClothingOperatorContext } from '@/features/Clothing/actions/actionsServer';
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

const ClothingLayoutContext = createContext<ClothingOperatorContext | undefined>(undefined);

export function ClothingLayoutProvider({
  children,
  context,
}: {
  children: React.ReactNode;
  context: ClothingOperatorContext;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ClothingLayoutContext.Provider value={context}>{children}</ClothingLayoutContext.Provider>
    </QueryClientProvider>
  );
}

export function useClothingContext() {
  const context = useContext(ClothingLayoutContext);
  if (!context) {
    throw new Error('useClothingContext must be used within ClothingLayoutProvider');
  }
  return context;
}
