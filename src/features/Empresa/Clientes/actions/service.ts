import { logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

export async function fetchServices() {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase
      .from('customer_services')
      .select(
        `
        *,
        customers!customer_services_customer_id_fkey (*),
        service_areas (
          area_id,
          areas_cliente (
            id,
            nombre,
            descripcion_corta
          )
        ),
        service_sectors (
          sector_id,
          sectors (
            id,
            name
          )
        )
      `
      )
      .order('service_name', { ascending: true });

    if (error) {
      logger.error('Error al obtener servicios', { data: { error } });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error inesperado al obtener servicios', { data: { error } });
    return [];
  }
}
