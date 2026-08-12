'use server';

import { condition_enum } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const logger = new Logger('features/Equipos/vehicle-actions');

/**
 * Columnas FK / UUID / numéricas opcionales de `vehicles`. Un string vacío proveniente del
 * formulario debe persistirse como `null`: Postgres rechaza `''` en columnas uuid/integer (error 400).
 */
const NULLABLE_VEHICLE_FK_FIELDS = [
  'subType',
  'owner_id',
  'cost_center_id',
  'sector',
  'brand',
  'model',
  'type_operative_id',
  'tire_template_id',
] as const;

/**
 * Convierte a `null` los strings vacíos de las columnas FK/UUID/numéricas opcionales.
 * No toca el resto de los campos para no alterar columnas de texto ni NOT NULL.
 */
function normalizeVehicleFkFields<T extends Record<string, unknown>>(vehicleData: T): T {
  const normalized = { ...vehicleData };
  for (const field of NULLABLE_VEHICLE_FK_FIELDS) {
    if (normalized[field] === '') {
      (normalized as Record<string, unknown>)[field] = null;
    }
  }
  return normalized;
}

export async function getVehicleById(id: string) {
  const supabase = await supabaseServer();
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
      contractor_equipment(customers(id, name)),
      equipment_owners(id, name)
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Error fetching vehicle', { data: { error } });
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
  condition: Database['public']['Enums']['condition_enum'],
  reason_for_termination?: any,
  termination_date?: Date
) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      is_active: activate,
      condition,
      reason_for_termination: activate ? null : reason_for_termination,
      termination_date: termination_date ? moment(termination_date).format('YYYY-MM-DD') : null,
    })
    .eq('id', id);

  if (error) {
    logger.error('Error toggling vehicle status', { data: { error } });
    throw new Error('Failed to toggle vehicle status');
  }

  revalidatePath('/dashboard/equipment');
  return data;
}

/** Ventana en la que dos altas del mismo dominio se consideran la misma request repetida */
const DUPLICATE_RACE_WINDOW_MS = 10_000;

/**
 * Resuelve la carrera entre dos altas simultaneas del mismo vehiculo (doble click,
 * reintento del navegador). La validacion de dominio vive en el resolver del formulario y
 * es async, asi que dos requests en paralelo la pasan las dos.
 *
 * Si aparecio otro vehiculo activo con el mismo dominio dentro de la ventana de duplicados,
 * el registro mas nuevo se elimina a si mismo. El criterio (created_at, id) es determinista,
 * por lo que ambas requests eligen el mismo ganador y nunca se borran las dos.
 *
 * Solo mira altas recientes: los dominios repetidos que ya existian en la base no se tocan.
 */
async function discardVehicleIfDuplicateRace(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  companyId: string,
  created: { id: string; created_at: string; domain: string | null }
): Promise<boolean> {
  if (!created.domain) return false;

  const windowStart = moment(created.created_at).subtract(DUPLICATE_RACE_WINDOW_MS, 'milliseconds').toISOString();

  const { data: siblings } = await supabase
    .from('vehicles')
    .select('id, created_at')
    .eq('company_id', companyId)
    .eq('domain', created.domain)
    .eq('is_active', true)
    .gte('created_at', windowStart);

  if (!siblings || siblings.length < 2) return false;

  const [winner] = [...siblings].sort((a, b) =>
    a.created_at === b.created_at ? a.id.localeCompare(b.id) : a.created_at < b.created_at ? -1 : 1
  );

  if (winner.id === created.id) return false;

  const { error: deleteError } = await supabase.from('vehicles').delete().eq('id', created.id);

  if (deleteError) {
    logger.error('No se pudo descartar el vehiculo duplicado por request simultanea', {
      data: { id: created.id, error: deleteError.message },
    });
    throw new Error('Se creo un equipo duplicado y no se pudo revertir. Revisa el listado antes de reintentar.');
  }

  logger.warn('Vehiculo duplicado descartado por request simultanea', {
    data: { descartado: created.id, conservado: winner.id, domain: created.domain },
  });
  return true;
}

export async function createVehicle(vehicleData: any) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
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

  // Determinar si el tipo de equipo es "Vehículos" para setear el estado inicial "en preparacion"
  let condition: Database['public']['Enums']['condition_enum'] | undefined;
  if (vehicleData.type_of_vehicle) {
    const parsedTypeOfVehicleId = Number(vehicleData.type_of_vehicle);
    if (!Number.isNaN(parsedTypeOfVehicleId)) {
      const { data: typeOfVehicleRow, error: typeOfVehicleError } = await supabase
        .from('types_of_vehicles')
        .select('name')
        .eq('id', parsedTypeOfVehicleId)
        .single();

      if (typeOfVehicleError) {
        logger.error('Error fetching type_of_vehicle for vehicle', { data: { typeOfVehicleError } });
      } else if (typeOfVehicleRow?.name === 'Vehículos') {
        condition = 'en preparacion';
      }
    }
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      ...normalizeVehicleFkFields(vehicleData),
      company_id,
      // Solo los vehículos (no "Otros") nacen en "en preparacion"
      condition,
      allocated_to: undefined, // Remove this as it's handled separately
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating vehicle', { data: { error } });
    throw new Error('Failed to create vehicle');
  }

  // Si otra request simultanea inserto el mismo equipo, descartar el sobrante antes de
  // asociar contratistas (asi no queda basura en la tabla pivot).
  const wasRaced = await discardVehicleIfDuplicateRace(supabase, company_id, data);

  if (wasRaced) {
    throw new Error(`El equipo con el dominio ${data.domain} ya fue creado. No se generó un duplicado.`);
  }

  // Handle contractor relationships
  if (vehicleData.allocated_to?.length > 0) {
    await updateContractorRelationships(data.id, vehicleData.allocated_to);
  }

  revalidatePath('/dashboard/equipment');
  return data;
}

export async function updateVehicle(id: string, vehicleData: any) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
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
      ...normalizeVehicleFkFields(vehicleData),
      allocated_to: undefined, // Remove this as it's handled separately
    })
    .eq('id', id)
    .eq('company_id', company_id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating vehicle', { data: { error } });
    throw new Error('Failed to update vehicle');
  }

  // Handle contractor relationships
  if (vehicleData.allocated_to !== undefined) {
    await updateContractorRelationships(id, vehicleData.allocated_to);
  }

  // 358 / M:M: re-evaluar los documentos requeridos del equipo con el estado FINAL (incluye
  // afectaciones a contratistas, que se actualizan despues del update). 1 solo recurso (barato);
  // su UPDATE de status no dispara cascada (status no esta en la guarda de controlar_alertas).
  await prisma.$executeRaw`SELECT controlar_alertas_documentos_single_vehicle(${id}::uuid, ${company_id}::uuid)`;

  revalidatePath('/dashboard/equipment');
  return data;
}

export async function deleteVehicle(id: string) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    throw new Error('No company selected');
  }

  const { error } = await supabase.from('vehicles').delete().eq('id', id).eq('company_id', company_id);

  if (error) {
    logger.error('Error deleting vehicle', { data: { error } });
    throw new Error('Failed to delete vehicle');
  }

  revalidatePath('/dashboard/equipment');
}

// Helper functions to get IDs by names
async function getBrandIdByName(name: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('brand_vehicles').select('id').eq('name', name).single();
  return data?.id;
}

async function getModelIdByName(name: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('model_vehicles').select('id').eq('name', name).single();
  return data?.id;
}

async function getTypeIdByName(name: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('type').select('id').eq('name', name).single();
  return data?.id;
}

async function getTypeOfVehicleIdByName(name: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('types_of_vehicles').select('id').eq('name', name).single();
  return data?.id;
}

async function getSubTypeIdByName(name: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('sub_type').select('id').eq('name', name).single();
  return data?.id;
}

// Smart contractor relationship management
async function updateContractorRelationships(vehicleId: string, newContractorIds: string[]) {
  const supabase = await supabaseServer();

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

/**
 * Actualiza solo la condición de un vehículo (vehicles) o equipo (other_equipment).
 * Usado para pasar de "en preparación" a "operativo" desde el header.
 */
export async function updateEquipmentCondition(
  equipmentId: string,
  newCondition: condition_enum,
  table: 'vehicles' | 'other_equipment' = 'vehicles'
) {
  logger.info('Actualizando condición de equipo', {
    data: { equipmentId, newCondition, table },
  });

  try {
    if (table === 'vehicles') {
      await prisma.vehicles.update({
        where: { id: equipmentId },
        data: { condition: newCondition },
      });
    } else {
      await prisma.other_equipment.update({
        where: { id: equipmentId },
        data: { condition: newCondition },
      });
    }

    revalidatePath('/dashboard/equipment');
    return { success: true };
  } catch (error) {
    logger.error('Error al actualizar condición de equipo', {
      data: { error, equipmentId, newCondition, table },
    });
    throw error;
  }
}
