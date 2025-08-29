'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function createEquipmentOwner({
  name,
  is_active,
  cuit,
  contract_type,
}: {
  name: string;
  is_active: boolean;
  cuit: string;
  contract_type: 'Leasing' | 'Alquiler';
}) {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('company_id')?.value;
  const { data, error } = await supabase
    .from('equipment_owners')
    .insert({
      name,
      is_active,
      cuit,
      contract_type,
      company_id,
    })
    .select();

  if (error) {
    console.error('Error creating equipment owner:', error);
    throw new Error(`Error creating equipment owner: ${error.message}`);
  }

  return data;
}

export async function updateEquipmentOwner({
  id,
  name,
  is_active,
  cuit,
  contract_type,
}: {
  id: string;
  name: string;
  is_active: boolean;
  cuit: string;
  contract_type: 'Leasing' | 'Alquiler';
}) {
  const supabase = createServerActionClient({ cookies });
  const { data, error } = await supabase
    .from('equipment_owners')
    .update({
      name,
      is_active,
      cuit,
      contract_type,
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating equipment owner:', error);
    throw new Error(`Error updating equipment owner: ${error.message}`);
  }

  return data;
}

export async function FetchEquipmentOwners() {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from('equipment_owners').select('*');

  if (error) {
    console.error('Error fetching equipment owners:', error);
    throw new Error(`Error fetching equipment owners: ${error.message}`);
  }
  return data;
}

export type FetchEquipmentOwnersType = Awaited<ReturnType<typeof FetchEquipmentOwners>>;
