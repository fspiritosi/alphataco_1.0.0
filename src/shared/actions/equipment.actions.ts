import { supabaseServer } from '@/lib/supabase/server';
import { getActualRole } from '@/lib/utils';
import { cookies } from 'next/dist/client/components/headers';

export const fetchAllEquipment = async (company_equipment_id?: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id && !company_equipment_id) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  if (role === 'Invitado') {
    const { data, error } = await supabase
      .from('share_company_users')
      .select(`*,customer_id(*,contractor_equipment(*,equipment_id(*,brand(*),model(*),type(*),types_of_vehicles(*))))`)
      .eq('profile_id', user?.id || '')
      .eq('company_id', (company_id ?? company_equipment_id) || '')
      .returns<ShareCompanyUsersWithEquipment[]>();

    const equipments = data?.[0].customer_id?.contractor_equipment;
    const allEquipments = equipments?.map((equipment) => equipment.equipment_id);
    return allEquipments || [];
  }

  const { data, error } = await supabase
    .from('vehicles')
    .select('*,brand(*),model(*),type(*),types_of_vehicles(*),contractor_equipment(*,contractor_id(*))')
    .eq('company_id', (company_id ?? company_equipment_id) || '')
    .returns<VehicleWithBrand[]>();

  if (error) {
    console.error('Error fetching equipment:', error);

    return [];
  }
  return data;
};
export const fetchSimpleDataEquipment = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('vehicles')
    .select('domain,serie,intern_number,id')
    .eq('company_id', company_id);
  if (error) {
    console.error('Error fetching equipment:', error);

    return [];
  }
  return data;
};
