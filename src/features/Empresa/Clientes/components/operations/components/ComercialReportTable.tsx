'use client'; // Asegúrate de que esto esté en la primera línea

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

interface ComercialReportTableProps {
  dailyReports: ProcessedRow[];
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

  // Definimos las columnas de la tabla
  const columns: ColumnDef<ProcessedRow>[] = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => {
        return <span className="whitespace-nowrap">{formatDate(row.original.date)}</span>;
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue?.from || !filterValue?.to) return true;

        const rowDate = new Date(row.getValue(columnId));
        const fromDate = new Date(filterValue.from);
        const toDate = new Date(filterValue.to);

        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        return rowDate >= fromDate && rowDate <= toDate;
      },
    },
    {
      accessorKey: 'customer',
      header: 'Cliente',
      cell: ({ row }) => <span className="font-medium">{row.original.customer}</span>,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) return true;
          const value = row.original.customer || '';
          return filterValue.some((fv) => String(value).toLowerCase() === String(fv).toLowerCase());
        }
        const value = row.original.customer || '';
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      },
    },
    {
      accessorKey: 'type_service',
      header: 'Tipo de Servicio',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.type_service?.replaceAll('_', ' ') || 'N/A'}
        </Badge>
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) return true;
          const value = row.original.type_service || '';
          return filterValue.some((fv) => String(value).toLowerCase() === String(fv).toLowerCase());
        }
        const value = row.original.type_service || '';
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      },
    },
    {
      accessorKey: 'item',
      header: 'Ítem',
      cell: ({ row }) => <span className="font-medium">{row.original.item || 'N/A'}</span>,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = ((row.getValue(columnId) as string) || '').toLowerCase();
        return value.includes(filterValue.toString().toLowerCase());
      },
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="line-clamp-1 max-w-[200px] text-ellipsis">
                {row.original.description || 'Sin descripción'}
              </span>
            </TooltipTrigger>
            {row.original.description && (
              <TooltipContent className="max-w-[300px]">
                <p className="whitespace-pre-wrap">{row.original.description}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = ((row.getValue(columnId) as string) || '').toLowerCase();
        return value.includes(filterValue.toString().toLowerCase());
      },
    },
    {
      accessorKey: 'employees',
      header: 'Empleados',
      cell: ({ row }) => {
        const employees = row.original.employees || [];
        if (employees.length === 0) {
          return <span className="text-muted-foreground">Sin asignar</span>;
        }
        const [first, ...rest] = employees;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Badge variant="outline" className="whitespace-nowrap cursor-pointer">
                    {first} {rest.length > 0 ? `+${rest.length}` : ''}
                  </Badge>
                </div>
              </TooltipTrigger>
              {rest.length > 0 && (
                <TooltipContent className="max-w-[300px]">
                  <div className="flex flex-col gap-1">
                    {employees.map((emp, idx) => (
                      <span key={idx}>{emp}</span>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const employees = row.original.employees || [];
        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) return true;
          return employees.some((emp) =>
            filterValue.some((fv) => String(emp).toLowerCase() === String(fv).toLowerCase())
          );
        }
        const searchTerm = filterValue.toString().toLowerCase();
        return employees.some((emp) => emp.toLowerCase().includes(searchTerm));
      },
    },
    {
      accessorKey: 'equipment',
      header: 'Equipos',
      cell: ({ row }) => {
        const equipment = row.original.equipment || [];
        if (equipment.length === 0) {
          return <span className="text-muted-foreground">Sin asignar</span>;
        }
        const [first, ...rest] = equipment;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Badge variant="outline" className="whitespace-nowrap cursor-pointer">
                    {first} {rest.length > 0 ? `+${rest.length}` : ''}
                  </Badge>
                </div>
              </TooltipTrigger>
              {rest.length > 0 && (
                <TooltipContent className="max-w-[300px]">
                  <div className="flex flex-col gap-1">
                    {equipment.map((eq, idx) => (
                      <span key={idx}>{eq}</span>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const equipment = row.original.equipment || [];
        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) return true;
          return equipment.some((eq) =>
            filterValue.some((fv) => String(eq).toLowerCase() === String(fv).toLowerCase())
          );
        }
        return equipment.some((eq) => eq.toLowerCase().includes(filterValue.toLowerCase()));
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = (row.original.status || 'pendiente') as StatusKey;
        const variant = statusVariantMap[status] || 'secondary';
        const formattedStatus = status.replaceAll('_', ' ');

        return (
          <Badge variant={variant as any} className="capitalize">
            {formattedStatus}
          </Badge>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) return true;
          const value = row.original.status || '';
          return filterValue.some((fv) => String(value).toLowerCase() === String(fv).toLowerCase());
        }
        const value = row.original.status || '';
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      },
    },
  ];

  return (
    <BaseDataTable<ProcessedRow, unknown>
      columns={columns}
      data={filteredData}
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
