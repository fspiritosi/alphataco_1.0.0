'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye } from 'lucide-react';

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
  company_equipment: string[];
  customer_equipment: string[];
  services: string;
  working_day?: string;
  area?: string;
  sector?: string;
  remit_number?: string;
  document_url?: string;
}

interface ComercialReportTableProps {
  dailyReports: TableRow[];
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

function ComercialReportTable({ dailyReports }: ComercialReportTableProps) {
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

  // Definir las columnas filtrables con IDs que coincidan con accessorKey
  const filterableColumns = [
    {
      columnId: 'date',
      title: 'Rango de Fechas',
      type: 'date-range' as const, // Especificar como const para tipo literal
      showFrom: true,
      showTo: true,
      fromPlaceholder: 'Desde',
      toPlaceholder: 'Hasta',
      defaultValues: { from: null, to: null },
      filterFn: (row: TableRow, columnId: string, filterValue: { from?: Date | string; to?: Date | string }) => {
        if (!filterValue?.from || !filterValue?.to) return true;
        try {
          const rowDate = new Date(row.date);
          const fromDate = new Date(filterValue.from);
          const toDate = new Date(filterValue.to);
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(23, 59, 59, 999);
          return rowDate >= fromDate && rowDate <= toDate;
        } catch (error) {
          console.error('Error al filtrar por fecha:', error);
          return true;
        }
      },
    },
    {
      columnId: 'customer',
      title: 'Cliente',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(new Set(dailyReports.map((r) => r.customer).filter((s): s is string => Boolean(s)))).map(
        (customer) => ({
          label: customer,
          value: customer,
        })
      ),
    },
    {
      columnId: 'type_service',
      title: 'Tipo de Servicio',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(new Set(dailyReports.map((r) => r.type_service).filter((s): s is string => Boolean(s)))).map(
        (type) => ({
          label: type,
          value: type,
        })
      ),
    },
    {
      columnId: 'status',
      title: 'Estado',
      type: 'select' as const, // Agregar tipo explícito
      options: Object.entries(statusVariantMap).map(([key, _]) => ({
        label: key.replace('_', ' '),
        value: key,
      })),
    },
    {
      columnId: 'employees',
      title: 'Empleados',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(
        new Set(dailyReports.flatMap((r) => r.employees || []).filter((s): s is string => Boolean(s)))
      ).map((employee) => ({
        label: employee,
        value: employee,
      })),
    },
    {
      columnId: 'company_equipment',
      title: 'Equipos de la Empresa',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(
        new Set(dailyReports.flatMap((r) => r.company_equipment || []).filter((s): s is string => Boolean(s)))
      ).map((equipment) => ({
        label: equipment,
        value: equipment,
      })),
    },
    {
      columnId: 'customer_equipment',
      title: 'Equipos del Cliente',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(
        new Set(dailyReports.flatMap((r) => r.customer_equipment || []).filter((s): s is string => Boolean(s)))
      ).map((equipment) => ({
        label: equipment,
        value: equipment,
      })),
    },
    {
      columnId: 'services',
      title: 'Servicios',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(new Set(dailyReports.map((r) => r.services).filter((s): s is string => Boolean(s)))).map(
        (service) => ({
          label: service,
          value: service,
        })
      ),
    },
    {
      columnId: 'working_day',
      title: 'Jornada',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(new Set(dailyReports.map((r) => r.working_day).filter((s): s is string => Boolean(s)))).map(
        (day) => ({
          label: day,
          value: day,
        })
      ),
    },
    {
      columnId: 'area',
      title: 'Área',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(new Set(dailyReports.map((r) => r.area).filter((s): s is string => Boolean(s)))).map(
        (area) => ({
          label: area,
          value: area,
        })
      ),
    },
    {
      columnId: 'sector',
      title: 'Sector',
      type: 'select' as const, // Agregar tipo explícito
      options: Array.from(new Set(dailyReports.map((r) => r.sector).filter((s): s is string => Boolean(s)))).map(
        (sector) => ({
          label: sector,
          value: sector,
        })
      ),
    },
  ];

  const columns: ColumnDef<TableRow>[] = [
    {
      id: 'date',
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
        const date = new Date(row.getValue('date'));
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

        const rowDateOnly = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
        const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

        return rowDateOnly >= fromDateOnly && rowDateOnly <= toDateOnly;
      },
    },
    {
      id: 'customer',
      accessorKey: 'customer',
      header: 'Cliente',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'type_service',
      accessorKey: 'type_service',
      header: 'Tipo de Servicio',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'item',
      accessorKey: 'item',
      header: 'Ítem',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status') as StatusKey;
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
      id: 'start_time',
      accessorKey: 'start_time',
      header: 'Inicio',
      cell: ({ row }) => {
        const time = row.original.start_time;
        return <div>{time ? String(time) : '-'}</div>;
      },
    },
    {
      id: 'end_time',
      accessorKey: 'end_time',
      header: 'Fin',
      cell: ({ row }) => {
        const time = row.original.end_time;
        return <div>{time ? String(time) : '-'}</div>;
      },
    },
    {
      id: 'employees',
      accessorKey: 'employees',
      header: 'Empleados',
      cell: ({ row }) => {
        const employees = row.getValue('employees') as string[];
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
      id: 'company_equipment',
      accessorKey: 'company_equipment',
      header: 'Equipos Propios',
      cell: ({ row }) => {
        const equipment = row.original.company_equipment || [];
        return <ListWithTooltip items={equipment} />;
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const equipment = row.getValue(id) as string[];
        const searchValue = String(value).toLowerCase();
        return equipment.some((eq) => eq.toLowerCase().includes(searchValue));
      },
    },
    {
      id: 'customer_equipment',
      accessorKey: 'customer_equipment',
      header: 'Equipos Cliente',
      cell: ({ row }) => {
        const equipment = row.original.customer_equipment || [];
        return <ListWithTooltip items={equipment} />;
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const equipment = row.getValue(id) as string[];
        const searchValue = String(value).toLowerCase();
        return equipment.some((eq) => eq.toLowerCase().includes(searchValue));
      },
    },
    {
      id: 'services',
      accessorKey: 'services',
      header: 'Servicios',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'working_day',
      accessorKey: 'working_day',
      header: 'Jornada',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'area',
      accessorKey: 'area',
      header: 'Área',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'sector',
      accessorKey: 'sector',
      header: 'Sector',
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'remit_number',
      accessorKey: 'remit_number',
      header: 'Remito N°',
      cell: ({ row }) => {
        const remito = row.original.remit_number;
        return <div>{remito || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const rowValue = row.original.remit_number || '';
        return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'document_url',
      accessorKey: 'document_url',
      header: 'Documento',
      cell: ({ row }) => {
        const url = row.original.document_url;
        return url ? (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                window.open(url, '_blank');
              }}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Ver documento</span>
            </Button>
          </div>
        ) : (
          <span>-</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <BaseDataTable
        columns={columns}
        data={dailyReports} // Usar datos originales, no filtrados
        savedVisibility={{}}
        tableId="comercial-report-table"
        onRowClick={(row) => {
          if (row.document_url) {
            window.open(row.document_url, '_blank');
          }
        }}
        className="w-full"
        row_classname={(row) => 'cursor-pointer hover:bg-gray-50'}
        toolbarOptions={{
          filterableColumns: filterableColumns as any,
          searchableColumns: [{ columnId: 'description', placeholder: 'Buscar en descripción...' }],
          initialVisibleFilters: ['date', 'customer'],
          showFilterOptions: true,
          showViewOptions: true,
        }}
      />
    </div>
  );
}

export default ComercialReportTable;
