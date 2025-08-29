import { fetchEquipmentData } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import TablaEquipmentServer from '../data-equipment-server';

type EquipmentTableWrapperProps = {
  types_of_vehicles?: 'all' | 'Vehículos' | 'Otros';
};

async function EquipmentTableWrapperServer({ types_of_vehicles = 'all' }: EquipmentTableWrapperProps) {
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`equipmentServerTable-${types_of_vehicles}`)?.value;
  const savedFilters = cookiesStore.get(`equipmentServerTable-${types_of_vehicles}-filters`)?.value;

  const initialData = await fetchEquipmentData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
    filters: [
      ...(types_of_vehicles !== 'all'
        ? [
            {
              column: 'type_of_vehicle' as any,
              operator: 'eq' as any,
              value: types_of_vehicles === 'Vehículos' ? 1 : 2,
            },
          ]
        : []),
    ],
    server: true,
  });
  return (
    <>
      <TablaEquipmentServer
        types_of_vehicles={types_of_vehicles}
        initialData={initialData}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      />
    </>
  );
}

export default EquipmentTableWrapperServer;
