import { supabaseServer } from '@/lib/supabase/server';

export async function fetchCustomers(company_id: string) {
  const supabase = await supabaseServer();

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', company_id || '')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener clientes:', error);
      return [];
    }

    return customers || [];
  } catch (error) {
    console.error('Error inesperado al obtener clientes:', error);
    return [];
  }
}
