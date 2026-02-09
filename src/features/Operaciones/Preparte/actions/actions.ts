'use server';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function fetchCustomersWithRelations() {
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const supabase = await supabaseServer();
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('customers')
    .select(
      `
      id,
      name,
      equipos_clientes(id, name),
      sector_customer(id, customer_id, sector_id, sectors(id, name)),
      customer_services!customer_services_customer_id_fkey(
        id,
        customer_id,
        service_sectors(id, sector_id, service_id, sectors(id, name)),
        service_areas(id, area_id, service_id, areas_cliente(id, nombre)),
        service_items(id, item_name, customer_service_id, unit_id, measure_units(id, name, abbreviation))
      )
    `
    )
    .eq('company_id', company_id);

  if (error) {
    console.error('Error fetching customers with relations:', error);
    return [];
  }
  return data;
}

export async function fetchSectorsByContract(serviceId: string) {
  const supabase = await supabaseServer();
  if (!serviceId) return [];

  // Get service_sectors with related sectors
  const { data, error } = await supabase
    .from('service_sectors')
    .select(
      `
      id,
      sector_id,
      sectors:sectors!service_sectors_sector_id_fkey(
        id,
        name
      )
    `
    )
    .eq('service_id', serviceId);

  if (error) {
    console.error('[fetchSectorsByContract] error:', error);
    return [];
  }

  // Map to the expected format
  const options = (data || []).map((item: any) => ({
    id: item.id, // service_sectors.id
    sector_id: item.sector_id, // sectors.id
    name: item.sectors?.name || '',
  }));

  return options;
}

export async function fetchAreasByContract(serviceId: string) {
  const supabase = await supabaseServer();
  if (!serviceId) return [];

  const { data, error } = await supabase
    .from('service_areas')
    .select(
      `
      id,
      area_id,
      areas_cliente:areas_cliente!service_areas_area_id_fkey(
        id,
        nombre
      )
    `
    )
    .eq('service_id', serviceId)
    .order('id');

  if (error) {
    console.error('Error fetching areas by contract:', error);
    return [];
  }

  // Map to the expected format
  return (data || []).map((item: any) => ({
    id: item.id, // service_areas.id
    area_id: item.area_id, // areas_cliente.id
    name: item.areas_cliente?.nombre || '',
  }));
}

export async function fetchEquipmentsByCustomer(customerId: string) {
  const supabase = await supabaseServer();
  if (!customerId) return [];
  const { data, error } = await supabase
    .from('equipos_clientes')
    .select('id, name, customer_id')
    .eq('customer_id', customerId)
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching equipments by customer:', error);
    return [];
  }
  return data || [];
}

// Nota: equipos_clientes no tiene service_id, se filtra por customer_id
