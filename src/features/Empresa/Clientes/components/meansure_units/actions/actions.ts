'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Definir el tipo de la unidad de medida según la estructura de la tabla
export type MeasureUnit = {
  id: string;
  simbol: string;
  tipo: string;
  unit: string;
  created_at?: string;
  updated_at?: string;
  company_id?: string;
};

// Schema para validación
const measureUnitSchema = z.object({
  simbol: z.string().min(1, { message: 'El símbolo es requerido' }).max(5, 'Máximo 5 caracteres'),
  tipo: z.string().min(1, { message: 'El tipo es requerido' }),
  unit: z.string().min(1, { message: 'La unidad es requerida' }),
});

/**
 * Obtiene todas las unidades de medida
 */
export async function fetchMeasureUnits() {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value || '';

  if (!actualCompany) {
    return [];
  }

  try {
    // Asumiendo que hay un campo company_id para filtrar por empresa
    const { data, error } = await supabase.from('measure_units').select('*').order('unit', { ascending: true });

    if (error) {
      console.error('Error al obtener unidades de medida:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error inesperado al obtener unidades de medida:', error);
    return [];
  }
}

/**
 * Crea una nueva unidad de medida
 */
export async function createMeasureUnit(values: z.infer<typeof measureUnitSchema>) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value || '';

  try {
    // Validar datos con Zod
    measureUnitSchema.parse(values);

    // Verificar si ya existe una unidad con el mismo símbolo
    const { data: existingUnit, error: checkError } = await supabase
      .from('measure_units')
      .select('id')
      .eq('simbol', values.simbol)
      .maybeSingle();

    if (checkError) {
      return { status: 500, body: 'Error al verificar la unidad de medida' };
    }

    if (existingUnit) {
      return { status: 400, body: 'Ya existe una unidad de medida con este símbolo' };
    }

    // Insertar la nueva unidad de medida
    const { data, error } = await supabase
      .from('measure_units')
      .insert({
        simbol: values.simbol,
        tipo: values.tipo,
        unit: values.unit,
        // company_id: actualCompany, // Si existe este campo en la tabla
      })
      .select();

    if (error) {
      return { status: 500, body: 'Error al crear la unidad de medida' };
    }

    return { status: 200, body: 'Unidad de medida creada correctamente', data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 400, body: JSON.stringify(error.errors) };
    }
    console.error('Error al crear unidad de medida:', error);
    return { status: 500, body: 'Error del servidor al crear la unidad de medida' };
  }
}

/**
 * Actualiza una unidad de medida existente
 */
export async function updateMeasureUnit(values: z.infer<typeof measureUnitSchema> & { id: number }) {
  const supabase = await supabaseServer();

  try {
    // Validar datos con Zod
    measureUnitSchema.parse(values);

    // Verificar si ya existe otra unidad con el mismo símbolo
    const { data: existingUnit, error: checkError } = await supabase
      .from('measure_units')
      .select('id')
      .eq('simbol', values.simbol)
      .neq('id', values.id)
      .maybeSingle();

    if (checkError) {
      return { status: 500, body: 'Error al verificar la unidad de medida' };
    }

    if (existingUnit) {
      return { status: 400, body: 'Ya existe otra unidad de medida con este símbolo' };
    }

    // Actualizar la unidad de medida
    const { data, error } = await supabase
      .from('measure_units')
      .update({
        simbol: values.simbol,
        tipo: values.tipo,
        unit: values.unit,
      })
      .eq('id', values.id)
      .select();

    if (error) {
      return { status: 500, body: 'Error al actualizar la unidad de medida' };
    }

    return { status: 200, body: 'Unidad de medida actualizada correctamente', data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 400, body: JSON.stringify(error.errors) };
    }
    console.error('Error al actualizar unidad de medida:', error);
    return { status: 500, body: 'Error del servidor al actualizar la unidad de medida' };
  }
}

/**
 * Elimina una unidad de medida
 */
export async function deleteMeasureUnit(id: number) {
  const supabase = await supabaseServer();

  try {
    // Verificar si la unidad de medida está siendo utilizada
    // Aquí puedes agregar la verificación con las tablas que utilicen unidades de medida
    // Por ejemplo:
    // const { data: usages } = await supabase.from('otra_tabla').select('id').eq('measure_unit_id', id).limit(1);
    // if (usages && usages.length > 0) {
    //   return { status: 400, body: 'No se puede eliminar esta unidad de medida porque está siendo utilizada' };
    // }

    const { error } = await supabase.from('measure_units').delete().eq('id', id);

    if (error) {
      return { status: 500, body: 'Error al eliminar la unidad de medida' };
    }

    return { status: 200, body: 'Unidad de medida eliminada correctamente' };
  } catch (error) {
    console.error('Error al eliminar unidad de medida:', error);
    return { status: 500, body: 'Error del servidor al eliminar la unidad de medida' };
  }
}
