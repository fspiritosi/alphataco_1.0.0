'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { repairCriticityLabels, repairStateLabels } from '@/shared/utils/mappers';
import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { RepairSolicitudListItem } from './actions.server';
import { RepairEquipmentDialog as RepairEquipmentDialogCell } from './components/RepairEquipmentDialog';
import { criticityBadgeVariants, criticityIcons, repairStateColors, repairStateIcons } from './utils/constants';

// Re-export para mantener la API pública
export { criticityBadgeVariants, criticityIcons, repairStateColors, repairStateIcons };

// ============================================================================
// CONSTANTS
// ============================================================================

/** Columnas ocultas por defecto (secundarias) */
export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = [
  'serie',
  'intern_number',
  'updated_at',
  'last_modified_by',
  'kilometer',
];

// ============================================================================
// HELPERS
// ============================================================================

/** Obtiene el log de cierre ("Finalizado") más reciente */
function getClosingLog(row: RepairSolicitudListItem) {
  return row.repairlogs
    .filter((log) => log.title === 'Finalizado')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

/** Obtiene el último log de modificación (el primero del array, ya ordenado desc) */
function getLastModifiedByName(row: RepairSolicitudListItem): string {
  const lastLog = row.repairlogs[0];
  if (!lastLog) return '-';
  // Priorizar modified_by_user (profile)
  if (lastLog.profile?.fullname) return lastLog.profile.fullname;
  if (lastLog.employees?.firstname) {
    return `${lastLog.employees.firstname} ${lastLog.employees.lastname ?? ''}`.trim();
  }
  return '-';
}

/** Obtiene el nombre de quien cerró la solicitud */
function getClosingPersonName(row: RepairSolicitudListItem): string {
  const closingLog = getClosingLog(row);
  if (!closingLog) return '-';
  if (closingLog.profile?.fullname) return closingLog.profile.fullname;
  if (closingLog.employees?.firstname) {
    return `${closingLog.employees.firstname} ${closingLog.employees.lastname ?? ''}`.trim();
  }
  return '-';
}

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

export const columns: ColumnDef<RepairSolicitudListItem>[] = [
  // ─── Dominio ──────────────────────────────────────────────────────────────
  {
    id: 'vehicle',
    accessorFn: (row) => row.vehicles?.domain ?? '',
    meta: { title: 'Dominio' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
    cell: ({ row }) => <div className="font-medium">{row.original.vehicles?.domain ?? '-'}</div>,
    filterFn: (row, _id, value: string[]) => {
      const id = row.original.vehicles?.id;
      if (id == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(id);
    },
    enableSorting: true,
  },

  // ─── Título (tipo de reparación) ──────────────────────────────────────────
  {
    id: 'reparation_type',
    accessorFn: (row) => row.types_of_repairs?.name ?? '',
    meta: { title: 'Tipo de reparación' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de reparación" />,
    cell: ({ row }) => (
      <div className="max-w-[250px] truncate font-medium">{row.original.types_of_repairs?.name ?? '-'}</div>
    ),
    filterFn: (row, _id, value: string[]) => {
      const id = row.original.types_of_repairs?.id;
      if (id == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(id);
    },
    enableSorting: true,
  },

  // ─── Descripción ──────────────────────────────────────────────────────────
  {
    id: 'user_description',
    accessorKey: 'user_description',
    meta: { title: 'Descripción' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate text-muted-foreground">{row.original.user_description ?? '-'}</div>
    ),
    enableSorting: true,
  },

  // ─── Estado ───────────────────────────────────────────────────────────────
  {
    id: 'state',
    accessorKey: 'state',
    meta: { title: 'Estado' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const state = row.original.state as string;
      const Icon = repairStateIcons[state];
      const color = repairStateColors[state] ?? 'text-gray-500';
      return (
        <div className={`flex items-center gap-1.5 ${color}`}>
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span>{repairStateLabels[state] ?? state}</span>
        </div>
      );
    },
    filterFn: (row, id, value: string[]) => {
      const val = row.getValue(id) as string | null;
      if (val == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(val);
    },
    enableSorting: true,
  },

  // ─── Criticidad ───────────────────────────────────────────────────────────
  {
    id: 'criticity',
    accessorFn: (row) => row.types_of_repairs?.criticity ?? '',
    meta: { title: 'Criticidad' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Criticidad" />,
    cell: ({ row }) => {
      const criticity = row.original.types_of_repairs?.criticity;
      if (!criticity) return <span className="text-muted-foreground">-</span>;
      const Icon = criticityIcons[criticity];
      const variant = criticityBadgeVariants[criticity] ?? 'default';
      return (
        <Badge variant={variant} className="flex w-fit items-center gap-1">
          {Icon && <Icon className="h-3 w-3" />}
          <span>{repairCriticityLabels[criticity] ?? criticity}</span>
        </Badge>
      );
    },
    filterFn: (row, _id, value: string[]) => {
      const criticity = row.original.types_of_repairs?.criticity;
      if (criticity == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(criticity);
    },
    enableSorting: false, // computed from relation, not sortable directly
  },

  // ─── Serie ────────────────────────────────────────────────────────────────
  {
    id: 'serie',
    accessorFn: (row) => row.vehicles?.serie ?? '',
    meta: { title: 'Serie' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Serie" />,
    cell: ({ row }) => <div>{row.original.vehicles?.serie ?? '-'}</div>,
    enableSorting: false,
  },

  // ─── Número interno ───────────────────────────────────────────────────────
  {
    id: 'intern_number',
    accessorFn: (row) => row.vehicles?.intern_number ?? '',
    meta: { title: 'N° Interno' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="N° Interno" />,
    cell: ({ row }) => <div>{row.original.vehicles?.intern_number ?? '-'}</div>,
    enableSorting: false,
  },

  // ─── Fecha de creación ────────────────────────────────────────────────────
  {
    id: 'created_at',
    accessorKey: 'created_at',
    meta: { title: 'Fecha' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => <div>{moment(row.original.created_at).format('DD/MM/YYYY')}</div>,
    enableSorting: true,
  },

  // ─── Fecha de modificación ────────────────────────────────────────────────
  {
    id: 'updated_at',
    accessorKey: 'updated_at',
    meta: { title: 'Últ. modificación' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Últ. modificación" />,
    cell: ({ row }) => (
      <div>{row.original.updated_at ? moment(row.original.updated_at).format('DD/MM/YYYY HH:mm') : '-'}</div>
    ),
    enableSorting: true,
  },

  // ─── Últ. modificación por ────────────────────────────────────────────────
  {
    id: 'last_modified_by',
    accessorFn: (row) => {
      const lastLog = row.repairlogs[0];
      if (!lastLog) return '';
      if (lastLog.profile?.fullname) return lastLog.profile.fullname;
      if (lastLog.employees?.firstname)
        return `${lastLog.employees.firstname} ${lastLog.employees.lastname ?? ''}`.trim();
      return '';
    },
    meta: { title: 'Últ. modif. por' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Últ. modif. por" />,
    cell: ({ row }) => {
      const name = getLastModifiedByName(row.original);
      return <div className="text-sm">{name}</div>;
    },
    filterFn: (row, _id, value: string[]) => {
      const lastLog = row.original.repairlogs[0];
      const userId = lastLog?.modified_by_user;
      if (userId == null) return value.includes(NULL_FILTER_VALUE);
      return value.includes(userId);
    },
    enableSorting: false,
  },

  // ─── Cerrada por ──────────────────────────────────────────────────────────
  {
    id: 'closed_by',
    accessorFn: (row) => getClosingPersonName(row),
    meta: { title: 'Cerrada por' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cerrada por" />,
    cell: ({ row }) => {
      const name = getClosingPersonName(row.original);
      return <div className="text-sm text-muted-foreground">{name}</div>;
    },
    enableSorting: false,
  },

  // ─── Fecha de cierre ──────────────────────────────────────────────────────
  {
    id: 'closed_at',
    accessorFn: (row) => {
      const closingLog = getClosingLog(row);
      return closingLog ? moment(closingLog.created_at).format('DD/MM/YYYY HH:mm') : '';
    },
    meta: { title: 'Fecha de cierre' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de cierre" />,
    cell: ({ row }) => {
      const closingLog = getClosingLog(row.original);
      if (!closingLog) return <span className="text-muted-foreground">-</span>;
      return <div>{moment(closingLog.created_at).format('DD/MM/YYYY HH:mm')}</div>;
    },
    enableSorting: false,
  },

  // ─── Acciones ───────────────────────────────────────────────────────────
  {
    id: 'actions',
    meta: { excludeFromExport: true, title: '' },
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <RepairEquipmentDialogCell row={row} />,
  },
];
