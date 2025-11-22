'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Helper para obtener company_id desde cookies
function getCompanyId() {
  const cookiesStore = cookies();
  return cookiesStore.get('actualComp')?.value || '';
}

// Helper para obtener user_id
async function getUserId() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || '';
}

// 1. Resumen general de ausentismo
export async function getAbsenteeismSummary({
  fromDate,
  toDate,
  saveToTable = false,
}: {
  fromDate?: string;
  toDate?: string;
  saveToTable?: boolean;
}) {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    throw new Error('No se encontró el ID de la empresa');
  }

  const { data, error } = await supabase.rpc('hr_get_absenteeism_summary', {
    p_company_id: companyId,
    p_from: fromDate || new Date().toISOString().split('T')[0],
    p_to: toDate || new Date().toISOString().split('T')[0],
    save_to_table: saveToTable,
  });

  if (error) {
    console.error('Error fetching absenteeism summary:', error);
    throw error;
  }

  return data;
}

// Obtener distribución de empleados por género y posición
export async function getEmployeesByGenderAndPosition() {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    return;
  }

  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      gender,
      company_position,
      company_positions!inner(name)
    `
    )
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching employees by gender and position:', error);
    throw error;
  }

  return data;
}
export type GetEmployeesByGenderAndPositionType = Awaited<ReturnType<typeof getEmployeesByGenderAndPosition>>;

// Obtener distribución de empleados por tipo de contrato
export async function getEmployeesByContractType() {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    return;
  }

  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      types_of_contract(id,name)
    `
    )
    .eq('company_id', companyId)
    .eq('is_active', true)
    .not('type_of_contract', 'is', null);

  if (error) {
    console.error('Error fetching employees by contract type:', error);
    throw error;
  }

  return data;
}
export type GetEmployeesByContractType = Awaited<ReturnType<typeof getEmployeesByContractType>>;

// 2. Tendencia de ausentismo
export async function getAbsenteeismTrend({
  fromDate,
  toDate,
  saveToTable = false,
}: {
  fromDate?: string;
  toDate?: string;
  saveToTable?: boolean;
}) {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    return [];
  }

  const { data, error } = await supabase.rpc('hr_get_absenteeism_trend', {
    p_company_id: companyId,
    p_from: fromDate,
    p_to: toDate,
    save_to_table: saveToTable,
  });

  if (error) {
    console.error('Error fetching absenteeism trend:', error);
    return [];
  }

  return data;
}

// 3. Empleados ausentes actualmente
export async function getCurrentAbsentEmployees({
  date,
  saveToTable = false,
}: {
  date?: string;
  saveToTable?: boolean;
}) {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    throw new Error('No se encontró el ID de la empresa');
  }

  const { data, error } = await supabase.rpc('hr_get_current_absent_employees', {
    p_company_id: companyId,
    p_date: date,
    save_to_table: saveToTable,
  });

  if (error) {
    console.error('Error fetching current absent employees:', error);
    throw error;
  }

  return data;
}

// 4. Serie temporal diaria de ausentismo
export async function getDailyAbsenceTimeseries({
  fromDate,
  toDate,
  saveToTable = false,
}: {
  fromDate?: string;
  toDate?: string;
  saveToTable?: boolean;
}) {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    throw new Error('No se encontró el ID de la empresa');
  }

  const { data, error } = await supabase.rpc('hr_get_daily_absence_timeseries', {
    p_company_id: companyId,
    p_from: fromDate,
    p_to: toDate,
    save_to_table: saveToTable,
  });

  if (error) {
    console.error('Error fetching daily absence timeseries:', error);
    throw error;
  }

  return data;
}

// 5. Razones de ausencia por departamento
export async function getDepartmentAbsenceReasons({
  date,
  saveToTable = false,
}: {
  date?: string;
  saveToTable?: boolean;
}) {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    throw new Error('No se encontró el ID de la empresa');
  }

  const { data, error } = await supabase.rpc('hr_get_department_absence_reasons', {
    p_company_id: companyId,
    p_date: date,
    save_to_table: saveToTable,
  });

  if (error) {
    console.error('Error fetching department absence reasons:', error);
    throw error;
  }

  return data;
}

// 6. Resumen de ausentismo por departamento
export async function getDepartmentAbsenceSummary({
  date,
  saveToTable = false,
}: {
  date?: string;
  saveToTable?: boolean;
}) {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    throw new Error('No se encontró el ID de la empresa');
  }

  const { data, error } = await supabase.rpc('hr_get_department_absence_summary', {
    p_company_id: companyId,
    p_date: date,
    save_to_table: saveToTable,
  });

  if (error) {
    console.error('Error fetching department absence summary:', error);
    throw error;
  }

  return data;
}

export async function getDailyAbsenceDetail({ date, saveToTable = false }: { date?: string; saveToTable?: boolean }) {
  const supabase = supabaseServer();
  const companyId = getCompanyId();

  if (!companyId) {
    throw new Error('No se encontró el ID de la empresa');
  }

  // Reutilizamos el RPC de empleados ausentes actuales, filtrado por fecha
  const { data, error } = await supabase.rpc('hr_get_current_absent_employees', {
    p_company_id: companyId,
    p_date: date,
    save_to_table: saveToTable,
  });

  if (error) {
    console.error('Error fetching daily absence detail:', error);
    throw error;
  }

  return data;
}
