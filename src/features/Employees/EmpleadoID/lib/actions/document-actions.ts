'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function fetchDocumentTypes() {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('document_types').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching document types:', error);
    return [];
  }

  return data;
}
export async function toggleEmployeeStatus(employeeId: string, activate: boolean) {
  const supabase = supabaseServer();

  const { error } = await supabase.from('employees').update({ is_active: activate }).eq('id', employeeId);

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
