import { MaintenanceLayoutProvider } from '@/features/Mantenimiento/shared/components/maintenance-layout-provider';
import TanstackQueryInicializador from '@/shared/providers/TanstackQueryInicializador';

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  // El layout no resuelve el legajo: llamar a cookies() acá rompe el prerender de Next 16.
  // Lo resuelve cada página con `getMaintenanceEmployeeForEquipment(equipmentId)` y se lo
  // pasa a `MaintenanceHeader` por props. El hook de cliente del header queda como último
  // recurso para las pantallas del dashboard, que sí tienen empresa activa; en el QR no
  // sirve, porque deriva la empresa de la sesión y acá sale del equipo de la ruta.
  return (
    <TanstackQueryInicializador>
      <MaintenanceLayoutProvider employeeName={null} employeeCuil={null}>
        {children}
      </MaintenanceLayoutProvider>
    </TanstackQueryInicializador>
  );
}
