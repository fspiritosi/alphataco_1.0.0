'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Equipos/vehicle-catalog-actions');

export async function getVehicleBrands() {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('brand_vehicles')
    .select('*')
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .eq('is_active', true)
    .order('name');

  if (error) {
    logger.error('Error fetching vehicle brands', { data: { error } });
    return [];
  }

  return data || [];
}

export async function getVehicleModels() {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('model_vehicles')
    .select('*')
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .eq('is_active', true)
    .order('name');

  if (error) {
    logger.error('Error fetching vehicle models', { data: { error } });
    return [];
  }

  return data || [];
}

export async function getVehicleOwners() {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('equipment_owners')
    .select('*, equipment_owner_contract_types(contract_type)')
    .eq('is_active', true)
    .order('name');

  if (error) {
    logger.error('Error fetching vehicle owners', { data: { error } });
    return [];
  }

  return data || [];
}
export type getVehicleOwnersType = Awaited<ReturnType<typeof getVehicleOwners>>;
export async function getVehicleTypes(appliesTo?: 'vehicle' | 'other_equipment') {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  let query = supabase
    .from('type')
    .select('*')
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .eq('is_active', true);

  // Filtrar por applies_to si se proporciona
  if (appliesTo) {
    query = query.eq('applies_to', appliesTo);
  }

  const { data, error } = await query.order('name');

  if (error) {
    logger.error('Error fetching vehicle types', { data: { error } });
    return [];
  }

  return data || [];
}

export async function getTypesOfVehicles() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('types_of_vehicles').select('*').order('name').eq('is_active', true);

  if (error) {
    logger.error('Error fetching types of vehicles', { data: { error } });
    return [];
  }

  return data || [];
}

export async function getVehicleSubTypes() {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('sub_type')
    .select('*')
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .order('name')
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching vehicle sub types', { data: { error } });
    return [];
  }

  return data || [];
}

export async function getModelsByBrand(brandId: number) {
  if (!brandId) return [];
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('model_vehicles')
    .select('*')
    .eq('brand', brandId)
    .order('name')
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching models by brand', { data: { error } });
    return [];
  }

  return data || [];
}

export async function getSubTypesByType(typeId: string) {
  if (!typeId) return [];
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('sub_type')
    .select('*')
    .eq('type', typeId)
    .order('name')
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching sub types by type', { data: { error } });
    return [];
  }

  return data || [];
}

export async function getHierarchicalPositions() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('hierarchy').select('id, name').eq('is_active', true).order('name');

  if (error) {
    logger.error('Error fetching hierarchical positions', { data: { error } });
    return [];
  }

  return data || [];
}
