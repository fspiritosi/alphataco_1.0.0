/**
 * Utility function to transform daily report server data to the format expected by
 * DailyReportForm and ClonarRegistrosButton components
 */

import { fetchDailyReportData } from '../actions/server-actions';

/**
 * Transforms a single daily report row from server format to formatted format
 * @param row - The server row data
 * @param reportDate - The date of the report
 * @returns Formatted row data
 */
export function formatDailyReportRow(
  row: Awaited<ReturnType<typeof fetchDailyReportData>>['rows'][number],
  reportDate: string
) {
  return {
    id: row.id,
    date: reportDate,
    type_service: row.type_service,
    customer: row.customers?.name,
    preparte: row.preparte,
    cancel_reason: row.cancel_reason,
    employees:
      row.dailyreportemployeerelations?.map((rel) => `${rel.employees?.lastname} ${rel.employees?.firstname}`) || [],
    equipment:
      row.dailyreportequipmentrelations?.map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number) || [],
    customer_equipment:
      row.dailyreport_customer_equipment_relations?.map((rel) => ({
        name: rel.equipos_clientes?.name || '',
        type: rel.equipos_clientes?.type || '',
        id: rel.equipos_clientes?.id || '',
        relacion_id: rel.id,
      })) || [],
    services: row.customer_services?.service_name,
    item: row.service_items?.item_name,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    working_day: row.working_day,
    sector_customer_id: row.service_sectors?.id,
    sector_service_name: row.service_sectors?.sectors?.name,
    completed_night: row.completed_night as boolean,
    completed_day: row.completed_day as boolean,
    areas_customer_id: row.service_areas?.id,
    areas_customer_name: row.service_areas?.areas_cliente?.descripcion_corta,
    description: row.description || '',
    document_path: row.document_path,
    remit_number: row.remit_number,
    employees_references:
      row.dailyreportemployeerelations?.map((rel) => ({
        ...rel.employees!,
        name: `${rel.employees?.lastname} ${rel.employees?.firstname}`,
        id: rel.employees?.id || '',
        role: (rel as { role?: string }).role || null,
      })) || [],
    equipment_references:
      row.dailyreportequipmentrelations?.map((rel) => ({
        ...rel.vehicles!,
        name: rel.vehicles?.domain || rel.vehicles?.intern_number || '',
        id: rel.vehicles?.id || '',
        brand_vehicles: rel.vehicles?.brand_vehicles,
      })) || [],
    data_to_clone: {
      customer_id: row.customers?.id,
      service_id: row.customer_services?.id,
      item_id: row.service_items?.id,
      working_day: row.working_day,
      start_time: row.start_time,
      end_time: row.end_time,
      description: row.description,
      type_service: row.type_service,
      areas_service_id: row.areas_service_id,
      sector_service_id: row.sector_service_id,
    },
  };
}

/**
 * Transforms an array of daily report rows from server format to formatted format
 * @param rows - Array of server row data
 * @param reportDate - The date of the report
 * @returns Array of formatted row data
 */
export function formatDailyReportData(
  rows: Awaited<ReturnType<typeof fetchDailyReportData>>['rows'],
  reportDate: string
) {
  return rows.map((row) => formatDailyReportRow(row, reportDate));
}
