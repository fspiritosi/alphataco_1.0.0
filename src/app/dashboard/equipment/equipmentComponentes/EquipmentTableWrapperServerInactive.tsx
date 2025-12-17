import { fetchInactiveEquipmentData } from '@/app/server/GET/probando';
import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';
import TablaEquipmentServerInactive from '../data-equipment-server-inactive';

type EquipmentTableWrapperProps = {
  types_of_vehicles?: 'all' | 'Vehículos' | 'Otros';
};

async function EquipmentTableWrapperServerInactive({ types_of_vehicles = 'all' }: EquipmentTableWrapperProps) {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get(`equipmentServerTable-inactive-${types_of_vehicles}`)?.value;
  const savedFilters = cookiesStore.get(`equipmentServerTable-inactive-${types_of_vehicles}-filters`)?.value;

  const initialData = await fetchInactiveEquipmentData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],

    filters: [],
    server: true,
  });

  return (
    <Card className="p-6">
      <TablaEquipmentServerInactive
        types_of_vehicles={types_of_vehicles}
        initialData={initialData}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      />
    </Card>
  );
}

export default EquipmentTableWrapperServerInactive;
