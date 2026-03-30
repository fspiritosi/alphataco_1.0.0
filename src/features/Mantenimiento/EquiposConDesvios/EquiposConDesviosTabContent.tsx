import { Card } from '@/components/ui/card';
import { fetchAllTypesOfRepairs } from '@/features/Mantenimiento/TiposReparaciones/actions/actions';
import { getEquipmentsWithPendingDeviations } from '@/features/Mantenimiento/actions/maintenance-actions';
import { EquipmentsWithDeviationsTableClient } from './components/EquipmentsWithDeviationsTableClient';

export async function EquiposConDesviosTabContent() {
  // Fetching en el servidor en paralelo
  const [initialEquipments, initialRepairTypes] = await Promise.all([
    getEquipmentsWithPendingDeviations(),
    fetchAllTypesOfRepairs(),
  ]);

  return (
    <Card className="p-6">
      <EquipmentsWithDeviationsTableClient
        initialEquipments={initialEquipments}
        initialRepairTypes={initialRepairTypes}
      />
    </Card>
  );
}
