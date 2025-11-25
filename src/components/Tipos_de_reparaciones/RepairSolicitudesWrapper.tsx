import { cookies } from 'next/headers';
import { Card } from '../ui/card';
import RepairSolicitudes from './RepairSolicitudesTable/RepairSolicitudes';
import { fetchRepairSolicitudes } from './actions/actions';

async function RepairSolicitudesWrapper({ mechanic, equipment_id }: { mechanic?: boolean; equipment_id?: string }) {
  const coockiesStore = cookies();
  const savedVisibility3 = coockiesStore.get('repair-solicitudes-table')?.value;
  const filters = coockiesStore.get('repair-solicitudes-table-filters')?.value;

  const initialData = await fetchRepairSolicitudes({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <Card className="p-6">
      <RepairSolicitudes
        mechanic={mechanic}
        initialData={initialData}
        default_equipment_id={equipment_id}
        savedFilters={filters ? JSON.parse(filters) : []}
        savedVisibility={savedVisibility3 ? JSON.parse(savedVisibility3) : []}
      />
    </Card>
  );
}

export default RepairSolicitudesWrapper;
