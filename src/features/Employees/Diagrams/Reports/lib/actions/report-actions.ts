import { Filter, queryWithPagination } from '@/app/server/GET/probando';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';

// Función específica para empleados (ejemplo)
export async function fetchEmployeesDiagramData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'employees_diagram'>[];
  server?: boolean;
}) {
  const data = await queryWithPagination(
    'employees_diagram',
    `  id,
      day,
      month,
      year,
      employees!inner(
        id,
        cuil,
        firstname,
        file,
        lastname,
        is_active,  
        company_positions(
          id,
          name
        )
      ),
      diagram_type!inner(
        id,
        name,
        color,
        short_description
      )`,
    {
      ...options,
      sorting: [
        ...options.sorting,
        {
          id: 'employees.lastname',
          desc: true,
        },
      ],
      columnFilters: [...options.columnFilters],
      filters: (options.filters || []).concat([
        {
          column: 'employees.is_active',
          operator: 'eq',
          value: true,
        },
      ]),
    }
  );
  const sortedData = data.rows.sort((a, b) => {
    // First sort by lastname
    const lastNameCompare = a.employees.lastname.localeCompare(b.employees.lastname);
    if (lastNameCompare !== 0) return lastNameCompare;

    // Then sort by date (most recent first)
    const dateA = new Date(a.year, a.month - 1, a.day);
    const dateB = new Date(b.year, b.month - 1, b.day);
    return dateB.getTime() - dateA.getTime(); // Descending order for date
  });

  return {
    ...data,
    data: sortedData,
  };
}
export async function fetchAllReportData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'employees_diagram'>[];
  server?: boolean;
}) {
  const data = await queryWithPagination(
    'employees_diagram',
    `  id,
      day,
      month,
      year,
      employees!inner(
        id,
        cuil,
        firstname,
        file,
        lastname,
        is_active,  
        company_positions(
          id,
          name
        )
      ),
      diagram_type!inner(
        id,
        name,
        color,
        short_description
      )`,
    {
      ...options,
      pageIndex: 0,
      pageSize: 10000, // Límite alto para obtener todos los datos
      sorting: [...options.sorting],
      columnFilters: [...options.columnFilters],
      filters: options.filters,
    }
  );
  const sortedData = data.rows.sort((a, b) => {
    // First sort by lastname
    const lastNameCompare = a.employees.lastname.localeCompare(b.employees.lastname);
    if (lastNameCompare !== 0) return lastNameCompare;

    // Then sort by date (most recent first)
    const dateA = new Date(a.year, a.month - 1, a.day);
    const dateB = new Date(b.year, b.month - 1, b.day);
    return dateB.getTime() - dateA.getTime(); // Descending order for date
  });
  return {
    ...data,
    data: sortedData,
  };
}
