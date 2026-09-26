import { cookies } from 'next/headers';
import { fetchAllWorkshopSectors, fetchInternalWorkshops } from '../../actions/workshops.server';
import { SectoresTabClient } from './sectores/SectoresTabClient';

/**
 * Sección Sectores de Taller, montable por sí sola. Ver la nota en `TalleresTab`.
 */
async function SectoresTab() {
  const cookiesStore = await cookies();
  const workshopSectors = fetchAllWorkshopSectors();
  const internalWorkshops = fetchInternalWorkshops();

  const savedVisibility = cookiesStore.get('sectores-table')?.value;
  const savedFilter = cookiesStore.get('sectores-table-filters')?.value;

  return (
    <SectoresTabClient
      workshopSectors={workshopSectors}
      internalWorkshops={internalWorkshops}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
    />
  );
}

export default SectoresTab;
