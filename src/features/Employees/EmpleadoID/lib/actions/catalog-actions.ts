'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function fetchAllCostCenters() {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase.from('cost_center').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching cost centers:', error);
    return [];
  }

  return data;
}

export async function fetchContractorCompanies() {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching contractor companies:', error);
    return [];
  }

  return data;
}

export async function fetchCompanyPositions() {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase.from('company_positions').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching company positions:', error);
    return [];
  }

  return data;
}

export async function fetchHierarchicalPositions() {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase.from('hierarchy').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching hierarchical positions:', error);
    return [];
  }

  return data;
}

export async function fetchGuilds() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('guild')
    .select('*')
    .order('name', { ascending: true })
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching guilds:', error);
    return [];
  }

  return data;
}

export async function fetchCovenants() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('covenant')
    .select('*')
    .order('name', { ascending: true })
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching covenants:', error);
    return [];
  }

  return data;
}

export async function fetchCategories() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('category')
    .select('*')
    .order('name', { ascending: true })
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data;
}

export async function fetchCountries() {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('countries').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching countries:', error);
    return [];
  }

  return data;
}

export async function fetchProvinces() {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('provinces').select('id,name').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }

  return data;
}
export async function fetchCitiesByProvinceId(provinceId: number) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('cities')
    .select('id,name')
    .order('name', { ascending: true })
    .eq('province_id', provinceId);

  if (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }

  return data;
}

export async function fetchCities() {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('cities').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching cities:', error);
    return [];
  }

  return data;
}
export async function fetchWorkflowDiagrams() {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase.from('work_diagram').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching workflow diagrams:', error);
    return [];
  }

  return data;
}
