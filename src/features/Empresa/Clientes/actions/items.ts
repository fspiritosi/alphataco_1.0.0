'use server';
import { supabaseServer } from '@/lib/supabase/server';

export async function fetchServiceItems(customer_service_id: string) {
  if (!customer_service_id) return [];
  const supabase = supabaseServer();

  try {
    const { data: items, error } = await supabase
      .from('service_items')
      .select(
        `
        *,
        measure_units (*)
      `
      )
      .eq('customer_service_id', customer_service_id);

    // console.log(items);

    if (error) {
      console.error('Error al obtener items del servicio:', error);
      return [];
    }

    return items || [];
  } catch (error) {
    console.error('Error al obtener items del servicio:', error);
    return [];
  }
}
