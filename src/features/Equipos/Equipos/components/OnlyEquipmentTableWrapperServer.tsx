import OtrosTablaEquipmentServer from '@/app/dashboard/equipment/only-data-equipment-server';
import { onlyFetchEquipmentData } from '@/app/server/GET/probando';
import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';

type EquipmentTableWrapperProps = {
  types_of_vehicles?: 'all' | 'Vehículos' | 'Otros';
};

async function OtrosEquipmentTableWrapperServer({ types_of_vehicles = 'all' }: EquipmentTableWrapperProps) {
  const cookiesStore = await cookies();
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
