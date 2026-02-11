'use server';

import { Filter, queryWithPagination } from '@/app/server/GET/probando';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';
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
    return [];
  }

  try {
    const { data: types_of_repairs, error } = await supabase.from('types_of_repairs').insert(body).select();

    if (error) {
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    return [];
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

export async function fetchAllRepairSolicitudesData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'repair_solicitudes'>[];
  server?: boolean;
}) {
  const result = await queryWithPagination(
    'repair_solicitudes',
    '*,user_id(*),employees(*),vehicles(*,type(*),sub_type(*),brand_vehicles(*),model_vehicles(*)),types_of_repairs(*),repairlogs(*,modified_by_employee(*),modified_by_user(*))',
    {
      pageIndex: 0,
      pageSize: 10000, // Límite alto para obtener todos los datos
      sorting: [...options.sorting, { id: 'created_at', desc: true }],
      columnFilters: options.columnFilters,
      filters: options.filters,
      server: options.server ?? false,
    }
  );

  return result;
}

// Función específica para empleados (ejemplo)
export async function fetchRepairSolicitudes(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'repair_solicitudes'>[];
}) {
  const data = await queryWithPagination(
    'repair_solicitudes',
    '*,user_id(*),employees(*),vehicles(*,type(*),sub_type(*),brand_vehicles(*),model_vehicles(*)),types_of_repairs(*),repairlogs(*,modified_by_employee(*),modified_by_user(*))',
    {
      ...options,
      sorting: [...options.sorting, { id: 'created_at', desc: true }],
      columnFilters: [...options.columnFilters],
      filters: options.filters,
      server: true,
    }
  );
  return data;
}

export async function fetchAllRepairSolicitudes() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    let { data, error } = await supabase
      .from('repair_solicitudes')
      .select(
        '*,user_id(*),employees(*),vehicles(*,type(*),subType(*),brand_vehicles(*),model_vehicles(*)),types_of_repairs(*),repairlogs(*,modified_by_employee(*),modified_by_user(*))'
      )
      .not('equipment_id', 'is', null);

    if (error) {
      return [];
    }
    return data || [];
  } catch (error) {
    return [];
  }
}

type RepairSolicitudInsert = Database['public']['Tables']['repair_solicitudes']['Insert'];

export async function createRepairSolicitud(data: RepairSolicitudInsert | RepairSolicitudInsert[]) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    // Type assertion needed since Supabase accepts both single and array
    const { data: repair_solicitudes, error } = await supabase
      .from('repair_solicitudes')
      .insert(data as RepairSolicitudInsert)
      .select();

    if (error) {
      return [];
    }
    return repair_solicitudes || [];
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
