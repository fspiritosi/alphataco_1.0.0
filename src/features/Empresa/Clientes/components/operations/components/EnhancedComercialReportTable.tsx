'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DocumentUploadModal from '@/features/Operaciones/PartesDiarios/components/DocumentUploadModal';
import HistoryModal from '@/features/Operaciones/PartesDiarios/components/HistoryModal';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Edit, Eye } from 'lucide-react';
import { useCallback, useMemo } from 'react';
// Se ha modificado la interfaz para que customer_equipment acepte un array de objetos
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
  customer_equipment: {
    name: string;
    type: string;
    id: string;
    relacion_id: string;
  }[];
  services: string;
  working_day?: string;
  area?: string;
  sector?: string;
  remit_number?: string;
  document_url?: string;
}

interface EnhancedComercialReportTableProps {
  dailyReports: TableRow[];
  onEdit?: (row: TableRow) => void;
  onView?: (row: TableRow) => void;
  onViewHistory?: (row: TableRow) => void;
  showActions: boolean;
  filterableColumns?: any[];
  refetchDailyReports?: () => void;
}

// Mapeo de estados a variantes de badge
const statusVariantMap = {
  pendiente: 'secondary',
  ejecutado: 'success',
  reprogramado: 'warning',
  cancelado: 'destructive',
  en_certificacion: 'warning',
  sin_recursos_asignados: 'warning',
} as const;

type StatusKey = keyof typeof statusVariantMap;

export const EnhancedComercialReportTable: React.FC<EnhancedComercialReportTableProps> = ({
  dailyReports,
  onEdit,
  onView,
  onViewHistory,
  showActions,
  filterableColumns,
}) => {
  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    const baseColumns: ColumnDef<TableRow>[] = [
      {
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
          const date = row.original.date
            ? new Date(row.original.date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '';
          return <span className="font-medium">{date}</span>;
        },
        filterFn: (row, id, value) => {
          if (!value?.from && !value?.to) return true;
          try {
            const rowDate = new Date(row.original.date);
            const fromDate = value.from ? new Date(value.from) : new Date(0);
            const toDate = value.to ? new Date(value.to) : new Date();
            toDate.setHours(23, 59, 59, 999);
            return rowDate >= fromDate && rowDate <= toDate;
          } catch (error) {
            console.error('Error al filtrar por fecha:', error);
            return true;
          }
        },
      },
      {
        id: 'customer',
        accessorKey: 'customer',
        header: 'Cliente',
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const customer = row.original.customer;
          return value.includes(customer);
        },
      },
      {
        id: 'services',
        accessorKey: 'services',
        header: 'Servicio',
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const services = row.original.services;
          return value.includes(services);
        },
      },
      {
        id: 'item',
        accessorKey: 'item',
        header: 'Ítem',
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const item = row.original.item;
          return value.includes(item);
        },
      },
      {
        id: 'customer_equipment',
        accessorKey: 'customer_equipment',
        header: 'Equipo Cliente',
        // Se ha modificado el cell para mostrar la propiedad 'name' del objeto
        cell: ({ row }) => {
          const equipment = row.original.customer_equipment || [];
          return (
            <div className="flex flex-wrap gap-1">
              {equipment.map((eq, index) => (
                <Badge key={index} variant="secondary" className="rounded-sm">
                  {eq.name}
                </Badge>
              ))}
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const equipment = row.original.customer_equipment.map((eq) => eq.name);
          return equipment.some((eqName) => value.includes(eqName));
        },
      },
      {
        id: 'area',
        accessorKey: 'area',
        header: 'Área',
        cell: ({ row }) => {
          return row.original.area;
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const area = row.original.area;
          return value.includes(area);
        },
      },
      {
        id: 'sector',
        accessorKey: 'sector',
        header: 'Sector',
        cell: ({ row }) => {
          return row.original.sector;
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const sector = row.original.sector;
          return value.includes(sector);
        },
      },
      {
        id: 'type_service',
        accessorKey: 'type_service',
        header: 'Tipo de Servicio',
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const type = row.original.type_service;
          return value.includes(type);
        },
      },
      {
        id: 'remit_number',
        accessorKey: 'remit_number',
        header: 'N° de Remito',
        filterFn: (row, id, value) => {
          if (!value) return true;
          const remit = row.original.remit_number || '';
          return String(remit).toLowerCase().includes(String(value).toLowerCase());
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const status = row.original.status as StatusKey;
          const statusText =
            {
              pendiente: 'Pendiente',
              sin_recursos_asignados: 'Sin recursos asignados',
              ejecutado: 'Ejecutado',
              reprogramado: 'Reprogramado',
              cancelado: 'Cancelado',
              en_certificacion: 'En certificación',
            }[status] || status;

          const statusColors: Record<
            string,
            'default' | 'outline' | 'secondary' | 'destructive' | 'success' | 'warning' | null | undefined
          > = {
            pendiente: 'secondary',
            sin_recursos_asignados: 'warning',
            ejecutado: 'success',
            reprogramado: 'outline',
            cancelado: 'destructive',
            en_certificacion: 'default',
          };

          return <Badge variant={statusColors[status] || 'default'}>{statusText}</Badge>;
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const status = row.original.status;
          return value.includes(status);
        },
      },
      {
        id: 'employees',
        accessorKey: 'employees',
        header: 'Empleados',
        cell: ({ row }) => {
          const employees = row.original.employees || [];
          return (
            <div className="flex flex-wrap gap-1">
              {employees.map((employee, index) => (
                <Badge key={index} variant="secondary" className="rounded-sm">
                  {employee}
                </Badge>
              ))}
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const employees = row.original.employees || [];
          return employees.some((employee) => value.includes(employee));
        },
      },
      {
        id: 'equipment',
        accessorKey: 'equipment',
        header: 'Equipo Empresa',
        cell: ({ row }) => {
          const equipment = row.original.equipment || [];
          return (
            <div className="flex flex-wrap gap-1">
              {equipment.map((eq, index) => (
                <Badge key={index} variant="secondary" className="rounded-sm">
                  {eq}
                </Badge>
              ))}
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const equipment = row.original.equipment || [];
          return equipment.some((eq) => value.includes(eq));
        },
      },
      {
        id: 'working_day',
        accessorKey: 'working_day',
        header: 'Jornada',
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          const workingDay = row.original.working_day;
          return value.includes(workingDay);
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

    if (showActions) {
      baseColumns.push({
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const isEnCertificacion = row.original.status === 'en_certificacion';
          return (
            <div className="flex space-x-2">
              {onEdit && !isEnCertificacion && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(row.original as TableRow)}>
                        <Edit size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {onView && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onView(row.original as TableRow)}>
                        <Eye size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver detalles</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {onViewHistory && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HistoryModal onlyIcon dailyReportRowId={row.original.id} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver historial</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isEnCertificacion && <DocumentUploadModal documentData={row.original as any} />}
            </div>
          );
        },
      });
    }

    return baseColumns;
  }, [onEdit, onView, onViewHistory, showActions, filterableColumns]);

  const handleRowClick = useCallback((row: TableRow) => {
    if (row.document_url) {
      window.open(row.document_url, '_blank');
    }
  }, []);

  return (
    <div className="space-y-4">
      {dailyReports && dailyReports.length > 0 ? (
        <BaseDataTable
          columns={columns}
          data={dailyReports}
          savedVisibility={{}}
          tableId="enhanced-comercial-report-table"
          onRowClick={handleRowClick}
          className="w-full"
          row_classname={(row) => 'cursor-pointer hover:bg-gray-50'}
          toolbarOptions={{
            filterableColumns: filterableColumns as any,
            searchableColumns: [{ columnId: 'description', placeholder: 'Buscar en descripción...' }],
            initialVisibleFilters: ['customer', 'services', 'item'],
            showFilterOptions: true,
            showViewOptions: true,
          }}
        />
      ) : (
        <p>No hay registros</p>
      )}
    </div>
  );
};

export default EnhancedComercialReportTable;
