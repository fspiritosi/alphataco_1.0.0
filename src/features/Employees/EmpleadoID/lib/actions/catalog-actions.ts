'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('CatalogActions');

export async function fetchAllCostCenters() {
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

export async function fetchCompanyPositions() {
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

export async function fetchHierarchicalPositions() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase.from('hierarchy').select('*').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching hierarchical positions', { data: { error } });
    return [];
  }

  return data;
}

export async function fetchGuilds() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('guild')
    .select('*')
    .order('name', { ascending: true })
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching guilds', { data: { error } });
    return [];
  }

  return data;
}

export async function fetchCovenants() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('covenant')
    .select('*')
    .order('name', { ascending: true })
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching covenants', { data: { error } });
    return [];
  }

  return data;
}

export async function fetchCategories() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('category')
    .select('*')
    .order('name', { ascending: true })
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching categories', { data: { error } });
    return [];
  }

  return data;
}

export async function fetchCountries() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('countries').select('*').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching countries', { data: { error } });
    return [];
  }

  return data;
}

export async function fetchProvinces() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('provinces').select('id,name').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching provinces', { data: { error } });
    return [];
  }

  return data;
}
export async function fetchCitiesByProvinceId(provinceId: number) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('cities')
    .select('id,name')
    .order('name', { ascending: true })
    .eq('province_id', provinceId);

  if (error) {
    logger.error('Error fetching cities by province', { data: { error } });
    return [];
  }

  return data;
}

export async function fetchCities() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('cities').select('*').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching cities', { data: { error } });
    return [];
  }

  return data;
}
export async function fetchWorkflowDiagrams() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase.from('work_diagram').select('*').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching workflow diagrams', { data: { error } });
    return [];
  }

  return data;
}

export async function fetchActiveWorkshopSectors() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('workshop_sectors')
    .select('id, name, workshop_id, workshops(id, name)')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching workshop sectors', { data: { error } });
    return [];
  }

  return data || [];
}
