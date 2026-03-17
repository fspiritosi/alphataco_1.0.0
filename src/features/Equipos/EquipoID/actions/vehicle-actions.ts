'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('dashboard/employee/actions');

export async function fetchAllCostCenter() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('cost_center').select('*').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching cost centers', { data: { error } });
    return [];
  }
  return data;
}

export async function fetchContractorCompanies() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching contractor companies', { data: { error } });
    return [];
  }
  return data;
}

export async function fetchContractsByClientId(clientId: string) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];
  const { data, error } = await supabase
    .from('customer_services')
    .select('id, service_name')
    .order('service_name', { ascending: true })
    .eq('customer_id', clientId);

  if (error) {
    logger.error('Error fetching contracts', { data: { error } });
    return [];
  }
  return data;
}

export async function fetchAllContracts() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('customer_services')
    .select('id, service_name')
    .order('service_name', { ascending: true });

  if (error) {
    logger.error('Error fetching contracts', { data: { error } });
    return [];
  }
  return data;
}
export async function fetchAllContractorForVehicles() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('customers')
    .select('id,name')
    .order('name', { ascending: true })
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching contractor companies for vehicles', { data: { error } });
    return [];
  }
  return data;
}

export async function fetchAllCompanyPositon() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('company_positions').select('*').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching company positions', { data: { error } });
    return [];
  }
  return data;
}
