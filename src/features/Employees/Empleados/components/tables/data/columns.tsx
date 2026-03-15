'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { EmployeeTableData } from './types';

// Stub: columnas del sistema viejo (BaseDataTable, deprecado).
// El componente que usa esto (EmployeesTableReusable) pasa las columnas como 'any'.
export const employeeColumns: ColumnDef<EmployeeTableData>[] = [];
