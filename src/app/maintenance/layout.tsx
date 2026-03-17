import { MaintenanceLayoutProvider } from '@/features/Mantenimiento/shared/components/maintenance-layout-provider';
import TanstackQueryInicializador from '@/shared/providers/TanstackQueryInicializador';

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  // Employee data is resolved client-side by MaintenanceHeader via useEmployeeDataMaintenance() hook.
  // This avoids calling cookies()/supabase in the layout, which breaks Next.js 16 prerendering.
  return (
    <TanstackQueryInicializador>
      <MaintenanceLayoutProvider employeeName={null} employeeCuil={null}>
        {children}
      </MaintenanceLayoutProvider>
    </TanstackQueryInicializador>
  );
}
