import { Filter, queryWithPagination } from '@/app/server/GET/probando';

export type RpcFilter = {
  property: string;
  values: string[];
};

/**
 * Convierte filtros RPC a filtros de Supabase con permanent_filter
 * Esta función construye un filtro permanente basado en las condiciones
 */
export function buildPermanentFilter(filters: RpcFilter[]) {
  return (query: any) => {
    let filteredQuery = query;

    for (const filter of filters) {
      const { property, values } = filter;

      // Manejar propiedades anidadas (relaciones)
      if (property.includes('.')) {
        // Para relaciones como 'province.name', 'contractor_employee.customers.name'
        if (values.length > 0) {
          filteredQuery = filteredQuery.in(property, values);
        }
      } else {
        // Para propiedades directas
        if (values.length === 1) {
          filteredQuery = filteredQuery.eq(property, values[0]);
        } else if (values.length > 1) {
          filteredQuery = filteredQuery.in(property, values);
        }
      }
    }

    return filteredQuery;
  };
}

/**
 * Mapea las propiedades de empleados a sus accessor_keys para queries
 */
const employeePropertyMapping: Record<string, string> = {
  gender: 'gender',
  marital_status: 'marital_status',
  nationality: 'nationality',
  document_type: 'document_type',
  level_of_education: 'level_of_education',
  status: 'status',
  type_of_contract: 'types_of_contract.id',
  province: 'provinces.name',
  hierarchical_position: 'hierarchy.name',
  workflow_diagram: 'work_diagram.name',
  guild: 'guild.name',
  covenant: 'covenant.name',
  category: 'category.name',
  company_position: 'company_positions.name',
  contractor_employee: 'contractor_employee.customers.name',
};

/**
 * Mapea las propiedades de vehículos a sus accessor_keys para queries
 */
const vehiclePropertyMapping: Record<string, string> = {
  brand: 'brand_vehicles.name',
  model: 'model_vehicles.name',
  type: 'type.name',
  types_of_vehicles: 'types_of_vehicles.name',
  contractor_equipment: 'contractor_equipment.customers.name',
};

/**
 * Fetch empleados con filtros usando queryWithPagination
 */
export async function fetchEmployeesWithFiltersNew(companyId: string, filters: RpcFilter[]) {
  // Mapear los filtros a las propiedades correctas
  const mappedFilters = filters.map((f) => ({
    property: employeePropertyMapping[f.property] || f.property,
    values: f.values,
  }));

  const result = await queryWithPagination(
    'employees',
    'id,firstname,lastname,cuil,gender,marital_status,nationality,document_type,level_of_education,status,types_of_contract(id,name),provinces(id,name),hierarchy(id,name),work_diagram(id,name),company_positions(id,name),contractor_employee(customers(id,name))',
    {
      pageIndex: 0,
      pageSize: 10000, // Obtener todos los resultados
      is_active: true,
      permanent_filter: buildPermanentFilter(mappedFilters),
    }
  );

  return result.rows;
}

/**
 * Fetch vehículos con filtros usando queryWithPagination
 */
export async function fetchVehiclesWithFiltersNew(companyId: string, filters: RpcFilter[]) {
  // Mapear los filtros a las propiedades correctas
  const mappedFilters = filters.map((f) => ({
    property: vehiclePropertyMapping[f.property] || f.property,
    values: f.values,
  }));

  const result = await queryWithPagination(
    'vehicles',
    'id,domain,year,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(id,name))',
    {
      pageIndex: 0,
      pageSize: 10000, // Obtener todos los resultados
      is_active: true,
      permanent_filter: buildPermanentFilter(mappedFilters),
    }
  );

  return result.rows;
}

/**
 * Versión alternativa usando filtros tradicionales en lugar de permanent_filter
 */
export async function fetchEmployeesWithFiltersAlternative(companyId: string, filters: RpcFilter[]) {
  // Convertir RpcFilters a Filters de Supabase
  const supabaseFilters: Filter<'employees'>[] = filters.map((f) => ({
    column: f.property as any,
    operator: f.values.length === 1 ? 'eq' : 'in',
    value: f.values.length === 1 ? f.values[0] : f.values,
  }));

  const result = await queryWithPagination(
    'employees',
    'id,firstname,lastname,cuil,gender,marital_status,nationality,document_type,level_of_education,status,types_of_contract(id,name),provinces(id,name),hierarchy(id,name),work_diagram(id,name),company_positions(id,name),contractor_employee(customers(id,name))',
    {
      pageIndex: 0,
      pageSize: 10000,
      is_active: true,
      filters: [
        ...supabaseFilters,
        {
          column: 'is_active',
          operator: 'eq',
          value: true,
        },
      ],
    }
  );

  return result.rows;
}
