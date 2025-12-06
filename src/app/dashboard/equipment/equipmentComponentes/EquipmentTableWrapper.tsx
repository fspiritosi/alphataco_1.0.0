import { fetchAllEquipment } from '@/app/server/GET/actions';
import { supabaseServer } from '@/lib/supabase/server';
import { getActualRole } from '@/lib/utils';
import { cookies } from 'next/headers';
import { EquipmentColums } from '../columns';
import { EquipmentTable } from '../data-equipment';

type EquipmentTableWrapperProps = {
  filterType?: 'all' | 'vehicles' | 'others';
};

async function EquipmentTableWrapper({ filterType = 'all' }: EquipmentTableWrapperProps) {
  // Fetch toda la data necesaria
  const equipments = await fetchAllEquipment();

  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const company_id = cookiesStore.get('actualComp')?.value;
  const role = await getActualRole(company_id as string, user?.id as string);

  // Filtrar datos según el tipo
  let filteredData = equipments;
  if (filterType === 'vehicles') {
    filteredData = equipments?.filter((v) => v.types_of_vehicles.id == '1');
  } else if (filterType === 'others') {
    filteredData = equipments?.filter((v) => v.types_of_vehicles.id == '2');
  }

  // Obtener preferencias guardadas
  const savedVisibility = cookiesStore.get(`equipment-table-equipment`)?.value;
  const savedFilters = cookiesStore.get(`equipment-table-equipment-filters`)?.value;

  return (
    <>
      <EquipmentTable
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : []}
        role={role}
        columns={EquipmentColums || []}
        data={filteredData || []}
      />
    </>
  );
}

export default EquipmentTableWrapper;
