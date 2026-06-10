'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import {
  dailyReportRowStatusBadges,
  dailyReportRowStatusLabels,
  dailyReportTypeServiceLabels,
} from '@/shared/utils/mappers';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle2, Info, UserCog } from 'lucide-react';
import moment from 'moment';
import type { EmployeeDeviation, EquipmentDeviation } from '../actions/actions';
import type { DailyReportDetailRow } from './types';

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['start_time', 'end_time'];

/** Status que NO permiten selección. Los registros ejecutados SÍ se pueden seleccionar
 *  (el botón de edición masiva tiene su propio guard que los excluye). */
const NON_SELECTABLE_STATUSES = new Set(['sin_recursos_asignados', 'reprogramado']);

// ============================================================================
// PERMISSIONS TYPE
// ============================================================================

type Permissions = {
  canUpdate: boolean;
  canDelete: boolean;
  canAssignResources: boolean;
};

// ============================================================================
// ACTION HANDLERS TYPE
// ============================================================================

export type RowActionHandlers = {
  onViewDetail: (row: DailyReportDetailRow) => void;
  onEdit: (row: DailyReportDetailRow) => void;
  onAssignResources: (row: DailyReportDetailRow) => void;
  onHistory: (row: DailyReportDetailRow) => void;
  onDelete: (row: DailyReportDetailRow) => void;
};

// ============================================================================
// DEVIATION GETTERS TYPE
// ============================================================================

export type DeviationGetters = {
  getEmployeeDeviation: (employeeId: string, rowId: string) => EmployeeDeviation | null;
  getEquipmentDeviation: (equipmentId: string, rowId: string) => EquipmentDeviation | null;
  loadingValidations: boolean;
};

// ============================================================================
// HELPERS — Employee label
// ============================================================================

function buildEmployeeLabel(emp: {
  file?: string | null;
  lastname?: string | null;
  firstname?: string | null;
}): string {
  return `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
}

// ============================================================================
// EMPLOYEE BADGE CELL (with RPC deviation data)
// ============================================================================

function renderEmployeeBadge(
  employeeId: string,
  label: string,
  rowId: string,
  deviations: DeviationGetters,
  key: string
): React.ReactNode {
  if (deviations.loadingValidations) {
    return (
      <Badge
        key={key}
        variant="secondary"
        className="text-xs font-normal bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-default"
      >
        {label}
      </Badge>
    );
  }

  const dev = deviations.getEmployeeDeviation(employeeId, rowId);

  if (!dev) {
    // Sin desviaciones — badge default (sólido, igual que prod)
    return (
      <TooltipProvider key={key} delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className="text-xs font-normal select-none text-nowrap cursor-default">
              {label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-black text-white rounded-lg p-2">
            <p className="text-xs">Empleado asignado correctamente</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Construir mensajes de tooltip (pueden ser múltiples)
  const messages: string[] = [];
  if (dev.is_duplicated) messages.push('Empleado asignado en múltiples filas');
  if (dev.is_unassigned_to_client) messages.push('No asignado al cliente de esta fila');
  if (dev.has_no_diagram) messages.push('Sin diagrama cargado para este día');
  if (dev.is_non_work_day) {
    messages.push(`Día no laboral: ${dev.diagram_type_name ?? 'No laboral'}`);
  }

  // Determinar color según prioridad
  const badgeClass = dev.is_duplicated
    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950 dark:border-orange-400'
    : dev.is_unassigned_to_client && dev.has_no_diagram
      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 dark:border-purple-400'
      : dev.is_unassigned_to_client
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
        : dev.has_no_diagram
          ? 'border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400'
          : dev.is_non_work_day
            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-400'
            : 'dark:text-black';

  return (
    <TooltipProvider key={key} delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('text-xs font-normal cursor-default', badgeClass)}>
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-black text-white rounded-lg p-2 max-w-xs">
          {messages.map((msg, i) => (
            <p key={i} className="text-xs">
              {msg}
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EmployeeBadgeCell({ row, deviations }: { row: DailyReportDetailRow; deviations: DeviationGetters }) {
  const relations = row.dailyreportemployeerelations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {relations.map((rel) => {
        const emp = rel.employees;
        if (!emp) return null;
        const label = buildEmployeeLabel(emp);
        return renderEmployeeBadge(rel.employee_id ?? '', label, row.id, deviations, rel.employee_id ?? rel.id);
      })}
    </div>
  );
}

// ============================================================================
// EQUIPMENT BADGE CELL (with RPC deviation data)
// ============================================================================

function EquipmentBadgeCell({ row, deviations }: { row: DailyReportDetailRow; deviations: DeviationGetters }) {
  const relations = row.dailyreportequipmentrelations;

  if (!relations || relations.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {relations.map((rel) => {
        if (rel.vehicles) {
          const v = rel.vehicles;
          const label = `${v.domain ?? v.intern_number ?? 'Equipo'}${v.brand_vehicles?.name ? ` — ${v.brand_vehicles.name}` : ''}`;

          if (deviations.loadingValidations) {
            return (
              <Badge
                key={rel.id}
                variant="secondary"
                className="text-xs font-normal bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-default"
              >
                {label}
              </Badge>
            );
          }

          const dev = rel.equipment_id ? deviations.getEquipmentDeviation(rel.equipment_id, row.id) : null;

          if (!dev) {
            // Sin desviaciones — badge default (sólido, igual que prod)
            return (
              <TooltipProvider key={rel.id} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="default" className="text-xs font-normal select-none text-nowrap cursor-default">
                      {label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black text-white rounded-lg p-2">
                    <p className="text-xs">Equipo asignado correctamente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          // Determinar color según prioridad y condición
          const condition = dev.condition?.toLowerCase() ?? '';
          const badgeClass = dev.is_duplicated
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950 dark:border-orange-400'
            : condition === 'no operativo'
              ? 'border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400'
              : condition === 'en reparacion' || condition === 'en_reparacion'
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-400'
                : dev.is_unassigned_to_client
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                  : condition === 'operativo condicionado'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 dark:border-sky-400'
                    : condition === 'en preparacion' || condition === 'en_preparacion'
                      ? 'border-gray-400 bg-transparent'
                      : 'dark:text-black';

          const tooltipMessages: string[] = [];
          if (dev.is_duplicated) tooltipMessages.push('Asignado en múltiples filas del parte diario');
          if (condition === 'no operativo') tooltipMessages.push('Condición: No operativo');
          if (condition === 'en reparacion' || condition === 'en_reparacion')
            tooltipMessages.push('Condición: En reparación');
          if (dev.is_unassigned_to_client) tooltipMessages.push('No asignado al cliente de esta fila');
          if (condition === 'operativo condicionado') tooltipMessages.push('Condición: Condicionado');
          if (condition === 'en preparacion' || condition === 'en_preparacion')
            tooltipMessages.push('Condición: En preparación');

          if (tooltipMessages.length === 0) {
            return (
              <Badge key={rel.id} variant="outline" className={cn('text-xs font-normal dark:text-black', badgeClass)}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {label}
              </Badge>
            );
          }

          return (
            <TooltipProvider key={rel.id} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={cn('text-xs font-normal cursor-default', badgeClass)}>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white rounded-lg p-2 max-w-xs">
                  {tooltipMessages.map((msg, i) => (
                    <p key={i} className="text-xs">
                      {msg}
                    </p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        if (rel.other_equipment) {
          const o = rel.other_equipment;
          const label = o.intern_number ?? o.serial_number ?? 'Equipo';
          return (
            <TooltipProvider key={rel.id} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs font-normal border-blue-400 cursor-default">
                    {label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white rounded-lg p-2">
                  <p className="text-xs">Otro Equipo Operativo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return null;
      })}
    </div>
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

  return (
    <div className="flex flex-col gap-1">
      {relations.map((rel) => (
        <Badge key={rel.id} variant="default" className="select-none text-nowrap text-xs">
          {rel.equipos_clientes?.name}
          {rel.equipos_clientes?.type ? ` (${rel.equipos_clientes.type})` : ''}
        </Badge>
      ))}
    </div>
  );
}

// ============================================================================
// COLUMNS DEFINITION
// ============================================================================

export function getColumns(
  permissions: Permissions,
  handlers: RowActionHandlers,
  reportDate: string,
  deviations: DeviationGetters
): ColumnDef<DailyReportDetailRow>[] {
  return [
    // ── Select (checkbox) ────────────────────────────────────────────────────
    {
      id: 'select',
      meta: { title: '', excludeFromExport: true },
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todos"
          className="cursor-pointer"
        />
      ),
      cell: ({ row }) => {
        const disabled = NON_SELECTABLE_STATUSES.has(row.original.status);
        return (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={disabled}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
            className={disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
          />
        );
      },
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
      cell: ({ row }) => {
        const name = row.original.service_sectors?.sectors?.name;
        if (!name) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <Badge variant="outline" className="font-medium">
            {name}
          </Badge>
        );
      },
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
      cell: ({ row }) => {
        const name = row.original.service_areas?.areas_cliente?.descripcion_corta;
        if (!name) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <Badge variant="outline" className="font-medium">
            {name}
          </Badge>
        );
      },
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
        return <Badge className="font-medium capitalize">{dailyReportTypeServiceLabels[val] ?? val}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string | null;
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val);
      },
    },

    // ── Equipo Cliente (M:M — virtual) — movido arriba de los roles ──────────
    {
      id: 'customer_equipment',
      accessorFn: (row) =>
        row.dailyreport_customer_equipment_relations
          .map((r) => r.equipos_clientes?.name ?? '')
          .filter(Boolean)
          .join(', '),
      meta: { title: 'Equipo cliente' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo cliente" />,
      cell: ({ row }) => <CustomerEquipmentBadgeCell row={row.original} />,
      filterFn: (row, _id, value: string[]) => {
        const relations = row.original.dailyreport_customer_equipment_relations;
        if (!relations || relations.length === 0) return value.includes(NULL_FILTER_VALUE);
        return relations.some((r) => r.customer_equipment_id && value.includes(r.customer_equipment_id));
      },
    },

    // ── Chofer Día (rol de empleado — jornada 12h o 24h) ─────────────────────
    {
      id: 'chofer_dia',
      accessorFn: (row) => {
        const rel = row.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia');
        if (!rel?.employees) return '';
        return buildEmployeeLabel(rel.employees);
      },
      meta: { title: 'Chofer Día' },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a =
          rowA.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia')?.employees?.lastname ?? '';
        const b =
          rowB.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia')?.employees?.lastname ?? '';
        return a.localeCompare(b);
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chofer Día" />,
      cell: ({ row }) => {
        const wday = row.original.working_day?.toLowerCase();
        if (wday !== 'jornada 12 horas' && wday !== 'jornada 24 horas') {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const rel = row.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_dia');
        if (!rel?.employees) {
          return <span className="text-muted-foreground text-xs italic">Sin asignar</span>;
        }
        const emp = rel.employees;
        const label = buildEmployeeLabel(emp);
        return renderEmployeeBadge(
          rel.employee_id ?? '',
          label,
          row.original.id,
          deviations,
          `chofer_dia_${rel.employee_id ?? rel.id}`
        );
      },
    },

    // ── Ayudante Día (rol de empleado — jornada 12h o 24h, admite varios) ────
    {
      id: 'ayudante_dia',
      accessorFn: (row) =>
        row.dailyreportemployeerelations
          .filter((r) => r.role === 'ayudante_dia' && r.employees)
          .map((r) => buildEmployeeLabel(r.employees!))
          .join(', '),
      meta: { title: 'Ayudante Día' },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const firstLastname = (row: typeof rowA) =>
          row.original.dailyreportemployeerelations
            .filter((r) => r.role === 'ayudante_dia')
            .map((r) => r.employees?.lastname ?? '')
            .sort()[0] ?? '';
        return firstLastname(rowA).localeCompare(firstLastname(rowB));
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ayudante Día" />,
      cell: ({ row }) => {
        const wday = row.original.working_day?.toLowerCase();
        if (wday !== 'jornada 12 horas' && wday !== 'jornada 24 horas') {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const rels = row.original.dailyreportemployeerelations.filter((r) => r.role === 'ayudante_dia' && r.employees);
        if (rels.length === 0) {
          return <span className="text-muted-foreground text-xs italic">Opcional</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {rels.map((rel) =>
              renderEmployeeBadge(
                rel.employee_id ?? '',
                buildEmployeeLabel(rel.employees!),
                row.original.id,
                deviations,
                `ayudante_dia_${rel.employee_id ?? rel.id}`
              )
            )}
          </div>
        );
      },
    },

    // ── Chofer Noche (rol de empleado — solo jornada 24h) ────────────────────
    {
      id: 'chofer_noche',
      accessorFn: (row) => {
        const rel = row.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche');
        if (!rel?.employees) return '';
        return buildEmployeeLabel(rel.employees);
      },
      meta: { title: 'Chofer Noche' },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a =
          rowA.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche')?.employees?.lastname ?? '';
        const b =
          rowB.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche')?.employees?.lastname ?? '';
        return a.localeCompare(b);
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chofer Noche" />,
      cell: ({ row }) => {
        const wday = row.original.working_day?.toLowerCase();
        if (wday !== 'jornada 24 horas') {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const rel = row.original.dailyreportemployeerelations.find((r) => r.role === 'chofer_noche');
        if (!rel?.employees) {
          return <span className="text-muted-foreground text-xs italic">Sin asignar</span>;
        }
        const emp = rel.employees;
        const label = buildEmployeeLabel(emp);
        return renderEmployeeBadge(
          rel.employee_id ?? '',
          label,
          row.original.id,
          deviations,
          `chofer_noche_${rel.employee_id ?? rel.id}`
        );
      },
    },

    // ── Ayudante Noche (rol de empleado — solo jornada 24h, admite varios) ───
    {
      id: 'ayudante_noche',
      accessorFn: (row) =>
        row.dailyreportemployeerelations
          .filter((r) => r.role === 'ayudante_noche' && r.employees)
          .map((r) => buildEmployeeLabel(r.employees!))
          .join(', '),
      meta: { title: 'Ayudante Noche' },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const firstLastname = (row: typeof rowA) =>
          row.original.dailyreportemployeerelations
            .filter((r) => r.role === 'ayudante_noche')
            .map((r) => r.employees?.lastname ?? '')
            .sort()[0] ?? '';
        return firstLastname(rowA).localeCompare(firstLastname(rowB));
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ayudante Noche" />,
      cell: ({ row }) => {
        const wday = row.original.working_day?.toLowerCase();
        if (wday !== 'jornada 24 horas') {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const rels = row.original.dailyreportemployeerelations.filter(
          (r) => r.role === 'ayudante_noche' && r.employees
        );
        if (rels.length === 0) {
          return <span className="text-muted-foreground text-xs italic">Opcional</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {rels.map((rel) =>
              renderEmployeeBadge(
                rel.employee_id ?? '',
                buildEmployeeLabel(rel.employees!),
                row.original.id,
                deviations,
                `ayudante_noche_${rel.employee_id ?? rel.id}`
              )
            )}
          </div>
        );
      },
    },

    // ── Empleados (M:M — todos los empleados de la fila, virtual) ────────────
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
      cell: ({ row }) => <EmployeeBadgeCell row={row.original} deviations={deviations} />,
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
      cell: ({ row }) => <EquipmentBadgeCell row={row.original} deviations={deviations} />,
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

        // Ejecutado parcial: jornada 24h, no completamente ejecutado, pero al menos un turno completado
        const is24Hours = row.original.working_day?.toLowerCase() === 'jornada 24 horas';
        const completedDay = row.original.completed_day;
        const completedNight = row.original.completed_night;
        if (is24Hours && val !== 'ejecutado' && (completedDay || completedNight)) {
          return <Badge variant="info">Ejecutado parcial</Badge>;
        }

        // Cancelado con motivo → tooltip
        if (val === 'cancelado' && row.original.cancel_reason) {
          return (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={variant} className="inline-flex items-center gap-1">
                    {label}
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs bg-black text-white rounded-lg p-2">
                  <p>{row.original.cancel_reason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id) as string;
        return value.includes(val);
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
      cell: ({ row }) => (
        <RowActionsCell row={row.original} permissions={permissions} handlers={handlers} reportDate={reportDate} />
      ),
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
  reportDate,
}: {
  row: DailyReportDetailRow;
  permissions: Permissions;
  handlers: RowActionHandlers;
  reportDate: string;
}) {
  const isToday = moment(reportDate).isSame(moment(), 'day');
  const isFutureDate = moment(reportDate).isAfter(moment(), 'day');
  // Editar: no permitir si ejecutado (salvo hoy) ni en_certificacion
  const canEdit = permissions.canUpdate && row.status !== 'en_certificacion' && (row.status !== 'ejecutado' || isToday);
  // Asignar recursos: misma elegibilidad que editar, pero gobernada por su propio permiso
  const canAssignResources =
    permissions.canAssignResources && row.status !== 'en_certificacion' && (row.status !== 'ejecutado' || isToday);
  // Eliminar: solo si fecha hoy, futura, o status sin_recursos_asignados
  const canDelete = permissions.canDelete && (isToday || isFutureDate || row.status === 'sin_recursos_asignados');

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

      {/* Editar — solo si canUpdate Y (status no ejecutado O parte es hoy) */}
      {canEdit && (
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

      {/* Asignar recursos — solo con el permiso assign_resources (Supervisor de Operaciones) */}
      {canAssignResources && (
        <button
          type="button"
          title="Asignar recursos"
          className="rounded p-1 text-cyan-600 hover:bg-accent hover:text-cyan-700"
          onClick={() => handlers.onAssignResources(row)}
        >
          <span className="sr-only">Asignar recursos</span>
          <UserCog width={14} height={14} />
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

      {/* Eliminar — solo si canDelete (fecha hoy/futura o sin_recursos) */}
      {canDelete && (
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
