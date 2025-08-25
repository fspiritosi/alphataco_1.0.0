'use server';

import { NewDiagramType } from '@/components/Diagrams/DiagramNewTypeForm';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function fetchAllDiagramTypes() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  try {
    let { data: diagram_type, error } = await supabase
      .from('diagram_type')
      .select('*')
      .eq('company_id', company_id || '');

    if (error) {
      console.error('Error fetching diagram types:', error);
      return [];
    }

    return diagram_type;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createDiagramType({ name, color, short_description, work_active, is_active }: NewDiagramType) {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  try {
    const { data, error } = await supabase
      .from('diagram_type')
      .insert({ name, company_id, color, short_description, work_active, is_active });

    console.error(error, 'error');

    if (!error) {
      return data;
    }
    console.error(error);
    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function updateDiagramType({
  id,
  name,
  color,
  short_description,
  work_active,
  is_active,
}: NewDiagramType) {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  try {
    const { data, error } = await supabase
      .from('diagram_type')
      .update({ name, color, short_description, work_active, is_active })
      .eq('id', id || '');

    if (error) {
      console.error(error);
      return [];
    }
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}
