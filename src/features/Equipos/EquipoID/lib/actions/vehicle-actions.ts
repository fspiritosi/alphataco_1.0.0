'use server';

import { supabaseServer } from '@/lib/supabase/server';
import moment from 'moment';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function getVehicleById(id: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('vehicles')
    .select(
      `
      *,
      brand_vehicles(id, name),
      model_vehicles(id, name),
      types_of_vehicles(id, name),
      type(*),
      sub_type(id, name),
      contractor_equipment(customers(id, name))
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching vehicle:', error);
    throw new Error('Failed to fetch vehicle');
  }

  // Transform data to match form expectations
  return {
    ...data,
    allocated_to: data.contractor_equipment?.map((ce) => ce.customers?.id) || [],
  };
}

export async function toggleVehicleStatus(
  id: string,
  activate: boolean,
  reason_for_termination?: any,
  termination_date?: Date
) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      is_active: activate,
      reason_for_termination: activate ? null : reason_for_termination,
      termination_date: termination_date ? moment(termination_date).format('YYYY-MM-DD') : null,
    })
    .eq('id', id);

  if (error) {
    console.error('Error toggling vehicle status:', error);
    throw new Error('Failed to toggle vehicle status');
  }

  return data;
}

export async function createVehicle(vehicleData: any) {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    throw new Error('No company selected');
  }

  // Get IDs for related entities
  // const brandId = await getBrandIdByName(vehicleData.brand);
  // const modelId = await getModelIdByName(vehicleData.model);
  // const typeId = await getTypeIdByName(vehicleData.type);
  // const typeOfVehicleId = await getTypeOfVehicleIdByName(vehicleData.type_of_vehicle);
  // const subTypeId = vehicleData.subType ? await getSubTypeIdByName(vehicleData.subType) : null;

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      ...vehicleData,
      company_id,
      allocated_to: undefined, // Remove this as it's handled separately
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating vehicle:', error);
    throw new Error('Failed to create vehicle');
  }

  // Handle contractor relationships
  if (vehicleData.allocated_to?.length > 0) {
    await updateContractorRelationships(data.id, vehicleData.allocated_to);
  }

  revalidatePath('/dashboard/equipment');
  return data;
}

export async function updateVehicle(id: string, vehicleData: any) {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    throw new Error('No company selected');
  }

  // Get IDs for related entities
  // const brandId = await getBrandIdByName(vehicleData.brand);
  // const modelId = await getModelIdByName(vehicleData.model);
  // const typeId = await getTypeIdByName(vehicleData.type);
  // const typeOfVehicleId = await getTypeOfVehicleIdByName(vehicleData.type_of_vehicle);
  // const subTypeId = vehicleData.subType ? await getSubTypeIdByName(vehicleData.subType) : null;

  const { data, error } = await supabase
    .from('vehicles')
    .update({
      ...vehicleData,
      allocated_to: undefined, // Remove this as it's handled separately
    })
    .eq('id', id)
    .eq('company_id', company_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vehicle:', error);
    throw new Error('Failed to update vehicle');
  }

  // Handle contractor relationships
  if (vehicleData.allocated_to !== undefined) {
    await updateContractorRelationships(id, vehicleData.allocated_to);
  }

  revalidatePath('/dashboard/equipment');
  return data;
}

export async function deleteVehicle(id: string) {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    throw new Error('No company selected');
  }

  const { error } = await supabase.from('vehicles').delete().eq('id', id).eq('company_id', company_id);

  if (error) {
    console.error('Error deleting vehicle:', error);
    throw new Error('Failed to delete vehicle');
  }

  revalidatePath('/dashboard/equipment');
}

// Helper functions to get IDs by names
async function getBrandIdByName(name: string) {
  const supabase = supabaseServer();
  const { data } = await supabase.from('brand_vehicles').select('id').eq('name', name).single();
  return data?.id;
}

async function getModelIdByName(name: string) {
  const supabase = supabaseServer();
  const { data } = await supabase.from('model_vehicles').select('id').eq('name', name).single();
  return data?.id;
}

async function getTypeIdByName(name: string) {
  const supabase = supabaseServer();
  const { data } = await supabase.from('type').select('id').eq('name', name).single();
  return data?.id;
}

async function getTypeOfVehicleIdByName(name: string) {
  const supabase = supabaseServer();
  const { data } = await supabase.from('types_of_vehicles').select('id').eq('name', name).single();
  return data?.id;
}

async function getSubTypeIdByName(name: string) {
  const supabase = supabaseServer();
  const { data } = await supabase.from('sub_type').select('id').eq('name', name).single();
  return data?.id;
}

// Smart contractor relationship management
async function updateContractorRelationships(vehicleId: string, newContractorIds: string[]) {
  const supabase = supabaseServer();

  // Get current relationships
  const { data: currentRelations } = await supabase
    .from('contractor_equipment')
    .select('contractor_id')
    .eq('equipment_id', vehicleId);

  const currentContractorIds = currentRelations?.map((r) => r.contractor_id) || [];

  // Find relationships to add and remove
  const toAdd = newContractorIds.filter((id) => !currentContractorIds.includes(id));
  const toRemove = currentContractorIds.filter((id) => !newContractorIds.includes(id || ''));

  // Remove old relationships
  if (toRemove.length > 0) {
    await supabase.from('contractor_equipment').delete().eq('equipment_id', vehicleId).in('contractor_id', toRemove);
  }

  // Add new relationships
  if (toAdd.length > 0) {
    const newRelations = toAdd.map((contractorId) => ({
      equipment_id: vehicleId,
      contractor_id: contractorId,
    }));

    await supabase.from('contractor_equipment').insert(newRelations);
  }
}
