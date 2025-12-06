'use server';

import { supabaseServer } from '@/lib/supabase/server';
// import { AptitudTecnica } from '../types/aptitudesTecnicas';
import { cookies } from 'next/headers';

export async function fetchAllContractTypes() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('types_of_contract')
    .select('*')
    .order('name', { ascending: true })
    .eq('is_active', true)
    .returns<ContractType[]>();

  if (error) {
    console.error('Error fetching contract types:', error);
    return [];
  }
  return data;
}
export async function fetchAllContractTypesIncludesInactive() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('types_of_contract')
    .select('*')
    .order('name', { ascending: true })
    .returns<ContractType[]>();

  if (error) {
    console.error('Error fetching contract types:', error);
    return [];
  }
  return data;
}
