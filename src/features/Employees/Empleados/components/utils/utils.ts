import { fetchAllEmployees } from '@/shared/actions/employees.actions';

export const formatEmployeesForTable = (employees: Awaited<ReturnType<typeof fetchAllEmployees>>) => {
  return employees?.map((employee) => ({
    ...employee,
    fullName: `${employee.lastname} ${employee.firstname}`,
    city: employee?.cities?.name,
    province: employee?.provinces?.name,
    country: employee?.countries?.name,
    hierarchical_position: employee?.hierarchy?.name,
    company_position: employee?.company_positions?.name,
    workflow_diagram: employee?.work_diagram?.name,
    contractor_employee: employee?.contractor_employee,
    cost_center_name: employee?.cost_center?.name,
  }));
};

// Función utilitaria para crear opciones de filtro a partir de una propiedad simple
export const createFilterOptions = <T extends any>(
  data: T[] | undefined,
  accessor: (item: T) => any,
  icon?: React.ComponentType<{ className?: string }>
) => {
  return Array.from(new Set(data?.map(accessor).filter(Boolean))).map((value) => ({
    label: typeof value === 'string' ? value.replaceAll('_', ' ') : value || '',
    value: value || '',
    icon,
  }));
};
