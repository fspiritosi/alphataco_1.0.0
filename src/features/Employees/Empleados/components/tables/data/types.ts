import { fetchAllEmployees } from '@/shared/actions/employees.actions';

// Tipo base para los datos que vienen de la API
export type EmployeeBaseData = Awaited<ReturnType<typeof fetchAllEmployees>>[number];

// Tipo para compatibilidad — el componente que consume esto usa 'as any' internamente
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EmployeeTableData = EmployeeBaseData & { fullName?: string; [key: string]: any };
