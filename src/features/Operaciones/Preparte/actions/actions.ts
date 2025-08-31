'use server';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function fetchServiceItems() {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const supabase = supabaseServer();

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('service_items')
    .select('id,item_name')
    .order('item_name', { ascending: true });

  if (error) {
    console.error('Error fetching service items:', error);
    return [];
  }
  return data;
}

export async function fetchCustomersWithRelations() {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const supabase = supabaseServer();
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('customers')
    .select(
      `
      *,
      equipos_clientes(*),
      sector_customer(*, sectors(*)),
      customer_services!customer_services_customer_id_fkey(
        *,
        service_sectors(*, sectors(*) ),
        service_areas(*, areas_cliente(*)),
        service_items(*,measure_units(*))  
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
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
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
