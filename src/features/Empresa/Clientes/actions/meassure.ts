import { supabaseServer } from '@/lib/supabase/server';

export async function fetchMeasureUnits() {
  const supabase = await supabaseServer();

  try {
    const { data: measure_units, error } = await supabase.from('measure_units').select('*');

    if (error) {
      console.error('Error al obtener unidades de medida:', error);
      return [];
    }

    return measure_units || [];
  } catch (error) {
    console.error('Error inesperado al obtener unidades de medida:', error);
    return [];
  }
}

export type MeasureUnit = {
  id: number;
  unit: string;
  simbol: string;
  tipo: string;
};
