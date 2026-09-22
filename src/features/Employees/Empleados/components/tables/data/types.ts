import type { fetchAllEmployees } from '@/shared/actions/employees.actions';
import type { formatEmployeesForTable } from '../../utils/utils';

// Tipo base para los datos que vienen de la API
export type EmployeeBaseData = Awaited<ReturnType<typeof fetchAllEmployees>>[number];

/** Fila de la tabla: el empleado de la API más los campos derivados de `formatEmployeesForTable`. */
export type EmployeeTableData = ReturnType<typeof formatEmployeesForTable>[number];
