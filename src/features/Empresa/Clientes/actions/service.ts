import { supabaseServer } from '@/lib/supabase/server';

export async function fetchServices(company_id: string) {
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
      .eq('company_id', company_id || '')
      .order('service_name', { ascending: true });

    if (error) {
      console.error('Error al obtener servicios:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado al obtener servicios:', error);
    return [];
  }
}
