'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('RepairTypeActions');

export async function fetchAllTypesOfRepairs() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    let { data: types_of_repairs, error } = await supabase.from('types_of_repairs').select('*');
    // .eq('company_id', company_id || '');

    if (error) {
      logger.error('Error fetching types of repairs', { data: { error } });
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    return [];
  }
}

export async function createTypeOfRepair(body: Database['public']['Tables']['types_of_repairs']['Insert']) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return { ok: false as const, error: 'No se pudo identificar la empresa actual.' };
  }

  try {
    // Guarda contra duplicados: sin esto, repetir el alta del mismo tipo de reparacion
    // (por doble click o por volver a cargarlo mas tarde) creaba una segunda fila
    // identica sin ningun aviso (ticket 616). La comparacion ignora mayusculas y
    // espacios sobrantes.
    const name = body.name?.trim();
    if (name) {
      const { data: existing } = await supabase
        .from('types_of_repairs')
        .select('id, name')
        .ilike('name', name)
        .limit(1);

      if (existing && existing.length > 0) {
        return { ok: false as const, error: `Ya existe el tipo de reparación "${existing[0].name}".` };
      }
    }

    const { data: types_of_repairs, error } = await supabase.from('types_of_repairs').insert(body).select();

    if (error) {
      logger.error('Error al crear tipo de reparacion', { data: { error } });
      return { ok: false as const, error: 'No se pudo crear el tipo de reparación. Intente nuevamente.' };
    }
    return { ok: true as const, data: types_of_repairs || [] };
  } catch (error) {
    logger.error('Error al crear tipo de reparacion', { data: { error } });
    return { ok: false as const, error: 'No se pudo crear el tipo de reparación. Intente nuevamente.' };
  }
}

export async function updateTypeOfRepair(body: Database['public']['Tables']['types_of_repairs']['Update'], id: string) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    const { data: types_of_repairs, error } = await supabase
      .from('types_of_repairs')
      .update(body)
      .eq('id', id || '');

    if (error) {
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    return [];
  }
}

export async function deleteTypeOfRepair(id: string) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    const { data: types_of_repairs, error } = await supabase
      .from('types_of_repairs')
      .delete()
      .eq('id', id || '');
    if (error) {
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    return [];
  }
}

export async function fetchAllWorkshopSectorsForConfig() {
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

export async function fetchSectorsForRepairType(repairTypeId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('sector_repair_types')
    .select('workshop_sector_id')
    .eq('repair_type_id', repairTypeId);

  if (error) {
    logger.error('Error fetching sectors for repair type', { data: { error } });
    return [];
  }

  return data?.map((d) => d.workshop_sector_id) || [];
}

export async function updateRepairTypeSectors(repairTypeId: string, sectorIds: string[]) {
  const supabase = await supabaseServer();

  // Delete existing
  const { error: deleteError } = await supabase.from('sector_repair_types').delete().eq('repair_type_id', repairTypeId);

  if (deleteError) {
    logger.error('Error deleting sector repair types', { data: { error: deleteError } });
    throw deleteError;
  }

  // Insert new ones
  if (sectorIds.length > 0) {
    const rows = sectorIds.map((sectorId) => ({
      workshop_sector_id: sectorId,
      repair_type_id: repairTypeId,
    }));

    const { error: insertError } = await supabase.from('sector_repair_types').insert(rows);

    if (insertError) {
      logger.error('Error inserting sector repair types', { data: { error: insertError } });
      throw insertError;
    }
  }
}
