'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Employees/Diagrams');

export const fetchDiagramsTypes = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];
  const { data, error } = await supabase
    .from('diagram_type')
    .select('*')
    .eq('company_id', company_id || '')
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching diagrams types', { data: { error } });
    return [];
  }
  return data;
};

export const fetchSingEmployee = async (employeesId: string) => {
  //Traer el tipo de documento que se llame firma
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('document_types')
    .select('id')
    .eq('name', 'Firma')
    .eq('is_active', true)
    .single();

  const { data: employeeSingDocument, error: employeeSingDocumentError } = await supabase
    .from('documents_employees')
    .select('*')
    .eq('id_document_types', data?.id || '')
    .eq('applies', employeesId)
    .not('document_path', 'is', null)
    .eq('is_active', true);

  if (error) {
    logger.error('Error fetching document type', { data: { error } });
    return null;
  }

  const data2 = supabase.storage.from('document-files').getPublicUrl(employeeSingDocument?.[0]?.document_path || '');

  return data2.data.publicUrl || null;
};
