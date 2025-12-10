'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { CreateKPIInput, KPI, KPIRevision, UpdateKPIInput, UpdateKPINumberInput } from '../types';
type KPIRow = Database['public']['Tables']['kpis']['Row'];
type KPIRevisionRow = Database['public']['Tables']['kpi_revisions']['Row'];

// Helper para mapear datos de la BD a tipos TypeScript
function mapKPIRowToKPI(row: KPIRow): KPI {
  return {
    id: row.id,
    company_id: row.company_id,
    name: row.name,
    code: row.code,
    number: row.number,
    validity_date: row.validity_date,
    calculation_formula: row.calculation_formula,
    technical_support: row.technical_support ?? true,
    improvement_opportunities: row.improvement_opportunities,
    filters: row.filters as Record<string, any> | null,
    is_active: row.is_active ?? true,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

// Helper para mapear revisiones
function mapKPIRevisionRowToKPIRevision(row: KPIRevisionRow): KPIRevision {
  return {
    id: row.id,
    kpi_id: row.kpi_id,
    previous_number: row.previous_number,
    new_number: row.new_number,
    previous_validity_date: row.previous_validity_date,
    new_validity_date: row.new_validity_date,
    change_reason: row.change_reason,
    changed_by: row.changed_by,
    is_active: row.is_active ?? true,
    created_at: row.created_at || new Date().toISOString(),
  };
}

export async function fetchAllKPIs(): Promise<KPI[]> {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  const { data, error } = await supabase
    .from('kpis')
    .select('*')
    .eq('company_id', company_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching KPIs:', error);
    return [];
  }

  return (data || []).map(mapKPIRowToKPI);
}

export async function fetchKPIById(id: string): Promise<KPI | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('kpis').select('*').eq('id', id).single();

  if (error) {
    console.error('Error fetching KPI:', error);
    return null;
  }

  return data ? mapKPIRowToKPI(data) : null;
}

export async function fetchKPIRevisions(kpi_id: string): Promise<KPIRevision[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('kpi_revisions')
    .select('*')
    .eq('kpi_id', kpi_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching KPI revisions:', error);
    return [];
  }

  return (data || []).map(mapKPIRevisionRowToKPIRevision);
}

export async function createKPI(input: CreateKPIInput): Promise<{ data: KPI | null; error: any }> {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return { data: null, error: { message: 'No company selected' } };
  }

  // Generar código automáticamente usando la función RPC
  const { data: codeData, error: codeError } = await supabase.rpc('generate_kpi_code', {
    company_uuid: company_id,
  });

  if (codeError) {
    console.error('Error generating KPI code:', codeError);
    return { data: null, error: codeError };
  }

  // La función RPC devuelve el resultado directamente como string
  const generatedCode = typeof codeData === 'string' ? codeData : `KPI-0001`;

  const { data, error } = await supabase
    .from('kpis')
    .insert({
      company_id,
      name: input.name,
      code: generatedCode || `KPI-0001`, // Fallback si falla la función
      number: input.number || null,
      validity_date: input.validity_date,
      calculation_formula: input.calculation_formula,
      technical_support: input.technical_support ?? true,
      improvement_opportunities: null, // No se puede crear con oportunidades de mejora
      filters: input.filters || null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating KPI:', error);
    return { data: null, error };
  }

  revalidatePath('/dashboard/empresa');
  return { data: data ? mapKPIRowToKPI(data) : null, error: null };
}

export async function updateKPI(input: UpdateKPIInput): Promise<{ data: KPI | null; error: any }> {
  const supabase = await supabaseServer();

  // Construir objeto de actualización solo con campos definidos
  const updateData: Partial<Database['public']['Tables']['kpis']['Update']> = {};

  // Lista de campos actualizables
  const updatableFields: Array<keyof UpdateKPIInput> = [
    'name',
    'calculation_formula',
    'technical_support',
    'improvement_opportunities',
    'filters',
    'is_active',
  ];

  // Solo agregar campos que están definidos en el input
  updatableFields.forEach((field) => {
    if (input[field] !== undefined) {
      updateData[field] = input[field] as any;
    }
  });

  const { data, error } = await supabase.from('kpis').update(updateData).eq('id', input.id).select().single();

  if (error) {
    console.error('Error updating KPI:', error);
    return { data: null, error };
  }

  revalidatePath('/dashboard/empresa');
  return { data: data ? mapKPIRowToKPI(data) : null, error: null };
}

export async function updateKPINumber(input: UpdateKPINumberInput): Promise<{ data: KPI | null; error: any }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } };
  }

  // Obtener el KPI actual para guardar los valores anteriores
  const { data: currentKPI, error: fetchError } = await supabase
    .from('kpis')
    .select('number, validity_date')
    .eq('id', input.kpi_id)
    .single();

  if (fetchError || !currentKPI) {
    return { data: null, error: fetchError || { message: 'KPI not found' } };
  }

  // Actualizar el KPI
  const { data: updatedKPI, error: updateError } = await supabase
    .from('kpis')
    .update({
      number: input.new_number,
      validity_date: input.new_validity_date,
    })
    .eq('id', input.kpi_id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating KPI number:', updateError);
    return { data: null, error: updateError };
  }

  // Crear la revisión
  const { error: revisionError } = await supabase.from('kpi_revisions').insert({
    kpi_id: input.kpi_id,
    previous_number: currentKPI.number,
    new_number: input.new_number,
    previous_validity_date: currentKPI.validity_date,
    new_validity_date: input.new_validity_date,
    change_reason: input.change_reason,
    changed_by: user.id,
  });

  if (revisionError) {
    console.error('Error creating revision:', revisionError);
    // No retornamos error aquí porque el KPI ya se actualizó
  }

  revalidatePath('/dashboard/empresa');
  return { data: updatedKPI ? mapKPIRowToKPI(updatedKPI) : null, error: null };
}

export async function deleteKPI(id: string): Promise<{ error: any }> {
  const supabase = await supabaseServer();

  const { error } = await supabase.from('kpis').update({ is_active: false }).eq('id', id);

  if (error) {
    console.error('Error deleting KPI:', error);
    return { error };
  }

  revalidatePath('/dashboard/empresa');
  return { error: null };
}
