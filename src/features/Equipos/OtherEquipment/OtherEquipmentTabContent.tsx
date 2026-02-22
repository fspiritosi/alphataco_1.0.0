import { cookies } from 'next/headers';
import { fetchActiveOtherEquipment } from './actions/fetchOtherEquipmentAction';
import { OtherEquipmentTableClient } from './components/OtherEquipmentTableClient';

/**
 * Server Component que carga datos iniciales de la tabla de Otros Equipos.
 * Lee cookies para persistir visibilidad de columnas y filtros activos.
 * Pasa initialData al Client Component para evitar flash de carga.
 */
export async function OtherEquipmentTabContent() {
  const cookiesStore = await cookies();

  const savedVisibility = cookiesStore.get('otherEquipmentTable')?.value;
  const savedFilters = cookiesStore.get('otherEquipmentTable-filters')?.value;

  const initialData = await fetchActiveOtherEquipment({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <OtherEquipmentTableClient
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}
