import { onlyFetchEquipmentData } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import OtrosTablaEquipmentServer from '../only-data-equipment-server';

type EquipmentTableWrapperProps = {
  types_of_vehicles?: 'all' | 'Vehículos' | 'Otros';
};

async function OtrosEquipmentTableWrapperServer({ types_of_vehicles = 'all' }: EquipmentTableWrapperProps) {
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`equipmentServerTable-Otros`)?.value;
  const savedFilters = cookiesStore.get(`equipmentServerTable-Otros-filters`)?.value;

  const initialData = await onlyFetchEquipmentData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
    filters: [],
    server: true,
  });
  return (
    <>
      <OtrosTablaEquipmentServer
        types_of_vehicles={types_of_vehicles}
        initialData={initialData}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      />
    </>
  );
}

export default OtrosEquipmentTableWrapperServer;
