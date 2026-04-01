'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import {
  dailyReportRowStatusBadges,
  dailyReportRowStatusLabels,
  dailyReportTypeServiceLabels,
} from '@/shared/utils/mappers';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CalendarOff, CheckCircle2 } from 'lucide-react';
import type { DailyReportDetailRow } from './types';

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = [
  'type_service',
  'sector',
  'area',
  'start_time',
  'end_time',
  'description',
  'remit_number',
  'completed_day',
  'completed_night',
  'customer_equipment',
];

// ============================================================================
// PERMISSIONS TYPE
// ============================================================================

type Permissions = {
  canUpdate: boolean;
  canDelete: boolean;
};

// ============================================================================
// ACTION HANDLERS TYPE
// ============================================================================

export type RowActionHandlers = {
  onViewDetail: (row: DailyReportDetailRow) => void;
  onEdit: (row: DailyReportDetailRow) => void;
  onHistory: (row: DailyReportDetailRow) => void;
  onRemitos: (row: DailyReportDetailRow) => void;
  onDelete: (row: DailyReportDetailRow) => void;
};

// ============================================================================
// EMPLOYEE BADGE CELL (with deviation detection)
// ============================================================================

function EmployeeBadgeCell({ row, reportDate }: { row: DailyReportDetailRow; reportDate: string }) {
  const relations = row.dailyreportemployeerelations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const first = relations[0];
  const employee = first?.employees;

  if (!employee) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const primaryLabel = `[${employee.file ?? '?'}] ${employee.lastname ?? ''} ${employee.firstname ?? ''}`.trim();
  const extraCount = relations.length - 1;

  // Deviation detection for the first employee
  // employees_diagram can be the full model (when reportDate is absent) OR
  // a custom select shape (when reportDate is present). We access the nested
  // diagram_type relation via a type cast to handle both.
  const diagram = employee.employees_diagram?.[0];
  const diagramRecord = diagram as
    | null
    | undefined
    | {
        diagram_type_employees_diagram_diagram_typeTodiagram_type?: {
          id?: string;
          name?: string | null;
          work_active?: boolean | null;
        } | null;
      };
  const diagramType = diagramRecord?.diagram_type_employees_diagram_diagram_typeTodiagram_type;

  let deviationBadge: React.ReactNode = null;
  if (!diagram) {
    deviationBadge = (
      <Badge variant="destructive" className="text-xs gap-1 px-1.5 py-0">
        <AlertTriangle className="h-3 w-3" />
        Sin diagrama
      </Badge>
    );
  } else if (diagramType && diagramType.work_active === false) {
    deviationBadge = (
      <Badge variant="yellow" className="text-xs gap-1 px-1.5 py-0">
        <CalendarOff className="h-3 w-3" />
        {diagramType.name ?? 'No laboral'}
      </Badge>
    );
  }

  // Build tooltip content for all employees
  const tooltipLines = relations.map((rel) => {
    const emp = rel.employees;
    if (!emp) return rel.employee_id ?? 'Desconocido';
    return `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
  });

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-xs font-normal">
              {primaryLabel}
            </Badge>
            {deviationBadge}
            {extraCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{extraCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        {relations.length > 1 && (
          <TooltipContent className="bg-black text-white rounded-lg p-2">
            <div className="flex flex-col gap-1 text-xs">
              {tooltipLines.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// EQUIPMENT BADGE CELL (vehicles + other_equipment)
// ============================================================================

function EquipmentBadgeCell({ row }: { row: DailyReportDetailRow }) {
  const relations = row.dailyreportequipmentrelations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const first = relations[0];
  const vehicle = first?.vehicles;
  const other = first?.other_equipment;

  let primaryLabel = '—';
  if (vehicle) {
    primaryLabel = vehicle.domain ?? vehicle.intern_number ?? 'Equipo';
  } else if (other) {
    primaryLabel = other.intern_number ?? other.serial_number ?? 'Equipo';
  }

  const extraCount = relations.length - 1;

  const tooltipLines = relations.map((rel) => {
    if (rel.vehicles) {
      const v = rel.vehicles;
      return `${v.domain ?? v.intern_number ?? 'Equipo'}${v.brand_vehicles?.name ? ` — ${v.brand_vehicles.name}` : ''}`;
    }
    if (rel.other_equipment) {
      const o = rel.other_equipment;
      return o.intern_number ?? o.serial_number ?? 'Equipo';
    }
    return 'Equipo';
  });

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-xs font-normal">
              {primaryLabel}
            </Badge>
            {extraCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{extraCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        {relations.length > 1 && (
          <TooltipContent className="bg-black text-white rounded-lg p-2">
            <div className="flex flex-col gap-1 text-xs">
              {tooltipLines.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// CUSTOMER EQUIPMENT BADGE CELL
// ============================================================================

function CustomerEquipmentBadgeCell({ row }: { row: DailyReportDetailRow }) {
  const relations = row.dailyreport_customer_equipment_relations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const first = relations[0];
  const equipo = first?.equipos_clientes;
  const primaryLabel = equipo?.name ?? 'Equipo cliente';
  const extraCount = relations.length - 1;

  const tooltipLines = relations.map((rel) => rel.equipos_clientes?.name ?? 'Equipo cliente');

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-xs font-normal">
              {primaryLabel}
            </Badge>
            {extraCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{extraCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        {relations.length > 1 && (
          <TooltipContent className="bg-black text-white rounded-lg p-2">
            <div className="flex flex-col gap-1 text-xs">
              {tooltipLines.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// COLUMNS DEFINITION
// ============================================================================

export function getColumns(
  permissions: Permissions,
  handlers: RowActionHandlers,
  reportDate: string
): ColumnDef<DailyReportDetailRow>[] {
  return [
    // ── Select (checkbox) ────────────────────────────────────────────────────
    {
      id: 'select',
      meta: { title: '', excludeFromExport: true },
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          aria-label="Seleccionar todos"
          className="h-4 w-4 cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          aria-label="Seleccionar fila"
          className="h-4 w-4 cursor-pointer"
        />
      ),
    },

    // ── Cliente (FK UUID nullable) ────────────────────────────────────────────
    {
      id: 'customer',
      accessorFn: (row) => row.customers?.name ?? '',
      meta: { title: 'Cliente' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => <span className="font-medium">{row.original.customers?.name ?? '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.customer_id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Servicio (FK UUID nullable) ───────────────────────────────────────────
    {
      id: 'service',
      accessorFn: (row) => row.customer_services?.service_name ?? '',
      meta: { title: 'Servicio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Servicio" />,
      cell: ({ row }) => <span>{row.original.customer_services?.service_name ?? '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.service_id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Ítem (FK UUID nullable) ──────────────────────────────────────────────
    {
      id: 'item',
      accessorFn: (row) => row.service_items?.item_name ?? '',
      meta: { title: 'Ítem' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ítem" />,
      cell: ({ row }) => <span>{row.original.service_items?.item_name ?? '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const id = row.original.item_id;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── Sector (FK nullable via service_sectors → sectors) ───────────────────
    {
      id: 'sector',
      accessorFn: (row) => row.service_sectors?.sectors?.name ?? '',
      meta: { title: 'Sector' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
      cell: ({ row }) => <span>{row.original.service_sectors?.sectors?.name ?? '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const sectorId = row.original.service_sectors?.sectors?.id;
        if (sectorId == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(sectorId);
      },
    },

    // ── Área (FK nullable via service_areas → areas_cliente) ─────────────────
    {
      id: 'area',
      accessorFn: (row) => row.service_areas?.areas_cliente?.descripcion_corta ?? '',
      meta: { title: 'Área' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Área" />,
      cell: ({ row }) => <span>{row.original.service_areas?.areas_cliente?.descripcion_corta ?? '—'}</span>,
      filterFn: (row, _id, value: string[]) => {
        const areaId = row.original.service_areas?.areas_cliente?.id;
        if (areaId == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(areaId);
      },
    },

    // ── Tipo Servicio (enum nullable) ─────────────────────────────────────────
    {
      accessorKey: 'type_service',
      meta: { title: 'Tipo Servicio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo Servicio" />,
      cell: ({ row }) => {
        const val = row.original.type_service;
        if (!val) return <span className="text-muted-foreground text-xs">—</span>;
        return <Badge variant="outline">{dailyReportTypeServiceLabels[val] ?? val}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Jornada (texto — valores discretos como turnos o fechas) ─────────────
    {
      accessorKey: 'working_day',
      meta: { title: 'Jornada' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
      cell: ({ row }) => <span>{row.original.working_day ?? '—'}</span>,
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Hora Inicio (texto) ───────────────────────────────────────────────────
    {
      accessorKey: 'start_time',
      meta: { title: 'Hora Inicio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hora Inicio" />,
      cell: ({ row }) => {
        const val = row.original.start_time;
        if (!val) return <span className="text-muted-foreground text-xs">—</span>;
        // start_time is a Time(6) stored as Date by Prisma — format as HH:mm
        const d = new Date(val as unknown as string);
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        return <span>{`${hh}:${mm}`}</span>;
      },
      // filterFn not needed for text filters
    },

    // ── Hora Fin (texto) ──────────────────────────────────────────────────────
    {
      accessorKey: 'end_time',
      meta: { title: 'Hora Fin' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hora Fin" />,
      cell: ({ row }) => {
        const val = row.original.end_time;
        if (!val) return <span className="text-muted-foreground text-xs">—</span>;
        const d = new Date(val as unknown as string);
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        return <span>{`${hh}:${mm}`}</span>;
      },
    },

    // ── Estado (enum NOT NULL) ────────────────────────────────────────────────
    {
      accessorKey: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const val = row.original.status;
        const label = dailyReportRowStatusLabels[val] ?? val;
        const variant = dailyReportRowStatusBadges[val] ?? 'default';
        return <Badge variant={variant}>{label}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string;
        return value.includes(val);
      },
    },

    // ── Empleados (M:M — virtual) ─────────────────────────────────────────────
    {
      id: 'employees',
      accessorFn: (row) =>
        row.dailyreportemployeerelations
          .map((r) => {
            const emp = r.employees;
            return emp ? `[${emp.file ?? '?'}] ${emp.lastname ?? ''}`.trim() : '';
          })
          .filter(Boolean)
          .join(', '),
      meta: { title: 'Empleados' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Empleados" />,
      cell: ({ row }) => <EmployeeBadgeCell row={row.original} reportDate={reportDate} />,
      filterFn: (row, _id, value: string[]) => {
        const relations = row.original.dailyreportemployeerelations;
        if (!relations || relations.length === 0) return value.includes(NULL_FILTER_VALUE);
        return relations.some((r) => r.employee_id && value.includes(r.employee_id));
      },
    },

    // ── Equipos (M:M — virtual) ───────────────────────────────────────────────
    {
      id: 'equipment',
      accessorFn: (row) =>
        row.dailyreportequipmentrelations
          .map((r) => {
            if (r.vehicles) return r.vehicles.domain ?? r.vehicles.intern_number ?? '';
            if (r.other_equipment) return r.other_equipment.intern_number ?? r.other_equipment.serial_number ?? '';
            return '';
          })
          .filter(Boolean)
          .join(', '),
      meta: { title: 'Equipos' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipos" />,
      cell: ({ row }) => <EquipmentBadgeCell row={row.original} />,
      filterFn: (row, _id, value: string[]) => {
        const relations = row.original.dailyreportequipmentrelations;
        if (!relations || relations.length === 0) return value.includes(NULL_FILTER_VALUE);
        return relations.some(
          (r) =>
            (r.equipment_id && value.includes(r.equipment_id)) ||
            (r.other_equipment_id && value.includes(r.other_equipment_id))
        );
      },
    },

    // ── Equipos Cliente (M:M — virtual) ──────────────────────────────────────
    {
      id: 'customer_equipment',
      accessorFn: (row) =>
        row.dailyreport_customer_equipment_relations
          .map((r) => r.equipos_clientes?.name ?? '')
          .filter(Boolean)
          .join(', '),
      meta: { title: 'Equipos Cliente' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipos Cliente" />,
      cell: ({ row }) => <CustomerEquipmentBadgeCell row={row.original} />,
      filterFn: (row, _id, value: string[]) => {
        const relations = row.original.dailyreport_customer_equipment_relations;
        if (!relations || relations.length === 0) return value.includes(NULL_FILTER_VALUE);
        return relations.some((r) => r.customer_equipment_id && value.includes(r.customer_equipment_id));
      },
    },

    // ── Descripción (texto nullable) ──────────────────────────────────────────
    {
      accessorKey: 'description',
      meta: { title: 'Descripción' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => {
        const val = row.original.description;
        if (!val) return <span className="text-muted-foreground text-xs">—</span>;
        const truncated = val.length > 60 ? `${val.slice(0, 60)}…` : val;
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm cursor-default">{truncated}</span>
              </TooltipTrigger>
              {val.length > 60 && (
                <TooltipContent className="max-w-xs text-xs">
                  <p>{val}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },

    // ── Nro Remito (texto nullable) ───────────────────────────────────────────
    {
      accessorKey: 'remit_number',
      meta: { title: 'Nro Remito' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nro Remito" />,
      cell: ({ row }) => <span>{row.original.remit_number ?? '—'}</span>,
    },

    // ── Completado Día (booleano nullable) ────────────────────────────────────
    {
      accessorKey: 'completed_day',
      meta: { title: 'Completado Día' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Completado Día" />,
      cell: ({ row }) => {
        const val = row.original.completed_day;
        if (val === null || val === undefined) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <Badge variant={val ? 'success' : 'secondary'}>
            {val ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Sí
              </span>
            ) : (
              'No'
            )}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id);
        if (val === null || val === undefined) return value.includes(NULL_FILTER_VALUE);
        return value.includes(String(val));
      },
    },

    // ── Completado Noche (booleano nullable) ──────────────────────────────────
    {
      accessorKey: 'completed_night',
      meta: { title: 'Completado Noche' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Completado Noche" />,
      cell: ({ row }) => {
        const val = row.original.completed_night;
        if (val === null || val === undefined) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <Badge variant={val ? 'success' : 'secondary'}>
            {val ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Sí
              </span>
            ) : (
              'No'
            )}
          </Badge>
        );
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id);
        if (val === null || val === undefined) return value.includes(NULL_FILTER_VALUE);
        return value.includes(String(val));
      },
    },

    // ── Acciones ──────────────────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { title: '', excludeFromExport: true },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <RowActionsCell row={row.original} permissions={permissions} handlers={handlers} />,
    },
  ];
}

// ============================================================================
// ROW ACTIONS CELL
// ============================================================================

function RowActionsCell({
  row,
  permissions,
  handlers,
}: {
  row: DailyReportDetailRow;
  permissions: Permissions;
  handlers: RowActionHandlers;
}) {
  return (
    <div className="flex items-center gap-1">
      {/* Ver detalle — siempre visible */}
      <button
        type="button"
        title="Ver detalle"
        className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={() => handlers.onViewDetail(row)}
      >
        <span className="sr-only">Ver detalle</span>
        {/* Eye icon inline to avoid import cycle */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {/* Editar — solo si canUpdate */}
      {permissions.canUpdate && (
        <button
          type="button"
          title="Editar"
          className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={() => handlers.onEdit(row)}
        >
          <span className="sr-only">Editar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* Historial — siempre visible */}
      <button
        type="button"
        title="Historial"
        className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={() => handlers.onHistory(row)}
      >
        <span className="sr-only">Historial</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {/* Remitos — siempre visible */}
      <button
        type="button"
        title="Remitos"
        className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={() => handlers.onRemitos(row)}
      >
        <span className="sr-only">Remitos</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </button>

      {/* Eliminar — solo si canDelete */}
      {permissions.canDelete && (
        <button
          type="button"
          title="Eliminar"
          className="rounded p-1 hover:bg-accent text-red-500 hover:text-red-700"
          onClick={() => handlers.onDelete(row)}
        >
          <span className="sr-only">Eliminar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
