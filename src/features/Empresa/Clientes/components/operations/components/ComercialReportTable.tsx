'use client'; // Asegúrate de que esto esté en la primera línea

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUpDown } from 'lucide-react';
import React, { useState } from 'react';

// Definimos el tipo para las filas del reporte diario
interface DailyReportRow {
  id: string;
  date: string;
  type_service?: string;
  customer?: string;
  employees?: string[];
  equipment?: string[];
  customer_equipment?: Array<{ name: string; type: string }>;
  services?: string;
  item?: string;
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  status?: string;
}

interface TableRow {
  id: string;
  date: string;
  customer: string;
  type_service: string;
  item: string;
  description: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  employees: string[];
  equipment: string[];
  services: string;
  working_day?: string;
  area?: string;
  sector?: string;
  remit_number?: string;
}

interface ComercialReportTableProps {
  dailyReports: TableRow[];
}

interface ProcessedRow {
  id: string;
  date: string;
  customer: string;
  type_service: string;
  item: string;
  description: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  employees: string[];
  equipment: string[];
  services: string;
}

// Mapeo de estados a variantes de badge
const statusVariantMap = {
  pendiente: 'secondary',
  en_progreso: 'warning',
  completado: 'success',
  ejecutado: 'success',
  reprogramado: 'warning',
  cancelado: 'destructive',
  sin_recursos_asignados: 'warning',
} as const;

type StatusKey = keyof typeof statusVariantMap;

// Definir una interfaz local que coincida con FilterableColumn
interface LocalFilterableColumn<TData> {
  columnId: string;
  title: string;
  type?: 'date-range' | 'select' | 'text';
  options?: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  placeholder?: string;
  // Propiedades específicas de date-range
  showFrom?: boolean;
  showTo?: boolean;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  defaultValues?: {
    from: Date | null;
    to: Date | null;
  };
  // Función de filtrado personalizada
  filterFn?: (row: TData, columnId: string, filterValue: any) => boolean;
}

function ComercialReportTable({ dailyReports }: ComercialReportTableProps) {
  // Función para formatear la fecha
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }, // Sort by date in descending order by default
  ]);
  console.log(dailyReports);
  // Manejador para cambios en los filtros de columna
  const handleColumnFiltersChange = (
    filters: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)
  ) => {
    if (typeof filters === 'function') {
      setColumnFilters(filters);
    } else {
      console.log('Filtros actualizados:', filters);
      setColumnFilters(filters);
    }
  };

  const filteredData = React.useMemo(() => {
    return dailyReports.filter((row) => {
      // Aplicar filtros de columna
      return columnFilters.every((filter) => {
        const value = row[filter.id as keyof ProcessedRow];
        if (value === undefined || value === null) return false;

        // Si es el filtro de fecha, aplicamos el filtro aquí
        if (filter.id === 'date' && filter.value) {
          try {
            const dateValue = new Date(row.date);
            const filterValue = filter.value as { from?: Date | string; to?: Date | string };
            const fromDate = filterValue.from ? new Date(filterValue.from) : null;
            const toDate = filterValue.to ? new Date(filterValue.to) : null;

            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            if (toDate) toDate.setHours(23, 59, 59, 999);

            if (fromDate && dateValue < fromDate) return false;
            if (toDate && dateValue > toDate) return false;
            return true;
          } catch (error) {
            console.error('Error al procesar fechas:', error);
            return true; // En caso de error, mostramos la fila
          }
        }

        if (Array.isArray(value)) {
          return value.some((v) => String(v).toLowerCase().includes(String(filter.value).toLowerCase()));
        }

        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      });
    });
  }, [dailyReports, columnFilters]);
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: es });
    } catch (error) {
      return dateString; // En caso de error, devolvemos el string original
    }
  };

  // Componente para mostrar listas con tooltip
  const ListWithTooltip = ({ items, maxItems = 2 }: { items: string[]; maxItems?: number }) => {
    if (!items || items.length === 0) {
      return <span className="text-muted-foreground">Sin asignar</span>;
    }

    const visibleItems = items.slice(0, maxItems);
    const hiddenCount = items.length - visibleItems.length;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-wrap gap-1">
              {visibleItems.map((item, index) => (
                <Badge key={index} variant="outline" className="whitespace-nowrap">
                  {item}
                </Badge>
              ))}
              {hiddenCount > 0 && (
                <Badge variant="outline" className="bg-muted">
                  +{hiddenCount} más
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[300px]">
            <div className="flex flex-col gap-1">
              {items.map((item, index) => (
                <span key={index}>{item}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  // Obtener valores únicos para los filtros
  const filterOptions = React.useMemo(() => {
    const types = new Set<string>();
    const customers = new Set<string>();

    filteredData.forEach((row) => {
      if (row.type_service) types.add(row.type_service);
      if (row.customer) customers.add(row.customer);
    });

    return {
      typeService: Array.from(types).map((type) => ({
        label: type,
        value: type,
      })),
      customers: Array.from(customers).map((customer) => ({
        label: customer,
        value: customer,
      })),
    };
  }, [filteredData]);

  // Definir las columnas filtrables
  const filterableColumns: LocalFilterableColumn<ProcessedRow>[] = [
    {
      columnId: 'date',
      title: 'Rango de Fechas',
      type: 'date-range',
      filterFn: (row: ProcessedRow, columnId: string, filterValue: { from?: Date | string; to?: Date | string }) => {
        if (!filterValue?.from || !filterValue?.to) return true;

        try {
          const rowDate = new Date(row.date);
          const fromDate = new Date(filterValue.from);
          const toDate = new Date(filterValue.to);

          // Ajustar las horas para cubrir todo el día
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(23, 59, 59, 999);

          return rowDate >= fromDate && rowDate <= toDate;
        } catch (error) {
          console.error('Error al filtrar por fecha:', error);
          return true; // En caso de error, mostramos la fila
        }
      },
      // Propiedades específicas para date-range
      showFrom: true,
      showTo: true,
      fromPlaceholder: 'Desde',
      toPlaceholder: 'Hasta',
      defaultValues: {
        from: null,
        to: null,
      },
    },
    {
      columnId: 'customer',
      title: 'Cliente',
      type: 'select',
      options: filterOptions.customers,
      placeholder: 'Seleccionar cliente...',
    },
    {
      columnId: 'type_service',
      title: 'Tipo de Servicio',
      type: 'select',
      options: filterOptions.typeService,
    },
    {
      columnId: 'status',
      title: 'Estado',
      type: 'select',
      options: Object.keys(statusVariantMap).map((key) => ({
        label: key.replace('_', ' '),
        value: key,
      })),
    },
  ];

  const columns: ColumnDef<TableRow>[] = [
    {
      id: 'Fecha',
      accessorKey: 'date',
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Fecha
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('Fecha'));
        // Add the timezone offset to get the correct local date
        const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
        return <div>{localDate.toLocaleDateString('es-AR')}</div>;
      },
      sortingFn: (rowA, rowB, columnId) => {
        const dateA = new Date(rowA.getValue(columnId));
        const dateB = new Date(rowB.getValue(columnId));
        return dateA.getTime() - dateB.getTime();
      },
      filterFn: (row, id, value) => {
        if (!value?.from || !value?.to) return true;
        const rowDate = new Date(row.getValue(id));
        const fromDate = new Date(value.from);
        const toDate = new Date(value.to);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        // Compare dates without timezone conversion
        const rowDateOnly = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
        const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
        return rowDateOnly >= fromDateOnly && rowDateOnly <= toDateOnly;
      },
    },
    {
      id: 'Cliente',
      accessorKey: 'customer',
      header: 'Cliente',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'Tipo de Servicio',
      accessorKey: 'type_service',
      header: 'Tipo de Servicio',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'Ítem',
      accessorKey: 'item',
      header: 'Ítem',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    // {
    //   id: "Descripción",
    //   accessorKey: "description",
    //   header: "Descripción",
    //   filterFn: (row, id, value) => {
    //     if (!value) return true;
    //     const rowValue = row.getValue(id) as string;
    //     return rowValue.toLowerCase().includes(String(value).toLowerCase());
    //   },
    // },
    {
      id: 'Estado',
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('Estado') as StatusKey;
        const variant = statusVariantMap[status] || 'default';
        return (
          <Badge variant={variant as any} className="capitalize">
            {status?.replace(/_/g, ' ')}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'Inicio',
      accessorKey: 'start_time',
      header: 'Inicio',
      cell: ({ row }) => {
        const time = row.original.start_time; // Access the original data directly
        return <div>{time ? String(time) : '-'}</div>;
      },
    },
    {
      id: 'Fin',
      accessorKey: 'end_time',
      header: 'Fin',
      cell: ({ row }) => {
        const time = row.original.end_time; // Access the original data directly
        return <div>{time ? String(time) : '-'}</div>;
      },
    },
    {
      id: 'Empleados',
      accessorKey: 'employees',
      header: 'Empleados',
      cell: ({ row }) => {
        const employees = row.getValue('Empleados') as string[];
        return (
          <div className="flex flex-col gap-1">
            {employees?.length > 0 ? (
              employees.map((emp, i) => (
                <div key={i} className="text-sm">
                  {emp}
                </div>
              ))
            ) : (
              <span>-</span>
            )}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const employees = row.getValue(id) as string[];
        const searchValue = String(value).toLowerCase();
        return employees.some((emp) => emp.toLowerCase().includes(searchValue));
      },
    },
    {
      id: 'Equipos',
      accessorKey: 'equipment',
      header: 'Equipos',
      cell: ({ row }) => {
        const equipment = row.getValue('Equipos') as string[];
        return (
          <div className="flex flex-col gap-1">
            {equipment?.length > 0 ? (
              equipment.map((eq, i) => (
                <div key={i} className="text-sm">
                  {eq}
                </div>
              ))
            ) : (
              <span>-</span>
            )}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const equipment = row.getValue(id) as string[];
        const searchValue = String(value).toLowerCase();
        return equipment.some((eq) => eq.toLowerCase().includes(searchValue));
      },
    },
    {
      id: 'Servicios',
      accessorKey: 'services',
      header: 'Servicios',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'Jornada',
      accessorKey: 'working_day',
      header: 'Jornada',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'Área',
      accessorKey: 'area',
      header: 'Área',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'Sector',
      accessorKey: 'sector',
      header: 'Sector',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'remito',
      accessorKey: 'remit_number',
      header: 'Remito N°',
      cell: ({ row }) => {
        const remito = row.original.remit_number; // Access the original data directly
        return <div>{remito || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.original.remit_number || ''; // Access the original data directly
        return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      },
    },
  ];
  return (
    <BaseDataTable<ProcessedRow, unknown>
      columns={columns}
      data={filteredData}
      // sorting={sorting}
      // onSortingChange={setSorting}
      // initialState={{
      //   sorting: [{ id: "date", desc: true }] // Ensure default sort is descending
      // }}
      savedVisibility={{}}
      toolbarOptions={{
        filterableColumns: filterableColumns as any[],
        initialVisibleFilters: ['date'],
        showFilterOptions: true,
        showViewOptions: true,
      }}
      onRowClick={(row) => {
        // Aquí puedes manejar el clic en una fila si es necesario
      }}
      className="w-full"
      row_classname={(row) => 'cursor-pointer hover:bg-gray-50'}
    />
  );
}

export default ComercialReportTable;
