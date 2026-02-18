import { Badge } from '@/components/ui/badge';
import { CardTitle } from '@/components/ui/card';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { RepairSolicitudeData } from '../RepairSolicitudes';
import { criticidad, labels, statuses } from '../data';
import RepairModal from './RepairModal';

type RepairLog = NonNullable<RepairSolicitudeData['repairlogs']>[number];

export function getClosingLog(row: RepairSolicitudeData): RepairLog | undefined {
  return row.repairlogs
    ?.filter((log) => log.title === 'Finalizado')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

export function getClosingPersonName(log: RepairLog): string {
  const employee = log.modified_by_employee;
  if (employee && typeof employee === 'object' && 'firstname' in employee) {
    const emp = employee as Record<string, string>;
    return `${emp.firstname ?? ''} ${emp.lastname ?? ''}`.trim() || '-';
  }
  const user = log.modified_by_user;
  if (user && typeof user === 'object' && 'fullname' in user) {
    return (user as Record<string, string>).fullname || '-';
  }
  return '-';
}

// Tipo extendido para columnas con propiedades adicionales de exportación
export type ExtendedColumnDef<TData> = ColumnDef<TData> & {
  exportFormatter?: (value: any, row: TData) => string;
  excludeFromExport?: boolean;
  exportHeader?: string;
};

export const repairSolicitudesColums: ExtendedColumnDef<RepairSolicitudeData>[] = [
  {
    accessorKey: 'vehicles.domain',
    id: 'vehicles.domain',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
    cell: ({ row }) => {
      return <div className="flex items-center">{row.original.vehicles?.domain}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'types_of_repairs.name',
    id: 'types_of_repairs.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Titulo" className="ml-2" />,
    cell: ({ row }) => {
      return (
        <RepairModal
          row={row}
          onlyView
          action={
            <div className="flex space-x-2">
              <CardTitle className="max-w-[300px] truncate font-medium hover:underline">
                {row.original.types_of_repairs?.name}
              </CardTitle>
            </div>
          }
        />
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Descripcion" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[400px] truncate font-medium">{row.original.user_description}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'state',
    id: 'Estado',
    exportHeader: 'Estado',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const state = statuses.find((status) => status.value === row.original.state);

      if (!state) {
        return null;
      }

      return (
        <div className={`flex  items-center ${state.color}`}>
          {state.icon && <state.icon className={`mr-2 h-4 w-4 ${state.color}`} />}
          <span>{state.label}</span>
        </div>
      );
    },
    exportFormatter: (value: any, row: RepairSolicitudeData) => {
      const state = statuses.find((status) => status.value === row.state);
      return state?.label || value || '-';
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'priority',
    id: 'Criticidad',
    exportHeader: 'Criticidad',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Criticidad" />,
    cell: ({ row }) => {
      const priority = criticidad.find((priority) => priority.value === row.original.types_of_repairs?.criticity);
      const label = labels.find((label) => label.value === row.original.types_of_repairs?.criticity);
      if (!priority) {
        return null;
      }

      return (
        <Badge
          variant={label?.value === 'Baja' ? 'success' : label?.value === 'Media' ? 'yellow' : 'destructive'}
          className="flex items-center w-fit"
        >
          {priority.icon && <priority.icon className="mr-2 h-4 w-4" />}
          <span>{priority.label}</span>
        </Badge>
      );
    },
    exportFormatter: (value: any, row: RepairSolicitudeData) => {
      const priority = criticidad.find((priority) => priority.value === row.types_of_repairs?.criticity);
      return priority?.label || value || '-';
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'serie',
    id: 'Serie',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Serie" />,
    cell: ({ row }) => {
      return <div className="flex items-center">{row.original.vehicles?.serie}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'vehicles.intern_number',
    id: 'Numero interno',
    exportHeader: 'Numero interno',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Numero interno" />,
    cell: ({ row }) => {
      return <div className="flex items-center">{row.original.vehicles?.intern_number || '-'}</div>;
    },
    exportFormatter: (value: any, row: RepairSolicitudeData) => {
      return row.vehicles?.intern_number || '-';
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'created_at',
    id: 'Fecha',
    exportHeader: 'Fecha',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      return <div className="flex items-center">{moment(row.original.created_at).format('DD/MM/YYYY')}</div>;
    },
    exportFormatter: (value: any, row: RepairSolicitudeData) => {
      return row.created_at ? moment(row.created_at).format('DD/MM/YYYY') : '-';
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'updated_at',
    id: 'Fecha de modificacion',
    exportHeader: 'Fecha de modificacion',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de modificacion" />,
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          {row.original.updated_at ? moment(row.original.updated_at).format('DD/MM/YYYY HH:mm') : '-'}
        </div>
      );
    },
    exportFormatter: (value: any, row: RepairSolicitudeData) => {
      return row.updated_at ? moment(row.updated_at).format('DD/MM/YYYY HH:mm') : '-';
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'closed_by',
    exportHeader: 'Cerrada por',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cerrada por" />,
    cell: ({ row }) => {
      const closingLog = getClosingLog(row.original);
      if (!closingLog) return <span className="text-muted-foreground">-</span>;
      return <span>{getClosingPersonName(closingLog)}</span>;
    },
    exportFormatter: (_value: unknown, row: RepairSolicitudeData) => {
      const closingLog = getClosingLog(row);
      return closingLog ? getClosingPersonName(closingLog) : '-';
    },
  },
  {
    id: 'closed_at',
    exportHeader: 'Fecha de cierre',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de cierre" />,
    cell: ({ row }) => {
      const closingLog = getClosingLog(row.original);
      if (!closingLog) return <span className="text-muted-foreground">-</span>;
      return <span>{moment(closingLog.created_at).format('DD/MM/YYYY HH:mm')}</span>;
    },
    exportFormatter: (_value: unknown, row: RepairSolicitudeData) => {
      const closingLog = getClosingLog(row);
      return closingLog ? moment(closingLog.created_at).format('DD/MM/YYYY HH:mm') : '-';
    },
  },
  {
    id: 'actions',
    excludeFromExport: true,
    cell: ({ row }) => {
      return <RepairModal row={row} />;
    },
  },
];
