import { fetchDailyReportData } from '../actions/server-actions';

// Tipo inferido automáticamente del retorno de la función del servidor
export type DailyReportServerData = Awaited<ReturnType<typeof fetchDailyReportData>>['rows'][0];

// Tipos para las relaciones de empleados
export interface EmployeeReference {
  id: string;
  firstname: string;
  lastname: string;
  document_number: string;
  phone: string;
  email: string;
  company_positions: {
    name: string;
  } | null;
  contractor_employee: Array<{
    customers: {
      id: string;
      name: string;
    } | null;
  }> | null;
}

// Tipos para las relaciones de equipos
export interface EquipmentReference {
  id: string;
  intern_number: string | null;
  domain: string | null;
  brand_vehicles: {
    id: number;
    name: string;
  } | null;
  model_vehicles: {
    id: number;
    name: string;
  } | null;
  model: string;
  year: string;
  sub_type: {
    name: string;
  } | null;
  type: {
    name: string;
  } | null;
  contractor_equipment: Array<{
    customers: {
      id: string;
      name: string;
    } | null;
  }> | null;
  condition: string | null;
}

// Tipos para equipos del cliente
export interface CustomerEquipmentReference {
  id: string;
  name: string;
  type: string;
}

// Tipo transformado para la tabla (compatible con la implementación actual)
export interface DailyReportRowServer {
  id: string;
  date: string;
  type_service: string | null;
  customer: string | null;
  preparte: {
    id: string;
    numero_pedido: string | null;
    confirmed_by: string | null;
  } | null;
  cancel_reason: string | null;
  employees: string[];
  equipment: string[];
  customer_equipment: Array<{
    name: string;
    type: string;
    id: string;
    relacion_id: string;
  }>;
  services: string | null;
  item: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  working_day: string | null;
  sector_customer_id: string | null;
  sector_service_name: string | null;
  completed_night: boolean | null;
  completed_day: boolean | null;
  areas_customer_id: string | null;
  areas_customer_name: string | null;
  description: string | null;
  document_path: string | null;
  remit_number: string | null;
  employees_references: Array<
    EmployeeReference & {
      name: string;
      role?: 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche' | null;
    }
  >;
  equipment_references: Array<EquipmentReference & { name: string }>;
  data_to_clone: {
    customer_id: string | null;
    service_id: string | null;
    item_id: string | null;
    working_day: string | null;
    start_time: string | null;
    end_time: string | null;
    description: string | null;
    type_service: string | null;
    areas_service_id: string | null;
    sector_service_id: string | null;
  };
}

// Función para transformar datos del servidor al formato esperado por la tabla
export function transformDailyReportsServer(serverData: DailyReportServerData[], reportDate: string) {
  return serverData
    .map((row) => ({
      id: row.id,
      date: reportDate,
      type_service: row.type_service,
      customer: row.customers?.name || null,
      preparte: row.preparte,
      cancel_reason: row.cancel_reason,
      employees:
        row.dailyreportemployeerelations
          ?.map((rel) => `${rel.employees?.lastname} ${rel.employees?.firstname}`)
          .filter(Boolean) || [],
      equipment:
        row.dailyreportequipmentrelations
          ?.map((rel) => rel.vehicles?.domain || rel.vehicles?.intern_number || '')
          .filter(Boolean) || [],
      customer_equipment:
        row.dailyreport_customer_equipment_relations?.map((rel) => ({
          name: rel.equipos_clientes?.name || '',
          type: rel.equipos_clientes?.type || '',
          id: rel.equipos_clientes?.id || '',
          relacion_id: rel.id,
        })) || [],
      services: row.customer_services?.service_name || null,
      item: row.service_items?.item_name || null,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      working_day: row.working_day,
      sector_customer_id: row.service_sectors?.id || null,
      sector_service_name: row.service_sectors?.sectors?.name || null,
      completed_night: row.completed_night,
      completed_day: row.completed_day,
      areas_customer_id: row.service_areas?.id || null,
      areas_customer_name: row.service_areas?.areas_cliente?.descripcion_corta || null,
      description: row.description || null,
      document_path: row.document_path,
      remit_number: row.remit_number,
      employees_references:
        row.dailyreportemployeerelations
          ?.map((rel) => ({
            ...rel.employees,
            name: `${rel.employees?.lastname} ${rel.employees?.firstname}`,
            id: rel.employees?.id || '',
            role: rel.role as 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche' | null,
          }))
          .filter((emp) => emp.id) || [],
      equipment_references:
        row.dailyreportequipmentrelations
          ?.map((rel) => ({
            ...rel.vehicles,
            name: rel.vehicles?.domain || rel.vehicles?.intern_number || '',
            id: rel.vehicles?.id || '',
            brand_vehicles: rel.vehicles?.brand_vehicles,
          }))
          .filter((eq) => eq.id) || [],
      data_to_clone: {
        customer_id: row.customer_id,
        service_id: row.service_id,
        item_id: row.item_id,
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
      // Ordenamiento por defecto: primero por cliente, luego por item
      const customerCompare = (a.customer || '').localeCompare(b.customer || '');
      if (customerCompare !== 0) return customerCompare;
      return (a.item || '').localeCompare(b.item || '');
    });
}

// Tipos para parámetros de filtros
export interface DailyReportFilters {
  Cliente?: string[];
  Servicio?: string[];
  Item?: string[];
  Sector?: string[];
  Área?: string[];
  'Tipo de servicio'?: string[];
  'Equipo cliente'?: string[];
  Empleados?: string[];
  Equipo?: string[];
  Jornada?: string[];
  'Hora de inicio'?: string[];
  'Hora de fin'?: string[];
  Estado?: string[];
}

// Tipo para opciones de paginación
export interface DailyReportPaginationOptions {
  dailyReportId: string;
  pageIndex: number;
  pageSize: number;
  sorting: Array<{
    id: string;
    desc: boolean;
  }>;
  columnFilters: Array<{
    id: string;
    value: any;
  }>;
}
