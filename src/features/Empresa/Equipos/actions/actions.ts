'use server';
import { supabaseServer } from '@/lib/supabase/server';

export async function FetchTypeOfVehicles() {
  const supabase = supabaseServer();

  try {
    let { data: vehicle_type, error } = await supabase.from('types_of_vehicles').select('*');

    if (error) {
      console.error('Error fetching vehicle types:', error);
      return [];
    }

    return vehicle_type;
  } catch (error) {
    console.log(error);
    return [];
  }
}
export async function createTypeOfVehicle({ name, is_active = false }: { name: string; is_active?: boolean }) {
  const supabase = supabaseServer();
  try {
    let { data: vehicle_type, error } = await supabase
      .from('types_of_vehicles')
      .insert({
        name,
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle type:', error);
      throw error;
    }

    return vehicle_type;
  } catch (error) {
    console.log(error);
    return [];
  }
}
export async function updateTypeOfVehicle({ id, name, is_active }: { id: number; name: string; is_active?: boolean }) {
  const supabase = supabaseServer();
  console.log('Datos recibidos para actualizar:', { id, name, is_active });

  try {
    // Preparamos los datos a actualizar
    const updateData: { name: string; is_active?: boolean } = { name };

    // Solo incluimos is_active si se proporciona explícitamente
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    console.log('Datos que se enviarán a la actualización:', updateData);

    // Primero verificamos si el registro existe
    const { data: existing, error: findError } = await supabase
      .from('types_of_vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      console.error('Error: El tipo de vehículo no existe', { id });
      throw new Error('El tipo de vehículo no existe');
    }

    // Realizamos la actualización sin esperar datos de retorno
    const { error: updateError } = await supabase.from('types_of_vehicles').update(updateData).eq('id', id);

    if (updateError) {
      console.error('Error en la actualización:', updateError);
      throw updateError;
    }

    // Obtenemos el registro actualizado
    const { data: updated, error: fetchError } = await supabase
      .from('types_of_vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !updated) {
      console.error('Error obteniendo el registro actualizado:', fetchError);
      throw new Error('No se pudo verificar la actualización');
    }

    console.log('Tipo de vehículo actualizado exitosamente:', updated);
    return updated;
  } catch (error) {
    console.error('Error en updateTypeOfVehicle:', error);
    throw error;
  }
}

export async function FetchBrandOfVehicles() {
  const supabase = supabaseServer();

  try {
    let { data: vehicle_type, error } = await supabase.from('brand_vehicles').select('*');

    if (error) {
      console.error('Error fetching brand of vehicle:', error);
      return [];
    }

    return vehicle_type;
  } catch (error) {
    console.log(error);
    return [];
  }
}
export async function createBrandOfVehicle({ name, is_active = false }: { name: string; is_active?: boolean }) {
  const supabase = supabaseServer();
  console.log('Datos recibidos para crear:', { name, is_active });
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
    console.log(error);
    return [];
  }
}
export async function updateBrandOfVehicle({ id, name, is_active }: { id: number; name: string; is_active?: boolean }) {
  const supabase = supabaseServer();
  console.log('Datos recibidos para actualizar:', { id, name, is_active });

  try {
    // Preparamos los datos a actualizar
    const updateData: { name: string; is_active?: boolean } = { name };

    // Solo incluimos is_active si se proporciona explícitamente
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    console.log('Datos que se enviarán a la actualización:', updateData);

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
    let { data: model_of_vehicle, error } = await supabase.from('model_vehicles').select('*');

    if (error) {
      console.error('Error fetching model of vehicle:', error);
      return [];
    }

    return model_of_vehicle;
  } catch (error) {
    console.log(error);
    return [];
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
  console.log('Datos recibidos para crear:', { name, is_active });
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
    console.log(error);
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
  console.log('Datos recibidos para actualizar:', { id, name, is_active, brand });

  try {
    // Preparamos los datos a actualizar
    const updateData: { name: string; is_active?: boolean; brand?: number } = { name, brand, is_active };

    // Solo incluimos is_active si se proporciona explícitamente
    // if (is_active !== undefined) {
    //     updateData.is_active = is_active;
    // }

    console.log('Datos que se enviarán a la actualización:', updateData);

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
