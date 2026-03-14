'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Empresa/Equipos/titulares');

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
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

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
    logger.error('Error al crear titular de equipo', { data: { ownerError } });
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
      logger.error('Error al crear tipos de contrato', { data: { contractError } });
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
  const supabase = await supabaseServer();

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
    logger.error('Error al actualizar titular de equipo', { data: { error } });
    throw new Error(`Error updating equipment owner: ${error.message}`);
  }

  // Eliminar los tipos de contrato existentes
  const { error: deleteError } = await supabase
    .from('equipment_owner_contract_types')
    .delete()
    .eq('equipment_owner_id', id);

  if (deleteError) {
    logger.error('Error al eliminar tipos de contrato', { data: { deleteError } });
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
      logger.error('Error al insertar tipos de contrato', { data: { insertError } });
      throw new Error(`Error inserting contract types: ${insertError.message}`);
    }
  }

  return data;
}

export async function FetchEquipmentOwners() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('equipment_owners')
    .select('*, equipment_owner_contract_types(contract_type)');

  if (error) {
    logger.error('Error al obtener titulares de equipos', { data: { error } });
    throw new Error(`Error fetching equipment owners: ${error.message}`);
  }
  return data;
}

export type FetchEquipmentOwnersType = Awaited<ReturnType<typeof FetchEquipmentOwners>>;

export async function fetchEquipmentByOwnerId(owner_id: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('vehicles')
    .select(
      '*,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),equipment_owners(id,name)'
    )
    .eq('owner_id', owner_id);

  if (error) {
    logger.error('Error al obtener equipos por titular', { data: { error, owner_id } });
    throw new Error(`Error fetching equipment by owner ID: ${error.message}`);
  }
  return data;
}
export type FetchEquipmentByOwnerIdType = Awaited<ReturnType<typeof fetchEquipmentByOwnerId>>;
