import { supabaseBrowser } from '@/lib/supabase/browser';
import Cookies from 'js-cookie';
import moment from 'moment';

export interface DailyReportRow {
  id: string;
  date: string;
  status: string;
  document_path?: string;
  remit_number: string;
  dailyreport_customer_equipment_relations?: {
    id: string;
    equipos_clientes?: {
      id: string;
    };
  };
  service_sectors?: {
    id: string;
    sectors?: {
      id: string;
    };
  };
  service_areas?: {
    id: string;
    areas_cliente?: {
      id: string;
    };
  };
  customer_services?: {
    id: string;
    service_name: string;
  };
  service_items?: {
    id: string;
    item_name: string;
  };
  customers?: {
    id: string;
    name: string;
  };
  dailyreportemployeerelations?: {
    employees?: {
      id: string;
      firstname: string;
      lastname: string;
    };
  };
  dailyreportequipmentrelations?: {
    vehicles?: {
      id: string;
      intern_number: string;
      domain: string;
    };
  };
}
export async function getCustomersClient() {
  const supabase = supabaseBrowser();
  const company_id = Cookies.get('actualComp');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('customers')
    .select(
      `
    *,
    equipos_clientes(*),
    customer_services!customer_services_customer_id_fkey(
      *,
      service_sectors(*, sectors(*) ),
      service_areas(*, areas_cliente(*)),
      service_items(*,measure_units(*))  
    )
  `
    )
    .eq('company_id', company_id || user?.app_metadata?.company || '');
  if (error) {
    console.error(error);
  }

  return data;
}

export interface ProcessedDailyReportRow extends Omit<DailyReportRow, 'date' | 'remit_number'> {
  date: string;
  remit_number: string;
  customers?: {
    id: string;
    name: string;
  };
  customer_services?: {
    id: string;
    service_name: string;
  };
}

export interface Service {
  id: string;
  name: string;
  customer_id: string;
}

export async function getAllDailyReportRows() {
  const supabase = supabaseBrowser();
  const { data: dailyReports, error } = await supabase
    .from('dailyreport')
    .select(
      `
      *,
      dailyreportrows(
        *,
        document_path,
        dailyreport_customer_equipment_relations(*, equipos_clientes(*) ),
        service_sectors(*, sectors(*) ),
        service_areas(*, areas_cliente(*) ),
        customer_services(id, service_name),
        service_items(id, item_name),
        remit_number,
        customers(id, name),
        dailyreportemployeerelations(employees(id, firstname, lastname)),
        dailyreportequipmentrelations(vehicles(id, intern_number, domain))
      )
    `
    )
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching daily reports:', error);
    throw error;
  }

  const processedData = dailyReports.flatMap((report) =>
    (report.dailyreportrows || []).map((row) => ({
      ...row,
      date: report.date,
      remit_number: row.remit_number,
    }))
  );

  return processedData;
}

interface ReportFilters {
  customer?: string[];
  service?: string[];
  status?: string[];
  employee?: string[];
  equipment?: string[];
  item?: string[];
  customerEquipment?: string[];
  areas?: string[];
  sectors?: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
}

export async function getFilteredDailyReportRows(filters: ReportFilters = {}) {
  try {
    const supabase = supabaseBrowser();
    // Primero obtener todos los datos sin filtrar las relaciones
    let query = supabase
      .from('dailyreportrows')
      .select(
        `
        *,
        document_path,
        dailyreport_customer_equipment_relations(*, equipos_clientes(*)),
        service_sectors(*, sectors(*)),
        service_areas(*, areas_cliente(*)),
        customer_services(id, service_name, customer_id),
        service_items(id, item_name, item_description),
        remit_number,
        customers(id, name),
        preparte(*),
        dailyreportemployeerelations(employees(id, firstname, lastname, document_number, email, phone, company_positions(name))),
        dailyreportequipmentrelations(vehicles(id, intern_number, domain, year, type(name), brand_vehicles(name), model_vehicles(name), sub_type(name))),
        dailyreport!inner(date,status)
      `
      )
      .order('date', { foreignTable: 'dailyreport', ascending: false });

    // Filtros básicos. Ahora esperamos arrays.
    if (filters.customer && filters.customer.length > 0) {
      query = query.in('customer_id', filters.customer);
    }

    if (filters.service && filters.service.length > 0) {
      query = query.in('service_id', filters.service);
    }

    if (filters.item && filters.item.length > 0) {
      query = query.in('item_id', filters.item);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in(
        'status',
        filters.status.map((s) => s.toLowerCase())
      );
    }

    // Filtros de fecha. Corregido para usar 'lte'.
    if (filters.dateFrom) {
      query = query.gte('dailyreport.date', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('dailyreport.date', filters.dateTo);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    if (!rows) return [];

    // Filtrar en el código JavaScript para aplicar AND en las relaciones
    const filteredRows = rows.filter((row: any) => {
      // Verificar filtro de empleados
      if (filters.employee?.length) {
        const employeeIds = filters.employee;
        const rowEmployeeIds = (row.dailyreportemployeerelations || [])
          .map((rel: any) => rel.employees?.id)
          .filter(Boolean);

        const hasAllEmployees = employeeIds.every((id) => rowEmployeeIds.includes(id));
        if (!hasAllEmployees) return false;
      }

      // Verificar filtro de equipos
      if (filters.equipment?.length) {
        const equipmentIds = filters.equipment;
        const rowEquipmentIds = (row.dailyreportequipmentrelations || [])
          .map((rel: any) => rel.vehicles?.id)
          .filter(Boolean);

        const hasAllEquipment = equipmentIds.every((id) => rowEquipmentIds.includes(id));
        if (!hasAllEquipment) return false;
      }

      // Verificar filtro de equipos de cliente
      if (filters.customerEquipment?.length) {
        const customerEquipmentIds = filters.customerEquipment;
        const rowCustomerEquipmentIds = (row.dailyreport_customer_equipment_relations || [])
          .map((rel: any) => rel.equipos_clientes?.id)
          .filter(Boolean);

        const hasAllCustomerEquipment = customerEquipmentIds.every((id) => rowCustomerEquipmentIds.includes(id));
        if (!hasAllCustomerEquipment) return false;
      }

      // Verificar filtro de áreas
      if (filters.areas?.length) {
        const areaIds = filters.areas;
        const rowAreaId = row.service_areas?.areas_cliente?.id;

        const hasArea = areaIds.includes(rowAreaId);
        if (!hasArea) return false;
      }

      // Verificar filtro de sectores
      if (filters.sectors?.length) {
        const sectorIds = filters.sectors;
        const rowSectorId = row.service_sectors?.sectors?.id;

        const hasSector = sectorIds.includes(rowSectorId);
        if (!hasSector) return false;
      }

      return true;
    });

    // Procesar las filas filtradas
    const processedRows = filteredRows.map((row) => {
      // Mapeo de empleados
      const employees: string[] = (row.dailyreportemployeerelations || [])
        .map((rel: any) => (rel?.employees ? `${rel.employees.firstname} ${rel.employees.lastname}`.trim() : ''))
        .filter(Boolean);

      // Mapeo de equipos de la empresa
      const company_equipment: string[] = (row.dailyreportequipmentrelations || [])
        .map((rel: any) => rel?.vehicles)
        .filter(Boolean)
        .map((v: any) => [v.intern_number, v.domain].filter(Boolean).join(' - '))
        .filter(Boolean);

      // Mapeo de equipos del cliente
      const customer_equipment: string[] = (row.dailyreport_customer_equipment_relations || [])
        .map((rel: any) => rel?.equipos_clientes)
        .filter(Boolean)
        .map((eq: any) => eq.name || eq.label || eq.description || eq.id)
        .filter(Boolean);

      // Mapeo de área
      const area = row.service_areas?.areas_cliente?.nombre || '';

      // Mapeo de sector
      const sector = row.service_sectors?.sectors?.name || '';

      return {
        ...row,
        date: moment(row.dailyreport?.date).format('DD-MM-YYYY'),
        customer: row.customers?.name ?? '',
        item: row.service_items?.item_name ?? '',
        services: row.customer_services?.service_name ?? '',
        type_service: row.type_service ?? row.customer_services?.service_name ?? '',
        employees,
        company_equipment,
        customer_equipment,
        area,
        sector,
        employees_references: row.dailyreportemployeerelations?.map((rel: any) => rel.employees) || [],
        equipment_references: row.dailyreportequipmentrelations?.map((rel: any) => rel.vehicles) || [],
        customer_equipment_references:
          row.dailyreport_customer_equipment_relations?.map((rel: any) => rel.equipos_clientes) || [],
      };
    });

    return processedRows;
  } catch (error) {
    console.error('Error in getFilteredDailyReportRows:', error);
    throw error;
  }
}
export type getFilteredDailyReportRowsType = Awaited<ReturnType<typeof getFilteredDailyReportRows>>;

// Función auxiliar para convertir a array
function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export interface FilterOptions {
  customers: Array<{ id: string; name: string }>;
  services: Service[];
  employees: Array<{ id: string; name: string }>;
  equipment: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string; customer_service_id: string }>;
  customerEquipments: Array<{ id: string; name: string; customer_id: string }>;
  areas: Array<{ id: string; name: string; customer_id: string }>;
  sectors: Array<{ id: string; name: string; customer_id?: string }>; // customer_id es opcional
}

// Funciones individuales para cada recurso
export async function getFilterCustomers() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from('customers').select('id, name').order('name').eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function getFilterServices() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('customer_services')
    .select('id, service_name, customer_id')
    .order('service_name')
    .eq('is_active', true);
  if (error) throw error;
  return (data || []).map((s) => ({
    id: s.id,
    name: s.service_name,
    customer_id: s.customer_id,
  }));
}

export async function getFilterEmployees() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('employees')
    .select('id, firstname, lastname')
    .order('firstname')
    .eq('is_active', true);
  if (error) throw error;
  return (data || []).map((e) => ({
    id: e.id,
    name: `${e.firstname || ''} ${e.lastname || ''}`.trim(),
  }));
}

export async function getFilterEquipment() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, intern_number, domain')
    .order('intern_number')
    .eq('is_active', true);
  if (error) throw error;
  return (data || []).map((v) => ({
    id: v.id,
    name: [v.intern_number, v.domain].filter(Boolean).join(' - '),
  }));
}

export async function getFilterItems() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('service_items')
    .select('id, item_name, customer_service_id')
    .order('item_name')
    .eq('is_active', true);
  if (error) throw error;
  return (data || []).map((i) => ({
    id: i.id,
    name: i.item_name,
    customer_service_id: i.customer_service_id,
  }));
}

export async function getFilterCustomerEquipments() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from('equipos_clientes').select('id, name, customer_id').order('name');
  if (error) throw error;
  return (data || []).map((ce) => ({
    id: ce.id,
    name: ce.name,
    customer_id: ce.customer_id,
  }));
}

export async function getFilterAreas() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from('areas_cliente').select('id, nombre, customer_id').order('nombre');
  if (error) throw error;
  return (data || []).map((a: any) => ({
    id: a.id,
    name: a.nombre,
    customer_id: a.customer_id,
  }));
}

export async function getFilterSectors() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from('sectors').select('id, name').order('name');
  if (error) throw error;
  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    customer_id: undefined,
  }));
}

// Mantener la función original para compatibilidad (ahora usa las funciones individuales)
export async function getFilterOptions(): Promise<FilterOptions> {
  try {
    const [customers, services, employees, equipment, items, customerEquipments, areas, sectors] = await Promise.all([
      getFilterCustomers(),
      getFilterServices(),
      getFilterEmployees(),
      getFilterEquipment(),
      getFilterItems(),
      getFilterCustomerEquipments(),
      getFilterAreas(),
      getFilterSectors(),
    ]);

    return {
      customers,
      services: services as any,
      employees,
      equipment,
      items,
      customerEquipments,
      areas,
      sectors,
    };
  } catch (error) {
    console.error('Error in getFilterOptions:', error);
    return {
      customers: [],
      services: [],
      employees: [],
      equipment: [],
      items: [],
      customerEquipments: [],
      areas: [],
      sectors: [],
    };
  }
}

export async function getServicesByCustomer(customerId: string) {
  const supabase = supabaseBrowser();
  try {
    const { data, error } = await supabase
      .from('customer_services')
      .select('id, service_name, customer_id')
      .eq('customer_id', customerId)
      .order('service_name', { ascending: true });

    if (error) throw error;

    return (data || []).map((service) => ({
      id: service.id,
      name: service.service_name,
      customer_id: service.customer_id,
    }));
  } catch (error) {
    console.error('Error in getServicesByCustomer:', error);
    return [];
  }
}
