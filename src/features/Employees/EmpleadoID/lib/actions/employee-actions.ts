'use server';

import { supabaseServer } from '@/lib/supabase/server';
import type { Employee } from '@/types/types';
import { cookies } from 'next/headers';

export async function fetchEmployeeById(employeeId: string) {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return null;

  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      *,
      hierarchy(id, name),
      company_position:company_positions(id, name),
      birthplace:countries(id, name),
      province:provinces(id, name),
      country:countries(id, name),
      city:cities(id, name),
      work_diagram(id, name),
      guild(id, name),
      covenant(id, name),
      category(id, name),
      contractor_employee:contractor_employee(
        customers:customers(id, name)
      ),
      documents_employees:documents_employees(
        id,
        document_name,
        document_url,
        expiration_date,
        is_required,
        status,
        document_type:document_types(id, name)
      ),
      empleado_aptitudes:empleado_aptitudes(
        aptitud_id,
        aptitudes_tecnicas:aptitudes_tecnicas(id, name)
      )
    `
    )
    .eq('id', employeeId)
    .eq('company_id', company_id)
    .single();

  if (error) {
    console.error('Error fetching employee:', error);
    return null;
  }

  return data;
}

export async function fetchEmployeeBasicInfo(employeeId: string) {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return null;

  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      id,
      firstname,
      lastname,
      email,
      document_number,
      picture,
      status,
      is_active,
      company_position:company_positions(name),
      hierarchy(name)
    `
    )
    .eq('id', employeeId)
    .eq('company_id', company_id)
    .single();

  if (error) {
    console.error('Error fetching employee basic info:', error);
    return null;
  }

  return data;
}

export async function fetchEmployeeDocuments(employeeId: string) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('documents_employees')
    .select(
      `
      id,
      document_name,
      document_url,
      expiration_date,
      is_required,
      state,
      created_at,
      document_type:document_types(id, name)
    `
    )
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee documents:', error);
    return [];
  }

  return data;
}

export async function updateEmployeePersonalInfo(employeeId: string, personalData: Partial<Employee>) {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) throw new Error('No company selected');

  const { data, error } = await supabase
    .from('employees')
    .update(personalData as any)
    .eq('id', employeeId)
    .eq('company_id', company_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee personal info:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function updateEmployeeWorkInfo(employeeId: string, workData: Partial<Employee>) {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) throw new Error('No company selected');

  // Handle allocated_to relationship separately
  if (workData.allocated_to && Array.isArray(workData.allocated_to)) {
    // Delete existing relationships
    await supabase.from('contractor_employee').delete().eq('employee_id', employeeId);

    // Insert new relationships
    if (workData.allocated_to.length > 0) {
      const relationships = workData.allocated_to.map((contractorId: string) => ({
        contractor_id: contractorId,
        employee_id: employeeId,
      }));

      await supabase.from('contractor_employee').insert(relationships);
    }
  }

  // Remove allocated_to from the main update
  const { allocated_to, ...updateData } = workData;

  const { data, error } = await supabase
    .from('employees')
    .update(updateData as any)
    .eq('id', employeeId)
    .eq('company_id', company_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee work info:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function createEmployee(employeeData: Partial<Employee>) {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) throw new Error('No company selected');

  // Remove allocated_to and aptitudes from the main update
  const { allocated_to, aptitudes, ...updateData } = employeeData;

  const { data, error } = await supabase
    .from('employees')
    .insert({
      ...updateData,
      company_id,
      allocated_to: employeeData.allocated_to ?? [],
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    throw new Error(error.message);
  }
  if (employeeData.allocated_to && Array.isArray(employeeData.allocated_to)) {
    await updateContractorRelationships(data.id, employeeData.allocated_to);
  }

  if (employeeData.aptitudes && Array.isArray(employeeData.aptitudes)) {
    await updateAptitudeRelationships(data.id, employeeData.aptitudes);
  }

  return data;
}

export async function updateEmployee(employeeId: string, employeeData: Partial<Employee>) {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) throw new Error('No company selected');

  if (employeeData.allocated_to && Array.isArray(employeeData.allocated_to)) {
    await updateContractorRelationships(employeeId, employeeData.allocated_to);
  }

  if (employeeData.aptitudes && Array.isArray(employeeData.aptitudes)) {
    await updateAptitudeRelationships(employeeId, employeeData.aptitudes);
  }

  // Remove allocated_to and aptitudes from the main update
  const { allocated_to, aptitudes, ...updateData } = employeeData;

  console.log(updateData);

  const { data, error } = await supabase
    .from('employees')
    .update(updateData as any)
    .eq('id', employeeId)
    .eq('company_id', company_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee:', error);
    throw new Error(error.message);
  }

  return data;
}

async function updateContractorRelationships(employeeId: string, newContractorIds: string[]) {
  const supabase = supabaseServer();

  // Obtener relaciones actuales
  const { data: currentRelations, error: fetchError } = await supabase
    .from('contractor_employee')
    .select('contractor_id')
    .eq('employee_id', employeeId);

  if (fetchError) {
    console.error('Error fetching current contractor relationships:', fetchError);
    throw new Error(fetchError.message);
  }

  const currentContractorIds = currentRelations?.map((rel) => rel.contractor_id) || [];

  // Determinar qué agregar y qué eliminar
  const toAdd = newContractorIds.filter((id) => !currentContractorIds.includes(id));
  const toRemove = currentContractorIds.filter((id) => !newContractorIds.includes(id!));

  // Eliminar relaciones que ya no están seleccionadas
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('contractor_employee')
      .delete()
      .eq('employee_id', employeeId)
      .in('contractor_id', toRemove);

    if (deleteError) {
      console.error('Error deleting contractor relationships:', deleteError);
      throw new Error(deleteError.message);
    }
  }

  // Agregar nuevas relaciones
  if (toAdd.length > 0) {
    const newRelationships = toAdd.map((contractorId) => ({
      contractor_id: contractorId,
      employee_id: employeeId,
    }));

    const { error: insertError } = await supabase.from('contractor_employee').insert(newRelationships);

    if (insertError) {
      console.error('Error inserting contractor relationships:', insertError);
      throw new Error(insertError.message);
    }
  }
}
async function updateAptitudeRelationships(employeeId: string, newAptitudeIds: string[]) {
  const supabase = supabaseServer();

  // Obtener relaciones actuales
  const { data: currentRelations, error: fetchError } = await supabase
    .from('empleado_aptitudes')
    .select('aptitud_id')
    .eq('empleado_id', employeeId);

  if (fetchError) {
    console.error('Error fetching current aptitude relationships:', fetchError);
    throw new Error(fetchError.message);
  }

  const currentAptitudeIds = currentRelations?.map((rel) => rel.aptitud_id) || [];

  // Determinar qué agregar y qué eliminar
  const toAdd = newAptitudeIds.filter((id) => !currentAptitudeIds.includes(id));
  const toRemove = currentAptitudeIds.filter((id) => !newAptitudeIds.includes(id));

  // Eliminar relaciones que ya no están seleccionadas
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('empleado_aptitudes')
      .delete()
      .eq('empleado_id', employeeId)
      .in('aptitud_id', toRemove);

    if (deleteError) {
      console.error('Error deleting aptitude relationships:', deleteError);
      throw new Error(deleteError.message);
    }
  }

  // Agregar nuevas relaciones
  if (toAdd.length > 0) {
    const newRelationships = toAdd.map((aptitudeId) => ({
      aptitud_id: aptitudeId,
      empleado_id: employeeId,
    }));

    const { error: insertError } = await supabase.from('empleado_aptitudes').insert(newRelationships);

    if (insertError) {
      console.error('Error inserting aptitude relationships:', insertError);
      throw new Error(insertError.message);
    }
  }
}
export async function getDiagramsByEmployee(employeeId: string) {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('work_diagram')
    .select(
      `
      id,
      name,
      created_at,
      employees!inner(id)
    `
    )
    .eq('employees.id', employeeId)
    .eq('company_id', company_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee diagrams:', error);
    return [];
  }

  return data;
}
