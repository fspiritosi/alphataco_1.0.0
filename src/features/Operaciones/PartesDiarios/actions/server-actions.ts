'use server';

import { queryWithPagination } from '@/app/server/GET/probando';
import { supabaseServer } from '@/lib/supabase/server';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';

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
