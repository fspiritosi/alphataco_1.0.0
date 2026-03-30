'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/features/Formularios/Checklists/tables/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';

export const DiagramReportsColumns: ColumnDef<any>[] = [
  {
    accessorKey: 'employee_cuil',
    id: 'employee_cuil',
    header: ({ column }) => <DataTableColumnHeader column={column} title="CUIL" />,
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue('employee_cuil')}</div>;
    },
    enableHiding: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'employee_name',
    id: 'employee_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue('employee_name')}</div>;
    },
    enableHiding: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'date',
    id: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue('date')}</div>;
    },
    enableHiding: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'novelty_short_description',
    id: 'novelty_short_description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Novedad" />,
    cell: ({ row }) => {
      const color = row.original.novelty_color;
      const description = row.getValue('novelty_short_description') as string;

      return (
        <Badge
          variant="outline"
          style={{
            color: color,
            borderColor: color,
            backgroundColor: `${color}10`,
          }}
        >
          {description}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'novelty_name',
    id: 'novelty_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const name = row.getValue('novelty_name') as string;
      return <div className="text-sm text-muted-foreground">{name}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'is_active',
    id: 'is_active',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean;
      return <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>;
    },
    filterFn: (row, id, value) => {
      const isActive = row.getValue(id) as boolean;
      return value.includes(isActive ? 'Activo' : 'Inactivo');
    },
  },
];
