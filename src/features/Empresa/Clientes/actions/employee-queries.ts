'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Empresa/Clientes');

export const fetchServiceItemsLegacy = async (company_id: string, user_id: string, customer_service_id: string) => {
  const supabase = await supabaseServer();

  try {
    if (!company_id || !customer_service_id) {
      logger.error('Missing required parameters', { data: { company_id, customer_service_id } });
      return [];
    }

    const { data: items, error } = await supabase
      .from('service_items')
      .select(
        `
        *,
        item_measure_units (
          id,
          unit
        ),
        customer_service_id (
          id,
          customers!customer_services_customer_id_fkey (
            id,
            name
          )
        )
      `
      )
      .eq('company_id', company_id)
      .eq('customer_service_id', customer_service_id);

    if (error) {
      logger.error('Error fetching service items', { data: { error } });
      throw new Error(JSON.stringify(error));
    }

    return items || [];
  } catch (error) {
    logger.error('Error in fetchServiceItems', { data: { error } });
    throw error;
  }
};

export const fetchAllActivesEmployees = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', company_id)
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching employees', { data: { error } });
    return [];
  }
  return data;
};
