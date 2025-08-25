'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getVehicleBrands() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('brand_vehicles')
    .select('*')
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching vehicle brands:', error);
    return [];
  }

  return data || [];
}

export async function getVehicleModels() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('model_vehicles')
    .select('*')
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching vehicle models:', error);
    return [];
  }

  return data || [];
}

export async function getVehicleOwners() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase.from('equipment_owners').select('*').eq('is_active', true).order('name');

  if (error) {
    console.error('Error fetching vehicle types:', error);
    return [];
  }

  return data || [];
}
export type getVehicleOwnersType = Awaited<ReturnType<typeof getVehicleOwners>>;
export async function getVehicleTypes() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('type')
    .select('*')
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching vehicle types:', error);
    return [];
  }

  return data || [];
}

export async function getTypesOfVehicles() {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('types_of_vehicles').select('*').order('name').eq('is_active', true);

  if (error) {
    console.error('Error fetching types of vehicles:', error);
    return [];
  }

  return data || [];
}

export async function getVehicleSubTypes() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('sub_type')
    .select('*')
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .order('name')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching vehicle sub types:', error);
    return [];
  }

  return data || [];
}

export async function getModelsByBrand(brandId: number) {
  if (!brandId) return [];
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('model_vehicles')
    .select('*')
    .eq('brand', brandId)
    .order('name')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching models by brand:', error);
    return [];
  }

  return data || [];
}

export async function getSubTypesByType(typeId: string) {
  if (!typeId) return [];
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('sub_type')
    .select('*')
    .eq('type', typeId)
    .order('name')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching sub types by type:', error);
    return [];
  }

  return data || [];
}
