'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createNestedFilterOptions } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { AlertTriangle, Building, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { RiToolsFill } from 'react-icons/ri';
import type { FetchEquipmentByOwnerIdType } from './actions/actions';

// Tipo de datos de equipos por titular
type EquipmentByOwnerData = FetchEquipmentByOwnerIdType[0];

// Tipo extendido para columnas con exportFormatter
type ExtendedColumnDef<T> = ColumnDef<T> & {
  exportFormatter?: (value: any, row: T) => string;
  excludeFromExport?: boolean;
};

export const variants = {
  operativo: 'success',
  'no operativo': 'destructive',
  'en reparacion': 'yellow',
  'operativo condicionado': 'info',
  'en preparacion': 'secondary',
  default: 'default',
};

export const conditionConfig = {
  'operativo condicionado': { color: 'bg-blue-500', icon: AlertTriangle },
  operativo: { color: 'bg-green-500', icon: CheckCircle },
  'no operativo': { color: 'bg-red-500', icon: XCircle },
  'en reparacion': { color: 'bg-yellow-500', icon: RiToolsFill },
  'en preparacion': { color: 'bg-gray-500', icon: AlertTriangle },
};

export default function EquipmentByOwnerTable({
  equipmentData,
  savedFilters,
  savedVisibility,
}: {
  equipmentData: FetchEquipmentByOwnerIdType;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}) {
  // Definición de columnas
  const columns: ExtendedColumnDef<EquipmentByOwnerData>[] = [
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
      excludeFromExport: true, // No exportar la columna de selección
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
          {row.original.picture ? <img className="size-8 rounded-full" src={row.original.picture} alt="Foto" /> : '-'}
        </div>
      ),
      enableSorting: false,
      excludeFromExport: true, // No exportar la columna de foto
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
      accessorKey: 'equipment_owners.name',
      id: 'equipment_owners.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Propietario" />,
      cell: ({ row }) => {
        return row.original.equipment_owners?.name ? <Badge>{row.original.equipment_owners?.name || ''}</Badge> : '-';
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
      exportFormatter: (value, row) => {
        const contractors = row.contractor_equipment
          ?.map((contractor) => contractor.customers?.name || '')
          .filter(Boolean);
        return contractors && contractors.length > 0 ? contractors.join(', ') : 'Sin afectar';
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
      accessorKey: 'engine_hours',
      id: 'engine_hours',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Horómetro" />,
      cell: ({ row }) => {
        return <Badge variant={'outline'}>{row.original.engine_hours || '0'} hs</Badge>;
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
      excludeFromExport: true, // No exportar la columna de selección
    },
  ];

  const owner_name = equipmentData?.[0].equipment_owners?.name;

  const equipmentTableEquipment = Cookies.get(`equipment-table-equipment`);
  const equipmentTableEquipmentFilters = Cookies.get(`equipment-table-equipment-filters`);

  const internNumberOptions = createFilterOptions(equipmentData, (doc) => doc?.intern_number);
  const domainOptions = createFilterOptions(equipmentData, (doc) => doc?.domain);
  const chassisOptions = createFilterOptions(equipmentData, (doc) => doc?.chassis);
  const engineOptions = createFilterOptions(equipmentData, (doc) => doc?.engine);
  const serieOptions = createFilterOptions(equipmentData, (doc) => doc?.serie);
  const yearOptions = createFilterOptions(equipmentData, (doc) => doc?.year);
  const brandOptions = createFilterOptions(equipmentData, (doc) => doc?.brand_vehicles?.name);
  const modelOptions = createFilterOptions(equipmentData, (doc) => doc?.model_vehicles?.name);
  const statusOptions = createFilterOptions(equipmentData, (doc) => doc?.status);
  const conditionOptions = createFilterOptions(equipmentData, (doc) => doc?.condition);
  const typeOptions = createFilterOptions(equipmentData, (doc) => doc?.type?.name);
  const subTypeOptions = createFilterOptions(equipmentData, (doc) => doc?.sub_type?.name);
  const afectacionesOpciones = createNestedFilterOptions(
    equipmentData,
    (employee) =>
      employee?.contractor_equipment?.map((contractor) => contractor?.customers?.name).filter(Boolean) || [],
    Building // Icono de edificio para afectaciones/contratistas
  );

  return (
    <div className="space-y-4">
      {equipmentData?.[0].equipment_owners?.name && (
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Equipos de: {owner_name}</h3>
          <Badge variant="outline">{equipmentData?.length} equipos</Badge>
        </div>
      )}

      <BaseDataTable
        columns={columns as any}
        data={equipmentData}
        initialColumnVisibility={[] as any}
        savedVisibility={savedVisibility}
        tableId="equipment-table-equipment"
        toolbarOptions={{
          initialVisibleFilters: savedFilters || [],

          filterableColumns: [
            {
              columnId: 'intern_number',
              title: 'Numero interno',
              options: internNumberOptions,
            },
            {
              columnId: 'domain',
              title: 'Dominio',
              options: domainOptions,
            },
            {
              columnId: 'chassis',
              title: 'Chassis',
              options: chassisOptions,
            },
            {
              columnId: 'engine',
              title: 'Motor',
              options: engineOptions,
            },
            {
              columnId: 'serie',
              title: 'Serie',
              options: serieOptions,
            },
            {
              columnId: 'contractor_equipment.customers.name',
              title: 'Afectado a',
              options: afectacionesOpciones,
            },
            {
              columnId: 'year',
              title: 'Año',
              options: yearOptions,
            },
            {
              columnId: 'condition',
              title: 'Condición',
              options: conditionOptions,
            },
            {
              columnId: 'brand_vehicles.name',
              title: 'Marca',
              options: brandOptions,
            },
            {
              columnId: 'model_vehicles.name',
              title: 'Modelo',
              options: modelOptions,
            },
            {
              columnId: 'status',
              title: 'Estado',
              options: statusOptions,
            },
            {
              columnId: 'type.name',
              title: 'Tipo',
              options: typeOptions,
            },
            {
              columnId: 'sub_type.name',
              title: 'Sub Tipo',
              options: subTypeOptions,
            },
          ],
        }}
      />
    </div>
  );
}
