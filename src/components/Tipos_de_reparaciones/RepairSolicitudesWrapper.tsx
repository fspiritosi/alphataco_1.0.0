import { cookies } from 'next/headers';
import RepairSolicitudes from './RepairSolicitudesTable/RepairSolicitudes';

async function RepairSolicitudesWrapper({ mechanic, equipment_id }: { mechanic?: boolean; equipment_id?: string }) {
  const coockiesStore = cookies();
  const savedVisibility3 = coockiesStore.get('repair-solicitudes-table')?.value;
  const filters = coockiesStore.get('repair-solicitudes-table-filters')?.value;

  return (
    <RepairSolicitudes
      mechanic={mechanic}
      default_equipment_id={equipment_id}
      savedFilters={filters ? JSON.parse(filters) : []}
      savedVisibility={savedVisibility3 ? JSON.parse(savedVisibility3) : []}
    />
  );
}

export default RepairSolicitudesWrapper;
