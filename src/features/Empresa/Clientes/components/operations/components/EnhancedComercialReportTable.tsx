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
  company_equipment: string[];
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

export const EnhancedComercialReportTable: React.FC<EnhancedComercialReportTableProps> = ({
  dailyReports,
  onEdit,
  onView,
  onViewHistory,
  showActions,
  filterableColumns,
  refetchDailyReports,
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
      },
      {
        accessorKey: 'customer',
        header: 'Cliente',
      },
      {
        accessorKey: 'services',
        header: 'Servicio',
      },
      {
        accessorKey: 'item',
        header: 'Ítem',
      },
      {
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
      },
      {
        accessorKey: 'area',
        header: 'Área',
        cell: ({ row }) => {
          return row.original.area;
        },
      },
      {
        accessorKey: 'sector',
        header: 'Sector',
        cell: ({ row }) => {
          return row.original.sector;
        },
      },
      {
        accessorKey: 'type_service',
        header: 'Tipo de Servicio',
      },
      {
        accessorKey: 'remit_number',
        header: 'N° de Remito',
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const status = row.original.status;
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
      },
      {
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
      },
      {
        accessorKey: 'company_equipment',
        header: 'Equipo Empresa',
        cell: ({ row }) => {
          const equipment = row.original.company_equipment || [];
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
  }, [onEdit, onView, onViewHistory, showActions, refetchDailyReports]);

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
            initialVisibleFilters: ['Fecha', 'Cliente'],
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
