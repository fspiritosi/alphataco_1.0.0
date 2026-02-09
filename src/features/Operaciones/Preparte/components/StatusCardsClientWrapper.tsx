'use client';

import { createContext, useContext, useState } from 'react';
import type { Status } from './StatusCardServer';

interface StatusFilterContextValue {
  statusFilter: Status | null;
  setStatusFilter: (status: Status | null) => void;
}

const StatusFilterContext = createContext<StatusFilterContextValue | null>(null);

export function useStatusFilter() {
  const context = useContext(StatusFilterContext);
  if (!context) {
    throw new Error('useStatusFilter must be used within StatusFilterProvider');
  }
  return context;
}

interface StatusFilterProviderProps {
  children: React.ReactNode;
}

/**
 * Provider que maneja el estado del filtro de status
 * Permite comunicación entre StatusCards (server) y PreparteTable (client)
 */
export function StatusFilterProvider({ children }: StatusFilterProviderProps) {
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);

  return (
    <StatusFilterContext.Provider value={{ statusFilter, setStatusFilter }}>{children}</StatusFilterContext.Provider>
  );
}
