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
