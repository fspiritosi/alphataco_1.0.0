'use server';

import { queryWithPagination } from '@/app/server/GET/probando';
import { supabaseServer } from '@/lib/supabase/server';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';

// ============================================================================
// NUEVAS FUNCIONES PARA CLIENT-SIDE TABLE
// ============================================================================

/**
 * Obtiene los datos base de las filas del parte diario (sin relaciones pesadas)
 * Esta query es más liviana y se carga primero
 */
export async function fetchDailyReportRowsBase(dailyReportId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('dailyreportrows')
    .select(
      `
      id,
      daily_report_id,
      customer_id,
      service_id,
      item_id,
      start_time,
      end_time,
      description,
      status,
      working_day,
      document_path,
      sector_service_id,
      areas_service_id,
      remit_number,
      cancel_reason,
      type_service,
      last_comercial_edit_at,
      completed_day,
      completed_night,
      preparte_id,
      created_at,
      updated_at,
      preparte(id, numero_pedido, confirmed_by),
      customers(id, name),
      customer_services(id, service_name),
      service_items(id, item_name),
      service_sectors(id, sectors(id, name)),
      service_areas(id, areas_cliente(id, descripcion_corta)),
      dailyreport_customer_equipment_relations(
        id,
        customer_equipment_id,
        equipos_clientes(id, name, type)
      )
    `
    )
    .eq('daily_report_id', dailyReportId)
    .order('customers(name)', { ascending: true })
    .order('customer_services(service_name)', { ascending: true })
    .order('service_items(item_name)', { ascending: true });

  if (error) {
    throw new Error(`Error fetching daily report rows: ${error.message}`);
  }

  return data || [];
}

// Tipo inferido de la función base
export type DailyReportRowBase = Awaited<ReturnType<typeof fetchDailyReportRowsBase>>[number];

/**
 * Obtiene las relaciones de empleados para un parte diario
 * Se carga en paralelo y se combina client-side
 */
export async function fetchDailyReportEmployeeRelations(dailyReportId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('dailyreportemployeerelations')
    .select(
      `
      id,
      daily_report_row_id,
      employee_id,
      role,
      employees(
        id,
        firstname,
        lastname,
        full_name,
        document_number,
        phone,
        email,
        is_active,
        company_positions(name),
        contractor_employee(customers(id, name))
      )
    `
    )
    .eq('dailyreportrows.daily_report_id', dailyReportId);

  // Si falla el filtro anidado, intentamos con una estrategia diferente
  if (error) {
    // Primero obtener los IDs de las filas del parte
    const { data: rowIds } = await supabase.from('dailyreportrows').select('id').eq('daily_report_id', dailyReportId);

    if (!rowIds || rowIds.length === 0) return [];

    const { data: relations, error: relError } = await supabase
      .from('dailyreportemployeerelations')
      .select(
        `
        id,
        daily_report_row_id,
        employee_id,
        role,
        employees(
          id,
          firstname,
          lastname,
          full_name,
          document_number,
          phone,
          email,
          is_active,
          company_positions(name),
          contractor_employee(customers(id, name))
        )
      `
      )
      .in(
        'daily_report_row_id',
        rowIds.map((r) => r.id)
      );

    if (relError) {
      throw new Error(`Error fetching employee relations: ${relError.message}`);
    }

    return relations || [];
  }

  return data || [];
}

// Tipo inferido de relaciones de empleados
export type DailyReportEmployeeRelation = Awaited<ReturnType<typeof fetchDailyReportEmployeeRelations>>[number];

/**
 * Obtiene las relaciones de equipos para un parte diario
 * Se carga en paralelo y se combina client-side
 */
export async function fetchDailyReportEquipmentRelations(dailyReportId: string) {
  const supabase = await supabaseServer();

  // Primero obtener los IDs de las filas del parte
  const { data: rowIds } = await supabase.from('dailyreportrows').select('id').eq('daily_report_id', dailyReportId);

  if (!rowIds || rowIds.length === 0) return [];

  const { data, error } = await supabase
    .from('dailyreportequipmentrelations')
    .select(
      `
      id,
      daily_report_row_id,
      equipment_id,
      vehicles(
        id,
        intern_number,
        domain,
        brand_vehicles(id, name),
        model_vehicles(id, name),
        model,
        year,
        sub_type(name),
        type(name),
        contractor_equipment(customers(id, name)),
        condition
      )
    `
    )
    .in(
      'daily_report_row_id',
      rowIds.map((r) => r.id)
    );

  if (error) {
    throw new Error(`Error fetching equipment relations: ${error.message}`);
  }

  return data || [];
}

// Tipo inferido de relaciones de equipos
export type DailyReportEquipmentRelation = Awaited<ReturnType<typeof fetchDailyReportEquipmentRelations>>[number];

// ============================================================================
// FUNCIONES LEGACY (mantener para compatibilidad)
// ============================================================================

// Función para obtener datos de daily report con paginación del servidor
export async function fetchDailyReportData({
  dailyReportId,
  pageIndex,
  pageSize,
  sorting,
  columnFilters,
}: {
  dailyReportId: string;
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  // Usar queryWithPagination siguiendo el patrón de empleados
  const result = await queryWithPagination(
    'dailyreportrows',
    `
            id,
            daily_report_id,
            customer_id,
            service_id,
            item_id,
            start_time,
            end_time,
            description,
            status,
            working_day,
            document_path,
            sector_service_id,
            areas_service_id,
            remit_number,
            cancel_reason,
            type_service,
            last_comercial_edit_at,
            completed_day,
            completed_night,
            preparte_id,
            created_at,
            updated_at,
            preparte(id, numero_pedido, confirmed_by),
            customers(id, name),
            customer_services(id, service_name),
            service_items(id, item_name),
            service_sectors(id, sectors(id, name)),
            service_areas(id, areas_cliente(id, descripcion_corta)),
            dailyreportemployeerelations(
                id,
                employee_id,
                role,
                employees(
                    id,
                    firstname,
                    lastname,
                    document_number,
                    phone,
                    email,
                    company_positions(name),
                    contractor_employee(customers(id, name))
                )
            ),
            dailyreportequipmentrelations(
                id,
                equipment_id,
                vehicles(
                    id,
                    intern_number,
                    domain,
                    brand_vehicles(id, name),
                    model_vehicles(id, name),
                    model,
                    year,
                    sub_type(name),
                    type(name),
                    contractor_equipment(customers(id, name)),
                    condition
                )
            ),
            dailyreport_customer_equipment_relations(
                id,
                customer_equipment_id,
                equipos_clientes(id, name, type)
            )
        `,
    {
      pageIndex,
      pageSize,
      sorting,
      columnFilters,
      server: true,
      permanent_filter: (query) => {
        return query
          .eq('daily_report_id', dailyReportId)
          .order('customers(name)', { ascending: true })
          .order('customer_services(service_name)', { ascending: true })
          .order('service_items(item_name)', { ascending: true });
      },
    }
  );

  return result;
}

// Función para obtener todos los datos sin paginación (para exportación)
export async function fetchAllDailyReportData({
  dailyReportId,
  sorting,
  columnFilters,
}: {
  dailyReportId: string;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  // Usar la misma lógica que fetchDailyReportData pero sin paginación
  const result = await fetchDailyReportData({
    dailyReportId,
    pageIndex: 0,
    pageSize: 10000, // Límite alto para obtener todos los datos
    sorting,
    columnFilters,
  });

  return result.rows;
}

// Función optimizada para obtener solo status y date del daily report
export async function getDailyReportStatusByIdOptimized(id: string) {
  const supabase = await supabaseServer();

  const { data: dailyReports, error } = await supabase.from('dailyreport').select('status, date').eq('id', id).single();

  if (error) {
    console.error('Error fetching daily report status:', error);
    return null;
  }

  return dailyReports;
}
