import { Filter } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import { Card } from '../ui/card';
import RepairSolicitudes from './RepairSolicitudesTable/RepairSolicitudes';
import { fetchRepairSolicitudes } from './actions/actions';

async function RepairSolicitudesWrapper({ mechanic, equipment_id }: { mechanic?: boolean; equipment_id?: string }) {
  const coockiesStore = await cookies();
  const savedVisibility3 = coockiesStore.get('repair-solicitudes-table')?.value;
  const filters = coockiesStore.get('repair-solicitudes-table-filters')?.value;

  // Si hay equipment_id, filtrar solo por ese equipo
  const equipmentFilter: Filter<'repair_solicitudes'>[] = equipment_id
    ? [{ column: 'equipment_id', operator: 'eq', value: equipment_id }]
    : [];

  const initialData = await fetchRepairSolicitudes({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
    filters: equipmentFilter,
  });

  return (
    <Card className="p-6">
      <RepairSolicitudes
        mechanic={mechanic}
        initialData={initialData}
        equipment_id={equipment_id}
        savedFilters={filters ? JSON.parse(filters) : []}
        savedVisibility={savedVisibility3 ? JSON.parse(savedVisibility3) : []}
      />
    </Card>
  );
}

export default RepairSolicitudesWrapper;
