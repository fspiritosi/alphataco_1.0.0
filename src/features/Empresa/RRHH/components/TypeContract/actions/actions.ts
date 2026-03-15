'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const logger = new Logger('features/Empresa/RRHH');

export async function fetchAllContractTypes() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('types_of_contract')
    .select('*')
    .order('name', { ascending: true })
    .eq('is_active', true)
    .returns<ContractType[]>();

  if (error) {
    logger.error('Error fetching contract types', { data: { error } });
    return [];
  }
  return data;
}

export async function fetchAllContractTypesIncludesInactive() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('types_of_contract')
    .select('*')
    .order('name', { ascending: true })
    .returns<ContractType[]>();

  if (error) {
    logger.error('Error fetching contract types (including inactive)', { data: { error } });
    return [];
  }
  return data;
}
