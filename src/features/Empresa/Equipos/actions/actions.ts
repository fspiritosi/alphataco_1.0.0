'use server';
import { supabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function FetchTypeOfVehicles() {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    let { data: vehicle_type, error } = await supabase
      .from('type')
      .select('*')
      .eq('company_id', company_id ?? '')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching vehicle types:', error);
      return [];
    }

    if (vehicle_type) {
      return vehicle_type;
    }
    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
}
export type FetchTypeOfVehiclesType = Awaited<ReturnType<typeof FetchTypeOfVehicles>>[number];

export async function createTypeOfVehicle({ name, is_active = false }: { name: string; is_active?: boolean }) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    let { data: vehicle_type, error } = await supabase
      .from('type')
      .insert({
        name,
        is_active,
        company_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle type:', error);
      throw error;
    }

    return vehicle_type;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function FetchTypeOfVehiclesPagination(options: {
  pageIndex: number;
  pageSize: number;
  sorting: Array<{ id: string; desc: boolean }>;
  columnFilters: Array<{ id: string; value: any }>;
}) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  const { pageIndex, pageSize, sorting, columnFilters } = options;

  try {
    let query = supabase
      .from('type')
      .select('*', { count: 'exact' })
      .eq('company_id', company_id ?? '');

    // Mapeo de nombres de columnas
    const columnMap: Record<string, string> = {
      Nombre: 'name',
      Estado: 'is_active',
    };

    // Aplicar filtros
    columnFilters.forEach((filter) => {
      if (filter.value) {
        const columnName = columnMap[filter.id] || filter.id;
        if (columnName === 'is_active') {
          query = query.eq(columnName, filter.value === 'true');
        } else {
          query = query.ilike(columnName, `%${filter.value}%`);
        }
      }
    });

    // Aplicar ordenamiento
    if (sorting.length > 0) {
      sorting.forEach((sort) => {
        const sortColumn = columnMap[sort.id] || sort.id;
        query = query.order(sortColumn, { ascending: !sort.desc });
      });
    } else {
      query = query.order('name', { ascending: true });
    }

    // Aplicar paginación
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching vehicle types:', error);
      throw error;
    }

    return {
      rows: data || [],
      pageCount: Math.ceil((count || 0) / pageSize),
      rowCount: count || 0,
      page: pageIndex,
      pageSize,
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      rows: [],
      pageCount: 0,
      rowCount: 0,
      page: pageIndex,
      pageSize,
    };
  }
}
export async function updateTypeOfVehicle({ id, name, is_active }: { id: string; name: string; is_active?: boolean }) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    // Preparamos los datos a actualizar
    const updateData: { name: string; is_active?: boolean } = { name };

    // Solo incluimos is_active si se proporciona explícitamente
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    // Primero verificamos si el registro existe
    const { data: existing, error: findError } = await supabase.from('type').select('*').eq('id', id).single();

    if (findError || !existing) {
      console.error('Error: El tipo de vehículo no existe', { id });
      throw new Error('El tipo de vehículo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('type').update(updateData).eq('id', id);

    if (updateError) {
      console.error('Error en la actualización:', updateError);
      throw updateError;
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase.from('type').select('*').eq('id', id).single();

    if (fetchError || !updated) {
      console.error('Error obteniendo el registro actualizado:', fetchError);
      throw new Error('No se pudo verificar la actualización');
    }
    revalidatePath('/dashboard/company/actualCompany');
    return updated;
  } catch (error) {
    console.error('Error en updateTypeOfVehicle:', error);
    throw error;
  }
}

export async function FetchBrandOfVehicles() {
  const supabase = supabaseServer();

  try {
    let { data: vehicle_type, error } = await supabase
      .from('brand_vehicles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching brand of vehicle:', error);
      return [];
    }

    return vehicle_type;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function FetchBrandOfVehiclesPagination({
  pageIndex = 0,
  pageSize = 10,
  sorting = [],
  columnFilters = [],
}: {
  pageIndex?: number;
  pageSize?: number;
  sorting?: { id: string; desc: boolean }[];
  columnFilters?: { id: string; value: any }[];
}) {
  const supabase = supabaseServer();
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  try {
    // Construir la consulta base
    let query = supabase.from('brand_vehicles').select('*', { count: 'exact' }).order('name', { ascending: true });

    // Aplicar filtros
    columnFilters.forEach((filter) => {
      if (filter.value) {
        if (Array.isArray(filter.value)) {
          query = query.in(filter.id, filter.value);
        } else {
          query = query.eq(filter.id, filter.value);
        }
      }
    });

    // Aplicar ordenamiento
    if (sorting.length > 0) {
      sorting.forEach((sort) => {
        query = query.order(sort.id, { ascending: !sort.desc });
      });
    }

    // Aplicar paginación
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching brand of vehicles:', error);
      return {
        rows: [],
        pageCount: 0,
        rowCount: 0,
      };
    }

    return {
      rows: data || [],
      pageCount: Math.ceil((count || 0) / pageSize),
      rowCount: count || 0,
    };
  } catch (error) {
    console.error('Error in FetchBrandOfVehiclesPagination:', error);
    return {
      rows: [],
      pageCount: 0,
      rowCount: 0,
    };
  }
}
export async function createBrandOfVehicle({ name, is_active = false }: { name: string; is_active?: boolean }) {
  const supabase = supabaseServer();

  try {
    let { data: brand_of_vehicle, error } = await supabase
      .from('brand_vehicles')
      .insert({
        name,
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating brand of vehicle:', error);
      throw error;
    }

    return brand_of_vehicle;
  } catch (error) {
    console.error(error);
    return [];
  }
}
export async function updateBrandOfVehicle({ id, name, is_active }: { id: number; name: string; is_active?: boolean }) {
  const supabase = supabaseServer();

  try {
    // Preparamos los datos a actualizar
    const updateData: { name: string; is_active?: boolean } = { name };

    // Solo incluimos is_active si se proporciona explícitamente
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    // Primero verificamos si el registro existe
    const { data: existing, error: findError } = await supabase
      .from('brand_vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      console.error('Error: La marca de vehiculo no existe', { id });
      throw new Error('La marca de vehiculo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('brand_vehicles').update(updateData).eq('id', id);

    if (updateError) {
      console.error('Error en la actualización:', updateError);
      throw updateError;
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase
      .from('brand_vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !updated) {
      console.error('Error obteniendo el registro actualizado:', fetchError);
      throw new Error('No se pudo verificar la actualización');
    }

    return updated;
  } catch (error) {
    console.error('Error en updateBrandOfVehicle:', error);
    throw error;
  }
}

export async function FetchModelOfVehicles() {
  const supabase = supabaseServer();

  try {
    let { data: model_of_vehicle, error } = await supabase
      .from('model_vehicles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching model of vehicle:', error);
      return [];
    }

    return model_of_vehicle;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function FetchModelOfVehiclesPagination({
  pageIndex = 0,
  pageSize = 10,
  sorting = [],
  columnFilters = [],
}: {
  pageIndex?: number;
  pageSize?: number;
  sorting?: { id: string; desc: boolean }[];
  columnFilters?: { id: string; value: any }[];
}) {
  const supabase = supabaseServer();

  try {
    // Construir la consulta base
    let query = supabase.from('model_vehicles').select(
      `
          *,
          brand_vehicles (
            id,
            name
          )
        `,
      { count: 'exact' }
    );

    // Aplicar filtros
    columnFilters.forEach((filter) => {
      if (!filter.value) return;

      if (filter.id === 'brand') {
        // Convert single value to array for consistent handling
        const brandIds = Array.isArray(filter.value) ? filter.value : [filter.value];
        query = query.in('brand', brandIds);
      } else if (filter.id === 'name' && typeof filter.value === 'string') {
        query = query.ilike('name', `%${filter.value}%`);
      } else if (Array.isArray(filter.value)) {
        query = query.in(filter.id, filter.value);
      } else {
        query = query.eq(filter.id, filter.value);
      }
    });

    // Aplicar ordenamiento
    if (sorting.length > 0) {
      // First, apply any filters
      const sort = sorting[0]; // For now, handle single sort

      if (sort.id === 'brand') {
        // For brand sorting, we'll sort by brand name in the application code
        // since Supabase's order with foreign tables can be tricky
      } else {
        // For non-brand columns, use regular sorting
        query = query.order(sort.id, {
          ascending: !sort.desc,
          nullsFirst: true,
        });
      }
    } else {
      // Default sorting
      query = query.order('name', { ascending: true, nullsFirst: true });
    }

    // Aplicar paginación
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    let { data, error, count } = await query;

    if (error) {
      console.error('Error fetching vehicle models:', error);
      return {
        rows: [],
        pageCount: 0,
        rowCount: 0,
      };
    }

    // Mapear los datos para incluir el nombre de la marca
    let rows = (data || []).map((model) => ({
      id: model.id.toString(),
      name: model.name || '',
      brand: model.brand,
      brand_name: model.brand_vehicles?.name || 'Sin marca',
      is_active: model.is_active ?? true,
      created_at: model.created_at || new Date().toISOString(),
    }));

    // Apply brand name sorting in application code if needed
    if (sorting.length > 0 && sorting[0].id === 'brand') {
      const sort = sorting[0];
      rows = [...rows].sort((a, b) => {
        const nameA = a.brand_name.toLowerCase();
        const nameB = b.brand_name.toLowerCase();
        return sort.desc ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      });
    }

    return {
      rows,
      pageCount: Math.ceil((count || 0) / pageSize),
      rowCount: count || 0,
    };
  } catch (error) {
    console.error('Error in FetchModelOfVehiclesPagination:', error);
    return {
      rows: [],
      pageCount: 0,
      rowCount: 0,
    };
  }
}

export async function createModelOfVehicle({
  name,
  brand,
  is_active = false,
}: {
  name: string;
  brand: number;
  is_active?: boolean;
}) {
  const supabase = supabaseServer();
  try {
    let { data: model_of_vehicle, error } = await supabase
      .from('model_vehicles')
      .insert({
        brand,
        name,
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating model of vehicle:', error);
      throw error;
    }

    return model_of_vehicle;
  } catch (error) {
    console.error(error);
    return [];
  }
}
export async function updateModelOfVehicle({
  id,
  name,
  brand,
  is_active,
}: {
  id: number;
  name: string;
  brand: number;
  is_active?: boolean;
}) {
  const supabase = supabaseServer();

  try {
    // Preparamos los datos a actualizar
    const updateData: { name: string; is_active?: boolean; brand?: number } = { name, brand, is_active };

    // Solo incluimos is_active si se proporciona explícitamente
    // if (is_active !== undefined) {
    //     updateData.is_active = is_active;
    // }

    // Primero verificamos si el registro existe
    const { data: existing, error: findError } = await supabase
      .from('model_vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      console.error('Error: El modelo de vehiculo no existe', { id });
      throw new Error('El modelo de vehiculo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('model_vehicles').update(updateData).eq('id', id);

    if (updateError) {
      console.error('Error en la actualización:', updateError);
      throw updateError;
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase
      .from('model_vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !updated) {
      console.error('Error obteniendo el registro actualizado:', fetchError);
      throw new Error('No se pudo verificar la actualización');
    }

    return updated;
  } catch (error) {
    console.error('Error en updateModelOfVehicle:', error);
    throw error;
  }
}

export async function FetchSubTypeOfVehicles() {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    let { data: vehicle_type, error } = await supabase
      .from('sub_type')
      .select('*')
      .eq('company_id', company_id ?? '')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching vehicle types:', error);
      return [];
    }

    return vehicle_type;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createSubTypeOfVehicle({
  name,
  is_active = false,
  type_id,
}: {
  name: string;
  is_active?: boolean;
  type_id: string;
}) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    let { data: vehicle_type, error } = await supabase
      .from('sub_type')
      .insert({
        name,
        is_active,
        company_id,
        type: type_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle type:', error);
      throw error;
    }

    return vehicle_type;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function updateSubTypeOfVehicle({
  id,
  name,
  type_id,
  is_active,
}: {
  id: string;
  name: string;
  type_id: string;
  is_active?: boolean;
}) {
  const supabase = supabaseServer();

  try {
    // Preparamos los datos a actualizar
    const updateData: { name: string; is_active?: boolean; type: string } = { name, is_active, type: type_id };

    // Primero verificamos si el registro existe
    const { data: existing, error: findError } = await supabase.from('sub_type').select('*').eq('id', id).single();

    if (findError || !existing) {
      console.error('Error: El subtipo de vehículo no existe', { id });
      throw new Error('El subtipo de vehículo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('sub_type').update(updateData).eq('id', id);

    if (updateError) {
      console.error('Error en la actualización:', updateError);
      throw updateError;
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase.from('sub_type').select('*').eq('id', id).single();

    if (fetchError || !updated) {
      console.error('Error obteniendo el registro actualizado:', fetchError);
      throw new Error('No se pudo verificar la actualización');
    }

    return updated;
  } catch (error) {
    console.error('Error en updateTypeOfVehicle:', error);
    throw error;
  }
}
