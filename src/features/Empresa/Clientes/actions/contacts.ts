'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function fetchContacts() {
  const supabase = await supabaseServer();
  const cookieStore = await cookies();
  const actualCompany = cookieStore.get('actualComp')?.value;

  if (!actualCompany) {
    console.warn('fetchContacts: company_id no está definido');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, customers(id, name)')
      .eq('company_id', actualCompany);

    if (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en fetchContacts:', error);
    throw error;
  }
}
