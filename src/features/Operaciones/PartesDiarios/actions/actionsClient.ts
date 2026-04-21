'use client';

import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';

const logger = new Logger('features/PartesDiarios/actionsClient');

// ============================================
// FUNCIONES CLIENT-SIDE (sin cookies)
// ============================================

export async function getCustomersClient() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('customers')
    .select(
      `
      *,
      equipos_clientes(*),
      customer_services!customer_services_customer_id_fkey(
        *,
        service_sectors(*, sectors(*)),
        service_areas(*, areas_cliente(*)),
        service_items(*, measure_units(*))
      )
    `
    )
    .eq('is_active', true)
    .order('name');

  if (error) {
    logger.error('Error en getCustomersClient', { data: { error } });
    throw error;
  }

  return data || [];
}

export async function getActiveEmployeesForDailyReportClient() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from('employees').select('*').order('firstname');

  if (error) throw error;
  return data || [];
}

export async function getActiveEquipmentsForDailyReportClient() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, type(*), brand_vehicles(*), model_vehicles(*), sub_type(*)')
    .order('intern_number');

  if (error) throw error;
  return data || [];
}

export async function checkDailyReportExistsClient(dates: string[]) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from('dailyreport').select('id, date').in('date', dates);

  if (error) throw error;
  return data || [];
}

export async function createDailyReportClient(dates: string[]) {
  const supabase = supabaseBrowser();

  // Obtener company_id del usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const company_id = user?.app_metadata?.company;

  if (!company_id) {
    throw new Error('No se pudo obtener el company_id del usuario');
  }

  const reportsToCreate = dates.map((date) => ({
    date,
    status: 'abierto' as const,
    company_id,
  }));

  const { data, error } = await supabase.from('dailyreport').insert(reportsToCreate).select();

  if (error) throw error;
  return data || [];
}

export async function createDailyReportRowClient(rows: any[]) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from('dailyreportrows').insert(rows).select();

  if (error) throw error;
  return data || [];
}

export async function createDailyReportEmployeeRelationsClient(dailyReportRowId: string, employeeIds: string[]) {
  const supabase = supabaseBrowser();
  const relations = employeeIds.map((employeeId) => ({
    daily_report_row_id: dailyReportRowId,
    employee_id: employeeId,
  }));

  const { data, error } = await supabase.from('dailyreportemployeerelations').insert(relations).select();

  if (error) throw error;
  return data || [];
}

export async function createDailyReportEquipmentRelationsClient(dailyReportRowId: string, equipmentIds: string[]) {
  const supabase = supabaseBrowser();
  const relations = equipmentIds.map((equipmentId) => ({
    daily_report_row_id: dailyReportRowId,
    equipment_id: equipmentId,
  }));

  const { data, error } = await supabase.from('dailyreportequipmentrelations').insert(relations).select();

  if (error) throw error;
  return data || [];
}

export async function createDailyReportCustomerEquipmentRelationsClient(
  dailyReportRowId: string,
  customerEquipmentIds: string[]
) {
  const supabase = supabaseBrowser();
  const relations = customerEquipmentIds.map((equipmentId) => ({
    daily_report_row_id: dailyReportRowId,
    customer_equipment_id: equipmentId,
  }));

  const { data, error } = await supabase.from('dailyreport_customer_equipment_relations').insert(relations).select();

  if (error) throw error;
  return data || [];
}

export async function updateDailyReportStatusAndRemitNumberClient(
  rowId: string,
  updateData: {
    status?: 'pendiente' | 'sin_recursos_asignados' | 'ejecutado' | 'reprogramado' | 'cancelado' | 'en_certificacion';
    remit_number?: string | null;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    working_day?: string | null;
    sector_service_id?: string | null;
    areas_service_id?: string | null;
  }
) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from('dailyreportrows').update(updateData).eq('id', rowId).select();

  if (error) throw error;
  return data || [];
}

// ============================================
// TIPOS EXPORTADOS (nomenclatura: FunctionName + Type)
// ============================================

export type GetCustomersClientType = Awaited<ReturnType<typeof getCustomersClient>>[number];
export type GetActiveEmployeesForDailyReportClientType = Awaited<
  ReturnType<typeof getActiveEmployeesForDailyReportClient>
>[number];
export type GetActiveEquipmentsForDailyReportClientType = Awaited<
  ReturnType<typeof getActiveEquipmentsForDailyReportClient>
>[number];
export type CheckDailyReportExistsClientType = Awaited<ReturnType<typeof checkDailyReportExistsClient>>[number];
export type CreateDailyReportClientType = Awaited<ReturnType<typeof createDailyReportClient>>[number];
export type CreateDailyReportRowClientType = Awaited<ReturnType<typeof createDailyReportRowClient>>[number];

// ============================================
// FUNCIONES PARA SINCRONIZAR RELACIONES
// ============================================

export async function syncDailyReportEmployeeRelationsClient(dailyReportRowId: string, newEmployeeIds: string[]) {
  const supabase = supabaseBrowser();

  // 1. Eliminar todas las relaciones existentes
  await supabase.from('dailyreportemployeerelations').delete().eq('daily_report_row_id', dailyReportRowId);

  // 2. Crear las nuevas relaciones si hay empleados
  if (newEmployeeIds.length > 0) {
    const relations = newEmployeeIds.map((employeeId) => ({
      daily_report_row_id: dailyReportRowId,
      employee_id: employeeId,
    }));

    const { error } = await supabase.from('dailyreportemployeerelations').insert(relations);

    if (error) throw error;
  }
}

export async function syncDailyReportEquipmentRelationsClient(dailyReportRowId: string, newEquipmentIds: string[]) {
  const supabase = supabaseBrowser();

  // 1. Eliminar todas las relaciones existentes
  await supabase.from('dailyreportequipmentrelations').delete().eq('daily_report_row_id', dailyReportRowId);

  // 2. Crear las nuevas relaciones si hay equipos
  if (newEquipmentIds.length > 0) {
    const relations = newEquipmentIds.map((equipmentId) => ({
      daily_report_row_id: dailyReportRowId,
      equipment_id: equipmentId,
    }));

    const { error } = await supabase.from('dailyreportequipmentrelations').insert(relations);

    if (error) throw error;
  }
}

export async function syncDailyReportCustomerEquipmentRelationsClient(
  dailyReportRowId: string,
  newCustomerEquipmentIds: string[]
) {
  const supabase = supabaseBrowser();

  // 1. Eliminar todas las relaciones existentes
  await supabase.from('dailyreport_customer_equipment_relations').delete().eq('daily_report_row_id', dailyReportRowId);

  // 2. Crear las nuevas relaciones si hay equipos de cliente
  if (newCustomerEquipmentIds.length > 0) {
    const relations = newCustomerEquipmentIds.map((equipmentId) => ({
      daily_report_row_id: dailyReportRowId,
      customer_equipment_id: equipmentId,
    }));

    const { error } = await supabase.from('dailyreport_customer_equipment_relations').insert(relations);

    if (error) throw error;
  }
}
