import {
  fetchMaintenanceGroupsAction,
  fetchTypesOfRepairAction,
} from '@/components/Tipos_de_reparaciones/actions/maintenanceGroupActions';
import { cookies } from 'next/headers';
import MaintenanceGroupsClient from './MaintenanceGroupsClient';

export default async function MaintenanceGroupsWrapper() {
  const { groups } = await fetchMaintenanceGroupsAction();
  const { types } = await fetchTypesOfRepairAction();

  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get('maintenance-groups-table')?.value;
  const savedFilter = cookiesStore.get('maintenance-groups-table-filters')?.value;

  return (
    <MaintenanceGroupsClient
      groups={groups}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
      types={types}
    />
  );
}
