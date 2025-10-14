'use server';

import { Filter, queryWithPagination } from '@/app/server/GET/probando';
import { supabaseServer } from '@/lib/supabase/server';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { cookies } from 'next/headers';

export async function fetchAllTypesOfRepairs() {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    let { data: types_of_repairs, error } = await supabase.from('types_of_repairs').select('*');
    // .eq('company_id', company_id || '');

    if (error) {
      console.error(error);
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    return [];
  }
}

export async function createTypeOfRepair(body: any) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
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

export async function updateTypeOfRepair(body: any, id: string) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
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
  const supabase = supabaseServer();
  const cookieStore = cookies();
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
      server: false,
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
  const supabase = supabaseServer();
  const cookieStore = cookies();
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

export async function createRepairSolicitud(data: any) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    const { data: repair_solicitudes, error } = await supabase.from('repair_solicitudes').insert(data).select();

    if (error) {
      return [];
    }
    return repair_solicitudes || [];
  } catch (error) {
    return [];
  }
}
