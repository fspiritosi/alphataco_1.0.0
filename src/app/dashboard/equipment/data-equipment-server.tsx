'use client';

import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
// import { fetchEmployeesData } from "@/lib/supabase-query"
import { fetchAllEquipmentsData, fetchEquipmentData, querySelectDistinct } from '@/app/server/GET/probando';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import Link from 'next/link';
import React from 'react';
import { RiToolsFill } from 'react-icons/ri';

// Tipo inferido automáticamente del retorno de Supabase
type EquipmentTableData = Awaited<ReturnType<typeof fetchEquipmentData>>['rows'][0];

export default function TablaEquipmentServer({
  initialData,
  savedFilters,
  savedVisibility,
  types_of_vehicles = 'all',
}: {
  initialData: Awaited<ReturnType<typeof fetchEquipmentData>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
  types_of_vehicles: 'all' | 'Vehículos' | 'Otros';
}) {
  // Función wrapper para la exportación que devuelve solo los datos
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllEquipmentsData({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: true,
    });
    return result.rows; // Solo devolver los datos, no la estructura de paginación
  };
  // Definición de columnas
  const columns: ColumnDef<EquipmentTableData>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
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
      accessorKey: 'domain',
      id: 'domain',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
      cell: ({ row }) => {
        return (
          <Link href={`/dashboard/equipment/action?action=view&id=${row.original.id}`} className="hover:underline">
            {row.original.domain}
          </Link>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
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
      accessorKey: 'picture',
      id: 'picture',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Foto" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.picture ? <img className="h-4 w-4 rounded-full" src={row.original.picture} alt="Foto" /> : '-'}
        </div>
      ),
      enableSorting: false,
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
        return <Badge>{row.original.type?.name || ''}</Badge>;
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
        return row.original.sub_type?.name ? <Badge>{row.original.sub_type?.name || ''}</Badge> : '-';
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
      // cell: ({ row }) => {
      //   return row.original.contractor_equipment?.map((contractor) => {
      //     return <Badge key={contractor.contractor_id.id}>{contractor.contractor_id.name}</Badge>;
      //   });
      // },

      cell: ({ row }) => {
        const contractors: string[] = row.original.contractor_equipment?.map(
          (contractor) => contractor.customers?.name || ''
        );
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
        return (
          <Link href={`/dashboard/equipment/action?action=view&id=${row.original.id}`} className="hover:underline">
            {row.original.intern_number}
          </Link>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'showUnavaliableEquipment',
      id: 'Ver equipos dados de baja',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ver equipos dados de baja" />,
    },
  ];

  return (
    <BaseDataTable
      columns={columns}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId={`equipmentServerTable-${types_of_vehicles}`}
      enableRowSelection={true}
      serverSide={true}
      fetchData={fetchEquipmentData}
      fetchAllData={handleFetchAllData}
      queryKey={`equipment-supabase-${types_of_vehicles}`}
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        filterableColumns: [
          {
            columnId: 'domain',
            title: 'Dominio',
            config: {
              tableName: 'vehicles',
              select: 'domain' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'domain'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'chassis',
            title: 'Chassis',
            config: {
              tableName: 'vehicles',
              select: 'chassis' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'chassis'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'status',
            title: 'Estado',
            config: {
              tableName: 'vehicles',
              select: 'status' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'status'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'type.name',
            title: 'Tipo',
            config: {
              tableName: 'vehicles',
              select: 'type.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"type": "type"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'type.name'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'sub_type.name',
            title: 'Sub Tipo',
            config: {
              tableName: 'vehicles',
              select: 'sub_type.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"sub_type": "subType"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'sub_type.name'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'types_of_vehicles.name',
            title: 'Tipos de vehículos',
            config: {
              tableName: 'vehicles',
              select: 'types_of_vehicles.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"types_of_vehicles": "type_of_vehicle"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'types_of_vehicles.name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'engine',
            title: 'Motor',
            config: {
              tableName: 'vehicles',
              select: 'engine' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'engine'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'serie',
            title: 'Serie',
            config: {
              tableName: 'vehicles',
              select: 'serie' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'serie'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'contractor_equipment.customers.name',
            title: 'Afectaciones',
            config: {
              tableName: 'vehicles' as const,
              select: 'id' as '*',
              multiJoinPaths: {
                joins: [
                  {
                    from_table: 'vehicles',
                    to_table: 'contractor_equipment',
                    from_column: 'id',
                    to_column: 'equipment_id',
                  },
                  {
                    from_table: 'contractor_equipment',
                    to_table: 'customers',
                    from_column: 'contractor_id',
                    to_column: 'id',
                  },
                ],
                final_column: 'customers.name',
              },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'id'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'year',
            title: 'Año',
            config: {
              tableName: 'vehicles',
              select: 'year' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'year'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'condition',
            title: 'Condicion',
            config: {
              tableName: 'vehicles',
              select: 'condition' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'condition'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'brand_vehicles.name',
            title: 'Marca',
            config: {
              tableName: 'vehicles',
              select: 'brand_vehicles.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"brand_vehicles": "brand"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'brand_vehicles.name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'kilometer',
            title: 'Kilometros',
            config: {
              tableName: 'vehicles',
              select: 'kilometer' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'kilometer'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'model_vehicles.name',
            title: 'Modelo',
            config: {
              tableName: 'vehicles',
              select: 'model_vehicles.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"model_vehicles": "model"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'model_vehicles.name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'intern_number',
            title: 'Numero Interno',
            config: {
              tableName: 'vehicles',
              select: 'intern_number' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'intern_number'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
        ],
        showFilterOptions: true,
      }}
    />
  );
}
