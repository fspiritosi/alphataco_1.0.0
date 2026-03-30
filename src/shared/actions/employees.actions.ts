'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { fetchCurrentUser } from '@/shared/actions/company-user.actions';
import { cookies } from 'next/headers';

export const fetchCountrys = async () => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('countries').select('id,name').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
  return data;
};

export const fetchAllEmployees = async (role?: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();

  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees')
    .select(
      'contractor_employee(*,customers(*)),company_positions(*),hierarchy(*),cities(*),provinces(*),work_diagram(*),countries(*),cost_center(*),*'
    )
    .eq('company_id', company_id)

    .order('lastname', { ascending: true })
    .order('firstname', { ascending: true });

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
export const fetchAllEmployees2 = async (contractor_id: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();

  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees')
    .select(
      'contractor_employee(*,customers(*)),company_positions(*),hierarchy(*),cities(*),provinces(*),work_diagram(*),countries(*),cost_center(*),*'
    )
    .eq('company_id', company_id)
    .eq('contractor_employee.contractor_id', contractor_id)
    .order('lastname', { ascending: true })
    .order('firstname', { ascending: true });

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
export const fetchAllEmployeesOnlyName = async (role?: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();

  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees')
    .select('id,firstname,lastname')
    .eq('company_id', company_id)
    .order('lastname', { ascending: true })
    .order('firstname', { ascending: true });

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};

export const fetchSimpleDataEmployee = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees')
    .select('id,firstname,lastname,cuil')
    .eq('company_id', company_id);

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};

export const fetchAllEmployeesCount = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return 0;
  const { count, error } = await supabase
    .from('employees')
    .select('count', { count: 'exact' })
    .eq('company_id', company_id)
    .eq('is_active', true);

  if (error) return 0;

  return count || 0;
};
export const fetchAllVehiclesCount = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return 0;
  const { count, error } = await supabase
    .from('vehicles')
    .select('count', { count: 'exact' })
    .eq('company_id', company_id)
    .eq('is_active', true);

  if (error) return 0;

  return count || 0;
};

export const fetchAllEmployeesInactives = async (role?: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const user = await fetchCurrentUser();
  if (!company_id) return [];

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
