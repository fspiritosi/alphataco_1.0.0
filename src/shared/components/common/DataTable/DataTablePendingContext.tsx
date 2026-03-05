'use client';

import { createContext, useContext } from 'react';

interface DataTablePendingContextValue {
  isPending: boolean;
  startTransition: (callback: () => void) => void;
  /** Whether the DataTable uses client-side navigation (replaceState) instead of router.push */
  isClientSide: boolean;
  /** Notify useDataTable that URL params changed externally (for client-side mode) */
  notifyUrlChange: () => void;
  /** Counter that increments on every URL change (for client-side reactivity) */
  urlVersion: number;
}

const DataTablePendingContext = createContext<DataTablePendingContextValue>({
  isPending: false,
  startTransition: (cb) => cb(),
  isClientSide: false,
  notifyUrlChange: () => {},
  urlVersion: 0,
});

export const DataTablePendingProvider = DataTablePendingContext.Provider;

export function useDataTablePending() {
  return useContext(DataTablePendingContext);
}
