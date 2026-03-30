'use client';

import { createContext, useContext } from 'react';

interface MaintenanceLayoutContextType {
  employeeName: string | null;
  employeeCuil: string | null;
}

const MaintenanceLayoutContext = createContext<MaintenanceLayoutContextType | undefined>(undefined);

export function MaintenanceLayoutProvider({
  children,
  employeeName,
  employeeCuil,
}: {
  children: React.ReactNode;
  employeeName: string | null;
  employeeCuil: string | null;
}) {
  return (
    <MaintenanceLayoutContext.Provider value={{ employeeName, employeeCuil }}>
      {children}
    </MaintenanceLayoutContext.Provider>
  );
}

export function useMaintenanceLayout() {
  const context = useContext(MaintenanceLayoutContext);
  if (context === undefined) {
    // Si no hay contexto, retornar valores por defecto
    return { employeeName: null, employeeCuil: null };
  }
  return context;
}
