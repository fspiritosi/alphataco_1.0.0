import { Card } from '@/components/ui/card';
import OtrosTablaEquipmentServer from '@/features/Equipos/Equipos/components/only-data-equipment-server';
import { fetchOtherEquipmentData } from '@/features/Equipos/Equipos/lib/actions/fetch-equipment-action';
import { cookies } from 'next/headers';

type EquipmentTableWrapperProps = {
  types_of_vehicles?: 'all' | 'Vehículos' | 'Otros';
};

async function OtrosEquipmentTableWrapperServer({ types_of_vehicles = 'all' }: EquipmentTableWrapperProps) {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get(`equipmentServerTable-Otros`)?.value;
  const savedFilters = cookiesStore.get(`equipmentServerTable-Otros-filters`)?.value;

  const initialData = await fetchOtherEquipmentData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });
  return (
    <Card className="p-6">
      <OtrosTablaEquipmentServer
        types_of_vehicles={types_of_vehicles}
        initialData={initialData}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      />
    </Card>
  );
}

export default OtrosEquipmentTableWrapperServer;
