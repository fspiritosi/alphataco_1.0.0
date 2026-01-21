'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import moment from 'moment';

// Tipo para cada fila de desvío aplanado
export interface DesvioRowData {
  id: string;
  orderId: string;
  // Info del equipo
  vehicleId: string;
  vehicleDomain: string | null;
  vehicleSerie: string | null;
  vehicleInternNumber: string | null;
  vehicleType: string | null;
  vehicleCondition: string | null;
  // Info del desvío
  deviationId: string | null;
  itemLabel: string;
  itemCode: string | null;
  sectionCode: string | null;
  // Tipo de reparación
  repairTypeId: string | null;
  repairTypeName: string | null;
  // Info de la orden
  workshopEntryDate: string | null;
  kilometer: number | string | null;
  // Asignaciones
  workshopId: string | null;
  sectorId: string | null;
  startDate: string | null;
  endDate: string | null;
}

interface ColumnsProps {
  onAssign: (desvio: DesvioRowData) => void;
}

// Función para formatear el código de sección
const formatSectionCode = (code: string | null | undefined): string => {
  if (!code) return '-';
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function getColumns({ onAssign }: ColumnsProps): ColumnDef<DesvioRowData>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'vehicleDomain',
      id: 'Equipo',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const domain = row.original.vehicleDomain;
        const serie = row.original.vehicleSerie;
        const internNumber = row.original.vehicleInternNumber;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{domain || serie || 'Sin identificar'}</span>
            {internNumber && <span className="text-xs text-muted-foreground">#{internNumber}</span>}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const vehicleLabel = row.original.vehicleDomain || row.original.vehicleSerie || 'Sin identificar';
        return value.includes(vehicleLabel);
      },
      enableSorting: true,
    },
    {
      accessorKey: 'itemLabel',
      id: 'Desvio',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Desvío" />,
      cell: ({ row }) => {
        return (
          <div className="flex flex-col max-w-[250px]">
            <span className="font-medium truncate" title={row.original.itemLabel}>
              {row.original.itemLabel}
            </span>
            {row.original.itemCode && (
              <span className="text-xs text-muted-foreground">Código: {row.original.itemCode}</span>
            )}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'sectionCode',
      id: 'Seccion',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sección" />,
      cell: ({ row }) => {
        return <span>{formatSectionCode(row.original.sectionCode)}</span>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.sectionCode);
      },
      enableSorting: true,
    },
    {
      accessorKey: 'repairTypeName',
      id: 'TipoReparacion',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo Reparación" />,
      cell: ({ row }) => {
        const repairType = row.original.repairTypeName;
        if (!repairType) return <span className="text-muted-foreground">-</span>;
        return <Badge variant="outline">{repairType}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.repairTypeName);
      },
      enableSorting: true,
    },
    {
      accessorKey: 'workshopEntryDate',
      id: 'FechaEntrada',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entrada Taller" />,
      cell: ({ row }) => {
        const date = row.original.workshopEntryDate;
        if (!date) return <span className="text-muted-foreground">-</span>;
        return moment(date).format('DD/MM/YYYY');
      },
      enableSorting: true,
    },
    {
      accessorKey: 'workshopId',
      id: 'Estado',
      header: 'Estado Asignación',
      cell: ({ row }) => {
        const hasWorkshop = row.original.workshopId;
        const hasSector = row.original.sectorId;
        const hasDateRange = row.original.startDate && row.original.endDate;

        if (hasWorkshop && hasSector && hasDateRange) {
          return <Badge variant="success">Asignado</Badge>;
        } else if (hasWorkshop || hasSector) {
          return <Badge variant="warning">Parcial</Badge>;
        }
        return <Badge variant="secondary">Pendiente</Badge>;
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const desvio = row.original;

        return (
          <div className="flex items-center gap-2">
            <PermissionGuard module="mantenimiento" tab="planificacion" action="update">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAssign(desvio)}
                title="Asignar taller, sector y período"
                className="text-blue-600 hover:text-blue-700"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </PermissionGuard>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
