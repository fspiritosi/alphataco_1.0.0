'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Clock, Eye, History, UserRoundCog, XCircle, type LucideIcon } from 'lucide-react';
import moment from 'moment';
import type { MaintenanceRequestListItem } from './actions/actionsTableServer';

// ============================================================================
// CONSTANTES DE STATUS
// ============================================================================

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_scheduling: 'Pend. Programación',
  scheduled: 'Programada',
  date_confirmed: 'Fecha Confirmada',
  date_rejected: 'Fecha Rechazada',
  in_workshop: 'En Taller',
  completed: 'Completada',
  rejected: 'Rechazada',
};

export const SOURCE_LABELS: Record<string, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
  preventive: 'Preventivo',
};

type BadgeVariant = 'warning' | 'success' | 'destructive' | 'secondary' | 'default';

export const REQUEST_STATUS_BADGE: Record<string, BadgeVariant> = {
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

export const ORDER_STATUS_BADGE: Record<string, BadgeVariant> = {
  pending_scheduling: 'secondary',
  scheduled: 'warning',
  date_confirmed: 'success',
  date_rejected: 'destructive',
  in_workshop: 'default',
  completed: 'success',
  rejected: 'destructive',
};

export const STATUS_ICONS: Record<string, LucideIcon> = {
  pending_approval: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

// ============================================================================
// COLUMNAS OCULTAS POR DEFECTO
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['source', 'kilometer', 'engine_hours'];

// ============================================================================
// PROPS DE COLUMNAS
// ============================================================================

interface ColumnsProps {
  onView: (request: MaintenanceRequestListItem) => void;
  onApprove: (request: MaintenanceRequestListItem) => void;
  onReject: (request: MaintenanceRequestListItem) => void;
  onViewHistory: (request: MaintenanceRequestListItem) => void;
  onReassign?: (request: MaintenanceRequestListItem) => void;
  canApproveReject?: boolean;
}

// ============================================================================
// FUNCIÓN DE COLUMNAS
// ============================================================================

export function getMaintenanceRequestColumns({
  onView,
  onApprove,
  onReject,
  onViewHistory,
  onReassign,
  canApproveReject = false,
}: ColumnsProps): ColumnDef<MaintenanceRequestListItem>[] {
  return [
    // Equipo (vehicle FK)
    {
      id: 'vehicle',
      accessorFn: (row) => {
        const v = row.vehicles;
        return v?.domain || v?.serie || 'Sin identificar';
      },
      meta: { title: 'Equipo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
      cell: ({ row }) => {
        const vehicle = row.original.vehicles;
        if (!vehicle) return <span className="text-muted-foreground">-</span>;
        const label = vehicle.domain || vehicle.serie || 'Sin identificar';
        return (
          <div className="flex flex-col">
            <span className="font-medium">{label}</span>
            {vehicle.intern_number && <span className="text-xs text-muted-foreground">#{vehicle.intern_number}</span>}
          </div>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const vehicleId = row.original.vehicles?.id;
        if (!vehicleId) return value.includes(NULL_FILTER_VALUE);
        return value.includes(vehicleId);
      },
      enableSorting: true,
    },

    // Fecha de Solicitud
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { title: 'Fecha Solicitud' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Solicitud" />,
      cell: ({ row }) => {
        const date = row.original.created_at;
        if (!date) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-col">
            <span>{moment(date).format('DD/MM/YYYY')}</span>
            <span className="text-xs text-muted-foreground">{moment(date).format('HH:mm')}</span>
          </div>
        );
      },
      enableSorting: true,
    },

    // Items / Desvíos
    {
      id: 'items_count',
      accessorFn: (row) => row.maintenance_request_items?.length ?? 0,
      meta: { title: 'Desvíos' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Desvíos" />,
      cell: ({ row }) => {
        const items = row.original.maintenance_request_items || [];
        return (
          <Badge variant="secondary">
            {items.length} {items.length === 1 ? 'desvío' : 'desvíos'}
          </Badge>
        );
      },
      enableSorting: false,
    },

    // Chofer / Empleado
    {
      id: 'driver',
      accessorFn: (row) => {
        const answerData = row.checklist_answers?.answer_data as { chofer?: string } | null;
        if (answerData?.chofer) return answerData.chofer;
        const employee = row.employees;
        if (employee) return `${employee.firstname} ${employee.lastname}`;
        return '';
      },
      meta: { title: 'Chofer' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chofer" />,
      cell: ({ row }) => {
        const answerData = row.original.checklist_answers?.answer_data as { chofer?: string } | null;
        if (answerData?.chofer) {
          return <span>{answerData.chofer}</span>;
        }
        const employee = row.original.employees;
        if (employee) {
          return (
            <div className="flex flex-col">
              <span>
                {employee.lastname} {employee.firstname}
              </span>
              {employee.file && <span className="text-xs text-muted-foreground">Leg. {employee.file}</span>}
            </div>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
      enableSorting: false,
    },

    // Supervisor
    {
      id: 'supervisor',
      accessorFn: (row) => row.profile_maintenance_requests_supervisor_idToprofile?.fullname || '',
      meta: { title: 'Supervisor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Supervisor" />,
      cell: ({ row }) => {
        const supervisor = row.original.profile_maintenance_requests_supervisor_idToprofile;
        if (!supervisor) return <span className="text-muted-foreground">Sin asignar</span>;
        return <span>{supervisor.fullname}</span>;
      },
      filterFn: (row, _id, value: string[]) => {
        const supervisorId = row.original.supervisor_id;
        if (!supervisorId) return value.includes(NULL_FILTER_VALUE);
        return value.includes(supervisorId);
      },
      enableSorting: false,
    },

    // Estado (con lógica dual: approved → estado del pedido; sino → estado de la solicitud)
    {
      id: 'status',
      accessorKey: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const maintenanceOrder = row.original.maintenance_orders?.[0];
        const orderStatus = maintenanceOrder?.status;

        // Si la solicitud está aprobada, mostrar el estado del pedido de mantenimiento
        if (status === 'approved' && orderStatus) {
          const label = ORDER_STATUS_LABELS[orderStatus] ?? orderStatus;
          const variant = ORDER_STATUS_BADGE[orderStatus] ?? 'secondary';
          return <Badge variant={variant}>{label}</Badge>;
        }

        // Mostrar estado de la solicitud
        const label = REQUEST_STATUS_LABELS[status] ?? status;
        const variant = REQUEST_STATUS_BADGE[status] ?? 'secondary';
        const Icon = STATUS_ICONS[status];
        return (
          <Badge variant={variant} className="flex items-center gap-1 w-fit">
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
      enableSorting: true,
    },

    // Fuente (checklist / manual)
    {
      id: 'source',
      accessorKey: 'source',
      meta: { title: 'Origen' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Origen" />,
      cell: ({ row }) => {
        const source = row.original.source;
        if (!source) return <span className="text-muted-foreground">-</span>;
        return <span>{SOURCE_LABELS[source] ?? source}</span>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
      enableSorting: true,
    },

    // Kilometraje (hidden by default)
    {
      id: 'kilometer',
      accessorKey: 'kilometer',
      meta: { title: 'Kilometraje' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kilometraje" />,
      cell: ({ row }) => {
        const km = row.original.kilometer;
        if (!km) return <span className="text-muted-foreground">-</span>;
        return <span>{km} km</span>;
      },
      enableSorting: false,
    },

    // Horas de motor (hidden by default)
    {
      id: 'engine_hours',
      accessorKey: 'engine_hours',
      meta: { title: 'Horas Motor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Horas Motor" />,
      cell: ({ row }) => {
        const hours = row.original.engine_hours;
        if (!hours) return <span className="text-muted-foreground">-</span>;
        return <span>{hours} hs</span>;
      },
      enableSorting: false,
    },

    // Acciones
    {
      id: 'actions',
      meta: { title: '', excludeFromExport: true },
      header: '',
      cell: ({ row }) => {
        const request = row.original;
        const isPending = request.status === 'pending_approval';

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onView(request)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewHistory(request)}
              title="Ver historial"
              className="text-blue-600 hover:text-blue-700"
            >
              <History className="h-4 w-4" />
            </Button>
            {isPending && canApproveReject && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onApprove(request)}
                  title="Aprobar"
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReject(request)}
                  title="Rechazar"
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                {onReassign && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onReassign(request)}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <UserRoundCog className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reasignar supervisor</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
