'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function createEquipmentOwner({
  name,
  is_active,
  cuit,
  contract_types,
}: {
  name: string;
  is_active: boolean;
  cuit: string;
  contract_types: ('Leasing' | 'Alquiler' | 'Prendado')[];
}) {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('company_id')?.value;

  // Crear el titular (usamos el primer tipo de contrato para mantener compatibilidad con el campo legacy)
  const { data: ownerData, error: ownerError } = await supabase
    .from('equipment_owners')
    .insert({
      name,
      is_active,
      cuit,
      company_id,
      contract_type: contract_types[0], // Mantener compatibilidad con el campo legacy
    })
    .select()
    .single();

  if (ownerError) {
    console.error('Error creating equipment owner:', ownerError);
    throw new Error(`Error creating equipment owner: ${ownerError.message}`);
  }

  // Insertar los tipos de contrato en la tabla de relación
  if (contract_types.length > 0) {
    const contractTypeRecords = contract_types.map((type) => ({
      equipment_owner_id: ownerData.id,
      contract_type: type,
    }));

    const { error: contractError } = await supabase.from('equipment_owner_contract_types').insert(contractTypeRecords);

    if (contractError) {
      console.error('Error creating contract types:', contractError);
      throw new Error(`Error creating contract types: ${contractError.message}`);
    }
  }

  return ownerData;
}

export async function updateEquipmentOwner({
  id,
  name,
  is_active,
  cuit,
  contract_types,
}: {
  id: string;
  name: string;
  is_active: boolean;
  cuit: string;
  contract_types: ('Leasing' | 'Alquiler' | 'Prendado')[];
}) {
  const supabase = createServerActionClient({ cookies });

  // Actualizar el titular (usamos el primer tipo de contrato para mantener compatibilidad con el campo legacy)
  const { data, error } = await supabase
    .from('equipment_owners')
    .update({
      name,
      is_active,
      cuit,
      contract_type: contract_types[0], // Mantener compatibilidad con el campo legacy
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating equipment owner:', error);
    throw new Error(`Error updating equipment owner: ${error.message}`);
  }

  // Eliminar los tipos de contrato existentes
  const { error: deleteError } = await supabase
    .from('equipment_owner_contract_types')
    .delete()
    .eq('equipment_owner_id', id);

  if (deleteError) {
    console.error('Error deleting contract types:', deleteError);
    throw new Error(`Error deleting contract types: ${deleteError.message}`);
  }

  // Insertar los nuevos tipos de contrato
  if (contract_types.length > 0) {
    const contractTypeRecords = contract_types.map((type) => ({
      equipment_owner_id: id,
      contract_type: type,
    }));

    const { error: insertError } = await supabase.from('equipment_owner_contract_types').insert(contractTypeRecords);

    if (insertError) {
      console.error('Error inserting contract types:', insertError);
      throw new Error(`Error inserting contract types: ${insertError.message}`);
    }
  }

  return data;
}

export async function FetchEquipmentOwners() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('equipment_owners')
    .select('*, equipment_owner_contract_types(contract_type)');

  if (error) {
    console.error('Error fetching equipment owners:', error);
    throw new Error(`Error fetching equipment owners: ${error.message}`);
  }
  return data;
}

export type FetchEquipmentOwnersType = Awaited<ReturnType<typeof FetchEquipmentOwners>>;

export async function fetchEquipmentByOwnerId(owner_id: string) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('vehicles')
    .select(
      '*,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),equipment_owners(id,name)'
    )
    .eq('owner_id', owner_id);

  if (error) {
    console.error('Error fetching equipment by owner ID:', error);
    throw new Error(`Error fetching equipment by owner ID: ${error.message}`);
  }
  return data;
}
export type FetchEquipmentByOwnerIdType = Awaited<ReturnType<typeof fetchEquipmentByOwnerId>>;
