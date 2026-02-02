import { getEquipmentsWithPendingDeviations } from '@/app/maintenance/actions';
import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
import { Card } from '@/components/ui/card';
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
