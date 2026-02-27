'use server';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const logger = new Logger('features/Empresa/Equipos/actions');

export async function FetchTypeOfVehicles() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    let { data: vehicle_type, error } = await supabase
      .from('type')
      .select('*')
      .eq('company_id', company_id ?? '')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching vehicle types', { data: { error } });
      return [];
    }

    if (vehicle_type) {
      return vehicle_type;
    }
    return [];
  } catch (error) {
    logger.error('Unexpected error in FetchTypeOfVehicles', { data: { error } });
    return [];
  }
}
export type FetchTypeOfVehiclesType = Awaited<ReturnType<typeof FetchTypeOfVehicles>>[number];

export async function createTypeOfVehicle({
  name,
  applies_to = 'vehicle',
  is_active = false,
  is_operative = false,
  is_tractor_unit = false,
  has_hitch = false,
  hitch_type_ids = [],
  checklist_ids = [],
}: {
  name: string;
  applies_to?: 'vehicle' | 'other_equipment';
  is_active?: boolean;
  is_operative?: boolean;
  is_tractor_unit?: boolean;
  has_hitch?: boolean;
  hitch_type_ids?: string[];
  checklist_ids?: string[];
}) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    // Crear el tipo
    const { data: vehicle_type, error } = await supabase
      .from('type')
      .insert({
        name,
        applies_to,
        is_active,
        // is_operative solo aplica a other_equipment
        is_operative: applies_to === 'other_equipment' ? is_operative : false,
        company_id,
        is_tractor_unit,
        has_hitch: is_tractor_unit ? has_hitch : false, // Solo puede tener enganche si es unidad tractora
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating vehicle type', { data: { error } });
      throw error;
    }

    // Si tiene enganche y hay tipos compatibles seleccionados, insertarlos en la tabla pivote
    if (vehicle_type && is_tractor_unit && has_hitch && hitch_type_ids.length > 0) {
      const hitchRelations = hitch_type_ids.map((compatible_type_id) => ({
        type_id: vehicle_type.id,
        compatible_type_id,
      }));

      const { error: hitchError } = await supabase.from('type_hitch_types').insert(hitchRelations);

      if (hitchError) {
        logger.error('Error creating hitch type relations', { data: { hitchError } });
        // No lanzamos error para no afectar la creación del tipo
      }
    }

    // Si hay checklists seleccionados, insertarlos en la tabla pivote
    if (vehicle_type && checklist_ids.length > 0) {
      const checklistRelations = checklist_ids.map((checklistId) => ({
        template_id: checklistId,
        type_id: vehicle_type.id,
      }));

      const { error: checklistError } = await supabase.from('checklist_template_types').insert(checklistRelations);

      if (checklistError) {
        logger.error('Error creating checklist relations', { data: { checklistError } });
        // No lanzamos error para no afectar la creación del tipo
      }
    }

    revalidatePath('/dashboard/company/actualCompany');
    return vehicle_type;
  } catch (error) {
    logger.error('Unexpected error in createTypeOfVehicle', { data: { error } });
    return [];
  }
}

export async function FetchTypeOfVehiclesPagination(options: {
  pageIndex: number;
  pageSize: number;
  sorting: Array<{ id: string; desc: boolean }>;
  columnFilters: Array<{ id: string; value: any }>;
}) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
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
      logger.error('Error fetching vehicle types (pagination)', { data: { error } });
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
    logger.error('Unexpected error in FetchTypeOfVehiclesPagination', { data: { error } });
    return {
      rows: [],
      pageCount: 0,
      rowCount: 0,
      page: pageIndex,
      pageSize,
    };
  }
}
export async function updateTypeOfVehicle({
  id,
  name,
  applies_to,
  is_active,
  is_operative,
  is_tractor_unit,
  has_hitch,
  hitch_type_ids,
  checklist_ids,
}: {
  id: string;
  name: string;
  applies_to?: 'vehicle' | 'other_equipment';
  is_active?: boolean;
  is_operative?: boolean;
  is_tractor_unit?: boolean;
  has_hitch?: boolean;
  hitch_type_ids?: string[];
  checklist_ids?: string[];
}) {
  const supabase = await supabaseServer();
  try {
    // Preparamos los datos a actualizar
    const updateData: {
      name: string;
      applies_to?: string;
      is_active?: boolean;
      is_operative?: boolean;
      is_tractor_unit?: boolean;
      has_hitch?: boolean;
    } = { name };

    // Solo incluimos campos si se proporcionan explícitamente
    if (applies_to !== undefined) {
      updateData.applies_to = applies_to;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }
    if (is_operative !== undefined) {
      // is_operative solo aplica a other_equipment; si aplica a vehicle, forzar false
      updateData.is_operative = applies_to === 'vehicle' ? false : is_operative;
    }
    if (is_tractor_unit !== undefined) {
      updateData.is_tractor_unit = is_tractor_unit;
    }
    if (has_hitch !== undefined) {
      // Solo puede tener enganche si es unidad tractora
      updateData.has_hitch = is_tractor_unit ? has_hitch : false;
    }

    // Primero verificamos si el registro existe
    const { data: existing, error: findError } = await supabase.from('type').select('*').eq('id', id).single();

    if (findError || !existing) {
      logger.error('Error: El tipo de vehículo no existe', { data: { id } });
      throw new Error('El tipo de vehículo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('type').update(updateData).eq('id', id);

    if (updateError) {
      logger.error('Error en la actualización de tipo de vehículo', { data: { updateError } });
      throw updateError;
    }

    // Actualizar las relaciones de tipos de enganche si se proporcionan
    if (hitch_type_ids !== undefined) {
      // Primero eliminamos las relaciones existentes
      const { error: deleteError } = await supabase.from('type_hitch_types').delete().eq('type_id', id);

      if (deleteError) {
        logger.error('Error eliminando relaciones de enganche', { data: { deleteError } });
      }

      // Si tiene enganche y hay tipos compatibles, insertamos las nuevas relaciones
      if (is_tractor_unit && has_hitch && hitch_type_ids.length > 0) {
        const hitchRelations = hitch_type_ids.map((compatible_type_id) => ({
          type_id: id,
          compatible_type_id,
        }));

        const { error: insertError } = await supabase.from('type_hitch_types').insert(hitchRelations);

        if (insertError) {
          logger.error('Error insertando relaciones de enganche', { data: { insertError } });
        }
      }
    }

    // Actualizar las relaciones de checklists si se proporcionan
    if (checklist_ids !== undefined) {
      // Primero eliminamos las relaciones existentes
      const { error: deleteChecklistError } = await supabase
        .from('checklist_template_types')
        .delete()
        .eq('type_id', id);

      if (deleteChecklistError) {
        logger.error('Error eliminando relaciones de checklists', { data: { deleteChecklistError } });
      }

      // Si hay checklists, insertamos las nuevas relaciones
      if (checklist_ids.length > 0) {
        const checklistRelations = checklist_ids.map((checklistId) => ({
          template_id: checklistId,
          type_id: id,
        }));

        const { error: insertChecklistError } = await supabase
          .from('checklist_template_types')
          .insert(checklistRelations);

        if (insertChecklistError) {
          logger.error('Error insertando relaciones de checklists', { data: { insertChecklistError } });
        }
      }
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase.from('type').select('*').eq('id', id).single();

    if (fetchError || !updated) {
      logger.error('Error obteniendo el registro actualizado', { data: { fetchError } });
      throw new Error('No se pudo verificar la actualización');
    }
    revalidatePath('/dashboard/company/actualCompany');
    return updated;
  } catch (error) {
    logger.error('Error en updateTypeOfVehicle', { data: { error } });
    throw error;
  }
}

export async function FetchBrandOfVehicles() {
  const supabase = await supabaseServer();

  try {
    let { data: vehicle_type, error } = await supabase
      .from('brand_vehicles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching brand of vehicle', { data: { error } });
      return [];
    }

    return vehicle_type;
  } catch (error) {
    logger.error('Unexpected error in FetchBrandOfVehicles', { data: { error } });
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
  const supabase = await supabaseServer();
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
      logger.error('Error fetching brand of vehicles (pagination)', { data: { error } });
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
    logger.error('Unexpected error in FetchBrandOfVehiclesPagination', { data: { error } });
    return {
      rows: [],
      pageCount: 0,
      rowCount: 0,
    };
  }
}
export async function createBrandOfVehicle({ name, is_active = false }: { name: string; is_active?: boolean }) {
  const supabase = await supabaseServer();

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
      logger.error('Error creating brand of vehicle', { data: { error } });
      throw error;
    }

    return brand_of_vehicle;
  } catch (error) {
    logger.error('Unexpected error in createBrandOfVehicle', { data: { error } });
    return [];
  }
}
export async function updateBrandOfVehicle({ id, name, is_active }: { id: number; name: string; is_active?: boolean }) {
  const supabase = await supabaseServer();

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
      logger.error('Error: La marca de vehiculo no existe', { data: { id } });
      throw new Error('La marca de vehiculo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('brand_vehicles').update(updateData).eq('id', id);

    if (updateError) {
      logger.error('Error en la actualización de marca de vehiculo', { data: { updateError } });
      throw updateError;
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase
      .from('brand_vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !updated) {
      logger.error('Error obteniendo el registro actualizado de marca', { data: { fetchError } });
      throw new Error('No se pudo verificar la actualización');
    }

    return updated;
  } catch (error) {
    logger.error('Error en updateBrandOfVehicle', { data: { error } });
    throw error;
  }
}

export async function FetchModelOfVehicles() {
  const supabase = await supabaseServer();

  try {
    let { data: model_of_vehicle, error } = await supabase
      .from('model_vehicles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching model of vehicle', { data: { error } });
      return [];
    }

    return model_of_vehicle;
  } catch (error) {
    logger.error('Unexpected error in FetchModelOfVehicles', { data: { error } });
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
  const supabase = await supabaseServer();

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
      logger.error('Error fetching vehicle models (pagination)', { data: { error } });
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
    logger.error('Unexpected error in FetchModelOfVehiclesPagination', { data: { error } });
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
  const supabase = await supabaseServer();
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
      logger.error('Error creating model of vehicle', { data: { error } });
      throw error;
    }

    return model_of_vehicle;
  } catch (error) {
    logger.error('Unexpected error in createModelOfVehicle', { data: { error } });
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
  const supabase = await supabaseServer();

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
      logger.error('Error: El modelo de vehiculo no existe', { data: { id } });
      throw new Error('El modelo de vehiculo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('model_vehicles').update(updateData).eq('id', id);

    if (updateError) {
      logger.error('Error en la actualización de modelo de vehiculo', { data: { updateError } });
      throw updateError;
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase
      .from('model_vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !updated) {
      logger.error('Error obteniendo el registro actualizado de modelo', { data: { fetchError } });
      throw new Error('No se pudo verificar la actualización');
    }

    return updated;
  } catch (error) {
    logger.error('Error en updateModelOfVehicle', { data: { error } });
    throw error;
  }
}

export async function FetchSubTypeOfVehicles() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    let { data: vehicle_type, error } = await supabase
      .from('sub_type')
      .select('*')
      .eq('company_id', company_id ?? '')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching sub types of vehicles', { data: { error } });
      return [];
    }

    return vehicle_type;
  } catch (error) {
    logger.error('Unexpected error in FetchSubTypeOfVehicles', { data: { error } });
    return [];
  }
}

export async function createSubTypeOfVehicle({
  name,
  is_active = false,
  type_id,
  compatible_item_ids = [],
  checklist_ids = [],
}: {
  name: string;
  is_active?: boolean;
  type_id: string;
  compatible_item_ids?: { id: string; type: 'sub_type' | 'type' }[];
  checklist_ids?: string[];
}) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;
  try {
    const { data: vehicle_type, error } = await supabase
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
      logger.error('Error creating vehicle subtype', { data: { error } });
      throw error;
    }

    // Si hay items compatibles seleccionados, insertarlos en la tabla pivote
    if (vehicle_type && compatible_item_ids.length > 0) {
      const compatibleRelations = compatible_item_ids.map((item) => ({
        sub_type_id: vehicle_type.id,
        compatible_item_id: item.id,
        item_type: item.type,
      }));

      const { error: compatibleError } = await supabase.from('sub_type_compatible_items').insert(compatibleRelations);

      if (compatibleError) {
        logger.error('Error creating compatible item relations', { data: { compatibleError } });
        // No lanzamos error para no afectar la creación del subtipo
      }
    }

    // Si hay checklists seleccionados, insertarlos en la tabla pivote
    if (vehicle_type && checklist_ids.length > 0) {
      const checklistRelations = checklist_ids.map((checklistId) => ({
        template_id: checklistId,
        sub_type_id: vehicle_type.id,
      }));

      const { error: checklistError } = await supabase.from('checklist_template_sub_types').insert(checklistRelations);

      if (checklistError) {
        logger.error('Error creating checklist relations for subtype', { data: { checklistError } });
        // No lanzamos error para no afectar la creación del subtipo
      }
    }

    revalidatePath('/dashboard/company/actualCompany');
    return vehicle_type;
  } catch (error) {
    logger.error('Unexpected error in createSubTypeOfVehicle', { data: { error } });
    return [];
  }
}

export async function updateSubTypeOfVehicle({
  id,
  name,
  type_id,
  is_active,
  compatible_item_ids,
  checklist_ids,
}: {
  id: string;
  name: string;
  type_id: string;
  is_active?: boolean;
  compatible_item_ids?: { id: string; type: 'sub_type' | 'type' }[];
  checklist_ids?: string[];
}) {
  const supabase = await supabaseServer();

  try {
    // Preparamos los datos a actualizar
    const updateData: { name: string; is_active?: boolean; type: string } = { name, is_active, type: type_id };

    // Primero verificamos si el registro existe
    const { data: existing, error: findError } = await supabase.from('sub_type').select('*').eq('id', id).single();

    if (findError || !existing) {
      logger.error('Error: El subtipo de vehículo no existe', { data: { id } });
      throw new Error('El subtipo de vehículo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('sub_type').update(updateData).eq('id', id);

    if (updateError) {
      logger.error('Error en la actualización de subtipo de vehículo', { data: { updateError } });
      throw updateError;
    }

    // Actualizar las relaciones de items compatibles si se proporcionan
    if (compatible_item_ids !== undefined) {
      // Primero eliminamos las relaciones existentes
      const { error: deleteError } = await supabase.from('sub_type_compatible_items').delete().eq('sub_type_id', id);

      if (deleteError) {
        logger.error('Error eliminando relaciones de items compatibles', { data: { deleteError } });
      }

      // Si hay items compatibles, insertamos las nuevas relaciones
      if (compatible_item_ids.length > 0) {
        const compatibleRelations = compatible_item_ids.map((item) => ({
          sub_type_id: id,
          compatible_item_id: item.id,
          item_type: item.type,
        }));

        const { error: insertError } = await supabase.from('sub_type_compatible_items').insert(compatibleRelations);

        if (insertError) {
          logger.error('Error insertando relaciones de items compatibles', { data: { insertError } });
        }
      }
    }

    // Actualizar las relaciones de checklists si se proporcionan
    if (checklist_ids !== undefined) {
      // Primero eliminamos las relaciones existentes
      const { error: deleteChecklistError } = await supabase
        .from('checklist_template_sub_types')
        .delete()
        .eq('sub_type_id', id);

      if (deleteChecklistError) {
        logger.error('Error eliminando relaciones de checklists de subtipo', { data: { deleteChecklistError } });
      }

      // Si hay checklists, insertamos las nuevas relaciones
      if (checklist_ids.length > 0) {
        const checklistRelations = checklist_ids.map((checklistId) => ({
          template_id: checklistId,
          sub_type_id: id,
        }));

        const { error: insertChecklistError } = await supabase
          .from('checklist_template_sub_types')
          .insert(checklistRelations);

        if (insertChecklistError) {
          logger.error('Error insertando relaciones de checklists de subtipo', { data: { insertChecklistError } });
        }
      }
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase.from('sub_type').select('*').eq('id', id).single();

    if (fetchError || !updated) {
      logger.error('Error obteniendo el registro actualizado de subtipo', { data: { fetchError } });
      throw new Error('No se pudo verificar la actualización');
    }

    revalidatePath('/dashboard/company/actualCompany');
    return updated;
  } catch (error) {
    logger.error('Error en updateSubTypeOfVehicle', { data: { error } });
    throw error;
  }
}

// Obtener tipos de enganche compatibles para un tipo específico
export async function getHitchTypesForType(typeId: string) {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase
      .from('type_hitch_types')
      .select(
        `
        id,
        compatible_type_id,
        type:compatible_type_id (
          id,
          name,
          is_active
        )
      `
      )
      .eq('type_id', typeId);

    if (error) {
      logger.error('Error fetching hitch types for type', { data: { error } });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getHitchTypesForType', { data: { error } });
    return [];
  }
}

// Obtener tipos que NO son unidad tractora (para seleccionar como tipos de enganche)
export async function getNonTractorTypes() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  try {
    const { data, error } = await supabase
      .from('type')
      .select('*')
      .eq('company_id', company_id ?? '')
      .eq('is_tractor_unit', false)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching non-tractor types', { data: { error } });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getNonTractorTypes', { data: { error } });
    return [];
  }
}

// Obtener items compatibles para un subtipo específico
export async function getCompatibleItemsForSubType(subTypeId: string) {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase.from('sub_type_compatible_items').select('*').eq('sub_type_id', subTypeId);

    if (error) {
      logger.error('Error fetching compatible items for subtype', { data: { error } });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getCompatibleItemsForSubType', { data: { error } });
    return [];
  }
}

// Obtener subtipos y tipos disponibles para selección en un subtipo
// basado en los tipos de enganche del tipo padre
export async function getAvailableCompatibleItems(parentTypeId: string) {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  try {
    // Primero obtenemos el tipo padre para verificar si tiene enganche
    const { data: parentType, error: parentError } = await supabase
      .from('type')
      .select('*')
      .eq('id', parentTypeId)
      .eq('company_id', company_id ?? '')
      .single();

    if (parentError || !parentType) {
      logger.error('Error fetching parent type for compatible items', { data: { parentError } });
      return { subTypes: [], types: [] };
    }

    // Si no es unidad tractora o no tiene enganche, no hay items disponibles
    if (!parentType.is_tractor_unit || !parentType.has_hitch) {
      return { subTypes: [], types: [] };
    }

    // Obtener los tipos compatibles para enganche (consulta separada para evitar ambigüedad)
    const { data: hitchTypes, error: hitchError } = await supabase
      .from('type_hitch_types')
      .select('compatible_type_id')
      .eq('type_id', parentTypeId);

    if (hitchError) {
      logger.error('Error fetching hitch types for compatible items', { data: { hitchError } });
      return { subTypes: [], types: [] };
    }

    const compatibleTypeIds = hitchTypes?.map((ht) => ht.compatible_type_id) || [];

    if (compatibleTypeIds.length === 0) {
      return { subTypes: [], types: [] };
    }

    // Obtener subtipos de los tipos compatibles (filtrando por company_id)
    const { data: subTypes, error: subTypesError } = await supabase
      .from('sub_type')
      .select('*')
      .in('type', compatibleTypeIds)
      .eq('company_id', company_id ?? '')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (subTypesError) {
      logger.error('Error fetching sub types for compatible items', { data: { subTypesError } });
    }

    // Obtener los tipos que no tienen subtipos (para mostrarlos como opción)
    const typesWithSubTypes = [...new Set((subTypes || []).map((st) => st.type))];
    const typesWithoutSubTypes = compatibleTypeIds.filter((id: string) => !typesWithSubTypes.includes(id));

    type TypeRow = Awaited<ReturnType<typeof FetchTypeOfVehicles>>[number];
    let types: TypeRow[] = [];
    if (typesWithoutSubTypes.length > 0) {
      const { data: typesData, error: typesError } = await supabase
        .from('type')
        .select('*')
        .in('id', typesWithoutSubTypes)
        .eq('company_id', company_id ?? '')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (typesError) {
        logger.error('Error fetching types without subtypes', { data: { typesError } });
      } else {
        types = typesData || [];
      }
    }

    return {
      subTypes: subTypes || [],
      types: types || [],
    };
  } catch (error) {
    logger.error('Unexpected error in getAvailableCompatibleItems', { data: { error } });
    return { subTypes: [], types: [] };
  }
}

// Obtener checklists activos de la empresa
export async function getActiveChecklists() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  try {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('id, name, code, description')
      .eq('company_id', company_id ?? '')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching active checklists', { data: { error } });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getActiveChecklists', { data: { error } });
    return [];
  }
}

// Obtener checklists asignados a un subtipo
export async function getChecklistsForSubType(subTypeId: string) {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase
      .from('checklist_template_sub_types')
      .select('template_id')
      .eq('sub_type_id', subTypeId);

    if (error) {
      logger.error('Error fetching checklists for subtype', { data: { error } });
      return [];
    }

    return (data || []).map((item) => item.template_id);
  } catch (error) {
    logger.error('Unexpected error in getChecklistsForSubType', { data: { error } });
    return [];
  }
}
