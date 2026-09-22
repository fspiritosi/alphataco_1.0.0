import { cookies } from 'next/headers';
import { fetchAllWorkshops, fetchAllWorkshopSectors, fetchInternalWorkshops } from '../../actions/workshops.server';
import { MantenimientoTabClient } from './MantenimientoTabClient';

async function MantenimientoTab() {
  const cookiesStore = await cookies();
  const workshops = fetchAllWorkshops();
  const workshopSectors = fetchAllWorkshopSectors();
  const internalWorkshops = fetchInternalWorkshops();

  // Saved visibility and filters for tables
  const savedVisibilityTalleres = cookiesStore.get('talleres-table')?.value;
  const savedFilterTalleres = cookiesStore.get('talleres-table-filters')?.value;
  const savedVisibilitySectores = cookiesStore.get('sectores-table')?.value;
  const savedFilterSectores = cookiesStore.get('sectores-table-filters')?.value;

  return (
    <MantenimientoTabClient
      workshops={workshops}
      workshopSectors={workshopSectors}
      internalWorkshops={internalWorkshops}
      savedVisibilityTalleres={savedVisibilityTalleres ? JSON.parse(savedVisibilityTalleres) : {}}
      savedFilterTalleres={savedFilterTalleres ? JSON.parse(savedFilterTalleres) : []}
      savedVisibilitySectores={savedVisibilitySectores ? JSON.parse(savedVisibilitySectores) : {}}
      savedFilterSectores={savedFilterSectores ? JSON.parse(savedFilterSectores) : []}
    />
  );
}

export default MantenimientoTab;
