'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { useMemo } from 'react';
import type { AreaRow } from '../../actions/areas.server';
import { AreaFormDialog, type ProvinceOption } from './AreaFormDialog';

interface AreaTableProps {
  areas: AreaRow[];
  /** Cliente de la ficha: se le pasa al diálogo de edición para no volver a preguntarlo. */
  customerId: string;
  provinces: ProvinceOption[];
  savedFilters: string[];
}

function includesValue(value: unknown, filter: unknown): boolean {
  return Array.isArray(filter) && filter.includes(value);
}

function provinceNames(area: AreaRow): string[] {
  return area.area_province.map((ap) => ap.provinces.name);
}

export function getAreaColumns(
  customerId: string,
  provinces: ProvinceOption[],
  canEdit: boolean
): ColumnDef<AreaRow>[] {
  const columns: ColumnDef<AreaRow>[] = [
    {
      accessorKey: 'nombre',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      id: 'Descripción',
      accessorFn: (row) => row.descripcion_corta ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      filterFn: (row, id, value) => includesValue(row.getValue(id), value),
    },
    {
      id: 'Provincias',
      accessorFn: (row) => provinceNames(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Provincias" />,
      cell: ({ row }) => {
        const provinces = provinceNames(row.original);
        if (provinces.length === 0) return null;
        const [first, ...rest] = provinces;
        if (rest.length === 0) return <Badge variant="default">{first}</Badge>;
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default" className="cursor-pointer select-none">
                  {first} +{rest.length}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  {rest.map((prov) => (
                    <p key={prov}>{prov}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, id, value) => {
        const rowValues = row.getValue<string[]>(id);
        return Array.isArray(value) && value.some((val) => rowValues.includes(val));
      },
    },
  ];

  if (canEdit) {
    columns.push({
      id: 'Acciones',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => (
        <AreaFormDialog
          customerId={customerId}
          provinces={provinces}
          area={row.original}
          triggerLabel="Editar"
          triggerVariant="link"
        />
      ),
    });
  }

  return columns;
}

function readCookieJson<T>(name: string, fallback: T): T {
  const raw = Cookies.get(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function AreaTable({ areas, customerId, provinces, savedFilters }: AreaTableProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('comercial', 'areas-cliente', 'update');

  const savedVisibility = readCookieJson<VisibilityState>('areaTable', {});
  const savedFiltersFromCookie = readCookieJson<string[]>('areaTable-filters', savedFilters);

  const filterOptions = useMemo(
    () => ({
      names: createFilterOptions(areas, (area) => area.nombre),
      provinces: createFilterOptions(
        areas.flatMap((area) => provinceNames(area)),
        (name) => name
      ),
    }),
    [areas]
  );

  const columns = useMemo(
    () => getAreaColumns(customerId, provinces, canEdit),
    [customerId, provinces, canEdit]
  );

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <BaseDataTable
        columns={columns}
        data={areas}
        savedVisibility={savedVisibility}
        tableId="areaTable"
        toolbarOptions={{
          initialVisibleFilters: savedFiltersFromCookie,
          filterableColumns: [
            { columnId: 'Nombre', title: 'Nombre', options: filterOptions.names },
            { columnId: 'Provincias', title: 'Provincias', options: filterOptions.provinces },
          ],
        }}
      />
    </div>
  );
}

export default AreaTable;
