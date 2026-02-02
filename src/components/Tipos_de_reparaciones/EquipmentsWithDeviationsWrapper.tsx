import { EquipmentsWithDeviationsTable } from '../maintenance/equipments-with-deviations-table';
import { Card } from '../ui/card';

async function EquipmentsWithDeviationsWrapper() {
  return (
    <Card className="p-6">
      <EquipmentsWithDeviationsTable />
    </Card>
  );
}

export default EquipmentsWithDeviationsWrapper;
