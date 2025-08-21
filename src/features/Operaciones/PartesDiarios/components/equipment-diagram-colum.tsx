/**
 * This file contains the definition of the columns used in the dashboard.
 */

'use client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import React from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { RiToolsFill } from 'react-icons/ri';
import { z } from 'zod';
import { getActiveEquipmentsForDailyReport } from '../actions/actions';

const formSchema = z.object({
  reason_for_termination: z.string({
    required_error: 'La razón de la baja es requerida.',
  }),
  termination_date: z.date({
    required_error: 'La fecha de baja es requerida.',
  }),
});

type Colum = Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>[0];

export function getEquipmentDiagramColumns(
  field: ControllerRenderProps<
    {
      customer: string;
      services: string;
      item: string;
      status: string;
      working_day: string;
      employees?: string[] | undefined;
      equipment?: string[] | undefined;
      equipos_cliente?: string[] | undefined;
      type_service?: 'mensual' | 'adicional' | 'adicional_permanente' | undefined;
      start_time?: string | undefined;
      end_time?: string | undefined;
      description?: string | undefined;
      document_path?: string | undefined;
      sector_service_id?: string | undefined;
      areas_service_id?: string | undefined;
      remit_number?: string | undefined;
      cancel_reason?: string | undefined;
      reprogram_date?: Date | undefined;
      reasigment_reason?: string | undefined;
    },
    'equipment'
  >
): ColumnDef<Colum>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => {
        // Verificar si la fila debe estar seleccionada basándose en field.value
        const isSelected = row.getIsSelected() || field?.value?.includes(row.original.id);

        return (
          <Checkbox
            checked={isSelected}
            disabled={field?.value?.includes(row.original.id)}
            defaultChecked={field?.value?.includes(row.original.id)}
            defaultValue={field?.value?.includes(row.original.id) ? 'checked' : 'unchecked'}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'domain',
      id: 'domain',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
      cell: ({ row }) => {
        return <div>{row.original.domain}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'picture',
      id: 'picture',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Foto" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.picture ? <img className="size-10 rounded-full" src={row.original.picture} alt="Foto" /> : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'chassis',
      id: 'chassis',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chassis" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'type.name',
      id: 'type.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        return <Badge>{row.original.type.name}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'sub_type.name',
      id: 'sub_type.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sub Tipo" />,
      cell: ({ row }) => {
        return <Badge>{row.original.sub_type?.name || ''}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'types_of_vehicles.name',
      id: 'types_of_vehicles.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipos de vehículos" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      cell: ({ row }) => {
        return <Badge>{row.original.types_of_vehicles?.name}</Badge>;
      },
    },

    {
      accessorKey: 'engine',
      id: 'engine',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Motor" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },

    {
      accessorKey: 'serie',
      id: 'serie',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Serie" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'contractor_equipment.customers.name',
      id: 'contractor_equipment.customers.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Afectado a" />,
      cell: ({ row }) => {
        const contractors: string[] =
          row.original.contractor_equipment?.map((contractor) => contractor.customers?.name || '') || [];
        if (!contractors || contractors.length === 0) return null;
        const [first, ...rest] = contractors;
        if (rest.length === 0) {
          return <Badge variant="default">{first}</Badge>;
        }
        return (
          <>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="default" className="cursor-pointer select-none">
                    {first} +{rest.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-1">
                    {rest.map((contractor) => (
                      <p key={contractor}>{contractor}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        // Filtrar por numero intenro o dominio
        if (filterValue === 'sin afectar' && row.original.allocated_to === null) {
          return true;
        }
        if (
          row.original.contractor_equipment?.some((contractor) => contractor.customers?.name?.includes(filterValue))
        ) {
          return true;
        } else {
          return false;
        }
      },
    },

    {
      accessorKey: 'year',
      id: 'year',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'condition',
      id: 'condition',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición" />,
      cell: ({ row }) => {
        const variants = {
          operativo: 'success',
          'no operativo': 'destructive',
          'en reparacion': 'yellow',
          'operativo condicionado': 'info',
          default: 'default',
        };

        const conditionConfig = {
          'operativo condicionado': { color: 'bg-blue-500', icon: AlertTriangle },
          operativo: { color: 'bg-green-500', icon: CheckCircle },
          'no operativo': { color: 'bg-red-500', icon: XCircle },
          'en reparacion': { color: 'bg-yellow-500', icon: RiToolsFill },
        };

        return (
          <Badge variant={variants[row.original?.condition ?? 'default'] as 'default'}>
            {row.original?.condition &&
              React.createElement(conditionConfig[row.original?.condition]?.icon, { className: 'mr-2 size-4' })}
            {row.original.condition}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'brand_vehicles.name',
      id: 'brand_vehicles.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => {
        return <div>{row.original.brand_vehicles?.name}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'kilometer',
      id: 'kilometer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kilometros" />,
      cell: ({ row }) => {
        return <Badge variant={'outline'}>{row.original.kilometer} km</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'model_vehicles.name',
      id: 'model_vehicles.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Modelo" />,
      cell: ({ row }) => {
        return <div>{row.original.model_vehicles?.name}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },

    {
      accessorKey: 'intern_number',
      id: 'intern_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Numero interno" />,
      cell: ({ row }: { row: any }) => {
        return <div>{row.original.intern_number}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    // {
    //   accessorKey: 'showUnavaliableEquipment',
    //   id: 'Ver equipos dados de baja',
    //   header: ({ column }) => <DataTableColumnHeader column={column} title="Ver equipos dados de baja" />,
    // },
  ];
}
