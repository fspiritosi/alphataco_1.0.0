import { fetchAllEquipmentWithBrand } from '@/app/server/GET/actions';
import { supabaseServer } from '@/lib/supabase/server';
import { fetchAllEmployees } from '@/shared/actions/employees.actions';
import { cookies } from 'next/headers';

export async function getTotalResourses() {
  const URL = process.env.NEXT_PUBLIC_BASE_URL;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const coockiesStore = await cookies();
  const company_id = coockiesStore.get('actualComp')?.value;

  async function getResources() {
    const employees = await fetchAllEmployees();
    const equipments = await fetchAllEquipmentWithBrand();

    return {
      totalResourses: employees?.length + equipments?.length,
      employees: employees?.length,
      vehicles: equipments?.length,
    };
  }

  if (!company_id) {
    setTimeout(() => {
      getResources();
    }, 200);
  } else {
    return getResources();
  }
}
