'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { PersonIcon } from '@radix-ui/react-icons';
import { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import React from 'react';
import { formatEmployeesForTable } from '../../utils/utils';

export const employeeColumns: ColumnDef<ReturnType<typeof formatEmployeesForTable>[0], unknown>[] = [
  {
    accessorKey: 'fullName',
    id: 'Nombre',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => {
      const fullName = `${row.original.fullName}`;
      return (
        <div className="font-medium flex gap-2 items-center w-[200px] capitalize">
          <PersonIcon />
          {fullName}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const fullName = `${row.original.fullName}`.toLowerCase();

      if (Array.isArray(value)) {
        return value.some((val) => fullName.includes(String(val).toLowerCase()));
      }

      return fullName.includes(String(value).toLowerCase());
    },
  },
  {
    accessorKey: 'nationality',
    id: 'Nacionalidad',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nacionalidad" />,
    cell: ({ row }) => {
      return <div>{row.original.nationality || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'born_date',
    id: 'Nacimiento',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nacimiento" />,
    cell: ({ row }) => {
      return <div>{row.original.born_date ? moment(row.original.born_date).format('DD/MM/YYYY') : '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'cuil',
    id: 'Cuil',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cuil" />,
    cell: ({ row }) => {
      return <div>{row.original.cuil || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'document_type',
    id: 'Tipo de Documento',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Documento" />,
    cell: ({ row }) => {
      return <div>{row.original.document_type}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'document_number',
    id: 'Documento',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
    cell: ({ row }) => {
      return <div className="flex gap-2 items-center">{row.original.document_number}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'gender',
    id: 'Genero',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Genero" />,
    cell: ({ row }) => {
      return <div>{row.original.gender || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'marital_status',
    id: 'Estado Civil',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado Civil" />,
    cell: ({ row }) => {
      return <div>{row.original.marital_status || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'level_of_education',
    id: 'Nivel de Educacion',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel de Educacion" />,
    cell: ({ row }) => {
      return <div>{row.original.level_of_education || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'street',
    id: 'Calle',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Calle" />,
    cell: ({ row }) => {
      return <div>{row.original.street || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'street_number',
    id: 'Altura',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Altura" />,
    cell: ({ row }) => {
      return <div>{row.original.street_number || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'province',
    id: 'Provincia',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Provincia" />,
    cell: ({ row }) => {
      return <div>{row.original.province || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'city',
    id: 'Ciudad',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ciudad" />,
    cell: ({ row }) => {
      return <div>{row.original.city || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'postal_code',
    id: 'CP',
    header: ({ column }) => <DataTableColumnHeader column={column} title="CP" />,
    cell: ({ row }) => {
      return <div>{row.original.postal_code || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'phone',
    id: 'Teléfono',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
    cell: ({ row }) => {
      return <div>{row.original.phone || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'email',
    id: 'Email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => {
      return <div>{row.original.email || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'file',
    id: 'Legajo',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
    cell: ({ row }) => {
      return <div>{row.original.file || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'hierarchical_position',
    id: 'Sector',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
    cell: ({ row }) => {
      return <div>{row.original.hierarchical_position}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'company_position',
    id: 'Puesto',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Puesto" />,
    cell: ({ row }) => {
      return <div>{row.original.company_position || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'workflow_diagram',
    id: 'Diagrama',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Diagrama" />,
    cell: ({ row }) => {
      return <div>{row.original.workflow_diagram || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'normal_hours',
    id: 'Horas',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Horas" />,
    cell: ({ row }) => {
      return <div>{row.original.normal_hours}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'type_of_contract',
    id: 'Tipo de Contrato',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Contrato" />,
    cell: ({ row }) => {
      return <div>{row.original.type_of_contract}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'contractor_employee',
    id: 'Afectaciones',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Afectaciones" />,
    cell: ({ row }) => {
      const contractors = row.original.contractor_employee || [];

      if (contractors.length === 0) {
        return <Badge>Sin afectar</Badge>;
      }

      const contractorNames = contractors
        .map((contractor) => {
          if (typeof contractor === 'string') return contractor;
          return contractor?.customers?.name || '';
        })
        .filter((name): name is string => Boolean(name));

      const firstContractor = contractorNames[0] || '—';

      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex">
                <Badge>
                  {firstContractor}
                  {contractorNames.length > 1 && ` +${contractorNames.length - 1}`}
                </Badge>
              </div>
            </TooltipTrigger>
            {contractorNames.length > 1 && (
              <TooltipContent className="text-white bg-black rounded-lg p-2">
                <div className="flex flex-col gap-1">
                  {contractorNames.map((name, index) => (
                    <span key={index}>{name}</span>
                  ))}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    },
    filterFn: (row, id, filterValue) => {
      if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
        return true;
      }

      const contractors = row.original.contractor_employee || [];

      if (contractors.length === 0) {
        return false;
      }

      return contractors.some((contractor) => {
        const name = contractor?.customers?.name;
        return name && filterValue.flat().includes(name);
      });
    },
  },

  {
    accessorKey: 'date_of_admission',
    id: 'Fecha de ingreso',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de ingreso" />,
    cell: ({ row }) => {
      return <div>{row.original.date_of_admission ? moment(row.original.date_of_admission).format('DD/MM/YYYY') : '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'cost_center_name',
    id: 'Centro de costo',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Centro de costo" />,
    cell: ({ row }) => {
      return <div>{row.original.cost_center_name || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'affiliate_status',
    id: 'Estado de afiliación',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado de afiliación" />,
    cell: ({ row }) => {
      return <div>{row.original.affiliate_status || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'status',
    id: 'Estado',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
      type StatusType = 'Completo' | 'Incompleto' | 'Completo con doc vencida' | 'default';

      const variantStatus: Record<StatusType, BadgeVariant> = {
        Completo: 'success',
        Incompleto: 'destructive',
        'Completo con doc vencida': 'yellow',
        default: 'default',
      };
      return (
        <Badge
          variant={row.original.status ? variantStatus[row.original.status as StatusType] || 'default' : 'default'}
          className="capitalize"
        >
          {row.original.status || 'Sin estado'}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
];
