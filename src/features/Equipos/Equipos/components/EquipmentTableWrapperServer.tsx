import TablaEquipmentServer from '@/app/dashboard/equipment/data-equipment-server';
import { fetchEquipmentData } from '@/app/server/GET/probando';
import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';

type EquipmentTableWrapperProps = {
  types_of_vehicles?: 'all' | 'Vehículos' | 'Otros';
};

async function EquipmentTableWrapperServer({ types_of_vehicles = 'all' }: EquipmentTableWrapperProps) {
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`equipmentServerTable-Vehículos`)?.value;
  const savedFilters = cookiesStore.get(`equipmentServerTable-Vehículos-filters`)?.value;

  const initialData = await fetchEquipmentData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
    filters: [],
    // server: true,
  });

  return (
    <Card className="p-6">
      <TablaEquipmentServer
        types_of_vehicles={types_of_vehicles}
        initialData={initialData}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      />
    </Card>
  );
}

export default EquipmentTableWrapperServer;
