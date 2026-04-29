'use server';

import { supabaseServer } from '@/lib/supabase/server';

export const fetchAllDocumentTypes = async () => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('document_types').select('*').eq('is_active', true).order('name');

  if (error) {
    console.error('Error fetching document types:', error);
    return [];
  }
  return data || [];
};

export const getDocumentEmployeesById = async (id: string) => {
  const supabase = await supabaseServer();
  let { data: documents_employee } = await supabase
    .from('documents_employees')
    .select(
      `
    *,
    document_types(*),
    applies(*,
      city(name),
      province(name),
      contractor_employee(
        customers(*)),
        company_id(*,province_id(name))
          )
          `
    )
    .eq('id', id);
  return documents_employee;
};

export const getDocumentEquipmentById = async (id: string) => {
  const supabase = await supabaseServer();
  let { data: documents_vehicle } = await supabase
    .from('documents_equipment')
    .select(
      `
      *,
      document_types(*),
      applies(*,brand(name),model(name),type_of_vehicle(name), company_id(*,province_id(name)))`
    )
    .eq('id', id);
  return documents_vehicle;
};

export const getDocumentCompanyById = async (id: string) => {
  const supabase = await supabaseServer();
  const { data: documents_company } = await supabase
    .from('documents_company')
    .select(
      `
      *,
      document_types(*),
      company(*,province_id(name))
      `
    )
    .eq('id', id);
  return documents_company;
};
