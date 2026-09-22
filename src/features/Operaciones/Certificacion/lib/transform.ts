/**
 * Normalización de las líneas de parte diario para el tablero comercial y de certificación.
 *
 * Vive en `Certificacion/lib` (y no en el wrapper de `Comercial`) para romper el ciclo de
 * imports `Certificacion ↔ Comercial`: ahora Comercial depende de Operaciones y no al revés.
 */

import moment from 'moment';
import type { getFilteredDailyReportRowsType } from '../actions/queries.server';

export const transformDailyReports = (reports: getFilteredDailyReportRowsType) => {
  return reports
    ?.map((row) => ({
      id: row.id,
      date: row.date,
      dailyReportStatus: row.dailyreport?.status || 'cerrado', // Acceder a dailyreport desde el objeto original
      created_at: row.created_at, // Agregar created_at para detectar filas post-cierre
      type_service: row.type_service,
      preparte: row.preparte,
      last_comercial_edit_at: row.last_comercial_edit_at,
      customer: row.customer || row.customers?.name,
      cancel_reason: row.cancel_reason,
      employees:
        row.employees ||
        row.dailyreportemployeerelations?.map((rel) => rel.employees?.firstname + ' ' + rel.employees?.lastname) ||
        [],
      equipment:
        row.company_equipment ||
        row.dailyreportequipmentrelations?.map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number) ||
        [],
      customer_equipment:
        row.dailyreport_customer_equipment_relations?.map((rel) => {
          return {
            name: rel.equipos_clientes?.name,
            type: rel.equipos_clientes?.type,
            id: rel.equipos_clientes?.id,
            relacion_id: rel.id,
          };
        }) ||
        row.customer_equipment ||
        [],
      services: row.services || row.customer_services?.service_name,
      item: row.item || row.service_items?.item_name,
      item_description: row.service_items?.item_description || '',
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      working_day: row.working_day,
      sector_customer_id: row.service_sectors?.id,
      sector: row.sector || row.service_sectors?.sectors?.name,
      completed_night: row.completed_night as boolean,
      completed_day: row.completed_day as boolean,
      areas_customer_id: row.service_areas?.id,
      area: row.area || row.service_areas?.areas_cliente?.descripcion_corta,
      description: row.description || '',
      document_path: row.document_path,
      remit_number: row.remit_number || '', // Ya viene procesado con múltiples remitos separados por coma
      remit_numbers: row.remit_numbers || [], // Array con todos los números de remito
      remitos: row.remitos || [], // Array completo de objetos remito
      employees_references: row.dailyreportemployeerelations
        .map((rel) => rel.employees)
        .filter((employee): employee is NonNullable<typeof employee> => employee !== null)
        .map((employee) => ({ ...employee, name: `${employee.firstname} ${employee.lastname}`.trim() })),
      equipment_references: row.dailyreportequipmentrelations
        .map((rel) => rel.vehicles)
        .filter((vehicle): vehicle is NonNullable<typeof vehicle> => vehicle !== null)
        .map((vehicle) => ({
          ...vehicle,
          name: vehicle.domain || vehicle.intern_number,
          brand_vehicles: vehicle.brand_vehicles?.name ?? null,
        })),
      data_to_clone: {
        customer_id: row.customers?.id,
        service_id: row.customer_services?.id,
        item_id: row.service_items?.id,
        working_day: row.working_day,
        start_time: row.start_time,
        end_time: row.end_time,
        description: row.description,
        type_service: row.raw_type_service ?? undefined,
        areas_service_id: row.areas_service_id,
        sector_service_id: row.sector_service_id,
      },
    }))
    .sort((a, b) => {
      // Ordenar por fecha descendente (más recientes primero)
      // Formato de fecha: DD-MM-YYYY
      const dateA = moment(a.date, 'DD-MM-YYYY');
      const dateB = moment(b.date, 'DD-MM-YYYY');
      return dateB.valueOf() - dateA.valueOf();
    });
};

export type transformDailyReportsType = ReturnType<typeof transformDailyReports>;
