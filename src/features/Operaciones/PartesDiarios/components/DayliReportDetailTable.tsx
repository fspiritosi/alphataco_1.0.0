/**
 * LEGACY FILE — kept only for backwards compatibility.
 *
 * `transformDailyReports` and `DailyReportRow` are still imported by
 * `src/features/Empresa/Clientes/components/operations/components/DailyReportRowForm.tsx`.
 *
 * The `DayliReportDetailTable` component and `getDailyReportColumns` function have been
 * replaced by the new implementation in `src/features/Operaciones/PartesDiarios/detail/`.
 */
import { getDailyReportById } from '../actions/actions';

export const transformDailyReports = (reports: Awaited<ReturnType<typeof getDailyReportById>>) => {
  const report = reports?.[0];
  return report?.dailyreportrows
    ?.map((row) => ({
      id: row.id,
      date: report.date,
      type_service: row.type_service,
      customer: row.customers?.name,
      preparte: row.preparte,
      cancel_reason: row.cancel_reason,
      employees: row.dailyreportemployeerelations.map(
        (rel) => rel.employees?.lastname + ' ' + rel.employees?.firstname
      ),
      equipment:
        row.dailyreportequipmentrelations.map(
          (rel) =>
            rel.vehicles?.domain ||
            rel.vehicles?.intern_number ||
            rel.other_equipment?.intern_number ||
            rel.other_equipment?.serial_number
        ) || [],
      customer_equipment:
        row.dailyreport_customer_equipment_relations.map((rel) => {
          return {
            name: rel.equipos_clientes?.name,
            type: rel.equipos_clientes?.type,
            id: rel.equipos_clientes?.id,
            relacion_id: rel.id,
          };
        }) || [],
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
      employees_references: row.dailyreportemployeerelations.map((rel) => ({
        ...rel.employees,
        name: rel.employees?.lastname + ' ' + rel.employees?.firstname,
        id: rel.employees?.id,
        role: rel.role,
      })),
      equipment_references: row.dailyreportequipmentrelations
        .map((rel) => {
          const vehicle = rel.vehicles;
          const otherEquip = rel.other_equipment;
          if (vehicle) {
            return {
              ...vehicle,
              _source: 'vehicle' as const,
              name: vehicle.domain || vehicle.intern_number,
              id: vehicle.id,
            };
          }
          if (otherEquip) {
            return {
              ...otherEquip,
              _source: 'other_equipment' as const,
              name: otherEquip.intern_number || otherEquip.serial_number,
              id: otherEquip.id,
            };
          }
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item != null),
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
    }))
    .sort((a, b) => {
      const customerCompare = (a.customer || '').localeCompare(b.customer || '');
      if (customerCompare !== 0) return customerCompare;
      return (a.item || '').localeCompare(b.item || '');
    });
};

export type DailyReportRow = ReturnType<typeof transformDailyReports>[number];
