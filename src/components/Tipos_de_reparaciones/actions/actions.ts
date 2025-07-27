'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function fetchAllTypesOfRepairs() {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    let { data: types_of_repairs, error } = await supabase.from('types_of_repairs').select('*');
    // .eq('company_id', company_id || '');

    if (error) {
      // console.log(error);
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    // console.log(error);
    return [];
  }
}

export async function createTypeOfRepair(body: any) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    const { data: types_of_repairs, error } = await supabase.from('types_of_repairs').insert(body).select();

    if (error) {
      // console.log(error);
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    // console.log(error);
    return [];
  }
}

export async function updateTypeOfRepair(body: any, id: string) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    const { data: types_of_repairs, error } = await supabase
      .from('types_of_repairs')
      .update(body)
      .eq('id', id || '');

    if (error) {
      // console.log(error);
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    // console.log(error);
    return [];
  }
}

export async function deleteTypeOfRepair(id: string) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    const { data: types_of_repairs, error } = await supabase
      .from('types_of_repairs')
      .delete()
      .eq('id', id || '');
    if (error) {
      // console.log(error);
      return [];
    }
    return types_of_repairs || [];
  } catch (error) {
    // console.log(error);
    return [];
  }
}

export async function fetchAllRepairSolicitudes() {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    let { data, error } = await supabase
      .from('repair_solicitudes')
      .select(
        '*,user_id(*),employees(*),vehicles(*,type(*),brand_vehicles(*),model_vehicles(*)),types_of_repairs(*),repairlogs(*,modified_by_employee(*),modified_by_user(*))'
      )
      .not('equipment_id', 'is', null);

    //console.log(data, 'data');

    if (error) {
      console.log(error);
      return [];
    }
    return data || [];
  } catch (error) {
    // console.log(error);
    return [];
  }
}

export async function createRepairSolicitud(data: any) {
  const supabase = supabaseServer();
  const cookieStore = cookies();
  const company_id = cookieStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  try {
    const { data: repair_solicitudes, error } = await supabase.from('repair_solicitudes').insert(data).select();

    if (error) {
      // console.log(error);
      return [];
    }
    return repair_solicitudes || [];
  } catch (error) {
    // console.log(error);
    return [];
  }
}
