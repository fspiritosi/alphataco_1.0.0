import { Card } from '@/components/ui/card';
import TablaEquipmentServer from '@/features/Equipos/Equipos/components/data-equipment-server';
import { fetchVehiclesData } from '@/features/Equipos/Equipos/lib/actions/fetch-equipment-action';
import { cookies } from 'next/headers';

type EquipmentTableWrapperProps = {
  types_of_vehicles?: 'all' | 'Vehículos' | 'Otros';
};

async function EquipmentTableWrapperServer({ types_of_vehicles = 'all' }: EquipmentTableWrapperProps) {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get(`equipmentServerTable-Vehículos`)?.value;
  const savedFilters = cookiesStore.get(`equipmentServerTable-Vehículos-filters`)?.value;

  const initialData = await fetchVehiclesData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
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
