'use server';

import { fetchCurrentUser } from '@/app/server/GET/actions';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const fetchAllEmployees = async (role?: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const company_id = cookiesStore.get('actualComp')?.value;
  // console.log(company_id, 'company_id');
  if (!company_id) return [];

  // console.log(user, 'user');

  // if (role === 'Invitado') {
  //   const { data, error } = await supabase
  //     .from('share_company_users')
  //     .select(
  //       `*,customer_id(*,contractor_employee(*,employee_id(*,hierarchical_position(*),city(*),province(*),workflow_diagram(*),birthplace(*))))`
  //     )
  //     .eq('profile_id', user?.id || '')
  //     .eq('company_id', company_id)
  //     // .returns<ShareCompanyUsersWithRelations[]>();

  //   const employees = data?.[0].customer_id[0].
  //   const allEmployees = employees?.map((employee: any) => employee.employee_id) as EmployeeDetailed[];
  //   return allEmployees || [];
  // }

  const { data, error } = await supabase
    .from('employees')
    .select(
      'contractor_employee(*,customers(*)),company_positions(*),hierarchy(*),cities(*),provinces(*),work_diagram(*),countries(*),cost_center(*),*'
    )
    .eq('company_id', company_id);

  console.log(data, 'data');
  // .returns<EmployeeDetailed[]>();

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};

export const fetchAllEmployeesCount = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return 0;
  const { count, error } = await supabase
    .from('employees')
    .select('count', { count: 'exact' })
    .eq('company_id', company_id);

  if (error) return 0;

  return count || 0;
};
export const fetchAllVehiclesCount = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return 0;
  const { count, error } = await supabase
    .from('vehicles')
    .select('count', { count: 'exact' })
    .eq('company_id', company_id);

  if (error) return 0;

  return count || 0;
};

export const fetchAllEmployeesInactives = async (role?: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const user = await fetchCurrentUser();
  // console.log(company_id, 'company_id');
  if (!company_id) return [];

  // console.log(user, 'user');

  // if (role === 'Invitado') {
  //   const { data, error } = await supabase
  //     .from('share_company_users')
  //     .select(
  //       `*,customer_id(*,contractor_employee(*,employee_id(*,hierarchical_position(*),city(*),province(*),workflow_diagram(*),birthplace(*))))`
  //     )
  //     .eq('profile_id', user?.id || '')
  //     .eq('company_id', company_id)
  //     .eq('customer_id.employee_id.is_active', false)
  //     .returns<ShareCompanyUsersWithRelations[]>();

  //   const employees = data?.[0].customer_id?.contractor_employee as any;
  //   const allEmployees = employees?.map((employee: any) => employee.employee_id) as EmployeeDetailed[];
  //   return allEmployees || [];
  // }

  const { data, error } = await supabase
    .from('employees')
    .select(
      'contractor_employee(*,customers(*)),company_positions(*),hierarchy(*),cities(*),provinces(*),work_diagram(*),countries(*),cost_center(*),*'
    )
    .eq('is_active', false)
    .eq('company_id', company_id);

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
