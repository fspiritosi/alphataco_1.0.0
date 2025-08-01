'use server';
import { supabaseServer } from '@/lib/supabase/server';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';

export async function fetchDiagramReportsData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  console.log('🚀 fetchDiagramReportsData called with options:', {
    pageIndex: options.pageIndex,
    pageSize: options.pageSize,
    sorting: options.sorting,
    columnFilters: options.columnFilters,
  });

  const supabase = supabaseServer();

  // Calcular rango para paginación
  const from = options.pageIndex * options.pageSize;
  const to = from + options.pageSize - 1;

  // Buscar filtro de búsqueda de nombre de empleado (texto libre)
  const employeeSearchFilter = options.columnFilters?.find((f) => f.id === 'employee_cuil');
  const employeeSearchValue = employeeSearchFilter?.value as string;

  let searchEmployeeIds: string[] = [];

  // Si hay filtro de búsqueda de texto, buscar empleados que coincidan
  if (employeeSearchValue && typeof employeeSearchValue === 'string' && employeeSearchValue.trim()) {
    console.log('🔍 Buscando empleados con CUIL:', employeeSearchValue);

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id')
      .filter('cuil', 'ilike', `%${employeeSearchValue}%`);

    if (employeesError) {
      console.error('❌ Error buscando empleados:', employeesError);
      throw employeesError;
    }

    searchEmployeeIds = employees?.map((emp) => emp.id) || [];
    console.log('👥 Empleados encontrados por CUIL:', searchEmployeeIds.length);

    // Si no se encontraron empleados, retornar resultado vacío
    if (searchEmployeeIds.length === 0) {
      return {
        rows: [],
        pageCount: 0,
        rowCount: 0,
      };
    }
  }

  // Construir query base
  let query = supabase.from('employees_diagram').select(
    `
      id,
      day,
      month,
      year,
      employee_id!inner(
        id,
        cuil,
        firstname,
        lastname,
        company_position(
          id,
          name
        )
      ),
      diagram_type!inner(
        id,
        name,
        color,
        short_description
      )
    `,
    { count: 'exact' }
  );

  // Si hay filtro de búsqueda de CUIL, aplicar filtro de empleados encontrados
  if (searchEmployeeIds.length > 0) {
    query = query.in('employee_id', searchEmployeeIds);
  }

  // Aplicar otros filtros
  if (options.columnFilters) {
    for (const filter of options.columnFilters) {
      const { id, value } = filter;

      if (!value) continue;

      // Saltar filtros ya manejados arriba
      if (id === 'employee_cuil') {
        continue; // Ya se manejó arriba
      }

      // Filtros múltiples para empleados (por IDs)
      if (id === 'employee_name' && Array.isArray(value) && value.length > 0) {
        console.log('🔍 Aplicando filtro de empleados con IDs:', value);
        query = query.in('employee_id', value);
      }

      // Filtros múltiples para tipos de novedad (por nombre)
      if ((id === 'novelty_name' || id === 'Tipo') && Array.isArray(value) && value.length > 0) {
        console.log('🔍 Aplicando filtro de tipos de novedad:', { id, value });
        // Los valores son nombres de tipos de novedad
        const { data: noveltyTypes, error: noveltyError } = await supabase
          .from('diagram_type')
          .select('id')
          .in('name', value);

        if (!noveltyError && noveltyTypes) {
          const foundNoveltyIds = noveltyTypes.map((type) => type.id);
          console.log('📋 IDs de tipos de novedad encontrados:', foundNoveltyIds);
          if (foundNoveltyIds.length > 0) {
            query = query.in('diagram_type', foundNoveltyIds);
          } else {
            // Si no se encuentran tipos de novedad, retornar resultado vacío
            console.log('❌ No se encontraron tipos de novedad para:', value);
            return {
              rows: [],
              pageCount: 0,
              rowCount: 0,
            };
          }
        } else {
          console.error('❌ Error buscando tipos de novedad:', noveltyError);
        }
      }

      // Filtros múltiples para posiciones de empresa (por nombre)
      if (id === 'company_position' && Array.isArray(value) && value.length > 0) {
        console.log('🔍 Aplicando filtro de posiciones:', { id, value });
        // Los valores son nombres de posiciones
        const { data: positions, error: positionError } = await supabase
          .from('company_positions')
          .select('id')
          .in('name', value);

        if (!positionError && positions) {
          const foundPositionIds = positions.map((position) => position.id);
          console.log('📋 IDs de posiciones encontrados:', foundPositionIds);
          if (foundPositionIds.length > 0) {
            query = query.in('employee_id.company_position', foundPositionIds);
          } else {
            // Si no se encuentran posiciones, retornar resultado vacío
            console.log('❌ No se encontraron posiciones para:', value);
            return {
              rows: [],
              pageCount: 0,
              rowCount: 0,
            };
          }
        } else {
          console.error('❌ Error buscando posiciones:', positionError);
        }
      }

      // Filtros de rango de fechas
      if (id === 'date' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const dateRange = value as { from?: Date | null; to?: Date | null };
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          const fromYear = fromDate.getFullYear();
          const fromMonth = fromDate.getMonth() + 1;
          const fromDay = fromDate.getDate();

          query = query.or(
            `year.gt.${fromYear},and(year.eq.${fromYear},month.gt.${fromMonth}),and(year.eq.${fromYear},month.eq.${fromMonth},day.gte.${fromDay})`
          );
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          const toYear = toDate.getFullYear();
          const toMonth = toDate.getMonth() + 1;
          const toDay = toDate.getDate();

          query = query.or(
            `year.lt.${toYear},and(year.eq.${toYear},month.lt.${toMonth}),and(year.eq.${toYear},month.eq.${toMonth},day.lte.${toDay})`
          );
        }
      }
    }
  }

  // Aplicar ordenamiento
  if (options.sorting && options.sorting.length > 0) {
    for (const sort of options.sorting) {
      if (sort.id === 'employee_name') {
        query = query.order('employee_id.firstname', { ascending: !sort.desc });
      } else if (sort.id === 'employee_cuil') {
        query = query.order('employee_id.cuil', { ascending: !sort.desc });
      } else if (sort.id === 'date') {
        query = query
          .order('year', { ascending: !sort.desc })
          .order('month', { ascending: !sort.desc })
          .order('day', { ascending: !sort.desc });
      } else if (sort.id === 'novelty_name' || sort.id === 'Tipo') {
        query = query.order('diagram_type(name)', { ascending: !sort.desc });
      } else if (sort.id === 'company_position') {
        query = query.order('employee_id.company_position(name)', { ascending: !sort.desc });
      }
    }
  } else {
    // Ordenamiento por defecto
    query = query
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('day', { ascending: false });
  }

  // Aplicar paginación
  query = query.range(from, to);

  // Ejecutar query
  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const totalRows = count || 0;
  const pageCount = Math.ceil(totalRows / options.pageSize);

  // Transformar los datos
  const transformedData = (data || [])
    .map((item: any) => ({
      id: item.id,
      employee_cuil: item.employee_id.cuil,
      employee_name: `${item.employee_id.lastname} ${item.employee_id.firstname}`,
      company_position: item.employee_id.company_position?.name || 'Sin posición',
      date: `${item.day.toString().padStart(2, '0')}/${item.month.toString().padStart(2, '0')}/${item.year}`,
      novelty_name: item.diagram_type?.name || 'N/A',
      novelty_color: item.diagram_type?.color || '#000000',
      novelty_short_description: item.diagram_type?.short_description || 'N/A',
      is_active: true,
      day: item.day,
      month: item.month,
      year: item.year,
    }))
    .sort((a, b) => a.employee_name.localeCompare(b.employee_name));

  return {
    rows: transformedData,
    pageCount,
    rowCount: totalRows,
  };
}
