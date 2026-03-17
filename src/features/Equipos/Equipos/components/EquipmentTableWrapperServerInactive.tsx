import { Card } from '@/components/ui/card';
import TablaEquipmentServerInactive from '@/features/Equipos/Equipos/components/data-equipment-server-inactive';
import { fetchInactiveEquipmentData } from '@/features/Equipos/Equipos/lib/actions/fetch-equipment-action';
import { cookies } from 'next/headers';

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
