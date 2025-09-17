'use server';

import { supabaseServer } from '@/lib/supabase/server';
import moment from 'moment';

export async function fetchDocumentTypes() {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('document_types').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching document types:', error);
    return [];
  }

  return data;
}
export async function toggleEmployeeStatus(
  employeeId: string,
  activate: boolean,
  reason_for_termination?: any,
  termination_date?: Date
) {
  const supabase = supabaseServer();

  const { error } = await supabase
    .from('employees')
    .update({
      is_active: activate,
      reason_for_termination: reason_for_termination || null,
      termination_date: termination_date ? moment(termination_date).format('YYYY-MM-DD') : null,
    })
    .eq('id', employeeId);

  // Después de actualizar el empleado, agregar:
  await supabase.rpc('update_employee_diagram_status', {
    p_employee_id: employeeId, // usar el ID del empleado
    p_is_active: activate,
  });

  if (error) {
    throw new Error(error.message);
  }
}
export async function uploadEmployeeDocument(
  employeeId: string,
  documentData: {
    document_name: string;
    document_url: string;
    document_type_id: string;
    expiration_date?: string;
    is_required: boolean;
  }
) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('documents_employees')
    .insert({
      ...documentData,
      applies: employeeId,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Error uploading document:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteEmployeeDocument(documentId: string) {
  const supabase = supabaseServer();

  const { error } = await supabase.from('documents_employees').delete().eq('id', documentId);

  if (error) {
    console.error('Error deleting document:', error);
    throw new Error(error.message);
  }

  return true;
}

export async function updateDocumentStatus(documentId: string, status: any) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('documents_employees')
    .update({ state: status })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating document status:', error);
    throw new Error(error.message);
  }

  return data;
}
