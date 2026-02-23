'use client';

import { querySelectDistinct } from '@/app/server/GET/probando';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { AlertTriangle, CheckCircle, Plus, XCircle } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { RiToolsFill } from 'react-icons/ri';
import { fetchActiveOtherEquipment, fetchAllActiveOtherEquipment } from '../actions/fetchOtherEquipmentAction';

// ─── Tipos inferidos ─────────────────────────────────────────────────────────

type OtherEquipmentTableData = Awaited<ReturnType<typeof fetchActiveOtherEquipment>>['rows'][0];

// Tipo extendido para columnas con exportFormatter
type ExtendedColumnDef<T> = ColumnDef<T> & {
  exportFormatter?: (value: unknown, row: T) => string;
  excludeFromExport?: boolean;
};

// ─── Configuración de condición ───────────────────────────────────────────────

type ConditionKey = 'operativo condicionado' | 'operativo' | 'no operativo' | 'en reparacion' | 'en preparacion';
type BadgeVariantKey = 'success' | 'destructive' | 'yellow' | 'info' | 'secondary' | 'default';

const conditionVariants: Record<string, BadgeVariantKey> = {
  operativo: 'success',
  'no operativo': 'destructive',
  'en reparacion': 'yellow',
  'operativo condicionado': 'info',
  'en preparacion': 'secondary',
};

const conditionConfig: Record<ConditionKey, { icon: React.ComponentType<{ className?: string }> }> = {
  'operativo condicionado': { icon: AlertTriangle },
  operativo: { icon: CheckCircle },
  'no operativo': { icon: XCircle },
  'en reparacion': { icon: RiToolsFill as React.ComponentType<{ className?: string }> },
  'en preparacion': { icon: AlertTriangle },
};

// ─── Props del componente ─────────────────────────────────────────────────────

interface OtherEquipmentTableClientProps {
  initialData: Awaited<ReturnType<typeof fetchActiveOtherEquipment>>;
  savedVisibility: VisibilityState;
  savedFilters: string[];
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function OtherEquipmentTableClient({
  initialData,
  savedVisibility,
  savedFilters,
}: OtherEquipmentTableClientProps) {
  const company_id = Cookies.get('actualComp');

  // Wrapper de exportación que devuelve solo las filas
  const handleFetchAllData = async (options: { sorting: SortingState; columnFilters: ColumnFiltersState }) => {
    const result = await fetchAllActiveOtherEquipment({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
    });
    return result.rows;
  };

  // ─── Definición de columnas ─────────────────────────────────────────────────

  const columns: ExtendedColumnDef<OtherEquipmentTableData>[] = [
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
      excludeFromExport: true,
    },
    {
      accessorKey: 'serial_number',
      id: 'serial_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Serie" />,
      cell: ({ row }) => (
        <Link
          href={`/dashboard/equipment/action?action=view&id=${row.original.id}&type=other`}
          className="hover:underline font-medium"
        >
          {row.original.serial_number ?? '-'}
        </Link>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'intern_number',
      id: 'intern_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Interno" />,
      cell: ({ row }) => (
        <Link
          href={`/dashboard/equipment/action?action=view&id=${row.original.id}&type=other`}
          className="hover:underline"
        >
          {row.original.intern_number ?? '-'}
        </Link>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'type.name',
      id: 'type.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (row.original.type?.name ? <Badge>{row.original.type.name}</Badge> : <span>-</span>),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'sub_type.name',
      id: 'sub_type.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Subtipo" />,
      cell: ({ row }) =>
        row.original.sub_type?.name ? <Badge variant="secondary">{row.original.sub_type.name}</Badge> : <span>-</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'brand_vehicles.name',
      id: 'brand_vehicles.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => <div>{row.original.brand_vehicles?.name ?? '-'}</div>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'model_vehicles.name',
      id: 'model_vehicles.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Modelo" />,
      cell: ({ row }) => <div>{row.original.model_vehicles?.name ?? '-'}</div>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'year',
      id: 'year',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
      cell: ({ row }) => <div>{row.original.year ?? '-'}</div>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'condition',
      id: 'condition',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición" />,
      cell: ({ row }) => {
        const cond = row.original.condition;
        if (!cond) return <span>-</span>;
        const variant = (conditionVariants[cond] ?? 'default') as BadgeVariantKey;
        const IconComponent = conditionConfig[cond as ConditionKey]?.icon;
        return (
          <Badge variant={variant as 'default'}>
            {IconComponent && React.createElement(IconComponent, { className: 'mr-1 size-3 inline' })}
            {cond}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.status ? <Badge variant="outline">{row.original.status}</Badge> : <span>-</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'horometer',
      id: 'horometer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Horómetro" />,
      cell: ({ row }) =>
        row.original.horometer != null ? <Badge variant="outline">{row.original.horometer} h</Badge> : <span>-</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'vehicles.domain',
      id: 'vehicles.domain',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vinculado a" />,
      cell: ({ row }) => <div>{row.original.vehicles?.domain ?? '-'}</div>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'contractor_other_equipment.customers.name',
      id: 'contractor_other_equipment.customers.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Afectaciones" />,
      cell: ({ row }) => {
        const contractors = (row.original.contractor_other_equipment ?? [])
          .map((c) => (c.customers as { id: string; name: string } | null)?.name ?? '')
          .filter(Boolean);

        if (contractors.length === 0) return <span>-</span>;

        const [first, ...rest] = contractors;

        if (rest.length === 0) {
          return <Badge variant="default">{first}</Badge>;
        }

        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex">
                  <Badge variant="default" className="cursor-pointer select-none">
                    {first} +{rest.length}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white rounded-lg p-2">
                <div className="flex flex-col gap-1">
                  {rest.map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      exportFormatter: (_value, row) => {
        const contractors = (row.contractor_other_equipment ?? [])
          .map((c) => (c.customers as { id: string; name: string } | null)?.name ?? '')
          .filter(Boolean);
        return contractors.length > 0 ? contractors.join(', ') : 'Sin afectar';
      },
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) return true;
        const contractors = row.original.contractor_other_equipment ?? [];
        if (contractors.length === 0) return false;
        return contractors.some((c) => {
          const name = (c.customers as { id: string; name: string } | null)?.name;
          return name && (filterValue as string[]).flat().includes(name);
        });
      },
    },
    {
      accessorKey: 'equipment_owners.name',
      id: 'equipment_owners.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Propietario" />,
      cell: ({ row }) => <div>{row.original.equipment_owners?.name ?? '-'}</div>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'hierarchy.name',
      id: 'hierarchy.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
      cell: ({ row }) =>
        row.original.hierarchy?.name ? (
          <Badge variant="secondary">{row.original.hierarchy.name}</Badge>
        ) : (
          <span>-</span>
        ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'cost_type',
      id: 'cost_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de costo" />,
      cell: ({ row }) =>
        row.original.cost_type ? <Badge variant="outline">{row.original.cost_type}</Badge> : <span>-</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ];

  // ─── Botón Nuevo Equipo ────────────────────────────────────────────────────

  const newEquipmentButton = (
    <PermissionGuard module="equipos" tab="others" action="create">
      <Button asChild variant="gh_orange" size="sm">
        <Link href="/dashboard/equipment/action?action=new&type=other">
          <Plus className="mr-2 size-4" />
          Nuevo Equipo
        </Link>
      </Button>
    </PermissionGuard>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="p-4">
      <BaseDataTable
        columns={columns}
        savedVisibility={savedVisibility}
        initialData={initialData}
        tableId="otherEquipmentTable"
        enableRowSelection={true}
        serverSide={true}
        fetchData={fetchActiveOtherEquipment}
        fetchAllData={handleFetchAllData}
        queryKey="other-equipment-table"
        toolbarOptions={{
          initialVisibleFilters: savedFilters,
          showExport: true,
          showFilterOptions: true,
          searchableColumns: [
            { columnId: 'serial_number', placeholder: 'Buscar por N° Serie...' },
            { columnId: 'intern_number', placeholder: 'Buscar por N° Interno...' },
          ],
          extraActions: newEquipmentButton,
          filterableColumns: [
            {
              columnId: 'type.name',
              title: 'Tipo',
              config: {
                tableName: 'other_equipment',
                select: 'type.name' as '*',
                p_filters: { is_active: 'true', company_id: company_id! },
                // FK real en other_equipment: type_id → type.id
                relation: '{"type": "type_id"}',
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'other_equipment', 'type.name'>>>) =>
                  data.map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  })),
              },
            },
            {
              columnId: 'sub_type.name',
              title: 'Subtipo',
              config: {
                tableName: 'other_equipment',
                select: 'sub_type.name' as '*',
                p_filters: { is_active: 'true', company_id: company_id! },
                // FK real en other_equipment: sub_type_id → sub_type.id
                relation: '{"sub_type": "sub_type_id"}',
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'other_equipment', 'sub_type.name'>>>) =>
                  data.map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  })),
              },
            },
            {
              columnId: 'condition',
              title: 'Condición',
              config: {
                tableName: 'other_equipment',
                select: 'condition' as '*',
                p_filters: { is_active: 'true', company_id: company_id! },
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'other_equipment', 'condition'>>>) =>
                  data.map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  })),
              },
            },
            {
              columnId: 'status',
              title: 'Estado',
              config: {
                tableName: 'other_equipment',
                select: 'status' as '*',
                p_filters: { is_active: 'true', company_id: company_id! },
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'other_equipment', 'status'>>>) =>
                  data.map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  })),
              },
            },
            {
              columnId: 'hierarchy.name',
              title: 'Sector',
              config: {
                tableName: 'other_equipment',
                select: 'hierarchy.name' as '*',
                p_filters: { is_active: 'true', company_id: company_id! },
                // FK real en other_equipment: sector → hierarchy.id
                relation: '{"hierarchy": "sector"}',
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'other_equipment', 'hierarchy.name'>>>) =>
                  data.map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  })),
              },
            },
            {
              columnId: 'cost_type',
              title: 'Tipo de costo',
              config: {
                tableName: 'other_equipment',
                select: 'cost_type' as '*',
                p_filters: { is_active: 'true', company_id: company_id! },
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'other_equipment', 'cost_type'>>>) =>
                  data.map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  })),
              },
            },
            {
              columnId: 'equipment_owners.name',
              title: 'Propietario',
              config: {
                tableName: 'other_equipment',
                select: 'equipment_owners.name' as '*',
                p_filters: { is_active: 'true', company_id: company_id! },
                // FK real en other_equipment: owner_id → equipment_owners.id
                relation: '{"equipment_owners": "owner_id"}',
                mapper: (
                  data: Awaited<ReturnType<typeof querySelectDistinct<'other_equipment', 'equipment_owners.name'>>>
                ) =>
                  data.map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  })),
              },
            },
            {
              columnId: 'contractor_other_equipment.customers.name',
              title: 'Afectaciones',
              config: {
                tableName: 'other_equipment' as const,
                select: 'id' as '*',
                multiJoinPaths: {
                  joins: [
                    {
                      from_table: 'other_equipment',
                      to_table: 'contractor_other_equipment',
                      from_column: 'id',
                      to_column: 'equipment_id',
                    },
                    {
                      from_table: 'contractor_other_equipment',
                      to_table: 'customers',
                      from_column: 'contractor_id',
                      to_column: 'id',
                    },
                  ],
                  final_column: 'customers.name',
                },
                p_filters: { is_active: 'true', company_id: company_id! },
                mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'other_equipment', 'id'>>>) =>
                  data.map((value) => ({
                    label: String(value.display_value),
                    value: String(value.col_value),
                    count: value.col_count,
                  })),
              },
            },
          ],
        }}
      />
    </Card>
  );
}
