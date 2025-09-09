import { supabase } from '@/../supabase/supabase';

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

export async function getAllDailyReportRows(): Promise<ProcessedDailyReportRow[]> {
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
    (report.dailyreportrows || []).map((row: DailyReportRow) => ({
      ...row,
      date: report.date,
      remit_number: row.remit_number,
    }))
  );

  return processedData;
}

export interface ReportFilters {
  customer?: string | string[];
  service?: string | string[];
  status?: string | string[];
  employee?: string | string[];
  equipment?: string | string[];
  item?: string | string[];
  dateFrom?: string;
  dateTo?: string;
}

// Helper function to convert string or string[] to string[]
const toArray = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

export async function getFilteredDailyReportRows(filters: ReportFilters = {}) {
  try {
    let query = supabase
      .from('dailyreportrows')
      .select(
        `
        *,
        document_path,
        dailyreport_customer_equipment_relations(*, equipos_clientes(*) ),
        service_sectors(*, sectors(*) ),
        service_areas(*, areas_cliente(*) ),
        customer_services(id, service_name, customer_id),
        service_items(id, item_name),
        remit_number,
        customers(id, name),
        dailyreportemployeerelations(employees(id, firstname, lastname)),
        dailyreportequipmentrelations(vehicles(id, intern_number, domain)),
        dailyreport!inner(date)
      `
      )
      .order('date', { foreignTable: 'dailyreport', ascending: false });

    // Handle customer filter (array or comma-separated string)
    const customerIds = toArray(filters.customer);
    if (customerIds.length > 0) {
      query = query.in('customer_id', customerIds);
    }

    // Handle service filter (array or comma-separated string)
    const serviceIds = toArray(filters.service);
    if (serviceIds.length > 0) {
      query = query.in('service_id', serviceIds);
    }

    // Handle item filter (array or comma-separated string)
    const itemIds = toArray(filters.item);
    if (itemIds.length > 0) {
      query = query.in('item_id', itemIds);
    }

    // Handle status filter (array or comma-separated string)
    const statuses = toArray(filters.status);
    if (statuses.length > 0) {
      const statusValues = statuses.map((s) => s.toLowerCase());
      query = query.in('status', statusValues);
    }

    // Handle employee filter (array or comma-separated string)
    const employeeIds = toArray(filters.employee);
    if (employeeIds.length > 0) {
      query = query.in('dailyreportemployeerelations.employees.id', employeeIds);
    }

    // Handle equipment filter (array or comma-separated string)
    const equipmentIds = toArray(filters.equipment);
    if (equipmentIds.length > 0) {
      query = query.in('dailyreportequipmentrelations.vehicles.id', equipmentIds);
    }

    // Date range filters
    if (filters.dateFrom) {
      const startDate = new Date(filters.dateFrom);
      query = query.gte('dailyreport.date', startDate.toISOString().split('T')[0]);
    }

    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('dailyreport.date', endDate.toISOString().split('T')[0]);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    // Process the data to ensure proper employee array format and date handling
    const processedRows = (rows || []).map((row: any) => {
      // Map employees to string[]
      const employees: string[] = (row.dailyreportemployeerelations || [])
        .map((rel: any) => (rel?.employees ? `${rel.employees.firstname} ${rel.employees.lastname}`.trim() : ''))
        .filter(Boolean);

      // Map company equipment (vehicles) to string[]: intern_number - domain
      const company_equipment: string[] = (row.dailyreportequipmentrelations || [])
        .map((rel: any) => rel?.vehicles)
        .filter(Boolean)
        .map((v: any) => [v.intern_number, v.domain].filter(Boolean).join(' - '))
        .filter(Boolean);

      // Map customer equipment from dailyreport_customer_equipment_relations -> equipos_clientes
      const customer_equipment: string[] = (row.dailyreport_customer_equipment_relations || [])
        .map((rel: any) => rel?.equipos_clientes)
        .filter(Boolean)
        // Best-effort label depending on available fields
        .map((eq: any) => eq.name || eq.label || eq.description || eq.id)
        .filter(Boolean);

      return {
        ...row,
        // Keep date as YYYY-MM-DD string expected by the table
        date: row.dailyreport?.date,
        // Flatten fields expected by the table
        customer: row.customers?.name ?? '',
        item: row.service_items?.item_name ?? '',
        services: row.customer_services?.service_name ?? '',
        // Keep potential existing type_service from base row (selected by *)
        type_service: row.type_service ?? row.customer_services?.service_name ?? '',
        employees,
        company_equipment,
        customer_equipment,
      };
    });

    return processedRows;
  } catch (error) {
    console.error('Error in getFilteredDailyReportRows:', error);
    throw error;
  }
}

export interface FilterOptions {
  customers: Array<{ id: string; name: string }>;
  services: Service[];
  employees: Array<{ id: string; name: string }>;
  equipment: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string; customer_service_id: string }>;
}

export async function getFilterOptions(): Promise<FilterOptions> {
  try {
    const [customers, services, employees, vehicles, items] = await Promise.all([
      supabase.from('customers').select('id, name').order('name'),

      supabase.from('customer_services').select('id, service_name, customer_id').order('service_name'),

      supabase.from('employees').select('id, firstname, lastname').order('firstname'),

      supabase.from('vehicles').select('id, intern_number, domain').order('intern_number'),

      supabase.from('service_items').select('id, item_name, customer_service_id').order('item_name'),
    ]);

    return {
      customers: customers.data || [],
      services: (services.data || []).map((s) => ({
        id: s.id,
        name: s.service_name,
        customer_id: s.customer_id,
      })),
      employees: (employees.data || []).map((e) => ({
        id: e.id,
        name: `${e.firstname || ''} ${e.lastname || ''}`.trim(),
      })),
      equipment: (vehicles.data || []).map((v) => ({
        id: v.id,
        name: [v.intern_number, v.domain].filter(Boolean).join(' - '),
      })),
      items: (items.data || []).map((i) => ({
        id: i.id,
        name: i.item_name,
        customer_service_id: i.customer_service_id,
      })),
    };
  } catch (error) {
    console.error('Error in getFilterOptions:', error);
    return {
      customers: [],
      services: [],
      employees: [],
      equipment: [],
      items: [],
    };
  }
}

export async function getServicesByCustomer(customerId: string): Promise<Service[]> {
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
