'use client';

import { createContext, useContext } from 'react';

interface DataTablePendingContextValue {
  isPending: boolean;
  startTransition: (callback: () => void) => void;
}

const DataTablePendingContext = createContext<DataTablePendingContextValue>({
  isPending: false,
  startTransition: (cb) => cb(),
});

export const DataTablePendingProvider = DataTablePendingContext.Provider;

export function useDataTablePending() {
  return useContext(DataTablePendingContext);
}
