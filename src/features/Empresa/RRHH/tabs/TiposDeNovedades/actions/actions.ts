'use server';

import { NewDiagramType } from '@/features/Employees/Diagrams/DiagramNewTypeForm';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Empresa/RRHH');

export async function fetchAllDiagramTypes() {
  const supabase = await supabaseServer();

  try {
    const { data: diagram_type, error } = await supabase.from('diagram_type').select('*');

    if (error) {
      logger.error('Error fetching diagram types', { data: { error } });
      return [];
    }

    return diagram_type;
  } catch (error) {
    logger.error('Error fetching diagram types', { data: { error } });
    return [];
  }
}

export async function createDiagramType({
  name,
  color,
  short_description,
  work_active,
  is_active,
  computes_absenteeism,
}: NewDiagramType) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  try {
    const { data, error } = await supabase.from('diagram_type').insert({
      name,
      company_id,
      color,
      short_description,
      work_active,
      is_active,
      computes_absenteeism: computes_absenteeism ?? (!work_active ? true : false),
    });

    if (error) {
      logger.error('Error creating diagram type', { data: { error } });
      return [];
    }

    return data;
  } catch (error) {
    logger.error('Error creating diagram type', { data: { error } });
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
  computes_absenteeism,
}: NewDiagramType) {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase
      .from('diagram_type')
      .update({
        name,
        color,
        short_description,
        work_active,
        is_active,
        computes_absenteeism: computes_absenteeism ?? (!work_active ? true : false),
      })
      .eq('id', id || '');

    if (error) {
      logger.error('Error updating diagram type', { data: { error } });
      return [];
    }
    return data;
  } catch (error) {
    logger.error('Error updating diagram type', { data: { error } });
    return [];
  }
}
